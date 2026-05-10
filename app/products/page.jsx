'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/shared/Header';
import { getOffers, getProducts } from '@/lib/firebase/firestore';
import styles from './products-page.module.css';
import FooterSection from '@/components/shared/FooterSection';
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

function getDisplayPrice(product) {
  const base = Number(product.price || 0);
  const offer = product.hasOffer ? Number(product.offerPrice || base) : base;
  return Number.isNaN(offer) ? base : offer;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function UserProductsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [draftMinPrice, setDraftMinPrice] = useState(0);
  const [draftMaxPrice, setDraftMaxPrice] = useState(1000);
  const [appliedMinPrice, setAppliedMinPrice] = useState(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        const [productList, offerList] = await Promise.all([getProducts(), getOffers()]);
        const offersByProductId = new Map(
          offerList.filter((offer) => offer?.productId).map((offer) => [offer.productId, offer])
        );

        const merged = productList.map((product) => {
          const offer = offersByProductId.get(product.id);
          if (!offer) return { ...product, hasOffer: false };
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
          setErrorMessage(error?.message || 'Failed to load products.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
  }, [products]);

  useEffect(() => {
    if (!categories.length) return;
    const fromUrl = searchParams.get('category')?.trim() || '';
    if (!fromUrl) return;
    if (categories.includes(fromUrl)) {
      setSelectedCategory(fromUrl);
      return;
    }
    setSelectedCategory('');
    const next = new URLSearchParams(searchParams.toString());
    next.delete('category');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, categories, pathname, router]);

  const setCategoryFilter = (value) => {
    setSelectedCategory(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set('category', value);
    else next.delete('category');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const priceBounds = useMemo(() => {
    const prices = products
      .map((product) => getDisplayPrice(product))
      .filter((price) => Number.isFinite(price) && price >= 0);

    if (!prices.length) {
      return { min: 0, max: 5000 };
    }

    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    if (min === max) {
      return { min, max: min + 1 };
    }
    return { min, max };
  }, [products]);

  useEffect(() => {
    setDraftMinPrice(priceBounds.min);
    setDraftMaxPrice(priceBounds.max);
    setAppliedMinPrice(priceBounds.min);
    setAppliedMaxPrice(priceBounds.max);
  }, [priceBounds.min, priceBounds.max]);

  const rangeSize = Math.max(priceBounds.max - priceBounds.min, 1);
  const minPercent = ((draftMinPrice - priceBounds.min) / rangeSize) * 100;
  const maxPercent = ((draftMaxPrice - priceBounds.min) / rangeSize) * 100;

  const filteredProducts = useMemo(() => {
    const result = products.filter((product) => {
      const displayPrice = getDisplayPrice(product);
      const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
      const matchesMin = appliedMinPrice === null || displayPrice >= appliedMinPrice;
      const matchesMax = appliedMaxPrice === null || displayPrice <= appliedMaxPrice;
      return matchesCategory && matchesMin && matchesMax;
    });

    if (sortBy === 'price-low') {
      result.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
    }

    return result;
  }, [products, selectedCategory, appliedMinPrice, appliedMaxPrice, sortBy]);

  const applyPriceRange = () => {
    const safeMin = clampNumber(Math.min(draftMinPrice, draftMaxPrice), priceBounds.min, priceBounds.max);
    const safeMax = clampNumber(Math.max(draftMinPrice, draftMaxPrice), priceBounds.min, priceBounds.max);
    setDraftMinPrice(safeMin);
    setDraftMaxPrice(safeMax);
    setAppliedMinPrice(safeMin);
    setAppliedMaxPrice(safeMax);
  };

  const handleMinSliderChange = (event) => {
    const next = clampNumber(Number(event.target.value), priceBounds.min, priceBounds.max);
    setDraftMinPrice(Math.min(next, draftMaxPrice));
  };

  const handleMaxSliderChange = (event) => {
    const next = clampNumber(Number(event.target.value), priceBounds.min, priceBounds.max);
    setDraftMaxPrice(Math.max(next, draftMinPrice));
  };

  const handleMinInputChange = (event) => {
    const raw = Number(event.target.value);
    if (Number.isNaN(raw)) return;
    const next = clampNumber(raw, priceBounds.min, priceBounds.max);
    setDraftMinPrice(Math.min(next, draftMaxPrice));
  };

  const handleMaxInputChange = (event) => {
    const raw = Number(event.target.value);
    if (Number.isNaN(raw)) return;
    const next = clampNumber(raw, priceBounds.min, priceBounds.max);
    setDraftMaxPrice(Math.max(next, draftMinPrice));
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setDraftMinPrice(priceBounds.min);
    setDraftMaxPrice(priceBounds.max);
    setAppliedMinPrice(priceBounds.min);
    setAppliedMaxPrice(priceBounds.max);
    setSortBy('newest');
  };

  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.hero}>
          <h1>Products</h1>
          <p>Discover every piece in our collection with easy search and smart filters.</p>
        </section>

        <button
          type="button"
          className={styles.mobileFilterToggle}
          onClick={() => setIsMobileFiltersOpen(true)}
          aria-label="Open filters"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.filterIcon}>
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          <span>Filter</span>
        </button>

        {isMobileFiltersOpen ? (
          <button
            type="button"
            className={styles.mobileFilterBackdrop}
            aria-label="Close filters"
            onClick={() => setIsMobileFiltersOpen(false)}
          />
        ) : null}

        <section className={styles.layout}>
          <aside className={`${styles.filters} ${isMobileFiltersOpen ? styles.filtersOpen : ''}`}>
            <div className={styles.mobileFilterHeader}>
              <h2>Filters</h2>
              <button type="button" onClick={() => setIsMobileFiltersOpen(false)} aria-label="Close filters">
                ✕
              </button>
            </div>

            <div className={styles.filterBlock}>
              <h2>Category</h2>
              <select value={selectedCategory} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.filterBlock} ${styles.priceFilterBlock}`}>
              <div className={styles.priceHeader}>
                <h2>PRICE</h2>
                <span className={styles.priceChevron}>⌃</span>
              </div>
              <div className={styles.sliderShell}>
                <div className={styles.sliderTrack} />
                <div
                  className={styles.sliderRange}
                  style={{
                    left: `${minPercent}%`,
                    width: `${Math.max(maxPercent - minPercent, 0)}%`,
                  }}
                />
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={draftMinPrice}
                  onChange={handleMinSliderChange}
                  className={`${styles.rangeInput} ${styles.rangeInputMin}`}
                />
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={draftMaxPrice}
                  onChange={handleMaxSliderChange}
                  className={`${styles.rangeInput} ${styles.rangeInputMax}`}
                />
              </div>
              <div className={styles.priceInputs}>
                <input
                  type="number"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step="1"
                  value={draftMinPrice}
                  onChange={handleMinInputChange}
                />
                <span className={styles.priceTo}>to</span>
                <input
                  type="number"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step="1"
                  value={draftMaxPrice}
                  onChange={handleMaxInputChange}
                />
              </div>
              <button type="button" className={styles.applyBtn} onClick={applyPriceRange}>
                APPLY
              </button>
            </div>

            <div className={styles.filterBlock}>
              <h2>Sort</h2>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              Clear Filters
            </button>
          </aside>

          <section className={styles.productsArea}>
            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
            {loading ? (
              <p className={styles.status}>Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <p className={styles.status}>No products match your filters.</p>
            ) : (
              <div className={styles.grid}>
                {filteredProducts.map((product) => {
                  const discountPercent = product.hasOffer
                    ? getDiscountPercent(product.currentPrice, product.offerPrice)
                    : null;
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

                  return (
                  <article className={styles.card} key={product.id}>
                    <Link href={`/products/${product.id}`} className={styles.imageWrap}>
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
                    <h3>{product.name || 'Unnamed Product'}</h3>
                    <div className={styles.priceRow}>
                      {product.hasOffer ? <span className={styles.oldPrice}>{formatPrice(product.currentPrice)}</span> : null}
                      <span className={styles.salePrice}>{formatPrice(product.hasOffer ? product.offerPrice : product.price)}</span>
                      {discountPercent ? <span className={styles.discountTag}>-{discountPercent}%</span> : null}
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </main>
      <FooterSection />
    </>
  );
}

export default function UserProductsPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className={styles.page}>
            <section className={styles.hero}>
              <h1>Products</h1>
              <p>Discover every piece in our collection with easy search and smart filters.</p>
            </section>
            <p className={styles.status}>Loading products...</p>
          </main>
          <FooterSection />
        </>
      }
    >
      <UserProductsPageInner />
    </Suspense>
  );
}

