'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export function Cursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [label, setLabel] = useState('');
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const moveX = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3.out' });
    const moveY = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3.out' });

    const onMove = (event: MouseEvent) => {
      moveX(event.clientX);
      moveY(event.clientY);
    };

    const onEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const toggle = target?.closest('a, button, [data-cursor-label]');
      if (!toggle) return;

      const custom = toggle.getAttribute('data-cursor-label') ?? 'View ↗';
      setLabel(custom);
      setIsHovering(true);
    };

    const onLeave = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('a, button, [data-cursor-label]')) return;
      setLabel('');
      setIsHovering(false);
    };

    const onDown = () => setIsPressed(true);
    const onUp = () => setIsPressed(false);

    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerover', onEnter);
    document.addEventListener('pointerout', onLeave);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onEnter);
      document.removeEventListener('pointerout', onLeave);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      gsap.killTweensOf(cursor);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[80] hidden md:block">
      <div
        ref={cursorRef}
        className={[
          'cursor-core',
          isHovering ? 'is-hovering' : '',
          isPressed ? 'is-pressed' : '',
        ].join(' ')}
      >
        <span>{label || ' '}</span>
      </div>
    </div>
  );
}
