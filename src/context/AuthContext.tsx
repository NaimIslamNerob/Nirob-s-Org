import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api, setStoredToken, getStoredToken, clearStoredToken } from '../lib/api';
import { socket } from '../lib/socket';
import { signInWithGoogle, firebaseSignOut } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  isNirofyOnline: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'guest-login' | 'guest-register' | 'admin-login';
  openAuthModal: (mode?: 'guest-login' | 'guest-register' | 'admin-login') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'guest-login' | 'guest-register' | 'admin-login') => void;
  loginGuest: (identifier: string, pass: string) => Promise<void>;
  registerGuest: (username: string, pass: string, email?: string) => Promise<void>;
  loginWithGoogleAdmin: () => Promise<void>;
  loginWithPasscode: (passcode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isNirofyOnline, setIsNirofyOnline] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'guest-login' | 'guest-register' | 'admin-login'>('guest-login');

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      socket.reauth();
    } catch (err) {
      clearStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    socket.connect();

    // Listen to presence events
    const unsubInit = socket.on('presence:init', (presenceMap: Record<string, { isOnline: boolean }>) => {
      if (presenceMap['admin']) {
        setIsNirofyOnline(presenceMap['admin'].isOnline);
      }
    });

    const unsubUpdate = socket.on('presence:update', (data: { userId: string; isOnline: boolean }) => {
      if (data.userId === 'admin') {
        setIsNirofyOnline(data.isOnline);
      }
    });

    return () => {
      unsubInit();
      unsubUpdate();
    };
  }, [refreshUser]);

  const loginGuest = async (identifier: string, pass: string) => {
    const res = await api.login({ identifier, password: pass });
    setStoredToken(res.token);
    setUser(res.user);
    socket.reauth();
    setIsAuthModalOpen(false);
  };

  const registerGuest = async (username: string, pass: string, email?: string) => {
    const res = await api.register({ username, password: pass, email });
    setStoredToken(res.token);
    setUser(res.user);
    socket.reauth();
    setIsAuthModalOpen(false);
  };

  const loginWithGoogleAdmin = async () => {
    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser?.email) {
        throw new Error('Google Sign-in failed: No email returned.');
      }
      const res = await api.googleAdminLogin({
        email: googleUser.email,
        displayName: googleUser.displayName,
      });
      setStoredToken(res.token);
      setUser(res.user);
      socket.reauth();
      setIsAuthModalOpen(false);
    } catch (error: any) {
      console.error('Google Admin Login failed:', error);
      throw error;
    }
  };

  const loginWithPasscode = async (passcode: string) => {
    try {
      const res = await api.adminPasscodeLogin(passcode);
      setStoredToken(res.token);
      setUser(res.user);
      socket.reauth();
      setIsAuthModalOpen(false);
    } catch (error: any) {
      console.error('Passcode login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      await firebaseSignOut().catch(() => {});
    } catch (err) {
      clearStoredToken();
    } finally {
      setUser(null);
      socket.reauth();
    }
  };

  const openAuthModal = (mode: 'guest-login' | 'guest-register' | 'admin-login' = 'guest-login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const isAdmin = user?.role === 'admin';
  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        loading,
        isNirofyOnline,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
        loginGuest,
        registerGuest,
        loginWithGoogleAdmin,
        loginWithPasscode,
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
