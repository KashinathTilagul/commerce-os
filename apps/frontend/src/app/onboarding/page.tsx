'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Loader2, Plug, Search, ShieldCheck, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Integration = {
  id: string
  toolkitSlug: string
  name: string
  description: string
  category: string
  logoUrl?: string | null
  isConnected: boolean
}

type SetupData = {
  organization: { name: string; onboardingStep: number; onboardingCompletedAt?: string | null }
  context?: {
    companyProfile?: string
    industry?: string
    products?: string
    toneOfVoice?: string
    goals?: string
  }
  integrations: Integration[]
}

const steps = [
  { label: 'Identity', icon: Building2 },
  { label: 'Direction', icon: Target },
  { label: 'Connections', icon: Plug },
  { label: 'Ready', icon: ShieldCheck },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { status } = useSession()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<SetupData | null>(null)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    organizationName: '', companyProfile: '', industry: '', products: '', toneOfVoice: '', goals: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
    if (status !== 'authenticated') return
    fetch('/api/onboarding')
      .then(async (response) => {
        if ([401, 403, 404].includes(response.status)) {
          await signOut({ callbackUrl: '/signup' })
          return null
        }
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not load setup')
        return response.json()
      })
      .then((setup: SetupData | null) => {
        if (!setup) return
        if (setup.organization.onboardingCompletedAt) {
          router.replace('/')
          return
        }
        setData(setup)
        setStep(Math.min(setup.organization.onboardingStep || 0, 3))
        setForm({
          organizationName: setup.organization.name || '',
          companyProfile: setup.context?.companyProfile || '',
          industry: setup.context?.industry || '',
          products: setup.context?.products || '',
          toneOfVoice: setup.context?.toneOfVoice || '',
          goals: setup.context?.goals || '',
        })
      })
      .catch((e) => setError(e.message))
  }, [status, router])

  const visibleIntegrations = useMemo(() => {
    const integrations = data?.integrations || []
    const query = search.trim().toLowerCase()
    const sorted = [...integrations].sort((a, b) => {
      const preferred = ['shopify', 'gmail', 'googlecalendar', 'googledrive', 'slack', 'github', 'stripe', 'hubspot']
      const ai = preferred.indexOf(a.toolkitSlug)
      const bi = preferred.indexOf(b.toolkitSlug)
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.name.localeCompare(b.name)
    })
    return (query ? sorted.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query)) : sorted).slice(0, 18)
  }, [data, search])

  const save = async (nextStep: number, complete = false) => {
    setError('')
    if (step === 0 && (!form.organizationName.trim() || !form.industry.trim() || !form.companyProfile.trim())) {
      setError('Business name, industry, and a short description are required.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, onboardingStep: nextStep, complete }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save setup')
      if (complete) {
        router.push('/')
        router.refresh()
      } else {
        setStep(nextStep)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const connect = async (integration: Integration) => {
    setConnecting(integration.toolkitSlug)
    setError('')
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ onboardingStep: 2 }),
      })
      const response = await fetch(`/api/integrations/${integration.toolkitSlug}/connect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'connect' }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || `Could not connect ${integration.name}`)
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
        return
      }
      setData((current) => current ? {
        ...current,
        integrations: current.integrations.map((item) => item.toolkitSlug === integration.toolkitSlug ? { ...item, isConnected: true } : item),
      } : current)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setConnecting(null)
    }
  }

  if (status === 'loading' || (!data && !error)) {
    return <div className="min-h-screen bg-[#f3efe6] flex items-center justify-center text-[#17231d]"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }
  if (!data) {
    return <div className="min-h-screen bg-[#f3efe6] flex items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-[#c75a40]/30 bg-white p-7 text-center"><div className="font-semibold text-[#17231d]">Setup could not be loaded</div><div className="text-sm text-[#913b28] mt-2">{error}</div><Button className="mt-5" onClick={() => window.location.reload()}>Retry</Button></div></div>
  }

  const connectedCount = Array.isArray(data?.integrations) ? data.integrations.filter((integration) => integration.isConnected).length : 0

    return (<main className="min-h-screen bg-[#f3efe6] text-[#17231d] overflow-hidden relative">
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(#97a99f 0.7px, transparent 0.7px)', backgroundSize: '18px 18px' }} />
      <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#d8613c]/20 blur-3xl" />
      <div className="relative min-h-screen grid lg:grid-cols-[320px_1fr]">
        <aside className="bg-[#17231d] text-[#f7f1e5] p-7 lg:p-10 flex lg:flex-col justify-between">
          <div>
            <div className="text-xs tracking-[0.28em] uppercase text-[#d6c7a7]">Commerce OS</div>
            <h1 className="font-display text-3xl mt-3 leading-none">Make it yours.</h1>
            <p className="hidden lg:block text-sm text-[#acb8b1] mt-4 leading-relaxed">A clean operating system, configured around your company and connected only to data you authorize.</p>
          </div>
          <div className="hidden lg:grid gap-3 my-auto">
            {steps.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={item.label} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${index === step ? 'bg-white/10' : ''}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${index < step ? 'bg-[#d8613c] border-[#d8613c]' : index === step ? 'border-[#f7f1e5]' : 'border-white/20 text-white/40'}`}>
                    {index < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div><div className="text-[10px] uppercase tracking-widest text-white/45">Step {index + 1}</div><div className="text-sm">{item.label}</div></div>
                </div>
              )
            })}
          </div>
          <div className="hidden lg:flex items-center gap-2 text-xs text-white/45"><ShieldCheck className="h-4 w-4" /> Data stays isolated by organization</div>
        </aside>

        <section className="p-5 sm:p-10 lg:p-16 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <div className="lg:hidden flex gap-1.5 mb-8">{steps.map((_, index) => <div key={index} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-[#d8613c]' : 'bg-[#c9c7bd]'}`} />)}</div>

            {step === 0 && (
              <div className="max-w-2xl">
                <div className="text-xs font-semibold tracking-[0.2em] uppercase text-[#b54d31]">Your organization</div>
                <h2 className="font-display text-4xl sm:text-6xl tracking-tight mt-3">Tell the OS what it is running.</h2>
                <p className="text-[#617068] mt-4 max-w-xl">This becomes the ground truth for dashboards, agents, recommendations, and every connected app.</p>
                <div className="grid sm:grid-cols-2 gap-5 mt-9">
                  <Field label="Business name" value={form.organizationName} onChange={(organizationName) => setForm({ ...form, organizationName })} placeholder="Acme Studio" />
                  <Field label="Industry" value={form.industry} onChange={(industry) => setForm({ ...form, industry })} placeholder="Retail, consulting, SaaS..." />
                  <div className="sm:col-span-2"><Field label="What does your business do?" value={form.companyProfile} onChange={(companyProfile) => setForm({ ...form, companyProfile })} placeholder="A concise description of your company, customers, and business model" multiline /></div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="max-w-2xl">
                <div className="text-xs font-semibold tracking-[0.2em] uppercase text-[#b54d31]">Operating context</div>
                <h2 className="font-display text-4xl sm:text-6xl tracking-tight mt-3">Give every agent the same map.</h2>
                <div className="grid gap-5 mt-9">
                  <Field label="Products or services" value={form.products} onChange={(products) => setForm({ ...form, products })} placeholder="What you sell and who buys it" multiline />
                  <Field label="Top goals" value={form.goals} onChange={(goals) => setForm({ ...form, goals })} placeholder="The outcomes the company is working toward" multiline />
                  <Field label="Communication style" value={form.toneOfVoice} onChange={(toneOfVoice) => setForm({ ...form, toneOfVoice })} placeholder="Clear and direct, warm and conversational..." />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div><div className="text-xs font-semibold tracking-[0.2em] uppercase text-[#b54d31]">Connections</div><h2 className="font-display text-4xl sm:text-5xl tracking-tight mt-3">Bring your tools with you.</h2><p className="text-[#617068] mt-3">Connect now or add apps later. Nothing is connected by default.</p></div>
                  <div className="rounded-full bg-[#17231d] text-white px-4 py-2 text-xs">{connectedCount} connected</div>
                </div>
                <div className="relative mt-7 max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-[#75847c]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an app" className="pl-10 bg-white/70 border-[#c9c7bd]" /></div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5 max-h-[420px] overflow-y-auto pr-1">
                  {visibleIntegrations.map((integration) => (
                    <button key={integration.id} onClick={() => !integration.isConnected && connect(integration)} disabled={integration.isConnected || connecting === integration.toolkitSlug} className="text-left rounded-2xl border border-[#d5d0c4] bg-white/65 hover:bg-white p-4 transition-all disabled:cursor-default">
                      <div className="flex items-start justify-between gap-3"><div className="h-9 w-9 rounded-xl bg-[#e8e2d5] flex items-center justify-center font-semibold">{integration.name.slice(0, 1)}</div>{integration.isConnected ? <CheckCircle2 className="h-5 w-5 text-[#2f7655]" /> : connecting === integration.toolkitSlug ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plug className="h-4 w-4 text-[#9a684e]" />}</div>
                      <div className="font-semibold mt-4">{integration.name}</div><div className="text-xs text-[#68766f] mt-1 line-clamp-2">{integration.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-2xl">
                <div className="h-14 w-14 rounded-2xl bg-[#2f7655] text-white flex items-center justify-center"><Check className="h-7 w-7" /></div>
                <h2 className="font-display text-4xl sm:text-6xl tracking-tight mt-6">Your workspace is clean and ready.</h2>
                <p className="text-[#617068] mt-4 text-lg">{form.organizationName} will start with zero sample orders, products, customers, or revenue. Only the profile and {connectedCount} authorized connection{connectedCount === 1 ? '' : 's'} are present.</p>
                <div className="grid sm:grid-cols-3 gap-3 mt-8">
                  <Summary label="Business" value={form.organizationName} />
                  <Summary label="Industry" value={form.industry} />
                  <Summary label="Apps" value={`${connectedCount} connected`} />
                </div>
              </div>
            )}

            {error && <div className="mt-6 rounded-xl border border-[#c75a40]/30 bg-[#c75a40]/10 px-4 py-3 text-sm text-[#913b28]">{error}</div>}
            <div className="mt-10 flex items-center justify-between">
              <Button variant="ghost" disabled={step === 0 || saving} onClick={() => save(step - 1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button disabled={saving} onClick={() => save(Math.min(step + 1, 3), step === 3)} className="gap-2 bg-[#17231d] hover:bg-[#26382f] text-white px-6">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : step === 3 ? 'Enter your OS' : step === 2 ? 'Continue' : 'Save and continue'}
                {!saving && step < 3 && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return <div className="space-y-2"><Label className="text-[#34443b]">{label}</Label>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className="w-full rounded-xl border border-[#c9c7bd] bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#d8613c]/30 resize-none" /> : <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 rounded-xl border-[#c9c7bd] bg-white/70" />}</div>
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#d5d0c4] bg-white/60 p-4"><div className="text-[10px] uppercase tracking-widest text-[#7a877f]">{label}</div><div className="font-semibold mt-1 truncate">{value || 'Not set'}</div></div>
}
