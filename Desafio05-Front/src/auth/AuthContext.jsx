import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const DEFAULT_TOKEN = import.meta.env.VITE_API_TOKEN || '';
const STORAGE_KEY = 'col_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_TOKEN || '');

  const isAuthenticated = !!token;

  const login = useCallback(async ({ username, password }) => {
    const res = await axios.post(`${BASE_URL}/auth/login`, { username, password });
    const nextToken = res?.data?.data?.token;
    if (!nextToken) throw new Error('Token não recebido');
    localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    return nextToken;
  }, []);

  const register = useCallback(async ({ username, password }) => {
    const res = await axios.post(`${BASE_URL}/auth/register`, { username, password });
    const nextToken = res?.data?.data?.token;
    if (!nextToken) throw new Error('Token não recebido');
    localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    return nextToken;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(DEFAULT_TOKEN || '');
  }, []);

  const value = useMemo(
    () => ({ token, isAuthenticated, login, register, logout }),
    [token, isAuthenticated, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredToken() {
  return localStorage.getItem(STORAGE_KEY) || '';
}
