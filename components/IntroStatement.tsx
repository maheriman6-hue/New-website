'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

const INTRO_EASE = 'intro-premium';
const INTRO_EASE_PATH = 'M0,0 C0.22,1 0.36,1 1,1';
const LINE_START = 0.1;
const LINE_STAGGER = 0.09;

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
    gsap.registerPlugin(CustomEase);

    const section = sectionRef.current;
    if (!section) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    CustomEase.create(INTRO_EASE, INTRO_EASE_PATH);

    let observer: IntersectionObserver | null = null;
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
      const timeline = gsap.timeline({
        paused: true,
        onStart: () => gsap.set(animatedElements, { willChange: 'transform, opacity, clip-path, color' }),
        onComplete: () => {
          gsap.set(animatedElements, { clearProps: 'willChange' });
          section.classList.remove('is-animation-active');
        },
      });
      let hasStarted = false;
      const startAnimation = () => {
        if (hasStarted) return;
        hasStarted = true;
        timeline.play(0);
      };

      timeline.to(labels, { opacity: 1, y: 0, duration: 0.7, ease: INTRO_EASE }, 0);
      if (yearCounter) {
        const year = { value: 0 };
        timeline.to(year, {
          value: 2023,
          duration: 1.4,
          ease: INTRO_EASE,
          roundProps: 'value',
          onUpdate: () => { yearCounter.textContent = String(Math.round(year.value)).padStart(4, '0'); },
        }, 0);
      }

      lines.forEach((line, index) => {
        const lineStart = LINE_START + index * LINE_STAGGER;
        const lineWords = line.querySelectorAll<HTMLElement>('.intro-statement__word');
        const linePills = line.querySelectorAll<HTMLElement>('.intro-statement__chip');

        timeline.to(lineWords, { opacity: 1, yPercent: 0, duration: 0.9, ease: INTRO_EASE }, lineStart);
        linePills.forEach((pill) => {
          const image = pill.querySelector('img');
          timeline.to(pill, {
            opacity: 1,
            yPercent: 0,
            clipPath: 'inset(0 0% 0 0 round 999px)',
            duration: 0.8,
            ease: INTRO_EASE,
          }, lineStart + 0.25);
          if (image) timeline.to(image, { scale: 1, duration: 0.8, ease: INTRO_EASE }, lineStart + 0.25);
        });
      });

      accents.forEach((accent) => {
        const line = accent.closest<HTMLElement>('.intro-statement__line');
        const lineIndex = line ? lines.indexOf(line) : -1;
        if (lineIndex < 0) return;
        timeline.to(accent, {
          color: getComputedStyle(section).getPropertyValue('--statement-accent').trim(),
          duration: 0.6,
          ease: INTRO_EASE,
        }, LINE_START + lineIndex * LINE_STAGGER + 0.4);
      });

      timeline.to(paragraph, { opacity: 1, y: 0, duration: 0.8, ease: INTRO_EASE }, 0.9);
      timeline.to(link, { opacity: 1, y: 0, duration: 0.7, ease: INTRO_EASE }, 1.1);
      timeline.to(underline, { scaleX: 1, duration: 0.5, ease: INTRO_EASE }, 1.4);

      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const threshold = isMobile ? 0.15 : 0.25;
      observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        startAnimation();
        observer?.disconnect();
      }, { threshold });

      observer.observe(section);
      const bounds = section.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
      if (visibleHeight / bounds.height >= threshold) {
        startAnimation();
        observer.disconnect();
      }
    }, section);

    return () => {
      observer?.disconnect();
      context.revert();
      section.classList.remove('is-animation-active');
    };
  }, []);

  return (
    <section ref={sectionRef} className="intro-statement" aria-labelledby="intro-statement-title">
      <div className="intro-statement__topline">
        <span>(01) — WHO WE ARE</span>
        <span>CUSTOM MANUFACTURING · SINCE [<span className="intro-statement__year">2023</span>]</span>
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
          Based in [SIALKOT, PAKISTAN] — from first sample to final delivery.
        </p>
      </div>

      <Link className="intro-statement__link" href="/about">
        About Zateef <span className="intro-statement__link-arrow" aria-hidden="true">↗</span>
        <span className="intro-statement__link-underline" aria-hidden="true" />
      </Link>
    </section>
  );
}
