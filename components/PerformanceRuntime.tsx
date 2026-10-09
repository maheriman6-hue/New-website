'use client';

import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import Lenis from 'lenis';
import { initializePerformanceMode, markLitePerformanceMode } from '@/lib/perf';

export function PerformanceRuntime() {
  useLayoutEffect(() => {
    initializePerformanceMode();

    const lenis = new Lenis({ autoRaf: false });
    let probeStart = 0;
    let probeFrames = 0;
    let probeComplete = false;

    const beginFrameProbe = () => {
      if (probeComplete || probeStart !== 0) return;
      probeStart = performance.now();
      probeFrames = 0;
    };

    const onHeroTransition = () => beginFrameProbe();
    const onQuoteModalOpen = () => lenis.stop();
    const onQuoteModalClose = () => lenis.start();
    const onTick = (time: number) => {
      lenis.raf(time * 1000);
      if (probeStart === 0 || probeComplete || document.visibilityState !== 'visible') return;

      probeFrames += 1;
      const elapsed = performance.now() - probeStart;
      if (elapsed < 1000) return;

      const averageFps = (probeFrames * 1000) / elapsed;
      document.documentElement.dataset.perfProbeFps = averageFps.toFixed(1);
      probeComplete = true;
      if (averageFps < 45) markLitePerformanceMode();
    };

    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(onTick);
    document.addEventListener('hero:transition-start', onHeroTransition);
    document.addEventListener('quote-modal:open', onQuoteModalOpen);
    document.addEventListener('quote-modal:close', onQuoteModalClose);

    return () => {
      document.removeEventListener('hero:transition-start', onHeroTransition);
      document.removeEventListener('quote-modal:open', onQuoteModalOpen);
      document.removeEventListener('quote-modal:close', onQuoteModalClose);
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return null;
}
