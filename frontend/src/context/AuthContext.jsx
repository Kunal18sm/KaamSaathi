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

  const updateUser = async (updatedFields) => {
    if (!user) return;
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          role: user.role,
          ...updatedFields
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('sevasetu_token', data.token);
        }
        return { success: true, user: data.user };
      }
      return { error: data.error || 'Profile could not be saved.' };
    } catch (err) {
      console.error('Update profile API error:', err);
      return { error: 'Network error while saving profile.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
