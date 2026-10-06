'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type StatementWord = {
  text: string;
  accent?: boolean;
  italic?: boolean;
};

const statementLines: StatementWord[][] = [
  [{ text: 'WE' }, { text: 'ARE' }, { text: 'A' }],
  [{ text: 'CREATIVE', accent: true }, { text: 'STUDIO' }],
  [{ text: 'FOCUSING' }, { text: 'ON' }],
  [{ text: 'PICTURES' }, { text: 'THAT' }],
  [{ text: 'REFUSE', accent: true, italic: true }, { text: 'TO' }, { text: 'STAND' }],
  [{ text: 'STILL.' }],
];

const imageChips = [
  '/media/drift.webp',
  '/media/lane-seven.webp',
  '/media/terracotta-hour.webp',
];

const refreshScrollPositions = async (section: HTMLElement) => {
  await document.fonts.ready;
  const images = Array.from(section.querySelectorAll('img'));
  await Promise.all(images.map(async (image) => {
    try {
      await image.decode();
    } catch (error) {
      console.error(`Could not decode intro statement image: ${image.currentSrc}`, error);
    }
  }));
};

export function IntroStatement() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 82%',
          end: 'top 24%',
          scrub: 0.55,
        },
      });

      timeline.fromTo(
        section.querySelectorAll('.intro-statement__word, .intro-statement__chip'),
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          stagger: { each: 0.035, from: 'start' },
          ease: 'power4.out',
        },
        0,
      );
      timeline.fromTo(
        section.querySelectorAll('.intro-statement__copy, .intro-statement__link'),
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.1, ease: 'power4.out' },
        0.58,
      );
    }, section);

    let cancelled = false;
    void refreshScrollPositions(section).then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    }).catch((error: unknown) => {
      console.error('Could not refresh intro statement scroll positions.', error);
    });
    return () => {
      cancelled = true;
      context.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="intro-statement" aria-labelledby="intro-statement-title">
      <div className="intro-statement__topline">
        <span>(01) — INTRO</span>
        <span>EST. 2014 · 212 COMMISSIONS</span>
      </div>

      <h2
        id="intro-statement-title"
        className="intro-statement__headline"
        aria-label="We are a creative studio focusing on pictures that refuse to stand still."
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
              <span className="intro-statement__chip" aria-hidden="true">
                <Image src={imageChips[0]} alt="" fill sizes="112px" />
              </span>
            )}
            {lineIndex === 3 && (
              <span className="intro-statement__chip intro-statement__chip--wide" aria-hidden="true">
                <Image src={imageChips[1]} alt="" fill sizes="150px" />
              </span>
            )}
            {lineIndex === 5 && (
              <span className="intro-statement__chip" aria-hidden="true">
                <Image src={imageChips[2]} alt="" fill sizes="112px" />
              </span>
            )}
          </span>
        ))}
      </h2>

      <div className="intro-statement__copy">
        <p>
          Fashion, still life and moving image for brands that would rather be felt than seen.
          Based between Lisbon and New York — shooting everywhere.
        </p>
      </div>

      <Link className="intro-statement__link" href="/about">
        About Ines <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
