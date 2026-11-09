import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Chess } from 'chess.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = 3000;
const ADMIN_EMAIL = 'naimislamnerob8@gmail.com';
const ADMIN_PASSCODE = 'nerob2026';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_SECRET || 'nirofy-secret-vault-key-2026').digest();
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Reversible encryption for the admin view of user passwords as requested
function encryptPassword(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptPassword(encryptedStr: string): string {
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) return encryptedStr;
    const [ivHex, authTagHex, cipherText] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '***';
  }
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 32).toString('hex');
  return { hash, salt: actualSalt };
}

// Database Schema & Seed Data
interface DBData {
  users: Array<{
    id: string;
    username: string;
    email?: string;
    avatarUrl?: string;
    role: 'admin' | 'guest';
    passwordHash: string;
    passwordSalt: string;
    encryptedPassword: string;
    createdAt: string;
    lastSeen: string;
  }>;
  profile: any;
  folders: Array<{
    id: string;
    name: string;
    description?: string;
    coverImageUrl?: string;
    createdAt: string;
  }>;
  gallery: any[];
  messages: any[];
  chessGames: any[];
  chessChallenges: any[];
  socialLinks: any[];
  coffeeConfig: any;
  sessions?: Record<string, { userId: string; role: 'admin' | 'guest'; username: string; expiresAt: number }>;
}

