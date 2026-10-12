import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

export const ENTRANCE_EASE = 'intro-premium';
export const ENTRANCE_EASE_PATH = 'M0,0 C0.22,1 0.36,1 1,1';

export const ENTRANCE_TIMING = {
  desktopThreshold: 0.25,
  mobileThreshold: 0.15,
  lineStart: 0.1,
  lineStagger: 0.09,
  labelDuration: 0.7,
  labelOffset: 12,
  yearDuration: 1.4,
  wordDuration: 0.9,
  chipStartOffset: 0.25,
  chipDuration: 0.8,
  accentStartOffset: 0.4,
  accentDuration: 0.6,
  paragraphStart: 0.9,
  paragraphDuration: 0.8,
  linkStart: 1.1,
  linkDuration: 0.7,
  underlineStart: 1.4,
  underlineDuration: 0.5,
};

export type EntranceTriggerTiming = {
  desktopThreshold: number;
  mobileThreshold: number;
};

type EntranceTimelineOptions = {
  onComplete?: () => void;
  willChange?: string;
};

export function registerEntranceEase() {
  gsap.registerPlugin(CustomEase);
  CustomEase.create(ENTRANCE_EASE, ENTRANCE_EASE_PATH);
}

export function createEntranceTimeline(
  elements: HTMLElement[],
  { onComplete, willChange = 'transform, opacity, clip-path, color' }: EntranceTimelineOptions = {},
) {
  return gsap.timeline({
    paused: true,
    onStart: () => gsap.set(elements, { willChange }),
    onComplete: () => {
      gsap.set(elements, { clearProps: 'willChange' });
      onComplete?.();
    },
  });
}

export function observeEntranceOnce(
  target: HTMLElement,
  timing: EntranceTriggerTiming,
  onEnter: () => void,
) {
  const threshold = window.matchMedia('(max-width: 640px)').matches
    ? timing.mobileThreshold
    : timing.desktopThreshold;
  let hasEntered = false;
  const enter = () => {
    if (hasEntered) return;
    hasEntered = true;
    observer.disconnect();
    onEnter();
  };
  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && entry.intersectionRatio >= threshold) enter();
  }, { threshold });

  observer.observe(target);
  const bounds = target.getBoundingClientRect();
  const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
  if (visibleHeight / bounds.height >= threshold) enter();

  return () => observer.disconnect();
}
