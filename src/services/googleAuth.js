import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import {
  firebaseConfigError,
  getFirebaseAuth,
  initializeFirebaseAuth,
  isFirebaseConfigured,
} from "../config/firebase";
import { isNativeApp, shouldUseGoogleAuth } from "../utils/nativeRuntime";
import { normalizeGoogleAuthError } from "./authError";
import { apiRequest } from "./apiClient";

const googleProvider = new GoogleAuthProvider();
const PENDING_GOOGLE_SIGNUP_KEY = "qring_pending_google_signup";
const GOOGLE_REDIRECT_INTENT_KEY = "qring_google_redirect_intent";
const GOOGLE_WEB_CLIENT_ID_FALLBACK =
  "333641553431-dnpj0r2echhl0t3ccad573s17gn2qstn.apps.googleusercontent.com";
const GOOGLE_AUTH_REQUEST_OPTIONS = {
  timeoutMs: 30000,
  retryCount: 0,
};

let nativeGoogleAuthPromise = null;
let nativeGoogleInitialized = false;

googleProvider.addScope("profile");
googleProvider.addScope("email");
googleProvider.setCustomParameters({ prompt: "select_account" });

async function ensureFirebaseReady() {
  if (!shouldUseGoogleAuth()) {
    throw new Error("Google authentication is available on the web app only.");
  }
  if (!isFirebaseConfigured) {
    throw new Error(firebaseConfigError || "Google auth is not configured for this environment.");
  }
  return initializeFirebaseAuth();
}

function getGoogleAuthStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function resolveGoogleClientIds() {
  const webClientId =
    String(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || "").trim() || GOOGLE_WEB_CLIENT_ID_FALLBACK;
  const androidClientId = String(import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID || "").trim();
  const iosClientId = String(import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || "").trim();
  return { webClientId, androidClientId, iosClientId };
}

async function getNativeGoogleAuth() {
  if (!nativeGoogleAuthPromise) {
    nativeGoogleAuthPromise = import("@codetrix-studio/capacitor-google-auth")
      .then((mod) => mod?.GoogleAuth)
      .catch((error) => {
        nativeGoogleAuthPromise = null;
        throw error;
      });
  }
  const GoogleAuth = await nativeGoogleAuthPromise;
  if (!GoogleAuth) {
    throw new Error("Native Google Sign-In plugin is unavailable.");
  }
  return GoogleAuth;
}

async function ensureNativeGoogleReady() {
  if (!isNativeApp()) return null;
  await ensureFirebaseReady();

  const GoogleAuth = await getNativeGoogleAuth();
  if (!nativeGoogleInitialized) {
    const { webClientId } = resolveGoogleClientIds();
    await GoogleAuth.initialize({
      clientId: webClientId,
      scopes: ["profile", "email"],
      grantOfflineAccess: true,
    });
    nativeGoogleInitialized = true;
  }
  return GoogleAuth;
}

function savePendingGoogleSignup(payload) {
  getGoogleAuthStorage()?.setItem(PENDING_GOOGLE_SIGNUP_KEY, JSON.stringify(payload));
}

