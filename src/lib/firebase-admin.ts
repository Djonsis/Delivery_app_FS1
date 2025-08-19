import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? JSON.parse(process.env.FIREBASE_PRIVATE_KEY)
  : undefined;


// Инициализация Firebase Admin SDK для серверных операций
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: "fastbasket",
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    projectId: "fastbasket",
  });
}

export const adminDb = getFirestore();
