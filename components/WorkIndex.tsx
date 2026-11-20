'use client';

import Image from 'next/image';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
  WORK_SUBCATEGORIES,
  type WorkItem,
} from '@/data/work';
import { usePublicWorkCatalog } from '@/components/usePublicWorkCatalog';

type QuoteContext = WorkItem | null | undefined;

function getCategoryKey(item: WorkItem) {
  return item.categoryId ?? item.category;
}

function getSubcategoryKey(item: WorkItem) {
  return item.subcategoryId ?? item.subcategory;
}

function getSubcategoryMenuId(category: string) {
  return `work-subcategory-menu-${encodeURIComponent(category)}`;
}

const workDetailVariants = {
  enter: (direction: -1 | 1) => ({ opacity: 0, x: direction * 32 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: -1 | 1) => ({ opacity: 0, x: direction * -32 }),
};

function subscribeToSearch(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getSearchSnapshot() {
  return window.location.search;
}

function getServerSearchSnapshot() {
  return '';
}

function updateWorkSearch(update: (params: URLSearchParams) => void) {
  const params = new URLSearchParams(window.location.search);
  update(params);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function getWhatsAppLink(item?: WorkItem) {
  const message = item
    ? `Hi, I'm interested in: ${item.title}`
    : 'Hi, I want to request a quote for clothing manufacturing.';

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function WorkIndex() {
  const catalog = usePublicWorkCatalog();
  const items = catalog.items;
  const routeSearch = useSyncExternalStore(
    subscribeToSearch,
    getSearchSnapshot,
    getServerSearchSnapshot,
  );
  const routeParams = useMemo(() => new URLSearchParams(routeSearch), [routeSearch]);
  const [activeCategory, setActiveCategory] = useState<string | 'All'>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<{
    category: string;
    subcategory: string;
  } | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [selectedItemSlug, setSelectedItemSlug] = useState<string | null>(null);
  const [quoteContext, setQuoteContext] = useState<QuoteContext>(undefined);
  const [detailDirection, setDetailDirection] = useState<-1 | 1>(1);
  const routeProductValue = routeParams.get('product');
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const introRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const detailSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const filterTriggerRefs = useRef(new Map<string, HTMLButtonElement>());
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

  const subcategoriesFor = useCallback((categoryKey: string) => {
    const category = catalog.categories.find((entry) => entry.id === categoryKey);
    if (catalog.hasManagedProducts && category) {
      return catalog.subcategories
        .filter((subcategory) => subcategory.categoryId === categoryKey)
        .map((subcategory) => ({ key: subcategory.id, label: subcategory.name }));
    }

    if (categoryKey in WORK_SUBCATEGORIES) {
      return WORK_SUBCATEGORIES[categoryKey as keyof typeof WORK_SUBCATEGORIES]
        .map((subcategory) => ({ key: subcategory.slug, label: subcategory.label }));
    }

    return [];
  }, [catalog.categories, catalog.hasManagedProducts, catalog.subcategories]);
  const categoryOptions = useMemo(() => {
    const byKey = new Map<string, { key: string; label: string; slug?: string; order?: number }>();
    for (const category of catalog.categories) {
      byKey.set(category.id, {
        key: category.id,
        label: category.name,
        slug: category.slug,
        order: category.order,
      });
    }
    for (const item of items) {
      const key = getCategoryKey(item);
      if (byKey.has(key)) continue;
      byKey.set(key, { key, label: item.category });
    }
    return Array.from(byKey.values()).sort((left, right) => (
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
      || left.label.localeCompare(right.label)
    ));
  }, [catalog.categories, items]);
  const filterCategories = useMemo(
    () => ['All', ...categoryOptions.map((category) => category.key)],
    [categoryOptions],
  );
  const routeSubcategoryValue = routeParams.get('subcategory');
  const routeSubcategory = routeSubcategoryValue
    ? catalog.subcategories.find((entry) => (
      entry.id === routeSubcategoryValue || entry.slug === routeSubcategoryValue
    ))
    : undefined;
  const staticRouteSubcategoryItem = routeSubcategoryValue && !routeSubcategory
    ? items.find((item) => (
      item.subcategory === routeSubcategoryValue
      || item.subcategoryLabel?.toLowerCase() === routeSubcategoryValue.toLowerCase()
    ))
    : undefined;
  const routeSubcategoryFilter = routeSubcategory
    ? { category: routeSubcategory.categoryId, subcategory: routeSubcategory.id }
    : staticRouteSubcategoryItem
      ? {
        category: getCategoryKey(staticRouteSubcategoryItem),
        subcategory: getSubcategoryKey(staticRouteSubcategoryItem) ?? '',
      }
      : null;
  const routeCategoryValue = routeParams.get('category');
  const routeCategoryKey = routeCategoryValue
    ? categoryOptions.find((category) => (
      category.key === routeCategoryValue
      || category.slug === routeCategoryValue
      || category.label.toLowerCase() === routeCategoryValue.toLowerCase()
    ))?.key
    : undefined;
  const routeProduct = routeProductValue
    ? items.find((item) => item.slug === routeProductValue || item.productId === routeProductValue)
    : undefined;
  const selectedItem = items.find((item) => item.slug === selectedItemSlug)
    ?? routeProduct
    ?? null;
  const detailOpen = selectedItem !== null;
  const requestedCategory = routeSubcategoryFilter?.category
    ?? routeCategoryKey
    ?? activeCategory;
  const effectiveActiveCategory = requestedCategory === 'All'
    || categoryOptions.some((category) => category.key === requestedCategory)
    ? requestedCategory
    : 'All';
  const requestedSubcategory = routeSubcategoryFilter ?? selectedSubcategory;
  const effectiveSelectedSubcategory = requestedSubcategory
    && categoryOptions.some((category) => category.key === requestedSubcategory.category)
    && subcategoriesFor(requestedSubcategory.category)
      .some((subcategory) => subcategory.key === requestedSubcategory.subcategory)
    ? requestedSubcategory
    : null;
  const openCategoryKey = openCategory
    && categoryOptions.some((category) => category.key === openCategory)
    ? openCategory
    : null;
  const visibleItems = useMemo(() => items.filter((item) => (
    (effectiveActiveCategory === 'All' || getCategoryKey(item) === effectiveActiveCategory)
    && (!effectiveSelectedSubcategory
      || effectiveSelectedSubcategory.category !== getCategoryKey(item)
      || getSubcategoryKey(item) === effectiveSelectedSubcategory.subcategory)
  )), [effectiveActiveCategory, effectiveSelectedSubcategory, items]);

  function clearRouteFilters() {
    updateWorkSearch((params) => {
      params.delete('category');
      params.delete('subcategory');
      params.delete('product');
    });
  }

  function selectCategoryFilter(category: string | 'All') {
    setActiveCategory(category);
    setSelectedSubcategory(null);
    clearRouteFilters();
  }

  function selectSubcategoryFilter(category: string, subcategory: string) {
    setActiveCategory(category);
    setSelectedSubcategory({ category, subcategory });
    clearRouteFilters();
  }

  function closeSelectedItem() {
    setSelectedItemSlug(null);
    if (routeParams.has('product')) {
      updateWorkSearch((params) => params.delete('product'));
    }
  }

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

  function scheduleMenuClose(category: string) {
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
    category: string,
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

  function toggleSubcategoryMenu(category: string) {
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
    category: string,
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
    closeSelectedItem();
    setQuoteContext(item ?? null);
  }

  function navigateDetail(direction: -1 | 1) {
    if (!selectedItem) return;
    const currentIndex = visibleItems.findIndex((item) => item.slug === selectedItem.slug);
    const nextItem = visibleItems[currentIndex + direction];
    if (!nextItem) return;
    setDetailDirection(direction);
    setSelectedItemSlug(nextItem.slug);
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
      closeSelectedItem();
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
                  ? items.length
                  : items.filter((item) => getCategoryKey(item) === category).length;
                const categoryLabel = category === 'All'
                  ? 'All'
                  : categoryOptions.find((option) => option.key === category)?.label ?? category;
                const subcategories = category === 'All' ? [] : subcategoriesFor(category);
                const isActive = category === effectiveActiveCategory;
                const hasMenu = subcategories.length > 0;
                const selectedSubcategoryLabel = hasMenu && effectiveSelectedSubcategory?.category === category
                  ? subcategories.find(
                    (subcategory) => subcategory.key === effectiveSelectedSubcategory.subcategory,
                  )?.label
                  : undefined;
                const filterName = selectedSubcategoryLabel
                  ? `${categoryLabel} / ${selectedSubcategoryLabel}`
                  : categoryLabel;

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
                        selectCategoryFilter(category);
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
                        aria-label={`${openCategory === category ? 'Close' : 'Open'} ${categoryLabel} subcategories`}
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

        {openCategoryKey && menuPosition && typeof document !== 'undefined' && createPortal(
          <motion.div
            ref={subcategoryMenuRef}
            id={getSubcategoryMenuId(openCategoryKey)}
            className="work-index__submenu"
            role="menu"
            aria-label={`${categoryOptions.find((category) => category.key === openCategoryKey)?.label ?? openCategoryKey} subcategories`}
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
              if (event.pointerType === 'mouse') scheduleMenuClose(openCategoryKey);
            }}
            onKeyDown={(event) => handleSubcategoryMenuKeyDown(event, openCategoryKey)}
          >
            {subcategoriesFor(openCategoryKey).map((subcategory) => {
              const count = items.filter((item) => (
                getCategoryKey(item) === openCategoryKey
                && getSubcategoryKey(item) === subcategory.key
              )).length;
              const isSelected = effectiveSelectedSubcategory?.category === openCategoryKey
                && effectiveSelectedSubcategory.subcategory === subcategory.key;

              return (
                <button
                  key={subcategory.key}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`work-index__submenu-item${isSelected ? ' is-active' : ''}${count === 0 ? ' is-empty' : ''}`}
                  onClick={() => {
                    selectSubcategoryFilter(openCategoryKey, subcategory.key);
                    filterTriggerRefs.current.get(openCategoryKey)?.focus();
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
            {catalog.status === 'error' && (
              <p className="work-index__catalog-error" role="status">
                The live catalog is unavailable. Showing the saved work examples.
              </p>
            )}
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
                    setSelectedItemSlug(item.slug);
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
                      unoptimized={item.image.startsWith('data:') || item.image.startsWith('https://')}
                    />
                    <span className="work-index__card-arrow" aria-hidden="true">↗</span>
                  </div>
                  <div className="work-index__meta">
                    <span className="work-index__card-category">{item.category}</span>
                    <span className="work-index__project-title">{item.title}</span>
                    {(item.badge || typeof item.price === 'number') && (
                      <span className="work-index__product-details">
                        {item.badge && <span>{item.badge}</span>}
                        {typeof item.price === 'number' && <span>Price {item.price.toLocaleString()}</span>}
                      </span>
                    )}
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
            closeSelectedItem();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeSelectedItem();
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
                onClick={closeSelectedItem}
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
                  unoptimized={selectedItem.image.startsWith('data:') || selectedItem.image.startsWith('https://')}
                />
              </div>
              <div className="work-detail__body">
                <p className="work-detail__meta">{selectedItem.meta}</p>
                <h2 id="work-detail-title" className="work-detail__title">{selectedItem.title}</h2>
                {(selectedItem.badge || typeof selectedItem.price === 'number' || selectedItem.inStock !== undefined) && (
                  <p className="work-detail__product-details">
                    {selectedItem.badge && <span>{selectedItem.badge}</span>}
                    {typeof selectedItem.price === 'number' && <span>Price {selectedItem.price.toLocaleString()}</span>}
                    {selectedItem.inStock !== undefined && (
                      <span>{selectedItem.inStock ? 'In stock' : 'Currently unavailable'}</span>
                    )}
                  </p>
                )}
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
