import type { Metadata } from 'next'
import { Callout, DocIntro, DocSection, Step } from '@/components/marketing/docs-shell'

export const metadata: Metadata = { title: 'Getting started' }

export default function GettingStartedPage() {
  return <><DocIntro eyebrow="Guide · 10 minutes" title="Set up the first working Ekvaar workspace." body="The safest path is organisation first, verified intelligence second, connected tools third, and autonomy last." />
    <DocSection title="Before you begin"><p>You need an Ekvaar OS account, an organisation you are allowed to configure, and at least one supported model provider key. Add other service accounts only when a workflow requires them.</p><Callout title="No shared base key" tone="warn">A new organisation should not receive AI access from another workspace. If a model works before your organisation has configured a key, treat it as a configuration fault and inspect the provider trace.</Callout></DocSection>
    <DocSection title="Create and verify the workspace">
      <Step number="01" title="Create the organisation">Sign up, choose the organisation name and complete onboarding. The selected organisation becomes the boundary for settings, credentials, memory and work.</Step>
      <Step number="02" title="Add a model provider">Open Settings, choose <strong className="text-white">Add new key</strong>, select the provider and paste the organisation-owned API key. Save it, then use the connection test.</Step>
      <Step number="03" title="Select verified models">Only models returned by a successful provider connection should appear in routing dropdowns. Assign a fast model for interactive work and a stronger model for complex reasoning only if needed.</Step>
      <Step number="04" title="Connect one app">Open Integrations and connect the smallest service needed for the first task. Prefer OAuth when the provider supports it.</Step>
      <Step number="05" title="Run a low-risk request">Ask Krishna for a read-only output such as a brief or report. Confirm the task shows its owner, timeline, model route and resulting artifact.</Step>
      <Step number="06" title="Enable a controlled action">Create or assign a workflow, require approval, then run it. Confirm no external change occurs until approval and that the provider receipt appears after execution.</Step>
    </DocSection>
    <DocSection title="Ready-state checklist"><div className="grid gap-3 sm:grid-cols-2">{['Organisation is correct', 'Provider test is live', 'Only connected models appear', 'Required app is connected', 'Approval policy is defined', 'Logs show the full trace'].map((item) => <div key={item} className="border border-white/10 px-4 py-3 text-xs text-white/60">✓ {item}</div>)}</div></DocSection>
  </>
}
