'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { AppShell } from '@/components/AppShell';
import { QuoteRequestModal } from '@/components/QuoteRequestModal';
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_LINK,
  CONTACT_PHONE_LINK,
  CONTACT_WHATSAPP_LINK,
  WHATSAPP_DISPLAY_NUMBER,
} from '@/lib/contactLinks';
import {
  createEntranceTimeline,
  ENTRANCE_EASE,
  registerEntranceEase,
} from '@/lib/entranceMotion';

const CONTACT_TIMING = {
  desktopThreshold: 0.1,
  mobileThreshold: 0.08,
  labelDuration: 0.5,
  labelOffset: 12,
  headingDuration: 0.65,
  headingStagger: 0.065,
  emailDuration: 0.65,
  emailStartOffset: 0.15,
  arrowDuration: 0.1,
  underlineDuration: 0.4,
  dividerDuration: 0.45,
  detailTitleStart: 0.06,
  detailTitleDuration: 0.4,
  detailTitleOffset: 8,
  detailBodyStart: 0.12,
  detailBodyDuration: 0.45,
  detailBodyStagger: 0.05,
  blockStagger: 0.07,
  actionStartDelay: 0.1,
  actionDuration: 0.45,
  actionStagger: 0.06,
  actionOffset: 12,
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
  const emailContainerRef = useRef<HTMLDivElement | null>(null);
  const emailLinkRef = useRef<HTMLAnchorElement | null>(null);
  const titleSourceRef = useRef<HTMLSpanElement | null>(null);
  const heroTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const heroContextRef = useRef<gsap.Context | null>(null);
  const heroHasStartedRef = useRef(false);
  const heroHasFinishedRef = useRef(false);
  const [titleLines, setTitleLines] = useState<string[] | null>(null);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);

  useLayoutEffect(() => {
    const container = emailContainerRef.current;
    const link = emailLinkRef.current;
    if (!container || !link) return;

    let animationFrame = 0;
    let disposed = false;
    let lastContainerWidth = container.clientWidth;

    const fitEmail = () => {
      if (disposed) return;

      link.style.removeProperty('--contact-email-fit-size');
      for (let pass = 0; pass < 2; pass += 1) {
        const containerWidth = container.clientWidth;
        const linkWidth = link.scrollWidth;
        if (containerWidth <= 0 || linkWidth <= containerWidth) return;

        const currentSize = Number.parseFloat(getComputedStyle(link).fontSize);
        const nextSize = Math.max(14, currentSize * (containerWidth / linkWidth) * 0.98);
        link.style.setProperty('--contact-email-fit-size', `${nextSize}px`);
      }
    };

    const scheduleFit = () => {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        fitEmail();
      });
    };

    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;
      if (width === lastContainerWidth) return;
      lastContainerWidth = width;
      scheduleFit();
    });
    observer.observe(container);
    window.addEventListener('resize', scheduleFit);
    window.addEventListener('orientationchange', scheduleFit);
    window.visualViewport?.addEventListener('resize', scheduleFit);

    fitEmail();
    void document.fonts.ready.then(() => {
      if (!disposed) fitEmail();
    });

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', scheduleFit);
      window.removeEventListener('orientationchange', scheduleFit);
      window.visualViewport?.removeEventListener('resize', scheduleFit);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      link.style.removeProperty('--contact-email-fit-size');
    };
  }, []);

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
      if (!measuredTitle) {
        console.error('Unable to measure the Contact heading line breaks.');
        setTitleLines(['SAY']);
        return;
      }

      setTitleLines((current) => current && areLinesEqual(current, measuredTitle) ? current : measuredTitle);
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
      const detailTimers: ReturnType<typeof setTimeout>[] = [];
      const fallbackCleanups: Array<() => void> = [];
      const IntersectionObserverClass = Reflect.get(window, 'IntersectionObserver') as
        typeof IntersectionObserver | undefined;
      const detailObserverThreshold = window.matchMedia('(max-width: 640px)').matches
        ? CONTACT_TIMING.mobileThreshold
        : CONTACT_TIMING.desktopThreshold;
      let actionsStarted = false;
      let observer: IntersectionObserver | undefined;
      let actionTimeline: gsap.core.Timeline | undefined;
      let actionTimer: ReturnType<typeof setTimeout> | undefined;

      const isVisibleAtThreshold = (target: HTMLElement) => {
        const bounds = target.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) return false;
        const visibleWidth = Math.max(0, Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0));
        const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
        return (visibleWidth * visibleHeight) / (bounds.width * bounds.height) >= detailObserverThreshold;
      };

      const startActions = () => {
        if (actionsStarted) return;
        actionsStarted = true;
        actionTimer = setTimeout(
          () => actionTimeline?.play(0),
          CONTACT_TIMING.actionStartDelay * 1000,
        );
      };

      detailBlocks.forEach((block) => {
        const divider = block.querySelector<HTMLElement>('.contact-page__divider');
        const title = block.querySelector<HTMLElement>('h2');
        const body = Array.from(block.querySelectorAll<HTMLElement>('p, a'));
        if (!divider || !title) return;

        const animatedElements = [divider, title, ...body];
        gsap.set(divider, { scaleX: 0, transformOrigin: 'left center' });
        gsap.set(title, { opacity: 0, y: CONTACT_TIMING.detailTitleOffset });
        gsap.set(body, { opacity: 0, y: CONTACT_TIMING.labelOffset });

        const timeline = createEntranceTimeline(animatedElements, {
          willChange: 'transform, opacity',
          onComplete: () => {
            gsap.set(animatedElements, { clearProps: 'willChange,transform,opacity' });
            block.dataset.entranceComplete = 'true';
          },
        });

        timeline.to(divider, {
          scaleX: 1,
          duration: CONTACT_TIMING.dividerDuration,
          ease: ENTRANCE_EASE,
        }, 0);
        timeline.to(title, {
          opacity: 1,
          y: 0,
          duration: CONTACT_TIMING.detailTitleDuration,
          ease: ENTRANCE_EASE,
        }, CONTACT_TIMING.detailTitleStart);
        body.forEach((element, index) => {
          timeline.to(element, {
            opacity: 1,
            y: 0,
            duration: CONTACT_TIMING.detailBodyDuration,
            ease: ENTRANCE_EASE,
          }, CONTACT_TIMING.detailBodyStart + index * CONTACT_TIMING.detailBodyStagger);
        });

        detailTimelines.set(block, timeline);
      });

      const actionWrappers = Array.from(actions.querySelectorAll<HTMLElement>('.contact-page__action-wrap'));
      gsap.set(actionWrappers, { opacity: 0, y: CONTACT_TIMING.actionOffset });
      actionTimeline = createEntranceTimeline(actionWrappers, {
        willChange: 'transform, opacity',
        onComplete: () => {
          gsap.set(actionWrappers, { clearProps: 'willChange,transform,opacity' });
        },
      });
      actionTimeline.to(actionWrappers, {
        opacity: 1,
        y: 0,
        duration: CONTACT_TIMING.actionDuration,
        stagger: CONTACT_TIMING.actionStagger,
        ease: ENTRANCE_EASE,
      }, 0);

      const targets = Array.from(detailTimelines.keys());
      if (IntersectionObserverClass) {
        observer = new IntersectionObserverClass((entries) => {
          const entering = entries
            .filter((entry) => entry.isIntersecting
              && entry.intersectionRatio >= detailObserverThreshold
              && !detailStarted.has(entry.target as HTMLElement))
            .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top
              || left.boundingClientRect.left - right.boundingClientRect.left);

          entering.forEach((entry, index) => {
            const block = entry.target as HTMLElement;
            const timeline = detailTimelines.get(block);
            if (!timeline) return;
            detailStarted.add(block);
            const timer = setTimeout(
              () => timeline.play(0),
              index * CONTACT_TIMING.blockStagger * 1000,
            );
            detailTimers.push(timer);
          });
        }, { threshold: detailObserverThreshold });

        targets.forEach((target) => observer?.observe(target));
      } else {
        const checkVisibleDetails = () => {
          const entering = targets
            .filter((target) => !detailStarted.has(target) && isVisibleAtThreshold(target))
            .sort((left, right) => {
              const leftBounds = left.getBoundingClientRect();
              const rightBounds = right.getBoundingClientRect();
              return leftBounds.top - rightBounds.top || leftBounds.left - rightBounds.left;
            });
          entering.forEach((target, index) => {
            detailStarted.add(target);
            const timeline = detailTimelines.get(target);
            if (!timeline) return;
            const timer = setTimeout(
              () => timeline.play(0),
              index * CONTACT_TIMING.blockStagger * 1000,
            );
            detailTimers.push(timer);
          });
        };
        window.addEventListener('scroll', checkVisibleDetails, { passive: true });
        window.addEventListener('resize', checkVisibleDetails);
        fallbackCleanups.push(() => {
          window.removeEventListener('scroll', checkVisibleDetails);
          window.removeEventListener('resize', checkVisibleDetails);
        });
        checkVisibleDetails();
      }

      let actionObserver: IntersectionObserver | undefined;
      if (IntersectionObserverClass) {
        actionObserver = new IntersectionObserverClass(([entry]) => {
          if (!entry?.isIntersecting || entry.intersectionRatio < detailObserverThreshold) return;
          startActions();
          actionObserver?.disconnect();
        }, { threshold: detailObserverThreshold });
      }

      if (actionObserver) actionObserver.observe(actions);
      else if (isVisibleAtThreshold(actions)) {
        startActions();
      } else {
        const checkActionsVisible = () => {
          if (!isVisibleAtThreshold(actions)) return;
          startActions();
          window.removeEventListener('scroll', checkActionsVisible);
          window.removeEventListener('resize', checkActionsVisible);
        };
        window.addEventListener('scroll', checkActionsVisible, { passive: true });
        window.addEventListener('resize', checkActionsVisible);
        fallbackCleanups.push(() => {
          window.removeEventListener('scroll', checkActionsVisible);
          window.removeEventListener('resize', checkActionsVisible);
        });
      }

      return () => {
        observer?.disconnect();
        actionObserver?.disconnect();
        detailTimers.forEach(clearTimeout);
        fallbackCleanups.forEach((cleanup) => cleanup());
        clearTimeout(actionTimer);
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
    if (!panel || !titleLines || heroHasStartedRef.current) return;
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
      || emailContents.length !== 1) return;

    registerEntranceEase();
    const emailMask = emailContents[0].parentElement;
    const animatedElements = [eyebrow, ...titleWords.flat(), ...emailContents, arrow, underline];
    gsap.set(eyebrow, { opacity: 0, y: CONTACT_TIMING.labelOffset });
    titleWords.forEach((lineWords, index) => {
      const mask = titleWordLines[index];
      lineWords.forEach((word) => {
        gsap.set(word, { opacity: 0, y: mask.getBoundingClientRect().height + 4 });
      });
    });
    if (emailMask) {
      gsap.set(emailContents[0], { opacity: 0, y: emailMask.getBoundingClientRect().height + 4 });
    }
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
        duration: CONTACT_TIMING.labelDuration,
        ease: ENTRANCE_EASE,
      }, 0);

      const titleStart = CONTACT_TIMING.labelDuration;
      const emailStart = titleStart + CONTACT_TIMING.emailStartOffset;

      titleWords.forEach((lineWords, index) => {
        timeline.to(lineWords, {
          opacity: 1,
          y: 0,
          duration: CONTACT_TIMING.headingDuration,
          ease: ENTRANCE_EASE,
        }, titleStart + index * CONTACT_TIMING.headingStagger);
      });

      timeline.to(emailContents[0], {
        opacity: 1,
        y: 0,
        duration: CONTACT_TIMING.emailDuration,
        ease: ENTRANCE_EASE,
      }, emailStart);

      const emailEnd = emailStart + CONTACT_TIMING.emailDuration;
      timeline.to(arrow, {
        opacity: 1,
        duration: CONTACT_TIMING.arrowDuration,
        ease: ENTRANCE_EASE,
      }, emailEnd);
      timeline.to(underline, {
        scaleX: 1,
        duration: CONTACT_TIMING.underlineDuration,
        ease: ENTRANCE_EASE,
      }, emailStart);

      heroHasStartedRef.current = true;
      heroTimelineRef.current = timeline;
      panel.dataset.entranceInitialized = 'true';
      timeline.play(0);
    }, panel);
    heroContextRef.current = context;
  }, [titleLines]);

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
          <p className="contact-page__eyebrow"></p>
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
          <div ref={emailContainerRef} className="contact-page__email-container">
            <a
              ref={emailLinkRef}
              className="contact-page__email"
              href={CONTACT_MAILTO_LINK}
              aria-label={CONTACT_EMAIL}
            >
              <span className="contact-page__email-lines" aria-label={CONTACT_EMAIL}>
                <span className="contact-page__email-line-mask">
                  <span className="contact-page__email-line-content" aria-hidden="true">{CONTACT_EMAIL}</span>
                </span>
              </span>
              <span className="contact-page__email-arrow" aria-hidden="true">↗</span>
              <span className="contact-page__email-underline" aria-hidden="true" />
            </a>
          </div>

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
              <a href={CONTACT_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                {WHATSAPP_DISPLAY_NUMBER}
              </a>
            </section>
            <section className="contact-page__detail" aria-labelledby="contact-studio">
              <span className="contact-page__divider" aria-hidden="true" />
              <h2 id="contact-studio">WHAT YOU GET</h2>
              <p>Samples before bulk orders</p>
              <a href={CONTACT_PHONE_LINK}>	Tracked shipments to your door</a>
            </section>
            <section className="contact-page__detail contact-page__detail--social" aria-labelledby="contact-social">
              <span className="contact-page__divider" aria-hidden="true" />
              <h2 id="contact-social">Follow our work</h2>
              <a href="https://www.instagram.com/zateef_international?mdxt=MW12c3M0NDIKNmVjMg==" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
              <a href="#" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
            </section>
          </div>
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
              See our work
            </Link>
          </span>
        </div>
      </section>
      {isQuoteOpen && <QuoteRequestModal onClose={() => setIsQuoteOpen(false)} />}
    </AppShell>
  );
}
