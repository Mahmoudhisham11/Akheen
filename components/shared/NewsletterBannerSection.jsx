'use client';

import Image from 'next/image';
import styles from './NewsletterBannerSection.module.css';
import bannerImage from '@/public/images/newsletter-banner-2.png';

export default function NewsletterBannerSection() {
  return (
    <section id="banner-section" className={styles.section} aria-label="Newsletter banner">
      <div className={styles.imageWrap}>
        <Image
          src={bannerImage}
          alt="Newsletter banner"
          fill
          className={styles.bannerImage}
          sizes="100vw"
          priority
        />
        <div className={styles.overlay}>
          <p className={styles.kicker}>AKHEEN JOURNAL</p>
          <h2>Step Into Every Day With Confidence</h2>
          <p className={styles.text}>
            Discover signature drops, exclusive edits, and timeless essentials designed to elevate your
            lifestyle.
          </p>
        </div>
      </div>
    </section>
  );
}
