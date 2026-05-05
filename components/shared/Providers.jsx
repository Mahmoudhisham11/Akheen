'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import CartDrawer from '@/components/shared/CartDrawer';

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

