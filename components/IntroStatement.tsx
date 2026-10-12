'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  createEntranceTimeline,
  ENTRANCE_EASE,
  ENTRANCE_TIMING,
  observeEntranceOnce,
  registerEntranceEase,
} from '@/lib/entranceMotion';

type StatementWord = {
  text: string;
  accent?: boolean;
  italic?: boolean;
};

const statementLines: StatementWord[][] = [
  [{ text: 'WE' }, { text: 'BUILD' }],
  [{ text: 'SPORTSWEAR', accent: true }],
  [{ text: '&' }, { text: 'STREETWEAR' }, { text: 'FOR' }],
  [{ text: 'BRANDS' }, { text: 'THAT' }],
  [{ text: 'refuse', accent: true, italic: true }, { text: 'TO' }, { text: 'STAND' }],
  [{ text: 'STILL.' }],
];

const imageChips = [
  { src: '/media/sportswear-hero.jpg', alt: 'Sportswear models' },
  { src: '/media/streetwear-hero.jpg', alt: 'Streetwear hoodie' },
  { src: '/media/stiching.webp', alt: 'Hands stitching fabric' },
];

export function IntroStatement() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    registerEntranceEase();

    let stopObserving: (() => void) | undefined;
    const context = gsap.context(() => {
      const labels = section.querySelectorAll<HTMLElement>('.intro-statement__topline > span');
      const yearCounter = section.querySelector<HTMLElement>('.intro-statement__year');
      const lines = Array.from(section.querySelectorAll<HTMLElement>('.intro-statement__line'));
      const words = section.querySelectorAll<HTMLElement>('.intro-statement__word');
      const accents = section.querySelectorAll<HTMLElement>('.intro-statement__word.is-accent');
      const pills = section.querySelectorAll<HTMLElement>('.intro-statement__chip');
      const paragraph = section.querySelector<HTMLElement>('.intro-statement__copy');
      const link = section.querySelector<HTMLElement>('.intro-statement__link');
      const underline = section.querySelector<HTMLElement>('.intro-statement__link-underline');
      const images = section.querySelectorAll<HTMLImageElement>('.intro-statement__chip img');
      if (!paragraph || !link || !underline) return;

      section.classList.add('is-animation-active');
      gsap.set(labels, { opacity: 0, y: 12 });
      if (yearCounter) yearCounter.textContent = '0000';
      gsap.set(words, { opacity: 0, yPercent: 100 });
      gsap.set(accents, { color: getComputedStyle(section).color });
      gsap.set(pills, { opacity: 0, yPercent: 100, clipPath: 'inset(0 100% 0 0 round 999px)' });
      gsap.set(images, { scale: 1.15, transformOrigin: 'center' });
      gsap.set(paragraph, { opacity: 0, y: 16 });
      gsap.set(link, { opacity: 0, y: 12 });
      gsap.set(underline, { scaleX: 0, transformOrigin: 'left center' });

      const animatedElements = [
        ...Array.from(labels),
        ...Array.from(words),
        ...Array.from(pills),
        ...Array.from(images),
        paragraph,
        link,
        underline,
      ];
      const timeline = createEntranceTimeline(animatedElements, {
        onComplete: () => section.classList.remove('is-animation-active'),
      });
      let hasStarted = false;
      const startAnimation = () => {
        if (hasStarted) return;
        hasStarted = true;
        timeline.play(0);
      };

      timeline.to(labels, { opacity: 1, y: 0, duration: ENTRANCE_TIMING.labelDuration, ease: ENTRANCE_EASE }, 0);
      if (yearCounter) {
        const year = { value: 0 };
        timeline.to(year, {
          value: 2023,
          duration: ENTRANCE_TIMING.yearDuration,
          ease: ENTRANCE_EASE,
          roundProps: 'value',
          onUpdate: () => { yearCounter.textContent = String(Math.round(year.value)).padStart(4, '0'); },
        }, 0);
      }

      lines.forEach((line, index) => {
        const lineStart = ENTRANCE_TIMING.lineStart + index * ENTRANCE_TIMING.lineStagger;
        const lineWords = line.querySelectorAll<HTMLElement>('.intro-statement__word');
        const linePills = line.querySelectorAll<HTMLElement>('.intro-statement__chip');

        timeline.to(lineWords, {
          opacity: 1,
          yPercent: 0,
          duration: ENTRANCE_TIMING.wordDuration,
          ease: ENTRANCE_EASE,
        }, lineStart);
        linePills.forEach((pill) => {
          const image = pill.querySelector('img');
          timeline.to(pill, {
            opacity: 1,
            yPercent: 0,
            clipPath: 'inset(0 0% 0 0 round 999px)',
            duration: ENTRANCE_TIMING.chipDuration,
            ease: ENTRANCE_EASE,
          }, lineStart + ENTRANCE_TIMING.chipStartOffset);
          if (image) {
            timeline.to(image, {
              scale: 1,
              duration: ENTRANCE_TIMING.chipDuration,
              ease: ENTRANCE_EASE,
            }, lineStart + ENTRANCE_TIMING.chipStartOffset);
          }
        });
      });

      accents.forEach((accent) => {
        const line = accent.closest<HTMLElement>('.intro-statement__line');
        const lineIndex = line ? lines.indexOf(line) : -1;
        if (lineIndex < 0) return;
        timeline.to(accent, {
          color: getComputedStyle(section).getPropertyValue('--statement-accent').trim(),
          duration: ENTRANCE_TIMING.accentDuration,
          ease: ENTRANCE_EASE,
        }, ENTRANCE_TIMING.lineStart + lineIndex * ENTRANCE_TIMING.lineStagger + ENTRANCE_TIMING.accentStartOffset);
      });

      timeline.to(paragraph, {
        opacity: 1,
        y: 0,
        duration: ENTRANCE_TIMING.paragraphDuration,
        ease: ENTRANCE_EASE,
      }, ENTRANCE_TIMING.paragraphStart);
      timeline.to(link, {
        opacity: 1,
        y: 0,
        duration: ENTRANCE_TIMING.linkDuration,
        ease: ENTRANCE_EASE,
      }, ENTRANCE_TIMING.linkStart);
      timeline.to(underline, {
        scaleX: 1,
        duration: ENTRANCE_TIMING.underlineDuration,
        ease: ENTRANCE_EASE,
      }, ENTRANCE_TIMING.underlineStart);

      stopObserving = observeEntranceOnce(section, ENTRANCE_TIMING, startAnimation);
    }, section);

    return () => {
      stopObserving?.();
      context.revert();
      section.classList.remove('is-animation-active');
    };
  }, []);

  return (
    <section ref={sectionRef} className="intro-statement" aria-labelledby="intro-statement-title">
      <div className="intro-statement__topline">
        <span>(01) — WHO WE ARE</span>
        <span>CUSTOM MANUFACTURING · SINCE <span className="intro-statement__year">2023</span></span>
      </div>

      <h2
        id="intro-statement-title"
        className="intro-statement__headline"
        aria-label="We build sportswear and streetwear for brands that refuse to stand still."
      >
        {statementLines.map((line, lineIndex) => (
          <span className="intro-statement__line" key={`line-${lineIndex}`}>
            {line.map((word, wordIndex) => (
              <span
                className={[
                  'intro-statement__word',
                  word.accent ? 'is-accent' : '',
                  word.italic ? 'is-italic' : '',
                ].filter(Boolean).join(' ')}
                key={`${lineIndex}-${wordIndex}`}
                aria-hidden="true"
              >
                {word.text}
              </span>
            ))}
            {lineIndex === 1 && (
              <span className="intro-statement__chip">
                <Image src={imageChips[0].src} alt={imageChips[0].alt} fill sizes="112px" />
              </span>
            )}
            {lineIndex === 3 && (
              <span className="intro-statement__chip intro-statement__chip--wide">
                <Image src={imageChips[1].src} alt={imageChips[1].alt} fill sizes="150px" />
              </span>
            )}
            {lineIndex === 5 && (
              <span className="intro-statement__chip">
                <Image src={imageChips[2].src} alt={imageChips[2].alt} fill sizes="112px" />
              </span>
            )}
          </span>
        ))}
      </h2>

      <div className="intro-statement__copy">
        <p>
          Custom sportswear and streetwear for brands that would rather be worn than talked about.
          Based in SIALKOT, PAKISTAN — from first sample to final delivery.
        </p>
      </div>

      <Link className="intro-statement__link" href="/about">
        About Zateef <span className="intro-statement__link-arrow" aria-hidden="true">↗</span>
        <span className="intro-statement__link-underline" aria-hidden="true" />
      </Link>
    </section>
  );
}
