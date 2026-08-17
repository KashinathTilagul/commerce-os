import { z } from 'zod'
import { db } from './db'
import { routeObject, routeText } from './ai-router'
import { getLiveBusinessSnapshot, getFinanceReportData } from './business-snapshot'
import { prepareAgentWithLearning, storeAgentPattern } from './agent-learning'
import { decomposeTask } from './task-templates'
import { generatePDF } from './pdf-generator'
import { generateImage } from './image-generator'
import { generateVideo } from './video-generator'
import { generateAudio, synthesizeSpeech } from './audio-generator'
import { syncCampaignItemAfterWork } from './campaign-execution'
import { extractExactReply, parseGeneratedMediaJSON, shouldExecuteMedia } from './work-request-planner'
import { BRAND_PROMPT_SECTION, brandLogoReference } from './brand-guard'

const StatusSchema = z.object({
  progressNote: z.string().describe('1-2 sentences, first person, summarising what you just produced.'),
  newStatus: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'MILESTONE_REVIEW']).describe('MILESTONE_REVIEW if at a milestone checkpoint. IN_REVIEW if it needs founder sign-off before any external action. DONE only if fully complete. IN_PROGRESS if more work remains. BLOCKED if you lack info/access.'),
  blockedReason: z.string().optional().describe('If BLOCKED, what you need from the founder.'),
})

export interface WorkResult {
  ok: boolean
  message: string
  issueCode?: string
  newStatus?: string
  milestone?: number
}

// MILESTONE CONFIGURATION
const MILESTONE_CHECKPOINTS = [40, 60, 80, 100]
const MAX_ITERATIONS = 3

