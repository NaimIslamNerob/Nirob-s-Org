import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ShieldCheck, UserCheck, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    loginGuest,
    registerGuest,
    loginWithGoogleAdmin,
    loginWithPasscode,
  } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [usePasscodeMode, setUsePasscodeMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginGuest(identifier, password);
      setIdentifier('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerGuest(username, password, email || undefined);
      setUsername('');
      setPassword('');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Choose a different username.');
    } finally {
      setLoading(false);
    }
  };

  const [domainNotice, setDomainNotice] = useState(false);

  const handleGoogleAdmin = async () => {
    setError(null);
    setDomainNotice(false);
    setLoading(true);
    try {
      await loginWithGoogleAdmin();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setDomainNotice(true);
        setError(
          'Google Sign-in on GitHub Pages is blocked by Firebase domain security until "naimislamnerob.github.io" is whitelisted in Firebase Console. You can log in right now using your Secret Owner Password below.'
        );
      } else {
        setError(err.message || 'Google verification failed or unauthorized.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = adminPasscode.trim();
    if (!code) {
      setError('Please enter your administrator password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithPasscode(code);
      setAdminPasscode('');
    } catch (err: any) {
      setError(err.message || 'Access Denied: Invalid administrator password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 p-6 md:p-8 shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 pb-3 mb-6 space-x-4">
          <button
            onClick={() => {
              setAuthModalMode('guest-login');
              setError(null);
            }}
            className={`text-sm font-semibold pb-2 border-b-2 transition-all ${
              authModalMode === 'guest-login'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Guest Login
          </button>
          <button
            onClick={() => {
              setAuthModalMode('guest-register');
              setError(null);
            }}
            className={`text-sm font-semibold pb-2 border-b-2 transition-all ${
              authModalMode === 'guest-register'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => {
              setAuthModalMode('admin-login');
              setError(null);
            }}
            className={`text-sm font-semibold pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
              authModalMode === 'admin-login'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Admin Login
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>{error}</div>
          </div>
        )}

        {/* Mode 1: Guest Login */}
        {authModalMode === 'guest-login' && (
          <form onSubmit={handleGuestLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username or Email</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Enter your username or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/70 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/70 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 mt-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-medium rounded-xl text-sm shadow-lg shadow-sky-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Sign In as Guest'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              First time here?{' '}
              <button
                type="button"
                onClick={() => setAuthModalMode('guest-register')}
                className="text-sky-400 hover:underline font-semibold"
              >
                Create a free guest account
              </button>
            </p>
          </form>
        )}

        {/* Mode 2: Guest Registration */}
        {authModalMode === 'guest-register' && (
          <form onSubmit={handleGuestRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Choose a Unique Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. chessmaster, alex_22"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/70 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Each username is unique to you for messaging and live chess gameplay.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address <span className="text-slate-500 text-[10px]">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/70 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/70 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 mt-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-medium rounded-xl text-sm shadow-lg shadow-sky-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-slate-400 pt-1">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalMode('guest-login')}
                className="text-sky-400 hover:underline font-semibold"
              >
                Log in here
              </button>
            </p>
          </form>
        )}

        {/* Mode 3: Admin Login */}
        {authModalMode === 'admin-login' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                Protected Administrator Portal
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Restricted to the verified site owner (<strong className="text-amber-300 font-mono">naimislamnerob8@gmail.com</strong>).
              </p>
            </div>

            {/* Primary Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleAdmin}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 text-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Signing in with Google...' : 'Sign in with Google as Admin'}</span>
            </button>

            {domainNotice && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs text-left space-y-2">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  How to enable Google Sign-In on GitHub Pages:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    Open{' '}
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0826734634/authentication/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 underline font-semibold hover:text-amber-300"
                    >
                      Firebase Console Settings
                    </a>
                  </li>
                  <li>Click <strong>Authorized Domains</strong> &gt; <strong>Add domain</strong></li>
                  <li>Type: <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono">naimislamnerob.github.io</code></li>
                </ol>
                <div className="text-[11px] text-amber-300/90 pt-1 border-t border-amber-500/20">
                  ⚡ <em>Meanwhile, enter your secret Owner Password below to log in immediately!</em>
                </div>
              </div>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Or Secret Owner Password</span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Secret Owner Password Form */}
            <form onSubmit={handlePasscodeAdmin} className="space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Administrator Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter secret administrator password"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !adminPasscode.trim()}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Password & Enter Admin</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
