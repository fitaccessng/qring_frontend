import { createContext, useContext, useMemo, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

function loadJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("qring_access_token") ?? "");
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem("qring_access_token");
    if (!storedToken) return null;
    return loadJson("qring_user", null);
  });
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      const data = response?.data ?? response;
      if (data?.accessToken) {
        localStorage.setItem("qring_access_token", data.accessToken);
        setAccessToken(data.accessToken);
      }
      if (data?.refreshToken) {
        localStorage.setItem("qring_refresh_token", data.refreshToken);
      }
      if (data?.user) {
        localStorage.setItem("qring_user", JSON.stringify(data.user));
        setUser(data.user);
      }
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
      const data = response?.data ?? response;
      if (data?.accessToken) {
        localStorage.setItem("qring_access_token", data.accessToken);
        setAccessToken(data.accessToken);
      }
      if (data?.refreshToken) {
        localStorage.setItem("qring_refresh_token", data.refreshToken);
      }
      if (data?.user) {
        localStorage.setItem("qring_user", JSON.stringify(data.user));
        setUser(data.user);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const googleSignUp = async (role) => {
    setLoading(true);
    try {
      const response = await authService.googleSignUp(role);
      const data = response?.data ?? response;
      if (data?.accessToken) {
        localStorage.setItem("qring_access_token", data.accessToken);
        setAccessToken(data.accessToken);
      }
      if (data?.refreshToken) {
        localStorage.setItem("qring_refresh_token", data.refreshToken);
      }
      if (data?.user) {
        localStorage.setItem("qring_user", JSON.stringify(data.user));
        setUser(data.user);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) =>
    authService.forgotPassword({
      email
    });

  const logout = async () => {
    try {
      const refresh = localStorage.getItem("qring_refresh_token");
      if (refresh) {
        await authService.logout({ refreshToken: refresh });
      }
    } finally {
      localStorage.removeItem("qring_access_token");
      localStorage.removeItem("qring_refresh_token");
      localStorage.removeItem("qring_user");
      setAccessToken("");
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user && accessToken),
      login,
      signup,
      googleSignIn,
      googleSignUp,
      forgotPassword,
      logout
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
