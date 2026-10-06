import { AppShell } from '@/components/AppShell';

export default function AboutPage() {
  return (
    <AppShell heroTone="dark">
      <div className="bg-[#0a0a0a] px-4 pb-14 pt-10 sm:px-6 lg:px-7">
        <div className="mb-10 flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[#f5f1ea]/70">
          <span>(About) — Name, B. 1988, City</span>
          <span>Work with me ↗</span>
        </div>

        <div className="mb-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="h-[520px] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,#a0a0a0_0%,#525252_35%,#181818_100%)]" />
          <div className="space-y-6">
            <div className="font-serif italic text-[3rem] leading-[0.9] text-[#f2eee6] sm:text-[4rem]">
              I build images that move with instinct, memory and rhythm.
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#f5f1ea]/70">— Ines</div>
            <button className="rounded-full bg-[#e8261a] px-5 py-3 text-[12px] uppercase tracking-[0.12em] text-[#0a0a0a]">Work with me ↗</button>
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-4">
          {[
            ['12', 'Years behind the lens'],
            ['211', 'Commissions'],
            ['18', 'Countries'],
            ['09', 'Awards'],
          ].map(([value, label]) => (
            <div key={label} className="border-t border-white/10 pt-4">
              <div className="font-display text-[4rem] leading-none tracking-[-0.08em] text-[#f2eee6]">{value}</div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f1ea]/65">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
