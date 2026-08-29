import type { Metadata } from 'next'
import { Callout, DocIntro, DocSection, Step } from '@/components/marketing/docs-shell'

export const metadata: Metadata = { title: 'Connect integrations' }

export default function DocsIntegrationsPage() {
  return <><DocIntro eyebrow="Guide · Integrations" title="Connect accounts without passing tokens around." body="Ekvaar supports direct adapters for core services and organisation-scoped connections through Composio. The exact connection method depends on the provider." />
    <DocSection title="Choose the connection path"><p><strong className="text-white">OAuth</strong> is preferred for user-facing services because the provider shows the account and permissions being granted. <strong className="text-white">API keys</strong> are appropriate for infrastructure or model providers when the organisation owns the key. <strong className="text-white">Workflow endpoints</strong> are used when n8n receives a controlled trigger from Ekvaar.</p></DocSection>
    <DocSection title="Connect an OAuth app">
      <Step number="01" title="Open Integrations">Choose the service and select Connect. The page should identify the organisation making the connection.</Step>
      <Step number="02" title="Verify provider setup">If the workspace uses Composio, add the organisation’s Composio API key in Settings and verify the provider’s auth configuration exists.</Step>
      <Step number="03" title="Complete provider consent">Review the account name and requested scopes on the provider screen. Finish the consent flow only for the intended account.</Step>
      <Step number="04" title="Verify the connected identity">Return to Ekvaar and confirm the connection shows Live with the correct account or page name. Do not infer identity from a generic “connected” state.</Step>
    </DocSection>
    <DocSection title="Connect a provider key"><p>Go to Settings → AI Providers → Add new key. Select the provider, add the key, save and test it. Ekvaar should display only the models returned by connected providers when configuring a route.</p><Callout title="Keys stay server-side" tone="good">The UI should never read the stored secret back. Status endpoints expose connection state, not the secret value.</Callout></DocSection>
    <DocSection title="Connect n8n"><p>Use the internal n8n service URL for server-to-server health checks and a production webhook URL for controlled triggers. The workflow must return JSON, include a stable run identifier and write important outputs back to the Ekvaar task or approval record.</p><Callout title="Avoid HTML-as-JSON failures" tone="warn">If a trigger reports “Unexpected token &lt;”, the request reached an HTML page rather than the JSON webhook endpoint. Verify the production webhook URL, activation state, authentication and response node.</Callout></DocSection>
  </>
}