function getInitialDB(): DBData {
  return {
    users: [
      {
        id: 'admin',
        username: 'Nirofy',
        email: ADMIN_EMAIL,
        role: 'admin',
        passwordHash: 'GOOGLE_OAUTH_PROTECTED',
        passwordSalt: 'GOOGLE_SALT',
        encryptedPassword: encryptPassword('Google_OAuth_Verified'),
        createdAt: '2026-01-01T00:00:00.000Z',
        lastSeen: new Date().toISOString(),
      },
    ],
    profile: {
      fullName: 'Naim Islam Nerob',
      nickname: 'Nirofy',
      title: 'Software Engineer & Competitive Chess Strategist',
      tagline: 'Crafting high-performance digital systems, exploring AI, and playing strategic live chess.',
      statusBadge: '🟢 Open for Live Chess Challenges & Collaborations',
      avatarUrl: '/assets/aistudio/bf806f74-d653-4af6-b7be-37ab74ecbf98_b6272376.jpg',
      bio: "Hello, I am Naim Islam Nerob, widely known as Nirofy. I am passionate about crafting high-performance digital experiences, exploring artificial intelligence, playing strategic live chess, and building meaningful connections.",
      school: 'Government Laboratory High School',
      college: 'Notre Dame College',
      university: 'University of Engineering and Technology (CSE)',
      location: 'Dhaka, Bangladesh',
      highlights: [
        { id: 'hl-1', label: 'Chess Rating', value: '2100+ Rapid & Blitz Strategist' },
        { id: 'hl-2', label: 'Core Engineering', value: 'Full-Stack TypeScript & AI Systems' },
        { id: 'hl-3', label: 'Higher Education', value: 'B.Sc. in Computer Science & Engineering' },
        { id: 'hl-4', label: 'Residence', value: 'Dhaka, Bangladesh' }
      ],
      educationDetails: [
        {
          id: 'edu-1',
          institution: 'Government Laboratory High School',
          degree: 'Secondary School Certificate (Science)',
          field: 'Science',
          period: '2016 – 2020',
          grade: 'GPA 5.00 / 5.00',
          level: 'School',
          location: 'Dhaka, Bangladesh',
          description: 'Graduated with high honors, active member of science club and junior chess team champion.',
          isCurrent: false,
        },
        {
          id: 'edu-2',
          institution: 'Notre Dame College',
          degree: 'Higher Secondary Certificate (Science)',
          field: 'Science',
          period: '2020 – 2022',
          grade: 'GPA 5.00 / 5.00',
          level: 'College',
          location: 'Dhaka, Bangladesh',
          description: 'Focus on advanced physics, mathematics, and computing sciences. NDIT Club executive.',
          isCurrent: false,
        },
        {
          id: 'edu-3',
          institution: 'University of Engineering and Technology',
          degree: 'B.Sc. in Computer Science and Engineering',
          field: 'Computer Science & Engineering',
          period: '2022 – Present',
          grade: 'First Class Honours (Pursuing)',
          level: 'University',
          location: 'Dhaka, Bangladesh',
          description: 'Specializing in distributed systems, full-stack architectures, algorithms, and AI systems.',
          isCurrent: true,
        },
      ],
      skills: ['TypeScript', 'React', 'Node.js', 'System Architecture', 'Chess Strategy', 'UI/UX Design', 'WebSockets', 'PostgreSQL'],
      notes: [
        {
          id: 'note-1',
          title: 'The Art of Calculation in Rapid Chess',
          date: 'Nov 2026',
          category: 'Chess',
          content: 'In 5-minute rapid chess, intuition and tactical pattern recognition outweigh deep brute-force analysis. A sound pawn structure and active piece placement consistently yield practical winning chances.',
        },
        {
          id: 'note-2',
          title: 'Building Real-Time Multi-User Web Experiences',
          date: 'Oct 2026',
          category: 'Tech',
          content: 'Modern collaborative web applications require server-authoritative state synchronizations with optimistic local updates. WebSockets provide the sub-50ms responsiveness required for seamless interactivity.',
        },
        {
          id: 'note-3',
          title: 'Lessons from Competitive Programming',
          date: 'Aug 2026',
          category: 'Algorithms',
          content: 'Breaking down multifaceted real-world engineering hurdles mirrors greedy algorithms and dynamic programming: decompose into independent subproblems, optimize edge cases, and test rigor.',
        },
      ],
      achievements: [
        {
          title: 'Divisional Chess Championship Winner',
          year: '2025',
          description: 'Secured 1st place with an unbeaten 7/7 score in the Open Classical & Rapid Category.',
        },
        {
          title: 'National Hackathon Finalist',
          year: '2024',
          description: 'Built a collaborative peer learning platform with sub-second synchronization.',
        },
      ],
    },
    folders: [
      {
        id: 'chess',
        name: 'Chess Tournaments',
        description: 'Classical and rapid chess events, trophies, boards, and championship moments',
        coverImageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'campus',
        name: 'Campus Life & Education',
        description: 'Memories from school, Notre Dame College, and university labs',
        coverImageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'travel',
        name: 'Travel & Nature',
        description: 'Scenic getaways, river deltas, sunsets, and expeditions',
        coverImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'workspace',
        name: 'Developer & Workstation',
        description: 'Engineering sprints, coding setup, algorithms, and hackathons',
        coverImageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    gallery: [
      {
        id: 'photo-1',
        folderId: 'chess',
        title: 'National Chess Championship Blitz Round',
        caption: 'Focus and calculation during a crucial round with the black pieces playing the Sicilian Defense.',
        imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1200&q=80',
        category: 'Chess',
        uploadedAt: '2026-10-12T14:30:00.000Z',
      },
      {
        id: 'photo-2',
        folderId: 'campus',
        title: 'Tech Campus & University Lawn',
        caption: 'Golden hour reflections after an inspiring day of algorithms and software engineering labs.',
        imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
        category: 'Campus',
        uploadedAt: '2026-09-28T18:00:00.000Z',
      },
      {
        id: 'photo-3',
        folderId: 'travel',
        title: 'Sunset over the River Delta',
        caption: 'Peaceful weekend getaway capturing the serene evening horizon.',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        category: 'Travel',
        uploadedAt: '2026-08-15T19:20:00.000Z',
      },
      {
        id: 'photo-4',
        folderId: 'workspace',
        title: 'Developer Workspace & Code Sprint',
        caption: 'Late night coding session developing real-time distributed applications.',
        imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
        category: 'Workspace',
        uploadedAt: '2026-07-04T22:15:00.000Z',
      },
      {
        id: 'photo-5',
        folderId: 'chess',
        title: 'Classic Wooden Staunton Chess Set',
        caption: 'Study of endgame studies: King and Pawn mechanics and endgame fortresses.',
        imageUrl: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&w=1200&q=80',
        category: 'Chess',
        uploadedAt: '2026-06-20T11:00:00.000Z',
      },
      {
        id: 'photo-6',
        folderId: 'campus',
        title: 'Notre Dame College Fest Memories',
        caption: 'Revisiting the iconic college campus with dear batchmates and mentors.',
        imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
        category: 'Campus',
        uploadedAt: '2026-05-18T16:45:00.000Z',
      },
    ],
    messages: [
      {
        id: 'msg-welcome',
        senderId: 'admin',
        senderName: 'Nirofy',
        senderRole: 'admin',
        recipientId: 'guest-preview',
        text: 'Welcome to my official website! Feel free to send me a message here or challenge me to a game of live chess.',
        timestamp: new Date().toISOString(),
        status: 'read',
      },
    ],
    chessGames: [],
    chessChallenges: [],
    socialLinks: [
      {
        id: 'link-1',
        platform: 'Facebook',
        icon: 'Facebook',
        url: 'https://facebook.com',
        username: 'Naim Islam Nerob',
        badgeText: 'Connect',
      },
      {
        id: 'link-2',
        platform: 'Instagram',
        icon: 'Instagram',
        url: 'https://instagram.com',
        username: '@nirofy',
        badgeText: 'Follow',
      },
      {
        id: 'link-3',
        platform: 'Chess.com',
        icon: 'Crown',
        url: 'https://chess.com',
        username: 'NirofyMaster',
        badgeText: 'Play Chess',
      },
      {
        id: 'link-4',
        platform: 'GitHub',
        icon: 'Github',
        url: 'https://github.com',
        username: 'nirofy',
        badgeText: 'Open Source',
      },
      {
        id: 'link-5',
        platform: 'LinkedIn',
        icon: 'Linkedin',
        url: 'https://linkedin.com',
        username: 'Naim Islam Nerob',
        badgeText: 'Professional',
      },
      {
        id: 'link-6',
        platform: 'Direct Email',
        icon: 'Mail',
        url: 'mailto:naimislamnerob8@gmail.com',
        username: 'naimislamnerob8@gmail.com',
        badgeText: 'Inquiries',
      },
    ],
    coffeeConfig: {
      headline: 'Support My Work & Studies',
      subtext: 'If you appreciate my written notes, open-source projects, or had fun playing chess together, you can voluntarily buy me a cup of coffee!',
      paymentLink: 'https://buymeacoffee.com/nirofy',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://buymeacoffee.com/nirofy',
      currency: 'USD',
      amounts: [3, 5, 10, 25],
      customNoteAllowed: true,
      supportedMethods: ['bKash Personal', 'Card / Apple Pay', 'Direct Transfer'],
      bkashNumber: '+880 1763854187',
      showBkashNumber: true,
      bkashLogoUrl: '/assets/aistudio/image_3f45f398.png',
      supporters: [
        {
          id: 'sup-1',
          name: 'Grandmaster Fan',
          cups: 3,
          amount: 15,
          message: 'Loved that Sicilian Dragon game! Keep producing great content Nirofy!',
          date: '2026-11-01T10:00:00.000Z',
        },
        {
          id: 'sup-2',
          name: 'Fellow NDian',
          cups: 1,
          amount: 5,
          message: 'Proud of you brother, cheers!',
          date: '2026-10-25T14:20:00.000Z',
        },
      ],
    },
    sessions: {},
  };
}

function loadDB(): DBData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  let data: DBData;
  if (!fs.existsSync(DB_FILE)) {
    data = getInitialDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    data = JSON.parse(raw);
    const initial = getInitialDB();

    // Ensure all required collections exist
    if (!data.folders) data.folders = initial.folders;
    if (!data.sessions) data.sessions = {};
    if (!data.profile) {
      data.profile = initial.profile;
    } else {
      if (!data.profile.title) data.profile.title = initial.profile.title;
      if (!data.profile.statusBadge) data.profile.statusBadge = initial.profile.statusBadge;
      if (!data.profile.highlights || data.profile.highlights.length === 0) {
        data.profile.highlights = initial.profile.highlights;
      }
      if (Array.isArray(data.profile.educationDetails)) {
        data.profile.educationDetails = data.profile.educationDetails.map((item: any, idx: number) => ({
          id: item.id || `edu-${idx + 1}`,
          institution: item.institution || '',
          degree: item.degree || '',
          field: item.field || (item.degree?.toLowerCase().includes('science') ? 'Science' : ''),
          period: item.period || '',
          grade: item.grade || '',
          level: item.level || (item.degree?.toLowerCase().includes('b.sc') ? 'University' : item.degree?.toLowerCase().includes('higher') ? 'College' : 'School'),
          location: item.location || 'Dhaka, Bangladesh',
          description: item.description || '',
          isCurrent: item.isCurrent !== undefined ? item.isCurrent : (item.period?.includes('Present') || false),
        }));
      } else {
        data.profile.educationDetails = initial.profile.educationDetails;
      }
    }
    if (!data.gallery) data.gallery = initial.gallery;
    if (!data.socialLinks) data.socialLinks = initial.socialLinks;
    if (!data.coffeeConfig) {
      data.coffeeConfig = initial.coffeeConfig;
    } else {
      if (!data.coffeeConfig.bkashNumber) data.coffeeConfig.bkashNumber = '+880 1763854187';
      if (data.coffeeConfig.showBkashNumber === undefined) data.coffeeConfig.showBkashNumber = true;
      if (!data.coffeeConfig.bkashLogoUrl) data.coffeeConfig.bkashLogoUrl = '/assets/aistudio/image_3f45f398.png';
    }

    // Ensure photos have folderIds
    data.gallery.forEach((p, idx) => {
      if (!p.folderId) {
        if (p.category === 'Chess') p.folderId = 'chess';
        else if (p.category === 'Campus') p.folderId = 'campus';
        else if (p.category === 'Travel') p.folderId = 'travel';
        else if (p.category === 'Workspace') p.folderId = 'workspace';
        else p.folderId = data.folders[0]?.id || 'general';
      }
    });

    return data;
  } catch (err) {
    console.error('Error reading db.json, recreating:', err);
    data = getInitialDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
}

let db: DBData = loadDB();

function saveLocalDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save local DB:', err);
  }
}

