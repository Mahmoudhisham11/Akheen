'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CategoriesMosaicSection.module.css';
import sneakersImage from '@/public/images/snakers.png';
import bagImage from '@/public/images/bag.png';
import accessoriesImage from '@/public/images/accessories.png';
import slippersImage from '@/public/images/slippers.png';

/** Values must match `product.category` / dashboard category names in Firestore. */
const cards = [
  {
    key: 'shoes',
    title: 'Shoes',
    productCategory: 'Shoes',
    subtitle: 'Modern silhouettes engineered for comfort, movement, and premium daily wear.',
    cta: 'Shop Shoes',
    image: sneakersImage,
    className: 'cardLarge',
    imageClassName: 'imageShoes',
    delay: '140ms',
  },
  {
    key: 'bags',
    title: 'Bags',
    productCategory: 'Bags',
    subtitle: 'Refined structure with practical space to carry your essentials with elegance.',
    cta: 'Shop Bags',
    image: bagImage,
    className: 'cardTopRight',
    imageClassName: 'imageBags',
    delay: '280ms',
  },
  {
    key: 'accessories',
    title: 'Accessories',
    productCategory: 'Accessories',
    subtitle: 'Signature pieces that elevate your style with subtle, premium detail.',
    cta: 'Shop Accessories',
    image: accessoriesImage,
    className: 'cardMiddleRight',
    imageClassName: 'imageAccessories',
    delay: '420ms',
  },
  {
    key: 'slippers',
    title: 'Slippers',
    productCategory: 'Slippers',
    subtitle: 'Easy slides with cushioned comfort for relaxed days and elevated loungewear.',
    cta: 'Shop Slippers',
    image: slippersImage,
    className: 'cardBottomWide',
    imageClassName: 'imageSlippers',
    delay: '560ms',
  },
];

export default function CategoriesMosaicSection() {
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
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="categories-section"
      ref={sectionRef}
      className={`${styles.section} ${isVisible ? styles.inView : ''}`}
      aria-label="Primary categories"
    >
      <header className={styles.header}>
        <h2 className={styles.heading}>Shop by Category</h2>
      </header>

      <div className={styles.grid}>
        {cards.map((card) => (
          <article
            key={card.key}
            className={`${styles.card} ${styles[card.className]}`}
            style={{ '--delay': card.delay }}
          >
            <Image
              src={card.image}
              alt={card.title}
              fill
              className={`${styles.cardImage} ${styles[card.imageClassName]}`}
              sizes="(max-width: 900px) 100vw, 50vw"
            />
            <div className={styles.overlay}>
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
              <Link
                href={`/products?category=${encodeURIComponent(card.productCategory)}`}
                className={styles.cta}
                aria-label={`${card.cta} — ${card.productCategory}`}
              >
                {card.cta}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

