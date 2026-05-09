'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CollectionShowcaseSection.module.css';
import featuredModel from '@/public/images/ChatGPT Image Apr 29, 2026, 02_11_14 PM.png';
import { getOffers, getProducts } from '@/lib/firebase/firestore';
import { getNormalizedSizeOptions } from '@/lib/utils/productSizes';
import { useCart } from '@/context/CartContext';

function formatPrice(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return '-';
  return `${number.toFixed(2)} EGP`;
}

function getDiscountPercent(currentPrice, offerPrice) {
  const current = Number(currentPrice);
  const offer = Number(offerPrice);
  if (!Number.isFinite(current) || !Number.isFinite(offer) || current <= 0 || offer >= current) {
    return null;
  }
  const percent = Math.round(((current - offer) / current) * 100);
  return percent > 0 ? percent : null;
}

export default function CollectionShowcaseSection() {
  const { addItem } = useCart();
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [arrivals, setArrivals] = useState([]);
  const [isLoadingArrivals, setIsLoadingArrivals] = useState(true);

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
      { threshold: 0.22, rootMargin: '0px 0px -10% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadArrivals() {
      try {
        const [latestProducts, latestOffers] = await Promise.all([getProducts(null, 4), getOffers()]);
        const offersByProductId = new Map(
          latestOffers
            .filter((offer) => offer?.productId)
            .map((offer) => [offer.productId, offer])
        );

        const mergedProducts = latestProducts.map((product) => {
          const offer = offersByProductId.get(product.id);
          if (!offer) {
            return {
              ...product,
              hasOffer: false,
            };
          }

          return {
            ...product,
            hasOffer: true,
            offerPrice: offer.offerPrice,
            currentPrice: offer.currentPrice ?? product.price,
          };
        });

        if (isMounted) {
          setArrivals(mergedProducts);
        }
      } catch (error) {
        if (isMounted) {
          setArrivals([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingArrivals(false);
        }
      }
    }

    loadArrivals();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section
      id="offers-section"
      ref={sectionRef}
      className={`${styles.section} ${isVisible ? styles.inView : ''}`}
      aria-label="New arrivals showcase"
    >
      <div className={styles.headerRow}>
        <div className={styles.headerCopy}>
          <h2 className={styles.heading}>New Arrivals</h2>
        </div>
        <Link href="/products" className={`${styles.showMoreBtn} ${styles.revealSoft}`} style={{ '--delay': '620ms' }}>
          View All
        </Link>
      </div>

      <div className={styles.contentGrid}>
        <article className={`${styles.featuredCard} ${styles.revealSoft}`} style={{ '--delay': '240ms' }}>
          <Image
            src={featuredModel}
            alt="Woman holding premium black handbag"
            fill
            className={styles.featuredImage}
            sizes="(max-width: 1024px) 100vw, 48vw"
            priority
          />

          <div className={styles.overlayCard}>
            <h3>DISCOVER WHAT JUST LANDED</h3>
            <p>
              Explore our newest pieces curated for modern everyday style, premium details, and
              effortless elegance in every look.
            </p>
            <button type="button" className={styles.exploreBtn}>
              Discover Now
            </button>
          </div>
        </article>

        <div className={`${styles.productsGrid} ${arrivals.length === 1 ? styles.productsGridSingle : ''}`}>
          {isLoadingArrivals ? (
            <p className={styles.fallbackText}>Loading new arrivals...</p>
          ) : arrivals.length === 0 ? (
            <p className={styles.fallbackText}>No new arrivals available right now.</p>
          ) : (
            arrivals.map((product, index) => {
              const discountPercent = product.hasOffer
                ? getDiscountPercent(product.currentPrice, product.offerPrice)
                : null;
              const parsedSizes = getNormalizedSizeOptions(product);
              const fallbackQty = Number(product?.quantity ?? 0);
              const defaultSizeEntry = parsedSizes.find((item) => item.quantity > 0) || parsedSizes[0];
              const size = defaultSizeEntry?.size || 'One Size';
              const maxAvailable = Number.isFinite(defaultSizeEntry?.quantity)
                ? defaultSizeEntry.quantity
                : Number.isFinite(fallbackQty) && fallbackQty > 0
                  ? fallbackQty
                  : 9999;

              return (
                <article className={`${styles.offerCard} ${styles.revealSoft}`} style={{ '--delay': `${360 + index * 120}ms` }} key={product.id || index}>
                <Link href={`/products/${product.id}`} className={styles.offerImageWrap} aria-label={product.name || 'Product image'}>
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name || 'Product image'} className={styles.offerImage} />
                  ) : (
                    <span className={styles.offerImageFallback}>No Image</span>
                  )}
                </Link>
                <div className={styles.imageActions}>
                  <Link href={`/products/${product.id}`} className={styles.iconBtn} aria-label="Quick view">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    className={styles.addToCartBtn}
                    onClick={() =>
                      addItem({
                        id: product.id,
                        name: product.name || 'Unnamed Product',
                        imageUrl: product.imageUrl || '',
                        price: Number(product.hasOffer ? product.offerPrice : product.price) || 0,
                        originalPrice: Number(product.hasOffer ? product.currentPrice : product.price) || 0,
                        hasOffer: Boolean(product.hasOffer),
                        size,
                        quantity: 1,
                        maxAvailable,
                      })
                    }
                  >
                    Add to Cart
                  </button>
                </div>
                <h4>{product.name || 'Unnamed Product'}</h4>
                <div className={styles.priceRow}>
                  <div className={styles.priceValues}>
                    {product.hasOffer ? (
                      <span className={styles.oldPrice}>{formatPrice(product.currentPrice)}</span>
                    ) : null}
                    <span className={styles.salePrice}>{formatPrice(product.hasOffer ? product.offerPrice : product.price)}</span>
                    {discountPercent ? <span className={styles.discountTag}>-{discountPercent}%</span> : null}
                  </div>
                </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