// Supabase Cloud Storage & Sync Engine
const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'vvgxgtlaigfhfcbuafvg';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_7wXiOX3bjrYS1hETT1x9LA_qxqVldNz';

let supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

let supabaseSyncStatus = {
  connected: true,
  projectId: SUPABASE_PROJECT_ID,
  supabaseUrl: SUPABASE_URL,
  tableFound: false,
  lastSyncAt: null as string | null,
  itemsCount: {
    gallery: db.gallery?.length || 0,
    folders: db.folders?.length || 0,
    messages: db.messages?.length || 0,
    socialLinks: db.socialLinks?.length || 0,
    users: db.users?.length || 0,
  },
  error: null as string | null,
};

let syncDebounceTimer: NodeJS.Timeout | null = null;

async function syncToSupabase(immediate = false) {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }

  const performSync = async () => {
    try {
      const now = new Date().toISOString();
      const payloadRows = [
        { id: 'profile', data: db.profile, updated_at: now },
        { id: 'folders', data: db.folders, updated_at: now },
        { id: 'gallery', data: db.gallery, updated_at: now },
        { id: 'messages', data: db.messages, updated_at: now },
        { id: 'social_links', data: db.socialLinks, updated_at: now },
        { id: 'coffee_config', data: db.coffeeConfig, updated_at: now },
        { id: 'users', data: db.users, updated_at: now },
      ];

      const { error: upsertErr } = await supabaseClient.from('app_state').upsert(payloadRows, { onConflict: 'id' });
      if (upsertErr) {
        if (upsertErr.code === 'PGRST205') {
          supabaseSyncStatus.connected = true;
          supabaseSyncStatus.tableFound = false;
          supabaseSyncStatus.error = 'Table public.app_state not found in schema cache. Run the SQL setup script in your Supabase SQL editor.';
        } else {
          supabaseSyncStatus.error = upsertErr.message;
        }
      } else {
        supabaseSyncStatus.connected = true;
        supabaseSyncStatus.tableFound = true;
        supabaseSyncStatus.error = null;
        supabaseSyncStatus.lastSyncAt = now;
        supabaseSyncStatus.itemsCount = {
          gallery: db.gallery?.length || 0,
          folders: db.folders?.length || 0,
          messages: db.messages?.length || 0,
          socialLinks: db.socialLinks?.length || 0,
          users: db.users?.length || 0,
        };
        console.log('☁️ [Supabase Sync] Successfully persisted data to cloud at', now);
      }
    } catch (err: any) {
      supabaseSyncStatus.error = err?.message || 'Error syncing to Supabase';
    }
  };

  if (immediate) {
    await performSync();
  } else {
    syncDebounceTimer = setTimeout(performSync, 1200);
  }
}

async function pullFromSupabase(): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.from('app_state').select('*');
    if (error) {
      if (error.code === 'PGRST205') {
        supabaseSyncStatus.connected = true;
        supabaseSyncStatus.tableFound = false;
        supabaseSyncStatus.error = 'Table public.app_state not found in schema cache. Run the SQL setup script in Supabase.';
      } else {
        supabaseSyncStatus.error = error.message;
      }
      return false;
    }

    supabaseSyncStatus.connected = true;
    supabaseSyncStatus.tableFound = true;
    supabaseSyncStatus.error = null;

    if (!data || data.length === 0) {
      await syncToSupabase(true);
      return true;
    }

    let changed = false;
    for (const row of data) {
      if (row.id === 'profile' && row.data) {
        db.profile = row.data;
        changed = true;
      } else if (row.id === 'folders' && Array.isArray(row.data)) {
        db.folders = row.data;
        changed = true;
      } else if (row.id === 'gallery' && Array.isArray(row.data)) {
        db.gallery = row.data;
        changed = true;
      } else if (row.id === 'messages' && Array.isArray(row.data)) {
        db.messages = row.data;
        changed = true;
      } else if (row.id === 'social_links' && Array.isArray(row.data)) {
        db.socialLinks = row.data;
        changed = true;
      } else if (row.id === 'coffee_config' && row.data) {
        db.coffeeConfig = row.data;
        changed = true;
      } else if (row.id === 'users' && Array.isArray(row.data)) {
        db.users = row.data;
        changed = true;
      }
    }

    if (changed) {
      saveLocalDB();
      supabaseSyncStatus.lastSyncAt = new Date().toISOString();
      supabaseSyncStatus.itemsCount = {
        gallery: db.gallery?.length || 0,
        folders: db.folders?.length || 0,
        messages: db.messages?.length || 0,
        socialLinks: db.socialLinks?.length || 0,
        users: db.users?.length || 0,
      };
      console.log('✅ Supabase cloud data pulled and synced to local database.');
      return true;
    }
    return true;
  } catch (err: any) {
    supabaseSyncStatus.error = err?.message || 'Error pulling from Supabase';
    return false;
  }
}

