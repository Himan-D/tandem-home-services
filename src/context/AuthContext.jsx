import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

function setCookie(name, value, days) {
  if (typeof window === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function removeCookie(name) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export const AuthProvider = ({ children, initialUser }) => {
  const [user, setUser] = useState(() => {
    if (initialUser) return initialUser;
    return null;
  });
  const [token, setToken] = useState(() => getToken());

  const fetchUserProfile = useCallback(async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setToken(null);
      }
    } catch (e) {
      console.error("Failed to fetch user profile", e);
    }
  }, []);

  useEffect(() => {
    if (token && !user) {
      fetchUserProfile(token);
    } else if (!token) {
      setUser(null);
    }
  }, [token, user, fetchUserProfile]);

  const refreshUser = async () => {
    const t = token || getToken();
    if (t) await fetchUserProfile(t);
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem('token', data.token);
      setCookie('token', data.token, 7);
      return true;
    }
    return false;
  };

  const loginWithToken = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setCookie('token', newToken, 7);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    removeCookie('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
