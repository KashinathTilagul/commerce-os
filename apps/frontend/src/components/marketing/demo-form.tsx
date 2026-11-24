'use client'

import { useState, type FormEvent } from 'react'
import { attribution, reportLead } from './ad-tags'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EDE4]'

// Saved straight into the ABATA AI CRM (Enquiries). If that fails, the visitor's email app opens
// with the same details, so a request is never lost.
export function DemoForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const get = (k: string) => String(data.get(k) || '').trim()
    const attr = attribution()
    setState('sending')
    try {
      const res = await fetch('https://crm.abata.tech/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'demo', site: 'commerce', name: get('name'), email: get('email'), company: get('company'), message: get('note'), attribution: attr }),
      })
      if (!res.ok) throw new Error(String(res.status))
      reportLead('commerce_demo')
      setState('sent')
    } catch {
      setState('idle')
      const lines = [
        `Name: ${get('name')}`,
        `Work email: ${get('email')}`,
        `Company: ${get('company')}`,
        '',
        get('note'),
        ...Object.entries(attr).map(([k, v]) => `${k}: ${v}`),
      ]
      window.location.href = `mailto:kashinathtilagul@gmail.com?subject=${encodeURIComponent('Commerce OS demo')}&body=${encodeURIComponent(lines.join('\n'))}`
    }
  }

  if (state === 'sent')
    return (
      <p role="status" className="mt-8 rounded-xl border border-white/15 bg-white/[0.04] p-4 text-sm text-[#F3EDE4]">
        Thanks — we have your request and will email you to set up the demo.
      </p>
    )

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <label className="grid gap-1.5 text-sm text-[#E7E1D6]" htmlFor="demo-name">Name
        <input id="demo-name" name="name" required autoComplete="name" className={`h-11 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-[#F3EDE4] ${focus}`} />
      </label>
      <label className="grid gap-1.5 text-sm text-[#E7E1D6]" htmlFor="demo-email">Work email
        <input id="demo-email" name="email" type="email" required autoComplete="email" className={`h-11 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-[#F3EDE4] ${focus}`} />
      </label>
      <label className="grid gap-1.5 text-sm text-[#E7E1D6]" htmlFor="demo-company">Company
        <input id="demo-company" name="company" required autoComplete="organization" className={`h-11 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-[#F3EDE4] ${focus}`} />
      </label>
      <label className="grid gap-1.5 text-sm text-[#E7E1D6]" htmlFor="demo-note">What you want to see
        <textarea id="demo-note" name="note" rows={4} className={`rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-[#F3EDE4] ${focus}`} />
      </label>
      <button type="submit" disabled={state === 'sending'} className={`h-12 rounded-full bg-[#F3EDE4] text-sm font-semibold text-[#12110F] hover:bg-white disabled:opacity-60 ${focus}`}>{state === 'sending' ? 'Sending…' : 'Request a demo'}</button>
    </form>
  )
}
