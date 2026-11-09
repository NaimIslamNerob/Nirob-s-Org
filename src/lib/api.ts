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
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Failed request`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: { username: string; password: string; email?: string }) =>
    fetchJSON<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { identifier: string; password: string }) =>
    fetchJSON<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  googleAdminLogin: (body: { email: string; displayName?: string | null }) =>
    fetchJSON<{ token: string; user: User }>('/api/auth/google-admin', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminPasscodeLogin: (passcode: string) =>
    fetchJSON<{ token: string; user: User }>('/api/auth/admin-passcode', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  getMe: () => fetchJSON<User>('/api/auth/me'),

  logout: async () => {
    try {
      await fetchJSON('/api/auth/logout', { method: 'POST' });
    } finally {
      clearStoredToken();
    }
  },

  // Profile & Avatar
  getProfile: () => fetchJSON<ProfileData>('/api/profile'),
  updateProfile: (profile: Partial<ProfileData>) =>
    fetchJSON<{ success: boolean; profile: ProfileData }>('/api/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
  updateAvatar: (avatarUrl: string) =>
    fetchJSON<{ success: boolean; avatarUrl: string }>('/api/admin/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatarUrl }),
    }),

  // Gallery & Folders
  getGallery: () => fetchJSON<GalleryPhoto[]>('/api/gallery'),
  getFolders: () => fetchJSON<GalleryFolder[]>('/api/gallery/folders'),
  createFolder: (data: { name: string; description?: string; coverImageUrl?: string }) =>
    fetchJSON<{ success: boolean; folder: GalleryFolder }>('/api/admin/gallery/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFolder: (id: string, data: Partial<GalleryFolder>) =>
    fetchJSON<{ success: boolean; folder: GalleryFolder }>(`/api/admin/gallery/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteFolder: (id: string) =>
    fetchJSON<{ success: boolean }>(`/api/admin/gallery/folders/${id}`, {
      method: 'DELETE',
    }),
  addPhoto: (data: { title: string; caption?: string; imageUrl: string; category?: string; folderId?: string }) =>
    fetchJSON<{ success: boolean; photo: GalleryPhoto }>('/api/admin/gallery', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadBatchPhotos: (photos: Array<{ title?: string; caption?: string; imageUrl: string; folderId?: string; category?: string }>) =>
    fetchJSON<{ success: boolean; count: number; photos: GalleryPhoto[] }>('/api/admin/gallery/batch', {
      method: 'POST',
      body: JSON.stringify({ photos }),
    }),
  updatePhoto: (id: string, data: Partial<GalleryPhoto>) =>
    fetchJSON<{ success: boolean; photo: GalleryPhoto }>(`/api/admin/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePhoto: (id: string) =>
    fetchJSON<{ success: boolean }>(`/api/admin/gallery/${id}`, {
      method: 'DELETE',
    }),

  // Messages
  getMessages: (otherUserId: string) => fetchJSON<ChatMessage[]>(`/api/messages/${otherUserId}`),
  sendMessage: (recipientId: string, text: string) =>
    fetchJSON<ChatMessage>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, text }),
    }),
  getConversations: () => fetchJSON<ConversationSummary[]>('/api/admin/conversations'),
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

  // Social Links
  getLinks: () => fetchJSON<SocialLink[]>('/api/links'),
  updateLinks: (links: SocialLink[]) =>
    fetchJSON<{ success: boolean; links: SocialLink[] }>('/api/admin/links', {
      method: 'PUT',
      body: JSON.stringify(links),
    }),

  // Coffee / Donation
  getCoffeeConfig: () => fetchJSON<CoffeeConfig>('/api/coffee'),
  updateCoffeeConfig: (data: Partial<CoffeeConfig>) =>
    fetchJSON<{ success: boolean; coffeeConfig: CoffeeConfig }>('/api/admin/coffee', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  supportCoffee: (data: { name: string; cups: number; amount: number; message?: string }) =>
    fetchJSON<{ success: boolean; supporter: any }>('/api/coffee/support', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Admin users view
  getAdminUsers: () => fetchJSON<AdminUserData[]>('/api/admin/users'),

  // Supabase Cloud Sync
  getSupabaseStatus: () => fetchJSON<SupabaseStatus>('/api/supabase/status'),
  syncSupabase: () =>
    fetchJSON<{ success: boolean; message: string; status: SupabaseStatus }>('/api/admin/supabase/sync', {
      method: 'POST',
    }),
  pullSupabase: () =>
    fetchJSON<{ success: boolean; message: string }>('/api/admin/supabase/pull', {
      method: 'POST',
    }),
  updateSupabaseConfig: (body: { serviceRoleKey?: string }) =>
    fetchJSON<{ success: boolean; message: string }>('/api/admin/supabase/config', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
