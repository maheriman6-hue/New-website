'use client';

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { db } from '@/lib/firebase';

type HeroLinkType = 'None' | 'Category' | 'Subcategory' | 'Product' | 'Custom URL';

export interface HeroSlide {
  id: string;
  image?: string;
  imageDesktop?: string;
  alt: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  linkType: HeroLinkType;
  linkId?: string;
  customUrl?: string;
  order?: number;
  visible?: boolean;
  startAt?: number;
  endAt?: number;
  imagePosition?: string;
  strongBottomShade?: boolean;
  isBrandIntro?: boolean;
  useMobileImage?: boolean;
  useDesktopImage?: boolean;
}

interface LinkTarget {
  id: string;
  slug?: string;
  visible?: boolean;
  categoryId?: string;
  subcategoryId?: string;
}

type LinkTargets = {
  categories: LinkTarget[];
  subcategories: LinkTarget[];
  products: LinkTarget[];
};

type ResolvedLink = { url: string; external: boolean } | null;
type TargetCollection = keyof LinkTargets;

const EMPTY_TARGETS: LinkTargets = {
  categories: [],
  subcategories: [],
  products: [],
};

const BRAND_INTRO_SLIDE: HeroSlide = {
  id: 'brand-intro',
  image: '',
  alt: '',
  title: 'ZATEEF International',
  linkType: 'None',
  isBrandIntro: true,
};

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'legacy-built-to-move',
    image: '/media/mobile/sportswear-m.jpg',
    imageDesktop: '/media/sportswear-hero.jpg',
    alt: 'Man and woman wearing black performance sportswear',
    title: 'Built to Move',
    subtitle: 'SPORTSWEAR · PERFORMANCE FABRICS — 2026',
    linkType: 'None',
    order: 1,
    visible: true,
    useMobileImage: true,
    useDesktopImage: true,
  },
  {
    id: 'legacy-street-ready',
    image: '/media/mobile/streetwear-m.jpg',
    imageDesktop: '/media/streetwear-hero.jpg',
    alt: 'Man in a black hoodie and cargo pants against a concrete wall',
    title: 'Street Ready',
    subtitle: 'STREETWEAR · HOODIES & CARGOS — 2026',
    linkType: 'None',
    order: 2,
    visible: true,
    useMobileImage: true,
    useDesktopImage: true,
  },
  {
    id: 'legacy-stitch-by-stitch',
    image: '/media/mobile/stitching-m.jpg',
    imageDesktop: '/media/stiching.webp',
    alt: 'Close-up of hands stitching black sportswear fabric on an industrial sewing machine',
    title: 'Stitch by Stitch',
    subtitle: 'IN-HOUSE PRODUCTION · SAMPLE TO BULK',
    linkType: 'None',
    order: 3,
    visible: true,
    useMobileImage: true,
    useDesktopImage: true,
  },
  {
    id: 'legacy-ready-to-ship',
    image: '/media/mobile/delivery-m.jpg',
    imageDesktop: '/media/zateef-delivery.webp',
    alt: 'Black Zateef International shipping boxes, an open box with a packed black hoodie, a checklist and a thank-you card on a wooden table',
    title: 'Ready to Ship',
    subtitle: 'PACKING · GLOBAL DELIVERY — 2026',
    linkType: 'None',
    order: 4,
    visible: true,
    imagePosition: '58% 0%',
    strongBottomShade: true,
    useMobileImage: true,
    useDesktopImage: true,
  },
];

function readText(data: DocumentData, key: string): string | undefined {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readTimestamp(data: DocumentData, key: string): number | undefined {
  const value = data[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseHeroSlide(id: string, value: DocumentData): HeroSlide | null {
  const image = readText(value, 'image');
  const imageDesktop = readText(value, 'imageDesktop');
  const useMobileImage = typeof value.useMobileImage === 'boolean'
    ? value.useMobileImage
    : Boolean(image);
  const useDesktopImage = typeof value.useDesktopImage === 'boolean'
    ? value.useDesktopImage
    : Boolean(imageDesktop);
  if ((!useMobileImage || !image) && (!useDesktopImage || !imageDesktop)) return null;

  const acceptedLinkTypes: HeroLinkType[] = [
    'None',
    'Category',
    'Subcategory',
    'Product',
    'Custom URL',
  ];
  const rawLinkType = value.linkType;
  const linkType = acceptedLinkTypes.find((candidate) => candidate === rawLinkType) ?? 'None';
  const order = readTimestamp(value, 'order');

  return {
    id,
    image,
    imageDesktop,
    alt: readText(value, 'alt') ?? '',
    title: readText(value, 'title'),
    subtitle: readText(value, 'subtitle'),
    buttonText: readText(value, 'buttonText'),
    linkType,
    linkId: readText(value, 'linkId'),
    customUrl: readText(value, 'customUrl'),
    order,
    visible: typeof value.visible === 'boolean' ? value.visible : undefined,
    startAt: readTimestamp(value, 'startAt'),
    endAt: readTimestamp(value, 'endAt'),
    imagePosition: readText(value, 'imagePosition'),
    strongBottomShade: typeof value.strongBottomShade === 'boolean'
      ? value.strongBottomShade
      : undefined,
    useMobileImage,
    useDesktopImage,
  };
}

function readLinkTargets(snapshot: QuerySnapshot<DocumentData>): LinkTarget[] {
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      slug: readText(data, 'slug'),
      visible: typeof data.visible === 'boolean' ? data.visible : undefined,
      categoryId: readText(data, 'categoryId'),
      subcategoryId: readText(data, 'subcategoryId'),
    };
  });
}