export async function runAgentWork(organizationId: string, agentId: string, targetIssueId?: string, chatContext?: { channelId: string; threadId?: string }): Promise<WorkResult> {
  const agent = await db.agent.findFirst({ where: { id: agentId, organizationId } })
  if (!agent) return { ok: false, message: 'Agent not found' }
  if (agent.isHuman) return { ok: false, message: 'Human team member — not an executable agent' }

  // Get candidates: open tickets
  const candidates = await db.issue.findMany({
    where: { 
      organizationId, 
      assigneeId: agentId, 
      status: { in: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'MILESTONE_REVIEW'] } 
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    include: { 
      comments: { orderBy: { createdAt: 'asc' }, take: 20 },
      subtasks: true,
      campaignItem: { include: { launch: { select: { hidden: true } } } },
    },
  })
  
  const needsFounderReply = (i: (typeof candidates)[number]) => {
    const last = i.comments[i.comments.length - 1]
    return i.status === 'IN_REVIEW' && last && last.authorId == null
  }
  
  const issue = targetIssueId
    ? candidates.find(i => i.id === targetIssueId)
    : candidates.find(i => i.status === 'BACKLOG' || i.status === 'IN_PROGRESS') || candidates.find(needsFounderReply)

  if (!issue) {
    await db.agent.update({ where: { id: agentId }, data: { status: 'IDLE', currentTask: 'Checked in – no open tickets' } })
    return { ok: true, message: `${agent.name} has no open tickets` }
  }

  const runStartedAt = new Date()
  // Record every run (not just campaign work) so the Runs tab / audit trail
  // covers normal issue work too; campaignItemId stays null outside campaigns.
  const agentRun = await db.agentRun.create({
    data: {
      organizationId,
      agentId,
      triggerType: 'ASSIGNMENT',
      triggerRef: issue.id,
      status: 'RUNNING',
      startedAt: runStartedAt,
      issueId: issue.id,
      campaignItemId: issue.campaignItem?.id ?? null,
    },
  })

  if (issue.campaignItem) {
    await db.campaignLaunchItem.update({
      where: { id: issue.campaignItem.id },
      data: { status: 'RUNNING', attemptCount: { increment: 1 } },
    })
  }

  // CHAT CONTEXT (thread-scoped, capped at 15 messages)
  let chatHistoryBlock = ''
  if (chatContext?.threadId) {
    const threadMessages = await db.message.findMany({
      where: { channelId: chatContext.channelId, parentMessageId: chatContext.threadId },
      orderBy: { createdAt: 'asc' },
      take: 15,
    })
    if (threadMessages.length > 0) {
      chatHistoryBlock = '\n\nTHREAD CONTEXT (last 15 messages):\n' + threadMessages.map(m => `[${m.authorType}]: ${m.content.slice(0, 200)}`).join('\n')
    }
  }

  // GET LEARNING (deterministic)
  const learning = await prepareAgentWithLearning(agent.code, organizationId, issue.type || 'TASK')
  
  const priorWork = issue.comments
    .filter(c => c.kind === 'HEARTBEAT' || c.kind === 'COMMENT')
    .map(c => `- ${c.authorName}: ${c.body.slice(0, 400)}`)
    .join('\n') || '(no prior work yet)'

  const liveContext = await getLiveBusinessSnapshot(organizationId)

  // INJECT CONSTRAINTS (learning from past failures)
  const constraintsSection = learning.constraints.length > 0
    ? `\n\nCONSTRAINTS (violation = rejection):\n${learning.constraints.map((c, i) => `${i+1}. ${c}`).join('\n')}`
    : ''

  // INJECT SUCCESS PATTERNS (learning from past successes)
  const patternsSection = learning.successfulApproaches.length > 0
    ? `\n\nSUCCESS PATTERNS (use these approaches):\n${learning.successfulApproaches.map((p, i) => `${i+1}. ${JSON.stringify(p)}`).join('\n')}`
    : ''

  // MILESTONE CONTEXT
  const currentMilestone = issue.milestone || 0
  const nextMilestone = MILESTONE_CHECKPOINTS.find(m => m > currentMilestone) || 100
  const milestoneContext = currentMilestone < 100 
    ? `\n\nMILESTONE: You are at ${currentMilestone}%. Submit work at ${nextMilestone}% checkpoint for manager review.`
    : '\n\nMILESTONE: You are at 100%. Submit for founder review.'

  const refs = (issue as any).attachments?.slice(0,2) || []
  const refContext = refs.length ? `\n\nREFERENCES (use up to 2, describe exact placement/transfer in GENERATE_*):\n${refs.map((r:any,i:number)=>`${i+1}. ${r.type} ${r.name}: ${r.url}`).join('\n')}` : ''
  const plannedType = issue.campaignItem?.type
  // SOCIAL_POST is produced as an image (or a video for reels) and
  // FINANCE_REPORT as a PDF — map to the underlying generator so
  // gating/instructions share one code path.
  const effectiveMediaType = plannedType === 'SOCIAL_POST'
    ? (/\breels?\b/i.test(issue.campaignItem?.title || '') ? 'VIDEO' : 'IMAGE')
    : plannedType === 'FINANCE_REPORT' ? 'PDF' : plannedType
  const verticalFormat = /story|reel/i.test(issue.campaignItem?.title || '')
  const isCarousel = plannedType === 'SOCIAL_POST' && /carousel/i.test(`${issue.campaignItem?.title || ''} ${issue.description || ''}`)
  const mediaInstruction = effectiveMediaType === 'IMAGE'
    ? isCarousel
      ? '- This is a CAROUSEL — it needs multiple slides. Return one GENERATE_IMAGE block per slide (3 to 5 blocks, in slide order), e.g.\n  GENERATE_IMAGE: {"prompt":"Slide 1 ...","aspectRatio":"1:1","style":"product"}\n  GENERATE_IMAGE: {"prompt":"Slide 2 ...","aspectRatio":"1:1","style":"product"}\n  Each block becomes a separate image file, so make every slide visually distinct.'
      : `- Return exactly one block: GENERATE_IMAGE: {"prompt":"...","aspectRatio":"${verticalFormat ? '9:16' : '1:1'}","style":"product"}`
    : effectiveMediaType === 'VIDEO'
      ? '- This is a REEL — a UGC-style video with real motion, spoken dialogue and music, built from your scenes. Return exactly one block:\n  GENERATE_VIDEO: {"template":"InstagramReel","duration":14,"title":"...","scenes":[{"prompt":"what is visually happening in scene 1","line":"the line spoken aloud over scene 1"},{"prompt":"scene 2 visual","line":"scene 2 spoken line"}]}\n  Write 2 to 4 scenes in story order. Each "prompt" becomes a 9:16 visual — describe action, light and setting, no text overlays. Each "line" is spoken as voiceover: short (under 15 words), conversational, brand voice.'
      : effectiveMediaType === 'PDF'
        ? '- Return exactly one block: GENERATE_PDF: {"template":"report","data":{"title":"...","content":"..."},"title":"..."}'
        : effectiveMediaType === 'AUDIO'
          ? '- Return exactly one block: GENERATE_AUDIO: {"text":"...","title":"...","voice":"onyx"}'
          : '- This is not a media task. Do not emit any GENERATE_* block.'
  const mediaExample = effectiveMediaType && ['IMAGE', 'VIDEO', 'PDF', 'AUDIO'].includes(effectiveMediaType)
    ? '\nUse the required GENERATE_* block so the system creates and stores the requested file.'
    : ''

  const system = `You are ${agent.name}, the ${agent.role} (${agent.department}) for this organization.
Your prime directive: ${agent.primeDirective}
Your skills: ${agent.skills}

You are actively working a ticket right now — not chatting. Produce REAL output a colleague could use immediately: actual campaign copy, an actual plan with steps and dates, an actual analysis with numbers. Do not describe what you "would" do — do it.

RULES:
- Ground anything operational in the live system data below; never invent metrics.
- You may plan and draft freely, but you must NOT assume any external action (publishing, sending, paying, posting) has happened. If the task needs that, finish your part and set status IN_REVIEW for the founder to approve.
- Set DONE only when the deliverable is complete and needs nothing external.
- Set BLOCKED only if you genuinely cannot proceed without founder input; say exactly what you need.

FILE GENERATION POLICY:
${mediaInstruction}
Never request a different media type from the planned ticket type.
${BRAND_PROMPT_SECTION}
${constraintsSection}
${patternsSection}
${milestoneContext}
${refContext}

# LIVE SYSTEM CONTEXT
${liveContext}${chatHistoryBlock}`

  const prompt = `TICKET ${issue.code} — ${issue.title}
Priority: ${issue.priority}
Description: ${issue.description}

Prior work and founder comments on this ticket (read these — address any founder request):
${priorWork}

Produce the COMPLETE deliverable for this ticket now. 

Use references if attached — describe exact placement/transfer in the planned GENERATE_* block.${mediaExample}

Now produce YOUR deliverable:`

  // GENERATE DELIVERABLE
  let deliverable: string
  const exactReply = issue.campaignItem?.type === 'ANSWER' ? extractExactReply(issue.description) : null
  if (exactReply) {
    deliverable = exactReply
  } else {
    try {
      const r = await routeText('reasoning', organizationId, { system, prompt, temperature: 0.6, maxOutputTokens: 2000 })
      deliverable = r.text.trim()
    } catch (e: any) {
      await db.agentRun.update({
        where: { id: agentRun.id },
        data: { status: 'FAILED', error: e?.message || String(e), completedAt: new Date(), durationMs: Date.now() - runStartedAt.getTime() },
      })
      return { ok: false, message: `Agent core error: ${e?.message || e}` }
    }
  }
  if (deliverable.length < 40 && !exactReply) {
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: { status: 'FAILED', error: 'Empty deliverable', completedAt: new Date(), durationMs: Date.now() - runStartedAt.getTime() },
    })
    return { ok: false, message: `${agent.name} returned an empty deliverable — try again` }
  }

  // An employee that opens its deliverable with "BLOCKED:" is reporting it
  // cannot finish — count that as a block, never as a completed deliverable.
  if (/^\s*BLOCKED\s*[:\-]/i.test(deliverable)) {
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: { status: 'FAILED', error: `Agent self-reported blocked: ${deliverable.slice(0, 200)}`, completedAt: new Date(), durationMs: Date.now() - runStartedAt.getTime() },
    })
    return { ok: false, message: `${agent.name} blocked: ${deliverable.slice(0, 200)}` }
  }

  // DETECT AND EXECUTE MULTIMODAL GENERATION
  const multimodalResults: string[] = []
  const multimodalFailures: string[] = []

  // ponytail: LLMs wrap JSON in fences or add prose — strip fences before extraction
  const cleanedDeliverable = deliverable.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1')

  // Extract balanced JSON objects starting after each occurrence of a marker.
  // The old regex /{[\s\S]*?}/ was non-greedy and broke on nested braces (every
  // PDF/video call has nested "data" objects). Bracket-counting is the smallest
  // correct fix. Multiple blocks are needed for carousels (one image per slide).
  function extractAllJSON(text: string, marker: string, cap: number): { json: string; fullMatch: string }[] {
    const matches: { json: string; fullMatch: string }[] = []
    let cursor = 0
    while (matches.length < cap) {
      const idx = text.indexOf(marker, cursor)
      if (idx < 0) break
      const start = text.indexOf('{', idx + marker.length)
      if (start < 0) break
      let depth = 0
      let end = -1
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++
        else if (text[i] === '}') depth--
        if (depth === 0) { end = i; break }
      }
      if (end < 0) break
      matches.push({ json: text.slice(start, end + 1), fullMatch: text.slice(idx, end + 1) })
      cursor = end + 1
    }
    return matches
  }
  const extractJSON = (text: string, marker: string) => extractAllJSON(text, marker, 1)[0] ?? null

  const imageMatches = shouldExecuteMedia(effectiveMediaType, 'IMAGE') ? extractAllJSON(cleanedDeliverable, 'GENERATE_IMAGE', 5) : []
  for (let slideIndex = 0; slideIndex < imageMatches.length; slideIndex++) {
    const imageMatch = imageMatches[slideIndex]
    try {
      const params = parseGeneratedMediaJSON<any>(imageMatch.json)
      // Brand guard: logo requests always reference the house logo asset.
      const wantsLogo = !params.referenceImage && /logo|brand/i.test(issue.description || '')
      const result = await generateImage({
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || (verticalFormat ? '9:16' : '1:1'),
        style: params.style || 'product',
        organizationId,
        generatedBy: agentId,
        title: imageMatches.length > 1 ? `${params.title || issue.title} — slide ${slideIndex + 1} of ${imageMatches.length}` : params.title,
        referenceImage: params.referenceImage || (wantsLogo ? await brandLogoReference(organizationId) : undefined),
      })
      multimodalResults.push(`✅ Generated Image: ${result.imageUrl}`)
      deliverable = deliverable.replace(imageMatch.fullMatch, '').trim()
    } catch (e: any) {
      multimodalFailures.push(`Image generation failed: ${e.message}`)
    }
  }

  const pdfMatch = shouldExecuteMedia(effectiveMediaType, 'PDF') ? extractJSON(cleanedDeliverable, 'GENERATE_PDF') : null
  if (pdfMatch) {
    try {
      const params = parseGeneratedMediaJSON<any>(pdfMatch.json)
      // Finance reports must show real numbers: build summary + table rows
      // from live DB aggregates instead of trusting the LLM's JSON (which
      // arrives as a flat "content" string and renders empty columns).
      let pdfData: Record<string, any> = params.data || {}
      if (plannedType === 'FINANCE_REPORT') {
        const live = await getFinanceReportData(organizationId)
        pdfData = {
          ...pdfData,
          title: pdfData.title || params.title || issue.title,
          summary: live.summary,
          table: live.table,
          sections: pdfData.content ? [{ heading: 'Analysis', content: String(pdfData.content) }] : pdfData.sections || [],
        }
      }
      const result = await generatePDF({
        template: params.template || 'report',
        data: pdfData,
        title: params.title || issue.title,
        organizationId,
        generatedBy: agentId,
      })
      multimodalResults.push(`✅ Generated PDF: ${result.downloadUrl}`)
      deliverable = deliverable.replace(pdfMatch.fullMatch, '').trim()
    } catch (e: any) {
      multimodalFailures.push(`PDF generation failed: ${e.message}`)
    }
  }

  const videoMatch = shouldExecuteMedia(effectiveMediaType, 'VIDEO') ? extractJSON(cleanedDeliverable, 'GENERATE_VIDEO') : null
  if (videoMatch) {
    try {
      const params = parseGeneratedMediaJSON<any>(videoMatch.json)
      // UGC reel: each scene is a 9:16 still (motion comes from the renderer)
      // plus a spoken line. Scene stills are stored as image artifacts too,
      // so the house can reuse them. A failed scene is skipped, not fatal —
      // the reel renders with whatever scenes succeeded.
      const sceneSpecs = Array.isArray(params.scenes) ? params.scenes.filter((s: any) => s?.prompt).slice(0, 4) : []
      const reelScenes: { imagePath: string; voicePath?: string; line?: string }[] = []
      for (let sceneIndex = 0; sceneIndex < sceneSpecs.length; sceneIndex++) {
        const spec = sceneSpecs[sceneIndex]
        try {
          // Image providers hiccup transiently ("terminated"); one retry per
          // scene keeps a flaky call from amputating the reel.
          let image: { artifactId: string; imageUrl: string } | null = null
          let lastError: any = null
          for (let attempt = 0; attempt < 2 && !image; attempt++) {
            try {
              image = await generateImage({
                prompt: spec.prompt,
                aspectRatio: '9:16',
                style: 'lifestyle',
                organizationId,
                generatedBy: agentId,
                title: `${params.title || issue.title} — scene ${sceneIndex + 1} of ${sceneSpecs.length}`,
              })
            } catch (e) { lastError = e }
          }
          if (!image) throw lastError || new Error('image generation failed')
          const stored = await db.artifact.findUnique({ where: { id: image.artifactId }, select: { storageLocation: true } })
          if (!stored?.storageLocation) throw new Error('scene image was not stored')
          const scene: { imagePath: string; voicePath?: string; line?: string } = { imagePath: stored.storageLocation }
          if (spec.line) {
            const speech = await synthesizeSpeech(String(spec.line), organizationId)
            if (speech) { scene.voicePath = speech.path; scene.line = String(spec.line) }
          }
          reelScenes.push(scene)
        } catch (e: any) {
          multimodalFailures.push(`Reel scene ${sceneIndex + 1} failed: ${e.message}`)
        }
      }
      if (sceneSpecs.length > 0 && reelScenes.length === 0) {
        throw new Error('all reel scenes failed to render')
      }
      const result = await generateVideo({
        template: params.template || (verticalFormat ? 'InstagramReel' : 'BrandVideo'),
        data: params.data || {},
        duration: params.duration || 15,
        organizationId,
        generatedBy: agentId,
        title: params.title,
        scenes: reelScenes.length > 0 ? reelScenes : undefined,
      })
      multimodalResults.push(`✅ Generated Video: ${result.videoUrl}`)
      deliverable = deliverable.replace(videoMatch.fullMatch, '').trim()
    } catch (e: any) {
      multimodalFailures.push(`Video generation failed: ${e.message}`)
    }
  }

  const audioMatch = shouldExecuteMedia(effectiveMediaType, 'AUDIO') ? extractJSON(cleanedDeliverable, 'GENERATE_AUDIO') : null
  if (audioMatch) {
    try {
      const params = parseGeneratedMediaJSON<any>(audioMatch.json)
      const result = await generateAudio({
        text: params.text || params.prompt,
        title: params.title,
        voice: params.voice,
        organizationId,
        generatedBy: agentId,
      })
      multimodalResults.push(`✅ Generated Audio: ${result.audioUrl}`)
      deliverable = deliverable.replace(audioMatch.fullMatch, '').trim()
    } catch (e: any) {
      multimodalFailures.push(`Audio generation failed: ${e.message}`)
    }
  }

  if (effectiveMediaType && ['IMAGE', 'VIDEO', 'PDF', 'AUDIO'].includes(effectiveMediaType) && multimodalResults.length === 0 && multimodalFailures.length === 0) {
    multimodalFailures.push(`${effectiveMediaType} generation failed: the employee did not return the required GENERATE_${effectiveMediaType} instruction.`)
  }

  if (multimodalResults.length > 0) {
    deliverable += '\n\n### Generated Assets:\n' + multimodalResults.join('\n')
  }

  // DECIDE STATUS
  let work: z.infer<typeof StatusSchema>
  if (issue.campaignItem) {
    work = { progressNote: `Completed the requested deliverable for ${issue.code}.`, newStatus: 'DONE' }
  } else {
    try {
      const { object } = await routeObject<z.infer<typeof StatusSchema>>('fast', organizationId, {
        schema: StatusSchema,
        system: `You are ${agent.name}. You just produced a deliverable for ticket ${issue.code}. Decide its status honestly.`,
        prompt: `Ticket: ${issue.title}\n\nDeliverable you produced:\n${deliverable.slice(0, 3000)}\n\nDecide the status based on milestones.`,
        temperature: 0,
      })
      // ponytail: routeObject silently returns a chat-shaped { spoken, action }
      // fallback when the reply isn't schema-valid JSON, so `newStatus` arrives
      // undefined and events render "→ undefined". Guard here; the catch below
      // supplies the same sane default. Upgrade path: make routeObject strict
      // for non-chat schemas.
      if (!object?.newStatus) throw new Error('Status decision missing newStatus')
      work = object
    } catch {
      work = { progressNote: `Drafted the deliverable for ${issue.code}.`, newStatus: 'IN_REVIEW' }
    }
  }

  // A media request without its actual artifact is not a completed deliverable.
  // Keep the failure visible and require a configuration/access fix instead.
  if (multimodalFailures.length > 0) {
    work = {
      progressNote: `I could not create the requested asset for ${issue.code}.`,
      newStatus: 'BLOCKED',
      blockedReason: multimodalFailures.join(' '),
    }
  }

  // MILESTONE TRACKING
  let newMilestone = currentMilestone
  if (currentMilestone < 100 && work.newStatus === 'IN_PROGRESS') {
    // Advance milestone if work is substantial
    if (deliverable.length > 500) {
      newMilestone = nextMilestone
      if (newMilestone < 100) {
        work.newStatus = 'MILESTONE_REVIEW'
      }
    }
  }
  
  // Post the work as heartbeat
  const milestonePrefix = currentMilestone < 100 ? `[${currentMilestone}% → ${newMilestone}%] ` : ''
  const bodyText = exactReply || (work.newStatus === 'BLOCKED'
    ? `${milestonePrefix}${work.progressNote}\n\n⛔ BLOCKED — needs founder: ${work.blockedReason || 'input required'}`
    : `${milestonePrefix}${work.progressNote}\n\n— — —\n${deliverable}`)
  await db.issueComment.create({
    data: { issueId: issue.id, authorId: agentId, authorName: agent.name, body: bodyText, kind: 'HEARTBEAT' },
  })

  // UPDATE ISSUE with milestone
  await db.issue.update({ 
    where: { id: issue.id }, 
    data: { 
      status: work.newStatus,
      milestone: newMilestone
    } 
  })
  await syncCampaignItemAfterWork(organizationId, issue.id, work.newStatus)

  // STORE LEARNING PATTERN
  const outcome = work.newStatus === 'DONE' ? 'SUCCESS' : work.newStatus === 'BLOCKED' ? 'REJECTED' : 'SUCCESS'
  await storeAgentPattern(
    organizationId,
    agent.code,
    issue.type || 'TASK',
    { title: issue.title, description: issue.description },
    { deliverable: deliverable.slice(0, 500), milestone: newMilestone },
    outcome,
    work.newStatus === 'BLOCKED' ? [work.blockedReason || 'Unknown'] : undefined,
    undefined,
    work.newStatus === 'DONE' ? 0.9 : work.newStatus === 'BLOCKED' ? 0.3 : 0.7
  )

  const remaining = await db.issue.count({
    where: { organizationId, assigneeId: agentId, status: { in: ['BACKLOG', 'IN_PROGRESS', 'MILESTONE_REVIEW'] } },
  })
  const done = work.newStatus === 'DONE' || work.newStatus === 'IN_REVIEW'
  await db.agent.update({
    where: { id: agentId },
    data: {
      lastHeartbeat: new Date(),
      status: remaining > 0 ? 'ACTIVE' : 'IDLE',
      currentTask: remaining > 0 ? agent.currentTask : null,
      tasksToday: done ? { increment: 1 } : undefined,
      tasksTotal: done ? { increment: 1 } : undefined,
      // ponytail: routeText/routeObject don't surface token usage (the AI SDK's
      // `usage` is dropped and the OmniRoute path doesn't parse it), so we don't
      // track tokenSpend instead of faking a number. Ceiling: spend reporting is
      // absent. Upgrade path: return usage from runChain and increment here.
    },
  })

  // Hidden (silent-research) work is sanitized at write time: the activity
  // log only ever sees "Work blocked" — no topic, agent, code, or output.
  const hiddenWork = issue.campaignItem?.launch?.hidden === true
  await db.event.create({
    data: hiddenWork
      ? { organizationId, type: 'WORK_BLOCKED', actorName: 'System', summary: 'Work blocked', payload: '{}', severity: 'INFO' }
      : {
          organizationId, type: 'AGENT_WORK', actorId: agentId, actorName: agent.name,
          summary: `${agent.name} worked ${issue.code} → ${work.newStatus} (${newMilestone}%)`,
          payload: JSON.stringify({ code: issue.code, status: work.newStatus, milestone: newMilestone }),
          severity: work.newStatus === 'BLOCKED' ? 'WARN' : 'INFO',
        },
  })

  await db.agentRun.update({
    where: { id: agentRun.id },
    data: {
      status: work.newStatus === 'BLOCKED' ? 'FAILED' : 'COMPLETED',
      error: work.newStatus === 'BLOCKED' ? work.blockedReason || 'Work blocked' : null,
      outputSummary: deliverable.slice(0, 1000),
      completedAt: new Date(),
      durationMs: Date.now() - runStartedAt.getTime(),
    },
  })

  return { 
    ok: true, 
    message: `${agent.name} worked ${issue.code} → ${work.newStatus}`, 
    issueCode: issue.code, 
    newStatus: work.newStatus,
    milestone: newMilestone
  }
}

