export function Nav() {
  return (
    <header className="relative z-20 flex items-start justify-between px-4 pt-4 sm:px-6 lg:px-7">
      <div className="flex h-[40px] items-center rounded-full bg-[#f2eee6] px-4 text-[#0a0a0a] shadow-soft">
        <span className="font-display text-[2rem] leading-none tracking-[-0.08em] font-black uppercase">VARGA</span>
        <span className="font-serif italic text-[1.2rem] leading-none tracking-[-0.04em] ml-2">ines</span>
      </div>

      <nav className="ml-4 mt-0 flex items-center rounded-full bg-[rgba(242,238,230,0.16)] px-3 py-2 backdrop-blur-sm border border-white/10 shadow-soft">
        <a href="#" className="px-3 py-1 text-[15px] font-medium text-[#f6f2ea]">Work</a>
        <a href="#" className="px-3 py-1 text-[15px] font-medium text-[#f6f2ea]">About</a>
        <a href="#" className="px-3 py-1 text-[15px] font-medium text-[#f6f2ea]">Contact</a>
      </nav>

      <div className="flex h-[40px] items-center gap-2 rounded-full bg-[#f2eee6] px-4 text-[#0a0a0a] shadow-soft">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ea1f1a] shadow-[0_0_0_2px_rgba(234,31,26,0.15)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">Available — Oct 2026</span>
      </div>
    </header>
  );
}
