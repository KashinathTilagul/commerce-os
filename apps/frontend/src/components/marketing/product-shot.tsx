import Image from 'next/image'

export function ProductShot({ src, alt, label, note, priority = false }: { src: string; alt: string; label: string; note: string; priority?: boolean }) {
  return (
    <figure>
      <div className="overflow-hidden border border-white/12 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,.55)]">
        <div className="flex h-9 items-center justify-between border-b border-white/10 px-3">
          <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#C0342C]" /><span className="h-2 w-2 rounded-full bg-[#D9A62E]" /><span className="h-2 w-2 rounded-full bg-[#2E7D32]" /></div>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/30">Real product screen</span>
          <span className="h-1.5 w-10 rounded-full bg-white/8" />
        </div>
        <div className="overflow-hidden">
          <Image src={src} alt={alt} width={1280} height={720} priority={priority} className="-mt-6 h-auto w-full" />
        </div>
      </div>
      <figcaption className="mt-4 flex flex-col justify-between gap-2 sm:flex-row">
        <span className="text-sm font-medium text-white/78">{label}</span>
        <span className="max-w-xl text-xs leading-5 text-white/36 sm:text-right">{note}</span>
      </figcaption>
    </figure>
  )
}