// MANAGER DELEGATION: Chiefs decompose tasks into subtasks
export async function delegateToSpecialists(organizationId: string, managerCode: string, issueId: string): Promise<string[]> {
  const manager = await db.agent.findFirst({ 
    where: { code: managerCode, organizationId, managerId: null } 
  })
  if (!manager) return []
  
  const issue = await db.issue.findFirst({ 
    where: { id: issueId, organizationId } 
  })
  if (!issue) return []
  
  // Get decomposition template
  const subtasks = decomposeTask(issue.type || 'TASK', { title: issue.title })
  
  const createdSubtaskIds: string[] = []
  
  for (const subtaskDef of subtasks) {
    // Find appropriate specialist
    const specialist = await db.agent.findFirst({
      where: { 
        organizationId,
        department: subtaskDef.department,
        managerId: manager.id 
      }
    })
    
    if (!specialist) continue
    
    const count = await db.issue.count({ where: { organizationId } })
    const code = `PAP-${String(count + 1).padStart(2, '0')}`
    
    const subtaskIssue = await db.issue.create({
      data: {
        organizationId,
        code,
        title: subtaskDef.title,
        description: `Subtask of ${issue.code}: ${issue.title}`,
        status: 'BACKLOG',
        priority: issue.priority,
        type: 'TASK',
        assigneeId: specialist.id,
        department: subtaskDef.department,
        parentIssueId: issue.id
      }
    })
    
    createdSubtaskIds.push(subtaskIssue.id)
    
    // Update specialist
    await db.agent.update({
      where: { id: specialist.id },
      data: { currentTask: subtaskDef.title, status: 'ACTIVE' }
    })
  }
  
  return createdSubtaskIds
}

