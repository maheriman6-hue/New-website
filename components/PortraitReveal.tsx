'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const steps = Array.from({ length: 10 }, (_, index) => index);

export function PortraitReveal() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const shutters = section.querySelectorAll<HTMLElement>('.portrait-reveal__shutter');
    const context = gsap.context(() => {
      gsap.set(shutters, { scaleY: 1, transformOrigin: 'center bottom' });
      gsap.to(shutters, {
        scaleY: 0,
        duration: 0.7,
        stagger: 0.07,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: section,
          start: 'top 78%',
          once: true,
        },
        onStart: () => shutters.forEach((shutter) => { shutter.style.willChange = 'transform, opacity'; }),
        onComplete: () => shutters.forEach((shutter) => { shutter.style.willChange = 'auto'; }),
      });
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="portrait-reveal" aria-label="Portrait of photographer Ines Varga">
      <div className="portrait-reveal__image-wrap">
        <Image
          className="portrait-reveal__image"
          src="/media/solstice.webp"
          alt="Portrait from the studio's fashion work"
          fill
          priority
          sizes="(max-width: 700px) 100vw, 96vw"
        />
        <div className="portrait-reveal__shutters" aria-hidden="true">
          {steps.map((step) => <span className="portrait-reveal__shutter" key={step} />)}
        </div>
      </div>
      <p className="portrait-reveal__caption">(ABOUT) — INES VARGA, B. 1988, PORTO</p>
    </section>
  );
}
