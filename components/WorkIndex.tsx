'use client';

import Image from 'next/image';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
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
import {
  WORK_CATEGORIES,
  WORK_SUBCATEGORIES,
  workItems,
  type WorkCategory,
  type WorkCategoryWithSubcategories,
  type WorkItem,
} from '@/data/work';

type QuoteContext = WorkItem | null | undefined;

function hasSubcategories(category: WorkCategory): category is WorkCategoryWithSubcategories {
  return category in WORK_SUBCATEGORIES;
}

function getSubcategoryMenuId(category: WorkCategoryWithSubcategories) {
  return `work-subcategory-menu-${category.toLowerCase()}`;
}

const workDetailVariants = {
  enter: (direction: -1 | 1) => ({ opacity: 0, x: direction * 32 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: -1 | 1) => ({ opacity: 0, x: direction * -32 }),
};

function getWhatsAppLink(item?: WorkItem) {
  const message = item
    ? `Hi, I'm interested in: ${item.title}`
    : 'Hi, I want to request a quote for clothing manufacturing.';

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function WorkIndex() {
  const [activeCategory, setActiveCategory] = useState<WorkCategory | 'All'>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<{
    category: WorkCategoryWithSubcategories;
    subcategory: (typeof WORK_SUBCATEGORIES)[WorkCategoryWithSubcategories][number]['slug'];
  } | null>(null);
  const [openCategory, setOpenCategory] = useState<WorkCategoryWithSubcategories | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [quoteContext, setQuoteContext] = useState<QuoteContext>(undefined);
  const [detailDirection, setDetailDirection] = useState<-1 | 1>(1);
  const detailOpen = selectedItem !== null;
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const introRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const detailSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const filterTriggerRefs = useRef(new Map<WorkCategoryWithSubcategories, HTMLButtonElement>());
  const subcategoryMenuRef = useRef<HTMLDivElement | null>(null);
  const menuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMenuFocusRef = useRef<'first' | 'last' | null>(null);
  const openerSlugRef = useRef<string | null>(null);
  const restoreCardFocusRef = useRef(true);

  const clearMenuCloseTimer = useCallback(() => {
    if (menuCloseTimerRef.current) {
      clearTimeout(menuCloseTimerRef.current);
      menuCloseTimerRef.current = null;
    }
  }, []);

  const closeSubcategoryMenu = useCallback(() => {
    pendingMenuFocusRef.current = null;
    clearMenuCloseTimer();
    setOpenCategory(null);
  }, [clearMenuCloseTimer]);

  const visibleItems = useMemo(
    () => {
      if (activeCategory === 'All') return workItems;

      return workItems.filter((item) => (
        item.category === activeCategory
        && (!selectedSubcategory
          || selectedSubcategory.category !== activeCategory
          || item.subcategory === selectedSubcategory.subcategory)
      ));
    },
    [activeCategory, selectedSubcategory],
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

  useLayoutEffect(() => {
    if (!openCategory) return;

    const updatePosition = () => {
      const trigger = filterTriggerRefs.current.get(openCategory);
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 184), window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
      const top = Math.min(rect.bottom, Math.max(8, window.innerHeight - 120));

      setMenuPosition({
        top,
        left,
        width,
        maxHeight: Math.max(96, window.innerHeight - top - 16),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [openCategory]);

  useLayoutEffect(() => {
    if (!openCategory || !menuPosition || !pendingMenuFocusRef.current) return;

    const items = subcategoryMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    const target = pendingMenuFocusRef.current === 'first'
      ? items?.[0]
      : items?.[items.length - 1];
    if (!target) return;

    target.focus();
    pendingMenuFocusRef.current = null;
  }, [openCategory, menuPosition]);

  useLayoutEffect(() => {
    if (!openCategory) return;

    const trigger = filterTriggerRefs.current.get(openCategory);
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node
        && (trigger?.contains(target) || subcategoryMenuRef.current?.contains(target))
      ) {
        return;
      }

      closeSubcategoryMenu();
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeSubcategoryMenu();
      trigger?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openCategory, closeSubcategoryMenu]);

  function scheduleMenuClose(category: WorkCategoryWithSubcategories) {
    clearMenuCloseTimer();
    menuCloseTimerRef.current = setTimeout(() => {
      const trigger = filterTriggerRefs.current.get(category);
      const filterHovered = trigger?.closest('.work-index__filter')?.matches(':hover') ?? false;
      const menuHovered = subcategoryMenuRef.current?.matches(':hover') ?? false;

      if (!filterHovered && !menuHovered) {
        pendingMenuFocusRef.current = null;
        setOpenCategory((current) => current === category ? null : current);
      }
    }, 140);
  }

  function openSubcategoryMenu(
    category: WorkCategoryWithSubcategories,
    focusEdge?: 'first' | 'last',
  ) {
    clearMenuCloseTimer();
    if (focusEdge && openCategory === category) {
      const items = subcategoryMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
      const target = focusEdge === 'first' ? items?.[0] : items?.[items.length - 1];
      target?.focus();
      return;
    }

    if (focusEdge) pendingMenuFocusRef.current = focusEdge;
    setOpenCategory(category);
  }

  function toggleSubcategoryMenu(category: WorkCategoryWithSubcategories) {
    clearMenuCloseTimer();
    if (openCategory === category) {
      closeSubcategoryMenu();
    } else {
      pendingMenuFocusRef.current = null;
      setOpenCategory(category);
    }
  }

  function handleSubcategoryMenuKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    category: WorkCategoryWithSubcategories,
  ) {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeSubcategoryMenu();
      filterTriggerRefs.current.get(category)?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = currentIndex < 0
        ? (direction > 0 ? 0 : items.length - 1)
        : (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      const trigger = filterTriggerRefs.current.get(category);
      const focusableElements = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => (
        element.tabIndex >= 0
        && element.getClientRects().length > 0
        && !subcategoryMenuRef.current?.contains(element)
      ));
      const triggerIndex = trigger ? focusableElements.indexOf(trigger) : -1;
      const nextElement = focusableElements[triggerIndex + (event.shiftKey ? -1 : 1)];

      if (nextElement) {
        event.preventDefault();
        closeSubcategoryMenu();
        nextElement.focus();
      } else {
        closeSubcategoryMenu();
      }
    }
  }

  function openQuote(item?: WorkItem) {
    restoreCardFocusRef.current = false;
    setSelectedItem(null);
    setQuoteContext(item ?? null);
  }

  function navigateDetail(direction: -1 | 1) {
    if (!selectedItem) return;
    const currentIndex = visibleItems.findIndex((item) => item.slug === selectedItem.slug);
    const nextItem = visibleItems[currentIndex + direction];
    if (!nextItem) return;
    setDetailDirection(direction);
    setSelectedItem(nextItem);
  }

  function startDetailSwipe(event: PointerEvent<HTMLDialogElement>) {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    detailSwipeStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function endDetailSwipe(event: PointerEvent<HTMLDialogElement>) {
    const start = detailSwipeStartRef.current;
    detailSwipeStartRef.current = null;
    if (event.pointerType !== 'touch' || !start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    navigateDetail(deltaX < 0 ? 1 : -1);
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
            <div className="work-index__filters" role="group" aria-label="Filter products by category">
              {filterCategories.map((category) => {
                const count = category === 'All'
                  ? workItems.length
                  : workItems.filter((item) => item.category === category).length;
                const isActive = category === activeCategory;
                const hasMenu = category !== 'All' && hasSubcategories(category);
                const selectedSubcategoryLabel = hasMenu && selectedSubcategory?.category === category
                  ? WORK_SUBCATEGORIES[category].find(
                    (subcategory) => subcategory.slug === selectedSubcategory.subcategory,
                  )?.label
                  : undefined;
                const filterName = selectedSubcategoryLabel
                  ? `${category} / ${selectedSubcategoryLabel}`
                  : category;

                return (
                  <div
                    className={`work-index__filter${isActive ? ' is-active' : ''}`}
                    key={category}
                    onPointerEnter={(event) => {
                      if (hasMenu && event.pointerType === 'mouse') openSubcategoryMenu(category);
                    }}
                    onPointerLeave={(event) => {
                      if (hasMenu && event.pointerType === 'mouse') scheduleMenuClose(category);
                    }}
                  >
                    {isActive && (
                      <motion.span
                        className="work-index__filter-indicator"
                        layoutId="active-work-filter"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <button
                      type="button"
                      className="work-index__filter-select"
                      aria-pressed={isActive}
                      onClick={() => {
                        setActiveCategory(category);
                        setSelectedSubcategory(null);
                        closeSubcategoryMenu();
                      }}
                    >
                      <span className="work-index__filter-name">{filterName}</span>
                      <span className="work-index__filter-count">{String(count).padStart(2, '0')}</span>
                    </button>
                    {hasMenu && (
                      <button
                        ref={(node) => {
                          if (node) filterTriggerRefs.current.set(category, node);
                          else filterTriggerRefs.current.delete(category);
                        }}
                        type="button"
                        className="work-index__filter-toggle"
                        aria-label={`${openCategory === category ? 'Close' : 'Open'} ${category} subcategories`}
                        aria-haspopup="menu"
                        aria-expanded={openCategory === category}
                        aria-controls={openCategory === category ? getSubcategoryMenuId(category) : undefined}
                        onClick={() => {
                          if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                            openSubcategoryMenu(category);
                          } else {
                            toggleSubcategoryMenu(category);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                            event.preventDefault();
                            openSubcategoryMenu(category, event.key === 'ArrowDown' ? 'first' : 'last');
                          } else if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            if (openCategory === category) {
                              closeSubcategoryMenu();
                            } else {
                              openSubcategoryMenu(category, 'first');
                            }
                          } else if (event.key === 'Escape' && openCategory === category) {
                            event.preventDefault();
                            closeSubcategoryMenu();
                          }
                        }}
                      >
                        <svg
                          className={`work-index__filter-chevron${openCategory === category ? ' is-open' : ''}`}
                          viewBox="0 0 12 12"
                          aria-hidden="true"
                        >
                          <path d="m2 4.5 4 4 4-4" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </LayoutGroup>
        </header>

        {openCategory && menuPosition && typeof document !== 'undefined' && createPortal(
          <motion.div
            ref={subcategoryMenuRef}
            id={getSubcategoryMenuId(openCategory)}
            className="work-index__submenu"
            role="menu"
            aria-label={`${openCategory} subcategories`}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.17, ease: [0.22, 1, 0.36, 1] }}
            onPointerEnter={clearMenuCloseTimer}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse') scheduleMenuClose(openCategory);
            }}
            onKeyDown={(event) => handleSubcategoryMenuKeyDown(event, openCategory)}
          >
            {WORK_SUBCATEGORIES[openCategory].map((subcategory) => {
              const count = workItems.filter((item) => (
                item.category === openCategory && item.subcategory === subcategory.slug
              )).length;
              const isSelected = selectedSubcategory?.category === openCategory
                && selectedSubcategory.subcategory === subcategory.slug;

              return (
                <button
                  key={subcategory.slug}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`work-index__submenu-item${isSelected ? ' is-active' : ''}${count === 0 ? ' is-empty' : ''}`}
                  onClick={() => {
                    setActiveCategory(openCategory);
                    setSelectedSubcategory({
                      category: openCategory,
                      subcategory: subcategory.slug,
                    });
                    filterTriggerRefs.current.get(openCategory)?.focus();
                    closeSubcategoryMenu();
                  }}
                >
                  <span>{subcategory.label}</span>
                  <span className="work-index__filter-count">{String(count).padStart(2, '0')}</span>
                </button>
              );
            })}
          </motion.div>,
          document.body,
        )}

        <div ref={gridRef} className="work-index__grid">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleItems.length === 0 ? (
              <motion.p
                key="empty"
                className="work-index__empty"
                role="status"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
              >
                No products yet
              </motion.p>
            ) : visibleItems.map((item, index) => (
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
                  <div className={`work-index__media${item.imageFit === 'contain' ? ' work-index__media--showcase' : ''}`}>
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
        </div>

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
          onPointerDown={startDetailSwipe}
          onPointerUp={endDetailSwipe}
          onPointerCancel={() => { detailSwipeStartRef.current = null; }}
        >
          <AnimatePresence mode="wait" initial={false} custom={detailDirection}>
            <motion.div
              key={selectedItem.slug}
              className="work-detail__content"
              custom={detailDirection}
              variants={workDetailVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduceMotion ? { duration: 0 } : {
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <button
                ref={dialogCloseRef}
                type="button"
                className="work-detail__close"
                aria-label="Close work details"
                onClick={() => setSelectedItem(null)}
              >
                ×
              </button>
              <div className={`work-detail__image-wrap${selectedItem.imageFit === 'contain' ? ' work-detail__image-wrap--showcase' : ''}`}>
                <Image
                  className={`work-detail__image${selectedItem.imageFit === 'contain' ? ' work-detail__image--showcase' : ''}`}
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
            </motion.div>
          </AnimatePresence>
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
