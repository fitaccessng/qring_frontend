import { describe, expect, it } from "vitest";
import { normalizeGoogleAuthError } from "./authError";

describe("normalizeGoogleAuthError", () => {
  it("gives users a connectivity message for Firebase network failures", () => {
    const error = normalizeGoogleAuthError({ code: "auth/network-request-failed" });

    expect(error.message).toBe(
      "Unable to connect to the authentication service. Please check your internet connection and try again.",
    );
  });

  it("recognizes a connection closed browser error", () => {
    const error = normalizeGoogleAuthError({ message: "Failed to fetch: ERR_CONNECTION_CLOSED" });

    expect(error.message).toContain("Unable to connect to the authentication service");
  });
});