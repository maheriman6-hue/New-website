import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import type { ReactNode } from 'react';
import styles from '@/components/admin/Admin.module.css';

const sora = Sora({
  variable: '--font-admin-sora',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Admin Console',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={`${styles.adminRoot} ${sora.variable}`}>{children}</div>;
}
