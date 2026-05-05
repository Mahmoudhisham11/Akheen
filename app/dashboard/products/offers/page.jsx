'use client';

import { useEffect, useMemo, useState } from 'react';
import shellStyles from '../../dashboard.module.css';
import styles from '../products.module.css';
import { deleteOffer, getCategories, getOffers } from '@/lib/firebase/firestore';

function formatPrice(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return '-';
  return `${number.toFixed(2)} EGP`;
}

export default function DashboardOffersPage() {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [offerList, categoryList] = await Promise.all([getOffers(), getCategories()]);
        setOffers(offerList);
        setCategories(categoryList);
      } catch (error) {
        setErrorMessage(error?.message || 'Failed to load offers.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const datalistOptions = useMemo(() => {
    const names = offers.map((offer) => offer.name).filter(Boolean);
    return Array.from(new Set(names));
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const lowered = searchQuery.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesCategory = selectedCategory ? offer.category === selectedCategory : true;
      if (!lowered) return matchesCategory;

      const haystack = [offer.name, offer.description, offer.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesCategory && haystack.includes(lowered);
    });
  }, [offers, searchQuery, selectedCategory]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setErrorMessage('');
    setSuccessMessage('');
    try {
      setIsDeleting(true);
      await deleteOffer(deleteTarget.id);
      setOffers((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMessage('Offer deleted successfully.');
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to delete offer.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className={shellStyles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={shellStyles.title}>Offers</h1>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <input
            list="offers-search-list"
            placeholder="Search offers..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <datalist id="offers-search-list">
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
        <p className={styles.status}>Loading offers...</p>
      ) : filteredOffers.length === 0 ? (
        <p className={styles.status}>No offers found.</p>
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
                  <th>Offer Price</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <button type="button" className={styles.imageButton} onClick={() => setPreviewImageUrl(offer.imageUrl || '')}>
                        {offer.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={offer.imageUrl} alt={offer.name || 'Offer image'} className={styles.avatar} />
                        ) : (
                          <span className={styles.avatarFallback}>N/A</span>
                        )}
                      </button>
                    </td>
                    <td>
                      <p className={styles.productName}>{offer.name || '-'}</p>
                    </td>
                    <td>
                      <span className={styles.badge}>{offer.category || '-'}</span>
                    </td>
                    <td>{formatPrice(offer.currentPrice)}</td>
                    <td>{formatPrice(offer.offerPrice)}</td>
                    <td>{offer.quantity ?? '-'}</td>
                    <td>
                      <button type="button" className={styles.deleteBtn} onClick={() => setDeleteTarget(offer)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.cardsGrid}>
            {filteredOffers.map((offer) => (
              <article className={styles.card} key={`offer-card-${offer.id}`}>
                <button type="button" className={styles.cardImageButton} onClick={() => setPreviewImageUrl(offer.imageUrl || '')}>
                  {offer.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={offer.imageUrl} alt={offer.name || 'Offer image'} className={styles.cardImage} />
                  ) : (
                    <span className={styles.cardImageFallback}>N/A</span>
                  )}
                </button>
                <h3>{offer.name || '-'}</h3>
                <p>{offer.category || '-'}</p>
                <p>Price: {formatPrice(offer.currentPrice)}</p>
                <p>Offer: {formatPrice(offer.offerPrice)}</p>
                <p>Qty: {offer.quantity ?? '-'}</p>
                <button type="button" className={styles.deleteBtn} onClick={() => setDeleteTarget(offer)}>
                  Delete
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {previewImageUrl ? (
        <div className={styles.modalOverlay} onClick={() => setPreviewImageUrl('')} role="presentation">
          <div className={styles.imageModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Offer image preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImageUrl} alt="Full offer" className={styles.fullImage} />
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)} role="presentation">
          <div className={styles.confirmModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Delete offer confirmation">
            <h2>Delete Offer</h2>
            <p>Are you sure you want to delete offer for {deleteTarget.name || 'this product'}?</p>
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
    </section>
  );
}

