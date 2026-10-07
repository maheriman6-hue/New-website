'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function RouteTransition() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [run, setRun] = useState(0);
  const timers = useRef<number[]>([]);
  const isTransitioning = useRef(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target || link.hasAttribute('download')) return;

      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname && destination.search === window.location.search)
      ) return;

      event.preventDefault();
      if (isTransitioning.current) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        router.push(`${destination.pathname}${destination.search}${destination.hash}`);
        return;
      }

      isTransitioning.current = true;
      setRun((current) => current + 1);
      setIsVisible(true);
      timers.current.push(window.setTimeout(() => {
        router.push(`${destination.pathname}${destination.search}${destination.hash}`);
      }, 520));
      timers.current.push(window.setTimeout(() => {
        setIsVisible(false);
        isTransitioning.current = false;
        timers.current = [];
      }, 2300));
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [router]);

  return (
    <div
      className={['route-transition', isVisible ? 'is-visible' : ''].join(' ')}
      aria-hidden="true"
    >
      <div key={run} className="route-transition__sequence">
        <div className="route-transition__red" />
        <div className="route-transition__black" />
        <div className="route-transition__bar" />
        <div className="route-transition__wordmark">
          <span className="route-transition__name">ZATEEF</span>
          <span className="route-transition__descriptor">INTERNATIONAL</span>
        </div>
      </div>
    </div>
  );
}
