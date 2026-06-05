import { useState, useEffect } from 'react';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  );

  const login = (tokenValue: string, userData: User) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'general_council_admin';
  const isDistrictAdmin = user?.role === 'district_admin';
  const isSectionAdmin = user?.role === 'section_admin';
  const canApprove = ['general_council_admin', 'district_admin', 'section_admin'].includes(user?.role || '');

  return { user, token, login, logout, isAdmin, isDistrictAdmin, isSectionAdmin, canApprove };
}
