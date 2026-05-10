'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './admin-shell.module.css';
import logoImage from '@/public/images/header-logo.png';

const adminLinks = [
  { label: 'Overview', href: '/dashboard', icon: 'overview' },
  { label: 'Orders', href: '/dashboard/orders', icon: 'orders' },
  { label: 'Customers', href: '/dashboard/customers', icon: 'customers' },
];

const productSubLinks = [
  { label: 'Offers', href: '/dashboard/products/offers' },
  { label: 'Add Product', href: '/dashboard/products/add-product' },
  { label: 'Categories', href: '/dashboard/products/categories' },
  { label: 'Products', href: '/dashboard/products' },
];

const mobileTitles = {
  '/dashboard': 'Overview',
  '/dashboard/orders': 'Orders',
  '/dashboard/customers': 'Customers',
  '/dashboard/products': 'Products',
  '/dashboard/products/offers': 'Offers',
  '/dashboard/products/add-product': 'Add Product',
  '/dashboard/products/categories': 'Categories',
};

function SidebarIcon({ type }) {
  if (type === 'orders') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9H16M8 13H16M8 17H13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'products') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 7.5L12 12L20 7.5M12 12V21" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (type === 'customers') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.5" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.8 19C4.6 16.5 6.6 15.2 9 15.2C11.4 15.2 13.4 16.5 14.2 19" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14.3 18.8C14.9 17.2 16.2 16.3 17.8 16.3C19.2 16.3 20.4 17.1 21 18.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="4.6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="11.2" width="7" height="8.8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13.2" width="7" height="6.8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, user, userRole } = useAuth();
  const [isProductsOpen, setIsProductsOpen] = useState(() => pathname.startsWith('/dashboard/products'));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const pageTitle =
    pathname?.includes('/dashboard/products/') && pathname?.endsWith('/edit')
      ? 'Edit Product'
      : mobileTitles[pathname] || 'Dashboard';
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }
    if (userRole !== 'admin') {
      router.replace('/');
    }
  }, [loading, user, userRole, router]);

  if (loading || !user || userRole !== 'admin') {
    return (
      <main className={styles.gate}>
        <p>Preparing admin workspace...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {isMobileSidebarOpen ? (
        <button
          type="button"
          className={styles.mobileBackdrop}
          aria-label="Close sidebar"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}

      <aside className={`${styles.sidebar} ${isMobileSidebarOpen ? styles.sidebarOpen : ''}`}>
        <Link href="/" className={styles.logoWrap} aria-label="Akheen home">
          <Image src={logoImage} alt="Akheen logo" className={styles.logo} priority />
        </Link>

        <nav className={styles.nav} aria-label="Admin navigation">
          {adminLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={closeMobileSidebar}
              >
                <span className={styles.navIcon}>
                  <SidebarIcon type={link.icon} />
                </span>
                {link.label}
              </Link>
            );
          })}

          <div className={styles.productsMenuWrap}>
            <button
              type="button"
              className={`${styles.productMenuTrigger} ${pathname.startsWith('/dashboard/products') ? styles.navItemActive : ''}`}
              onClick={() => setIsProductsOpen((prev) => !prev)}
              aria-expanded={isProductsOpen}
              aria-controls="dashboard-products-submenu"
            >
              <span className={styles.navIcon}>
                <SidebarIcon type="products" />
              </span>
              Products
              <span className={`${styles.chevron} ${isProductsOpen ? styles.chevronOpen : ''}`}>⌄</span>
            </button>

            {isProductsOpen ? (
              <div id="dashboard-products-submenu" className={styles.submenu}>
                {productSubLinks.map((subLink) => {
                  const isSubActive = pathname === subLink.href;
                  return (
                    <Link
                      key={subLink.href}
                      href={subLink.href}
                      className={`${styles.submenuItem} ${isSubActive ? styles.submenuItemActive : ''}`}
                      onClick={closeMobileSidebar}
                    >
                      {subLink.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>

        <div className={styles.userBox}>
          <p className={styles.userName}>{user.name || 'Admin User'}</p>
          <p className={styles.userEmail}>{user.email || 'admin@akheen.com'}</p>
          <Link href="/" className={styles.backToShopBtn} onClick={closeMobileSidebar}>
            Back to Shop
          </Link>
        </div>
      </aside>

      <section className={styles.content}>
        <div className={styles.mobileTopbar}>
          <button
            type="button"
            className={styles.mobileBurger}
            aria-label="Open sidebar"
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
          <h1>{pageTitle}</h1>
        </div>
        {children}
      </section>
    </main>
  );
}

