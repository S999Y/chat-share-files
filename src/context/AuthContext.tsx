import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient } from "../api/client.js";
import { User } from "../types.js";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isMock: boolean;
  dbError: string | null;
  login: (email: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Check backend status and fetch profile if logged in
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Fetch backend connection status
        const statusRes = await apiClient.get("/status");
        setIsMock(statusRes.data.isMock);
        setDbError(statusRes.data.error);
      } catch (err) {
        console.error("Failed to check server status:", err);
      }

      if (token) {
        try {
          const profileRes = await apiClient.get("/auth/me");
          setUser(profileRes.data.user);
          setIsMock(profileRes.data.isMock);
        } catch (err) {
          console.error("Session expired or invalid token:", err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      const { token: receivedToken, user: receivedUser, isMock: serverIsMock } = res.data;
      
      localStorage.setItem("token", receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setIsMock(serverIsMock);
      return res.data;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Failed to log in. Please try again.";
      throw new Error(errMsg);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const res = await apiClient.post("/auth/register", { username, email, password });
      const { token: receivedToken, user: receivedUser, isMock: serverIsMock } = res.data;

      localStorage.setItem("token", receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setIsMock(serverIsMock);
      return res.data;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Failed to register. Please try again.";
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const profileRes = await apiClient.get("/auth/me");
      setUser(profileRes.data.user);
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isMock,
        dbError,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
