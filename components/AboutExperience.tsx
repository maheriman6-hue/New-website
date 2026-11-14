'use client';

import Image from 'next/image';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AppShell } from '@/components/AppShell';
import { PortraitReveal } from '@/components/PortraitReveal';
import { QuoteRequestModal } from '@/components/QuoteRequestModal';
import { RecognitionList } from '@/components/RecognitionList';
import {
  createEntranceTimeline,
  ENTRANCE_EASE,
  ENTRANCE_TIMING,
  observeEntranceOnce,
  registerEntranceEase,
} from '@/lib/entranceMotion';

const ABOUT_STORY_QUOTE =
  'Every piece starts as a sketch and ends in someone’s wardrobe. We make everything in between: sportswear and streetwear that keep moving long after they leave our factory.';

const ABOUT_TIMELINE_DELAY = 0.2;

function measureQuoteLines(
  heading: HTMLHeadingElement,
  fallback: HTMLSpanElement | null,
): string[][] | null {
  let probe: HTMLSpanElement | null = null;
  const textNode = fallback?.firstChild ?? (() => {
    probe = document.createElement('span');
    probe.className = 'about-story__measure';
    probe.setAttribute('aria-hidden', 'true');
    probe.textContent = ABOUT_STORY_QUOTE;
    heading.append(probe);
    return probe.firstChild;
  })();

  if (!(textNode instanceof Text)) {
    probe?.remove();
    return null;
  }

  const lineGroups: { top: number; words: string[] }[] = [];
  const matches = Array.from(ABOUT_STORY_QUOTE.matchAll(/\S+/g));
  const range = document.createRange();

  for (const match of matches) {
    const start = match.index ?? 0;
    range.setStart(textNode, start);
    range.setEnd(textNode, start + match[0].length);
    const bounds = range.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      probe?.remove();
      return null;
    }

    const priorLine = lineGroups[lineGroups.length - 1];
    if (!priorLine || Math.abs(priorLine.top - bounds.top) > 1) {
      lineGroups.push({ top: bounds.top, words: [match[0]] });
    } else {
      priorLine.words.push(match[0]);
    }
  }

  probe?.remove();
  return lineGroups.map((line) => line.words);
}

function areLinesEqual(left: string[][], right: string[][]) {
  return left.length === right.length
    && left.every((line, index) => line.length === right[index].length
      && line.every((word, wordIndex) => word === right[index][wordIndex]));
}

const statistics = [
  { value: 3, label: 'YEARS IN MANUFACTURING' },
  { value: 211, label: 'ORDERS DELIVERED' },
  { value: 18, label: 'COUNTRIES SHIPPED TO' },
  { value: 9, label: 'REPEAT CLIENTS' },
];

const services = [
  { name: 'SPORTSWEAR', details: 'JERSEYS · TRACKSUITS · TRAINING WEAR' },
  { name: 'STREETWEAR', details: '	HOODIES · T-SHIRTS · CARGO PANTS' },
  { name: 'PRIVATE LABEL', details: 'YOUR LOGO · YOUR TAGS · YOUR PACKAGING' },
  { name: 'SAMPLING', details: 'TECH PACKS · PROTOTYPES · FIT SAMPLES' },
  { name: 'BULK ORDERS', details: 'CUTTING · STITCHING · QUALITY CHECK' },
  { name: 'DELIVERY', details: 'PACKING · TRACKED SHIPMENTS · DOOR TO DOOR' },
];

const HIGHLIGHT_LINE = 0.5;
const SERVICE_HYSTERESIS_PX = 12;
const SERVICES_PIN_TOP = 76;

const setImages = [
  { src: '/media/drift.webp', alt: 'Landscape between takes at golden hour', caption: 'ON THE STITCHING FLOOR — SIALKOT' },
  { src: '/media/terracotta-hour.webp', alt: 'Objects arranged on a studio set', caption: 'PACKED FOR DISPATCH — 2026' },
  { src: '/media/lane-seven.webp', alt: 'Blue water on a campaign set', caption: 'FINISHED PIECES — 2026' },
];

