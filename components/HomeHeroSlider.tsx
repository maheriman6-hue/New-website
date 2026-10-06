'use client';

import Image from 'next/image';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  alt?: string;
};

const slides: Slide[] = [
  {
    title: 'Ines VARGA',
    client: 'PHOTOGRAPHER & DIRECTOR',
    category: 'LISBON — NEW YORK',
  },
  {
    title: 'Solstice',
    client: 'VOGUE ITALIA',
    category: 'FASHION — 2026',
    image: '/media/solstice.webp',
    alt: 'Fashion portrait',
  },
  {
    title: 'Lane Seven',
    client: 'KORA SWIM',
    category: 'SPORT — 2026',
    image: '/media/lane-seven.webp',
    alt: 'Swimmer moving through deep blue water',
  },
  {
    title: 'Terracotta Hour',
    client: 'MAISON ORÉ',
    category: 'STILL LIFE — 2026',
    image: '/media/terracotta-hour.webp',
    alt: 'Sculptural ceramic vessels',
  },
  {
    title: 'Drift',
    client: 'SHORT FILM',
    category: '2025',
    image: '/media/drift.webp',
    alt: 'Warm desert landscape',
  },
];

const CAPTION_LEAD = 250;
const STRIP_DURATION = 700;
const STRIP_SPAN = 1150;
const INTRO_DURATION = 2200;
const SLIDE_DURATION = 6000;
const TOTAL_STRIPS = 10;
const LITE_STRIPS = 6;

const stripIndices: Record<6 | 10, number[]> = {
  10: Array.from({ length: TOTAL_STRIPS }, (_, index) => index),
  6: Array.from({ length: LITE_STRIPS }, (_, index) => index),
};

const stripStyles: Record<6 | 10, CSSProperties[]> = {
  10: Array.from({ length: TOTAL_STRIPS }, (_, index) => ({
    left: `${index * 10}%`,
    width: '10%',
    animationDelay: `${(STRIP_SPAN - STRIP_DURATION) / (TOTAL_STRIPS - 1) * index}ms`,
  })),
  6: Array.from({ length: LITE_STRIPS }, (_, index) => ({
    left: `${(index * 100) / LITE_STRIPS}%`,
    width: `${100 / LITE_STRIPS}%`,
    animationDelay: `${(STRIP_SPAN - STRIP_DURATION) / (LITE_STRIPS - 1) * index}ms`,
  })),
};

const introProgressStyle = { '--progress-duration': `${INTRO_DURATION}ms` } as CSSProperties;
const slideProgressStyle = { '--progress-duration': `${SLIDE_DURATION}ms` } as CSSProperties;
const decodedImages = new Map<string, Promise<void>>();

function formatSlideNumber(index: number) {
  return String(index).padStart(2, '0');
}

