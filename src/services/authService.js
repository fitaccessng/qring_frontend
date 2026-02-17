import { apiRequest } from "./apiClient";
import * as googleAuth from "./googleAuth";

export async function login(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function googleSignIn() {
  return googleAuth.signInWithGoogle();
}

export async function googleSignUp(role) {
  return googleAuth.signUpWithGoogle(role);
}

export async function googleAdminSignIn() {
  return googleAuth.signInWithGoogle();
}

export async function googleAdminSignUp() {
  return googleAuth.signUpWithGoogle("admin");
}

export async function signup(payload) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function adminSignup(payload) {
  return apiRequest("/auth/admin-signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function forgotPassword(payload) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function resetPassword(payload) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function refreshToken(payload) {
  return apiRequest("/auth/refresh-token", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function logout(payload) {
  return apiRequest("/auth/logout", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function changePassword(payload) {
  return apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
