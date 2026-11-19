'use client';

import dynamic from 'next/dynamic';
import styles from './Admin.module.css';

function LoadingScreen() {
  return <div className={styles.dashboardLoading} aria-label="Loading admin" />;
}

const AdminLogin = dynamic(() => import('./AdminLogin'), {
  ssr: false,
  loading: LoadingScreen,
});

const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  ssr: false,
  loading: LoadingScreen,
});

export function AdminLoginRoute() {
  return <AdminLogin />;
}

export function AdminDashboardRoute() {
  return <AdminDashboard />;
}
