import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, isFirebaseConfigured, firebaseConfigError } from "../config/firebase";
import { apiRequest } from "./apiClient";

const googleProvider = new GoogleAuthProvider();

// Configure Google provider to request additional scopes if needed
googleProvider.addScope("profile");
googleProvider.addScope("email");
const PENDING_GOOGLE_SIGNUP_KEY = "qring_pending_google_signup";
const GOOGLE_REDIRECT_INTENT_KEY = "qring_google_redirect_intent";

function ensureFirebaseReady() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error(firebaseConfigError || "Google auth is not configured for this environment.");
  }
}

function getGoogleAuthStorage() {
  if (typeof window === "undefined") return null;
  try {
    return isNativeCapacitor() ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
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

function isNativeCapacitor() {
  try {
    return Boolean(window?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
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

async function getGoogleUserFromAuth(intent = "signin") {
  ensureFirebaseReady();
  if (isNativeCapacitor()) {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      clearRedirectIntent();
      return redirectResult.user;
    }
    setRedirectIntent(intent);
    await signInWithRedirect(auth, googleProvider);
    throw new Error("Redirecting to Google sign-in...");
  }

  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
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
  ensureFirebaseReady();
  if (!isNativeCapacitor()) return null;

  const intent = getRedirectIntent();
  if (!intent) return null;

  const redirectResult = await getRedirectResult(auth);
  if (!redirectResult?.user) return null;

  clearRedirectIntent();
  const user = redirectResult.user;
  const idToken = await user.getIdToken(true);

  if (intent === "signin") {
    const response = await apiRequest("/auth/google-signin", {
      method: "POST",
      body: JSON.stringify({
        idToken,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    });
    return {
      intent: "signin",
      response,
    };
  }

  if (intent === "signup") {
    const pending = readPendingGoogleSignup();
    const merged = {
      ...buildGoogleProfile(user, pending?.referralCode),
      idToken,
    };
    savePendingGoogleSignup(merged);
    return {
      intent: "signup",
      pending: merged,
    };
  }

  return null;
}

/**
 * Sign in with Google
 * Returns Firebase user data and exchanges for backend token
 */
export async function signInWithGoogle() {
  try {
    const user = await getGoogleUserFromAuth("signin");
    const idToken = await user.getIdToken(true);

    // Exchange Firebase token for backend token
    const response = await apiRequest("/auth/google-signin", {
      method: "POST",
      body: JSON.stringify({
        idToken,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    });

    return response;
  } catch (error) {
    if (error?.message === "Redirecting to Google...") {
      throw error;
    }
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in popup was closed");
    }
    if (error.code === "auth/popup-blocked") {
      throw new Error("Sign-in popup was blocked. Please allow popups.");
    }
    throw new Error(error.message || "Google sign-in failed");
  }
}

/**
 * Starts Google signup and stores profile payload for role selection step.
 */
export async function beginGoogleSignup(referralCode = "") {
  try {
    const user = await getGoogleUserFromAuth("signup");
    const idToken = await user.getIdToken(true);
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
    if (error?.message === "Redirecting to Google...") {
      throw error;
    }
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-up popup was closed");
    }
    if (error.code === "auth/popup-blocked") {
      throw new Error("Sign-up popup was blocked. Please allow popups.");
    }
    throw new Error(error.message || "Google sign-up failed");
  }
}

/**
 * Completes Google signup after role selection.
 */
export async function completeGoogleSignup(role = "homeowner") {
  let pending = readPendingGoogleSignup();
  if (!pending?.idToken) {
    pending = await beginGoogleSignup();
  }
  try {
    const response = await apiRequest("/auth/google-signup", {
      method: "POST",
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
        "Google signup API returned no auth payload. Check VITE_API_BASE_URL and backend /auth/google-signup deployment."
      );
    }
    clearPendingGoogleSignup();
    return response;
  } catch (error) {
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-up popup was closed");
    }
    if (error.code === "auth/popup-blocked") {
      throw new Error("Sign-up popup was blocked. Please allow popups.");
    }
    throw new Error(error.message || "Google sign-up failed");
  }
}

/**
 * Backward compatible one-step signup.
 */
export async function signUpWithGoogle(role = "homeowner") {
  return completeGoogleSignup(role);
}

/**
 * Sign out from Firebase
 */
export async function signOutFromGoogle() {
  try {
    ensureFirebaseReady();
    await auth.signOut();
  } catch (error) {
    console.error("Error signing out:", error);
    throw new Error("Failed to sign out");
  }
}

/**
 * Get current Firebase user
 */
export function getCurrentGoogleUser() {
  if (!auth) return null;
  return auth.currentUser;
}
