'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import shellStyles from '../../../dashboard.module.css';
import styles from '../../add-product/add-product.module.css';
import productsStyles from '../../products.module.css';
import ProductForm from '../../ProductForm';
import { getProduct } from '@/lib/firebase/firestore';

export default function DashboardEditProductPage() {
  const params = useParams();
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError('');
        const data = await getProduct(productId);
        if (!cancelled) setProduct(data);
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setLoadError(error?.message || 'Product not found.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!productId) {
    return (
      <section className={shellStyles.shell}>
        <p className={styles.error}>Invalid product.</p>
        <Link href="/dashboard/products">Back to products</Link>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={shellStyles.shell}>
        <p className={productsStyles.status}>Loading product...</p>
      </section>
    );
  }

  if (loadError || !product) {
    return (
      <section className={shellStyles.shell}>
        <p className={styles.error}>{loadError || 'Product not found.'}</p>
        <Link href="/dashboard/products">Back to products</Link>
      </section>
    );
  }

  return <ProductForm mode="edit" productId={productId} initialProduct={product} />;
}
