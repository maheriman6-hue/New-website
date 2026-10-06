import { AppShell } from '@/components/AppShell';
import { HomeHeroSlider } from '@/components/HomeHeroSlider';

export default function Home() {
  return (
    <AppShell heroTone="dark" overlayHeader>
      <div className="selection:bg-[#e8261a] selection:text-[#0a0a0a]">
        <HomeHeroSlider />
      </div>
    </AppShell>
  );
}