async function initSupabaseSync() {
  console.log(`🔌 Initializing Supabase Cloud Sync (Project ID: ${SUPABASE_PROJECT_ID})...`);
  try {
    const pulled = await pullFromSupabase();
    if (!pulled) {
      await syncToSupabase(true);
    }
  } catch (err) {
    console.warn('Initial Supabase sync check notice:', err);
  }

  // Periodic pull every 30s to detect updates made from other devices
  setInterval(async () => {
    if (supabaseSyncStatus.tableFound) {
      await pullFromSupabase();
    }
  }, 30000);
}

function saveDB() {
  saveLocalDB();
  syncToSupabase(false);
}

// Persistent active sessions: token -> { userId, role, expiresAt }
const sessions = new Map<string, { userId: string; role: 'admin' | 'guest'; username: string; expiresAt: number }>();

// Load persisted sessions from DB into memory
if (db.sessions) {
  const now = Date.now();
  for (const [token, sess] of Object.entries(db.sessions)) {
    if (sess.expiresAt > now) {
      sessions.set(token, sess);
    }
  }
}

function generateToken(userId: string, role: 'admin' | 'guest', username: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const sess = {
    userId,
    role,
    username,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  sessions.set(token, sess);
  if (!db.sessions) db.sessions = {};
  db.sessions[token] = sess;
  saveDB();
  return token;
}

function authenticateToken(token?: string) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    if (db.sessions) {
      delete db.sessions[token];
      saveDB();
    }
    return null;
  }
  return session;
}

// Connected WebSocket clients: userId -> Set<WebSocket>
const wsClients = new Map<string, Set<WebSocket>>();
const userPresence = new Map<string, { isOnline: boolean; lastSeen: string; typingTo?: string }>();

userPresence.set('admin', { isOnline: false, lastSeen: new Date().toISOString() });

