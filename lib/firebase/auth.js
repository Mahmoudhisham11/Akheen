import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import app from './config';

// Initialize Auth immediately with the app
// This ensures auth is properly configured
let auth;

try {
  // Verify app exists
  if (!app) {
    throw new Error('Firebase app is not initialized. Please check your Firebase configuration.');
  }
  
  // Initialize auth with the app
  auth = getAuth(app);
  
  // Verify auth was created successfully
  if (!auth) {
    throw new Error('Failed to create Firebase Auth instance');
  }
} catch (error) {
  console.error('Critical error initializing Firebase Auth:', error);
  throw new Error(`Firebase Auth initialization failed: ${error.message}. Please ensure Firebase Authentication is enabled in your Firebase Console.`);
}

// Function to get auth instance (for consistency)
function getAuthInstance() {
  if (!auth) {
    // Re-initialize if somehow auth was lost
    auth = getAuth(app);
  }
  return auth;
}

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<UserCredential>} User credential object
 */
export async function login(email, password) {
  try {
    if (!auth) {
      auth = getAuthInstance();
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    if (!auth) {
      auth = getAuthInstance();
    }
    await signOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
}

/**
 * Get current authenticated user
 * @returns {User|null} Current user or null
 */
export function getCurrentUser() {
  if (!auth) {
    auth = getAuthInstance();
  }
  return auth.currentUser;
}

/**
 * Listen to authentication state changes
 * @param {Function} callback - Callback function that receives the user object
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  if (!auth) {
    auth = getAuthInstance();
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<UserCredential>} User credential object
 */
export async function signUp(email, password) {
  try {
    if (!auth) {
      auth = getAuthInstance();
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

// Export auth instance
export default auth;

