'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { createOrder } from '@/lib/firebase/firestore';
import styles from './checkout-page.module.css';

const SHIPPING_FEE = 90;

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00 EGP';
  return `${number.toFixed(2)} EGP`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const total = subtotal + SHIPPING_FEE;
  const [form, setForm] = useState({
    contact: '',
    country: 'Egypt',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    governorate: 'Cairo',
    postalCode: '',
    saveInfo: false,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lineItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.id,
        name: item.name || 'Unnamed Product',
        imageUrl: item.imageUrl || '',
        size: item.size || 'One Size',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.price || 0),
        originalPrice: Number(item.originalPrice || item.price || 0),
        hasOffer: Boolean(item.hasOffer),
      })),
    [items]
  );

  const handleChange = (field) => (event) => {
    const value = field === 'saveInfo' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!form.firstName.trim()) {
      nextErrors.firstName = 'First name is required.';
    }
    if (!form.lastName.trim()) {
      nextErrors.lastName = 'Last name is required.';
    }
    if (!form.contact.trim()) {
      nextErrors.contact = 'Phone number is required.';
    }
    if (!form.address.trim()) {
      nextErrors.address = 'Address is required.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitOrder = async () => {
    setSubmitError('');
    setSubmitSuccess('');

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Add items before completing checkout.');
      return;
    }

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        customer: {
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          phone: form.contact.trim(),
          contact: form.contact.trim(),
        },
        shippingAddress: {
          country: form.country,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          governorate: form.governorate,
          postalCode: form.postalCode.trim(),
          phone: form.contact.trim(),
        },
        saveInfoForNextTime: Boolean(form.saveInfo),
        items: lineItems,
        subtotal: Number(subtotal || 0),
        shippingFee: SHIPPING_FEE,
        total: Number(total || 0),
      };

      const createdOrder = await createOrder(payload);
      setSubmitSuccess(`Order ${createdOrder.orderNumber} created successfully. Redirecting...`);
      clearCart();
      setTimeout(() => {
        router.push('/products');
      }, 900);
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.brandRow}>
          <h1>Akheen Footwear</h1>
          <Link href="/cart" className={styles.backToCart}>
            Back to cart
          </Link>
        </div>

        <div className={styles.layout}>
          <section className={styles.formColumn}>
            <div className={styles.block}>
              <div className={styles.blockHead}>
                <h2>Contact</h2>
              </div>
              <input
                type="tel"
                placeholder="Mobile phone number"
                value={form.contact}
                onChange={handleChange('contact')}
                aria-invalid={Boolean(errors.contact)}
              />
              {errors.contact ? <p className={styles.errorText}>{errors.contact}</p> : null}
            </div>

            <div className={styles.block}>
              <h2>Delivery</h2>
              <div className={styles.gridOne}>
                <select value={form.country} onChange={handleChange('country')}>
                  <option value="Egypt">Egypt</option>
                </select>
              </div>
              <div className={styles.gridTwo}>
                <input
                  type="text"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={handleChange('firstName')}
                  aria-invalid={Boolean(errors.firstName)}
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={handleChange('lastName')}
                  aria-invalid={Boolean(errors.lastName)}
                />
              </div>
              {errors.firstName ? <p className={styles.errorText}>{errors.firstName}</p> : null}
              {errors.lastName ? <p className={styles.errorText}>{errors.lastName}</p> : null}
              <input
                type="text"
                placeholder="Address"
                value={form.address}
                onChange={handleChange('address')}
                aria-invalid={Boolean(errors.address)}
              />
              {errors.address ? <p className={styles.errorText}>{errors.address}</p> : null}
              <div className={styles.gridThree}>
                <input type="text" placeholder="City" value={form.city} onChange={handleChange('city')} />
                <select value={form.governorate} onChange={handleChange('governorate')}>
                  <option value="Cairo">Cairo</option>
                </select>
                <input
                  type="text"
                  placeholder="Postal code (optional)"
                  value={form.postalCode}
                  onChange={handleChange('postalCode')}
                />
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.saveInfo} onChange={handleChange('saveInfo')} />
                <span>Save this information for next time</span>
              </label>
            </div>

            <div className={styles.block}>
              <h2>Shipping method</h2>
              <div className={styles.shippingCard}>
                <span>Standard</span>
                <strong>{formatPrice(SHIPPING_FEE)}</strong>
              </div>
            </div>

            {submitError ? <p className={styles.submitError}>{submitError}</p> : null}
            {submitSuccess ? <p className={styles.submitSuccess}>{submitSuccess}</p> : null}

            <button
              type="button"
              className={styles.completeBtn}
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'CREATING ORDER...' : 'COMPLETE ORDER'}
            </button>
          </section>

          <aside className={styles.summaryColumn}>
            {items.length === 0 ? (
              <div className={styles.emptySummary}>
                <p>Your cart is empty.</p>
                <Link href="/products">Go to products</Link>
              </div>
            ) : (
              <>
                <div className={styles.summaryItems}>
                  {items.map((item) => (
                    <article className={styles.summaryItem} key={`${item.id}-${item.size || 'One Size'}`}>
                      <div className={styles.summaryImageWrap}>
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name || 'Checkout product'} className={styles.summaryImage} />
                        ) : (
                          <div className={styles.summaryImageFallback}>No Image</div>
                        )}
                        <span className={styles.qtyBadge}>{item.quantity}</span>
                      </div>
                      <div className={styles.summaryMeta}>
                        <h3>{item.name || 'Unnamed Product'}</h3>
                        <p>Size: {item.size || 'One Size'}</p>
                      </div>
                      <strong>{formatPrice(item.price * item.quantity)}</strong>
                    </article>
                  ))}
                </div>

                <div className={styles.totals}>
                  <p>
                    <span>Subtotal</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </p>
                  <p>
                    <span>Shipping</span>
                    <strong>{formatPrice(SHIPPING_FEE)}</strong>
                  </p>
                  <p className={styles.totalRow}>
                    <span>Total</span>
                    <strong>{formatPrice(total)}</strong>
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
