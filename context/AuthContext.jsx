'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createUserProfile, validateUserLogin } from '@/lib/firebase/firestore';

const SESSION_STORAGE_KEY = 'akheen_session_user';

const AuthContext = createContext({
  user: null,
  userRole: null,
  loading: true,
  login: async () => {},
  signUp: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!rawSession) {
        setUser(null);
        setUserRole(null);
      } else {
        const sessionUser = JSON.parse(rawSession);
        setUser(sessionUser);
        setUserRole(sessionUser.role || 'user');
      }
    } catch (error) {
      console.error('Error restoring auth session:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setUser(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const loggedUser = await validateUserLogin(email, password);
    if (!loggedUser) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const sessionUser = {
      id: loggedUser.id,
      name: loggedUser.name,
      email: loggedUser.email,
      phone: loggedUser.phone,
      role: loggedUser.role || 'user',
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    setUserRole(sessionUser.role);
    return sessionUser;
  };

  const signUp = async ({ name, email, phone, password }) => {
    const createdUser = await createUserProfile({ name, email, phone, password });
    const sessionUser = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      phone: createdUser.phone,
      role: createdUser.role || 'user',
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    setUserRole(sessionUser.role);
    return sessionUser;
  };

  const logout = async () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        login,
        signUp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

