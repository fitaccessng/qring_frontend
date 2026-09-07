import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

export const firebaseConfigError = isFirebaseConfigured
  ? ""
  : "Missing Firebase configuration. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.";

let app = null;
let auth = null;
let firebaseAuthPromise = null;

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);
}

async function configurePersistence(nextAuth) {
  const localReady = await withTimeout(
    setPersistence(nextAuth, browserLocalPersistence)
      .then(() => true)
      .catch(() => false),
    3000,
  );
  if (localReady) return "local";

  const sessionReady = await withTimeout(
    setPersistence(nextAuth, browserSessionPersistence)
      .then(() => true)
      .catch(() => false),
    3000,
  );
  if (sessionReady) return "session";

  console.warn("Firebase Auth persistence unavailable");
  return "none";
}

export async function initializeFirebaseAuth() {
  if (!isFirebaseConfigured) {
    throw new Error(firebaseConfigError);
  }
  if (auth) return auth;
  if (firebaseAuthPromise) return firebaseAuthPromise;

  firebaseAuthPromise = (async () => {
    await initializeFirebaseApp();
    auth = getAuth(app);
    await configurePersistence(auth);
    return auth;
  })().catch((error) => {
    firebaseAuthPromise = null;
    app = null;
    auth = null;
    throw error;
  });

  return firebaseAuthPromise;
}

export function initializeFirebaseApp() {
  if (!isFirebaseConfigured) {
    throw new Error(firebaseConfigError);
  }
  app = app ?? getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAuth() {
  return auth;
}

export default null;
