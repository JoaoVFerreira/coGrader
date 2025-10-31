import admin from 'firebase-admin';
import { logger } from './logger';
import { config } from './env';

let firebaseInitialized = false;

export const initializeFirebase = () => {
  if (firebaseInitialized) {
    return admin;
  }

  if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
    throw new Error('Firebase configuration is incomplete. Check your environment variables.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
    storageBucket: config.firebase.storageBucket,
  });

  firebaseInitialized = true;
  logger.info('Firebase initialized successfully');
  return admin;
};

export const getFirestore = () => {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  return admin.firestore();
};

export const getStorage = () => {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  return admin.storage();
};

export default admin;
