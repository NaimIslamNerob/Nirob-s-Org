export type UserRole = 'admin' | 'guest';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  createdAt: string;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface AdminUserData extends User {
  plainPassword?: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  period: string;
  grade?: string;
  level?: 'School' | 'College' | 'University' | 'Certification' | 'Research' | 'Other' | string;
  location?: string;
  description: string;
  isCurrent?: boolean;
}

export interface ProfileHighlight {
  id: string;
  label: string;
  value: string;
  category?: string;
}

export interface ProfileData {
  fullName: string;
  nickname: string;
  tagline: string;
  title?: string;
  avatarUrl: string;
  bio: string;
  location: string;
  statusBadge?: string;
  school?: string;
  college?: string;
  university?: string;
  educationDetails: EducationItem[];
  highlights?: ProfileHighlight[];
  collaborationLink?: string;
  collaborationLabel?: string;
  skills?: string[];
  notes?: {
    id: string;
    title: string;
    date: string;
    category: string;
    content: string;
  }[];
  achievements?: {
    title: string;
    year: string;
    description: string;
  }[];
}

export interface GalleryFolder {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  createdAt: string;
}

export interface GalleryPhoto {
  id: string;
  folderId?: string;
  title: string;
  caption: string;
  imageUrl: string;
  category: string;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface ConversationSummary {
  userId: string;
  username: string;
  email?: string;
  isOnline: boolean;
  lastSeen?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface ChessChallenge {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  timeControl: number; // minutes per player
}

export interface ChessGame {
  id: string;
  whiteId: string;
  whiteName: string;
  blackId: string;
  blackName: string;
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  status: 'active' | 'checkmate' | 'draw' | 'resigned' | 'timeout';
  winner?: 'w' | 'b' | 'draw';
  whiteTime: number; // seconds remaining
  blackTime: number; // seconds remaining
  lastMoveAt: string;
  moveHistory: {
    san: string;
    from: string;
    to: string;
    piece: string;
    captured?: string;
  }[];
  drawOfferFrom?: string | null;
  startedAt: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  icon?: string; // Fallback icon style e.g. "Globe", "Instagram", etc.
  logoUrl?: string; // Custom logo as a photo or image URL/device upload
  url: string;
  username?: string;
  badgeText?: string;
}

export interface CoffeeConfig {
  headline: string;
  subtext: string;
  paymentLink: string;
  qrCodeUrl: string;
  currency: string;
  amounts: number[];
  customNoteAllowed: boolean;
  supportedMethods: string[];
  bkashNumber?: string;
  showBkashNumber?: boolean;
  bkashLogoUrl?: string;
  supporters: {
    id: string;
    name: string;
    cups: number;
    amount: number;
    message?: string;
    date: string;
  }[];
}

export interface SupabaseStatus {
  connected: boolean;
  projectId: string;
  supabaseUrl: string;
  tableFound: boolean;
  lastSyncAt: string | null;
  itemsCount: {
    gallery: number;
    folders: number;
    messages: number;
    socialLinks: number;
    users: number;
  };
  error?: string | null;
}
