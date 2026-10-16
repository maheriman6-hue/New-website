'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { AppShell } from '@/components/AppShell';
import { QuoteRequestModal } from '@/components/QuoteRequestModal';
import {
  createEntranceTimeline,
  ENTRANCE_EASE,
  ENTRANCE_TIMING,
  registerEntranceEase,
} from '@/lib/entranceMotion';

const CONTACT_ENTRANCE_THRESHOLD = {
  desktopThreshold: 0.2,
  mobileThreshold: 0.1,
};

function measureWrappedLines(element: HTMLElement | null): string[] | null {
  const textNode = element?.firstChild;
  if (!(textNode instanceof Text)) return null;

  const text = textNode.textContent ?? '';
  const range = document.createRange();
  const lines: { top: number; start: number; end: number }[] = [];

  for (let index = 0; index < text.length; index += 1) {
    range.setStart(textNode, index);
    range.setEnd(textNode, index + 1);
    const bounds = range.getBoundingClientRect();
    if (bounds.height === 0) continue;

    const line = lines[lines.length - 1];
    if (!line || Math.abs(line.top - bounds.top) > 1) {
      lines.push({ top: bounds.top, start: index, end: index + 1 });
    } else {
      line.end = index + 1;
    }
  }

  return lines.length > 0
    ? lines.map((line) => text.slice(line.start, line.end).trim())
    : [text];
}

function areLinesEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((line, index) => line === right[index]);
}

