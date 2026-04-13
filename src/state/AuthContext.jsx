import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);
const protectedUiPrefixes = ["/dashboard"];
const SESSION_TIMEOUT_EVENT = "qring:session-timeout";
const TOKEN_REFRESH_LEEWAY_MS = 60 * 1000;
const MIN_REFRESH_DELAY_MS = 15 * 1000;

function loadJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function normalizeAuthData(response) {
  const first = response?.data ?? response;
  const data = first?.data ?? first;

  const accessToken = data?.accessToken ?? first?.accessToken ?? "";
  const refreshToken = data?.refreshToken ?? first?.refreshToken ?? "";
  const jwtPayload = decodeJwtPayload(accessToken);
  const roleFromToken = jwtPayload?.role ?? null;

  const userCandidate = data?.user ?? first?.user ?? null;
  const normalizedUser = userCandidate
    ? {
        ...userCandidate,
        role: userCandidate.role ?? userCandidate.userRole ?? roleFromToken ?? null
      }
    : roleFromToken
      ? { role: roleFromToken }
      : null;

  return {
    accessToken,
    refreshToken,
    user: normalizedUser
  };
}

function getCurrentRoutePath() {
  if (typeof window === "undefined") return "/";
  const hash = window.location.hash || "";
  if (hash.startsWith("#/")) {
    const hashPath = hash.slice(1).split("?")[0];
    return hashPath || "/";
  }
  return window.location.pathname || "/";
}

function isProtectedUiRoute(pathname) {
  return protectedUiPrefixes.some((prefix) => String(pathname || "").startsWith(prefix));
}

function getTokenExpiryMs(token) {
  const payload = decodeJwtPayload(token);
  const expSeconds = Number(payload?.exp ?? 0);
  if (!Number.isFinite(expSeconds) || expSeconds <= 0) return null;
  return expSeconds * 1000;
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("qring_access_token") ?? "");
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem("qring_access_token");
    if (!storedToken) return null;
    return loadJson("qring_user", null);
  });
  const [loading, setLoading] = useState(false);

  function clearLocalAuthState() {
    localStorage.removeItem("qring_access_token");
    localStorage.removeItem("qring_refresh_token");
    localStorage.removeItem("qring_user");
    setAccessToken("");
    setUser(null);
  }

  function persistAuth(data) {
    if (!data?.accessToken) {
      throw new Error("Authentication succeeded but no access token was returned.");
    }
    localStorage.setItem("qring_access_token", data.accessToken);
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem("qring_refresh_token", data.refreshToken);
    }
    if (data.user) {
      localStorage.setItem("qring_user", JSON.stringify(data.user));
      setUser(data.user);
    }
  }

  function updateUser(nextUser) {
    setUser((prev) => {
      const resolved = typeof nextUser === "function" ? nextUser(prev) : nextUser;
      if (!resolved) {
        localStorage.removeItem("qring_user");
        return null;
      }
      localStorage.setItem("qring_user", JSON.stringify(resolved));
      return resolved;
    });
  }

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      const data = normalizeAuthData(response);
      persistAuth(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload) => {
    setLoading(true);
    try {
      return await authService.signup(payload);
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    setLoading(true);
    try {
      const response = await authService.googleSignIn();
      const data = normalizeAuthData(response);
      persistAuth(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const googleSignUp = async (role) => {
    setLoading(true);
    try {
      const response = await authService.googleSignUp(role);
      const data = normalizeAuthData(response);
      if (!data.user?.role && data.accessToken) {
        data.user = { ...(data.user ?? {}), role };
      }
      persistAuth(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const beginGoogleSignUp = async (referralCode = "") => {
    setLoading(true);
    try {
      return await authService.beginGoogleSignUp(referralCode);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) =>
    authService.forgotPassword({
      email
    });

  const resumeGoogleRedirect = async () => {
    setLoading(true);
    try {
      const result = await authService.resumeGoogleRedirectAuth();
      if (!result) return null;
      if (result.intent === "signin") {
        const data = normalizeAuthData(result.response);
        persistAuth(data);
        return { intent: "signin", data };
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem("qring_refresh_token");
      if (refresh) {
        await authService.logout({ refreshToken: refresh });
      }
    } finally {
      clearLocalAuthState();
    }
  };

  useEffect(() => {
    let active = true;
    let timeoutId = null;

    const refreshSession = async (reason = "timer") => {
      if (!accessToken) return;
      const refresh = localStorage.getItem("qring_refresh_token");
      if (!refresh) {
        if (reason === "timer") {
          clearLocalAuthState();
          window.dispatchEvent(new Event(SESSION_TIMEOUT_EVENT));
        }
        return;
      }
      try {
        const response = await authService.refreshToken({ refreshToken: refresh });
        if (!active) return;
        const data = normalizeAuthData(response);
        if (!data?.accessToken) return;
        localStorage.setItem("qring_access_token", data.accessToken);
        setAccessToken(data.accessToken);
        if (data?.refreshToken) {
          localStorage.setItem("qring_refresh_token", data.refreshToken);
        }
        if (data?.user) {
          localStorage.setItem("qring_user", JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch {
        const tokenExpiryMs = getTokenExpiryMs(accessToken) ?? 0;
        if (Date.now() >= tokenExpiryMs) {
          clearLocalAuthState();
          window.dispatchEvent(new Event(SESSION_TIMEOUT_EVENT));
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isProtectedUiRoute(getCurrentRoutePath())) {
        refreshSession("visibility");
      }
    };

    const scheduleRefresh = () => {
      if (!accessToken) return;
      const tokenExpiryMs = getTokenExpiryMs(accessToken);
      if (!tokenExpiryMs) return;
      const delay = Math.max(tokenExpiryMs - Date.now() - TOKEN_REFRESH_LEEWAY_MS, MIN_REFRESH_DELAY_MS);
      timeoutId = window.setTimeout(() => refreshSession("timer"), delay);
    };

    scheduleRefresh();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [accessToken]);

  useEffect(() => {
    const onSessionTimeout = () => {
      clearLocalAuthState();
    };
    window.addEventListener(SESSION_TIMEOUT_EVENT, onSessionTimeout);
    return () => window.removeEventListener(SESSION_TIMEOUT_EVENT, onSessionTimeout);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token: accessToken,
      accessToken,
      loading,
      isAuthenticated: Boolean(user && accessToken),
      login,
      signup,
      googleSignIn,
      googleSignUp,
      beginGoogleSignUp,
      resumeGoogleRedirect,
      forgotPassword,
      logout,
      updateUser
    }),
    [user, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
