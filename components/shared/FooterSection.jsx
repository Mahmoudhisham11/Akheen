'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './FooterSection.module.css';
import footerImage from '@/public/images/WhatsApp Image 2026-04-27 at 3.56.18 PM (4).jpeg';

const quickMenu = [
  { label: 'Home', href: '#hero-section' },
  { label: 'Categories', href: '#categories-section' },
  { label: 'New Arrival', href: '#offers-section' },
  { label: 'Products', href: '#products-section' },
];
const supportLinks = [
  { label: 'Back to Top', href: '#hero-section' },
  { label: 'Explore Categories', href: '#categories-section' },
  { label: 'View New Arrival', href: '#offers-section' },
  { label: 'Products Section', href: '#products-section' },
];

function SocialInstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="4.5" width="15" height="15" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.9" r="0.9" />
    </svg>
  );
}

function SocialFacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8.7c0-.5.2-.7.9-.7Z" />
    </svg>
  );
}

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/akhai.n?igsh=MTY1d2FoYWYxZ2gxYQ%3D%3D&utm_source=qr',
    icon: <SocialInstagramIcon />,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/share/19DsTyZXNW/?mibextid=wwXIfr',
    icon: <SocialFacebookIcon />,
  },
];

export default function FooterSection() {
  return (
    <footer id="footer-section" className={styles.footer} aria-label="Site footer">
      <div className={styles.topRow}>
        <div className={styles.brandBlock}>
          <h2>AKHEEN</h2>
          <p>
            Your ultimate travel companion. Durable, stylish, and spacious, designed for comfort and
            convenience on any adventure or commute.
          </p>
        </div>

        <div className={styles.socials}>
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              aria-label={item.label}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.icon}
            </a>
          ))}
        </div>
      </div>

      <div className={styles.middleRow}>
        <div className={styles.contactBlock}>
          <div className={styles.contactImageWrap}>
            <Image src={footerImage} alt="City street visual" fill className={styles.contactImage} sizes="280px" />
          </div>
          <ul>
            <li>+20 10 91224831</li>
          </ul>
        </div>

        <div className={styles.linksBlock}>
          <nav className={styles.linkGroup} aria-label="Quick menu">
            <h3>QUICK MENU</h3>
            {quickMenu.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <nav className={styles.linkGroup} aria-label="Support links">
            <h3>SUPPORT</h3>
            {supportLinks.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <p>@Akheen International. All Rights Reserved.</p>
        <div>
          <Link href="#hero-section">Terms &amp; Conditions</Link>
          <span>|</span>
          <Link href="#hero-section">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
