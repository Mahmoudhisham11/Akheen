'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const GUEST_CART_KEY = 'akheen_cart_guest';

const CartContext = createContext({
  items: [],
  itemCount: 0,
  subtotal: 0,
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

function resolveCartKey(userId) {
  return userId ? `akheen_cart_${userId}` : GUEST_CART_KEY;
}

function clampQuantity(quantity, maxAvailable) {
  const parsedQty = Number(quantity);
  const parsedMax = Number(maxAvailable);
  if (!Number.isFinite(parsedQty)) return 1;
  if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
    return Math.max(1, Math.floor(parsedQty));
  }
  return Math.min(Math.max(1, Math.floor(parsedQty)), Math.floor(parsedMax));
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const storageKey = useMemo(() => resolveCartKey(user?.id), [user?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Failed to restore cart from localStorage', error);
      setItems([]);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addItem = useCallback((itemPayload) => {
    if (!itemPayload?.id) return;

    setItems((prevItems) => {
      const safeQty = clampQuantity(itemPayload.quantity ?? 1, itemPayload.maxAvailable);
      const sizeKey = itemPayload.size || 'One Size';
      const existingIndex = prevItems.findIndex(
        (item) => item.id === itemPayload.id && (item.size || 'One Size') === sizeKey
      );

      if (existingIndex < 0) {
        return [
          ...prevItems,
          {
            ...itemPayload,
            size: sizeKey,
            quantity: safeQty,
          },
        ];
      }

      const nextItems = [...prevItems];
      const existingItem = nextItems[existingIndex];
      const mergedQuantity = clampQuantity(
        Number(existingItem.quantity || 0) + safeQty,
        existingItem.maxAvailable ?? itemPayload.maxAvailable
      );
      nextItems[existingIndex] = {
        ...existingItem,
        ...itemPayload,
        size: sizeKey,
        quantity: mergedQuantity,
      };
      return nextItems;
    });

    openDrawer();
  }, [openDrawer]);

  const updateQuantity = useCallback((id, size, nextQuantity) => {
    setItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.id !== id || (item.size || 'One Size') !== (size || 'One Size')) return item;
          return {
            ...item,
            quantity: clampQuantity(nextQuantity, item.maxAvailable),
          };
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((id, size) => {
    setItems((prevItems) =>
      prevItems.filter((item) => !(item.id === id && (item.size || 'One Size') === (size || 'One Size')))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const unitPrice = Number(item.price || 0);
        const quantity = Number(item.quantity || 0);
        return sum + unitPrice * quantity;
      }, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, itemCount, subtotal, isDrawerOpen, openDrawer, closeDrawer, addItem, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
