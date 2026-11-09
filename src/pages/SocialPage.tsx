import React, { useState, useRef } from 'react';
import { SocialLink, ProfileData } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Share2,
  ExternalLink,
  Crown,
  Github,
  Linkedin,
  Instagram,
  Facebook,
  Mail,
  Twitter,
  Globe,
  Edit3,
  Edit2,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Upload,
  Save,
  X,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { api } from '../lib/api';

interface SocialPageProps {
  links: SocialLink[];
  profile?: ProfileData | null;
  onRefresh?: () => void;
  onOpenAdminLinks?: () => void;
}

const getPlatformIcon = (iconName?: string) => {
  switch ((iconName || '').toLowerCase()) {
    case 'instagram':
      return Instagram;
    case 'facebook':
      return Facebook;
    case 'github':
      return Github;
    case 'linkedin':
      return Linkedin;
    case 'crown':
    case 'chess':
    case 'chess.com':
      return Crown;
    case 'mail':
    case 'email':
      return Mail;
    case 'twitter':
    case 'x':
      return Twitter;
    default:
      return Globe;
  }
};

// Canvas-based image resizing for fast & small base64 uploads
const resizeImage = (file: File, maxWidth = 400, maxHeight = 400): Promise<string> => {
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
        resolve(canvas.toDataURL('image/png', 0.9));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const SocialPage: React.FC<SocialPageProps> = ({
  links: initialLinks,
  profile,
  onRefresh,
  onOpenAdminLinks,
}) => {
  const { isAdmin } = useAuth();

  // Local links state for instant optimistic updates
  const [linksList, setLinksList] = useState<SocialLink[]>(initialLinks);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<{ index: number; name: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [linkForm, setLinkForm] = useState<SocialLink>({
    id: '',
    platform: '',
    url: '',
    icon: 'globe',
    logoUrl: '',
    username: '',
    badgeText: '',
  });

  const logoFileRef = useRef<HTMLInputElement>(null);

  // Collaboration link state
  const [isEditingCollab, setIsEditingCollab] = useState(false);
  const [collabUrl, setCollabUrl] = useState(profile?.collaborationLink || 'https://linkedin.com');
  const [collabLabel, setCollabLabel] = useState(
    profile?.collaborationLabel || 'Connect for Academic Collaboration'
  );

  // Sync when initialLinks changes from parent
  React.useEffect(() => {
    setLinksList(initialLinks);
  }, [initialLinks]);

  // Sync collab defaults
  React.useEffect(() => {
    if (profile?.collaborationLink) setCollabUrl(profile.collaborationLink);
    if (profile?.collaborationLabel) setCollabLabel(profile.collaborationLabel);
  }, [profile]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setStatusMessage(null);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // Open modal to add link
  const handleOpenAddLink = () => {
    setEditingLinkIndex(null);
    setLinkForm({
      id: `link_${Date.now()}`,
      platform: '',
      url: '',
      icon: 'globe',
      logoUrl: '',
      username: '',
      badgeText: '',
    });
    setLinkModalOpen(true);
  };

  // Open modal to edit existing link
  const handleOpenEditLink = (index: number) => {
    const item = linksList[index];
    if (!item) return;
    setEditingLinkIndex(index);
    setLinkForm({
      id: item.id || `link_${Date.now()}`,
      platform: item.platform || '',
      url: item.url || '',
      icon: item.icon || 'globe',
      logoUrl: item.logoUrl || '',
      username: item.username || '',
      badgeText: item.badgeText || '',
    });
    setLinkModalOpen(true);
  };

  // Device file upload for link logo
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

  // Save Add/Edit Link
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
      onRefresh?.();
    } catch (err: any) {
      showError(err.message || 'Failed to save link to server');
    } finally {
      setSaving(false);
    }
  };

  // Move link up/down
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
      showStatus('Links reordered!');
      onRefresh?.();
    } catch (err: any) {
      showError(err.message || 'Failed to reorder links');
    } finally {
      setSaving(false);
    }
  };

  // Request & confirm delete
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
      showStatus(`Link "${deletedName}" deleted successfully.`);
      onRefresh?.();
    } catch (err: any) {
      showError(err.message || 'Failed to delete link');
    } finally {
      setSaving(false);
    }
  };

  // Save collaboration link
  const handleSaveCollabLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        collaborationLink: collabUrl.trim(),
        collaborationLabel: collabLabel.trim(),
      });
      showStatus('Collaboration link updated successfully!');
      setIsEditingCollab(false);
      onRefresh?.();
    } catch (err: any) {
      showError(err.message || 'Failed to save collaboration link');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Hidden file input for logo upload */}
      <input
        ref={logoFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoFile}
      />

      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-400 hover:text-white px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Share2 className="w-4 h-4" />
            <span>Connect & Network</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Social Channels & Websites
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Direct links to all published profiles, websites, channels, and networks.
          </p>
        </div>

        {/* Admin Quick Action: Add Link */}
        {isAdmin && (
          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <button
              onClick={handleOpenAddLink}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-sky-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Link</span>
            </button>
            {onOpenAdminLinks && (
              <button
                onClick={onOpenAdminLinks}
                className="px-3.5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>Admin Tab</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Links Grid */}
      {linksList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs space-y-3">
          <p>No links or websites added yet.</p>
          {isAdmin && (
            <button
              onClick={handleOpenAddLink}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Link</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {linksList.map((link, idx) => {
            const IconComponent = getPlatformIcon(link.icon || link.platform);
            return (
              <div
                key={link.id || idx}
                className="group relative p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-sky-500/50 hover:bg-slate-900 shadow-xl transition-all duration-300 flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3.5 flex-1 min-w-0"
                  >
                    {link.logoUrl ? (
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/70 group-hover:border-sky-500/60 flex items-center justify-center shrink-0 shadow-inner">
                        <img
                          src={link.logoUrl}
                          alt={link.platform}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700/60 group-hover:border-sky-500/40 flex items-center justify-center text-sky-400 group-hover:text-white transition-colors shadow-inner shrink-0">
                        <IconComponent className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors truncate">
                          {link.platform}
                        </span>
                        {link.badgeText && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {link.badgeText}
                          </span>
                        )}
                      </div>
                      {link.username ? (
                        <span className="text-xs text-slate-400 font-mono block mt-0.5 truncate">
                          {link.username}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono block mt-0.5 truncate">
                          {link.url}
                        </span>
                      )}
                    </div>
                  </a>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-slate-500 group-hover:text-sky-400 group-hover:bg-sky-500/10 transition-colors shrink-0"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* ADMIN ACTIONS: MOVE, EDIT, DELETE */}
                {isAdmin && (
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-500">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveLink(idx, 'up')}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === linksList.length - 1}
                        onClick={() => handleMoveLink(idx, 'down')}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditLink(idx)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteLink(idx)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Delete Link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Collaboration Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-sky-950/40 border border-slate-800/80 text-center space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-white">
          Looking for Academic or Technical Collaboration?
        </h3>

        {!isEditingCollab ? (
          <div className="pt-2 flex flex-col items-center gap-3">
            <a
              href={collabUrl}
              target={collabUrl.startsWith('http') ? '_blank' : undefined}
              rel={collabUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg shadow-sky-600/20 hover:from-sky-400 hover:to-blue-500 transition-all active:scale-95 cursor-pointer"
            >
              <LinkIcon className="w-4 h-4" />
              <span>{collabLabel}</span>
            </a>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditingCollab(true)}
                className="text-[11px] text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Customize Collaboration Button & Link</span>
              </button>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSaveCollabLink}
            className="max-w-md mx-auto space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left animate-fade-in"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Collaboration Destination URL
              </label>
              <input
                type="text"
                required
                value={collabUrl}
                onChange={(e) => setCollabUrl(e.target.value)}
                placeholder="https://linkedin.com/in/... or mailto:..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Button Label
              </label>
              <input
                type="text"
                required
                value={collabLabel}
                onChange={(e) => setCollabLabel(e.target.value)}
                placeholder="Connect for Academic Collaboration"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingCollab(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 1. ADD / EDIT LINK MODAL */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-base">
                <Globe className="w-5 h-5" />
                <span>
                  {editingLinkIndex !== null
                    ? `Edit Link: ${linkForm.platform}`
                    : 'Add New Website / Profile Link'}
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
                  placeholder="e.g. bKash, GitHub, Codeforces, Facebook, Blog"
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
                  type="text"
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
                      <span>
                        {uploadingLogo ? 'Processing...' : 'Upload Logo Photo from Device'}
                      </span>
                    </button>
                    <p className="text-[10px] text-slate-400">
                      Upload any image file (PNG, JPG, SVG, WebP) from your device.
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
                    placeholder="e.g. @nerobnaim or Official Profile"
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
                    placeholder="e.g. Primary, Official, Active"
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
                  <option value="facebook">Facebook</option>
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
                  <span>
                    {saving
                      ? 'Saving...'
                      : editingLinkIndex !== null
                      ? 'Update Link'
                      : 'Add Link'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. DELETE LINK MODAL */}
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
                Are you sure you want to remove{' '}
                <span className="font-bold text-white">"{linkToDelete.name}"</span> from your
                published links?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                This link will be removed immediately from your public profile.
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
    </div>
  );
};
