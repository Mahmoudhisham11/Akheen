'use client';

import { useEffect } from 'react';
import styles from './ErrorPopup.module.css';

export default function ErrorPopup({ message, onClose, isVisible }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto close after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Error</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 5L5 15M5 5l10 10"/>
            </svg>
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.icon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="m15 9-6 6M9 9l6 6"/>
            </svg>
          </div>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.footer}>
          <button className={styles.okButton} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

