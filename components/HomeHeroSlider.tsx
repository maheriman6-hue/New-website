'use client';

import { getImageProps } from 'next/image';
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';

type Slide = {
  title: string;
  client: string;
  category: string;
  image?: string;
  mobileImage?: string;
  imageSizes?: string;
  alt?: string;
  imagePosition?: CSSProperties['objectPosition'];
  strongBottomShade?: boolean;
};

const slides: Slide[] = [
  {
    title: 'ZATEEF International',
    client: 'SPORTSWEAR & STREETWEAR MANUFACTURER',
    category: '[SIALKOT] — [PAKISTAN]',
  },
  {
    title: 'Built to Move',
    client: 'SPORTSWEAR',
    category: 'PERFORMANCE FABRICS — 2026',
    image: '/media/sportswear-hero.jpg',
    mobileImage: '/media/mobile/sportswear-m.jpg',
    imageSizes: 'max(100vw, 227vh)',
    alt: 'Man and woman wearing black performance sportswear',
  },
  {
    title: 'Street Ready',
    client: 'STREETWEAR',
    category: 'HOODIES & CARGOS — 2026',
    image: '/media/streetwear-hero.jpg',
    mobileImage: '/media/mobile/streetwear-m.jpg',
    imageSizes: 'max(100vw, 227vh)',
    alt: 'Man in a black hoodie and cargo pants against a concrete wall',
  },
  {
    title: 'Stitch by Stitch',
    client: 'IN-HOUSE PRODUCTION',
    category: 'SAMPLE TO BULK',
    image: '/media/stiching.webp',
    mobileImage: '/media/mobile/stitching-m.jpg',
    imageSizes: 'max(100vw, 178vh)',
    alt: 'Close-up of hands stitching black sportswear fabric on an industrial sewing machine',
  },
  {
    title: 'Ready to Ship',
    client: 'PACKING',
    category: 'GLOBAL DELIVERY — 2026',
    image: '/media/zateef-delivery.webp',
    mobileImage: '/media/mobile/delivery-m.jpg',
    imageSizes: 'max(100vw, 178vh)',
    alt: 'Black Zateef International shipping boxes, an open box with a packed black hoodie, a checklist and a thank-you card on a wooden table',
    imagePosition: '58% 0%',
    strongBottomShade: true,
  },
];

const CAPTION_LEAD = 250;
const STRIP_DURATION = 700;
const STRIP_SPAN = 1150;
const SLIDE_DURATION = 2000;
const INTRO_DURATION = SLIDE_DURATION;
const TOTAL_STRIPS = 10;
const LITE_STRIPS = 6;
const IMAGE_PRELOAD_ATTEMPTS = 3;
const MOBILE_PORTRAIT_QUERY = '(max-width: 767px) and (orientation: portrait)';

const introProgressStyle = { '--progress-duration': `${INTRO_DURATION}ms` } as CSSProperties;
const slideProgressStyle = { '--progress-duration': `${SLIDE_DURATION}ms` } as CSSProperties;
const preloadedImages = new Map<string, Promise<void>>();
const MASK_STRIP_INDICES = {
  10: Array.from({ length: TOTAL_STRIPS }, (_, index) => index),
  6: Array.from({ length: LITE_STRIPS }, (_, index) => index),
} satisfies Record<6 | 10, number[]>;

function formatSlideNumber(index: number) {
  return String(index).padStart(2, '0');
}

function formatAnimationDelay(index: number, count: 6 | 10) {
  return `${((STRIP_SPAN - STRIP_DURATION) / (count - 1)) * index}ms`;
}

function getDesktopImageProps(slide: Slide) {
  if (!slide.image) return null;

  return getImageProps({
    src: slide.image,
    alt: slide.alt ?? '',
    fill: true,
    sizes: slide.imageSizes ?? '100vw',
    quality: 90,
  }).props;
}

async function loadImage(slide: Slide, attempt = 1): Promise<void> {
  const isMobilePortrait = window.matchMedia(MOBILE_PORTRAIT_QUERY).matches;
  const imageProps = getDesktopImageProps(slide);
  const src = isMobilePortrait && slide.mobileImage
    ? slide.mobileImage
    : imageProps?.src;
  if (!src || !imageProps) return;

  try {
    await new Promise<HTMLImageElement>((resolve, reject) => {
      const preloadedImage = new window.Image();
      preloadedImage.decoding = 'async';
      preloadedImage.onload = () => {
        void preloadedImage.decode().then(() => resolve(preloadedImage), reject);
      };
      preloadedImage.onerror = () => reject(new Error(`Could not load hero image: ${src}`));
      if (isMobilePortrait) {
        preloadedImage.src = src;
      } else {
        preloadedImage.sizes = imageProps.sizes ?? '100vw';
        if (imageProps.srcSet) preloadedImage.srcset = imageProps.srcSet;
        preloadedImage.src = src;
      }
    });
  } catch (error) {
    if (attempt >= IMAGE_PRELOAD_ATTEMPTS) {
      throw new Error(`Could not preload hero image after ${attempt} attempts: ${src}`, { cause: error });
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, attempt * 300);
    });
    return loadImage(slide, attempt + 1);
  }
}

