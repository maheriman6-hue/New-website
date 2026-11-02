'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { WHATSAPP_NUMBER } from '@/lib/contactLinks';

const QUICK_REPLIES = [
  {
    label: 'Request a quote',
    message: "Hi, I'd like to request a quote for clothing manufacturing.",
  },
  {
    label: 'Ask about samples',
    message: "Hi, I'd like to ask about samples before a bulk order.",
  },
  {
    label: 'Minimum order',
    message: 'Hi, what is your minimum order quantity?',
  },
  {
    label: 'Private label',
    message: "Hi, I'm interested in private label manufacturing.",
  },
];

const MAX_MESSAGE_LENGTH = 500;

export function WhatsAppChat() {
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previousPathRef = useRef(pathname);
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncDialogState = () => {
      const dialogOpen = document.querySelector('dialog[open]') !== null;
      setIsDialogOpen(dialogOpen);
      if (dialogOpen) setIsOpen(false);
    };

    syncDialogState();
    const observer = new MutationObserver(syncDialogState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['open'],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (panelRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setIsOpen(false);
      window.setTimeout(() => {
        if (!document.querySelector('dialog[open]')) buttonRef.current?.focus();
      }, 0);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) textareaRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    if (!isOpen) return;
    // A route change closes the non-modal panel and restores its trigger focus.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The root widget must close when navigation changes its route.
    setIsOpen(false);
    buttonRef.current?.focus();
  }, [pathname, isOpen]);

  const hasMessage = message.trim().length > 0;
  const whatsappMessage = (hasMessage ? message : QUICK_REPLIES[0].message)
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
  const isVisible = isReady && !isDialogOpen;

  return (
    <div
      className={`whatsapp-chat${isReady ? ' is-ready' : ''}${isVisible ? ' is-visible' : ''}`}
    >
      <button
        ref={buttonRef}
        className="whatsapp-chat__trigger"
        type="button"
        aria-label="Chat on WhatsApp"
        aria-expanded={isOpen}
        aria-controls={panelId}
        title="Chat with us"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Image
          src="/media/whatsapp-icon.png"
          alt=""
          width={56}
          height={56}
        />
      </button>

      <section
        ref={panelRef}
        id={panelId}
        className={`whatsapp-chat__panel${isOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-label="Chat on WhatsApp"
        aria-hidden={!isOpen}
        inert={!isOpen}
        onWheel={(event) => event.stopPropagation()}
      >
        <header className="whatsapp-chat__header">
          <div>
            <p className="whatsapp-chat__eyebrow">ZATEEF INTERNATIONAL</p>
            <p className="whatsapp-chat__availability">Typically replies within 24 hours</p>
          </div>
          <button
            className="whatsapp-chat__close"
            type="button"
            aria-label="Close WhatsApp chat"
            onClick={() => {
              setIsOpen(false);
              buttonRef.current?.focus();
            }}
          >
            ×
          </button>
        </header>

        <p className="whatsapp-chat__greeting">
          Hi! Tell us what you want to make, sportswear or streetwear, and we&apos;ll continue on WhatsApp.
        </p>

        <div className="whatsapp-chat__replies" aria-label="Quick replies">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply.label}
              className="whatsapp-chat__reply"
              type="button"
              onClick={() => setMessage(reply.message)}
            >
              {reply.label}
            </button>
          ))}
        </div>

        <label className="whatsapp-chat__message-label" htmlFor={`${panelId}-message`}>
          Your message
        </label>
        <textarea
          ref={textareaRef}
          id={`${panelId}-message`}
          className="whatsapp-chat__message"
          rows={3}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Type your message..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />

        <a
          className="whatsapp-chat__continue"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Continue on WhatsApp ↗
        </a>
        <p className="whatsapp-chat__note">
          This opens WhatsApp with your message ready to send.
        </p>
      </section>
    </div>
  );
}
