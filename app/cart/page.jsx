'use client';

import Link from 'next/link';
import Header from '@/components/shared/Header';
import FooterSection from '@/components/shared/FooterSection';
import { useCart } from '@/context/CartContext';
import styles from './cart-page.module.css';

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00 EGP';
  return `${number.toFixed(2)} EGP`;
}

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.container}>
          <p className={styles.breadcrumb}>Home &gt; Your Cart</p>
          <h1 className={styles.title}>YOUR CART</h1>

          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Your cart is empty.</p>
              <Link href="/products">Continue Shopping</Link>
            </div>
          ) : (
            <section className={styles.layout}>
              <div className={styles.leftCol}>
                <div className={styles.tableHeader}>
                  <span>PRODUCT</span>
                  <span>PRICE</span>
                  <span>QUANTITY</span>
                  <span>TOTAL</span>
                </div>

                <div className={styles.rows}>
                  {items.map((item) => {
                    const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                    return (
                      <article className={styles.row} key={`${item.id}-${item.size || 'One Size'}`}>
                        <div className={styles.productCell}>
                          <div className={styles.imageWrap}>
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.name || 'Cart product'} className={styles.itemImage} />
                            ) : (
                              <div className={styles.imageFallback}>No Image</div>
                            )}
                          </div>
                          <div className={styles.productMeta}>
                            <h3>{item.name || 'Unnamed Product'}</h3>
                            <p>Size: {item.size || 'One Size'}</p>
                          </div>
                        </div>

                        <div className={styles.priceCell}>
                          {item.hasOffer ? <span className={styles.oldPrice}>{formatPrice(item.originalPrice)}</span> : null}
                          <strong>{formatPrice(item.price)}</strong>
                        </div>

                        <div className={styles.qtyCell}>
                          <div className={styles.qtyControl}>
                            <button type="button" onClick={() => updateQuantity(item.id, item.size, Number(item.quantity || 0) - 1)}>-</button>
                            <span>{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.id, item.size, Number(item.quantity || 0) + 1)}>+</button>
                          </div>
                        </div>

                        <div className={styles.totalCell}>
                          <strong>{formatPrice(itemTotal)}</strong>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            aria-label="Remove item"
                            onClick={() => removeItem(item.id, item.size)}
                          >
                            ×
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className={styles.commentsBlock}>
                  <label htmlFor="cart-comment">Additional Comments</label>
                  <textarea id="cart-comment" rows={4} placeholder="Special instruction for seller..." />
                </div>
              </div>

              <aside className={styles.summaryCol}>
                <h2>ORDER SUMMARY</h2>
                <div className={styles.summaryLine}>
                  <span>Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <div className={styles.couponBlock}>
                  <label htmlFor="coupon">Coupon code</label>
                  <input id="coupon" type="text" placeholder="Enter coupon code" />
                </div>
                <div className={styles.summaryLine}>
                  <span>TOTAL:</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <p className={styles.taxText}>Tax included and shipping calculated at checkout</p>
                <Link href="/checkout" className={styles.checkoutBtn}>PROCEED TO CHECKOUT</Link>
                <Link href="/products" className={styles.continueBtn}>CONTINUE SHOPPING</Link>
              </aside>
            </section>
          )}
        </section>
      </main>
      <FooterSection />
    </>
  );
}
