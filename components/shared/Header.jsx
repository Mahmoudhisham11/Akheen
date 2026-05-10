'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Header.module.css';
import logoImage from '@/public/images/header-logo.png';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const navLinks = [
  { label: 'Home', href: '#hero-section' },
  { label: 'Categories', href: '#categories-section' },
  { label: 'Highlights', href: '#offers-section' },
  { label: 'New Arrival', href: '#offers-section' },
  { label: 'Products', href: '#products-section' },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5H6.5L8 14H18L20 8H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.3 20C6.1 16.9 8.5 15 12 15C15.5 15 17.9 16.9 18.7 20" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7H20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 12H20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 17H20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function UserMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.7 19.5C6.6 16.9 8.7 15.4 12 15.4C15.3 15.4 17.4 16.9 18.3 19.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function MailMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5.8" width="17" height="12.4" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.8 7.2L12 12.4L19.2 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DashboardMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="4.6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="11.2" width="7" height="8.8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13.2" width="7" height="6.8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function LogoutMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.2 5.2H6.8C5.7 5.2 4.8 6.1 4.8 7.2V16.8C4.8 17.9 5.7 18.8 6.8 18.8H9.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.4 8L17.6 12L13.4 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.8 12H17.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const router = useRouter();
  const { user, userRole, loading, logout } = useAuth();
  const { itemCount, openDrawer } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleAccountClick = () => {
    if (loading) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    setIsAccountMenuOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    await logout();
    setIsAccountMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.promoBar}>Enjoy an exclusive 10% coupon for your first purchase.</div>

      <div className={styles.navBar}>
        <button
          type="button"
          className={styles.mobileMenuButton}
          aria-label="Open navigation menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
        >
          <MenuIcon />
        </button>

        <Link href="/" className={styles.brand} aria-label="Akheen home">
          <Image src={logoImage} alt="Akheen logo" className={styles.brandLogo} priority />
        </Link>

        <nav className={styles.navLinks} aria-label="Primary">
          {navLinks.map((item) => (
            <Link key={item.label} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} aria-label="Search">
            <SearchIcon />
          </button>
          <button type="button" className={styles.iconButton} aria-label="Cart" onClick={openDrawer}>
            <CartIcon />
            {itemCount > 0 ? <span className={styles.cartCountBadge}>{itemCount > 99 ? '99+' : itemCount}</span> : null}
          </button>
          <div className={styles.accountMenuWrap} ref={accountMenuRef}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Account"
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              onClick={handleAccountClick}
            >
              <UserIcon />
            </button>

            {user && isAccountMenuOpen ? (
              <div className={styles.accountDropdown} role="menu" aria-label="Account menu">
                <div className={styles.accountIdentity}>
                  <p className={styles.accountName}>
                    <span className={styles.accountIcon}><UserMiniIcon /></span>
                    {user.name}
                  </p>
                  {userRole !== 'admin' ? (
                    <p className={styles.accountEmail}>
                      <span className={styles.accountIcon}><MailMiniIcon /></span>
                      {user.email}
                    </p>
                  ) : null}
                </div>
                <div className={styles.accountDivider} />

                {userRole === 'admin' ? (
                  <Link
                    href="/dashboard"
                    className={styles.accountAction}
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    <span className={styles.accountIcon}><DashboardMiniIcon /></span>
                    Dashboard
                  </Link>
                ) : null}

                <button type="button" className={styles.accountAction} role="menuitem" onClick={handleLogout}>
                  <span className={styles.accountIcon}><LogoutMiniIcon /></span>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`${styles.mobileMenuOverlay} ${isMenuOpen ? styles.mobileMenuOverlayVisible : ''}`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden={!isMenuOpen}
      >
        <aside
          className={`${styles.mobileSidebar} ${isMenuOpen ? styles.mobileSidebarOpen : ''}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className={styles.mobileSidebarHeader}>
            <Image src={logoImage} alt="Akheen logo" className={styles.mobileSidebarLogo} priority />
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Close navigation menu"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className={styles.closeX}>×</span>
            </button>
          </div>

          <nav className={styles.mobileNavLinks}>
            {navLinks.map((item) => (
              <Link key={item.label} href={item.href} className={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </header>
  );
}