function resolveSlideLink(slide: HeroSlide, targets: LinkTargets): ResolvedLink {
  if (slide.linkType === 'Custom URL') {
    const url = slide.customUrl?.trim();
    if (!url || url.startsWith('//')) return null;
    if (/^https:\/\//i.test(url)) {
      try {
        const externalUrl = new URL(url);
        if (externalUrl.protocol !== 'https:') return null;
        return {
          url: externalUrl.href,
          external: typeof window !== 'undefined' && externalUrl.origin !== window.location.origin,
        };
      } catch {
        return null;
      }
    }
    return /^[a-z][a-z0-9+.-]*:/i.test(url) ? null : { url, external: false };
  }

  const targetCollection: Partial<Record<HeroLinkType, TargetCollection>> = {
    Category: 'categories',
    Subcategory: 'subcategories',
    Product: 'products',
  };
  const collectionName = targetCollection[slide.linkType];
  if (!collectionName || !slide.linkId) return null;
  const target = targets[collectionName].find((item) => item.id === slide.linkId);
  if (!target || target.visible === false) return null;
  if (collectionName === 'products') {
    const category = target.categoryId
      ? targets.categories.find((item) => item.id === target.categoryId)
      : undefined;
    if (!category || category.visible === false) return null;
    if (target.subcategoryId) {
      const subcategory = targets.subcategories.find((item) => (
        item.id === target.subcategoryId && item.categoryId === target.categoryId
      ));
      if (!subcategory || subcategory.visible === false) return null;
    } else if (targets.subcategories.some((item) => item.categoryId === target.categoryId)) {
      return null;
    }
  }

  const parameter = collectionName === 'categories'
    ? 'category'
    : collectionName === 'subcategories' ? 'subcategory' : 'product';
  return {
    url: `/work?${parameter}=${encodeURIComponent(target.slug || target.id)}`,
    external: false,
  };
}

function formatSlideNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function SlideImage({ slide, priority }: { slide: HeroSlide; priority: boolean }) {
  if (slide.isBrandIntro) {
    return (
      <div className="home-hero__intro" aria-hidden="true">
        <div className="home-hero__intro-name">Zateef</div>
        <div className="home-hero__intro-wordmark">International</div>
      </div>
    );
  }

  const mobileImage = slide.useMobileImage === false ? undefined : slide.image;
  const desktopImage = slide.useDesktopImage === false ? undefined : slide.imageDesktop;

  return (
    <picture className="home-hero__picture">
      {desktopImage && (
        <source media="(min-width: 768px)" srcSet={desktopImage} />
      )}
      {/* Native img keeps data URLs usable without the Next image optimizer. */}
      <img
        className="home-hero__image"
        src={mobileImage ?? desktopImage ?? ''}
        alt={slide.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        style={{ '--hero-image-position': slide.imagePosition ?? 'center' } as CSSProperties}
      />
    </picture>
  );
}

export function HomeHeroSlider() {
  const maskId = `hero-strip-mask-${useId().replaceAll(':', '')}`;
  const [allSlides, setAllSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [targets, setTargets] = useState<LinkTargets>(EMPTY_TARGETS);
  const [intervalSeconds, setIntervalSeconds] = useState(3);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [settledSlideId, setSettledSlideId] = useState<string | null>(null);
  const [transitionSlideId, setTransitionSlideId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const selectSlideRef = useRef<(index: number) => void>(() => {});

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(collection(db, 'heroSlides'), (snapshot) => {
        setAllSlides(snapshot.docs.flatMap((document) => {
          const slide = parseHeroSlide(document.id, document.data());
          return slide ? [slide] : [];
        }));
      }, (error) => {
        console.error('Could not load the homepage hero slides.', error);
      }),
      onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
        const interval = snapshot.data()?.heroInterval;
        if (typeof interval === 'number' && Number.isFinite(interval) && interval > 0) {
          setIntervalSeconds(interval);
        } else {
          setIntervalSeconds(3);
        }
      }, (error) => {
        console.error('Could not load the homepage slideshow duration.', error);
      }),
      ...(['categories', 'subcategories', 'products'] as const).map((collectionName) => (
        onSnapshot(query(
          collection(db, collectionName),
          where('visible', '==', true),
        ), (snapshot) => {
          const items = readLinkTargets(snapshot);
          setTargets((current) => ({ ...current, [collectionName]: items }));
        }, (error) => {
          console.error(`Could not resolve hero slide ${collectionName} links.`, error);
        })
      )),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
  }, []);

  const slides = useMemo(() => {
    const configuredSlides = allSlides
      .filter((slide) => (
        slide.visible !== false
        && (slide.startAt === undefined || slide.startAt <= now)
        && (slide.endAt === undefined || slide.endAt > now)
      ))
      .sort((left, right) => (
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
        || left.id.localeCompare(right.id)
      ));
    return configuredSlides.length > 0
        ? [BRAND_INTRO_SLIDE, ...configuredSlides]
      : [];
  }, [allSlides, now]);
  const activeSlidePosition = slides.findIndex((slide) => slide.id === activeSlideId);
  const activeSlideIndex = activeSlidePosition >= 0 ? activeSlidePosition : 0;
  const activeSlide = slides[activeSlideIndex] ?? null;
  const settledSlide = slides.find((slide) => slide.id === settledSlideId) ?? activeSlide;
  const transitionSlide = slides.find((slide) => slide.id === transitionSlideId) ?? null;

  useEffect(() => {
    const boundaries = allSlides.flatMap((slide) => [
      slide.startAt,
      slide.endAt,
    ]).filter((timestamp): timestamp is number => (
      typeof timestamp === 'number' && timestamp > Date.now()
    ));
    if (boundaries.length === 0) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(50, Math.min(...boundaries) - Date.now() + 50),
    );
    return () => window.clearTimeout(timer);
  }, [allSlides, now]);

  const selectSlide = useCallback((requestedIndex: number) => {
    if (slides.length === 0) return;
    const nextIndex = (requestedIndex + slides.length) % slides.length;
    const currentSlide = slides[activeSlideIndex];
    const nextSlide = slides[nextIndex];
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    setActiveSlideId(nextSlide.id);
    if (!currentSlide || currentSlide.id === nextSlide.id || prefersReducedMotion) {
      setSettledSlideId(nextSlide.id);
      setTransitionSlideId(null);
      return;
    }

    setSettledSlideId(currentSlide.id);
    setTransitionSlideId(nextSlide.id);
    transitionTimerRef.current = window.setTimeout(() => {
      setSettledSlideId(nextSlide.id);
      setTransitionSlideId(null);
      transitionTimerRef.current = null;
    }, 1400);
  }, [activeSlideIndex, prefersReducedMotion, slides]);

  useEffect(() => {
    selectSlideRef.current = selectSlide;
  }, [selectSlide]);

  useEffect(() => {
    if (slides.length < 2) return;
    const nextSlide = slides[(activeSlideIndex + 1) % slides.length];
    if (!nextSlide || nextSlide.isBrandIntro) return;

    const desktopImage = nextSlide.useDesktopImage === false
      ? undefined
      : nextSlide.imageDesktop;
    const mobileImage = nextSlide.useMobileImage === false
      ? undefined
      : nextSlide.image;
    const source = window.matchMedia('(min-width: 768px)').matches
      ? desktopImage ?? mobileImage
      : mobileImage ?? desktopImage;
    if (!source) return;

    const preload = new window.Image();
    preload.decoding = 'async';
    preload.fetchPriority = 'high';
    preload.onerror = () => {
      console.error(`Could not preload the next homepage hero image: ${source}`);
    };
    preload.src = source;
  }, [activeSlideIndex, slides]);

  useEffect(() => {
    if (
      slides.length < 2
      || isPaused
      || prefersReducedMotion
      || transitionSlideId !== null
    ) return;
    const timer = window.setTimeout(() => {
      selectSlideRef.current(activeSlideIndex + 1);
    }, intervalSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [
    activeSlideIndex,
    intervalSeconds,
    isPaused,
    prefersReducedMotion,
    slides.length,
    transitionSlideId,
  ]);

  const moveBy = useCallback((direction: -1 | 1) => {
    selectSlide((activeSlideIndex + direction + slides.length) % slides.length);
  }, [activeSlideIndex, selectSlide, slides.length]);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (event.pointerType !== 'touch' || !start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    event.preventDefault();
    moveBy(deltaX < 0 ? 1 : -1);
  }

  if (slides.length === 0 || !activeSlide) return null;
  const activeLink = resolveSlideLink(activeSlide, targets);
  const settledLink = settledSlide ? resolveSlideLink(settledSlide, targets) : null;
  const progressStyle = { '--progress-duration': `${intervalSeconds * 1000}ms` } as CSSProperties;
  const isBrandIntro = activeSlide.isBrandIntro === true;

  return (
    <section
      className={`home-hero relative overflow-hidden bg-[#0a0a0a] text-[#f2eee6] ${isBrandIntro ? 'is-intro' : ''} ${transitionSlide ? 'is-transitioning' : ''}`}
      aria-label="Homepage slideshow"
      aria-roledescription="carousel"
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
    >
      <div className={`home-hero__scene ${settledSlide?.isBrandIntro ? 'is-intro' : ''}`}>
        {settledSlide && settledLink ? (
          <a
            className="home-hero__media-link"
            href={settledLink.url}
            target={settledLink.external ? '_blank' : undefined}
            rel={settledLink.external ? 'noopener noreferrer' : undefined}
            aria-label={settledSlide.title || settledSlide.alt || 'Open featured content'}
          >
            <div className="home-hero__slide-media">
              <SlideImage
                slide={settledSlide}
                priority={!settledSlide.isBrandIntro && activeSlideIndex === 0}
              />
            </div>
          </a>
        ) : (
          settledSlide && (
            <div className="home-hero__slide-media">
              <SlideImage
                slide={settledSlide}
                priority={!settledSlide.isBrandIntro && activeSlideIndex === 0}
              />
            </div>
          )
        )}
        <div className={`home-hero__media-shade ${settledSlide?.strongBottomShade ? 'home-hero__media-shade--strong-bottom' : ''}`} />
      </div>

      {transitionSlide && !prefersReducedMotion && (
        <>
          <svg className="home-hero__mask-defs" aria-hidden="true" focusable="false">
            <defs>
              <mask id={maskId} x="0" y="0" width="1" height="1" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
                <rect width="1" height="1" fill="black" />
                {Array.from({ length: 10 }, (_, index) => (
                  <rect
                    key={index}
                    className="home-hero__wipe-rect"
                    x={index / 10}
                    y="0"
                    width={1 / 10}
                    height="1"
                    fill="white"
                    style={{ animationDelay: `${(450 / 9) * index}ms` }}
                  />
                ))}
              </mask>
            </defs>
          </svg>
          <div
            key={transitionSlide.id}
            className="home-hero__incoming-media"
            style={{
              maskImage: `url(#${maskId})`,
              WebkitMaskImage: `url(#${maskId})`,
            }}
            aria-hidden="true"
          >
            <div className="home-hero__slide-media">
              <SlideImage slide={transitionSlide} priority />
              <div className={`home-hero__media-shade ${transitionSlide.strongBottomShade ? 'home-hero__media-shade--strong-bottom' : ''}`} />
            </div>
          </div>
        </>
      )}

      {isBrandIntro && (
        <div className="home-hero__intro-meta" aria-hidden="true">
          <p>
            SPORTSWEAR &amp;
            <br className="home-hero__mobile-break" />
            {' '}STREETWEAR MANUFACTURER
            <br />
            [SIALKOT] — [PAKISTAN]
          </p>
          <p>
            CUSTOM · PRIVATE
            <br className="home-hero__mobile-break" />
            {' '}LABEL · BULK
            <br />
            ↓ 04 STORIES
          </p>
        </div>
      )}

      <div className="home-hero__caption">
        <div className="home-hero__caption-copy">
          <span className="home-hero__counter" aria-live="polite">
            {isBrandIntro ? '00' : formatSlideNumber(activeSlideIndex)} <span>/ {String(slides.length).padStart(2, '0')}</span>
          </span>
          {activeSlide.title && (
            <span className={`home-hero__title ${isBrandIntro ? 'is-intro-title' : ''}`}>{activeSlide.title}</span>
          )}
          {activeSlide.subtitle && (
            <span className="home-hero__credit">{activeSlide.subtitle}</span>
          )}
          {activeSlide.buttonText && activeLink && (
            <a
              className="home-hero__cta"
              href={activeLink.url}
              target={activeLink.external ? '_blank' : undefined}
              rel={activeLink.external ? 'noopener noreferrer' : undefined}
            >
              {activeSlide.buttonText}
            </a>
          )}
        </div>

        <div className="home-hero__progress" role="group" aria-label="Choose featured slide">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`home-hero__progress-button ${index === activeSlideIndex ? 'is-active' : ''}`}
              aria-label={`Show slide ${formatSlideNumber(index)}${slide.title ? `: ${slide.title}` : ''}`}
              aria-current={index === activeSlideIndex ? 'true' : undefined}
              onClick={() => selectSlide(index)}
            >
              <span
                key={`${activeSlideIndex}-${isPaused}-${prefersReducedMotion}`}
                className={index === activeSlideIndex && !isPaused && !prefersReducedMotion ? 'is-running' : ''}
                style={progressStyle}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
