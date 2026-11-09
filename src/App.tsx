import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';
import { GalleryPage } from './pages/GalleryPage';
import { ChatPage } from './pages/ChatPage';
import { ChessPage } from './pages/ChessPage';
import { SocialPage } from './pages/SocialPage';
import { CoffeePage } from './pages/CoffeePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfileData, GalleryPhoto, GalleryFolder, SocialLink, CoffeeConfig } from './types';
import { api } from './lib/api';
import { socket } from './lib/socket';

import { X } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [adminInitialTab, setAdminInitialTab] = useState<string>('overview');
  const [coffeeLeaveMessage, setCoffeeLeaveMessage] = useState<boolean>(false);

  // Auto-dismiss coffee exit floating message after 12 seconds
  useEffect(() => {
    if (coffeeLeaveMessage) {
      const timer = setTimeout(() => {
        setCoffeeLeaveMessage(false);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [coffeeLeaveMessage]);

  const handleNavigateTab = (tab: string) => {
    if (currentTab === 'coffee' && tab !== 'coffee') {
      setCoffeeLeaveMessage(true);
    }
    setCurrentTab(tab);
  };

  // Shared data
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [coffeeConfig, setCoffeeConfig] = useState<CoffeeConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Indicators
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasActiveChallenge, setHasActiveChallenge] = useState<boolean>(false);

  const fetchAllData = useCallback(async () => {
    try {
      const [p, g, f, l, c] = await Promise.all([
        api.getProfile(),
        api.getGallery(),
        api.getFolders(),
        api.getLinks(),
        api.getCoffeeConfig(),
      ]);
      setProfile(p);
      setGallery(g);
      setFolders(f);
      setLinks(l);
      setCoffeeConfig(c);
    } catch (err) {
      console.error('Failed to load website data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkBadges = useCallback(async () => {
    if (!user) return;
    try {
      if (isAdmin) {
        const convos = await api.getConversations();
        const unread = convos.reduce((acc, cv) => acc + cv.unreadCount, 0);
        setUnreadCount(unread);
      }
      const chs = await api.getChallenges();
      setHasActiveChallenge(chs.length > 0);
    } catch (e) {}
  }, [user, isAdmin]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    checkBadges();
  }, [checkBadges]);

  // Global socket listeners for real-time site updates
  useEffect(() => {
    const unsubProfile = socket.on('profile:updated', (newProfile: ProfileData) => {
      setProfile(newProfile);
    });
    const unsubGallery = socket.on('gallery:updated', (newGallery: GalleryPhoto[]) => {
      setGallery(newGallery);
    });
    const unsubFolders = socket.on('gallery:folders_updated', (newFolders: GalleryFolder[]) => {
      setFolders(newFolders);
    });
    const unsubLinks = socket.on('links:updated', (newLinks: SocialLink[]) => {
      setLinks(newLinks);
    });
    const unsubCoffee = socket.on('coffee:updated', (newCoffee: CoffeeConfig) => {
      setCoffeeConfig(newCoffee);
    });
    const unsubMsg = socket.on('message:new', () => {
      checkBadges();
    });
    const unsubChal = socket.on('chess:challenge_received', () => {
      setHasActiveChallenge(true);
    });

    return () => {
      unsubProfile();
      unsubGallery();
      unsubFolders();
      unsubLinks();
      unsubCoffee();
      unsubMsg();
      unsubChal();
    };
  }, [checkBadges]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950 relative">
      {/* Navbar with brand logo */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={handleNavigateTab}
        unreadCount={unreadCount}
        hasActiveChallenge={hasActiveChallenge}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Loading Nirofy...</span>
          </div>
        ) : (
          <>
            {currentTab === 'home' && (
              <HomePage
                profile={profile}
                onNavigate={(tab) => handleNavigateTab(tab)}
                onRefresh={fetchAllData}
              />
            )}
            {currentTab === 'gallery' && (
              <GalleryPage
                photos={gallery}
                folders={folders}
                onRefresh={fetchAllData}
                onOpenAdminUpload={() => {
                  setAdminInitialTab('gallery');
                  handleNavigateTab('admin');
                }}
              />
            )}
            {currentTab === 'chat' && <ChatPage />}
            {currentTab === 'chess' && <ChessPage />}
            {currentTab === 'social' && (
              <SocialPage
                links={links}
                profile={profile}
                onRefresh={fetchAllData}
                onOpenAdminLinks={() => {
                  setAdminInitialTab('links');
                  handleNavigateTab('admin');
                }}
              />
            )}
            {currentTab === 'coffee' && (
              <CoffeePage
                config={coffeeConfig}
                onRefresh={fetchAllData}
                onOpenAdminCoffee={() => {
                  setAdminInitialTab('coffee');
                  handleNavigateTab('admin');
                }}
                onTriggerLeaveMessage={() => setCoffeeLeaveMessage(true)}
              />
            )}
            {currentTab === 'admin' && (
              <AdminDashboard
                initialProfile={profile}
                initialGallery={gallery}
                initialFolders={folders}
                initialLinks={links}
                initialCoffee={coffeeConfig}
                initialTab={adminInitialTab}
                onRefreshAll={fetchAllData}
                onNavigateTab={(tab) => handleNavigateTab(tab)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={(tab) => handleNavigateTab(tab)} />

      {/* Floating Leave Coffee Message */}
      {coffeeLeaveMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md p-4 rounded-3xl bg-slate-900/95 border-2 border-pink-500 shadow-2xl shadow-pink-500/30 text-white animate-bounce backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-pink-600/30 border border-pink-500/50 p-1 shrink-0 flex items-center justify-center">
              <img
                src="/assets/aistudio/image_3f45f398.png"
                alt="bKash"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base text-pink-400">
                ছি গরীব, টাকা দেয় না !!!
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Ignore the message if u have already donated
              </p>
            </div>
          </div>
          <button
            onClick={() => setCoffeeLeaveMessage(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