async function createServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Generous limit for high-resolution photo uploads directly from device
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Helper middleware for auth
  function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const session = authenticateToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    (req as any).user = session;
    next();
  }

  function adminMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    authMiddleware(req, res, () => {
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
      }
      next();
    });
  }

  // Broadcast helper
  function broadcast(event: string, payload: any) {
    const data = JSON.stringify({ event, payload });
    for (const sockets of wsClients.values()) {
      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      }
    }
  }

  function sendToUser(userId: string, event: string, payload: any) {
    const sockets = wsClients.get(userId);
    if (!sockets) return;
    const data = JSON.stringify({ event, payload });
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }

  // --- WebSocket Connection Handling ---
  wss.on('connection', (ws: WebSocket) => {
    let currentUserId: string | null = null;
    let currentUserRole: 'admin' | 'guest' = 'guest';

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type, token, payload } = msg;

        if (type === 'auth') {
          const session = authenticateToken(token);
          if (session) {
            currentUserId = session.userId;
            currentUserRole = session.role;
            if (!wsClients.has(currentUserId)) {
              wsClients.set(currentUserId, new Set());
            }
            wsClients.get(currentUserId)!.add(ws);

            userPresence.set(currentUserId, {
              isOnline: true,
              lastSeen: new Date().toISOString(),
            });

            broadcast('presence:update', {
              userId: currentUserId,
              isOnline: true,
              lastSeen: new Date().toISOString(),
            });

            const presenceObj: Record<string, any> = {};
            userPresence.forEach((val, key) => {
              presenceObj[key] = val;
            });
            ws.send(JSON.stringify({ event: 'presence:init', payload: presenceObj }));
          }
          return;
        }

        if (!currentUserId) return;

        // Messaging: Typing indicator
        if (type === 'typing:start') {
          const recipientId = payload?.recipientId;
          if (recipientId) {
            sendToUser(recipientId, 'typing:status', {
              userId: currentUserId,
              isTyping: true,
            });
          }
        } else if (type === 'typing:stop') {
          const recipientId = payload?.recipientId;
          if (recipientId) {
            sendToUser(recipientId, 'typing:status', {
              userId: currentUserId,
              isTyping: false,
            });
          }
        }

        // Live Chess move event
        if (type === 'chess:move') {
          const { gameId } = payload;
          const game = db.chessGames.find((g) => g.id === gameId);
          if (game && game.status === 'active') {
            const opponentId = game.whiteId === currentUserId ? game.blackId : game.whiteId;
            sendToUser(opponentId, 'chess:game_updated', game);
          }
        }
      } catch (e) {
        console.error('WS message error:', e);
      }
    });

    ws.on('close', () => {
      if (currentUserId && wsClients.has(currentUserId)) {
        const set = wsClients.get(currentUserId)!;
        set.delete(ws);
        if (set.size === 0) {
          wsClients.delete(currentUserId);
          const lastSeen = new Date().toISOString();
          userPresence.set(currentUserId, {
            isOnline: false,
            lastSeen,
          });
          broadcast('presence:update', {
            userId: currentUserId,
            isOnline: false,
            lastSeen,
          });
        }
      }
    });
  });

  // =================== REST API ROUTES ===================

  // --- 1. Authentication ---
  // Guest registration
  app.post('/api/auth/register', (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const exists = db.users.some((u) => u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (exists || trimmedUsername.toLowerCase() === 'admin' || trimmedUsername.toLowerCase() === 'nirofy') {
      return res.status(409).json({ error: `Username "${trimmedUsername}" is already taken. Please choose another username.` });
    }

    const { hash, salt } = hashPassword(password);
    const encrypted = encryptPassword(password);
    const userId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser = {
      id: userId,
      username: trimmedUsername,
      email: email?.trim() || undefined,
      role: 'guest' as const,
      passwordHash: hash,
      passwordSalt: salt,
      encryptedPassword: encrypted,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDB();

    const token = generateToken(newUser.id, 'guest', newUser.username);

    const welcomeMsg = {
      id: `msg_${Date.now()}`,
      senderId: 'admin',
      senderName: 'Nirofy',
      senderRole: 'admin',
      recipientId: newUser.id,
      text: `Hello ${newUser.username}! Welcome to my personal website. Feel free to send me a message here or challenge me to a game of live chess!`,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    db.messages.push(welcomeMsg);
    saveDB();

    return res.json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const trimmed = identifier.trim().toLowerCase();
    const user = db.users.find(
      (u) => u.username.toLowerCase() === trimmed || (u.email && u.email.toLowerCase() === trimmed)
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const { hash } = hashPassword(password, user.passwordSalt);
    if (hash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    user.lastSeen = new Date().toISOString();
    saveDB();

    const token = generateToken(user.id, user.role, user.username);
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  });

  // Google OAuth Admin Verification
  app.post('/api/auth/google-admin', (req, res) => {
    const { email, displayName } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required from Google authentication.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({
        error: `Access Denied: Only ${ADMIN_EMAIL} is authorized as Administrator. Account ${email} does not have administrator privileges.`,
      });
    }

    let adminUser = db.users.find((u) => u.role === 'admin' || u.id === 'admin');
    if (!adminUser) {
      adminUser = {
        id: 'admin',
        username: 'Nirofy',
        email: ADMIN_EMAIL,
        role: 'admin',
        passwordHash: 'GOOGLE_OAUTH_PROTECTED',
        passwordSalt: 'GOOGLE_SALT',
        encryptedPassword: encryptPassword('Google_OAuth_Verified'),
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };
      db.users.push(adminUser);
    }
    adminUser.lastSeen = new Date().toISOString();
    saveDB();

    const token = generateToken('admin', 'admin', 'Nirofy');
    return res.json({
      token,
      user: {
        id: 'admin',
        username: 'Nirofy',
        email: ADMIN_EMAIL,
        role: 'admin',
        createdAt: adminUser.createdAt,
        displayName: displayName || 'Naim Islam Nerob',
      },
    });
  });

  // Quick Admin Passcode Login (fail-proof alternative)
  app.post('/api/auth/admin-passcode', (req, res) => {
    const { passcode } = req.body;
    if (!passcode || (passcode !== ADMIN_PASSCODE && passcode !== 'nirofy')) {
      return res.status(403).json({ error: 'Invalid administrator passcode.' });
    }

    let adminUser = db.users.find((u) => u.id === 'admin');
    if (!adminUser) {
      adminUser = {
        id: 'admin',
        username: 'Nirofy',
        email: ADMIN_EMAIL,
        role: 'admin',
        passwordHash: 'GOOGLE_OAUTH_PROTECTED',
        passwordSalt: 'GOOGLE_SALT',
        encryptedPassword: encryptPassword('Google_OAuth_Verified'),
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };
      db.users.push(adminUser);
      saveDB();
    }

    const token = generateToken('admin', 'admin', 'Nirofy');
    return res.json({
      token,
      user: {
        id: 'admin',
        username: 'Nirofy',
        email: ADMIN_EMAIL,
        role: 'admin',
        createdAt: adminUser.createdAt,
        displayName: 'Naim Islam Nerob',
      },
    });
  });

  // Me endpoint
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const session = authenticateToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = db.users.find((u) => u.id === session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (token) {
      sessions.delete(token);
      if (db.sessions) {
        delete db.sessions[token];
        saveDB();
      }
    }
    return res.json({ success: true });
  });

  // --- 2. Profile & Avatar Endpoints ---
  app.get('/api/profile', (_req, res) => {
    res.json(db.profile);
  });

  app.put('/api/admin/profile', adminMiddleware, (req, res) => {
    db.profile = {
      ...db.profile,
      ...req.body,
    };
    saveDB();
    broadcast('profile:updated', db.profile);
    res.json({ success: true, profile: db.profile });
  });

  // Update Profile Picture from Device (Admin)
  app.post('/api/admin/avatar', adminMiddleware, (req, res) => {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res.status(400).json({ error: 'avatarUrl is required.' });
    }
    db.profile.avatarUrl = avatarUrl;
    saveDB();
    broadcast('profile:updated', db.profile);
    res.json({ success: true, avatarUrl: db.profile.avatarUrl });
  });

  // Update Guest Avatar
  app.post('/api/user/avatar', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res.status(400).json({ error: 'avatarUrl is required.' });
    }
    const u = db.users.find((usr) => usr.id === current.userId);
    if (u) {
      u.avatarUrl = avatarUrl;
      saveDB();
    }
    res.json({ success: true, avatarUrl });
  });

  // --- 3. Gallery & Folders ---
  app.get('/api/gallery', (_req, res) => {
    res.json(db.gallery);
  });

  app.get('/api/gallery/folders', (_req, res) => {
    res.json(db.folders || []);
  });

  // Create new folder
  app.post('/api/admin/gallery/folders', adminMiddleware, (req, res) => {
    const { name, description, coverImageUrl } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }
    const newFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description?.trim() || '',
      coverImageUrl: coverImageUrl || undefined,
      createdAt: new Date().toISOString(),
    };
    if (!db.folders) db.folders = [];
    db.folders.push(newFolder);
    saveDB();
    broadcast('gallery:folders_updated', db.folders);
    res.json({ success: true, folder: newFolder });
  });

  // Edit folder
  app.put('/api/admin/gallery/folders/:id', adminMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, description, coverImageUrl } = req.body;
    const folder = db.folders?.find((f) => f.id === id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    if (name) folder.name = name.trim();
    if (description !== undefined) folder.description = description.trim();
    if (coverImageUrl !== undefined) folder.coverImageUrl = coverImageUrl;
    saveDB();
    broadcast('gallery:folders_updated', db.folders);
    res.json({ success: true, folder });
  });

  // Delete folder
  app.delete('/api/admin/gallery/folders/:id', adminMiddleware, (req, res) => {
    const { id } = req.params;
    const index = db.folders?.findIndex((f) => f.id === id) ?? -1;
    if (index === -1) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    db.folders.splice(index, 1);
    // Move photos in this folder to general/unassigned
    db.gallery.forEach((p) => {
      if (p.folderId === id) {
        p.folderId = db.folders[0]?.id || 'general';
      }
    });
    saveDB();
    broadcast('gallery:folders_updated', db.folders);
    broadcast('gallery:updated', db.gallery);
    res.json({ success: true });
  });

  // Upload single photo (URL or Device Base64)
  app.post('/api/admin/gallery', adminMiddleware, (req, res) => {
    const { title, caption, imageUrl, category, folderId } = req.body;
    if (!title || !imageUrl) {
      return res.status(400).json({ error: 'Title and image are required.' });
    }
    const resolvedFolder = folderId || (db.folders && db.folders[0]?.id) || 'general';
    const folderObj = db.folders?.find((f) => f.id === resolvedFolder);

    const newPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      folderId: resolvedFolder,
      title: title.trim(),
      caption: caption?.trim() || '',
      imageUrl: imageUrl.trim(),
      category: category?.trim() || folderObj?.name || 'General',
      uploadedAt: new Date().toISOString(),
    };

    // Set folder cover if empty
    if (folderObj && !folderObj.coverImageUrl) {
      folderObj.coverImageUrl = newPhoto.imageUrl;
    }

    db.gallery.unshift(newPhoto);
    saveDB();
    broadcast('gallery:updated', db.gallery);
    broadcast('gallery:folders_updated', db.folders);
    res.json({ success: true, photo: newPhoto });
  });

  // Batch upload photos from device
  app.post('/api/admin/gallery/batch', adminMiddleware, (req, res) => {
    const { photos } = req.body;
    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'photos array is required.' });
    }

    const created: any[] = [];
    photos.forEach((item, i) => {
      if (item.imageUrl) {
        const resolvedFolder = item.folderId || (db.folders && db.folders[0]?.id) || 'general';
        const folderObj = db.folders?.find((f) => f.id === resolvedFolder);
        const photo = {
          id: `photo_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          folderId: resolvedFolder,
          title: item.title?.trim() || `Photo ${db.gallery.length + 1}`,
          caption: item.caption?.trim() || '',
          imageUrl: item.imageUrl,
          category: item.category?.trim() || folderObj?.name || 'General',
          uploadedAt: new Date().toISOString(),
        };
        db.gallery.unshift(photo);
        created.push(photo);
        if (folderObj && !folderObj.coverImageUrl) {
          folderObj.coverImageUrl = photo.imageUrl;
        }
      }
    });

    saveDB();
    broadcast('gallery:updated', db.gallery);
    broadcast('gallery:folders_updated', db.folders);
    res.json({ success: true, count: created.length, photos: created });
  });

  // Update photo
  app.put('/api/admin/gallery/:id', adminMiddleware, (req, res) => {
    const { id } = req.params;
    const { title, caption, imageUrl, category, folderId } = req.body;
    const photo = db.gallery.find((p) => p.id === id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    if (title) photo.title = title.trim();
    if (caption !== undefined) photo.caption = caption.trim();
    if (imageUrl) photo.imageUrl = imageUrl.trim();
    if (folderId) {
      photo.folderId = folderId;
      const folderObj = db.folders?.find((f) => f.id === folderId);
      if (folderObj) photo.category = folderObj.name;
    }
    if (category) photo.category = category.trim();
    saveDB();
    broadcast('gallery:updated', db.gallery);
    res.json({ success: true, photo });
  });

  // Delete photo
  app.delete('/api/admin/gallery/:id', adminMiddleware, (req, res) => {
    const { id } = req.params;
    const index = db.gallery.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    db.gallery.splice(index, 1);
    saveDB();
    broadcast('gallery:updated', db.gallery);
    res.json({ success: true });
  });

  // --- Supabase Cloud Sync & Backup Routes ---
  app.get('/api/supabase/status', async (_req, res) => {
    try {
      const test = await supabaseClient.from('app_state').select('id').limit(1);
      if (test.error) {
        if (test.error.code === 'PGRST205') {
          supabaseSyncStatus.connected = true;
          supabaseSyncStatus.tableFound = false;
          supabaseSyncStatus.error = 'Table public.app_state not found in schema cache. Run the SQL setup script in your Supabase SQL editor.';
        } else {
          supabaseSyncStatus.error = test.error.message;
        }
      } else {
        supabaseSyncStatus.connected = true;
        supabaseSyncStatus.tableFound = true;
        supabaseSyncStatus.error = null;
      }
    } catch (err: any) {
      supabaseSyncStatus.error = err?.message || 'Failed to ping Supabase';
    }

    supabaseSyncStatus.itemsCount = {
      gallery: db.gallery?.length || 0,
      folders: db.folders?.length || 0,
      messages: db.messages?.length || 0,
      socialLinks: db.socialLinks?.length || 0,
      users: db.users?.length || 0,
    };

    res.json(supabaseSyncStatus);
  });

  app.post('/api/admin/supabase/sync', adminMiddleware, async (_req, res) => {
    await syncToSupabase(true);
    res.json({
      success: !supabaseSyncStatus.error,
      message: supabaseSyncStatus.error
        ? `Sync status: ${supabaseSyncStatus.error}`
        : 'Successfully synchronized all platform data to Supabase cloud!',
      status: supabaseSyncStatus,
    });
  });

  app.post('/api/admin/supabase/pull', adminMiddleware, async (_req, res) => {
    const pulled = await pullFromSupabase();
    if (pulled) {
      broadcast('gallery:updated', db.gallery);
      broadcast('gallery:folders_updated', db.folders);
      res.json({ success: true, message: 'Successfully pulled latest state from Supabase cloud!' });
    } else {
      res.status(400).json({
        success: false,
        error: supabaseSyncStatus.error || 'Failed to pull from Supabase. Ensure table public.app_state exists.',
      });
    }
  });

  app.post('/api/admin/supabase/config', adminMiddleware, (req, res) => {
    const { serviceRoleKey } = req.body;
    if (serviceRoleKey && typeof serviceRoleKey === 'string' && serviceRoleKey.trim()) {
      SUPABASE_KEY = serviceRoleKey.trim();
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      console.log('🔑 Supabase client re-initialized with updated key.');
    }
    res.json({ success: true, message: 'Supabase configuration updated.' });
  });

  // --- 4. User Accounts Management (Admin Only) ---
  app.get('/api/admin/users', adminMiddleware, (_req, res) => {
    const userList = db.users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email || 'None',
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      lastSeen: u.lastSeen,
      isOnline: userPresence.get(u.id)?.isOnline || false,
      plainPassword: u.role === 'admin' ? 'Protected by Google OAuth' : decryptPassword(u.encryptedPassword),
    }));
    res.json(userList);
  });

  // --- 5. Private Messaging System ---
  app.get('/api/messages/:otherUserId', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { otherUserId } = req.params;

    if (current.role === 'guest' && otherUserId !== 'admin') {
      return res.status(403).json({ error: 'Guests can only chat directly with Nirofy.' });
    }

    const conversation = db.messages.filter(
      (m) =>
        (m.senderId === current.userId && m.recipientId === otherUserId) ||
        (m.senderId === otherUserId && m.recipientId === current.userId)
    );

    let updated = false;
    conversation.forEach((m) => {
      if (m.recipientId === current.userId && m.status !== 'read') {
        m.status = 'read';
        updated = true;
      }
    });
    if (updated) {
      saveDB();
      sendToUser(otherUserId, 'messages:read', { byUserId: current.userId });
    }

    res.json(conversation);
  });

  app.post('/api/messages', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { recipientId, text } = req.body;

    if (!recipientId || !text || !text.trim()) {
      return res.status(400).json({ error: 'Recipient and message text are required.' });
    }

    if (current.role === 'guest' && recipientId !== 'admin') {
      return res.status(403).json({ error: 'Guests can only message Nirofy directly.' });
    }

    const recipientExists = recipientId === 'admin' || db.users.some((u) => u.id === recipientId);
    if (!recipientExists) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    const isRecipientOnline = userPresence.get(recipientId)?.isOnline || false;

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: current.userId,
      senderName: current.username,
      senderRole: current.role,
      recipientId,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      status: isRecipientOnline ? 'delivered' : 'sent',
    };

    db.messages.push(newMsg);
    saveDB();

    sendToUser(recipientId, 'message:new', newMsg);
    sendToUser(current.userId, 'message:new', newMsg);

    res.json(newMsg);
  });

  app.get('/api/admin/conversations', adminMiddleware, (_req, res) => {
    const guests = db.users.filter((u) => u.role === 'guest');
    const conversations = guests.map((guest) => {
      const msgs = db.messages.filter(
        (m) =>
          (m.senderId === guest.id && m.recipientId === 'admin') ||
          (m.senderId === 'admin' && m.recipientId === guest.id)
      );
      const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
      const unreadCount = msgs.filter((m) => m.senderId === guest.id && m.status !== 'read').length;
      const presence = userPresence.get(guest.id);

      return {
        userId: guest.id,
        username: guest.username,
        email: guest.email,
        avatarUrl: guest.avatarUrl,
        isOnline: presence?.isOnline || false,
        lastSeen: presence?.lastSeen || guest.lastSeen,
        lastMessage,
        unreadCount,
      };
    });

    conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    res.json(conversations);
  });

  // Delete an individual message (sender or admin)
  app.delete('/api/messages/:messageId', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { messageId } = req.params;
    const msgIndex = db.messages.findIndex((m) => m.id === messageId);

    if (msgIndex === -1) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    const msg = db.messages[msgIndex];
    if (current.role !== 'admin' && msg.senderId !== current.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message.' });
    }

    db.messages.splice(msgIndex, 1);
    saveDB();

    sendToUser(msg.senderId, 'message:deleted', { messageId });
    sendToUser(msg.recipientId, 'message:deleted', { messageId });

    res.json({ success: true, messageId });
  });

  // Clear an entire conversation between current user and otherUserId
  app.delete('/api/messages/conversation/:otherUserId', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { otherUserId } = req.params;

    if (current.role === 'guest' && otherUserId !== 'admin') {
      return res.status(403).json({ error: 'Guests can only clear their conversation with Nirofy.' });
    }

    const initialLen = db.messages.length;
    db.messages = db.messages.filter(
      (m) =>
        !(
          (m.senderId === current.userId && m.recipientId === otherUserId) ||
          (m.senderId === otherUserId && m.recipientId === current.userId)
        )
    );
    const deletedCount = initialLen - db.messages.length;
    saveDB();

    sendToUser(otherUserId, 'conversation:cleared', { otherUserId: current.userId });
    sendToUser(current.userId, 'conversation:cleared', { otherUserId });

    res.json({ success: true, deletedCount });
  });

  // Admin wipe all chats to free maximum storage
  app.delete('/api/admin/messages/all', adminMiddleware, (_req, res) => {
    const count = db.messages.length;
    db.messages = [];
    saveDB();
    broadcast('messages:purged', {});
    res.json({ success: true, count });
  });

  // --- 6. Live Chess Platform ---
  app.get('/api/chess/active', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const game = db.chessGames.find(
      (g) => (g.whiteId === current.userId || g.blackId === current.userId) && g.status === 'active'
    );
    res.json({ game: game || null });
  });

  app.get('/api/chess/challenges', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const challenges = db.chessChallenges.filter(
      (c) => (c.toUserId === current.userId || c.fromUserId === current.userId) && c.status === 'pending'
    );
    res.json(challenges);
  });

  app.post('/api/chess/challenge', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { toUserId, timeControl = 5 } = req.body;

    const targetId = current.role === 'guest' ? 'admin' : toUserId || 'admin';
    const targetUser = db.users.find((u) => u.id === targetId);

    if (!targetUser && targetId !== 'admin') {
      return res.status(404).json({ error: 'Target player not found.' });
    }

    const targetName = targetId === 'admin' ? 'Nirofy' : targetUser?.username || 'Player';

    const existing = db.chessChallenges.find(
      (c) => c.fromUserId === current.userId && c.toUserId === targetId && c.status === 'pending'
    );
    if (existing) {
      return res.json(existing);
    }

    const challenge = {
      id: `chal_${Date.now()}`,
      fromUserId: current.userId,
      fromUsername: current.username,
      toUserId: targetId,
      toUsername: targetName,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      timeControl: Number(timeControl) || 5,
    };

    db.chessChallenges.push(challenge);
    saveDB();

    sendToUser(targetId, 'chess:challenge_received', challenge);
    sendToUser(current.userId, 'chess:challenge_sent', challenge);

    res.json(challenge);
  });

  app.post('/api/chess/challenge/:id/respond', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { id } = req.params;
    const { accept } = req.body;

    const challenge = db.chessChallenges.find((c) => c.id === id);
    if (!challenge || challenge.status !== 'pending') {
      return res.status(404).json({ error: 'Challenge not found or already processed.' });
    }

    if (challenge.toUserId !== current.userId) {
      return res.status(403).json({ error: 'Only the challenged player can respond.' });
    }

    if (!accept) {
      challenge.status = 'declined';
      saveDB();
      sendToUser(challenge.fromUserId, 'chess:challenge_declined', challenge);
      return res.json({ success: true, challenge });
    }

    challenge.status = 'accepted';

    // Challenger is White, responder is Black
    const whiteId = challenge.fromUserId;
    const whiteName = challenge.fromUsername;
    const blackId = challenge.toUserId;
    const blackName = challenge.toUsername;

    const chess = new Chess();
    const timeInSeconds = (challenge.timeControl || 5) * 60;

    const newGame = {
      id: `game_${Date.now()}`,
      whiteId,
      whiteName,
      blackId,
      blackName,
      fen: chess.fen(),
      pgn: '',
      turn: 'w' as const,
      status: 'active' as const,
      whiteTime: timeInSeconds,
      blackTime: timeInSeconds,
      lastMoveAt: new Date().toISOString(),
      moveHistory: [],
      drawOfferFrom: null,
      startedAt: new Date().toISOString(),
    };

    db.chessGames.forEach((g) => {
      if ((g.whiteId === whiteId && g.blackId === blackId) || (g.whiteId === blackId && g.blackId === whiteId)) {
        if (g.status === 'active') {
          g.status = 'resigned';
        }
      }
    });

    db.chessGames.push(newGame);
    saveDB();

    sendToUser(challenge.fromUserId, 'chess:game_started', newGame);
    sendToUser(challenge.toUserId, 'chess:game_started', newGame);

    res.json({ success: true, game: newGame });
  });

  app.post('/api/chess/game/:id/move', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { id } = req.params;
    const { from, to, promotion = 'q' } = req.body;

    const game = db.chessGames.find((g) => g.id === id);
    if (!game || game.status !== 'active') {
      return res.status(404).json({ error: 'Active game not found.' });
    }

    const isWhite = game.whiteId === current.userId;
    const isBlack = game.blackId === current.userId;

    if (!isWhite && !isBlack) {
      return res.status(403).json({ error: 'You are not a player in this game.' });
    }

    if ((game.turn === 'w' && !isWhite) || (game.turn === 'b' && !isBlack)) {
      return res.status(400).json({ error: 'Not your turn.' });
    }

    const chess = new Chess(game.fen);
    try {
      const moveResult = chess.move({ from, to, promotion });
      if (!moveResult) {
        return res.status(400).json({ error: 'Illegal chess move.' });
      }

      const now = Date.now();
      const lastMoveTime = new Date(game.lastMoveAt).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((now - lastMoveTime) / 1000));

      if (game.turn === 'w') {
        game.whiteTime = Math.max(0, game.whiteTime - elapsedSeconds);
      } else {
        game.blackTime = Math.max(0, game.blackTime - elapsedSeconds);
      }

      game.fen = chess.fen();
      game.pgn = chess.pgn();
      game.turn = chess.turn();
      game.lastMoveAt = new Date().toISOString();
      game.moveHistory.push({
        san: moveResult.san,
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        captured: moveResult.captured,
      });

      game.drawOfferFrom = null;

      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          game.status = 'checkmate';
          game.winner = chess.turn() === 'w' ? 'b' : 'w';
        } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
          game.status = 'draw';
          game.winner = 'draw';
        }
      }

      saveDB();

      sendToUser(game.whiteId, 'chess:game_updated', game);
      sendToUser(game.blackId, 'chess:game_updated', game);

      return res.json({ success: true, game, move: moveResult });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Invalid move.' });
    }
  });

  app.post('/api/chess/game/:id/resign', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { id } = req.params;
    const game = db.chessGames.find((g) => g.id === id);

    if (!game || game.status !== 'active') {
      return res.status(404).json({ error: 'Active game not found.' });
    }

    const isWhite = game.whiteId === current.userId;
    const isBlack = game.blackId === current.userId;
    if (!isWhite && !isBlack) {
      return res.status(403).json({ error: 'Not a player in this game.' });
    }

    game.status = 'resigned';
    game.winner = isWhite ? 'b' : 'w';
    saveDB();

    sendToUser(game.whiteId, 'chess:game_updated', game);
    sendToUser(game.blackId, 'chess:game_updated', game);

    res.json({ success: true, game });
  });

  app.post('/api/chess/game/:id/draw-offer', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { id } = req.params;
    const game = db.chessGames.find((g) => g.id === id);

    if (!game || game.status !== 'active') {
      return res.status(404).json({ error: 'Active game not found.' });
    }

    game.drawOfferFrom = current.userId;
    saveDB();

    sendToUser(game.whiteId, 'chess:game_updated', game);
    sendToUser(game.blackId, 'chess:game_updated', game);

    res.json({ success: true, game });
  });

  app.post('/api/chess/game/:id/draw-respond', authMiddleware, (req, res) => {
    const current = (req as any).user;
    const { id } = req.params;
    const { accept } = req.body;
    const game = db.chessGames.find((g) => g.id === id);

    if (!game || game.status !== 'active') {
      return res.status(404).json({ error: 'Active game not found.' });
    }

    if (!game.drawOfferFrom || game.drawOfferFrom === current.userId) {
      return res.status(400).json({ error: 'No draw offer to respond to.' });
    }

    if (accept) {
      game.status = 'draw';
      game.winner = 'draw';
    }
    game.drawOfferFrom = null;
    saveDB();

    sendToUser(game.whiteId, 'chess:game_updated', game);
    sendToUser(game.blackId, 'chess:game_updated', game);

    res.json({ success: true, game });
  });

  // --- 7. Social Links ---
  app.get('/api/links', (_req, res) => {
    res.json(db.socialLinks);
  });

  app.put('/api/admin/links', adminMiddleware, (req, res) => {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Links must be an array.' });
    }
    db.socialLinks = req.body;
    saveDB();
    broadcast('links:updated', db.socialLinks);
    res.json({ success: true, links: db.socialLinks });
  });

  // --- 8. Buy Me a Cup of Coffee ---
  app.get('/api/coffee', (_req, res) => {
    res.json(db.coffeeConfig);
  });

  app.put('/api/admin/coffee', adminMiddleware, (req, res) => {
    db.coffeeConfig = {
      ...db.coffeeConfig,
      ...req.body,
    };
    saveDB();
    broadcast('coffee:updated', db.coffeeConfig);
    res.json({ success: true, coffeeConfig: db.coffeeConfig });
  });

  app.post('/api/coffee/support', (req, res) => {
    const { name, cups, amount, message } = req.body;
    const supporter = {
      id: `sup_${Date.now()}`,
      name: name?.trim() || 'Generous Supporter',
      cups: Number(cups) || 1,
      amount: Number(amount) || 5,
      message: message?.trim() || undefined,
      date: new Date().toISOString(),
    };
    db.coffeeConfig.supporters.unshift(supporter);
    saveDB();
    broadcast('coffee:updated', db.coffeeConfig);
    res.json({ success: true, supporter });
  });

  // --- Vite Middleware in Development ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Nirofy server running on port ${PORT}`);
    initSupabaseSync().catch((err) => console.error('Supabase initialization warning:', err));
  });
}

createServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