// ITERATION LOOP: Auto-respawn with constraints
export async function handleRejection(
  organizationId: string,
  issueId: string,
  rejectionReasons: string[],
  correction?: string
): Promise<boolean> {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId },
    include: { campaignItem: { include: { launch: { select: { hidden: true } } } } },
  })
  if (!issue) return false
  
  // Check iteration count
  const iterations = issue.iterations || 0
  if (iterations >= MAX_ITERATIONS) {
    // Escalate to founder
    await db.issue.update({
      where: { id: issueId },
      data: { 
        status: 'IN_REVIEW',
        constraints: JSON.stringify([...(JSON.parse(issue.constraints || '[]') || []), ...rejectionReasons])
      }
    })
    
    // Hidden (silent-research) work never leaks to the activity log.
    const hiddenWork = issue.campaignItem?.launch?.hidden === true
    await db.event.create({
      data: hiddenWork
        ? { organizationId, type: 'WORK_BLOCKED', actorName: 'System', summary: 'Work blocked', payload: '{}', severity: 'INFO' }
        : {
            organizationId,
            type: 'ISSUE_ESCALATED',
            actorName: 'System',
            summary: `Issue ${issue.code} exceeded max iterations, escalated to founder`,
            payload: JSON.stringify({ code: issue.code, iterations, reasons: rejectionReasons }),
            severity: 'WARN'
          }
    })
    
    return false
  }
  
  // Add constraints
  const existingConstraints = JSON.parse(issue.constraints || '[]') || []
  const newConstraints = [...existingConstraints, ...rejectionReasons]
  
  // Reset to last successful milestone
  const lastMilestone = Math.max(0, (issue.milestone || 0) - 20)
  
  // Store failure pattern
  if (issue.assigneeId) {
    const agent = await db.agent.findFirst({ where: { id: issue.assigneeId } })
    if (agent) {
      await storeAgentPattern(
        organizationId,
        agent.code,
        issue.type || 'TASK',
        { title: issue.title },
        { milestone: issue.milestone, approach: 'rejected' },
        'REJECTED',
        rejectionReasons,
        correction,
        0.2
      )
    }
  }
  
  // Respawn task
  await db.issue.update({
    where: { id: issueId },
    data: {
      status: 'BACKLOG',
      milestone: lastMilestone,
      iterations: iterations + 1,
      constraints: JSON.stringify(newConstraints)
    }
  })
  
  return true
}

export async function runAllBusyAgents(limit = 25): Promise<number> {
  const busy = await db.agent.findMany({
    where: { 
      isHuman: false, 
      issuesAssigned: { 
        some: { 
          status: { in: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'MILESTONE_REVIEW'] } 
        } 
      } 
    },
    select: { id: true, organizationId: true },
    take: limit,
  })
  let worked = 0
  for (const a of busy) {
    try {
      const r = await runAgentWork(a.organizationId, a.id)
      if (r.ok && r.issueCode) worked++
    } catch (e: any) {
      // keep going, but don't hide the failure
      console.error(`[AgentWorker] runAgentWork failed for agent ${a.id}:`, e?.message || e)
    }
  }
  return worked
}