function preloadAndDecode(slide: Slide) {
  const src = slide.image;
  if (!src) return Promise.resolve();

  const cached = decodedImages.get(src);
  if (cached) return cached;

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not preload hero image: ${src}`));
    image.src = src;
  }).then(async (image) => {
    await image.decode();
  });

  decodedImages.set(src, request);
  request.catch(() => decodedImages.delete(src));
  return request;
}

const SlideMedia = memo(function SlideMedia({
  slide,
  priority = false,
  isStrip = false,
}: {
  slide: Slide;
  priority?: boolean;
  isStrip?: boolean;
}) {
  if (slide.image) {
    return (
      <div
        className={isStrip ? 'home-hero__slide-media home-hero__slide-media--strip' : 'home-hero__slide-media'}
        data-strip-media={isStrip ? '' : undefined}
      >
        <Image
          className="home-hero__image"
          src={slide.image}
          alt={isStrip ? '' : slide.alt ?? ''}
          fill
          sizes="100vw"
          unoptimized
          loading={priority || isStrip ? 'eager' : 'lazy'}
          priority={priority}
        />
        <div className="home-hero__media-shade" />
      </div>
    );
  }

  return (
    <div
      className={isStrip ? 'home-hero__intro home-hero__intro--strip' : 'home-hero__intro'}
      aria-hidden="true"
      data-strip-media={isStrip ? '' : undefined}
    >
      <div className="home-hero__intro-name">Ines</div>
      <div className="home-hero__intro-wordmark">VARGA</div>
    </div>
  );
});

const MediaStrip = memo(function MediaStrip({
  slide,
  index,
  count,
}: {
  slide: Slide;
  index: number;
  count: 6 | 10;
}) {
  return (
    <div
      className="home-hero__strip"
      data-strip-index={index}
      data-strip-count={count}
      aria-hidden="true"
      style={stripStyles[count][index]}
    >
      <SlideMedia slide={slide} isStrip />
    </div>
  );
});

export function HomeHeroSlider() {
  const stageRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const activeIndexRef = useRef(0);
  const moveToRef = useRef<(index: number) => Promise<void>>(async () => {});
  const stageSizeRef = useRef({ width: 0, height: 0 });
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
      await preloadAndDecode(slides[nextIndex]);
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
          void preloadAndDecode(slides[followingIndex]).catch((error: unknown) => {
            console.error('Could not preload the next hero image.', error);
          });

          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setProgressRun((run) => run + 1);
            setIsAutoplayRunning(true);
            timerRef.current = window.setTimeout(() => {
              void moveToRef.current(followingIndex);
            }, nextIndex === 0 ? INTRO_DURATION : SLIDE_DURATION);
          }
        }, STRIP_SPAN);
      }, CAPTION_LEAD);
      return;
    }

    const followingIndex = (nextIndex + 1) % slides.length;
    void preloadAndDecode(slides[followingIndex]).catch((error: unknown) => {
      console.error('Could not preload the next hero image.', error);
    });
  }, [clearTimer, updateTransitionState]);
  moveToRef.current = moveTo;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      stageSizeRef.current = { width, height };
      stage.style.setProperty('--stage-w', `${width}px`);
      stage.style.setProperty('--stage-h', `${height}px`);

      stage.querySelectorAll<HTMLElement>('[data-strip-index]').forEach((strip) => {
        const index = Number(strip.dataset.stripIndex);
        const count = Number(strip.dataset.stripCount);
        strip.querySelector<HTMLElement>('[data-strip-media]')?.style.setProperty(
          '--strip-offset-x',
          `${-(width * index) / count}px`,
        );
      });
    });

    resizeObserver.observe(stage);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void preloadAndDecode(slides[1]).then(() => {
      if (cancelled) return;
      setIsAutoplayRunning(true);
      setProgressRun((run) => run + 1);
      timerRef.current = window.setTimeout(() => {
        void moveTo(1);
      }, INTRO_DURATION);
    }).catch((error: unknown) => {
      console.error('Could not preload the first hero image.', error);
    });

    return () => {
      cancelled = true;
      clearTimer();
      updateTransitionState(false);
    };
  }, [clearTimer, moveTo, updateTransitionState]);

  useLayoutEffect(() => {
    if (transitionIndex === null) return;
    const stage = stageRef.current;
    if (!stage) return;

    stage.querySelectorAll<HTMLElement>('[data-strip-index]').forEach((strip) => {
      const index = Number(strip.dataset.stripIndex);
      const count = Number(strip.dataset.stripCount);
      strip.querySelector<HTMLElement>('[data-strip-media]')?.style.setProperty(
        '--strip-offset-x',
        `${-(stageSizeRef.current.width * index) / count}px`,
      );
    });
  }, [transitionIndex, transitionStripCount]);

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
        <div
          key={transitionIndex}
          className="home-hero__strips"
          aria-hidden="true"
        >
          {stripIndices[transitionStripCount].map((index) => (
            <MediaStrip
              key={`${transitionIndex}-${index}`}
              slide={incomingSlide}
              index={index}
              count={transitionStripCount}
            />
          ))}
        </div>
      )}

      {isIntro && (
        <div className="home-hero__intro-meta" aria-hidden="true">
          <p>PHOTOGRAPHER &amp; DIRECTOR<br />LISBON — NEW YORK</p>
          <p>SELECTED WORK 2019–26<br />↓ 05 STORIES</p>
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
