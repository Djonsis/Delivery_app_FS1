// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "fastbasket",
  "appId": "1:674513577960:web:5c5de1e62d8a2e21a2a65d",
  "storageBucket": "fastbasket.firebasestorage.app",
  "apiKey": "AIzaSyDoRnMyCSf2jsnhpxZ90Deg-PeM-YvI4HY",
  "authDomain": "fastbasket.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "674513577960"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
