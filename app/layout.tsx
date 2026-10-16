import './globals.css';
import type { Metadata } from 'next';
import { Bebas_Neue, Cormorant_Garamond, IBM_Plex_Mono, Inter } from 'next/font/google';
import Script from 'next/script';
import { RouteTransition } from '@/components/RouteTransition';
import { PerformanceRuntime } from '@/components/PerformanceRuntime';

const display = Bebas_Neue({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const serif = Cormorant_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const sans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Varga',
  description: 'Creative portfolio foundation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${display.variable} ${serif.variable} ${mono.variable} ${sans.variable}`}>
        <Script id="contact-entrance-bootstrap" strategy="beforeInteractive">
          {`if (window.location.pathname.replace(/\\/+$/, '') === '/contact') {
            document.documentElement.dataset.contactAnimation = 'pending';
            window.setTimeout(function () {
              if (document.documentElement.dataset.contactAnimation === 'pending') {
                delete document.documentElement.dataset.contactAnimation;
              }
            }, 15000);
          }`}
        </Script>
        <PerformanceRuntime />
        <RouteTransition />
        {children}
      </body>
    </html>
  );
}
