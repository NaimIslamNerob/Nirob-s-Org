import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ProfileData,
  EducationItem,
  ProfileHighlight,
  GalleryPhoto,
  GalleryFolder,
  SocialLink,
  CoffeeConfig,
  AdminUserData,
  ChessChallenge,
  SupabaseStatus,
} from '../types';
import { api } from '../lib/api';
import {
  Shield,
  User,
  Image as ImageIcon,
  Users,
  MessageSquare,
  Swords,
  Share2,
  Coffee,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Edit2,
  Clock,
  Radio,
  RefreshCw,
  FolderPlus,
  Folder,
  Upload,
  Camera,
  X,
  GraduationCap,
  Building2,
  Award,
  Calendar,
  ArrowUp,
  ArrowDown,
  Sparkles,
  MapPin,
  Link as LinkIcon,
  Globe,
  Database,
  Cloud,
  HardDrive,
  Check,
  Copy,
} from 'lucide-react';

interface AdminDashboardProps {
  initialProfile: ProfileData | null;
  initialGallery: GalleryPhoto[];
  initialFolders?: GalleryFolder[];
  initialLinks: SocialLink[];
  initialCoffee: CoffeeConfig | null;
  initialTab?: string;
  onRefreshAll: () => void;
  onNavigateTab: (tab: string) => void;
}

