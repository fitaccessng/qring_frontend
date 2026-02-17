import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { apiRequest } from "./apiClient";

const googleProvider = new GoogleAuthProvider();

// Configure Google provider to request additional scopes if needed
googleProvider.addScope("profile");
googleProvider.addScope("email");

/**
 * Sign in with Google
 * Returns Firebase user data and exchanges for backend token
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();

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
 * Sign up with Google
 * Returns Firebase user data and exchanges for backend token
 */
export async function signUpWithGoogle(role = "homeowner") {
  try {
    const user = auth.currentUser ?? (await signInWithPopup(auth, googleProvider)).user;
    const idToken = await user.getIdToken();

    // Exchange Firebase token for backend token with role
    const response = await apiRequest("/auth/google-signup", {
      method: "POST",
      body: JSON.stringify({
        idToken,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role,
      }),
    });

    const data = response?.data ?? response;
    if (!data?.accessToken && !data?.user) {
      throw new Error(
        "Google signup API returned no auth payload. Check VITE_API_BASE_URL and backend /auth/google-signup deployment."
      );
    }
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
