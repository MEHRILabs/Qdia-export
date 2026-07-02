import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { authApi, getAuthToken, getStoredUser, persistAuth, clearAuth, type AuthUser } from "@/lib/api-auth";
import { signInWithGoogle, type GoogleCredential } from "@/lib/google-auth";

export type AuthProvider = "email" | "google" | "phone";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string, name?: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  loginGoogleCredential: (cred: GoogleCredential) => Promise<void>;
  loginPhone: (phone: string, code: string) => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => getAuthToken());
    const stored = getStoredUser();
    const storedToken = getAuthToken();
    if (stored && storedToken) {
      setUser(stored);
      setToken(storedToken);
      authApi.me().catch(() => { clearAuth(); setUser(null); setToken(null); });
    }
    setIsLoading(false);
  }, []);

  const applyAuth = useCallback((data: { user: AuthUser; token: string }) => {
    persistAuth(data);
    setUser(data.user);
    setToken(data.token);
  }, []);

  const loginEmail = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    applyAuth(result);
  }, [applyAuth]);

  const registerEmail = useCallback(async (email: string, password: string, name?: string) => {
    const result = await authApi.register(email, password, name);
    applyAuth(result);
  }, [applyAuth]);

  const loginGoogleCredential = useCallback(async (cred: GoogleCredential) => {
    const result = await authApi.google(cred.email, cred.name, cred.googleId, cred.idToken);
    applyAuth(result);
  }, [applyAuth]);

  const loginGoogle = useCallback(async () => {
    const cred = await signInWithGoogle();
    await loginGoogleCredential(cred);
  }, [loginGoogleCredential]);

  const sendPhoneCode = useCallback(async (phone: string) => {
    await authApi.sendOtp(phone);
  }, []);

  const loginPhone = useCallback(async (phone: string, code: string) => {
    const result = await authApi.verifyOtp(phone, code);
    applyAuth(result);
  }, [applyAuth]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, loginEmail, registerEmail, loginGoogle, loginGoogleCredential, loginPhone, sendPhoneCode, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