// Client-side image resize helper
function resizeImage(file: File, maxWidth = 1200, maxHeight = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialProfile,
  initialGallery,
  initialFolders = [],
  initialLinks,
  initialCoffee,
  initialTab,
  onRefreshAll,
  onNavigateTab,
}) => {
  const { user, isAdmin } = useAuth();

  const [activeAdminTab, setActiveAdminTab] = useState<
    'overview' | 'profile' | 'education' | 'gallery' | 'folders' | 'users' | 'chess' | 'links' | 'coffee' | 'supabase'
  >((initialTab as any) || 'overview');

  // Supabase Cloud Sync state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null);
  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [pullingSupabase, setPullingSupabase] = useState(false);
  const [supabaseCopied, setSupabaseCopied] = useState(false);
  const [supabaseSuccessMsg, setSupabaseSuccessMsg] = useState<string | null>(null);

  const fetchSupabaseStatus = async () => {
    try {
      setLoadingSupabase(true);
      const st = await api.getSupabaseStatus();
      setSupabaseStatus(st);
    } catch (err: any) {
      console.warn('Could not load Supabase status:', err);
    } finally {
      setLoadingSupabase(false);
    }
  };

  useEffect(() => {
    fetchSupabaseStatus();
  }, []);

  const handleSyncSupabase = async () => {
    try {
      setSyncingSupabase(true);
      setSupabaseSuccessMsg(null);
      const res = await api.syncSupabase();
      setSupabaseStatus(res.status);
      setSupabaseSuccessMsg(res.message);
      onRefreshAll();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync with Supabase');
    } finally {
      setSyncingSupabase(false);
    }
  };

  const handlePullSupabase = async () => {
    try {
      setPullingSupabase(true);
      setSupabaseSuccessMsg(null);
      const res = await api.pullSupabase();
      setSupabaseSuccessMsg(res.message);
      await fetchSupabaseStatus();
      onRefreshAll();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to pull from Supabase');
    } finally {
      setPullingSupabase(false);
    }
  };

  const copySupabaseSQL = () => {
    const sql = `-- Nirofy Portfolio & Platform - Supabase Cloud Persistence
-- Run this query once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vvgxgtlaigfhfcbuafvg/sql/new

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.app_state enable row level security;

drop policy if exists "Allow public all access" on public.app_state;
create policy "Allow public all access" on public.app_state
  for all
  using (true)
  with check (true);
`;
    navigator.clipboard.writeText(sql);
    setSupabaseCopied(true);
    setTimeout(() => setSupabaseCopied(false), 2500);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveAdminTab(initialTab as any);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialLinks) {
      setLinksList(initialLinks);
    }
  }, [initialLinks]);

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileData | null>(initialProfile);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Education management state
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [editingEduIndex, setEditingEduIndex] = useState<number | null>(null);
  const [eduFormItem, setEduFormItem] = useState<EducationItem>({
    id: '',
    institution: '',
    degree: '',
    field: '',
    period: '',
    grade: '',
    level: 'University',
    location: '',
    description: '',
    isCurrent: false,
  });

  // Deletion modals state (replaces native window.confirm which is blocked in iframes)
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [eduToDelete, setEduToDelete] = useState<{ index: number; name: string } | null>(null);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Users state
  const [userList, setUserList] = useState<AdminUserData[]>([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Gallery state
  const [foldersList, setFoldersList] = useState<GalleryFolder[]>(initialFolders);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Gallery upload form state
  const [newPhoto, setNewPhoto] = useState({
    title: '',
    caption: '',
    imageUrl: '',
    category: 'General',
    folderId: initialFolders[0]?.id || 'chess',
  });
  const [galleryDeviceFiles, setGalleryDeviceFiles] = useState<string[]>([]);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // Social links state
  const [linksList, setLinksList] = useState<SocialLink[]>(initialLinks);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [linkForm, setLinkForm] = useState<SocialLink>({
    id: '',
    platform: '',
    url: '',
    icon: 'Globe',
    logoUrl: '',
    username: '',
    badgeText: '',
  });
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<{ index: number; name: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  // Collaboration link state
  const [collabUrlInput, setCollabUrlInput] = useState(initialProfile?.collaborationLink || 'https://linkedin.com');
  const [collabLabelInput, setCollabLabelInput] = useState(initialProfile?.collaborationLabel || 'Connect for Academic Collaboration');

  // Coffee form state
  const [coffeeForm, setCoffeeForm] = useState<CoffeeConfig | null>(initialCoffee);

  // Challenges state
  const [challenges, setChallenges] = useState<ChessChallenge[]>([]);

  // Chat storage deletion state
  const [chatUserToDelete, setChatUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [purgeAllChatsConfirm, setPurgeAllChatsConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfileForm(initialProfile);
      setCollabUrlInput(initialProfile.collaborationLink || 'https://linkedin.com');
      setCollabLabelInput(initialProfile.collaborationLabel || 'Connect for Academic Collaboration');
    }
  }, [initialProfile]);

  useEffect(() => {
    if (initialFolders && initialFolders.length > 0) {
      setFoldersList(initialFolders);
      if (!newPhoto.folderId) {
        setNewPhoto((prev) => ({ ...prev, folderId: initialFolders[0].id }));
      }
    }
  }, [initialFolders]);

  useEffect(() => {
    if (initialLinks) setLinksList(initialLinks);
  }, [initialLinks]);

  useEffect(() => {
    if (initialCoffee) setCoffeeForm(initialCoffee);
  }, [initialCoffee]);

  // Load admin-only data
  const loadAdminData = async () => {
    if (!isAdmin) return;
    try {
      const [users, chs, fldrs, freshLinks] = await Promise.all([
        api.getAdminUsers(),
        api.getChallenges(),
        api.getFolders(),
        api.getLinks(),
      ]);
      setUserList(users);
      setChallenges(chs);
      setFoldersList(fldrs);
      if (freshLinks && freshLinks.length > 0) {
        setLinksList(freshLinks);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setStatusMessage(null);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Guard
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400">
          This portal is strictly restricted to the authorized administrator (naimislamnerob8@gmail.com).
        </p>
      </div>
    );
  }

  // --- Avatar Device Upload ---
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeImage(file, 800, 800);
      await api.updateAvatar(dataUrl);
      if (profileForm) {
        setProfileForm({ ...profileForm, avatarUrl: dataUrl });
      }
      showStatus('Profile picture updated from your device!');
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to update avatar from device');
    } finally {
      setUploadingAvatar(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  // --- Profile Save ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm) return;
    setSaving(true);
    try {
      const res = await api.updateProfile(profileForm);
      setProfileForm(res.profile);
      showStatus('Personal profile updated successfully!');
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // --- Education Management Handlers ---
  const handleOpenAddEdu = () => {
    setEditingEduIndex(null);
    setEduFormItem({
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      field: '',
      period: '',
      grade: '',
      level: 'University',
      location: profileForm?.location || 'Dhaka, Bangladesh',
      description: '',
      isCurrent: false,
    });
    setEduModalOpen(true);
  };

  const handleOpenEditEdu = (index: number) => {
    if (!profileForm?.educationDetails?.[index]) return;
    setEditingEduIndex(index);
    setEduFormItem({ ...profileForm.educationDetails[index] });
    setEduModalOpen(true);
  };

  const handleSaveEduItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm) return;
    if (!eduFormItem.institution.trim() || !eduFormItem.degree.trim()) {
      showError('Institution name and Degree / Certificate title are required.');
      return;
    }
    const list = [...(profileForm.educationDetails || [])];
    if (editingEduIndex !== null && editingEduIndex >= 0) {
      list[editingEduIndex] = eduFormItem;
    } else {
      list.push({ ...eduFormItem, id: eduFormItem.id || `edu-${Date.now()}` });
    }
    const updatedProfile = { ...profileForm, educationDetails: list };
    setProfileForm(updatedProfile);
    setEduModalOpen(false);
    setSaving(true);
    try {
      await api.updateProfile(updatedProfile);
      showStatus(
        editingEduIndex !== null
          ? 'Educational institution updated!'
          : 'New educational qualification added!'
      );
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to save education details');
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteEduItem = (index: number) => {
    if (!profileForm) return;
    const item = profileForm.educationDetails[index];
    if (!item) return;
    setEduToDelete({ index, name: `${item.institution} - ${item.degree}` });
  };

  const confirmDeleteEduItem = async () => {
    if (!profileForm || !eduToDelete) return;
    const list = profileForm.educationDetails.filter((_, i) => i !== eduToDelete.index);
    const updatedProfile = { ...profileForm, educationDetails: list };
    setProfileForm(updatedProfile);
    const deletedName = eduToDelete.name;
    setEduToDelete(null);
    setSaving(true);
    try {
      await api.updateProfile(updatedProfile);
      showStatus(`Deleted "${deletedName}" from education details.`);
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to delete education entry');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveEduItem = async (index: number, direction: 'up' | 'down') => {
    if (!profileForm) return;
    const list = [...(profileForm.educationDetails || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    const updatedProfile = { ...profileForm, educationDetails: list };
    setProfileForm(updatedProfile);
    setSaving(true);
    try {
      await api.updateProfile(updatedProfile);
      showStatus('Education chronology reordered!');
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to reorder education items');
    } finally {
      setSaving(false);
    }
  };

  // --- Gallery Device Photos Upload ---
  const handleGalleryDeviceFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const resized: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const dataUrl = await resizeImage(files[i]);
        resized.push(dataUrl);
      }
      setGalleryDeviceFiles((prev) => [...prev, ...resized]);
      if (!newPhoto.title && files[0]) {
        setNewPhoto((prev) => ({ ...prev, title: files[0].name.replace(/\.[^/.]+$/, '') }));
      }
    } catch (err) {
      showError('Error reading files from device');
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // If device images selected
      if (galleryDeviceFiles.length > 0) {
        const folderObj = foldersList.find((f) => f.id === newPhoto.folderId);
        const batch = galleryDeviceFiles.map((dataUrl, idx) => ({
          title: galleryDeviceFiles.length === 1 ? newPhoto.title.trim() || 'Untitled' : `${newPhoto.title.trim() || 'Photo'} (${idx + 1})`,
          caption: newPhoto.caption.trim(),
          imageUrl: dataUrl,
          folderId: newPhoto.folderId,
          category: folderObj?.name || 'General',
        }));
        await api.uploadBatchPhotos(batch);
        setGalleryDeviceFiles([]);
        setNewPhoto({ title: '', caption: '', imageUrl: '', category: 'General', folderId: foldersList[0]?.id || 'chess' });
        showStatus(`${batch.length} photo(s) uploaded to gallery from device!`);
      } else {
        if (!newPhoto.title || !newPhoto.imageUrl) {
          showError('Please provide photo title and image URL or select files from device');
          setSaving(false);
          return;
        }
        await api.addPhoto(newPhoto);
        setNewPhoto({ title: '', caption: '', imageUrl: '', category: 'General', folderId: foldersList[0]?.id || 'chess' });
        showStatus('Photo added to gallery!');
      }
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to upload photo');
    } finally {
      setSaving(false);
    }
  };

  // --- Photo Deletion with Confirmation Modal ---
  const requestDeletePhoto = (photo: GalleryPhoto) => {
    setPhotoToDelete(photo);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const photo = photoToDelete;
    setSaving(true);
    try {
      await api.deletePhoto(photo.id);
      showStatus(`Photograph "${photo.title}" deleted.`);
      setPhotoToDelete(null);
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to delete photo');
    } finally {
      setSaving(false);
    }
  };

  // --- Folder Management with Confirmation Modal ---
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setSaving(true);
    try {
      const res = await api.createFolder({
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
      });
      setFoldersList((prev) => [...prev, res.folder]);
      setNewFolderName('');
      setNewFolderDesc('');
      showStatus(`Folder "${res.folder.name}" created!`);
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to create folder');
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteFolder = (id: string, name: string) => {
    setFolderToDelete({ id, name });
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    const folder = folderToDelete;
    setSaving(true);
    try {
      await api.deleteFolder(folder.id);
      setFoldersList((prev) => prev.filter((f) => f.id !== folder.id));
      showStatus(`Folder "${folder.name}" deleted.`);
      setFolderToDelete(null);
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to delete folder');
    } finally {
      setSaving(false);
    }
  };

  // --- Social Links & Website Management Handlers ---
  const handleOpenAddLink = () => {
    setEditingLinkIndex(null);
    setLinkForm({
      id: `link_${Date.now()}`,
      platform: '',
      url: '',
      icon: 'Globe',
      logoUrl: '',
      username: '',
      badgeText: '',
    });
    setLinkModalOpen(true);
  };

  const handleOpenEditLink = (index: number) => {
    const item = linksList[index];
    if (!item) return;
    setEditingLinkIndex(index);
    setLinkForm({ ...item });
    setLinkModalOpen(true);
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const dataUrl = await resizeImage(file, 256, 256);
      setLinkForm((prev) => ({ ...prev, logoUrl: dataUrl }));
      showStatus('Logo photo loaded from device!');
    } catch (err) {
      showError('Failed to read logo image from device');
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  };

  const handleSaveLinkForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.platform.trim() || !linkForm.url.trim()) {
      showError('Site / Platform name and Link URL are required.');
      return;
    }

    const updatedList = [...linksList];
    if (editingLinkIndex !== null && editingLinkIndex >= 0) {
      updatedList[editingLinkIndex] = { ...linkForm };
    } else {
      updatedList.push({ ...linkForm, id: linkForm.id || `link_${Date.now()}` });
    }

    setLinksList(updatedList);
    setLinkModalOpen(false);
    setSaving(true);
    try {
      await api.updateLinks(updatedList);
      showStatus(
        editingLinkIndex !== null
          ? `Website link "${linkForm.platform}" updated successfully!`
          : `Website link "${linkForm.platform}" added to profiles!`
      );
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveLink = async (index: number, direction: 'up' | 'down') => {
    const list = [...linksList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setLinksList(list);
    setSaving(true);
    try {
      await api.updateLinks(list);
      showStatus('Links chronology reordered!');
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to reorder links');
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteLink = (index: number) => {
    const item = linksList[index];
    if (!item) return;
    setLinkToDelete({ index, name: item.platform });
  };

  const confirmDeleteLink = async () => {
    if (!linkToDelete) return;
    const updated = linksList.filter((_, i) => i !== linkToDelete.index);
    setLinksList(updated);
    const deletedName = linkToDelete.name;
    setLinkToDelete(null);
    setSaving(true);
    try {
      await api.updateLinks(updated);
      showStatus(`Link "${deletedName}" deleted.`);
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to delete link');
    } finally {
      setSaving(false);
    }
  };

  // --- Academic & Technical Collaboration Link Save ---
  const handleSaveCollabLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm) return;
    const updatedProfile = {
      ...profileForm,
      collaborationLink: collabUrlInput.trim(),
      collaborationLabel: collabLabelInput.trim() || 'Connect for Academic Collaboration',
    };
    setProfileForm(updatedProfile);
    setSaving(true);
    try {
      await api.updateProfile(updatedProfile);
      showStatus('Academic & Technical Collaboration Link saved successfully!');
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to save collaboration link');
    } finally {
      setSaving(false);
    }
  };

  // --- Coffee Settings Save ---
  const handleSaveCoffee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coffeeForm) return;
    setSaving(true);
    try {
      await api.updateCoffeeConfig(coffeeForm);
      showStatus('Buy Me a Coffee settings saved!');
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to save coffee settings');
    } finally {
      setSaving(false);
    }
  };

  // --- Chat Deletion Handlers to free storage ---
  const handleClearUserChat = async () => {
    if (!chatUserToDelete) return;
    setSaving(true);
    try {
      const res = await api.deleteConversation(chatUserToDelete.id);
      showStatus(`Deleted chat history with ${chatUserToDelete.name} (${res.deletedCount} messages deleted, storage freed).`);
      setChatUserToDelete(null);
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to delete chat');
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeAllChats = async () => {
    setSaving(true);
    try {
      const res = await api.purgeAllMessages();
      showStatus(`Purged all ${res.count} messages platform-wide to free server storage.`);
      setPurgeAllChatsConfirm(false);
      onRefreshAll();
    } catch (err: any) {
      showError(err.message || 'Failed to purge all messages');
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center overflow-hidden border border-slate-700/80 shadow-lg">
            <img
              src="./assets/aistudio/bf806f74-d653-4af6-b7be-37ab74ecbf98_b6272376.jpg"
              alt="Nirofy"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Administrator Control Center</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold">
                AUTHORIZED ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Owner: <span className="text-amber-300 font-mono">naimislamnerob8@gmail.com</span> (Nirofy)
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Status & Error Alerts */}
      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-400 hover:text-white px-2 py-0.5 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white px-2 py-0.5 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {[
          { id: 'overview', label: 'Overview & Stats', icon: Shield },
          { id: 'profile', label: 'Profile & Bio', icon: User },
          { id: 'education', label: 'Educational Details', icon: GraduationCap, count: profileForm?.educationDetails?.length || 0 },
          { id: 'gallery', label: 'Gallery Photos', icon: ImageIcon, count: initialGallery.length },
          { id: 'folders', label: 'Albums & Folders', icon: Folder, count: foldersList.length },
          { id: 'users', label: 'Registered Users', icon: Users, count: userList.length },
          { id: 'chess', label: 'Chess Arena', icon: Swords, count: challenges.length },
          { id: 'links', label: 'Social & Links', icon: Share2 },
          { id: 'coffee', label: 'Donation Settings', icon: Coffee },
          { id: 'supabase', label: 'Supabase Cloud Sync', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-slate-950 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Registered Users</span>
              <div className="text-2xl font-bold text-white font-mono">{userList.length}</div>
              <span className="text-[11px] text-emerald-400">Total accounts saved</span>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Gallery Photos</span>
              <div className="text-2xl font-bold text-white font-mono">{initialGallery.length}</div>
              <span className="text-[11px] text-sky-400">Published images</span>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Albums / Folders</span>
              <div className="text-2xl font-bold text-white font-mono">{foldersList.length}</div>
              <span className="text-[11px] text-purple-400">Active albums</span>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Coffee Supporters</span>
              <div className="text-2xl font-bold text-white font-mono">
                {initialCoffee?.supporters?.length || 0}
              </div>
              <span className="text-[11px] text-amber-400">Contributions recorded</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-400" />
                  <span>Profile & Bio</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Customize your personal story, nickname, headline, status badge, device avatar, and key stats.
                </p>
              </div>
              <button
                onClick={() => setActiveAdminTab('profile')}
                className="px-4 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer self-start"
              >
                <span>Customize Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Educational Details</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Add, edit, reorder, or delete schools, colleges, degrees, honors, and qualifications.
                </p>
              </div>
              <button
                onClick={() => setActiveAdminTab('education')}
                className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer self-start"
              >
                <span>Manage Education</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  <span>Live Messaging</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Guest users have private 1-on-1 conversations with you with live typing and delivery status.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('chat')}
                className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-sky-400 self-start"
              >
                <span>Open Messenger</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span>Live Chess Arena</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Accept incoming challenges from guest players or review match history and live clocks.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('chess')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-400 self-start"
              >
                <span>Go to Chess Arena</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900/80 border border-emerald-500/30 space-y-3 flex flex-col justify-between md:col-span-2 lg:col-span-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Supabase Cloud Sync & Cross-Device Persistence</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      vvgxgtlaigfhfcbuafvg
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    All website profile edits, uploaded photographs, education history, and chats automatically persist to your Supabase account so changes are visible from any phone, laptop, or browser.
                  </p>
                </div>
                <button
                  onClick={() => setActiveAdminTab('supabase')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-emerald-400 self-start sm:self-auto shrink-0 shadow-md shadow-emerald-500/20"
                >
                  <span>Manage Supabase Sync</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE & HIGHLIGHTS CUSTOMIZER */}
      {activeAdminTab === 'profile' && profileForm && (
        <div className="space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Profile Picture Device Upload Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>Profile Picture (Update from Device)</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-700 shadow-xl shrink-0 relative">
                  <img
                    src={profileForm.avatarUrl}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-xs text-sky-400 font-medium">
                      Saving...
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <p className="text-xs text-slate-300">
                    Upload a photo directly from your device (phone or computer), or specify a web image URL.
                  </p>

                  <input
                    type="file"
                    ref={avatarFileRef}
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Picture from Device</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomAvatarUrl(profileForm.avatarUrl || '');
                        setUrlModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer"
                    >
                      Set Image URL
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info & Identity */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Basic Profile Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nickname *</label>
                  <input
                    type="text"
                    value={profileForm.nickname}
                    onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Professional Title / Headline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer & Competitive Chess Strategist"
                    value={profileForm.title || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Custom Status Badge / Availability Banner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🟢 Open for Live Chess Challenges & Collaborations"
                    value={profileForm.statusBadge || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, statusBadge: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tagline / Subheading</label>
                <input
                  type="text"
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Personal Biography & Story</label>
                <textarea
                  rows={5}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 font-bold text-xs text-slate-950 flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: DEDICATED EDUCATIONAL DETAILS MANAGER */}
      {activeAdminTab === 'education' && profileForm && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
                <GraduationCap className="w-5 h-5" />
                <span>Educational Journey & Qualifications Manager</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Add, customize, reorder, or delete any educational qualification, degree, school, or college milestone.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddEdu}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Education Qualification</span>
            </button>
          </div>

          {/* Education Entries List */}
          {(!profileForm.educationDetails || profileForm.educationDetails.length === 0) ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs space-y-3">
              <GraduationCap className="w-10 h-10 text-slate-600 mx-auto" />
              <p>No education qualifications recorded yet.</p>
              <button
                type="button"
                onClick={handleOpenAddEdu}
                className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs"
              >
                Add First Qualification
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {profileForm.educationDetails.map((edu, idx) => (
                <div
                  key={edu.id || idx}
                  className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px] font-semibold">
                          {edu.level || 'University'}
                        </span>
                        {edu.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Currently Enrolled / Active</span>
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-sky-400" />
                          <span>{edu.period}</span>
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white flex items-center gap-2 pt-1">
                        <Building2 className="w-4 h-4 text-sky-400" />
                        <span>{edu.institution}</span>
                      </h4>

                      <div className="text-xs text-sky-200 font-medium">
                        {edu.degree}
                        {edu.field && <span className="text-slate-400 font-normal"> • {edu.field}</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                        {edu.grade && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 font-medium flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-400" />
                            <span>{edu.grade}</span>
                          </span>
                        )}
                        {edu.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{edu.location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons: Move, Edit, Delete */}
                    <div className="flex items-center gap-1.5 self-end sm:self-start">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveEduItem(idx, 'up')}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (profileForm.educationDetails.length - 1)}
                        onClick={() => handleMoveEduItem(idx, 'down')}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditEdu(idx)}
                        className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Edit Qualification"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteEduItem(idx)}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Delete Qualification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {edu.description && (
                    <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3 whitespace-pre-line">
                      {edu.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education Add / Edit Modal */}
          {eduModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <GraduationCap className="w-5 h-5 text-sky-400" />
                    <span>
                      {editingEduIndex !== null ? 'Edit Educational Qualification' : 'Add Educational Qualification'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEduModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEduItem} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Academic Level *
                      </label>
                      <select
                        value={eduFormItem.level || 'University'}
                        onChange={(e) => setEduFormItem({ ...eduFormItem, level: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="University">University (Undergrad / Postgrad)</option>
                        <option value="College">College (Higher Secondary / Intermediate)</option>
                        <option value="School">School (Secondary / High School)</option>
                        <option value="Certification">Professional Certification / Academy</option>
                        <option value="Research">Research / Fellowship</option>
                        <option value="Other">Other Academic Program</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Period / Years *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2022 – Present or 2020 – 2022"
                        value={eduFormItem.period}
                        onChange={(e) => setEduFormItem({ ...eduFormItem, period: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Institution Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. University of Engineering and Technology, Notre Dame College"
                      value={eduFormItem.institution}
                      onChange={(e) => setEduFormItem({ ...eduFormItem, institution: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Degree / Certificate Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. B.Sc. in Computer Science & Engineering"
                        value={eduFormItem.degree}
                        onChange={(e) => setEduFormItem({ ...eduFormItem, degree: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Field of Study / Major
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Computer Science, Science, Mathematics"
                        value={eduFormItem.field || ''}
                        onChange={(e) => setEduFormItem({ ...eduFormItem, field: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Grade / GPA / Honors
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GPA 5.00 / 5.00, First Class Honours"
                        value={eduFormItem.grade || ''}
                        onChange={(e) => setEduFormItem({ ...eduFormItem, grade: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Location / Campus
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dhaka, Bangladesh"
                        value={eduFormItem.location || ''}
                        onChange={(e) => setEduFormItem({ ...eduFormItem, location: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isCurrentCheckbox"
                      checked={!!eduFormItem.isCurrent}
                      onChange={(e) => setEduFormItem({ ...eduFormItem, isCurrent: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="isCurrentCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
                      Currently enrolled / actively studying here
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Description / Activities & Coursework
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Specializations, leadership, club activities, thesis or awards..."
                      value={eduFormItem.description}
                      onChange={(e) => setEduFormItem({ ...eduFormItem, description: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEduModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : editingEduIndex !== null ? 'Save Changes' : 'Add Qualification'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GALLERY PHOTOS & UPLOAD */}
      {activeAdminTab === 'gallery' && (
        <div className="space-y-6">
          {/* Upload Photo Card */}
          <form onSubmit={handleAddPhoto} className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              <span>Upload Photos to Gallery (Device & URL)</span>
            </h3>

            {/* Folder Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Album / Folder *</label>
                <select
                  value={newPhoto.folderId}
                  onChange={(e) => setNewPhoto({ ...newPhoto, folderId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {foldersList.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Photo Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chess Championship Blitz Match"
                  value={newPhoto.title}
                  onChange={(e) => setNewPhoto({ ...newPhoto, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Or Paste Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={newPhoto.imageUrl}
                  onChange={(e) => setNewPhoto({ ...newPhoto, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            {/* Device file upload trigger */}
            <div>
              <input
                type="file"
                ref={galleryFileRef}
                accept="image/*"
                multiple
                onChange={handleGalleryDeviceFiles}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => galleryFileRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs border border-sky-500/30 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Select Photo(s) from Phone or Computer</span>
              </button>

              {galleryDeviceFiles.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pt-2">
                  {galleryDeviceFiles.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGalleryDeviceFiles(galleryDeviceFiles.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-950/80 text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Caption / Story Description</label>
              <textarea
                rows={2}
                placeholder="A memorable round played with the black pieces..."
                value={newPhoto.caption}
                onChange={(e) => setNewPhoto({ ...newPhoto, caption: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Photo to Gallery</span>
            </button>
          </form>

          {/* Existing Photos List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {initialGallery.map((photo) => (
              <div
                key={photo.id}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2"
              >
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                  <img src={photo.imageUrl} alt={photo.title} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-sky-400 uppercase">{photo.category}</span>
                    <button
                      onClick={() => requestDeletePhoto(photo)}
                      className="p-1 text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors cursor-pointer"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-semibold text-xs text-white truncate">{photo.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{photo.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ALBUMS & FOLDERS */}
      {activeAdminTab === 'folders' && (
        <div className="space-y-6">
          {/* Create Folder Form */}
          <form onSubmit={handleCreateFolder} className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-sky-400" />
              <span>Create New Photo Album / Folder</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Folder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chess Tournaments 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short summary of this album"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !newFolderName.trim()}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              Create Folder
            </button>
          </form>

          {/* List of Folders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {foldersList.map((f) => {
              const count = initialGallery.filter((p) => p.folderId === f.id || p.category === f.name).length;
              return (
                <div key={f.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{f.name}</h4>
                      <p className="text-[11px] text-slate-400">{f.description || 'No description'}</p>
                      <span className="text-[10px] text-sky-400 font-mono">{count} photos</span>
                    </div>
                  </div>

                  <button
                    onClick={() => requestDeleteFolder(f.id, f.name)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                    title="Delete folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: REGISTERED USERS & PASSWORDS */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white">Registered User Database & Credentials</h3>
              <p className="text-xs text-slate-400">
                All guest user accounts, usernames, registration timestamps, and reversible encrypted passwords for administrator inspection.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-mono">
                {userList.length} Accounts
              </span>
              <button
                type="button"
                onClick={() => setPurgeAllChatsConfirm(true)}
                className="px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Wipe all messages across all users to free maximum storage"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge All Chats</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Password (Admin View)</th>
                    <th className="py-3 px-4 text-right">Chat Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {userList.map((u) => {
                    const isRevealed = revealedPasswords[u.id];
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-[10px] uppercase">
                            {u.username.charAt(0)}
                          </div>
                          <span>{u.username}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                              u.isOnline
                                ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                              }`}
                            />
                            {u.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs select-all">
                              {isRevealed ? u.plainPassword : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(u.id)}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                              title={isRevealed ? 'Hide Password' : 'Show Password'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.role === 'guest' ? (
                            <button
                              type="button"
                              onClick={() => setChatUserToDelete({ id: u.id, name: u.username })}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Delete this user's conversation to free storage"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Clear Chat</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Self</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CHESS ARENA MANAGEMENT */}
      {activeAdminTab === 'chess' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>Pending Live Chess Challenge Requests</span>
            </h3>
            {challenges.length === 0 ? (
              <p className="text-xs text-slate-400">No pending challenge requests at the moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {challenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">Challenger: {ch.fromUsername}</div>
                      <div className="text-[11px] text-slate-400">Time Control: {ch.timeControl} Minutes Rapid</div>
                      <div className="text-[10px] text-slate-500 font-mono">{new Date(ch.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <button
                      onClick={async () => {
                        await api.respondToChallenge(ch.id, true);
                        onNavigateTab('chess');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Accept & Play
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: SOCIAL MEDIA & WEBSITE LINKS */}
      {activeAdminTab === 'links' && (
        <div className="space-y-6">
          {/* Collaboration Direct Link Editor */}
          <form
            onSubmit={handleSaveCollabLink}
            className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4"
          >
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
              <LinkIcon className="w-4 h-4" />
              <span>Academic & Technical Collaboration Direct Link</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Customize the direct link destination and button text displayed on the public Connect/Links page (e.g. LinkedIn, Telegram, WhatsApp, Calendly, Portfolio, or custom email).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Destination Link URL (Any Website, Chat, or Custom Link) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://linkedin.com/in/... or https://t.me/..."
                  value={collabUrlInput}
                  onChange={(e) => setCollabUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Button Display Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Connect for Academic Collaboration"
                  value={collabLabelInput}
                  onChange={(e) => setCollabLabelInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-600/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Collaboration Link</span>
              </button>
            </div>
          </form>

          {/* Social Channels & Websites List */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-purple-400" />
                  <span>Published Websites & Social Profiles ({linksList.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add, edit, reorder, and customize any site name, destination link, and photo logo according to your preference.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddLink}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20 active:scale-95 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Link / Website</span>
              </button>
            </div>

            {linksList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                No links added yet. Click "+ Add New Link / Website" to publish your first channel.
              </div>
            ) : (
              <div className="space-y-3">
                {linksList.map((link, idx) => (
                  <div
                    key={link.id || idx}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      {link.logoUrl ? (
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                          <img
                            src={link.logoUrl}
                            alt={link.platform}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                          <Globe className="w-5 h-5" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{link.platform}</span>
                          {link.badgeText && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              {link.badgeText}
                            </span>
                          )}
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-400 hover:underline font-mono block mt-0.5 max-w-sm truncate"
                        >
                          {link.url}
                        </a>
                        {link.username && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {link.username}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveLink(idx, 'up')}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === linksList.length - 1}
                        onClick={() => handleMoveLink(idx, 'down')}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditLink(idx)}
                        className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Edit Link"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteLink(idx)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Delete Link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: DONATION & COFFEE SETTINGS */}
      {activeAdminTab === 'coffee' && coffeeForm && (
        <form onSubmit={handleSaveCoffee} className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider text-amber-400">
              Coffee & Voluntary Donation Configuration
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Headline</label>
              <input
                type="text"
                value={coffeeForm.headline}
                onChange={(e) => setCoffeeForm({ ...coffeeForm, headline: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description / Subtext</label>
              <textarea
                rows={3}
                value={coffeeForm.subtext}
                onChange={(e) => setCoffeeForm({ ...coffeeForm, subtext: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">bKash Personal Number</label>
                <input
                  type="text"
                  value={coffeeForm.bkashNumber || '+880 1763854187'}
                  onChange={(e) => setCoffeeForm({ ...coffeeForm, bkashNumber: e.target.value })}
                  placeholder="+880 1763854187"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">bKash Logo Image URL / Path</label>
                <input
                  type="text"
                  value={coffeeForm.bkashLogoUrl || './assets/aistudio/image_3f45f398.png'}
                  onChange={(e) => setCoffeeForm({ ...coffeeForm, bkashLogoUrl: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-white block">bKash Number Visibility</span>
                <span className="text-[11px] text-slate-400">
                  {coffeeForm.showBkashNumber !== false
                    ? 'Number is VISIBLE to visitors on the Cup of Tea/Coffee page.'
                    : 'Number is HIDDEN. Visitors will see "Donation is not currently available".'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCoffeeForm({ ...coffeeForm, showBkashNumber: coffeeForm.showBkashNumber === false ? true : false })}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  coffeeForm.showBkashNumber !== false
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                {coffeeForm.showBkashNumber !== false ? 'Visible (Click to Hide)' : 'Hidden (Click to Show)'}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-xs text-slate-950 flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Coffee Payment Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: SUPABASE CLOUD SYNC & PERSISTENCE */}
      {activeAdminTab === 'supabase' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-950 border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Supabase Cloud Sync</h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Syncs and persists all website data, photos, chats, educational history, and profile updates across every device.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePullSupabase}
                  disabled={pullingSupabase || syncingSupabase}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  title="Pull latest changes from Supabase cloud"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pullingSupabase ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{pullingSupabase ? 'Pulling...' : 'Pull from Cloud'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncSupabase}
                  disabled={syncingSupabase || pullingSupabase}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  title="Sync local data to Supabase"
                >
                  <Cloud className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-bounce' : ''}`} />
                  <span>{syncingSupabase ? 'Syncing...' : 'Sync Now to Cloud'}</span>
                </button>
              </div>
            </div>

            {supabaseSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{supabaseSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSupabaseSuccessMsg(null)}
                  className="text-slate-400 hover:text-white text-xs px-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Quick credentials & status bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Project Reference ID</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{supabaseStatus?.projectId || 'vvgxgtlaigfhfcbuafvg'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Supabase Endpoint</span>
                <span className="text-xs font-mono text-slate-300 truncate block">https://vvgxgtlaigfhfcbuafvg.supabase.co</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Cloud Sync</span>
                <span className="text-xs font-mono text-slate-200">
                  {supabaseStatus?.lastSyncAt ? new Date(supabaseStatus.lastSyncAt).toLocaleTimeString() : 'Awaiting initial sync'}
                </span>
              </div>
            </div>
          </div>

          {/* Cloud Collections Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Synced Collections (Shared Across All Devices)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Profile & Highlights</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">Active</div>
                <span className="text-[10px] text-slate-400">Bio, Avatar & Degree</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Gallery Photographs</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  {supabaseStatus?.itemsCount?.gallery || initialGallery.length} Photos
                </div>
                <span className="text-[10px] text-slate-400">Uploaded from device</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Albums & Folders</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  {supabaseStatus?.itemsCount?.folders || foldersList.length} Folders
                </div>
                <span className="text-[10px] text-slate-400">Custom categories</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Messages & Chats</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  {supabaseStatus?.itemsCount?.messages || 0} Msgs
                </div>
                <span className="text-[10px] text-slate-400">Private guest chats</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Social & Custom Links</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  {supabaseStatus?.itemsCount?.socialLinks || linksList.length} Links
                </div>
                <span className="text-[10px] text-slate-400">Custom URLs & logos</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">bKash & Donation</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">Active</div>
                <span className="text-[10px] text-slate-400">+880 1763854187 & toggle</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Registered Accounts</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  {supabaseStatus?.itemsCount?.users || userList.length} Users
                </div>
                <span className="text-[10px] text-slate-400">Secure guest logins</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Education Details</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  {profileForm?.educationDetails?.length || 0} Levels
                </div>
                <span className="text-[10px] text-slate-400">School, college, uni</span>
              </div>
            </div>
          </div>

          {/* SQL Setup Instruction Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Supabase SQL Table Setup (Run Once)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  To allow the publishable key to read and write changes from any device, run this query in your Supabase SQL Editor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://supabase.com/dashboard/project/vvgxgtlaigfhfcbuafvg/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <span>Open Supabase SQL Editor</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={copySupabaseSQL}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {supabaseCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{supabaseCopied ? 'Copied SQL!' : 'Copy SQL Script'}</span>
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 p-4 leading-relaxed">
              <pre className="overflow-x-auto scrollbar-none whitespace-pre">
{`-- Nirofy Portfolio & Platform - Supabase Cloud Persistence
-- Run this query once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vvgxgtlaigfhfcbuafvg/sql/new

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.app_state enable row level security;

drop policy if exists "Allow public all access" on public.app_state;
create policy "Allow public all access" on public.app_state
  for all
  using (true)
  with check (true);`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* --- IN-APP CONFIRMATION MODALS (Replaces window.confirm/prompt in iframe) --- */}

      {/* 1. Delete Photo Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Delete Photograph?</span>
              </div>
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-slate-800">
                <img
                  src={photoToDelete.imageUrl}
                  alt={photoToDelete.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h4 className="font-bold text-sm text-white">{photoToDelete.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {photoToDelete.caption || 'No caption'}
                </p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-sky-400 uppercase">
                  Album: {photoToDelete.category}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                Are you sure you want to permanently delete this photograph from your gallery? This action cannot be undone.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePhoto}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Deleting...' : 'Delete Photograph'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Delete Folder Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <Folder className="w-5 h-5" />
                <span>Delete Album Folder?</span>
              </div>
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-200">
                Are you sure you want to delete the album folder{' '}
                <span className="font-bold text-white">"{folderToDelete.name}"</span>?
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                Note: Photographs currently inside this folder will remain safely stored in the gallery.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFolder}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Deleting...' : 'Delete Album'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Education Modal */}
      {eduToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <GraduationCap className="w-5 h-5" />
                <span>Delete Education Record?</span>
              </div>
              <button
                type="button"
                onClick={() => setEduToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-200">
                Are you sure you want to remove{' '}
                <span className="font-bold text-white">"{eduToDelete.name}"</span> from your academic profile?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                This qualification entry will be removed immediately from your public homepage.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEduToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteEduItem}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Deleting...' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Set Image URL Modal (Replaces window.prompt) */}
      {urlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-base">
                <Camera className="w-5 h-5" />
                <span>Set Profile Picture via URL</span>
              </div>
              <button
                type="button"
                onClick={() => setUrlModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Direct Image URL (HTTPS link or CDN)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {customAvatarUrl.trim() && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-700">
                    <img
                      src={customAvatarUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="text-white font-medium block">Avatar Preview</span>
                    <span>Make sure the link points directly to an image file.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUrlModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customAvatarUrl.trim() && profileForm) {
                    setProfileForm({ ...profileForm, avatarUrl: customAvatarUrl.trim() });
                    showStatus('Profile avatar URL updated. Click "Save Profile & Story" to persist.');
                  }
                  setUrlModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Apply URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add / Edit Website Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-base">
                <Globe className="w-5 h-5" />
                <span>
                  {editingLinkIndex !== null ? `Edit Link: ${linkForm.platform}` : 'Add New Website / Profile Link'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLinkForm} className="space-y-4">
              {/* Site Name & URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Website / Platform Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GitHub, Codeforces, Personal Blog, Substack"
                  value={linkForm.platform}
                  onChange={(e) => setLinkForm({ ...linkForm, platform: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Destination URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/your-profile"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* Logo / Photo Configuration */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-200">
                    Logo / Photo Asset
                  </label>
                  {linkForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLinkForm({ ...linkForm, logoUrl: '' })}
                      className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Clear Logo Photo
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {linkForm.logoUrl ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-sky-500/50 shrink-0 flex items-center justify-center">
                      <img
                        src={linkForm.logoUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center text-slate-500">
                      <Globe className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => logoFileRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingLogo ? 'Processing...' : 'Upload Logo from Device'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400">
                      Upload any image file (PNG, JPG, SVG, WebP) directly from your computer.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Or paste direct Logo Image URL:
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../logo.png"
                    value={linkForm.logoUrl || ''}
                    onChange={(e) => setLinkForm({ ...linkForm, logoUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Subtitle / Handle and Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Handle / Subtitle (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. @nerobnaim or nerob.dev"
                    value={linkForm.username || ''}
                    onChange={(e) => setLinkForm({ ...linkForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Badge Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Featured, 2100+ Rating"
                    value={linkForm.badgeText || ''}
                    onChange={(e) => setLinkForm({ ...linkForm, badgeText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Fallback Vector Icon (if no photo uploaded)
                </label>
                <select
                  value={linkForm.icon || 'globe'}
                  onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="globe">Globe (General Website)</option>
                  <option value="github">GitHub</option>
                  <option value="code">Code / Competitive Programming</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="mail">Mail / Email</option>
                  <option value="external">External Link</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/20 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : editingLinkIndex !== null ? 'Update Link' : 'Add Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Link Modal */}
      {linkToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Delete Link Profile?</span>
              </div>
              <button
                type="button"
                onClick={() => setLinkToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-200">
                Are you sure you want to remove <span className="font-bold text-white">"{linkToDelete.name}"</span> from your published social links and websites?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                This link will be removed immediately from your public profile and navigation menus.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setLinkToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLink}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Deleting...' : 'Delete Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 7. Clear User Chat Modal */}
      {chatUserToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Clear User Chat History?</span>
              </div>
              <button
                type="button"
                onClick={() => setChatUserToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-200">
                Are you sure you want to delete all messages exchanged with{' '}
                <strong className="text-white">{chatUserToDelete.name}</strong>?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                This will delete the entire conversation to free up server database storage.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setChatUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearUserChat}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Deleting...' : 'Delete Chat History'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Purge All Chats Modal */}
      {purgeAllChatsConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Purge All Chats System-Wide</span>
              </div>
              <button
                type="button"
                onClick={() => setPurgeAllChatsConfirm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-200">
                Are you sure you want to permanently wipe <strong className="text-rose-400">ALL</strong> chat messages across all guest accounts?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                This frees maximum database storage space and cannot be undone.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPurgeAllChatsConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeAllChats}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Purging...' : 'Purge All Messages'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
