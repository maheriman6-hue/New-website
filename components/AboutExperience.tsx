'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AppShell } from '@/components/AppShell';
import { PortraitReveal } from '@/components/PortraitReveal';
import { RecognitionList } from '@/components/RecognitionList';

const statistics = [
  { value: 12, label: 'Years behind the lens' },
  { value: 211, label: 'Commissions' },
  { value: 18, label: 'Countries' },
  { value: 9, label: 'Awards' },
];

const services = [
  { name: 'Photography', details: 'Campaign · Editorial · Still life' },
  { name: 'Art Direction', details: 'Concept · Casting · Set design' },
  { name: 'Motion', details: 'Fashion film · Loops · Social cuts' },
];

const setImages = [
  { src: '/media/drift.webp', alt: 'Landscape between takes at golden hour', caption: 'BETWEEN TAKES — PORTUGAL' },
  { src: '/media/terracotta-hour.webp', alt: 'Objects arranged on a studio set', caption: 'STILL LIFE SET — LISBON' },
  { src: '/media/lane-seven.webp', alt: 'Blue water on a campaign set', caption: 'WATER STUDY — 2025' },
];

export function AboutExperience() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeService, setActiveService] = useState(0);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-stat]').forEach((stat) => {
        const target = Number(stat.dataset.stat);
        const output = stat.querySelector<HTMLElement>('.about-stats__value');
        const number = { value: 0 };
        if (!output || !Number.isFinite(target)) return;

        gsap.set(output, { y: 14, opacity: 0 });
        gsap.to(number, {
          value: target,
          duration: 1.35,
          ease: 'power2.out',
          snap: { value: 1 },
          onStart: () => {
            output.style.willChange = 'transform, opacity';
            gsap.to(output, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' });
          },
          onUpdate: () => { output.textContent = String(Math.round(number.value)).padStart(2, '0'); },
          onComplete: () => { output.style.willChange = 'auto'; },
          scrollTrigger: {
            trigger: stat,
            start: 'top 88%',
            once: true,
          },
        });
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <AppShell heroTone="dark">
      <div ref={rootRef} className="about-page">
        <PortraitReveal />

        <section className="about-story" aria-labelledby="about-story-heading">
          <p className="about-story__eyebrow">(ABOUT) — INES VARGA, B. 1988, PORTO</p>
          <h1 id="about-story-heading" className="about-story__statement">
            I grew up between a darkroom and a dance studio. Now I make pictures that keep moving after the shutter closes.
          </h1>
          <div className="about-story__signature">— Ines</div>
          <Link className="about-story__link" href="/contact">
            Work with me <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <section className="about-stats" aria-label="Studio experience">
          {statistics.map((stat) => (
            <div className="about-stats__item" data-stat={stat.value} key={stat.label}>
              <span className="about-stats__value">{String(stat.value).padStart(2, '0')}</span>
              <span className="about-stats__label">{stat.label}</span>
            </div>
          ))}
        </section>

        <section
          className="about-services"
          aria-labelledby="about-services-heading"
          onMouseLeave={() => setActiveService(-1)}
        >
          <p className="about-section__eyebrow">(SERVICES)</p>
          <h2 className="about-section__sr-heading" id="about-services-heading">What I do</h2>
          <ul className={`about-services__list${activeService >= 0 ? ' has-active' : ''}`}>
            {services.map((service, index) => (
              <li
                className={`about-services__item${activeService === index ? ' is-active' : ''}`}
                key={service.name}
                tabIndex={0}
                onMouseEnter={() => setActiveService(index)}
                onFocus={() => setActiveService(index)}
                onBlur={(event) => {
                  if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
                    setActiveService(-1);
                  }
                }}
              >
                <span className="about-services__name">{service.name}</span>
                <span className="about-services__details">{service.details}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-set" aria-labelledby="about-set-heading">
          <div className="about-section__heading">
            <p className="about-section__eyebrow">(ON SET)</p>
            <h2 id="about-set-heading">In good company.</h2>
          </div>
          <div className="about-set__gallery">
            {setImages.map((image, index) => (
              <figure className={`about-set__figure about-set__figure--${index + 1}`} key={image.caption}>
                <div className="about-set__image-wrap">
                  <Image
                    className="about-set__image"
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 700px) 100vw, 32vw"
                    loading="lazy"
                  />
                </div>
                <figcaption>{image.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="about-recognition" aria-labelledby="about-recognition-heading">
          <div className="about-section__heading">
            <p className="about-section__eyebrow">(RECOGNITION)</p>
            <h2 id="about-recognition-heading">A few kind words.</h2>
          </div>
          <RecognitionList />
        </section>
      </div>
    </AppShell>
  );
}
