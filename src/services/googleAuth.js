import {
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { apiRequest } from "./apiClient";

const googleProvider = new GoogleAuthProvider();

// Configure Google provider to request additional scopes if needed
googleProvider.addScope("profile");
googleProvider.addScope("email");
const PENDING_GOOGLE_SIGNUP_KEY = "qring_pending_google_signup";

function savePendingGoogleSignup(payload) {
  sessionStorage.setItem(PENDING_GOOGLE_SIGNUP_KEY, JSON.stringify(payload));
}

function readPendingGoogleSignup() {
  const raw = sessionStorage.getItem(PENDING_GOOGLE_SIGNUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingGoogleSignup() {
  sessionStorage.removeItem(PENDING_GOOGLE_SIGNUP_KEY);
}

export function getPendingGoogleSignup() {
  return readPendingGoogleSignup();
}

/**
 * Sign in with Google
 * Returns Firebase user data and exchanges for backend token
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
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
    const user = (await signInWithPopup(auth, googleProvider)).user;
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
  return auth.currentUser;
}
