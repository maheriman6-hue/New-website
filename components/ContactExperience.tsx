'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { AppShell } from '@/components/AppShell';

const steps = Array.from({ length: 10 }, (_, index) => index);

export function ContactExperience() {
  const panelRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const shutters = panel.querySelectorAll<HTMLElement>('.contact-page__shutter');
    const content = panel.querySelectorAll<HTMLElement>('.contact-page__content > *');
    const context = gsap.context(() => {
      gsap.set(shutters, { scaleY: 1, transformOrigin: 'center top' });
      gsap.set(content, { y: 18, opacity: 0 });

      const timeline = gsap.timeline({
        onStart: () => shutters.forEach((shutter) => { shutter.style.willChange = 'transform'; }),
        onComplete: () => shutters.forEach((shutter) => { shutter.style.willChange = 'auto'; }),
      });

      timeline
        .to(shutters, {
          scaleY: 0,
          duration: 0.72,
          stagger: 0.075,
          ease: 'power3.inOut',
        })
        .to(content, {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: 'power3.out',
        }, '-=0.35');
    }, panel);

    return () => context.revert();
  }, []);

  return (
    <AppShell heroTone="light" overlayHeader>
      <section ref={panelRef} className="contact-page" aria-labelledby="contact-heading">
        <div className="contact-page__shutters" aria-hidden="true">
          {steps.map((step) => <span className="contact-page__shutter" key={step} />)}
        </div>
        <div className="contact-page__content">
          <p className="contact-page__eyebrow">(CONTACT) — COMMISSIONS OPEN FROM OCT 2026</p>
          <h1 id="contact-heading" className="contact-page__title">SAY</h1>
          <a className="contact-page__email" href="mailto:hello@inesvarga.studio">
            hello@inesvarga.studio <span aria-hidden="true">↗</span>
          </a>

          <div className="contact-page__details">
            <section className="contact-page__detail" aria-labelledby="contact-commissions">
              <h2 id="contact-commissions">Commissions</h2>
              <p>Campaign, editorial, film</p>
              <p>Reply within 48 hours</p>
            </section>
            <section className="contact-page__detail" aria-labelledby="contact-representation">
              <h2 id="contact-representation">Representation</h2>
              <p>Atelier Nord — Paris</p>
              <a href="mailto:agent@ateliernord.fr">agent@ateliernord.fr</a>
            </section>
            <section className="contact-page__detail" aria-labelledby="contact-studio">
              <h2 id="contact-studio">Studio</h2>
              <p>Rua da Rosa 42, Lisbon</p>
              <a href="tel:+351912000000">+351 912 000 000</a>
            </section>
            <section className="contact-page__detail contact-page__detail--social" aria-labelledby="contact-social">
              <h2 id="contact-social">Social</h2>
              <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram ↗</a>
              <a href="https://vimeo.com/" target="_blank" rel="noreferrer">Vimeo ↗</a>
            </section>
          </div>

          <div className="contact-page__actions">
            <a
              className="contact-page__button contact-page__button--dark"
              href="mailto:hello@inesvarga.studio?subject=Commission%20inquiry"
            >
              Start a commission <span aria-hidden="true">↗</span>
            </a>
            <Link className="contact-page__button contact-page__button--red" href="/work">
              See the work first
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
