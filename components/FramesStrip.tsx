'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const frames = [
  {
    src: '/media/solstice.webp',
    alt: 'Fashion portrait from the studio archive',
    shape: 'wide',
    tilt: '-3deg',
  },
  {
    src: '/media/terracotta-hour.webp',
    alt: 'Terracotta still life from a set shoot',
    shape: 'portrait',
    tilt: '2.5deg',
  },
  {
    src: '/media/drift.webp',
    alt: 'A quiet landscape between takes',
    shape: 'wide',
    tilt: '-2deg',
  },
  {
    src: '/media/lane-seven.webp',
    alt: 'Swimmer moving through blue water',
    shape: 'portrait',
    tilt: '3deg',
  },
];

export function FramesStrip() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  function scrollFrames(direction: -1 | 1) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollBy({
      left: direction * viewport.clientWidth * 0.8,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      section.querySelectorAll<HTMLElement>('.frames-strip__drift').forEach((image, index) => {
        gsap.fromTo(
          image,
          { y: index % 2 === 0 ? 24 : -24 },
          {
            y: index % 2 === 0 ? -24 : 24,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.7,
              onEnter: () => { image.style.willChange = 'transform'; },
              onEnterBack: () => { image.style.willChange = 'transform'; },
              onLeave: () => { image.style.willChange = 'auto'; },
              onLeaveBack: () => { image.style.willChange = 'auto'; },
            },
          },
        );
      });
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="frames-strip" aria-labelledby="frames-strip-heading">
      <div className="frames-strip__header">
        <span className="frames-strip__eyebrow">(04) — FRAMES</span>
        <h2 id="frames-strip-heading" className="frames-strip__heading">
          In-betweens <span>&amp; outtakes</span>
        </h2>
      </div>
      <div className="frames-strip__gallery">
        <nav className="frames-strip__controls" aria-label="Browse frames">
          <button type="button" aria-label="Show previous frames" aria-controls="frames-strip-gallery" onClick={() => scrollFrames(-1)}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" aria-label="Show next frames" aria-controls="frames-strip-gallery" onClick={() => scrollFrames(1)}>
            <span aria-hidden="true">→</span>
          </button>
        </nav>
        <div className="frames-strip__viewport" id="frames-strip-gallery" ref={viewportRef}>
          <div className="frames-strip__track">
            {frames.map((frame, index) => (
              <figure
                className={`frames-strip__frame frames-strip__frame--${frame.shape}`}
                key={frame.src}
                style={{ '--frame-tilt': frame.tilt } as React.CSSProperties}
              >
                <div className="frames-strip__drift">
                  <Image
                    className="frames-strip__image"
                    src={frame.src}
                    alt={frame.alt}
                    fill
                    sizes={frame.shape === 'wide' ? '(max-width: 700px) 74vw, 42vw' : '(max-width: 700px) 50vw, 22vw'}
                    loading="lazy"
                    priority={false}
                  />
                </div>
                <figcaption className="frames-strip__index">FRAME / {String(index + 1).padStart(2, '0')}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
