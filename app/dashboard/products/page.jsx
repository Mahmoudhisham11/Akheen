'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import shellStyles from '../dashboard.module.css';
import styles from './products.module.css';
import { deleteOffersForProduct, deleteProduct, getCategories, getProducts, saveOffer } from '@/lib/firebase/firestore';

function formatPrice(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return '-';
  return `${number.toFixed(2)} EGP`;
}

export default function DashboardProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [offerTarget, setOfferTarget] = useState(null);
  const [offerPriceInput, setOfferPriceInput] = useState('');
  const [isSavingOffer, setIsSavingOffer] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productList, categoryList] = await Promise.all([getProducts(), getCategories()]);
        setProducts(productList);
        setCategories(categoryList);
      } catch (error) {
        setErrorMessage(error?.message || 'Failed to load products.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const datalistOptions = useMemo(() => {
    const names = products.map((product) => product.name).filter(Boolean);
    return Array.from(new Set(names));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const lowered = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
      if (!lowered) return matchesCategory;

      const haystack = [product.name, product.description, product.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesCategory && haystack.includes(lowered);
    });
  }, [products, searchQuery, selectedCategory]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setErrorMessage('');
    setSuccessMessage('');
    try {
      setIsDeleting(true);

      const cloudinaryIds = Array.from(
        new Set([deleteTarget.imagePublicId, deleteTarget.imagePublicId2].filter(Boolean))
      );
      for (const publicId of cloudinaryIds) {
        const response = await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) {
          if (payload?.error === 'CLOUDINARY_ENV_MISSING') {
            throw new Error(
              'Cloudinary is not configured on the server. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your hosting site (e.g. Netlify environment variables), redeploy, then try again.'
            );
          }
          throw new Error(
            typeof payload?.error === 'string' ? payload.error : 'Failed to delete image from Cloudinary.'
          );
        }
        const result = payload?.result;
        if (result !== 'ok' && result !== 'not found') {
          throw new Error('Unexpected response when deleting image from Cloudinary.');
        }
      }

      await deleteOffersForProduct(deleteTarget.id);
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMessage('Product and related data deleted successfully.');
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openOfferPopup = (product) => {
    setErrorMessage('');
    setSuccessMessage('');
    setOfferTarget(product);
    setOfferPriceInput('');
  };

  const handleSaveOffer = async () => {
    if (!offerTarget) return;

    const parsedOfferPrice = Number(offerPriceInput);
    if (!offerPriceInput || Number.isNaN(parsedOfferPrice) || parsedOfferPrice <= 0) {
      setErrorMessage('Please enter a valid offer price.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    try {
      setIsSavingOffer(true);
      await saveOffer({
        productId: offerTarget.id,
        name: offerTarget.name,
        description: offerTarget.description,
        category: offerTarget.category,
        imageUrl: offerTarget.imageUrl,
        imagePublicId: offerTarget.imagePublicId,
        currentPrice: offerTarget.price,
        offerPrice: parsedOfferPrice,
        quantity: offerTarget.quantity,
      });
      setOfferTarget(null);
      setOfferPriceInput('');
      setSuccessMessage('Offer saved successfully.');
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to save offer.');
    } finally {
      setIsSavingOffer(false);
    }
  };

  return (
    <section className={shellStyles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={shellStyles.title}>Products</h1>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <input
            list="products-search-list"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <datalist id="products-search-list">
            {datalistOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

      {loading ? (
        <p className={styles.status}>Loading products...</p>
      ) : filteredProducts.length === 0 ? (
        <p className={styles.status}>No products found.</p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <button type="button" className={styles.imageButton} onClick={() => setPreviewImageUrl(product.imageUrl || '')}>
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt={product.name || 'Product image'} className={styles.avatar} />
                        ) : (
                          <span className={styles.avatarFallback}>N/A</span>
                        )}
                      </button>
                    </td>
                    <td>
                      <p className={styles.productName}>{product.name || '-'}</p>
                    </td>
                    <td>
                      <span className={styles.badge}>{product.category || '-'}</span>
                    </td>
                    <td>{formatPrice(product.price)}</td>
                    <td>{product.quantity ?? '-'}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        <Link href={`/dashboard/products/${product.id}/edit`} className={styles.editBtn}>
                          Edit
                        </Link>
                        <button type="button" className={styles.offerBtn} onClick={() => openOfferPopup(product)}>
                          Offer
                        </button>
                        <button type="button" className={styles.deleteBtn} onClick={() => setDeleteTarget(product)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.cardsGrid}>
            {filteredProducts.map((product) => (
              <article className={styles.card} key={`card-${product.id}`}>
                <button type="button" className={styles.cardImageButton} onClick={() => setPreviewImageUrl(product.imageUrl || '')}>
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name || 'Product image'} className={styles.cardImage} />
                  ) : (
                    <span className={styles.cardImageFallback}>N/A</span>
                  )}
                </button>
                <h3>{product.name || '-'}</h3>
                <p>{product.category || '-'}</p>
                <p>{formatPrice(product.price)}</p>
                <p>Qty: {product.quantity ?? '-'}</p>
                <div className={`${styles.actionGroup} ${styles.cardActionRow}`}>
                  <Link
                    href={`/dashboard/products/${product.id}/edit`}
                    className={`${styles.editBtn} ${styles.cardActionBtn}`}
                    aria-label="Edit product"
                    title="Edit"
                  >
                    <svg className={styles.cardActionIcon} viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span className={styles.cardActionLabel}>Edit</span>
                  </Link>
                  <button
                    type="button"
                    className={`${styles.offerBtn} ${styles.cardActionBtn}`}
                    onClick={() => openOfferPopup(product)}
                    aria-label="Create offer"
                    title="Offer"
                  >
                    <svg className={styles.cardActionIcon} viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                      />
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6h.008v.008H6V6z"
                      />
                    </svg>
                    <span className={styles.cardActionLabel}>Offer</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.deleteBtn} ${styles.cardActionBtn}`}
                    onClick={() => setDeleteTarget(product)}
                    aria-label="Delete product"
                    title="Delete"
                  >
                    <svg className={styles.cardActionIcon} viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span className={styles.cardActionLabel}>Delete</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {previewImageUrl ? (
        <div className={styles.modalOverlay} onClick={() => setPreviewImageUrl('')} role="presentation">
          <div className={styles.imageModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Product image preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImageUrl} alt="Full product" className={styles.fullImage} />
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)} role="presentation">
          <div className={styles.confirmModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Delete confirmation">
            <h2>Delete Product</h2>
            <p>Are you sure you want to delete {deleteTarget.name || 'this product'}?</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {offerTarget ? (
        <div className={styles.modalOverlay} onClick={() => setOfferTarget(null)} role="presentation">
          <div className={styles.confirmModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create offer">
            <h2>Create Offer</h2>
            <p>Current price: {formatPrice(offerTarget.price)}</p>
            <div className={styles.offerInputWrap}>
              <label htmlFor="offer-price">New offer price</label>
              <input
                id="offer-price"
                type="number"
                min="0"
                step="0.01"
                value={offerPriceInput}
                onChange={(event) => setOfferPriceInput(event.target.value)}
                placeholder="Enter offer price"
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setOfferTarget(null)} disabled={isSavingOffer}>
                Cancel
              </button>
              <button type="button" className={styles.offerBtn} onClick={handleSaveOffer} disabled={isSavingOffer}>
                {isSavingOffer ? 'Saving...' : 'Save Offer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

