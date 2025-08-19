import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Инициализация Firebase Admin SDK для серверных операций
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: "fastbasket",
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    projectId: "fastbasket",
  });
}

export const adminDb = getFirestore();