export function ContactExperience() {
  const panelRef = useRef<HTMLElement | null>(null);
  const titleSourceRef = useRef<HTMLSpanElement | null>(null);
  const emailSourceRef = useRef<HTMLSpanElement | null>(null);
  const heroTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const heroContextRef = useRef<gsap.Context | null>(null);
  const heroHasStartedRef = useRef(false);
  const heroHasFinishedRef = useRef(false);
  const [titleLines, setTitleLines] = useState<string[] | null>(null);
  const [emailLines, setEmailLines] = useState<string[] | null>(null);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const panel = panelRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    if (!reducedMotion) {
      root.dataset.contactAnimation = 'pending';
      fallbackTimer = setTimeout(() => {
        if (root.dataset.contactAnimation === 'pending') {
          delete root.dataset.contactAnimation;
        }
      }, 12000);
    } else {
      delete root.dataset.contactAnimation;
    }

    const splitText = () => {
      const measuredTitle = measureWrappedLines(titleSourceRef.current);
      const measuredEmail = measureWrappedLines(emailSourceRef.current);
      if (!measuredTitle || !measuredEmail) {
        console.error('Unable to measure the Contact heading and email line breaks.');
        setTitleLines(['SAY']);
        setEmailLines(['zateefinternational@gmail.com']);
        return;
      }

      setTitleLines((current) => current && areLinesEqual(current, measuredTitle) ? current : measuredTitle);
      setEmailLines((current) => current && areLinesEqual(current, measuredEmail) ? current : measuredEmail);
    };

    if (!reducedMotion) {
      void document.fonts.ready.then(() => {
        if (!disposed) splitText();
      });

      const onResize = () => {
        if (heroHasStartedRef.current && !heroHasFinishedRef.current) {
          heroTimelineRef.current?.progress(1);
        }
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(splitText, 150);
      };

      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);

      return () => {
        disposed = true;
        clearTimeout(resizeTimer);
        clearTimeout(fallbackTimer);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
        delete root.dataset.contactAnimation;
        delete panel?.dataset.entranceInitialized;
      };
    }

    return () => {
      disposed = true;
      clearTimeout(fallbackTimer);
      delete panel?.dataset.entranceInitialized;
    };
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const detailBlocks = Array.from(panel.querySelectorAll<HTMLElement>('.contact-page__detail'));
    const actions = panel.querySelector<HTMLElement>('.contact-page__actions');
    if (!actions) return;

    registerEntranceEase();
    panel.dataset.entranceInitialized = 'true';

    const context = gsap.context(() => {
      const detailTimelines = new Map<HTMLElement, gsap.core.Timeline>();
      const detailStarted = new Set<HTMLElement>();
      const detailCompleted = new Set<HTMLElement>();
      const detailTimers: ReturnType<typeof setTimeout>[] = [];
      const detailObserverThreshold = window.matchMedia('(max-width: 640px)').matches
        ? CONTACT_ENTRANCE_THRESHOLD.mobileThreshold
        : CONTACT_ENTRANCE_THRESHOLD.desktopThreshold;
      let actionsVisible = false;
      let actionsStarted = false;
      let observer: IntersectionObserver | undefined;
      let actionTimeline: gsap.core.Timeline | undefined;

      detailBlocks.forEach((block) => {
        const divider = block.querySelector<HTMLElement>('.contact-page__divider');
        const title = block.querySelector<HTMLElement>('h2');
        const body = Array.from(block.querySelectorAll<HTMLElement>('p, a'));
        if (!divider || !title) return;

        const animatedElements = [divider, title, ...body];
        gsap.set(divider, { scaleX: 0, transformOrigin: 'left center' });
        gsap.set([title, ...body], { opacity: 0, y: ENTRANCE_TIMING.labelOffset });

        const timeline = createEntranceTimeline(animatedElements, {
          willChange: 'transform, opacity',
          onComplete: () => {
            gsap.set(animatedElements, { clearProps: 'willChange,transform,opacity' });
            block.dataset.entranceComplete = 'true';
            detailCompleted.add(block);
            if (actionsVisible && detailCompleted.size === detailBlocks.length) {
              actionTimeline?.play(0);
              actionsStarted = true;
            }
          },
        });

        timeline.to(divider, {
          scaleX: 1,
          duration: ENTRANCE_TIMING.underlineDuration,
          ease: ENTRANCE_EASE,
        }, 0);
        timeline.to(title, {
          opacity: 1,
          y: 0,
          duration: ENTRANCE_TIMING.labelDuration,
          ease: ENTRANCE_EASE,
        }, ENTRANCE_TIMING.underlineDuration);
        body.forEach((element, index) => {
          timeline.to(element, {
            opacity: 1,
            y: 0,
            duration: ENTRANCE_TIMING.paragraphDuration,
            ease: ENTRANCE_EASE,
          }, ENTRANCE_TIMING.underlineDuration
            + ENTRANCE_TIMING.labelDuration
            + index * 0.07);
        });

        detailTimelines.set(block, timeline);
      });

      const actionWrappers = Array.from(actions.querySelectorAll<HTMLElement>('.contact-page__action-wrap'));
      gsap.set(actionWrappers, { opacity: 0, y: ENTRANCE_TIMING.labelOffset });
      actionTimeline = createEntranceTimeline(actionWrappers, {
        willChange: 'transform, opacity',
        onComplete: () => {
          gsap.set(actionWrappers, { clearProps: 'willChange,transform,opacity' });
        },
      });
      actionTimeline.to(actionWrappers, {
        opacity: 1,
        y: 0,
        duration: ENTRANCE_TIMING.linkDuration,
        stagger: 0.09,
        ease: ENTRANCE_EASE,
      }, 0);

      const targets = Array.from(detailTimelines.keys());
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          const entering = entries
            .filter((entry) => entry.isIntersecting)
            .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top
              || left.boundingClientRect.left - right.boundingClientRect.left);

          entering.forEach((entry, index) => {
            const block = entry.target as HTMLElement;
            const timeline = detailTimelines.get(block);
            if (!timeline || detailStarted.has(block)) return;
            detailStarted.add(block);
            const timer = setTimeout(() => timeline.play(0), index * 120);
            detailTimers.push(timer);
          });
        }, { threshold: detailObserverThreshold });

        targets.forEach((target) => observer?.observe(target));
      } else {
        targets.forEach((target) => detailTimelines.get(target)?.play(0));
      }

      let actionObserver: IntersectionObserver | undefined;
      if ('IntersectionObserver' in window) {
        actionObserver = new IntersectionObserver(([entry]) => {
          if (!entry?.isIntersecting || actionsVisible) return;
          actionsVisible = true;
          if (detailCompleted.size === detailBlocks.length && !actionsStarted) {
            actionTimeline?.play(0);
            actionsStarted = true;
          }
          actionObserver?.disconnect();
        }, { threshold: detailObserverThreshold });
      }

      if (actionObserver) actionObserver.observe(actions);
      else {
        actionsVisible = true;
        if (detailCompleted.size === detailBlocks.length) {
          actionTimeline?.play(0);
          actionsStarted = true;
        }
      }

      return () => {
        observer?.disconnect();
        actionObserver?.disconnect();
        detailTimers.forEach(clearTimeout);
      };
    }, panel);

    return () => {
      context.revert();
      delete panel.dataset.entranceInitialized;
      detailBlocks.forEach((block) => {
        delete block.dataset.entranceComplete;
      });
    };
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !titleLines || !emailLines || heroHasStartedRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      delete document.documentElement.dataset.contactAnimation;
      return;
    }

    const eyebrow = panel.querySelector<HTMLElement>('.contact-page__eyebrow');
    const titleWordLines = Array.from(panel.querySelectorAll<HTMLElement>('.contact-page__title-line'));
    const titleWords = titleWordLines.map((line) => Array.from(
      line.querySelectorAll<HTMLElement>('.contact-page__title-word'),
    ));
    const emailContents = Array.from(panel.querySelectorAll<HTMLElement>('.contact-page__email-line-content'));
    const arrow = panel.querySelector<HTMLElement>('.contact-page__email-arrow');
    const underline = panel.querySelector<HTMLElement>('.contact-page__email-underline');
    if (!eyebrow || !arrow || !underline
      || titleWords.length !== titleLines.length
      || emailContents.length !== emailLines.length) return;

    registerEntranceEase();
    const emailMasks = emailContents.map((line) => line.parentElement);
    const animatedElements = [eyebrow, ...titleWords.flat(), ...emailContents, arrow, underline];
    gsap.set(eyebrow, { opacity: 0, y: ENTRANCE_TIMING.labelOffset });
    titleWords.forEach((lineWords, index) => {
      const mask = titleWordLines[index];
      lineWords.forEach((word) => {
        gsap.set(word, { opacity: 0, y: mask.getBoundingClientRect().height + 4 });
      });
    });
    emailContents.forEach((line, index) => {
      const mask = emailMasks[index];
      if (mask) gsap.set(line, { opacity: 0, y: mask.getBoundingClientRect().height + 4 });
    });
    gsap.set(arrow, { opacity: 0 });
    gsap.set(underline, { scaleX: 0, transformOrigin: 'left center' });

    const context = gsap.context(() => {
      const timeline = createEntranceTimeline(animatedElements, {
        willChange: 'transform, opacity',
        onComplete: () => {
          gsap.set(animatedElements, { clearProps: 'willChange,transform,opacity' });
          panel.dataset.heroEntranceComplete = 'true';
          heroHasFinishedRef.current = true;
          delete document.documentElement.dataset.contactAnimation;
        },
      });

      timeline.to(eyebrow, {
        opacity: 1,
        y: 0,
        duration: ENTRANCE_TIMING.labelDuration,
        ease: ENTRANCE_EASE,
      }, 0);

      const titleStart = ENTRANCE_TIMING.labelDuration;
      const emailStart = titleStart
        + ENTRANCE_TIMING.lineStart
        + (titleWords.length - 1) * ENTRANCE_TIMING.lineStagger
        + ENTRANCE_TIMING.wordDuration;

      titleWords.forEach((lineWords, index) => {
        timeline.to(lineWords, {
          opacity: 1,
          y: 0,
          duration: ENTRANCE_TIMING.wordDuration,
          ease: ENTRANCE_EASE,
        }, titleStart + ENTRANCE_TIMING.lineStart + index * ENTRANCE_TIMING.lineStagger);
      });

      emailContents.forEach((line, index) => {
        timeline.to(line, {
          opacity: 1,
          y: 0,
          duration: ENTRANCE_TIMING.wordDuration,
          ease: ENTRANCE_EASE,
        }, emailStart + index * ENTRANCE_TIMING.lineStagger);
      });

      const emailEnd = emailStart
        + (emailContents.length - 1) * ENTRANCE_TIMING.lineStagger
        + ENTRANCE_TIMING.wordDuration;
      timeline.to(arrow, {
        opacity: 1,
        duration: ENTRANCE_TIMING.linkDuration,
        ease: ENTRANCE_EASE,
      }, emailEnd);
      timeline.to(underline, {
        scaleX: 1,
        duration: ENTRANCE_TIMING.underlineDuration,
        ease: ENTRANCE_EASE,
      }, emailEnd + ENTRANCE_TIMING.linkDuration);

      heroHasStartedRef.current = true;
      heroTimelineRef.current = timeline;
      panel.dataset.entranceInitialized = 'true';
      timeline.play(0);
    }, panel);
    heroContextRef.current = context;
  }, [emailLines, titleLines]);

  useLayoutEffect(() => () => {
    heroContextRef.current?.revert();
    heroContextRef.current = null;
    heroTimelineRef.current = null;
    heroHasStartedRef.current = false;
    heroHasFinishedRef.current = false;
    delete panelRef.current?.dataset.heroEntranceComplete;
  }, []);

  return (
    <AppShell heroTone="light" overlayHeader>
      <section ref={panelRef} className="contact-page" aria-labelledby="contact-heading">
        <div className="contact-page__content">
          <p className="contact-page__eyebrow">(CONTACT)</p>
          <h1 id="contact-heading" className="contact-page__title" aria-label="SAY">
            {titleLines?.map((line, lineIndex) => (
              <span className="contact-page__title-line" key={`title-line-${lineIndex}`}>
                <span className="contact-page__title-line-content" aria-hidden="true">
                  {line.split(/(\s+)/).filter(Boolean).map((word, wordIndex) => (
                    /\s+/.test(word)
                      ? word
                      : (
                        <span
                          className="contact-page__title-word"
                          key={`title-word-${lineIndex}-${wordIndex}`}
                          aria-hidden="true"
                        >
                          {word}
                        </span>
                      )
                  ))}
                </span>
              </span>
            ))}
            <span
              ref={titleSourceRef}
              className={`contact-page__title-source${titleLines ? ' is-measure' : ''}`}
              aria-hidden="true"
            >
              SAY
            </span>
          </h1>
          <a
            className="contact-page__email"
            href="mailto:zateefinternational@gmail.com"
            aria-label="zateefinternational@gmail.com"
          >
            {emailLines && (
              <span className="contact-page__email-lines" aria-label="zateefinternational@gmail.com">
                {emailLines.map((line, index) => (
                  <span className="contact-page__email-line-mask" key={`email-line-${index}`}>
                    <span className="contact-page__email-line-content" aria-hidden="true">{line}</span>
                  </span>
                ))}
              </span>
            )}
            <span
              ref={emailSourceRef}
              className={`contact-page__email-source${emailLines ? ' is-measure' : ''}`}
              aria-hidden={emailLines ? 'true' : undefined}
              aria-label={emailLines ? undefined : 'zateefinternational@gmail.com'}
            >
              zateefinternational@gmail.com
            </span>
            <span className="contact-page__email-arrow" aria-hidden="true">↗</span>
            <span className="contact-page__email-underline" aria-hidden="true" />
          </a>

          <div className="contact-page__details">
            <section className="contact-page__detail" aria-labelledby="contact-commissions">
              <span className="contact-page__divider" aria-hidden="true" />
              <h2 id="contact-commissions">ORDERS</h2>
              <p>Streetwear, sportswear, private label</p>
              <p>Reply within 24 hours</p>
            </section>
            <section className="contact-page__detail" aria-labelledby="contact-representation">
              <span className="contact-page__divider" aria-hidden="true" />
              <h2 id="contact-representation">WHATSAPP</h2>
              <p>Chat with our team for a quick quote</p>
              <a href="https://api.whatsapp.com/send/?phone=923289615985&text=Hi%2C+I+want+to+request+a+quote+for+clothing+manufacturing.&type=phone_number&app_absent=0" target="_blank" rel="noreferrer">
                +92 328 9615 985
              </a>
            </section>
            <section className="contact-page__detail" aria-labelledby="contact-studio">
              <span className="contact-page__divider" aria-hidden="true" />
              <h2 id="contact-studio">WHAT YOU GET</h2>
              <p>Samples before bulk orders</p>
              <a href="tel:+351912000000">	Tracked shipments to your door</a>
            </section>
            <section className="contact-page__detail contact-page__detail--social" aria-labelledby="contact-social">
              <span className="contact-page__divider" aria-hidden="true" />
              <h2 id="contact-social">Social</h2>
              <a href="https://www.instagram.com/zateef_international?mdxt=MW12c3M0NDIKNmVjMg==" target="_blank" rel="noreferrer">Instagram ↗</a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
            </section>
          </div>

          <div className="contact-page__actions">
            <span className="contact-page__action-wrap">
              <button
                className="contact-page__button contact-page__button--dark"
                type="button"
                onClick={() => setIsQuoteOpen(true)}
              >
                Request a quote <span aria-hidden="true">↗</span>
              </button>
            </span>
            <span className="contact-page__action-wrap">
              <Link className="contact-page__button contact-page__button--red" href="/work">
                See what we make
              </Link>
            </span>
          </div>
        </div>
      </section>
      {isQuoteOpen && <QuoteRequestModal onClose={() => setIsQuoteOpen(false)} />}
    </AppShell>
  );
}
