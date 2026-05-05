'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './auth.module.css';
import Header from '@/components/shared/Header';
import { useAuth } from '@/context/AuthContext';

function mapAuthError(error) {
  const message = error?.message || '';
  if (message.includes('INVALID_CREDENTIALS')) {
    return 'Invalid email or password.';
  }
  if (message.includes('EMAIL_ALREADY_EXISTS')) {
    return 'This email is already registered.';
  }
  return 'Something went wrong. Please try again.';
}

export default function AuthPage() {
  const router = useRouter();
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === 'signup';

  const title = useMemo(() => (isSignUp ? 'Create Account' : 'Login'), [isSignUp]);

  const resetFeedback = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const validateForm = () => {
    if (isSignUp && !name.trim()) return 'Name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
    if (isSignUp && !phone.trim()) return 'Phone number is required.';
    if (isSignUp && !/^[0-9+\-\s()]{8,20}$/.test(phone.trim())) return 'Please enter a valid phone number.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password should be at least 6 characters.';
    if (isSignUp && password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetFeedback();

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isSignUp) {
        await signUp({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
        });
        setSuccessMessage('Account created successfully. Redirecting...');
      } else {
        await login(email.trim().toLowerCase(), password);
        setSuccessMessage('Logged in successfully. Redirecting...');
      }

      setTimeout(() => router.push('/'), 700);
    } catch (error) {
      setErrorMessage(mapAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.card} aria-label="Authentication">
          <p className={styles.kicker}>Welcome to Akheen</p>
          <h1>{title}</h1>

          <div className={styles.switcher} role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignUp}
              className={`${styles.tab} ${!isSignUp ? styles.tabActive : ''}`}
              onClick={() => {
                setMode('login');
                resetFeedback();
              }}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignUp}
              className={`${styles.tab} ${isSignUp ? styles.tabActive : ''}`}
              onClick={() => {
                setMode('signup');
                resetFeedback();
              }}
            >
              Create Account
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {isSignUp ? (
              <label className={styles.field}>
                <span>Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </label>
            ) : null}

            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            {isSignUp ? (
              <label className={styles.field}>
                <span>Mobile Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+20..."
                  autoComplete="tel"
                  required
                />
              </label>
            ) : null}

            <label className={styles.field}>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
            </label>

            {isSignUp ? (
              <label className={styles.field}>
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />
              </label>
            ) : null}

            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
            {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Login'}
            </button>
          </form>

          <p className={styles.backHome}>
            <Link href="/">Back to home</Link>
          </p>
        </section>
      </main>
    </>
  );
}

