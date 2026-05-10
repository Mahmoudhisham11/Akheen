'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/shared/Header';
import FooterSection from '@/components/shared/FooterSection';
import { getOffers, getProduct, getProducts } from '@/lib/firebase/firestore';
import styles from './product-details.module.css';
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

function mergeProductOffer(product, offersByProductId) {
  const offer = offersByProductId.get(product.id);
  if (!offer) return { ...product, hasOffer: false };
  return {
    ...product,
    hasOffer: true,
    offerPrice: offer.offerPrice,
    currentPrice: offer.currentPrice ?? product.price,
  };
}

export default function ProductDetailsPage() {
  const { addItem } = useCart();
  const params = useParams();
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!productId) return;
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMessage('');

        const [productData, offers] = await Promise.all([getProduct(productId), getOffers()]);
        const offersByProductId = new Map(
          offers.filter((offer) => offer?.productId).map((offer) => [offer.productId, offer])
        );
        const mergedCurrentProduct = mergeProductOffer(productData, offersByProductId);

        const allProducts = await getProducts();

        const related = allProducts
          .filter((item) =>
            mergedCurrentProduct.category ? item.category === mergedCurrentProduct.category : true
          )
          .filter((item) => item.id !== mergedCurrentProduct.id)
          .slice(0, 4)
          .map((item) => mergeProductOffer(item, offersByProductId));

        if (isMounted) {
          setProduct(mergedCurrentProduct);
          setRelatedProducts(related);
        }
      } catch (error) {
        if (isMounted) {
          setProduct(null);
          setRelatedProducts([]);
          setErrorMessage(error?.message || 'Product not found.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const discountPercent = useMemo(() => {
    if (!product?.hasOffer) return null;
    return getDiscountPercent(product.currentPrice, product.offerPrice);
  }, [product]);

  const sizeOptions = useMemo(() => {
    const parsedSizes = Array.isArray(product?.sizes)
      ? product.sizes
      .map((item) => ({ size: String(item?.size || '').trim(), quantity: Number(item?.quantity ?? 0) }))
      .filter((item) => item.size && Number.isFinite(item.quantity) && item.quantity >= 0)
      : [];

    if (parsedSizes.length) return parsedSizes;

    const manualQty = Number(product?.quantity ?? 0);
    if (Number.isFinite(manualQty) && manualQty >= 0) {
      return [{ size: 'One Size', quantity: manualQty }];
    }

    return [];
  }, [product]);

  const selectedSizeEntry = useMemo(
    () => sizeOptions.find((item) => item.size === selectedSize) || null,
    [sizeOptions, selectedSize]
  );

  const maxAvailable = selectedSizeEntry
    ? selectedSizeEntry.quantity
    : Number.isFinite(Number(product?.quantity))
      ? Number(product?.quantity)
      : 0;

  const galleryUrls = useMemo(() => {
    if (!product) return [];
    return [product.imageUrl, product.imageUrl2].filter(Boolean);
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [productId]);

  useEffect(() => {
    if (!galleryUrls.length) return;
    setActiveImageIndex((prev) => Math.min(prev, galleryUrls.length - 1));
  }, [galleryUrls]);

  const displayMainImageUrl = galleryUrls[activeImageIndex] || product?.imageUrl;

  useEffect(() => {
    if (!sizeOptions.length) {
      setSelectedSize('');
      setQuantity(1);
      return;
    }

    const firstAvailable = sizeOptions.find((item) => item.quantity > 0) || sizeOptions[0];
    setSelectedSize(firstAvailable.size);
    setQuantity(firstAvailable.quantity > 0 ? 1 : 0);
  }, [sizeOptions]);

  useEffect(() => {
    if (!selectedSizeEntry) return;
    setQuantity((prev) => {
      if (selectedSizeEntry.quantity <= 0) return 0;
      if (prev <= 0) return 1;
      return Math.min(prev, selectedSizeEntry.quantity);
    });
  }, [selectedSizeEntry]);

  return (
    <>
      <Header />
      <main className={styles.page}>
        {loading ? (
          <p className={styles.status}>Loading product...</p>
        ) : !product ? (
          <div className={styles.statusCard}>
            <p>{errorMessage || 'Product not found.'}</p>
            <Link href="/products" className={styles.backBtn}>
              Back to Products
            </Link>
          </div>
        ) : (
          <>
            <section className={styles.productSection}>
              <div className={styles.galleryColumn}>
                <div className={styles.mainImageWrap}>
                  {displayMainImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayMainImageUrl} alt={product.name || 'Product image'} className={styles.mainImage} />
                  ) : (
                    <div className={styles.fallbackImage}>No Image</div>
                  )}
                </div>
                <div className={styles.thumbRow}>
                  {galleryUrls.length ? (
                    galleryUrls.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        className={`${styles.thumbItem} ${styles.thumbBtn} ${idx === activeImageIndex ? styles.thumbItemActive : ''}`}
                        onClick={() => setActiveImageIndex(idx)}
                        aria-label={`Product image ${idx + 1}`}
                        aria-pressed={idx === activeImageIndex}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className={styles.thumbImage} />
                      </button>
                    ))
                  ) : (
                    <div className={styles.thumbItem}>
                      <div className={styles.fallbackThumb}>No Image</div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.detailsColumn}>
                <h1>{product.name || 'Unnamed Product'}</h1>
                {product.description ? <p className={styles.description}>{product.description}</p> : null}
                {product.category ? <p className={styles.metaLine}>Category: {product.category}</p> : null}
                {product.quantity !== undefined ? <p className={styles.metaLine}>In stock: {product.quantity}</p> : null}

                <div className={styles.priceRow}>
                  {product.hasOffer ? <span className={styles.oldPrice}>{formatPrice(product.currentPrice)}</span> : null}
                  <span className={styles.salePrice}>{formatPrice(product.hasOffer ? product.offerPrice : product.price)}</span>
                  {discountPercent ? <span className={styles.discountTag}>-{discountPercent}%</span> : null}
                </div>

                {sizeOptions.length ? (
                  <div className={styles.sizeSection}>
                    <p>Select size</p>
                    <div className={styles.sizeGrid}>
                      {sizeOptions.map((item) => {
                        const isSelected = selectedSize === item.size;
                        const isDisabled = item.quantity <= 0;
                        return (
                          <button
                            key={item.size}
                            type="button"
                            className={`${styles.sizeBtn} ${isSelected ? styles.sizeBtnSelected : ''} ${isDisabled ? styles.sizeBtnDisabled : ''}`}
                            disabled={isDisabled}
                            onClick={() => setSelectedSize(item.size)}
                          >
                            {item.size}
                          </button>
                        );
                      })}
                    </div>
                    <p className={styles.sizeStockHint}>
                      {selectedSizeEntry
                        ? selectedSizeEntry.quantity > 0
                          ? `${selectedSizeEntry.quantity} item(s) available in size ${selectedSizeEntry.size}`
                          : `Size ${selectedSizeEntry.size} is out of stock`
                        : 'Choose a size first.'}
                    </p>
                  </div>
                ) : null}

                <div className={styles.quantityRow}>
                  <span>Quantity</span>
                  <div className={styles.qtyControl}>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => (maxAvailable <= 0 ? 0 : Math.max(1, prev - 1)))}
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((prev) => {
                          if (maxAvailable <= 0) return 0;
                          const base = prev <= 0 ? 1 : prev + 1;
                          return Math.min(base, maxAvailable);
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.addToCartBtn}
                  disabled={maxAvailable <= 0}
                  onClick={() =>
                    addItem({
                      id: product.id,
                      name: product.name || 'Unnamed Product',
                      imageUrl: product.imageUrl || '',
                      price: Number(product.hasOffer ? product.offerPrice : product.price) || 0,
                      originalPrice: Number(product.hasOffer ? product.currentPrice : product.price) || 0,
                      hasOffer: Boolean(product.hasOffer),
                      size: selectedSize || 'One Size',
                      quantity: quantity > 0 ? quantity : 1,
                      maxAvailable,
                    })
                  }
                >
                  Add to Cart
                </button>
              </div>
            </section>

            <section className={styles.relatedSection}>
              <div className={styles.relatedHead}>
                <h2>Related Products</h2>
                <Link href="/products">View All</Link>
              </div>

              {relatedProducts.length === 0 ? (
                <p className={styles.status}>No related products right now.</p>
              ) : (
                <div className={styles.relatedGrid}>
                  {relatedProducts.map((item) => {
                    const relatedDiscount = item.hasOffer
                      ? getDiscountPercent(item.currentPrice, item.offerPrice)
                      : null;

                    return (
                      <Link key={item.id} href={`/products/${item.id}`} className={styles.relatedCard}>
                        <div className={styles.relatedImageWrap}>
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.name || 'Related product'} className={styles.relatedImage} />
                          ) : (
                            <div className={styles.fallbackThumb}>No Image</div>
                          )}
                        </div>
                        <h3>{item.name || 'Unnamed Product'}</h3>
                        <div className={styles.relatedPriceRow}>
                          {item.hasOffer ? <span className={styles.oldPrice}>{formatPrice(item.currentPrice)}</span> : null}
                          <span className={styles.salePrice}>{formatPrice(item.hasOffer ? item.offerPrice : item.price)}</span>
                          {relatedDiscount ? <span className={styles.discountTag}>-{relatedDiscount}%</span> : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <FooterSection />
    </>
  );
}

