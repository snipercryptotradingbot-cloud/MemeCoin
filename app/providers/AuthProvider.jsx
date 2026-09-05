'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mememint_auth';
const TOKEN_KEY = 'mememint_token';

function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      setUser(raw ? JSON.parse(raw) : null);
      setToken(savedToken || null);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const fakeUser = {
      id: 'local_' + email, email, name: email.split('@')[0],
      avatar: null, provider: 'email', connectedWallet: null,
      role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeUser));
    setUser(fakeUser);
    return fakeUser;
  };

  const register = async (name, email, password) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const fakeUser = {
      id: 'local_' + email, email, name,
      avatar: null, provider: 'email', connectedWallet: null,
      role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeUser));
    setUser(fakeUser);
    return fakeUser;
  };

  const loginWithGoogle = useCallback(async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('Google OAuth is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.');

    return new Promise((resolve, reject) => {
      const doAuth = async () => {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              if (!response.credential) {
                reject(new Error('No Google credential received'));
                return;
              }
              try {
                const res = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ google_token: response.credential }),
                });
                const data = await res.json();
                if (!res.ok || !data.token) throw new Error(data.error || 'Authentication failed');

                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
                setToken(data.token);
                setUser(data.user);
                resolve(data);
              } catch (err) {
                reject(err);
              }
            },
            cancel_on_tap_outside: false,
          });
          window.google.accounts.id.prompt();
        } catch (err) {
          reject(err);
        }
      };

      if (typeof window.google !== 'undefined' && window.google.accounts) {
        doAuth();
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = doAuth;
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      }
    });
  }, []);

  const registerWithGoogle = useCallback(async () => {
    return loginWithGoogle();
  }, [loginWithGoogle]);

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
  };

  const getAuthHeaders = useCallback(() => {
    const t = token || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [token]);

  return { user, token, isLoading, login, register, loginWithGoogle, registerWithGoogle, logout, getAuthHeaders };
}

export { useAuth };
export default useAuth;