import { AppShell } from '@/components/AppShell';
import { HomeHeroSlider } from '@/components/HomeHeroSlider';
import { IntroStatement } from '@/components/IntroStatement';
import { SelectedWork } from '@/components/SelectedWork';
import { ReelBlock } from '@/components/ReelBlock';
import { FramesStrip } from '@/components/FramesStrip';
import { ClientsMarquee } from '@/components/ClientsMarquee';
import { RedCTA } from '@/components/RedCTA';
import { Cursor } from '@/components/Cursor';

export default function Home() {
  return (
    <AppShell heroTone="dark" overlayHeader>
      <div className="selection:bg-[#e8261a] selection:text-[#0a0a0a]">
        <HomeHeroSlider />
        <IntroStatement />
        <SelectedWork />
        <ReelBlock />
        <FramesStrip />
        <ClientsMarquee />
        <RedCTA />
        <Cursor />
      </div>
    </AppShell>
  );
}