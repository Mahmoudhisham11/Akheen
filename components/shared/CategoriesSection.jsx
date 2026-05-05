'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './CategoriesSection.module.css';
import bagImage from '@/public/images/categores.png';
const leftFeatures = [
  {
    title: 'CURATED MATERIALS',
    text: 'Every piece is selected with premium fabrics and refined finishes to keep the Akheen look timeless.',
  },
  {
    title: 'DESIGNED FOR REAL LIFE',
    text: 'From daily movement to formal moments, each detail is crafted for comfort and confidence.',
  },
];

const rightFeatures = [
  {
    title: 'BALANCED ELEGANCE',
    text: 'Clean silhouettes and modern proportions create a sharp identity without overstatement.',
  },
  {
    title: 'DETAIL-DRIVEN QUALITY',
    text: 'Stitching, structure, and utility details are engineered to deliver long-term reliability.',
  },
];

export default function CategoriesSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.25,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="brand-highlights-section"
      ref={sectionRef}
      className={`${styles.section} ${isVisible ? styles.inView : ''}`}
      aria-label="Brand highlights"
    >
      <header className={styles.header}>
        <p className={styles.kicker}>
          <span className={styles.word} style={{ '--i': 0 }}>
            AKHEEN
          </span>{' '}
          <span className={styles.word} style={{ '--i': 1 }}>
            BRAND STORIES
          </span>
        </p>
        <h2 className={styles.heading}>
          <span className={styles.word} style={{ '--i': 2 }}>
            WHY
          </span>{' '}
          <span className={styles.word} style={{ '--i': 3 }}>
            AKHEEN
          </span>{' '}
          <span className={styles.word} style={{ '--i': 4 }}>
            FEELS
          </span>{' '}
          <span className={styles.word} style={{ '--i': 5 }}>
            DIFFERENT
          </span>
        </h2>
        <p className={styles.subtitle}>
          Discover the design philosophy behind every collection: elevated materials, practical details,
          and a premium aesthetic made for modern wardrobes.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.column}>
          {leftFeatures.map((item, index) => (
            <article className={`${styles.card} ${styles.leftCard}`} key={item.title} style={{ '--card-delay': `${180 + index * 140}ms` }}>
              <span className={styles.cardIcon} aria-hidden="true">
                ✣
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <article className={styles.imageCard}>
          <Image
            src={bagImage}
            alt="Featured travel backpack"
            fill
            className={styles.bagImage}
            sizes="(max-width: 900px) 75vw, 30vw"
          />
        </article>

        <div className={styles.column}>
          {rightFeatures.map((item, index) => (
            <article className={`${styles.card} ${styles.rightCard}`} key={item.title} style={{ '--card-delay': `${260 + index * 140}ms` }}>
              <span className={styles.cardIcon} aria-hidden="true">
                ✣
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
