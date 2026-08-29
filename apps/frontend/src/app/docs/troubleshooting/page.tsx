import type { Metadata } from 'next'
import { Callout, DocIntro, DocSection } from '@/components/marketing/docs-shell'

export const metadata: Metadata = { title: 'Troubleshooting' }

const issues = [
  ['Provider key saves but the model is unavailable', 'Run the provider connection test, inspect the server response, then sync models. A routing dropdown should show only models returned by a verified connection.'],
  ['Composio says an API key is required', 'Add the key for the current organisation in Settings. Then verify the target toolkit has an auth configuration in the same Composio project.'],
  ['OAuth opens an invalid app or missing client ID page', 'The provider application is not fully configured. Check the client ID, secret, redirect URL and enabled product before retrying.'],
  ['n8n returns Unexpected token <', 'The configured URL returned HTML, commonly a login page, editor route or proxy error. Use the active production webhook endpoint and return JSON.'],
  ['Image or carousel is blocked', 'Verify a connected image model is selected, the provider returns a usable image artifact, storage accepts it and every requested slide has a durable reference.'],
  ['Local database reports a missing column', 'The Prisma schema and database are out of sync. Apply the intended migration to the correct database, regenerate the client and restart the server.'],
  ['The app refreshes to the wrong state', 'Verify the route encodes the active workspace or window state and that organisation state is loaded before restoring it. Avoid relying only on in-memory client state.'],
]

export default function TroubleshootingPage() {
  return <><DocIntro eyebrow="Troubleshooting" title="Find the first broken dependency." body="Most failures become understandable when you start from the task or request ID and follow the timeline to the first failed provider or missing configuration." /><DocSection title="Common failures"><div className="space-y-3">{issues.map(([title, body]) => <details key={title} className="group border border-white/10 bg-[#080808] p-5"><summary className="cursor-pointer list-none font-medium text-white">{title}</summary><p className="mt-4 text-sm leading-7 text-white/48">{body}</p></details>)}</div></DocSection><DocSection title="Escalation evidence"><p>Before escalating, capture the organisation ID, task ID, run or execution ID, time in IST, first error message, provider response status and whether the failure reproduces. Do not include secret values in logs or screenshots.</p><Callout title="Current local note" tone="warn">If SystemSetting fields exist in Prisma but not in the connected database, repair the migration state first. Provider failures may be secondary noise caused by the settings query failing.</Callout></DocSection></>
}
