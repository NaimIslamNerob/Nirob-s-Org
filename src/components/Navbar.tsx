import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Crown,
  MessageSquare,
  Image as ImageIcon,
  User,
  Coffee,
  Share2,
  Shield,
  LogOut,
  LogIn,
  Menu,
  X,
  Swords,
  Radio,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  unreadCount?: number;
  hasActiveChallenge?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  unreadCount = 0,
  hasActiveChallenge = false,
}) => {
  const { user, isAdmin, isNirofyOnline, openAuthModal, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: User },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    {
      id: 'chat',
      label: isAdmin ? 'Inbox' : 'Private Chat',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      id: 'chess',
      label: 'Live Chess',
      icon: Swords,
      badge: hasActiveChallenge ? '!' : null,
      highlight: hasActiveChallenge,
    },
    { id: 'social', label: 'Social & Links', icon: Share2 },
    { id: 'coffee', label: 'Buy Me a Coffee', icon: Coffee },
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Presence */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-white p-1 shadow-md shadow-sky-950/50 flex items-center justify-center overflow-hidden border border-slate-700/80 group-hover:scale-105 transition-transform">
              <img
                src="/assets/aistudio/bf806f74-d653-4af6-b7be-37ab74ecbf98_b6272376.jpg"
                alt="Nirofy Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
                  Nirofy
                </span>
                {/* Live Online Badge for Nirofy */}
                <div
                  className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/60"
                  title={isNirofyOnline ? 'Nirofy is active right now' : 'Nirofy is offline'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isNirofyOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span className={isNirofyOnline ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                    {isNirofyOnline ? 'Online' : 'Away'}
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 font-semibold shadow-inner border border-sky-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-sky-500 text-slate-950 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Controls */}
        <div className="hidden sm:flex items-center space-x-3">
          {isAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                currentTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-sky-600/30 text-sky-400 flex items-center justify-center font-bold text-xs uppercase border border-sky-500/40">
                {user.username.charAt(0)}
              </div>
              <div className="text-left text-xs">
                <span className="font-semibold text-slate-200 block truncate max-w-[90px]">
                  {user.username}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-slate-800 transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('guest-login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-400" />
                <span>Guest Sign In</span>
              </button>
              <button
                onClick={() => openAuthModal('admin-login')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer"
                title="Admin Login for Naim Islam Nerob"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center space-x-2 lg:hidden">
          {isAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40"
              title="Admin"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-2xl px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-sky-500 text-slate-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            {isAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Management Dashboard</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-sky-600/30 text-sky-400 flex items-center justify-center font-bold text-xs uppercase">
                    {user.username.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{user.username}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{user.role} role</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('guest-login');
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-sky-500 text-slate-950 text-center"
                >
                  Guest Login / Sign Up
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('admin-login');
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 text-center"
                >
                  Admin Google Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
