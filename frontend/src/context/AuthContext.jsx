import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sevasetu_token') || null);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data?.user) setUser(data.user);
          else logout();
        })
        .catch(() => logout());
    }
  }, []);

  const login = async (phone, role) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('sevasetu_token', data.token);
      }
      return data;
    } catch (err) {
      return { error: 'Network error' };
    }
  };

  const demoLogin = async (demoRole) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoRole })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('sevasetu_token', data.token);
      }
      return data;
    } catch (err) {
      return { error: 'Network error' };
    }
  };

  const register = async (formData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { error: data?.error || `Server responded with status ${res.status}` };
      }
      if (data?.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('sevasetu_token', data.token);
      }
      return data;
    } catch (err) {
      return { error: 'Network error during registration: ' + (err.message || 'Please check server connection') };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sevasetu_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, demoLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
