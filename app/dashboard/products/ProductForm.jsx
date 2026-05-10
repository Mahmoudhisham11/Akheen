'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import shellStyles from '../dashboard.module.css';
import styles from './add-product/add-product.module.css';
import { addCategory, addProduct, getCategories, updateProduct } from '@/lib/firebase/firestore';
import { uploadImageToCloudinary } from '@/lib/cloudinary/uploadImage';
import { deleteField, serverTimestamp } from 'firebase/firestore';

function AddPhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5H17C18.1 5 19 5.9 19 7V17C19 18.1 18.1 19 17 19H7C5.9 19 5 18.1 5 17V7C5 5.9 5.9 5 7 5Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 13L11.1 10.8C11.5 10.4 12.1 10.4 12.5 10.8L15 13.4L16.2 12.2C16.6 11.8 17.3 11.8 17.7 12.2L19 13.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.2" cy="9.1" r="1.2" />
      <path d="M12 3V7M10 5H14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function mapError(error) {
  const message = String(error?.message || '');
  if (message.includes('IMAGE_FILE_REQUIRED')) return 'Please select a product image.';
  if (message.includes('CATEGORY_NAME_REQUIRED')) return 'Category name is required.';
  if (message.includes('CLOUDINARY')) return 'Image upload failed. Please try another image.';
  return 'Something went wrong. Please try again.';
}

async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.warn('Cloudinary delete previous image:', payload?.error || response.status);
    }
  } catch (err) {
    console.warn('Cloudinary delete previous image failed:', err);
  }
}

function sizesFromProduct(product) {
  const raw = Array.isArray(product?.sizes) ? product.sizes : [];
  const rows = raw.map((item) => ({
    size: String(item?.size ?? '').trim(),
    quantity: item?.quantity !== undefined && item?.quantity !== null ? String(item.quantity) : '',
  }));
  return rows.length ? rows : [{ size: '', quantity: '' }];
}

/**
 * @param {{ mode: 'add' | 'edit'; productId?: string; initialProduct?: object | null }} props
 */
