import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import app from './config';

// Initialize Firestore
const db = getFirestore(app);
const ORDER_STATUSES = ['in_delivery', 'delivered', 'cancelled'];

function normalizeSizeLabel(value) {
  return String(value || '').trim().toLowerCase();
}

function getRowQuantity(row) {
  const parsed = Number(row?.quantity ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeNextInventory(productData, orderItem, direction) {
  const itemQuantity = Number(orderItem?.quantity ?? 0);
  if (!Number.isFinite(itemQuantity) || itemQuantity <= 0) {
    return null;
  }

  const sizes = Array.isArray(productData?.sizes) ? productData.sizes : [];
  const hasSizeInventory = sizes.some((row) => normalizeSizeLabel(row?.size));

  if (hasSizeInventory) {
    const targetSize = normalizeSizeLabel(orderItem?.size);
    let found = false;

    const nextSizes = sizes.map((row) => {
      const rowSize = normalizeSizeLabel(row?.size);
      const currentQty = getRowQuantity(row);
      if (rowSize !== targetSize) {
        return { ...row, quantity: currentQty };
      }

      found = true;
      const nextQty = currentQty + direction * itemQuantity;
      if (nextQty < 0) {
        throw new Error(`INSUFFICIENT_STOCK:${productData?.name || orderItem?.productId || 'product'}`);
      }
      return { ...row, quantity: nextQty };
    });

    if (!found) {
      throw new Error(`SIZE_NOT_FOUND:${orderItem?.size || 'size'}`);
    }

    const nextTotalQty = nextSizes.reduce((sum, row) => sum + getRowQuantity(row), 0);
    return {
      quantity: nextTotalQty,
      sizes: nextSizes,
      updatedAt: serverTimestamp(),
    };
  }

  const currentQty = Number(productData?.quantity ?? 0);
  const safeCurrentQty = Number.isFinite(currentQty) ? currentQty : 0;
  const nextQty = safeCurrentQty + direction * itemQuantity;

  if (nextQty < 0) {
    throw new Error(`INSUFFICIENT_STOCK:${productData?.name || orderItem?.productId || 'product'}`);
  }

  return {
    quantity: nextQty,
    updatedAt: serverTimestamp(),
  };
}

function shouldRestoreStock(orderData) {
  return orderData?.status === 'delivered' && Boolean(orderData?.stockApplied);
}

async function applyInventoryForOrderItems(transaction, orderItems, direction) {
  const uniqueProductIds = Array.from(
    new Set(orderItems.map((item) => item?.productId).filter(Boolean))
  );

  const productDocs = new Map();
  for (const productId of uniqueProductIds) {
    const productRef = doc(db, 'products', productId);
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error(`PRODUCT_NOT_FOUND:${productId}`);
    }
    productDocs.set(productId, {
      ref: productRef,
      data: productSnap.data(),
    });
  }

  for (const item of orderItems) {
    if (!item?.productId) continue;
    const productEntry = productDocs.get(item.productId);
    if (!productEntry) continue;

    const nextInventory = computeNextInventory(productEntry.data, item, direction);
    if (!nextInventory) continue;

    productEntry.data = {
      ...productEntry.data,
      ...nextInventory,
    };
    transaction.update(productEntry.ref, nextInventory);
  }
}

// ========== Products Helpers ==========

/**
 * Get all products
 * @param {string} category - Optional category filter
 * @param {number} limitCount - Optional result limit
 * @returns {Promise<Array>} Array of products
 */
export async function getProducts(category = null, limitCount = null) {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef, orderBy('createdAt', 'desc'));
    
    if (category) {
      q = query(productsRef, where('category', '==', category), orderBy('createdAt', 'desc'));
    }

    if (typeof limitCount === 'number' && limitCount > 0) {
      if (category) {
        q = query(productsRef, where('category', '==', category), orderBy('createdAt', 'desc'), limit(limitCount));
      } else {
        q = query(productsRef, orderBy('createdAt', 'desc'), limit(limitCount));
      }
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

/**
 * Get a single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Product object
 */
export async function getProduct(id) {
  try {
    const productRef = doc(db, 'products', id);
    const productSnap = await getDoc(productRef);
    
    if (productSnap.exists()) {
      return {
        id: productSnap.id,
        ...productSnap.data()
      };
    } else {
      throw new Error('Product not found');
    }
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
}

/**
 * Add a new product
 * @param {Object} productData - Product data object
 * @returns {Promise<string>} Product ID
 */
export async function addProduct(productData) {
  try {
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
      ...productData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

/**
 * Update a product
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<void>}
 */
export async function updateProduct(id, productData) {
  try {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, productData);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product
 * @param {string} id - Product ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(id) {
  try {
    const productRef = doc(db, 'products', id);
    await deleteDoc(productRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Get all product categories.
 * @returns {Promise<Array>} Array of categories
 */
export async function getCategories() {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((categoryDoc) => ({
      id: categoryDoc.id,
      ...categoryDoc.data(),
    }));
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

/**
 * Add a new category if it does not exist.
 * @param {string} name - Category name
 * @returns {Promise<Object>} Created or existing category
 */
export async function addCategory(name) {
  try {
    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLowerCase();

    if (!trimmedName) {
      throw new Error('CATEGORY_NAME_REQUIRED');
    }

    const categoriesRef = collection(db, 'categories');
    const existingQuery = query(categoriesRef, where('normalizedName', '==', normalizedName), limit(1));
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0];
      return { id: existing.id, ...existing.data() };
    }

    const payload = {
      name: trimmedName,
      normalizedName,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(categoriesRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}

/**
 * Delete a category document if no product uses that category name.
 * @param {string} categoryId - Firestore category document id
 */
export async function deleteCategory(categoryId) {
  try {
    if (!categoryId) {
      throw new Error('CATEGORY_ID_REQUIRED');
    }
    const catRef = doc(db, 'categories', categoryId);
    const catSnap = await getDoc(catRef);
    if (!catSnap.exists()) {
      throw new Error('CATEGORY_NOT_FOUND');
    }
    const categoryName = String(catSnap.data()?.name || '').trim();
    if (!categoryName) {
      throw new Error('CATEGORY_INVALID');
    }

    const productsRef = collection(db, 'products');
    const inUseQuery = query(productsRef, where('category', '==', categoryName), limit(1));
    const inUseSnap = await getDocs(inUseQuery);
    if (!inUseSnap.empty) {
      throw new Error('CATEGORY_IN_USE');
    }

    await deleteDoc(catRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

const FIRESTORE_BATCH_MAX_OPS = 500;

/**
 * Rename a category and migrate product/offer `category` string fields.
 * Uses chunked batches; brief inconsistency is possible only mid-operation for large catalogs.
 * @param {string} categoryId - Firestore category document id
 * @param {string} newName - New display name
 * @returns {Promise<Object>} Updated category row
 */
export async function updateCategory(categoryId, newName) {
  try {
    if (!categoryId) {
      throw new Error('CATEGORY_ID_REQUIRED');
    }
    const trimmedName = String(newName || '').trim();
    const normalizedName = trimmedName.toLowerCase();

    if (!trimmedName) {
      throw new Error('CATEGORY_NAME_REQUIRED');
    }

    const catRef = doc(db, 'categories', categoryId);
    const catSnap = await getDoc(catRef);
    if (!catSnap.exists()) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    const prevData = catSnap.data();
    const oldName = String(prevData?.name || '').trim();
    if (!oldName) {
      throw new Error('CATEGORY_INVALID');
    }

    if (trimmedName === oldName) {
      return { id: categoryId, ...prevData };
    }

    const categoriesRef = collection(db, 'categories');
    const dupQuery = query(categoriesRef, where('normalizedName', '==', normalizedName), limit(2));
    const dupSnap = await getDocs(dupQuery);
    const conflict = dupSnap.docs.find((d) => d.id !== categoryId);
    if (conflict) {
      throw new Error('CATEGORY_NAME_CONFLICT');
    }

    const productsRef = collection(db, 'products');
    const offersRef = collection(db, 'offers');
    const [productsSnap, offersSnap] = await Promise.all([
      getDocs(query(productsRef, where('category', '==', oldName))),
      getDocs(query(offersRef, where('category', '==', oldName))),
    ]);

    const refList = [
      ...productsSnap.docs.map((d) => d.ref),
      ...offersSnap.docs.map((d) => d.ref),
    ];

    let idx = 0;
    if (refList.length === 0) {
      const batch = writeBatch(db);
      batch.update(catRef, { name: trimmedName, normalizedName });
      await batch.commit();
    } else {
      while (idx < refList.length) {
        const left = refList.length - idx;
        const batch = writeBatch(db);
        if (left + 1 <= FIRESTORE_BATCH_MAX_OPS) {
          for (let j = idx; j < refList.length; j += 1) {
            batch.update(refList[j], { category: trimmedName });
          }
          batch.update(catRef, { name: trimmedName, normalizedName });
          await batch.commit();
          idx = refList.length;
        } else {
          for (let j = 0; j < 499; j += 1) {
            batch.update(refList[idx + j], { category: trimmedName });
          }
          idx += 499;
          await batch.commit();
        }
      }
    }

    return {
      id: categoryId,
      ...prevData,
      name: trimmedName,
      normalizedName,
    };
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Create or update one offer per product.
 * @param {Object} offerData - Offer payload
 * @returns {Promise<Object>} Stored offer payload
 */
export async function saveOffer(offerData) {
  try {
    if (!offerData?.productId) {
      throw new Error('OFFER_PRODUCT_ID_REQUIRED');
    }

    const offersRef = collection(db, 'offers');
    const existingQuery = query(offersRef, where('productId', '==', offerData.productId), limit(1));
    const existingSnapshot = await getDocs(existingQuery);

    const payload = {
      productId: offerData.productId,
      name: offerData.name || '',
      description: offerData.description || '',
      category: offerData.category || '',
      imageUrl: offerData.imageUrl || '',
      imagePublicId: offerData.imagePublicId || '',
      currentPrice: Number(offerData.currentPrice || 0),
      offerPrice: Number(offerData.offerPrice || 0),
      quantity: Number(offerData.quantity ?? 0),
      updatedAt: serverTimestamp(),
    };

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0];
      const existingRef = doc(db, 'offers', existing.id);
      await updateDoc(existingRef, payload);
      return { id: existing.id, ...payload };
    }

    const createPayload = {
      ...payload,
      createdAt: serverTimestamp(),
    };
    const created = await addDoc(offersRef, createPayload);
    return { id: created.id, ...createPayload };
  } catch (error) {
    console.error('Error saving offer:', error);
    throw error;
  }
}

/**
 * Get all offers.
 * @param {number} limitCount - Optional result limit
 * @returns {Promise<Array>} Array of offers
 */
export async function getOffers(limitCount = null) {
  try {
    const offersRef = collection(db, 'offers');
    let q = query(offersRef, orderBy('updatedAt', 'desc'));
    if (typeof limitCount === 'number' && limitCount > 0) {
      q = query(offersRef, orderBy('updatedAt', 'desc'), limit(limitCount));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((offerDoc) => ({
      id: offerDoc.id,
      ...offerDoc.data(),
    }));
  } catch (error) {
    console.error('Error getting offers:', error);
    throw error;
  }
}

/**
 * Delete offer by id.
 * @param {string} id - Offer document id
 * @returns {Promise<void>}
 */
export async function deleteOffer(id) {
  try {
    const offerRef = doc(db, 'offers', id);
    await deleteDoc(offerRef);
  } catch (error) {
    console.error('Error deleting offer:', error);
    throw error;
  }
}

// ========== Orders Helpers ==========

/**
 * Get all orders
 * @returns {Promise<Array>} Array of orders
 */
export async function getOrders() {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
}

/**
 * Get a single order by ID
 * @param {string} id - Order ID
 * @returns {Promise<Object>} Order object
 */
export async function getOrder(id) {
  try {
    const orderRef = doc(db, 'orders', id);
    const orderSnap = await getDoc(orderRef);
    
    if (orderSnap.exists()) {
      return {
        id: orderSnap.id,
        ...orderSnap.data()
      };
    } else {
      throw new Error('Order not found');
    }
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
}

/**
 * Create a new order
 * @param {Object} orderData - Order data object
 * @returns {Promise<{id: string, orderNumber: string}>} Order document meta
 */
export async function createOrder(orderData) {
  try {
    const orderCounterRef = doc(db, 'meta', 'orderCounter');
    const nextSequence = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(orderCounterRef);
      const current = counterSnap.exists() ? Number(counterSnap.data()?.lastOrderNumber || 1000) : 1000;
      const next = current + 1;
      transaction.set(orderCounterRef, { lastOrderNumber: next }, { merge: true });
      return next;
    });

    const orderNumber = `ORD-${nextSequence}`;
    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, {
      ...orderData,
      status: 'in_delivery',
      orderNumber,
      stockApplied: false,
      stockAppliedAt: null,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, orderNumber };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Update order status
 * @param {string} id - Order ID
 * @param {string} status - New status (in_delivery, delivered, cancelled)
 * @returns {Promise<void>}
 */
export async function updateOrderStatus(id, status) {
  try {
    if (!ORDER_STATUSES.includes(status)) {
      throw new Error('INVALID_ORDER_STATUS');
    }

    const orderRef = doc(db, 'orders', id);
    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const orderData = orderSnap.data();
      const currentStatus = orderData?.status || 'in_delivery';
      const stockApplied = Boolean(orderData?.stockApplied);

      if (currentStatus === 'delivered' && status === 'in_delivery') {
        throw new Error('INVALID_STATUS_TRANSITION');
      }

      const shouldDeduct = status === 'delivered' && currentStatus !== 'delivered' && !stockApplied;
      const shouldRestore = status === 'cancelled' && stockApplied;

      if (shouldDeduct || shouldRestore) {
        const direction = shouldDeduct ? -1 : 1;
        const orderItems = Array.isArray(orderData?.items) ? orderData.items : [];
        await applyInventoryForOrderItems(transaction, orderItems, direction);
      }

      transaction.update(orderRef, {
        status,
        stockApplied: shouldDeduct ? true : shouldRestore ? false : stockApplied,
        stockAppliedAt: shouldDeduct ? serverTimestamp() : shouldRestore ? null : orderData?.stockAppliedAt ?? null,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Delete order by id.
 * If order was delivered and stock was applied, stock is restored before deletion.
 * @param {string} id - Order document id
 * @returns {Promise<void>}
 */
export async function deleteOrder(id) {
  try {
    const orderRef = doc(db, 'orders', id);
    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const orderData = orderSnap.data();
      const orderItems = Array.isArray(orderData?.items) ? orderData.items : [];

      if (shouldRestoreStock(orderData)) {
        await applyInventoryForOrderItems(transaction, orderItems, 1);
      }

      transaction.delete(orderRef);
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
}

// ========== Users Helpers ==========

/**
 * Get all user documents (for admin dashboards / reporting).
 * No orderBy so users without `createdAt` are still included in counts.
 * @param {number|null} limitCount - Optional max number of users (unordered when set)
 * @returns {Promise<Array>} Array of user objects with document id
 */
export async function getUsers(limitCount = null) {
  try {
    const usersRef = collection(db, 'users');
    let q = query(usersRef);
    if (typeof limitCount === 'number' && limitCount > 0) {
      q = query(usersRef, limit(limitCount));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((userDoc) => ({
      id: userDoc.id,
      ...userDoc.data(),
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Get user data by UID
 * @param {string} uid - User UID
 * @returns {Promise<Object>} User object
 */
export async function getUser(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return {
        uid: userSnap.id,
        ...userSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Create a new user document
 * @param {string} uid - User UID
 * @param {Object} userData - User data object
 * @returns {Promise<void>}
 */
export async function createUser(uid, userData) {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      uid,
      ...userData,
      createdAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update user role
 * @param {string} uid - User UID
 * @param {string} role - New role (admin or user)
 * @returns {Promise<void>}
 */
export async function updateUserRole(uid, role) {
  try {
    if (!['admin', 'user'].includes(role)) {
      throw new Error('INVALID_USER_ROLE');
    }
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Create a user profile directly in Firestore.
 * NOTE: password is stored as provided (plain text) by explicit project requirement.
 * @param {Object} profile - User profile payload
 * @returns {Promise<Object>} Created user profile with document id
 */
export async function createUserProfile(profile) {
  try {
    const normalizedEmail = profile.email.trim().toLowerCase();
    const usersRef = collection(db, 'users');

    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const payload = {
      name: profile.name.trim(),
      email: normalizedEmail,
      phone: profile.phone.trim(),
      password: profile.password,
      role: 'user',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(usersRef, payload);
    return { id: docRef.id, ...payload, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * Find a user by email in Firestore users collection.
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User document with id or null
 */
export async function getUserByEmail(email) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const first = snapshot.docs[0];
    return { id: first.id, ...first.data() };
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

/**
 * Validate login credentials against users collection.
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object|null>} User object on success, null on mismatch
 */
export async function validateUserLogin(email, password) {
  try {
    const user = await getUserByEmail(email);
    if (!user) return null;
    if (user.password !== password) return null;
    return user;
  } catch (error) {
    console.error('Error validating user login:', error);
    throw error;
  }
}