function readPendingGoogleSignup() {
  const raw = getGoogleAuthStorage()?.getItem(PENDING_GOOGLE_SIGNUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingGoogleSignup() {
  getGoogleAuthStorage()?.removeItem(PENDING_GOOGLE_SIGNUP_KEY);
}

export function getPendingGoogleSignup() {
  return readPendingGoogleSignup();
}

function setRedirectIntent(intent) {
  getGoogleAuthStorage()?.setItem(GOOGLE_REDIRECT_INTENT_KEY, intent);
}

function clearRedirectIntent() {
  getGoogleAuthStorage()?.removeItem(GOOGLE_REDIRECT_INTENT_KEY);
}

function getRedirectIntent() {
  return getGoogleAuthStorage()?.getItem(GOOGLE_REDIRECT_INTENT_KEY) ?? "";
}

async function signInToFirebaseWithNativeGoogle() {
  const firebaseAuth = await ensureFirebaseReady();
  const GoogleAuth = await ensureNativeGoogleReady();
  const googleUser = await GoogleAuth.signIn();
  const idToken = String(googleUser?.authentication?.idToken || "").trim();

  if (!idToken) {
    throw new Error("Google Sign-In did not return an ID token.");
  }

  const accessToken = String(googleUser?.authentication?.accessToken || "").trim();
  const credential = GoogleAuthProvider.credential(idToken, accessToken || undefined);
  const result = await signInWithCredential(firebaseAuth, credential);
  const firebaseIdToken = await result.user.getIdToken(true);

  return {
    user: result.user,
    firebaseIdToken,
  };
}

async function getGoogleUserFromAuth(intent = "signin") {
  const firebaseAuth = await ensureFirebaseReady();

  if (isNativeApp()) {
    const nativeSession = await signInToFirebaseWithNativeGoogle();
    clearRedirectIntent();
    return nativeSession.user;
  }

  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    clearRedirectIntent();
    return result.user;
  } catch (error) {
    const code = String(error?.code || "");
    const canFallbackToRedirect =
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/operation-not-supported-in-this-environment";

    if (!canFallbackToRedirect) {
      throw error;
    }

    setRedirectIntent(intent);
    await signInWithRedirect(firebaseAuth, googleProvider);
    throw new Error("Redirecting to Google...");
  }
}

function buildGoogleProfile(user, referralCode = undefined) {
  return {
    idToken: undefined,
    email: user?.email ?? "",
    displayName: user?.displayName ?? "",
    photoURL: user?.photoURL ?? "",
    referralCode: String(referralCode || "").trim() || undefined,
  };
}

export async function resumeGoogleRedirectAuth() {
  try {
    const firebaseAuth = await ensureFirebaseReady();
    if (isNativeApp()) return null;

    const intent = getRedirectIntent();
    if (!intent) return null;

    const redirectResult = await getRedirectResult(firebaseAuth);
    if (!redirectResult?.user) return null;

    clearRedirectIntent();
    const user = redirectResult.user;
    const idToken = await user.getIdToken(true);

    if (intent === "signin") {
      const response = await apiRequest("/auth/google-signin", {
        method: "POST",
        ...GOOGLE_AUTH_REQUEST_OPTIONS,
        body: JSON.stringify({
          idToken,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }),
      });
      return { intent: "signin", response };
    }

    if (intent === "signup") {
      const pending = readPendingGoogleSignup();
      const merged = {
        ...buildGoogleProfile(user, pending?.referralCode),
        idToken,
      };
      savePendingGoogleSignup(merged);
      return { intent: "signup", pending: merged };
    }

    return null;
  } catch (error) {
    throw normalizeGoogleAuthError(error, "Google sign-in failed");
  }
}

export async function signInWithGoogle() {
  try {
    let user;
    let idToken;

    if (isNativeApp()) {
      const nativeSession = await signInToFirebaseWithNativeGoogle();
      user = nativeSession.user;
      idToken = nativeSession.firebaseIdToken;
    } else {
      user = await getGoogleUserFromAuth("signin");
      idToken = await user.getIdToken(true);
    }

    return apiRequest("/auth/google-signin", {
      method: "POST",
      ...GOOGLE_AUTH_REQUEST_OPTIONS,
      body: JSON.stringify({
        idToken,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    });
  } catch (error) {
    throw normalizeGoogleAuthError(error, "Google sign-in failed");
  }
}

export async function beginGoogleSignup(referralCode = "") {
  try {
    let user;
    let idToken;

    if (isNativeApp()) {
      const nativeSession = await signInToFirebaseWithNativeGoogle();
      user = nativeSession.user;
      idToken = nativeSession.firebaseIdToken;
    } else {
      user = await getGoogleUserFromAuth("signup");
      idToken = await user.getIdToken(true);
    }

    const pending = {
      idToken,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      referralCode: String(referralCode || "").trim() || undefined,
    };
    savePendingGoogleSignup(pending);
    return pending;
  } catch (error) {
    throw normalizeGoogleAuthError(error, "Google sign-up failed");
  }
}

export async function completeGoogleSignup(role = "homeowner") {
  const pending = readPendingGoogleSignup();
  if (!pending?.idToken) {
    throw new Error("Complete Google sign-in before choosing an account role.");
  }

  try {
    const response = await apiRequest("/auth/google-signup", {
      method: "POST",
      ...GOOGLE_AUTH_REQUEST_OPTIONS,
      body: JSON.stringify({
        idToken: pending.idToken,
        email: pending.email,
        displayName: pending.displayName,
        photoURL: pending.photoURL,
        role,
        referralCode: pending.referralCode,
      }),
    });

    const data = response?.data ?? response;
    if (!data?.accessToken && !data?.user) {
      throw new Error(
        "Google signup API returned no auth payload. Check VITE_API_BASE_URL and backend /auth/google-signup deployment.",
      );
    }
    clearPendingGoogleSignup();
    return response;
  } catch (error) {
    throw normalizeGoogleAuthError(error, "Google sign-up failed");
  }
}

export async function signUpWithGoogle(role = "homeowner") {
  await beginGoogleSignup();
  return completeGoogleSignup(role);
}

export async function signOutFromGoogle() {
  try {
    const firebaseAuth = await ensureFirebaseReady();
    if (isNativeApp()) {
      const GoogleAuth = await ensureNativeGoogleReady();
      await GoogleAuth.signOut().catch(() => {});
    }
    await firebaseAuth.signOut();
  } catch (error) {
    console.error("Error signing out:", error);
    throw new Error("Failed to sign out");
  }
}

export function getCurrentGoogleUser() {
  return getFirebaseAuth()?.currentUser ?? null;
}
