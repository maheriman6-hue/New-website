import { AppShell } from '@/components/AppShell';

export default function ContactPage() {
  return (
    <AppShell heroTone="light">
      <div className="bg-[#f2eee6] px-4 pb-14 pt-10 text-[#0a0a0a] sm:px-6 lg:px-7">
        <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em]">(Contact) — Commissions open from Oct 2026</div>
        <div className="mb-8 text-[clamp(4rem,13vw,18rem)] font-display uppercase leading-[0.8] tracking-[-0.08em]">Say</div>

        <div className="mb-8 grid gap-8 md:grid-cols-3">
          <div className="border-t border-black/20 pt-4">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">Commissions</div>
            <p className="max-w-[18ch] text-[18px] leading-[1.45]">Campaigns, editorial, film, still life, and motion.</p>
          </div>
          <div className="border-t border-black/20 pt-4">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">Representation</div>
            <p className="text-[18px] leading-[1.45]">hello@inesvarga.studio</p>
          </div>
          <div className="border-t border-black/20 pt-4">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">Studio</div>
            <p className="text-[18px] leading-[1.45]">Lisbon — PT</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button className="rounded-full bg-[#0a0a0a] px-6 py-3 text-[12px] uppercase tracking-[0.12em] text-[#f2eee6]">Start a commission ↗</button>
          <button className="rounded-full bg-[#e8261a] px-6 py-3 text-[12px] uppercase tracking-[0.12em] text-[#0a0a0a]">See the work first</button>
        </div>
      </div>
    </AppShell>
  );
}
