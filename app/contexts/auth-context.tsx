import { GITHUB_TOKEN_KEY, GITHUB_USER_KEY } from "@/constants/github";
import { checkRepoStatus, createRepo, getLoginUser } from "@/services/github";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  login: string;
}

type AuthState =
  | "LOADING"
  | "AUTHENTICATED"
  | "UNAUTHENTICATED"
  | "REPO_CONFLICT";

interface AuthContextType {
  authState: AuthState;
  user: User | null;
  token: string | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  resolveConflictAndSignOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("LOADING");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(GITHUB_TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(GITHUB_USER_KEY);

      if (storedToken && storedUser) {
        await getLoginUser(storedToken);
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setAuthState("AUTHENTICATED");
      } else {
        setAuthState("UNAUTHENTICATED");
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthState("UNAUTHENTICATED");
    }
  };

  const signIn = async (newToken: string) => {
    try {
      const newUser = await getLoginUser(newToken);
      const repoStatus = await checkRepoStatus(newToken);

      if (repoStatus === "CONFLICT") {
        setAuthState("REPO_CONFLICT");
        return;
      }

      if (repoStatus === "NOT_FOUND") {
        await createRepo(newToken);
      }

      await SecureStore.setItemAsync(GITHUB_TOKEN_KEY, newToken);
      await SecureStore.setItemAsync(GITHUB_USER_KEY, JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      setAuthState("AUTHENTICATED");
    } catch (error) {
      console.error("Error during sign in:", error);
      setAuthState("UNAUTHENTICATED");
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await SecureStore.deleteItemAsync(GITHUB_TOKEN_KEY);
      await SecureStore.deleteItemAsync(GITHUB_USER_KEY);

      setToken(null);
      setUser(null);
      setAuthState("UNAUTHENTICATED");
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  };

  const resolveConflictAndSignOut = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        user,
        token,
        signIn,
        signOut,
        resolveConflictAndSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
