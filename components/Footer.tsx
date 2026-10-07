export function Footer() {
  return (
    <footer className="relative z-20 border-t border-[#e8261a] bg-[#0a0a0a] px-4 pb-8 pt-5 sm:px-6 lg:px-7">
      <div className="relative before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] before:bg-[#e8261a] before:content-['']" />

      <div className="flex flex-col gap-8 pt-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-[180px]">
          <div className="mb-6 space-y-3 text-[15px]">
            <div className="text-[#f5f1ea]">Work</div>
            <div className="text-[#f5f1ea]">About</div>
            <div className="text-[#f5f1ea]">Contact</div>
          </div>

          <div className="space-y-2 text-[12px] uppercase tracking-[0.08em] text-[#f5f1ea]/75">
            <div className="font-mono">Based in</div>
            <div className="font-mono">Lisbon — PT</div>
            <div className="font-mono">New York — US</div>
          </div>
        </div>

        <div className="flex min-w-[180px] flex-col gap-3 text-[17px] text-[#f5f1ea]">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f5f1ea]/75">Social</div>
          <div>Instagram</div>
          <div>Vimeo</div>
          <div>LinkedIn</div>
        </div>

        <div className="flex min-w-[220px] flex-col gap-3 text-[17px] text-[#f5f1ea]">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f5f1ea]/75">Contact</div>
          <div>hello@inesvarga.studio</div>
          <div>+351 912 000 000</div>
        </div>
      </div>

      <div className="mt-8 text-center text-[clamp(5rem,17vw,24rem)] font-display font-black uppercase leading-[0.8] tracking-[-0.08em] text-[#f2eee6]">
        VARGA
      </div>

    </footer>
  );
}
