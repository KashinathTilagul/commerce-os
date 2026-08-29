import type { Metadata } from 'next'
import { Callout, DocIntro, DocSection, Step } from '@/components/marketing/docs-shell'

export const metadata: Metadata = { title: 'Approvals and logs' }

export default function ApprovalsLogsPage() {
  return <><DocIntro eyebrow="Guide · Control" title="Review the output and the evidence together." body="Approvals should show the exact artifact and action being authorised. Logs should explain what entered the system, what ran and what came back." />
    <DocSection title="Approval lifecycle">
      <Step number="01" title="Prepared">The agent creates the final artifact and action payload, then records the target account, intended time and relevant dependencies.</Step>
      <Step number="02" title="Awaiting review">The Founder Inbox shows the media or document itself, platform-specific copy and the exact external action.</Step>
      <Step number="03" title="Approved or rejected">The decision is attached to a fixed version of the payload. A later revision requires a new approval.</Step>
      <Step number="04" title="Executed and reconciled">After the provider call, Ekvaar records the provider ID or receipt and reconciles it against the requested action.</Step>
    </DocSection>
    <DocSection title="What a useful log contains"><div className="grid gap-3 sm:grid-cols-2">{['Timestamp in organisation timezone', 'Actor and organisation', 'Task and workflow identifiers', 'Input summary', 'Provider and model route', 'Tool or node action', 'Artifact references', 'Error and retry detail', 'Approval state change', 'External provider receipt'].map((item) => <div key={item} className="border border-white/10 px-4 py-3 text-xs text-white/58">{item}</div>)}</div></DocSection>
    <DocSection title="How to investigate a failure"><p>Start from the task timeline, identify the first transition to Blocked or Failed, then inspect that action’s request, response status and provider. Search logs using the task or run ID so retries remain grouped with the original request.</p><Callout title="Do not approve around a missing dependency" tone="warn">If the media asset, connected identity or provider receipt is missing, fix the dependency and create a revision. Approval should not convert an incomplete payload into a publishable one.</Callout></DocSection>
  </>
}
