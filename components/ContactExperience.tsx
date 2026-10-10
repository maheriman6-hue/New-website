'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { AppShell } from '@/components/AppShell';
import { QuoteRequestModal } from '@/components/QuoteRequestModal';

const steps = Array.from({ length: 10 }, (_, index) => index);

export function ContactExperience() {
  const panelRef = useRef<HTMLElement | null>(null);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);

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
          <a className="contact-page__email" href="mailto:zateefinternational@gmail.com">
            zateefinternational@gmail.com <span aria-hidden="true">↗</span>
          </a>

          <div className="contact-page__details">
            <section className="contact-page__detail" aria-labelledby="contact-commissions">
              <h2 id="contact-commissions">ORDERS</h2>
              <p>Streetwear, sportswear, private label</p>
              <p>Reply within 24 hours</p>
            </section>
            <section className="contact-page__detail" aria-labelledby="contact-representation">
              <h2 id="contact-representation">WHATSAPP</h2>
              <p>Chat with our team for a quick quote</p>
              <a href="https://api.whatsapp.com/send/?phone=923289615985&text=Hi%2C+I+want+to+request+a+quote+for+clothing+manufacturing.&type=phone_number&app_absent=0" target="_blank" rel="noreferrer">
                +92 328 9615 985
              </a>
            </section>
            <section className="contact-page__detail" aria-labelledby="contact-studio">
              <h2 id="contact-studio">WHAT YOU GET</h2>
              <p>Samples before bulk orders</p>
              <a href="tel:+351912000000">	Tracked shipments to your door</a>
            </section>
            <section className="contact-page__detail contact-page__detail--social" aria-labelledby="contact-social">
              <h2 id="contact-social">Social</h2>
              <a href="https://www.instagram.com/zateef_international?mdxt=MW12c3M0NDIKNmVjMg==" target="_blank" rel="noreferrer">Instagram ↗</a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
            </section>
          </div>

          <div className="contact-page__actions">
            <button
              className="contact-page__button contact-page__button--dark"
              type="button"
              onClick={() => setIsQuoteOpen(true)}
            >
              Request a quote <span aria-hidden="true">↗</span>
            </button>
            <Link className="contact-page__button contact-page__button--red" href="/work">
              See what we make
            </Link>
          </div>
        </div>
      </section>
      {isQuoteOpen && <QuoteRequestModal onClose={() => setIsQuoteOpen(false)} />}
    </AppShell>
  );
}
