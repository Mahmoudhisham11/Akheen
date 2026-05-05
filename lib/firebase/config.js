// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDqMxeFdns0hikFfyCoUfgxf4zqgBS75U0",
  authDomain: "smartbarbar-b28f2.firebaseapp.com",
  projectId: "smartbarbar-b28f2",
  storageBucket: "smartbarbar-b28f2.firebasestorage.app",
  messagingSenderId: "269036618921",
  appId: "1:269036618921:web:6b0088e1dc00d14d6115b8"
};

// Initialize Firebase only if it hasn't been initialized
let app;

// Check if Firebase has already been initialized
const existingApps = getApps();

if (existingApps.length === 0) {
  // No apps initialized, create a new one
  app = initializeApp(firebaseConfig);
} else {
  // Use the existing default app
  app = existingApps[0];
}

// Verify app is initialized
if (!app) {
  throw new Error('Failed to initialize Firebase app');
}

export default app;

