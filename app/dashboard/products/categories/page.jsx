'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import shellStyles from '../../dashboard.module.css';
import styles from '../products.module.css';
import { deleteCategory, getCategories, updateCategory } from '@/lib/firebase/firestore';

function mapDeleteError(error) {
  const msg = String(error?.message || '');
  if (msg.includes('CATEGORY_IN_USE')) {
    return 'Cannot delete this category because one or more products still use it. Reassign those products first.';
  }
  if (msg.includes('CATEGORY_NOT_FOUND')) return 'Category was not found.';
  return error?.message || 'Failed to delete category.';
}

function mapUpdateError(error) {
  const msg = String(error?.message || '');
  if (msg.includes('CATEGORY_NAME_REQUIRED')) return 'Please enter a category name.';
  if (msg.includes('CATEGORY_NOT_FOUND')) return 'Category was not found.';
  if (msg.includes('CATEGORY_NAME_CONFLICT')) {
    return 'Another category already uses this name. Choose a different name.';
  }
  if (msg.includes('CATEGORY_INVALID')) return 'This category cannot be edited.';
  return error?.message || 'Failed to update category.';
}

export default function DashboardCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const list = await getCategories();
        if (!cancelled) setCategories(list);
      } catch (error) {
        if (!cancelled) setErrorMessage(error?.message || 'Failed to load categories.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      setIsDeleting(true);
      await deleteCategory(deleteTarget.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMessage(`Category "${deleteTarget.name}" deleted.`);
    } catch (error) {
      setErrorMessage(mapDeleteError(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      setIsSaving(true);
      const updated = await updateCategory(editTarget.id, editName);
      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)).sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
        )
      );
      setEditTarget(null);
      setSuccessMessage(`Category renamed to "${updated.name}".`);
    } catch (error) {
      setErrorMessage(mapUpdateError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={shellStyles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={shellStyles.title}>Categories</h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#4d5b74' }}>
            Edit a name to rename it everywhere it is used (products and offers). Delete categories that are not assigned
            to any product.{' '}
            <Link href="/dashboard/products/add-product">Add categories when adding a product</Link>.
          </p>
        </div>
      </div>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

      {loading ? (
        <p className={styles.status}>Loading categories...</p>
      ) : categories.length === 0 ? (
        <p className={styles.status}>No categories yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <span className={styles.badge}>{cat.name || '-'}</span>
                  </td>
                  <td>
                    <span className={styles.actionGroup}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => {
                          setDeleteTarget(null);
                          setEditTarget(cat);
                          setEditName(cat.name || '');
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => {
                          setEditTarget(null);
                          setDeleteTarget(cat);
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget ? (
        <div
          className={styles.modalOverlay}
          onClick={() => !isSaving && setEditTarget(null)}
          role="presentation"
        >
          <div
            className={styles.confirmModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
          >
            <h2 id="edit-category-title">Edit category</h2>
            <p>
              Update the name for <strong>{editTarget.name}</strong>. Linked products and offers will use the new name.
            </p>
            <div className={styles.offerInputWrap}>
              <label htmlFor="edit-category-name">Name</label>
              <input
                id="edit-category-name"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                disabled={isSaving}
                autoComplete="off"
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setEditTarget(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="button" className={styles.offerBtn} onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)} role="presentation">
          <div className={styles.confirmModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <h2>Delete category</h2>
            <p>
              Delete <strong>{deleteTarget.name}</strong>? This cannot be undone if no products use this category.
            </p>
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
