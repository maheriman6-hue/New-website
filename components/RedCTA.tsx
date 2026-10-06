'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const steps = Array.from({ length: 10 }, (_, index) => index);

export function RedCTA() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const shutters = section.querySelectorAll<HTMLElement>('.red-cta__shutter');
    const content = section.querySelectorAll<HTMLElement>('.red-cta__content > *');
    const context = gsap.context(() => {
      gsap.set(shutters, { scaleY: 1, transformOrigin: 'center bottom' });
      gsap.set(content, { y: 24, opacity: 0 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 74%',
          once: true,
        },
        onStart: () => gsap.set(shutters, { willChange: 'transform' }),
        onComplete: () => gsap.set(shutters, { willChange: 'auto' }),
      });

      timeline
        .to(shutters, {
          scaleY: 0,
          duration: 0.68,
          stagger: 0.075,
          ease: 'power3.inOut',
        })
        .to(content, {
          y: 0,
          opacity: 1,
          duration: 0.62,
          stagger: 0.07,
          ease: 'power3.out',
        }, '-=0.48');
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="red-cta" aria-labelledby="red-cta-heading">
      <div className="red-cta__shutters" aria-hidden="true">
        {steps.map((step) => (
          <span className="red-cta__shutter" data-step={step} key={step} />
        ))}
      </div>
      <div className="red-cta__content">
        <p className="red-cta__eyebrow">(06) — COMMISSIONS OPEN</p>
        <h2 id="red-cta-heading" className="red-cta__heading">
          <span>LET’S TURN</span>
          <em>the next frame.</em>
        </h2>
        <div className="red-cta__bottom">
          <Link className="red-cta__button" href="/contact">
            Start a project <span aria-hidden="true">↗</span>
          </Link>
          <a className="red-cta__email" href="mailto:hello@inesvarga.studio">
            hello@inesvarga.studio
          </a>
          <span className="red-cta__reply">REPLY WITHIN 48H</span>
        </div>
      </div>
    </section>
  );
}
