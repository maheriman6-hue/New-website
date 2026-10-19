'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function AppShell({
  children,
  heroTone = 'dark',
  overlayHeader = false,
}: {
  children: React.ReactNode;
  heroTone?: 'dark' | 'light';
  overlayHeader?: boolean;
}) {
  const pathname = usePathname();
  const footerRef = useRef<HTMLElement | null>(null);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setFooterVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.15 });

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f2eee6]">
      <header className={[
        'site-header sticky top-0 z-30 flex items-start justify-between px-4 pt-4 sm:px-6 lg:px-7',
        overlayHeader ? 'site-header--overlay' : '',
        pathname === '/contact' ? 'contact-header' : '',
      ].join(' ')}>
        <Link href="/" className="brand-pill" aria-label="Zateef International home">
          <Image
            src="/images/zateef-z-logo.png"
            alt=""
            width={26}
            height={32}
            priority
          />
        </Link>

        <nav
          className={[
            'app-nav-pill mt-0 flex items-center rounded-full border px-3 py-2 shadow-soft backdrop-blur-[2px]',
            heroTone === 'light' && pathname !== '/contact'
              ? 'border-black/10 bg-[rgba(255,255,255,0.22)]'
              : 'border-white/10 bg-[rgba(22,22,22,0.40)]',
          ].join(' ')}
        >
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href === '/work' && pathname.startsWith('/work'));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'relative px-3 py-1 text-[15px] font-medium transition-opacity',
                  active ? 'text-[#f6f2ea]' : 'text-[#f6f2ea]/90',
                ].join(' ')}
              >
                <span className="relative z-10">{item.label}</span>
                {active && <span className="absolute inset-x-1 -bottom-1 h-[1px] bg-[#f2eee6]" />}
              </Link>
            );
          })}
        </nav>
      </header>

      <main>{children}</main>

      <footer
        ref={footerRef}
        className={[
          'footer-motion relative z-20 border-t border-[#e8261a] bg-[#0a0a0a] px-4 pb-8 pt-5 sm:px-6 lg:px-7',
          pathname === '/contact' ? 'contact-footer' : '',
          footerVisible ? 'is-in-view' : '',
        ].join(' ')}
      >
        <div className="footer-motion__rule" />

        <div className="grid grid-cols-2 items-start gap-x-4 gap-y-7 pt-6 sm:grid-cols-3 sm:gap-x-8 lg:gap-8">
          <div className="min-w-0">
            <div className="mb-6 space-y-3 text-[15px]">
              <Link href="/work" className="block text-[#f5f1ea]">Work</Link>
              <Link href="/about" className="block text-[#f5f1ea]">About</Link>
              <Link href="/contact" className="block text-[#f5f1ea]">Contact</Link>
            </div>

            <div className="space-y-2 text-[12px] uppercase tracking-[0.08em] text-[#f5f1ea]/75">
              <div className="font-mono">Based in</div>
              <div className="font-mono">Sialkot</div>
              <div className="font-mono">Pakistan</div>
            </div>
          </div>

          <div className="col-start-1 row-start-2 flex min-w-0 flex-col gap-2.5 text-[15px] leading-relaxed text-[#f5f1ea] sm:col-start-auto sm:row-start-auto sm:text-[17px]">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f5f1ea]/75">Social</div>
            <div><a href="https://www.instagram.com/zateef_international?mdxt=MW12c3MONDIKNmVjMg==" target='_blank' rel="noopener noreferrer">Instagram</a></div>
            <div>LinkedIn</div>
          </div>

          <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-2.5 text-[15px] leading-relaxed text-[#f5f1ea] sm:col-start-auto sm:row-start-auto sm:text-[17px]">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f5f1ea]/75">Contact</div>
            <a className="break-words" href="mailto:zateefinternational@gmail.com">zateefinternational@gmail.com</a>
            <div><a href="https://api.whatsapp.com/send/?phone=923289615985&text=Hi%2C+I+want+to+request+a+quote+for+clothing+manufacturing.&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer">+92 328 9615 985</a></div>
          </div>
        </div>

        <div className="footer-motion__wordmark mt-8 text-center text-[clamp(5rem,17vw,24rem)] font-display tracking-wide font-black uppercase leading-[0.8] tracking-[-0.08em] text-[#f2eee6]">
          ZATEEF
          <div className="text-[clamp(1.5rem,4vw,2.5rem)] font-mono tracking-[0.18em] text-[#f2eee6]/75">
          INTERNATIONAL
          </div>
        </div>

      </footer>
    </div>
  );
}
