'use client'

import type { FormEvent } from 'react'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EDE4]'

export function DemoForm() {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const lines = [
      `Name: ${String(data.get('name') || '')}`,
      `Work email: ${String(data.get('email') || '')}`,
      `Company: ${String(data.get('company') || '')}`,
      '',
      String(data.get('note') || ''),
    ]
    const href = `mailto:kashinathtilagul@gmail.com?subject=${encodeURIComponent('Commerce OS demo')}&body=${encodeURIComponent(lines.join('\n'))}`
    window.location.href = href
  }

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
      <button type="submit" className={`h-12 rounded-full bg-[#F3EDE4] text-sm font-semibold text-[#12110F] hover:bg-white ${focus}`}>Open email to request a demo</button>
    </form>
  )
}
