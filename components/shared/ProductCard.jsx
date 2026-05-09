'use client';

import Link from 'next/link';
import styles from './ProductCard.module.css';
import { useCart } from '@/context/CartContext';
import { getNormalizedSizeOptions } from '@/lib/utils/productSizes';

function formatPrice(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return `${value ?? '-'}`;
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

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const hasOffer = Boolean(product?.hasOffer);
  const discountPercent = hasOffer ? getDiscountPercent(product.currentPrice, product.offerPrice) : null;
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
    <article className={styles.productCard}>
      <Link href={`/products/${product.id}`} className={styles.imageContainer}>
        {product?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name || 'Product image'} className={styles.productImage} />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>{product.name}</span>
          </div>
        )}
      </Link>
      <div className={styles.actionsRow}>
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
              price: Number(hasOffer ? product.offerPrice : product.price) || 0,
              originalPrice: Number(hasOffer ? product.currentPrice : product.price) || 0,
              hasOffer,
              size,
              quantity: 1,
              maxAvailable,
            })
          }
        >
          Add to Cart
        </button>
      </div>
      <Link href={`/products/${product.id}`} className={styles.info}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>
          {hasOffer ? <span className={styles.oldPrice}>{formatPrice(product.currentPrice)}</span> : null}
          <span className={styles.salePrice}>{formatPrice(hasOffer ? product.offerPrice : product.price)}</span>
          {discountPercent ? <span className={styles.discountTag}>-{discountPercent}%</span> : null}
        </p>
      </Link>
    </article>
  );
}