export default function ProductForm({ mode, productId, initialProduct }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [sizes, setSizes] = useState([{ size: '', quantity: '' }]);
  const [manualQuantity, setManualQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [baselineImageUrl, setBaselineImageUrl] = useState('');
  const [baselinePublicId, setBaselinePublicId] = useState('');

  const [selectedImage2, setSelectedImage2] = useState(null);
  const [previewUrl2, setPreviewUrl2] = useState('');
  const [baselineImageUrl2, setBaselineImageUrl2] = useState('');
  const [baselinePublicId2, setBaselinePublicId2] = useState('');
  const [removeSecondImage, setRemoveSecondImage] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const isBusy = useMemo(() => isSubmitting || isAddingCategory, [isSubmitting, isAddingCategory]);

  const normalizedSizeRows = useMemo(
    () =>
      sizes.map((item) => ({
        size: String(item.size || '').trim(),
        quantityRaw: String(item.quantity ?? ''),
        quantity: Number(item.quantity),
      })),
    [sizes]
  );
  const hasAnySizeInput = useMemo(
    () => normalizedSizeRows.some((item) => item.size || item.quantityRaw !== ''),
    [normalizedSizeRows]
  );
  const hasPartialSizeRow = useMemo(
    () =>
      normalizedSizeRows.some(
        (item) => (item.size && item.quantityRaw === '') || (!item.size && item.quantityRaw !== '')
      ),
    [normalizedSizeRows]
  );
  const effectiveSizes = useMemo(
    () =>
      normalizedSizeRows.filter(
        (item) =>
          item.size &&
          item.quantityRaw !== '' &&
          Number.isFinite(item.quantity) &&
          item.quantity >= 0 &&
          Number.isInteger(item.quantity)
      ),
    [normalizedSizeRows]
  );
  const inventoryMode = effectiveSizes.length > 0 ? 'sizes' : 'manual';
  const totalQuantity = useMemo(
    () =>
      inventoryMode === 'sizes'
        ? effectiveSizes.reduce((sum, item) => sum + item.quantity, 0)
        : Number(manualQuantity) > 0
          ? Number(manualQuantity)
          : 0,
    [effectiveSizes, inventoryMode, manualQuantity]
  );

  useEffect(() => {
    async function loadCategories() {
      try {
        const list = await getCategories();
        setCategories(list);
      } catch (error) {
        setFeedbackError(mapError(error));
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !initialProduct) return;
    const p = initialProduct;
    setName(p.name || '');
    setDescription(p.description || '');
    setPrice(p.price !== undefined && p.price !== null ? String(p.price) : '');
    setCategory(p.category || '');
    setBaselineImageUrl(p.imageUrl || '');
    setBaselinePublicId(p.imagePublicId || '');
    setBaselineImageUrl2(p.imageUrl2 || '');
    setBaselinePublicId2(p.imagePublicId2 || '');
    setSelectedImage(null);
    setSelectedImage2(null);
    setRemoveSecondImage(false);

    const sizeRows = sizesFromProduct(p);
    const hasStoredSizes = Array.isArray(p.sizes) && p.sizes.some((row) => String(row?.size || '').trim());
    if (hasStoredSizes) {
      setSizes(sizeRows.length ? sizeRows : [{ size: '', quantity: '' }]);
      setManualQuantity('');
    } else {
      setSizes([{ size: '', quantity: '' }]);
      setManualQuantity(p.quantity !== undefined && p.quantity !== null ? String(p.quantity) : '');
    }
  }, [mode, initialProduct]);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  useEffect(() => {
    if (!selectedImage2) {
      setPreviewUrl2('');
      return;
    }
    const objectUrl = URL.createObjectURL(selectedImage2);
    setPreviewUrl2(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage2]);

  const resetFeedback = () => {
    setFeedbackError('');
    setFeedbackSuccess('');
  };

  const validateProductForm = () => {
    const hasImage = mode === 'add' ? Boolean(selectedImage) : Boolean(selectedImage || baselineImageUrl);
    if (!hasImage) return 'Please add a product image.';
    if (!name.trim()) return 'Product name is required.';
    if (!description.trim()) return 'Product description is required.';
    if (!price || Number(price) <= 0) return 'Price should be greater than zero.';
    if (!category) return 'Please select a category.';
    if (inventoryMode === 'sizes') {
      if (hasPartialSizeRow) return 'Each filled size row must include both size and quantity.';
      if (!effectiveSizes.length) return 'Please add at least one valid size.';
      const unique = new Set(effectiveSizes.map((item) => item.size.toLowerCase()));
      if (unique.size !== effectiveSizes.length) return 'Duplicate sizes are not allowed.';
    } else {
      if (hasAnySizeInput && hasPartialSizeRow) return 'Each filled size row must include both size and quantity.';
      if (manualQuantity === '' || Number(manualQuantity) < 0 || !Number.isInteger(Number(manualQuantity))) {
        return 'Manual quantity must be a whole number zero or higher.';
      }
    }
    return '';
  };

  const updateSizeRow = (index, key, value) => {
    setSizes((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
  };

  const addSizeRow = () => {
    setSizes((prev) => [...prev, { size: '', quantity: '' }]);
  };

  const removeSizeRow = (index) => {
    setSizes((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleImage1Change = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
  };

  const handleImage2Change = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImage2(file);
    setRemoveSecondImage(false);
  };

  const handleRemoveSecondImage = () => {
    setRemoveSecondImage(true);
    setSelectedImage2(null);
  };

  const handleAddCategory = async (event) => {
    event.preventDefault();
    resetFeedback();

    if (!newCategoryName.trim()) {
      setFeedbackError('Please enter a category name.');
      return;
    }

    try {
      setIsAddingCategory(true);
      const createdCategory = await addCategory(newCategoryName);
      setCategories((prev) => {
        const exists = prev.some((item) => item.id === createdCategory.id);
        if (exists) return prev;
        return [...prev, createdCategory].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      });
      setCategory(createdCategory.name);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      setFeedbackSuccess('Category added successfully.');
    } catch (error) {
      setFeedbackError(mapError(error));
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetFeedback();

    const validationError = validateProductForm();
    if (validationError) {
      setFeedbackError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      const computedQuantity =
        inventoryMode === 'sizes'
          ? effectiveSizes.reduce((sum, item) => sum + item.quantity, 0)
          : Number(manualQuantity);

      let imageUrl = baselineImageUrl;
      let imagePublicId = baselinePublicId;

      if (selectedImage) {
        const uploaded = await uploadImageToCloudinary(selectedImage);
        imageUrl = uploaded.imageUrl;
        imagePublicId = uploaded.imagePublicId || '';

        if (mode === 'edit' && baselinePublicId && baselinePublicId !== imagePublicId) {
          await deleteCloudinaryImage(baselinePublicId);
        }
      }

      let imageUrl2 = baselineImageUrl2;
      let imagePublicId2 = baselinePublicId2;

      if (mode === 'edit' && removeSecondImage) {
        if (baselinePublicId2) {
          await deleteCloudinaryImage(baselinePublicId2);
        }
      } else if (selectedImage2) {
        const uploaded2 = await uploadImageToCloudinary(selectedImage2);
        imageUrl2 = uploaded2.imageUrl;
        imagePublicId2 = uploaded2.imagePublicId || '';

        if (mode === 'edit' && baselinePublicId2 && baselinePublicId2 !== imagePublicId2) {
          await deleteCloudinaryImage(baselinePublicId2);
        }
      }

      const basePayload = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        quantity: computedQuantity,
        sizes: inventoryMode === 'sizes' ? effectiveSizes.map((item) => ({ size: item.size, quantity: item.quantity })) : [],
        inventoryMode,
        category,
        imageUrl,
        imagePublicId,
      };

      if (mode === 'add') {
        const addPayload = {
          ...basePayload,
          ...(imageUrl2 && imagePublicId2 ? { imageUrl2, imagePublicId2 } : {}),
        };
        await addProduct(addPayload);
        setName('');
        setDescription('');
        setPrice('');
        setSizes([{ size: '', quantity: '' }]);
        setManualQuantity('');
        setCategory('');
        setSelectedImage(null);
        setSelectedImage2(null);
        setBaselineImageUrl('');
        setBaselinePublicId('');
        setBaselineImageUrl2('');
        setBaselinePublicId2('');
        setRemoveSecondImage(false);
        setFeedbackSuccess('Product added successfully.');
      } else {
        const editPayload = {
          ...basePayload,
          updatedAt: serverTimestamp(),
        };

        if (removeSecondImage) {
          editPayload.imageUrl2 = deleteField();
          editPayload.imagePublicId2 = deleteField();
        } else if (selectedImage2) {
          editPayload.imageUrl2 = imageUrl2;
          editPayload.imagePublicId2 = imagePublicId2;
        }

        await updateProduct(productId, editPayload);
        router.push('/dashboard/products');
      }
    } catch (error) {
      setFeedbackError(mapError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageDisplaySrc = previewUrl || baselineImageUrl;
  const secondDisplaySrc = removeSecondImage ? '' : previewUrl2 || baselineImageUrl2;

  const pageTitle = mode === 'add' ? 'Add Product' : 'Edit Product';
  const submitLabel =
    mode === 'add'
      ? isSubmitting
        ? 'Saving Product...'
        : 'Save Product'
      : isSubmitting
        ? 'Updating...'
        : 'Update Product';

  const showSecondHint = mode === 'edit' && Boolean(baselineImageUrl2);
  const showRemoveSecond = mode === 'edit' && Boolean(baselineImageUrl2 || selectedImage2) && !removeSecondImage;

  return (
    <section className={shellStyles.shell}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={shellStyles.title}>{pageTitle}</h1>
        </div>
        <button type="button" className={styles.secondaryBtn} onClick={() => setIsCategoryModalOpen(true)} disabled={isBusy}>
          Add Category
        </button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.imagePickersRow}>
          <div>
            <p className={styles.imageSlotLabel}>Primary image (cart & listings)</p>
            <label className={styles.imagePicker}>
              <input type="file" accept="image/*" onChange={handleImage1Change} className={styles.hiddenInput} disabled={isBusy} />
              {imageDisplaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageDisplaySrc} alt="Primary product preview" className={styles.previewImage} />
              ) : (
                <span className={styles.imagePlaceholder}>
                  <span className={styles.placeholderIcon}>
                    <AddPhotoIcon />
                  </span>
                  <span>Click to upload primary image</span>
                </span>
              )}
            </label>
            {mode === 'edit' && baselineImageUrl ? (
              <p className={styles.modeHint}>Choose a new file only if you want to replace the primary image.</p>
            ) : null}
          </div>

          <div>
            <p className={styles.imageSlotLabel}>Second image (optional, product page gallery)</p>
            <label className={`${styles.imagePicker} ${styles.imagePickerSecondary}`}>
              <input type="file" accept="image/*" onChange={handleImage2Change} className={styles.hiddenInput} disabled={isBusy} />
              {secondDisplaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={secondDisplaySrc} alt="Second product preview" className={styles.previewImage} />
              ) : (
                <span className={styles.imagePlaceholder}>
                  <span className={styles.placeholderIcon}>
                    <AddPhotoIcon />
                  </span>
                  <span>Second image (optional)</span>
                </span>
              )}
            </label>
            {showSecondHint ? (
              <p className={styles.modeHint}>Choose a new file to replace the second image.</p>
            ) : null}
            {showRemoveSecond ? (
              <button type="button" className={styles.removeSecondImageBtn} onClick={handleRemoveSecondImage} disabled={isBusy}>
                Remove second image
              </button>
            ) : null}
            {removeSecondImage && mode === 'edit' ? (
              <p className={styles.modeHint}>Second image will be removed when you save.</p>
            ) : null}
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Product Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} disabled={isBusy} />
          </label>

          <label className={styles.field}>
            <span>Price</span>
            <input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} disabled={isBusy} />
          </label>

          <div className={styles.field}>
            <span>Category</span>
            <div className={styles.categoryRow}>
              <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={isBusy}>
                <option value="">Select category</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.sizesBlock}>
          <div className={styles.sizesHeader}>
            <span>Available Sizes</span>
            <button type="button" className={styles.secondaryBtn} onClick={addSizeRow} disabled={isBusy}>
              Add Size
            </button>
          </div>
          <p className={styles.modeHint}>
            Auto mode: if you fill valid sizes, inventory uses sizes. If not, manual quantity is used.
          </p>

          <div className={styles.sizesList}>
            {sizes.map((item, index) => (
              <div className={styles.sizeRow} key={`size-row-${index}`}>
                <label className={styles.field}>
                  <span>Size</span>
                  <input
                    placeholder="e.g. 38 or M"
                    value={item.size}
                    onChange={(event) => updateSizeRow(index, 'size', event.target.value)}
                    disabled={isBusy}
                  />
                </label>

                <label className={styles.field}>
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateSizeRow(index, 'quantity', event.target.value)}
                    disabled={isBusy}
                  />
                </label>

                <button
                  type="button"
                  className={styles.removeSizeBtn}
                  onClick={() => removeSizeRow(index)}
                  disabled={isBusy || sizes.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className={styles.manualQtyWrap}>
            <label className={styles.field}>
              <span>Quantity (manual fallback)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={manualQuantity}
                onChange={(event) => setManualQuantity(event.target.value)}
                disabled={isBusy}
              />
            </label>
          </div>

          <p className={styles.totalQtyText}>
            Total quantity (auto): {totalQuantity} ({inventoryMode === 'sizes' ? 'from sizes' : 'manual'})
          </p>
        </div>

        <label className={styles.field}>
          <span>Description</span>
          <textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} disabled={isBusy} />
        </label>

        {feedbackError ? <p className={styles.error}>{feedbackError}</p> : null}
        {feedbackSuccess ? <p className={styles.success}>{feedbackSuccess}</p> : null}

        <button type="submit" className={styles.primaryBtn} disabled={isBusy}>
          {submitLabel}
        </button>
      </form>

      {isCategoryModalOpen ? (
        <div className={styles.modalOverlay} onClick={() => setIsCategoryModalOpen(false)} role="presentation">
          <div className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add category">
            <h2>Add Category</h2>
            <form onSubmit={handleAddCategory} className={styles.modalForm}>
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Category name"
                disabled={isBusy}
              />
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setIsCategoryModalOpen(false)} disabled={isBusy}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={isBusy}>
                  {isAddingCategory ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
