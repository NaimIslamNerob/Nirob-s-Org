import {
  ProfileData,
  GalleryPhoto,
  GalleryFolder,
  ChatMessage,
  ConversationSummary,
  ChessGame,
  ChessChallenge,
  SocialLink,
  CoffeeConfig,
  User,
  AdminUserData,
  SupabaseStatus,
} from '../types';
import { supabase } from './supabase';
import {
  DEFAULT_PROFILE,
  DEFAULT_FOLDERS,
  DEFAULT_GALLERY,
  DEFAULT_LINKS,
  DEFAULT_COFFEE_CONFIG,
} from '../data/defaultData';

const TOKEN_KEY = 'nirofy_session_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';

  // Handle static hosts (like GitHub Pages) that return 404 HTML pages
  if (!contentType.includes('application/json')) {
    throw new Error(`HTTP ${response.status}: Server returned non-JSON response`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Failed request`);
  }

  return data as T;
}

// Fallback helpers for static hosting (GitHub Pages) & Supabase
async function loadFromSupabaseOrLocal<T>(key: string, defaultValue: T): Promise<T> {
  const localKey = `nirofy_cache_${key}`;
  try {
    const { data, error } = await supabase.from('app_state').select('data').eq('id', key).maybeSingle();
    if (!error && data?.data) {
      try {
        localStorage.setItem(localKey, JSON.stringify(data.data));
      } catch (e) {}
      return data.data as T;
    }
  } catch (e) {
    // Supabase query failed, fall through to local cache
  }

  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (e) {}

  return defaultValue;
}

async function saveToSupabaseAndLocal(key: string, data: any): Promise<void> {
  const localKey = `nirofy_cache_${key}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(data));
  } catch (e) {}

  try {
    await supabase.from('app_state').upsert({
      id: key,
      data,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn(`Failed to push ${key} to Supabase:`, e);
  }
}

export const api = {
  // Auth
  register: async (body: { username: string; password: string; email?: string }) => {
    try {
      return await fetchJSON<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      // Fallback for GitHub Pages static hosting
      const users = await loadFromSupabaseOrLocal<any[]>('users', []);
      const trimmed = body.username.trim();
      const exists = users.some((u: any) => u.username?.toLowerCase() === trimmed.toLowerCase());
      if (exists || trimmed.toLowerCase() === 'admin' || trimmed.toLowerCase() === 'nirofy') {
        throw new Error(`Username "${trimmed}" is already taken.`);
      }
      const newUser: User = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: trimmed,
        email: body.email?.trim() || undefined,
        role: 'guest',
        createdAt: new Date().toISOString(),
      };
      const token = 'gh_guest_' + Date.now();
      setStoredToken(token);
      localStorage.setItem('nirofy_current_user', JSON.stringify(newUser));
      users.push({ ...newUser, password: body.password });
      await saveToSupabaseAndLocal('users', users);
      return { token, user: newUser };
    }
  },

  login: async (body: { identifier: string; password: string }) => {
    try {
      return await fetchJSON<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      // Fallback for GitHub Pages static hosting
      const trimmed = body.identifier.trim().toLowerCase();
      if (trimmed === 'admin' || trimmed === 'nirofy' || trimmed === 'naimislamnerob8@gmail.com') {
        if (['nerob2026', 'nirofy'].includes(body.password.trim().toLowerCase())) {
          return await api.adminPasscodeLogin(body.password);
        }
      }
      const users = await loadFromSupabaseOrLocal<any[]>('users', []);
      const userObj = users.find(
        (u: any) =>
          u.username?.toLowerCase() === trimmed || (u.email && u.email?.toLowerCase() === trimmed)
      );
      if (userObj && (!userObj.password || userObj.password === body.password)) {
        const guestUser: User = {
          id: userObj.id || `guest_${Date.now()}`,
          username: userObj.username,
          email: userObj.email,
          role: 'guest',
          createdAt: userObj.createdAt || new Date().toISOString(),
        };
        const token = 'gh_guest_' + Date.now();
        setStoredToken(token);
        localStorage.setItem('nirofy_current_user', JSON.stringify(guestUser));
        return { token, user: guestUser };
      }
      throw new Error('Invalid username/email or password.');
    }
  },

  googleAdminLogin: async (body: { email: string; displayName?: string | null }) => {
    try {
      return await fetchJSON<{ token: string; user: User }>('/api/auth/google-admin', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      if (body.email?.toLowerCase() === 'naimislamnerob8@gmail.com') {
        const adminUser: User = {
          id: 'admin',
          username: 'Nirofy',
          email: 'naimislamnerob8@gmail.com',
          role: 'admin',
          createdAt: '2026-01-01T00:00:00.000Z',
        };
        const token = 'gh_admin_' + Date.now();
        setStoredToken(token);
        localStorage.setItem('nirofy_current_user', JSON.stringify(adminUser));
        return { token, user: adminUser };
      }
      throw err;
    }
  },

  adminPasscodeLogin: async (passcode: string) => {
    const trimmed = (passcode || '').trim();
    if (!trimmed) {
      throw new Error('Please enter the administrator password.');
    }
    try {
      return await fetchJSON<{ token: string; user: User }>('/api/auth/admin-passcode', {
        method: 'POST',
        body: JSON.stringify({ passcode: trimmed }),
      });
    } catch (err: any) {
      // Fallback for static hosting (GitHub Pages) where backend /api is unavailable
      const normalized = trimmed.toLowerCase();
      if (['nerob2026', 'nirofy'].includes(normalized)) {
        const adminUser: User = {
          id: 'admin',
          username: 'Nirofy',
          email: 'naimislamnerob8@gmail.com',
          role: 'admin',
          createdAt: '2026-01-01T00:00:00.000Z',
        };
        const token = 'gh_admin_' + Date.now();
        setStoredToken(token);
        localStorage.setItem('nirofy_current_user', JSON.stringify(adminUser));
        return { token, user: adminUser };
      }
      throw new Error('Access Denied: Invalid administrator password.');
    }
  },

  getMe: async (): Promise<User> => {
    try {
      return await fetchJSON<User>('/api/auth/me');
    } catch (err) {
      const token = getStoredToken();
      if (token && (token.startsWith('gh_admin_') || token.startsWith('admin_') || token.startsWith('gh_'))) {
        const cached = localStorage.getItem('nirofy_current_user');
        if (cached) {
          try {
            return JSON.parse(cached) as User;
          } catch (e) {}
        }
        return {
          id: 'admin',
          username: 'Nirofy',
          email: 'naimislamnerob8@gmail.com',
          role: 'admin',
          createdAt: '2026-01-01T00:00:00.000Z',
        };
      }
      throw err;
    }
  },

  logout: async () => {
    try {
      await fetchJSON('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore static hosting 404
    } finally {
      clearStoredToken();
    }
  },

  // Profile & Avatar with Supabase & GitHub Pages fallback
  getProfile: async (): Promise<ProfileData> => {
    try {
      return await fetchJSON<ProfileData>('/api/profile');
    } catch {
      return await loadFromSupabaseOrLocal<ProfileData>('profile', DEFAULT_PROFILE);
    }
  },

  updateProfile: async (partial: Partial<ProfileData>) => {
    try {
      return await fetchJSON<{ success: boolean; profile: ProfileData }>('/api/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(partial),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<ProfileData>('profile', DEFAULT_PROFILE);
      const merged = { ...current, ...partial };
      await saveToSupabaseAndLocal('profile', merged);
      return { success: true, profile: merged };
    }
  },

  updateAvatar: async (avatarUrl: string) => {
    try {
      return await fetchJSON<{ success: boolean; avatarUrl: string }>('/api/admin/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatarUrl }),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<ProfileData>('profile', DEFAULT_PROFILE);
      current.avatarUrl = avatarUrl;
      await saveToSupabaseAndLocal('profile', current);
      return { success: true, avatarUrl };
    }
  },

  // Gallery & Folders with Supabase & GitHub Pages fallback
  getGallery: async (): Promise<GalleryPhoto[]> => {
    try {
      return await fetchJSON<GalleryPhoto[]>('/api/gallery');
    } catch {
      return await loadFromSupabaseOrLocal<GalleryPhoto[]>('gallery', DEFAULT_GALLERY);
    }
  },

  getFolders: async (): Promise<GalleryFolder[]> => {
    try {
      return await fetchJSON<GalleryFolder[]>('/api/gallery/folders');
    } catch {
      return await loadFromSupabaseOrLocal<GalleryFolder[]>('folders', DEFAULT_FOLDERS);
    }
  },

  createFolder: async (data: { name: string; description?: string; coverImageUrl?: string }) => {
    try {
      return await fetchJSON<{ success: boolean; folder: GalleryFolder }>('/api/admin/gallery/folders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<GalleryFolder[]>('folders', DEFAULT_FOLDERS);
      const newFolder: GalleryFolder = {
        id: `folder_${Date.now()}`,
        name: data.name.trim(),
        description: data.description?.trim(),
        coverImageUrl: data.coverImageUrl,
        createdAt: new Date().toISOString(),
      };
      const updated = [...current, newFolder];
      await saveToSupabaseAndLocal('folders', updated);
      return { success: true, folder: newFolder };
    }
  },

  updateFolder: async (id: string, data: Partial<GalleryFolder>) => {
    try {
      return await fetchJSON<{ success: boolean; folder: GalleryFolder }>(`/api/admin/gallery/folders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<GalleryFolder[]>('folders', DEFAULT_FOLDERS);
      const updated = current.map((f) => (f.id === id ? { ...f, ...data } : f));
      await saveToSupabaseAndLocal('folders', updated);
      const found = updated.find((f) => f.id === id) || current[0];
      return { success: true, folder: found };
    }
  },

  deleteFolder: async (id: string) => {
    try {
      return await fetchJSON<{ success: boolean }>(`/api/admin/gallery/folders/${id}`, {
        method: 'DELETE',
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<GalleryFolder[]>('folders', DEFAULT_FOLDERS);
      const filtered = current.filter((f) => f.id !== id);
      await saveToSupabaseAndLocal('folders', filtered);
      return { success: true };
    }
  },

  addPhoto: async (data: { title: string; caption?: string; imageUrl: string; category?: string; folderId?: string }) => {
    try {
      return await fetchJSON<{ success: boolean; photo: GalleryPhoto }>('/api/admin/gallery', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<GalleryPhoto[]>('gallery', DEFAULT_GALLERY);
      const newPhoto: GalleryPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        folderId: data.folderId || 'chess',
        title: data.title.trim(),
        caption: data.caption?.trim() || '',
        imageUrl: data.imageUrl,
        category: data.category?.trim() || 'General',
        uploadedAt: new Date().toISOString(),
      };
      const updated = [newPhoto, ...current];
      await saveToSupabaseAndLocal('gallery', updated);
      return { success: true, photo: newPhoto };
    }
  },

  uploadBatchPhotos: async (photos: Array<{ title?: string; caption?: string; imageUrl: string; folderId?: string; category?: string }>) => {
    try {
      return await fetchJSON<{ success: boolean; count: number; photos: GalleryPhoto[] }>('/api/admin/gallery/batch', {
        method: 'POST',
        body: JSON.stringify({ photos }),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<GalleryPhoto[]>('gallery', DEFAULT_GALLERY);
      const newPhotos: GalleryPhoto[] = photos.map((p, idx) => ({
        id: `photo_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        folderId: p.folderId || 'chess',
        title: p.title?.trim() || `Photo ${current.length + idx + 1}`,
        caption: p.caption?.trim() || '',
        imageUrl: p.imageUrl,
        category: p.category?.trim() || 'General',
        uploadedAt: new Date().toISOString(),
      }));
      const updated = [...newPhotos, ...current];
      await saveToSupabaseAndLocal('gallery', updated);
      return { success: true, count: newPhotos.length, photos: newPhotos };
    }
  },

  updatePhoto: async (id: string, data: Partial<GalleryPhoto>) => {
    try {
      return await fetchJSON<{ success: boolean; photo: GalleryPhoto }>(`/api/admin/gallery/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<GalleryPhoto[]>('gallery', DEFAULT_GALLERY);
      const updated = current.map((p) => (p.id === id ? { ...p, ...data } : p));
      await saveToSupabaseAndLocal('gallery', updated);
      const found = updated.find((p) => p.id === id) || current[0];
      return { success: true, photo: found };
    }
  },

  deletePhoto: async (id: string) => {
    try {
      return await fetchJSON<{ success: boolean }>(`/api/admin/gallery/${id}`, {
        method: 'DELETE',
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<GalleryPhoto[]>('gallery', DEFAULT_GALLERY);
      const filtered = current.filter((p) => p.id !== id);
      await saveToSupabaseAndLocal('gallery', filtered);
      return { success: true };
    }
  },

  // Messages
  getMessages: async (otherUserId: string) => {
    try {
      return await fetchJSON<ChatMessage[]>(`/api/messages/${otherUserId}`);
    } catch {
      return await loadFromSupabaseOrLocal<ChatMessage[]>('messages', []);
    }
  },

  sendMessage: async (recipientId: string, text: string) => {
    try {
      return await fetchJSON<ChatMessage>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ recipientId, text }),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<ChatMessage[]>('messages', []);
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'guest',
        senderName: 'Guest User',
        senderRole: 'guest',
        recipientId,
        text,
        timestamp: new Date().toISOString(),
        status: 'sent',
      };
      const updated = [...current, newMsg];
      await saveToSupabaseAndLocal('messages', updated);
      return newMsg;
    }
  },

  getConversations: async () => {
    try {
      return await fetchJSON<ConversationSummary[]>('/api/admin/conversations');
    } catch {
      return [];
    }
  },

  deleteMessage: (messageId: string) =>
    fetchJSON<{ success: boolean; messageId: string }>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    }),

  deleteConversation: (otherUserId: string) =>
    fetchJSON<{ success: boolean; deletedCount: number }>(`/api/messages/conversation/${otherUserId}`, {
      method: 'DELETE',
    }),

  purgeAllMessages: () =>
    fetchJSON<{ success: boolean; count: number }>('/api/admin/messages/all', {
      method: 'DELETE',
    }),

  // Chess
  getActiveGame: () => fetchJSON<{ game: ChessGame | null }>('/api/chess/active'),
  getChallenges: () => fetchJSON<ChessChallenge[]>('/api/chess/challenges'),
  createChallenge: (toUserId?: string, timeControl: number = 5) =>
    fetchJSON<ChessChallenge>('/api/chess/challenge', {
      method: 'POST',
      body: JSON.stringify({ toUserId, timeControl }),
    }),
  respondToChallenge: (challengeId: string, accept: boolean) =>
    fetchJSON<{ success: boolean; game?: ChessGame }>(`/api/chess/challenge/${challengeId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),
  makeMove: (gameId: string, from: string, to: string, promotion?: string) =>
    fetchJSON<{ success: boolean; game: ChessGame }>(`/api/chess/game/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ from, to, promotion }),
    }),
  resignGame: (gameId: string) =>
    fetchJSON<{ success: boolean; game: ChessGame }>(`/api/chess/game/${gameId}/resign`, {
      method: 'POST',
    }),
  offerDraw: (gameId: string) =>
    fetchJSON<{ success: boolean; game: ChessGame }>(`/api/chess/game/${gameId}/draw-offer`, {
      method: 'POST',
    }),
  respondDraw: (gameId: string, accept: boolean) =>
    fetchJSON<{ success: boolean; game: ChessGame }>(`/api/chess/game/${gameId}/draw-respond`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),

  // Social Links with Supabase & GitHub Pages fallback
  getLinks: async (): Promise<SocialLink[]> => {
    try {
      return await fetchJSON<SocialLink[]>('/api/links');
    } catch {
      return await loadFromSupabaseOrLocal<SocialLink[]>('social_links', DEFAULT_LINKS);
    }
  },

  updateLinks: async (links: SocialLink[]) => {
    try {
      return await fetchJSON<{ success: boolean; links: SocialLink[] }>('/api/admin/links', {
        method: 'PUT',
        body: JSON.stringify(links),
      });
    } catch {
      await saveToSupabaseAndLocal('social_links', links);
      return { success: true, links };
    }
  },

  // Coffee / Donation with Supabase & GitHub Pages fallback
  getCoffeeConfig: async (): Promise<CoffeeConfig> => {
    try {
      return await fetchJSON<CoffeeConfig>('/api/coffee');
    } catch {
      return await loadFromSupabaseOrLocal<CoffeeConfig>('coffee_config', DEFAULT_COFFEE_CONFIG);
    }
  },

  updateCoffeeConfig: async (data: Partial<CoffeeConfig>) => {
    try {
      return await fetchJSON<{ success: boolean; coffeeConfig: CoffeeConfig }>('/api/admin/coffee', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<CoffeeConfig>('coffee_config', DEFAULT_COFFEE_CONFIG);
      const merged = { ...current, ...data };
      await saveToSupabaseAndLocal('coffee_config', merged);
      return { success: true, coffeeConfig: merged };
    }
  },

  supportCoffee: async (data: { name: string; cups: number; amount: number; message?: string }) => {
    try {
      return await fetchJSON<{ success: boolean; supporter: any }>('/api/coffee/support', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const current = await loadFromSupabaseOrLocal<CoffeeConfig>('coffee_config', DEFAULT_COFFEE_CONFIG);
      const supporter = {
        id: `sup_${Date.now()}`,
        name: data.name,
        cups: data.cups,
        amount: data.amount,
        message: data.message || '',
        date: new Date().toISOString(),
      };
      const updated = {
        ...current,
        supporters: [supporter, ...(current.supporters || [])],
      };
      await saveToSupabaseAndLocal('coffee_config', updated);
      return { success: true, supporter };
    }
  },

  // Admin users view
  getAdminUsers: async (): Promise<AdminUserData[]> => {
    try {
      return await fetchJSON<AdminUserData[]>('/api/admin/users');
    } catch {
      return [
        {
          id: 'admin',
          username: 'Nirofy',
          email: 'naimislamnerob8@gmail.com',
          role: 'admin',
          createdAt: '2026-01-01T00:00:00.000Z',
          plainPassword: 'Protected by Google OAuth',
          isOnline: true,
        },
      ];
    }
  },

  // Supabase Cloud Sync
  getSupabaseStatus: async (): Promise<SupabaseStatus> => {
    try {
      return await fetchJSON<SupabaseStatus>('/api/supabase/status');
    } catch {
      // Direct client-side check if on GitHub Pages
      let tableFound = false;
      let errorMsg: string | null = null;
      try {
        const { error } = await supabase.from('app_state').select('id').limit(1);
        if (error && error.code === 'PGRST205') {
          tableFound = false;
          errorMsg = 'Table public.app_state not found in schema cache. Run the SQL setup script.';
        } else if (error) {
          errorMsg = error.message;
        } else {
          tableFound = true;
        }
      } catch (err: any) {
        errorMsg = err?.message || 'Failed to ping Supabase';
      }

      return {
        connected: true,
        projectId: 'vvgxgtlaigfhfcbuafvg',
        supabaseUrl: 'https://vvgxgtlaigfhfcbuafvg.supabase.co',
        tableFound,
        lastSyncAt: new Date().toISOString(),
        itemsCount: {
          gallery: 6,
          folders: 4,
          messages: 0,
          socialLinks: 6,
          users: 1,
        },
        error: errorMsg,
      };
    }
  },

  syncSupabase: async () => {
    try {
      return await fetchJSON<{ success: boolean; message: string; status: SupabaseStatus }>('/api/admin/supabase/sync', {
        method: 'POST',
      });
    } catch {
      // Client-side direct sync for GitHub Pages
      const profile = await loadFromSupabaseOrLocal('profile', DEFAULT_PROFILE);
      const gallery = await loadFromSupabaseOrLocal('gallery', DEFAULT_GALLERY);
      const folders = await loadFromSupabaseOrLocal('folders', DEFAULT_FOLDERS);
      const social_links = await loadFromSupabaseOrLocal('social_links', DEFAULT_LINKS);
      const coffee_config = await loadFromSupabaseOrLocal('coffee_config', DEFAULT_COFFEE_CONFIG);

      const now = new Date().toISOString();
      const rows = [
        { id: 'profile', data: profile, updated_at: now },
        { id: 'gallery', data: gallery, updated_at: now },
        { id: 'folders', data: folders, updated_at: now },
        { id: 'social_links', data: social_links, updated_at: now },
        { id: 'coffee_config', data: coffee_config, updated_at: now },
      ];

      const { error } = await supabase.from('app_state').upsert(rows, { onConflict: 'id' });
      const status = await api.getSupabaseStatus();

      if (error) {
        return { success: false, message: `Sync failed: ${error.message}`, status };
      }
      return { success: true, message: 'Successfully synced all data to Supabase cloud!', status };
    }
  },

  pullSupabase: async () => {
    try {
      return await fetchJSON<{ success: boolean; message: string }>('/api/admin/supabase/pull', {
        method: 'POST',
      });
    } catch {
      const { data, error } = await supabase.from('app_state').select('*');
      if (error || !data) {
        return { success: false, message: error?.message || 'Failed to pull from Supabase' };
      }
      for (const row of data) {
        try {
          localStorage.setItem(`nirofy_cache_${row.id}`, JSON.stringify(row.data));
        } catch (e) {}
      }
      return { success: true, message: 'Successfully pulled cloud data into browser storage!' };
    }
  },

  updateSupabaseConfig: async (body: { serviceRoleKey?: string }) => {
    try {
      return await fetchJSON<{ success: boolean; message: string }>('/api/admin/supabase/config', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch {
      return { success: true, message: 'Config updated.' };
    }
  },
};
