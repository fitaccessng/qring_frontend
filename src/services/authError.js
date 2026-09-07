export function normalizeGoogleAuthError(error, fallbackMessage = "Google sign-in failed") {
  const rawMessage = String(error?.message || "").trim();
  const code = String(error?.code || "").trim();
  const combined = `${code} ${rawMessage}`.toLowerCase();

  if (rawMessage === "Redirecting to Google...") {
    return new Error(rawMessage);
  }

  if (
    combined.includes("developer_error") ||
    combined.includes("sign in failed") ||
    combined.includes("12500") ||
    combined.includes("10:")
  ) {
    return new Error(
      "Google Sign-In is not configured for this Android release build yet. Add the release SHA-1 and SHA-256 for com.kelvin.qringapp in Firebase or Google Cloud, then replace google-services.json and rebuild.",
    );
  }

  if (code === "auth/popup-closed-by-user") {
    return new Error("Google sign-in was cancelled.");
  }

  if (code === "auth/popup-blocked") {
    return new Error("Google sign-in was blocked. Please allow popups.");
  }

  if (
    code === "auth/network-request-failed" ||
    combined.includes("err_connection_closed") ||
    combined.includes("network error") ||
    combined.includes("failed to fetch")
  ) {
    return new Error(
      "Unable to connect to the authentication service. Please check your internet connection and try again.",
    );
  }

  if (rawMessage === "Google Sign-In did not return an ID token.") {
    return new Error(
      "Google Sign-In completed without an ID token. Confirm the Android release SHA fingerprints and Google OAuth client setup for this app.",
    );
  }

  return new Error(rawMessage || fallbackMessage);
}