'use client';

import { FirebaseError } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { auth, ownerEmail } from '@/lib/firebase';
import { getAdminSessionExpiresAt } from './adminSession';
import styles from './Admin.module.css';

type AlertState = {
  message: string;
  success: boolean;
};

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const failedAttempts = useRef(0);
  const lockTimer = useRef<number | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!active || busyRef.current || !user) return;

      void getAdminSessionExpiresAt(user).then((expiresAt) => {
        if (!active) return;
        if (expiresAt) {
          router.replace('/admin/dashboard');
          return;
        }

        setAlert({
          message: 'This account is not authorized or its session has expired. Sign in again.',
          success: false,
        });
        void signOut(auth).catch((error: unknown) => {
          if (!active) return;
          console.error('Could not clear the unauthorized admin session.', error);
          setAlert({ message: 'Could not clear the signed-in account. Please try again.', success: false });
        });
      }).catch((error: unknown) => {
        if (!active) return;
        console.error('Could not verify the admin session.', error);
        setAlert({ message: 'Could not verify your session. Please sign in again.', success: false });
        void signOut(auth).catch((signOutError: unknown) => {
          if (!active) return;
          console.error('Could not clear the unverified admin session.', signOutError);
          setAlert({ message: 'Could not clear the signed-in account. Please try again.', success: false });
        });
      });
    });

    return () => {
      active = false;
      unsubscribe();
      if (lockTimer.current !== null) window.clearInterval(lockTimer.current);
    };
  }, [router]);

  function showAlert(message: string, success = false) {
    setAlert({ message, success });
  }

  function startLockout() {
    const lockUntil = Date.now() + 30_000;
    setLockSeconds(30);
    if (lockTimer.current !== null) window.clearInterval(lockTimer.current);

    lockTimer.current = window.setInterval(() => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        if (lockTimer.current !== null) window.clearInterval(lockTimer.current);
        lockTimer.current = null;
        failedAttempts.current = 0;
        setLockSeconds(0);
        setAlert(null);
        return;
      }
      setLockSeconds(remaining);
    }, 500);

    showAlert('Too many failed attempts. Please wait 30 seconds.');
  }

  function recordFailedAttempt(message = 'Email or password is incorrect.') {
    failedAttempts.current += 1;
    setPassword('');
    showAlert(message);
    if (failedAttempts.current >= 5) startLockout();
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current || lockSeconds > 0) return;

    setAlert(null);
    setEmailInvalid(false);
    setPasswordInvalid(false);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setEmailInvalid(true);
      showAlert('Enter the owner email.');
      document.getElementById('admin-email')?.focus();
      return;
    }

    if (!password) {
      setPasswordInvalid(true);
      showAlert('Enter your password.');
      document.getElementById('admin-password')?.focus();
      return;
    }

    if (!ownerEmail) {
      showAlert('Admin login is not configured. Set NEXT_PUBLIC_OWNER_EMAIL.');
      return;
    }

    if (normalizedEmail.toLowerCase() !== ownerEmail) {
      recordFailedAttempt();
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const expiresAt = await getAdminSessionExpiresAt(credential.user);
      if (!expiresAt) {
        await signOut(auth);
        busyRef.current = false;
        setBusy(false);
        showAlert(
          'This account is not authorized.',
        );
        return;
      }
      router.replace('/admin/dashboard');
    } catch (error) {
      busyRef.current = false;
      setBusy(false);
      setPassword('');

      if (error instanceof FirebaseError && error.code === 'auth/network-request-failed') {
        showAlert('Can’t reach the server. Check your internet connection.');
        return;
      }
      if (error instanceof FirebaseError && error.code === 'auth/too-many-requests') {
        showAlert('Too many attempts. Wait a few minutes or reset your password.');
        return;
      }

      recordFailedAttempt();
    }
  }

  async function handlePasswordReset() {
    setAlert(null);
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      showAlert('Enter the owner email above, then select Forgot password.');
      document.getElementById('admin-email')?.focus();
      return;
    }

    if (normalizedEmail.toLowerCase() === ownerEmail && ownerEmail) {
      try {
        await sendPasswordResetEmail(auth, normalizedEmail);
      } catch (error) {
        console.error('Password reset request failed.', error);
      }
    }

    showAlert(
      'If this is the owner email, a reset link is on its way. Check your inbox and spam folder.',
      true,
    );
  }

  const buttonText = busy
    ? 'Signing in…'
    : lockSeconds > 0
      ? `Try again in ${lockSeconds}s`
      : 'Sign in';

  return (
    <main className={styles.loginScreen}>
      <section className={styles.card} aria-labelledby="admin-login-title">
        <header className={styles.loginHead}>
          <div className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className={styles.loginTitle} id="admin-login-title">Owner sign in</h1>
          <p className={styles.loginSubtitle}>Sign in to manage your website’s content.</p>
        </header>

        {alert && (
          <div
            className={`${styles.alert} ${styles.alertVisible} ${alert.success ? styles.alertSuccess : ''}`}
            role="alert"
            aria-live="polite"
          >
            <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{alert.message}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} noValidate>
          <div className={styles.loginField}>
            <svg className={styles.leadingIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
            <input
              id="admin-email"
              className={styles.textInput}
              type="email"
              aria-label="Email"
              aria-invalid={emailInvalid || undefined}
              autoComplete="username"
              placeholder="Email"
              inputMode="email"
              spellCheck={false}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailInvalid(false);
                if (lockSeconds === 0) setAlert(null);
              }}
            />
          </div>

          <div className={`${styles.loginField} ${styles.passwordField}`}>
            <svg className={styles.leadingIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              id="admin-password"
              className={styles.textInput}
              type={showPassword ? 'text' : 'password'}
              aria-label="Password"
              aria-invalid={passwordInvalid || undefined}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordInvalid(false);
                if (lockSeconds === 0) setAlert(null);
              }}
            />
            <button
              className={styles.passwordToggle}
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? (
                <svg id="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg id="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <div className={styles.loginRow}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Keep me signed in (up to 1 hour)
            </label>
            <button className={styles.linkButton} type="button" onClick={handlePasswordReset}>
              Forgot password?
            </button>
          </div>

          <button
            className={`${styles.primaryButton} ${busy ? styles.loadingButton : ''}`}
            type="submit"
            disabled={busy || lockSeconds > 0}
          >
            <span className={styles.spinner} aria-hidden="true" />
            <span>{buttonText}</span>
          </button>
        </form>
      </section>

      <p className={styles.note}>
        <strong>Private area.</strong> Only the website owner can sign in. There is no sign-up.
      </p>
    </main>
  );
}
