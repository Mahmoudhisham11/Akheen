'use client';

import Image from 'next/image';
import styles from './HeroSection.module.css';
import heroImage from '@/public/images/ChatGPT Image Apr 29, 2026, 01_35_02 PM.png';
import { useRouter } from 'next/navigation';

function AnimatedWords({ as: Tag = 'span', className, text, startIndex = 0 }) {
  const tokens = String(text)
    .split(/(\s+)/)
    .filter((t) => t.length > 0);

  return (
    <Tag className={className} aria-label={text}>
      {tokens.map((token, idx) => {
        if (/^\s+$/.test(token)) return ' ';
        const i =
          startIndex +
          tokens.slice(0, idx).filter((t) => !/^\s+$/.test(t)).length;
        return (
          <span key={`${token}-${idx}`} className={styles.word} style={{ '--i': i }}>
            {token}
          </span>
        );
      })}
    </Tag>
  );
}

export default function HeroSection() {
  const router = useRouter();
  const heroTitle = 'AKHEEN ELEVATED ESSENTIALS';
  const heroDescription =
    'Discover refined essentials crafted for everyday confidence, modern silhouettes, and timeless luxury.';

  return (
    <section id="hero-section" className={styles.hero}>
      <article className={styles.imageCard}>
        <Image
          src={heroImage}
          alt="Model showcasing premium footwear"
          fill
          className={styles.heroImage}
          priority
          sizes="100vw"
        />

        <div className={styles.overlayContent}>
          <AnimatedWords as="h1" className={styles.title} text={heroTitle} startIndex={0} />
          <AnimatedWords as="p" className={styles.description} text={heroDescription} startIndex={10} />
          <button type="button" className={styles.cta} onClick={() => router.push('/products')}>
            Shop Now
          </button>
        </div>
      </article>
    </section>
  );
}
