import type { Metadata } from 'next'
import { Callout, DocIntro, DocSection, Step } from '@/components/marketing/docs-shell'

export const metadata: Metadata = { title: 'Build workflows' }

export default function WorkflowsPage() {
  return <><DocIntro eyebrow="Guide · Workflows" title="Make automation visible and assignable." body="A workflow is useful only when its trigger, inputs, owner, outputs, failure path and approval boundary are explicit." />
    <DocSection title="Workflow contract"><p>Every production workflow should define an owner, the event or schedule that starts it, a versioned input shape, the expected artifacts or records, a timeout, a failure destination and whether approval is required before any external action.</p></DocSection>
    <DocSection title="Create an n8n workflow">
      <Step number="01" title="Choose the trigger">Use a webhook for an Ekvaar-requested run, a schedule for recurring work, or an app event for a connected-provider event.</Step>
      <Step number="02" title="Validate the request">Reject missing organisation, actor, task and instruction fields before calling a model or third-party service.</Step>
      <Step number="03" title="Map model nodes">Keep model credentials inside their model nodes. Use explicit primary and fallback paths, and return the selected provider and model in the trace.</Step>
      <Step number="04" title="Create artifacts">Write generated text, media or reports to durable storage and return stable artifact references—not temporary UI-only values.</Step>
      <Step number="05" title="Create approval when required">For publishing, payments or other sensitive actions, stop with a reviewable approval item that contains the final artifact and frozen action details.</Step>
      <Step number="06" title="Return structured output">Respond with JSON containing status, run ID, task ID, artifact references, blocked reason and next action.</Step>
    </DocSection>
    <DocSection title="Assign a workflow to an agent"><p>In the agent workspace, choose the workflow and define whether the agent may trigger it manually, on a schedule or from an event. Grant only the integrations the workflow needs. The assigned agent remains accountable for the run even when n8n performs the steps.</p><Callout title="Automation is not permission" tone="warn">A scheduled run does not bypass an approval policy. The publishing or mutation node should receive an approval-bound execution payload, not merely a boolean from the agent.</Callout></DocSection>
  </>
}