export function AboutExperience() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const storyRef = useRef<HTMLElement | null>(null);
  const statementRef = useRef<HTMLHeadingElement | null>(null);
  const fallbackRef = useRef<HTMLSpanElement | null>(null);
  const servicesRef = useRef<HTMLElement | null>(null);
  const servicesWindowRef = useRef<HTMLDivElement | null>(null);
  const servicesListRef = useRef<HTMLUListElement | null>(null);
  const hasStoryAnimationStarted = useRef(false);
  const activeServiceRef = useRef(-1);
  const scrollServiceRef = useRef<number | null>(null);
  const manualServiceRef = useRef<number | null>(null);
  const [quoteLines, setQuoteLines] = useState<string[][] | null>(null);
  const [activeService, setActiveService] = useState(-1);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);

  const activateService = useCallback((index: number) => {
    if (activeServiceRef.current === index) return;
    activeServiceRef.current = index;
    setActiveService(index);
  }, []);

  useLayoutEffect(() => {
    const list = servicesListRef.current;
    if (!list) return;

    let frameId = 0;
    let disposed = false;

    const updateActiveService = () => {
      frameId = 0;
      if (disposed) return;

      const rows = Array.from(list.querySelectorAll<HTMLElement>('.about-services__item'));
      if (rows.length === 0) return;

      const referenceY = window.innerHeight * HIGHLIGHT_LINE;
      const distances = rows.map((row) => {
        const bounds = row.getBoundingClientRect();
        return Math.abs((bounds.top + bounds.bottom) / 2 - referenceY);
      });
      const closestIndex = distances.reduce(
        (closest, distance, index) => distance < distances[closest] ? index : closest,
        0,
      );
      const currentIndex = scrollServiceRef.current;
      const nextIndex = currentIndex === null
        || closestIndex === currentIndex
        || distances[closestIndex] + SERVICE_HYSTERESIS_PX <= distances[currentIndex]
        ? closestIndex
        : currentIndex;

      scrollServiceRef.current = nextIndex;
      if (manualServiceRef.current === null) activateService(nextIndex);
    };

    const scheduleUpdate = () => {
      if (!disposed && frameId === 0) frameId = window.requestAnimationFrame(updateActiveService);
    };
    const onScroll = () => {
      manualServiceRef.current = null;
      scheduleUpdate();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    updateActiveService();
    void document.fonts.ready.then(scheduleUpdate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [activateService]);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = servicesRef.current;
    const windowElement = servicesWindowRef.current;
    const list = servicesListRef.current;
    if (
      !section
      || !windowElement
      || !list
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    const rows = Array.from(list.querySelectorAll<HTMLElement>('.about-services__item'));
    if (rows.length < 2) return;

    const step = 1 / (rows.length - 1);
    let settledIndex = 0;
    let snapTargetIndex = 0;
    activateService(0);
    section.dataset.scrollStaged = 'true';
    const context = gsap.context(() => {
      gsap.fromTo(
        list,
        {
          y: () => window.innerHeight * HIGHLIGHT_LINE
            - SERVICES_PIN_TOP
            - windowElement.offsetTop
            - rows[0].offsetTop
            - rows[0].offsetHeight / 2,
        },
        {
          y: () => window.innerHeight * HIGHLIGHT_LINE
            - SERVICES_PIN_TOP
            - windowElement.offsetTop
            - rows[rows.length - 1].offsetTop
            - rows[rows.length - 1].offsetHeight / 2,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: `top top+=${SERVICES_PIN_TOP}`,
            end: () => `+=${window.innerHeight * (rows.length - 1) * 0.55}`,
            pin: section,
            scrub: 0.35,
            snap: {
              snapTo: (progress) => {
                if (progress > settledIndex * step + 0.001) {
                  snapTargetIndex = Math.min(settledIndex + 1, rows.length - 1);
                } else if (progress < settledIndex * step - 0.001) {
                  snapTargetIndex = Math.max(settledIndex - 1, 0);
                } else {
                  snapTargetIndex = settledIndex;
                }
                return snapTargetIndex * step;
              },
              delay: 0.08,
              duration: { min: 0.15, max: 0.45 },
              ease: 'power1.inOut',
              onStart: () => {
                settledIndex = snapTargetIndex;
                activateService(settledIndex);
                scrollServiceRef.current = settledIndex;
              },
              onComplete: () => {
                settledIndex = snapTargetIndex;
                activateService(settledIndex);
                scrollServiceRef.current = settledIndex;
              },
            },
            onEnter: () => {
              settledIndex = 0;
              snapTargetIndex = 0;
              activateService(0);
              scrollServiceRef.current = 0;
            },
            onEnterBack: () => {
              settledIndex = rows.length - 1;
              snapTargetIndex = settledIndex;
              activateService(settledIndex);
              scrollServiceRef.current = settledIndex;
            },
            invalidateOnRefresh: true,
          },
        },
      );
    }, section);

    ScrollTrigger.refresh();

    return () => {
      context.revert();
      delete section.dataset.scrollStaged;
    };
  }, [activateService]);

  useLayoutEffect(() => {
    const story = storyRef.current;
    const statement = statementRef.current;
    if (!story || !statement || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    story.classList.add('is-animation-pending');
    let disposed = false;
    let fontsReady = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const splitQuote = () => {
      const lines = measureQuoteLines(statement, fallbackRef.current);
      if (!lines) {
        console.error('Unable to measure the About quote line breaks.');
        if (!quoteLines) story.classList.remove('is-animation-pending');
        return;
      }

      setQuoteLines((current) => current && areLinesEqual(current, lines) ? current : lines);
    };

    void document.fonts.ready.then(() => {
      if (disposed) return;
      fontsReady = true;
      splitQuote();
    });

    const onResize = () => {
      if (!fontsReady) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(splitQuote, 150);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      disposed = true;
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      story.classList.remove('is-animation-pending');
    };
  }, [quoteLines]);

  useLayoutEffect(() => {
    const story = storyRef.current;
    if (!story || !quoteLines) return;

    if (hasStoryAnimationStarted.current) {
      story.classList.remove('is-animation-pending');
      return;
    }

    const label = story.querySelector<HTMLElement>('.about-story__eyebrow');
    const lineContents = Array.from(story.querySelectorAll<HTMLElement>('.about-story__line-content'));
    const signatureMask = story.querySelector<HTMLElement>('.about-story__signature-mask');
    const signature = story.querySelector<HTMLElement>('.about-story__signature');
    const button = story.querySelector<HTMLElement>('.about-story__link');
    if (!label || !signatureMask || !signature || !button || lineContents.length !== quoteLines.length) {
      story.classList.remove('is-animation-pending');
      return;
    }

    registerEntranceEase();
    const animatedElements = [label, ...lineContents, signature, button];
    let stopObserving: (() => void) | undefined;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    const context = gsap.context(() => {
      gsap.set(label, { opacity: 0, y: ENTRANCE_TIMING.labelOffset });
      lineContents.forEach((line) => {
        const mask = line.parentElement;
        if (mask) gsap.set(line, { opacity: 0, y: mask.getBoundingClientRect().height + 4 });
      });
      gsap.set(signature, {
        opacity: 0,
        y: signatureMask.getBoundingClientRect().height + 4,
        color: getComputedStyle(story).color,
      });
      gsap.set(button, { opacity: 0, y: ENTRANCE_TIMING.labelOffset });

      const timeline = createEntranceTimeline(animatedElements, {
        willChange: 'transform, opacity, color',
        onComplete: () => {
          gsap.set(animatedElements, { clearProps: 'willChange,transform,opacity,color' });
          story.classList.remove('is-animation-pending');
        },
      });
      timeline.to(label, {
        opacity: 1,
        y: 0,
        duration: ENTRANCE_TIMING.labelDuration,
        ease: ENTRANCE_EASE,
      }, 0);

      lineContents.forEach((line, index) => {
        timeline.to(line, {
          opacity: 1,
          y: 0,
          duration: ENTRANCE_TIMING.wordDuration,
          ease: ENTRANCE_EASE,
        }, ENTRANCE_TIMING.lineStart + index * ENTRANCE_TIMING.lineStagger);
      });

      const lastQuoteLineEnd =
        ENTRANCE_TIMING.lineStart
        + (lineContents.length - 1) * ENTRANCE_TIMING.lineStagger
        + ENTRANCE_TIMING.wordDuration;
      const signatureStart = lastQuoteLineEnd;
      timeline.to(signature, {
        opacity: 1,
        y: 0,
        duration: ENTRANCE_TIMING.wordDuration,
        ease: ENTRANCE_EASE,
      }, signatureStart);
      timeline.to(signature, {
        color: getComputedStyle(story).getPropertyValue('--red').trim(),
        duration: ENTRANCE_TIMING.accentDuration,
        ease: ENTRANCE_EASE,
      }, signatureStart + ENTRANCE_TIMING.accentStartOffset);
      timeline.to(button, {
        opacity: 1,
        y: 0,
        duration: ENTRANCE_TIMING.linkDuration,
        ease: ENTRANCE_EASE,
      }, signatureStart + ENTRANCE_TIMING.accentStartOffset + ENTRANCE_TIMING.accentDuration);

      const startAnimation = () => {
        if (hasStoryAnimationStarted.current) return;
        hasStoryAnimationStarted.current = true;
        startTimer = setTimeout(() => timeline.play(0), ABOUT_TIMELINE_DELAY * 1000);
      };

      stopObserving = observeEntranceOnce(story, ENTRANCE_TIMING, startAnimation);
    }, story);

    return () => {
      stopObserving?.();
      clearTimeout(startTimer);
      context.revert();
    };
  }, [quoteLines]);

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

        <section ref={storyRef} className="about-story" aria-labelledby="about-story-heading">
          <p className="about-story__eyebrow">(ABOUT) — ZATEEF INTERNATIONAL, EST. 2023, SIALKOT</p>
          <h1
            ref={statementRef}
            id="about-story-heading"
            className="about-story__statement"
            aria-label={ABOUT_STORY_QUOTE}
          >
            {quoteLines ? (
              <span className="about-story__visual-lines" aria-hidden="true">
                {quoteLines.map((line, index) => (
                  <span className="about-story__line-mask" key={`line-${index}`}>
                    <span className="about-story__line-content">
                      {line.map((word, wordIndex) => (
                        <span key={`${index}-${wordIndex}`}>
                          {wordIndex > 0 ? ' ' : ''}
                          {word}
                        </span>
                      ))}
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              <span ref={fallbackRef} className="about-story__statement-copy" aria-hidden="true">
                {ABOUT_STORY_QUOTE}
              </span>
            )}
          </h1>
          <div className="about-story__signature-mask">
            <div className="about-story__signature">— Zateef International</div>
          </div>
          <button
            className="about-story__link"
            type="button"
            onClick={() => setIsQuoteOpen(true)}
          >
            Request a quote <span aria-hidden="true">↗</span>
          </button>
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
          ref={servicesRef}
          className="about-services"
          aria-labelledby="about-services-heading"
          onMouseLeave={() => {
            manualServiceRef.current = null;
            activateService(scrollServiceRef.current ?? 0);
          }}
        >
          <p className="about-section__eyebrow">(SERVICES)</p>
          <h2 className="about-section__sr-heading" id="about-services-heading">What I do</h2>
          <div className="about-services__window" ref={servicesWindowRef}>
            <ul
              ref={servicesListRef}
              className="about-services__list"
              data-has-active={activeService >= 0}
              onMouseMove={(event) => {
                if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
                const target = event.target;
                if (!(target instanceof Element)) return;
                const row = target.closest<HTMLElement>('.about-services__item');
                if (!row || !event.currentTarget.contains(row)) return;
                const index = Number(row.dataset.serviceIndex);
                if (!Number.isInteger(index)) return;
                manualServiceRef.current = index;
                activateService(index);
              }}
            >
              {services.map((service, index) => (
                <li
                  className="about-services__item"
                  data-active={activeService === index}
                  data-service-index={index}
                  key={service.name}
                  tabIndex={0}
                  onMouseEnter={() => {
                    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
                    manualServiceRef.current = index;
                    activateService(index);
                  }}
                  onFocus={(event) => {
                    if (!event.currentTarget.matches(':focus-visible')) return;
                    manualServiceRef.current = index;
                    activateService(index);
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
                      manualServiceRef.current = null;
                      activateService(scrollServiceRef.current ?? 0);
                    }
                  }}
                >
                  <span className="about-services__name">{service.name}</span>
                  <span className="about-services__details">{service.details}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="about-set" aria-labelledby="about-set-heading">
          <div className="about-section__heading">
            <p className="about-section__eyebrow">(INSIDE THE FACTORY)</p>
            <h2 id="about-set-heading">Made with care.</h2>
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
            <p className="about-section__eyebrow">(PROCESS)</p>
            <h2 id="about-recognition-heading">Idea to doorstep.</h2>
          </div>
          <RecognitionList />
        </section>
      </div>
      {isQuoteOpen && <QuoteRequestModal onClose={() => setIsQuoteOpen(false)} />}
    </AppShell>
  );
}
