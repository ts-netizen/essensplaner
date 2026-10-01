import admin from 'firebase-admin';

let isInitialized = false;
let db: admin.firestore.Firestore | null = null;

export function initializeFirebaseAdmin(): admin.firestore.Firestore | null {
  if (isInitialized) {
    return db;
  }

  try {
    const hasCredentials = Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.K_SERVICE,
    );

    if (!hasCredentials) {
      console.log(
        '[FirebaseAdmin] No Firebase credentials detected in environment. Using in-memory fallback cache.',
      );
      db = null;
      isInitialized = true;
      return null;
    }

    // If credentials or emulator present, initialize app
    if (admin.apps.length === 0) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        admin.initializeApp();
      }
    }

    db = admin.firestore();
    isInitialized = true;
    console.log('[FirebaseAdmin] Successfully initialized Firestore connection.');
  } catch (err: unknown) {
    console.warn(
      '[FirebaseAdmin] Running without Firebase credentials. In-memory fallback will be used:',
      (err as Error).message,
    );
    db = null;
    isInitialized = true;
  }

  return db;
}

export function getFirestoreDb(): admin.firestore.Firestore | null {
  if (!isInitialized) {
    return initializeFirebaseAdmin();
  }
  return db;
}

export function isFirebaseAvailable(): boolean {
  return getFirestoreDb() !== null;
}
