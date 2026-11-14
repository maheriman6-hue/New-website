'use client';

import Image from 'next/image';
import { useMemo, useRef, useState, useLayoutEffect, type KeyboardEvent } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { AppShell } from '@/components/AppShell';
import { Cursor } from '@/components/Cursor';
import { QuoteRequestModal } from '@/components/QuoteRequestModal';
import { CONTACT_WHATSAPP_LINK, WHATSAPP_NUMBER } from '@/lib/contactLinks';
import {
  createEntranceTimeline,
  ENTRANCE_EASE,
  ENTRANCE_TIMING,
  observeEntranceOnce,
  registerEntranceEase,
  type EntranceTriggerTiming,
} from '@/lib/entranceMotion';
import { WORK_CATEGORIES, workItems, type WorkCategory, type WorkItem } from '@/data/work';

type QuoteContext = WorkItem | null | undefined;

function getWhatsAppLink(item?: WorkItem) {
  const message = item
    ? `Hi, I'm interested in: ${item.title}`
    : 'Hi, I want to request a quote for clothing manufacturing.';

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function WorkIndex() {
  const [activeCategory, setActiveCategory] = useState<WorkCategory | 'All'>('All');
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [quoteContext, setQuoteContext] = useState<QuoteContext>(undefined);
  const detailOpen = selectedItem !== null;
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const introRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const openerSlugRef = useRef<string | null>(null);
  const restoreCardFocusRef = useRef(true);

  const visibleItems = useMemo(
    () => activeCategory === 'All'
      ? workItems
      : workItems.filter((item) => item.category === activeCategory),
    [activeCategory],
  );
  const filterCategories = useMemo(() => {
    const populatedCategories = new Set(workItems.map((item) => item.category));
    return [
      'All' as const,
      ...WORK_CATEGORIES.filter((category) => populatedCategories.has(category)),
    ];
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealElements = Array.from(root.querySelectorAll<HTMLElement>('.work-index__reveal'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.dataset.entranceReady = 'true';
      gsap.set(revealElements, { clearProps: 'all' });
      return;
    }

    registerEntranceEase();
    gsap.set(revealElements, {
      opacity: 0,
      clipPath: 'inset(0 0 100% 0)',
    });
    root.dataset.entranceReady = 'true';

    const cleanups: Array<() => void> = [];
    const animateWhenVisible = (
      target: HTMLElement | null,
      elements: HTMLElement[],
      timing: EntranceTriggerTiming = ENTRANCE_TIMING,
    ) => {
      if (!target || elements.length === 0) return;
      const timeline = createEntranceTimeline(elements);
      timeline.to(elements, {
        opacity: 1,
        clipPath: 'inset(0 0 0% 0)',
        duration: ENTRANCE_TIMING.labelDuration,
        stagger: 0.08,
        ease: ENTRANCE_EASE,
      });
      const stopObserving = observeEntranceOnce(target, timing, () => timeline.play(0));
      cleanups.push(() => {
        stopObserving();
        timeline.kill();
      });
    };

    const getReveals = (container: Element | null) => container
      ? Array.from(container.querySelectorAll<HTMLElement>('.work-index__reveal'))
      : [];

    animateWhenVisible(introRef.current, getReveals(introRef.current));
    animateWhenVisible(gridRef.current, getReveals(gridRef.current), {
      desktopThreshold: 0.01,
      mobileThreshold: 0.01,
    });
    animateWhenVisible(closingRef.current, getReveals(closingRef.current));

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !detailOpen) return;

    const previousOverflow = document.body.style.overflow;
    const cards = cardRefs.current;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialogCloseRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (restoreCardFocusRef.current) {
        const openerSlug = openerSlugRef.current;
        if (openerSlug) {
          window.requestAnimationFrame(() => cards.get(openerSlug)?.focus());
        }
      }
      restoreCardFocusRef.current = true;
    };
  }, [detailOpen]);

  function openQuote(item?: WorkItem) {
    restoreCardFocusRef.current = false;
    setSelectedItem(null);
    setQuoteContext(item ?? null);
  }

  function navigateDetail(direction: -1 | 1) {
    if (!selectedItem) return;
    const currentIndex = visibleItems.findIndex((item) => item.slug === selectedItem.slug);
    const nextItem = visibleItems[currentIndex + direction];
    if (nextItem) setSelectedItem(nextItem);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setSelectedItem(null);
      return;
    }

    if (event.key !== 'Tab') return;

    const dialog = event.currentTarget;
    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'),
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (!firstElement || !lastElement) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <AppShell heroTone="dark">
      <div ref={rootRef} className="work-index" data-entrance-ready="false">
        <header ref={introRef} className="work-index__intro">
          <p className="work-index__eyebrow work-index__reveal">(WORK) — 2023–26</p>

          <LayoutGroup id="work-categories">
            <div className="work-index__filters work-index__reveal" role="group" aria-label="Filter projects by category">
              {filterCategories.map((category) => {
                const count = category === 'All'
                  ? workItems.length
                  : workItems.filter((item) => item.category === category).length;
                const isActive = category === activeCategory;

                return (
                  <button
                    type="button"
                    className={`work-index__filter${isActive ? ' is-active' : ''}`}
                    aria-pressed={isActive}
                    key={category}
                    onClick={() => setActiveCategory(category)}
                  >
                    {isActive && (
                      <motion.span
                        className="work-index__filter-indicator"
                        layoutId="active-work-filter"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="work-index__filter-name">{category}</span>
                    <span className="work-index__filter-count">{String(count).padStart(2, '0')}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </header>

        <motion.div ref={gridRef} className="work-index__grid" layout>
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleItems.map((item, index) => (
              <motion.article
                className={`work-index__card work-index__reveal${index % 4 === 1 || index % 4 === 2 ? ' is-offset' : ''}`}
                key={item.slug}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.985 }}
                transition={reduceMotion ? { duration: 0 } : {
                  layout: { type: 'spring', stiffness: 330, damping: 34 },
                  opacity: { duration: 0.22 },
                  y: { duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.025, 0.2) },
                }}
                data-cursor-label="View ↗"
              >
                <button
                  ref={(node) => {
                    if (node) cardRefs.current.set(item.slug, node);
                    else cardRefs.current.delete(item.slug);
                  }}
                  type="button"
                  className="work-index__card-action"
                  aria-label={`View ${item.title}, ${item.category}`}
                  aria-haspopup="dialog"
                  onClick={() => {
                    openerSlugRef.current = item.slug;
                    restoreCardFocusRef.current = true;
                    setSelectedItem(item);
                  }}
                >
                  <div className="work-index__media">
                    <Image
                      className="work-index__image"
                      src={item.image}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 700px) 100vw, 45vw"
                      quality={90}
                      fetchPriority={index === 0 ? 'high' : undefined}
                      style={{ objectPosition: item.imagePosition ?? 'center' }}
                      loading={index < 2 ? 'eager' : 'lazy'}
                    />
                    <span className="work-index__card-arrow" aria-hidden="true">↗</span>
                  </div>
                  <div className="work-index__meta">
                    <span className="work-index__card-category">{item.category}</span>
                    <span className="work-index__project-title">{item.title}</span>
                  </div>
                </button>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>

        <section ref={closingRef} className="work-index__closing" aria-labelledby="work-closing-title">
          <h2 id="work-closing-title" className="work-index__closing-title work-index__reveal">
            Have a design in mind?
          </h2>
          <p className="work-index__closing-copy work-index__reveal">
            Send us your sketch or tech pack. We&apos;ll reply within 24 hours.
          </p>
          <div className="work-index__closing-actions work-index__reveal">
            <button type="button" className="work-index__closing-button" onClick={() => openQuote()}>
              Request a quote <span aria-hidden="true">↗</span>
            </button>
            <a
              className="work-index__closing-button work-index__closing-button--secondary"
              href={CONTACT_WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </div>

      {selectedItem && (
        <dialog
          ref={dialogRef}
          className="work-detail"
          role="dialog"
          aria-modal="true"
          aria-labelledby="work-detail-title"
          onCancel={(event) => {
            event.preventDefault();
            setSelectedItem(null);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedItem(null);
          }}
          onKeyDown={handleDialogKeyDown}
        >
          <div className="work-detail__content">
            <button
              ref={dialogCloseRef}
              type="button"
              className="work-detail__close"
              aria-label="Close work details"
              onClick={() => setSelectedItem(null)}
            >
              ×
            </button>
            <div className="work-detail__image-wrap">
              <Image
                className="work-detail__image"
                src={selectedItem.image}
                alt={selectedItem.alt}
                fill
                sizes="(max-width: 700px) 100vw, 56vw"
                quality={90}
                style={{ objectPosition: selectedItem.imagePosition ?? 'center' }}
              />
            </div>
            <div className="work-detail__body">
              <p className="work-detail__meta">{selectedItem.meta}</p>
              <h2 id="work-detail-title" className="work-detail__title">{selectedItem.title}</h2>
              <p className="work-detail__description">{selectedItem.description}</p>
              {selectedItem.specs?.filter((spec) => spec.label.trim() && spec.value.trim()).length ? (
                <dl className="work-detail__specs">
                  {selectedItem.specs
                    .filter((spec) => spec.label.trim() && spec.value.trim())
                    .map((spec) => (
                      <div className="work-detail__spec" key={spec.label}>
                        <dt>{spec.label}</dt>
                        <dd>{spec.value}</dd>
                      </div>
                    ))}
                </dl>
              ) : null}
              <div className="work-detail__actions">
                <button type="button" onClick={() => openQuote(selectedItem)}>
                  Request a quote for this <span aria-hidden="true">↗</span>
                </button>
                <a href={getWhatsAppLink(selectedItem)} target="_blank" rel="noopener noreferrer">
                  Chat on WhatsApp <span aria-hidden="true">↗</span>
                </a>
              </div>
              <nav className="work-detail__navigation" aria-label="Browse filtered work">
                <button
                  type="button"
                  aria-label="Previous work item"
                  disabled={visibleItems.findIndex((item) => item.slug === selectedItem.slug) === 0}
                  onClick={() => navigateDetail(-1)}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  aria-label="Next work item"
                  disabled={visibleItems.findIndex((item) => item.slug === selectedItem.slug) === visibleItems.length - 1}
                  onClick={() => navigateDetail(1)}
                >
                  Next →
                </button>
              </nav>
            </div>
          </div>
        </dialog>
      )}

      {quoteContext !== undefined && (
        <QuoteRequestModal
          onClose={() => setQuoteContext(undefined)}
          initialProduct={quoteContext?.title}
          initialCategory={quoteContext?.category}
        />
      )}
      <Cursor />
    </AppShell>
  );
}
