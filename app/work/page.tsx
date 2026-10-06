import { AppShell } from '@/components/AppShell';

export default function WorkPage() {
  return (
    <AppShell heroTone="dark">
      <div className="min-h-[85vh] bg-[#0a0a0a] px-4 pb-10 pt-10 sm:px-6 lg:px-7">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f5f1ea]/70">(Index) — Selected work 2019–26</div>
            <div className="text-[clamp(4rem,10vw,12rem)] font-display uppercase leading-[0.8] tracking-[-0.08em] text-[#f2eee6]">WORK</div>
          </div>
          <div className="text-[clamp(3rem,6vw,8rem)] font-display uppercase leading-[0.8] tracking-[-0.08em] text-[#e8261a]">12</div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {['All 12', 'Fashion 02', 'Sport 02', 'Still life 02', 'Film 01', 'Beauty 01', 'Automotive 01', 'Architecture 01', 'Fragrance 01', 'Performance 01'].map((label, index) => (
            <button
              key={label}
              className={[
                'rounded-full border px-4 py-2 text-[12px] uppercase tracking-[0.14em] transition-all',
                index === 0 ? 'border-[#f2eee6] bg-[#f2eee6] text-[#0a0a0a]' : 'border-white/20 bg-transparent text-[#f2eee6]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            { title: 'Solstice', meta: 'Vogue Italia — 2026', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80' },
            { title: 'Tides', meta: 'Swim — 2025', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80' },
            { title: 'Terracotta', meta: 'Still life — 2024', image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80' },
            { title: 'Drift', meta: 'Desert — 2023', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80' },
          ].map((item, index) => (
            <article key={item.title} className="group overflow-hidden rounded-[18px] border border-white/10 bg-black/20">
              <div className="relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-[420px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  style={{ clipPath: index % 2 === 0 ? 'inset(12% 0% 0% 0% round 18px)' : 'inset(0% 0% 0% 0% round 18px)' }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,transparent_40%,rgba(0,0,0,0.2))]" />
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-4">
                <div className="font-serif italic text-[1.7rem] leading-none text-[#f2eee6]">{item.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f5f1ea]/70">{item.meta}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