function preloadImage(slide: Slide) {
  if (!slide.image) return Promise.resolve();

  const cacheKey = [
    slide.image,
    window.matchMedia(MOBILE_PORTRAIT_QUERY).matches ? 'mobile' : 'desktop',
    `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
  ].join('|');
  const cached = preloadedImages.get(cacheKey);
  if (cached) return cached;

  const request = loadImage(slide);

  preloadedImages.set(cacheKey, request);
  request.catch(() => preloadedImages.delete(cacheKey));
  return request;
}

const SlideMedia = memo(function SlideMedia({
  slide,
  priority = false,
}: {
  slide: Slide;
  priority?: boolean;
}) {
  if (slide.image) {
    const imageProps = getDesktopImageProps(slide);
    if (!imageProps) return null;

    return (
      <div className="home-hero__slide-media">
        <picture className="home-hero__picture">
          {slide.mobileImage && (
            <source
              media={MOBILE_PORTRAIT_QUERY}
              srcSet={slide.mobileImage}
              sizes="100vw"
            />
          )}
          <img
            {...imageProps}
            className="home-hero__image"
            alt={slide.alt ?? ''}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            style={{
              ...imageProps.style,
              '--hero-image-position': slide.imagePosition ?? 'center',
            } as CSSProperties}
          />
        </picture>
        <div className={['home-hero__media-shade', slide.strongBottomShade ? 'home-hero__media-shade--strong-bottom' : ''].join(' ')} />
      </div>
    );
  }

  return (
    <div className="home-hero__intro" aria-hidden="true">
      <div className="home-hero__intro-name">Zateef</div>
      <div className="home-hero__intro-wordmark">International</div>
    </div>
  );
});

export function HomeHeroSlider() {
  const maskId = `hero-strip-mask-${useId().replaceAll(':', '')}`;
  const stageRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const activeIndexRef = useRef(0);
  const moveToRef = useRef<(index: number) => Promise<void>>(async () => {});
  const [activeIndex, setActiveIndex] = useState(0);
  const [settledIndex, setSettledIndex] = useState(0);
  const [transitionIndex, setTransitionIndex] = useState<number | null>(null);
  const [transitionStripCount, setTransitionStripCount] = useState<6 | 10>(TOTAL_STRIPS);
  const [isAutoplayRunning, setIsAutoplayRunning] = useState(false);
  const [progressRun, setProgressRun] = useState(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateTransitionState = useCallback((isActive: boolean) => {
    if (isActive) {
      document.documentElement.dataset.heroTransition = 'true';
      document.dispatchEvent(new Event('hero:transition-start'));
    } else {
      delete document.documentElement.dataset.heroTransition;
    }
  }, []);

  const moveTo = useCallback(async (nextIndex: number) => {
    if (isTransitioningRef.current || nextIndex === activeIndexRef.current) return;

    clearTimer();
    isTransitioningRef.current = true;
    setIsAutoplayRunning(false);
    updateTransitionState(true);

    try {
      await preloadImage(slides[nextIndex]);
    } catch (error) {
      console.error('Hero slide transition was cancelled because its image could not be decoded.', error);
      isTransitioningRef.current = false;
      updateTransitionState(false);
      return;
    }

    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    const count: 6 | 10 = document.documentElement.dataset.perf === 'lite' ? LITE_STRIPS : TOTAL_STRIPS;
    setTransitionStripCount(count);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setSettledIndex(nextIndex);
      isTransitioningRef.current = false;
      updateTransitionState(false);
      const followingIndex = (nextIndex + 1) % slides.length;
      setProgressRun((run) => run + 1);
      setIsAutoplayRunning(true);
      timerRef.current = window.setTimeout(() => {
        void moveToRef.current(followingIndex);
      }, nextIndex === 0 ? INTRO_DURATION : SLIDE_DURATION);
    } else {
      timerRef.current = window.setTimeout(() => {
        setTransitionIndex(nextIndex);
        timerRef.current = window.setTimeout(() => {
          setSettledIndex(nextIndex);
          setTransitionIndex(null);
          isTransitioningRef.current = false;
          updateTransitionState(false);
          timerRef.current = null;

          const followingIndex = (nextIndex + 1) % slides.length;
          void preloadImage(slides[followingIndex]).catch((error: unknown) => {
            console.error('Could not preload the next hero image.', error);
          });

          setProgressRun((run) => run + 1);
          setIsAutoplayRunning(true);
          timerRef.current = window.setTimeout(() => {
            void moveToRef.current(followingIndex);
          }, nextIndex === 0 ? INTRO_DURATION : SLIDE_DURATION);
        }, STRIP_SPAN);
      }, CAPTION_LEAD);
      return;
    }

    const followingIndex = (nextIndex + 1) % slides.length;
    void preloadImage(slides[followingIndex]).catch((error: unknown) => {
      console.error('Could not preload the next hero image.', error);
    });
  }, [clearTimer, updateTransitionState]);
  useEffect(() => {
    moveToRef.current = moveTo;
  }, [moveTo]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      stage.style.setProperty('--stage-w', `${width}px`);
      stage.style.setProperty('--stage-h', `${height}px`);
    });

    resizeObserver.observe(stage);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void preloadImage(slides[1]).then(() => {
      if (cancelled) return;
      setIsAutoplayRunning(true);
      setProgressRun((run) => run + 1);
      timerRef.current = window.setTimeout(() => {
        void moveTo(1);
      }, INTRO_DURATION);
    }).catch((error: unknown) => {
      console.error('Could not preload the first hero image.', error);
    });

    const idlePreloadTimer = window.setTimeout(() => {
      if (cancelled) return;
      void Promise.all(slides.slice(2).map((slide) => preloadImage(slide))).catch((error: unknown) => {
        console.error('Could not preload all hero slides.', error);
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(idlePreloadTimer);
      clearTimer();
      updateTransitionState(false);
    };
  }, [clearTimer, moveTo, updateTransitionState]);

  const activeSlide = slides[activeIndex];
  const settledSlide = slides[settledIndex];
  const isIntro = activeIndex === 0;
  const incomingSlide = transitionIndex === null ? null : slides[transitionIndex];

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    pointerStartRef.current = event.clientX;
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (pointerStartRef.current === null) return;
    const delta = event.clientX - pointerStartRef.current;
    pointerStartRef.current = null;
    if (Math.abs(delta) < 48) return;
    const direction = delta < 0 ? 1 : -1;
    void moveTo((activeIndexRef.current + direction + slides.length) % slides.length);
  };

  return (
    <section
      ref={stageRef}
      className={['home-hero relative overflow-hidden bg-[#0a0a0a] text-[#f2eee6]', isIntro ? 'is-intro' : ''].join(' ')}
      aria-label="Featured work"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
    >
      <div className={['home-hero__scene', settledSlide.image ? '' : 'is-intro'].join(' ')}>
        <SlideMedia slide={settledSlide} priority={settledIndex === 1} />
      </div>

      {incomingSlide && (
        <>
          <svg className="home-hero__mask-defs" aria-hidden="true" focusable="false">
            <defs>
              <mask id={maskId} x="0" y="0" width="1" height="1" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
                <rect width="1" height="1" fill="black" />
                {MASK_STRIP_INDICES[transitionStripCount].map((index) => (
                  <rect
                    key={index}
                    className="home-hero__wipe-rect"
                    x={index / transitionStripCount}
                    y="0"
                    width={1 / transitionStripCount}
                    height="1"
                    fill="white"
                    style={{ animationDelay: formatAnimationDelay(index, transitionStripCount) }}
                  />
                ))}
              </mask>
            </defs>
          </svg>
          <div
            key={transitionIndex}
            className="home-hero__incoming-media"
            style={{
              maskImage: `url(#${maskId})`,
              WebkitMaskImage: `url(#${maskId})`,
            }}
            aria-hidden="true"
          >
            <SlideMedia slide={incomingSlide} priority />
          </div>
        </>
      )}

      {isIntro && (
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
            {formatSlideNumber(activeIndex)} <span>/ 05</span>
          </span>
          <span className={['home-hero__title', isIntro ? 'is-intro-title' : ''].join(' ')}>
            {activeSlide.title}
          </span>
          {!isIntro && (
            <span className="home-hero__credit">
              {activeSlide.client} — {activeSlide.category}
            </span>
          )}
          {isIntro && <span className="home-hero__drag-hint">DRAG OR SWIPE TO TURN</span>}
        </div>

        <div className="home-hero__progress" role="group" aria-label="Choose featured slide">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              className={['home-hero__progress-button', index === activeIndex ? 'is-active' : ''].join(' ')}
              aria-label={`Show slide ${formatSlideNumber(index)}: ${slide.title}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => { void moveTo(index); }}
            >
              <span
                key={`${activeIndex}-${progressRun}`}
                className={index === activeIndex && isAutoplayRunning ? 'is-running' : ''}
                style={index === 0 ? introProgressStyle : slideProgressStyle}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
