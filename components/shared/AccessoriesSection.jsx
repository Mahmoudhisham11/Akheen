'use client';

import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import Link from 'next/link';
import styles from './AccessoriesSection.module.css';
import { getOffers, getProducts } from '@/lib/firebase/firestore';
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

function ProductCard({ product, delayMs }) {
  const { addItem } = useCart();
  const discountPercent = product.hasOffer ? getDiscountPercent(product.currentPrice, product.offerPrice) : null;
  const parsedSizes = Array.isArray(product?.sizes)
    ? product.sizes
      .map((item) => ({ size: String(item?.size || '').trim(), quantity: Number(item?.quantity ?? 0) }))
      .filter((item) => item.size && Number.isFinite(item.quantity) && item.quantity >= 0)
    : [];
  const fallbackQty = Number(product?.quantity ?? 0);
  const defaultSizeEntry = parsedSizes.find((item) => item.quantity > 0) || parsedSizes[0];
  const size = defaultSizeEntry?.size || 'One Size';
  const maxAvailable = Number.isFinite(defaultSizeEntry?.quantity)
    ? defaultSizeEntry.quantity
    : Number.isFinite(fallbackQty) && fallbackQty > 0
      ? fallbackQty
      : 9999;

  const handleAddToCart = () => {
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
    });
  };

  return (
    <article className={`${styles.card} ${styles.revealCard}`} style={{ '--delay': `${delayMs}ms` }}>
      <Link href={`/products/${product.id}`} className={styles.imageWrap} aria-label={product.name || 'Product image'}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name || 'Product image'} className={styles.cardImage} />
        ) : (
          <span className={styles.imageFallback}>No Image</span>
        )}
      </Link>
      <div className={styles.imageActions}>
        <Link href={`/products/${product.id}`} className={styles.iconBtn} aria-label="Quick view">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
        <button type="button" className={styles.addToCartBtn} onClick={handleAddToCart}>Add to Cart</button>
      </div>
      <h3>{product.name || 'Unnamed Product'}</h3>
      <div className={styles.metaRow}>
        <div className={styles.priceValues}>
          {product.hasOffer ? <span className={styles.oldPrice}>{formatPrice(product.currentPrice)}</span> : null}
          <span className={styles.salePrice}>{formatPrice(product.hasOffer ? product.offerPrice : product.price)}</span>
          {discountPercent ? <span className={styles.discountTag}>-{discountPercent}%</span> : null}
        </div>
      </div>
    </article>
  );
}

export default function AccessoriesSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const swiperBreakpoints = {
    0: { slidesPerView: 2, slidesPerGroup: 2, spaceBetween: 10 },
    640: { slidesPerView: 2.6, slidesPerGroup: 2, spaceBetween: 12 },
    1024: { slidesPerView: 5, slidesPerGroup: 5, spaceBetween: 12 },
  };

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
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const [productList, offerList] = await Promise.all([getProducts(), getOffers()]);
        const offersByProductId = new Map(
          offerList.filter((offer) => offer?.productId).map((offer) => [offer.productId, offer])
        );

        const merged = productList.map((product) => {
          const offer = offersByProductId.get(product.id);
          if (!offer) {
            return { ...product, hasOffer: false };
          }
          return {
            ...product,
            hasOffer: true,
            offerPrice: offer.offerPrice,
            currentPrice: offer.currentPrice ?? product.price,
          };
        });

        if (isMounted) {
          setProducts(merged);
        }
      } catch (error) {
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleProducts = products.slice(0, 16);
  const firstRow = visibleProducts.slice(0, 8);
  const secondRowSeed = visibleProducts.slice(8, 16);
  const secondRow = secondRowSeed.length ? secondRowSeed : firstRow;

  return (
    <section
      id="products-section"
      ref={sectionRef}
      className={`${styles.section} ${isVisible ? styles.inView : ''}`}
      aria-label="Accessories collection"
    >
      <div className={`${styles.headerRow} ${styles.revealSoft}`} style={{ '--delay': '140ms' }}>
        <div>
          <h2>Products</h2>
        </div>
        <Link href="/products" className={styles.showMoreBtn}>
          View All
        </Link>
      </div>

      {isLoadingProducts ? (
        <p className={styles.fallbackText}>Loading products...</p>
      ) : products.length === 0 ? (
        <p className={styles.fallbackText}>No products available right now.</p>
      ) : (
        <>
          <div className={`${styles.swiperBlock} ${styles.revealSoft}`} style={{ '--delay': '260ms' }}>
            <Swiper grabCursor watchOverflow roundLengths breakpoints={swiperBreakpoints}>
              {firstRow.map((product, index) => (
                <SwiperSlide key={`row-1-${product.id || product.name}-${index}`}>
                  <ProductCard product={product} delayMs={340 + index * 90} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <div className={`${styles.swiperBlock} ${styles.revealSoft}`} style={{ '--delay': '460ms' }}>
            <Swiper grabCursor watchOverflow roundLengths breakpoints={swiperBreakpoints}>
              {secondRow.map((product, index) => (
                <SwiperSlide key={`row-2-${product.id || product.name}-${index}`}>
                  <ProductCard product={product} delayMs={540 + index * 90} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </>
      )}
    </section>
  );
}
