import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  loginUser,
  logoutUser,
  registerUser,
  getStoredUser,
  getStoredToken,
  clearStoredSession,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [authError, setAuthError] = useState(null);

  // Sync session state from memory
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    const result = await loginUser(email, password);
    if (result.ok && result.data?.user) {
      setUser(result.data.user);
      setToken(result.data.token);
      return { success: true, user: result.data.user };
    }
    const err = result.error || 'Invalid email or password. Please verify your credentials.';
    setAuthError(err);
    return { success: false, error: err };
  }, []);

  const signup = useCallback(async ({ name, email, password }) => {
    setAuthError(null);
    const result = await registerUser({
      name,
      email,
      password,
      role: 'holder',
    });
    if (result.ok) {
      return { success: true, data: result.data };
    }
    const err = result.error || 'Failed to create account. Please check the provided details.';
    setAuthError(err);
    return { success: false, error: err };
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // ignore
    } finally {
      clearStoredSession();
      setUser(null);
      setToken(null);
      setAuthError(null);
    }
  }, []);

  const handle401 = useCallback((message = 'Your session has expired. Please sign in again.') => {
    clearStoredSession();
    setUser(null);
    setToken(null);
    setAuthError(message);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        authError,
        setAuthError,
        login,
        signup,
        logout,
        handle401,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
