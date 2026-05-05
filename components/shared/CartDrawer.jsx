'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import styles from './CartDrawer.module.css';

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00 EGP';
  return `${number.toFixed(2)} EGP`;
}

export default function CartDrawer() {
  const {
    items,
    subtotal,
    isDrawerOpen,
    closeDrawer,
    removeItem,
    updateQuantity,
    itemCount,
  } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  return (
    <>
      {isDrawerOpen ? <button type="button" className={styles.backdrop} aria-label="Close cart drawer" onClick={closeDrawer} /> : null}
      <aside
        className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <header className={styles.header}>
          <div>
            <h2>Shopping Cart</h2>
            <p>{itemCount} item{itemCount === 1 ? '' : 's'}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={closeDrawer} aria-label="Close cart drawer">
            ×
          </button>
        </header>

        <div className={styles.itemsArea}>
          {items.length === 0 ? (
            <p className={styles.emptyText}>Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <article className={styles.itemRow} key={`${item.id}-${item.size || 'One Size'}`}>
                <div className={styles.itemImageWrap}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name || 'Cart product'} className={styles.itemImage} />
                  ) : (
                    <div className={styles.itemImageFallback}>No Image</div>
                  )}
                </div>

                <div className={styles.itemMeta}>
                  <h3>{item.name || 'Unnamed Product'}</h3>
                  <p className={styles.sizeLine}>Size: {item.size || 'One Size'}</p>
                  <div className={styles.itemPriceLine}>
                    {item.hasOffer ? <span className={styles.oldPrice}>{formatPrice(item.originalPrice)}</span> : null}
                    <span className={styles.salePrice}>{formatPrice(item.price)}</span>
                  </div>
                  <div className={styles.qtyControl}>
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(item.id, item.size, Number(item.quantity || 0) - 1)}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.id, item.size, Number(item.quantity || 0) + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label="Remove item"
                  onClick={() => removeItem(item.id, item.size)}
                >
                  ×
                </button>
              </article>
            ))
          )}
        </div>

        <section className={styles.mayLikeSection}>
          <h4>You May Also Like</h4>
          <div className={styles.mayLikeCard}>
            <div className={styles.mayLikeThumb}>+</div>
            <div>
              <p>Discover more styles</p>
              <small>Open products to continue shopping</small>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.totals}>
            <p>
              <span>Subtotal:</span>
              <strong>{formatPrice(subtotal)}</strong>
            </p>
            <p>
              <span>Total:</span>
              <strong>{formatPrice(subtotal)}</strong>
            </p>
          </div>
          <p className={styles.taxText}>Tax included and shipping calculated at checkout.</p>
          <Link href="/checkout" className={styles.checkoutBtn}>CHECKOUT</Link>
          <Link href="/cart" className={styles.viewCartBtn}>
            VIEW CART
          </Link>
        </footer>
      </aside>
    </>
  );
}
