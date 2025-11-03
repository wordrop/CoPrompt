// CoPrompt Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Replace this with YOUR config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyADIXDmVZfLNH-SrS6P7tX7GkD7-_pzLZg",
  authDomain: "coprompt-70087.firebaseapp.com",
  projectId: "coprompt-70087",
  storageBucket: "coprompt-70087.firebasestorage.app",
  messagingSenderId: "116471520583",
  appId: "1:116471520583:web:d8da2a279ba0ac30948062"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (database)
export const db = getFirestore(app);

// Initialize Storage (for document uploads later)
export const storage = getStorage(app);

console.log('🔥 Firebase initialized successfully');

export default app;