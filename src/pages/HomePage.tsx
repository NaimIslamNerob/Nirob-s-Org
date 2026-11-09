import React, { useState, useRef, useMemo } from 'react';
import { ProfileData, EducationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  MessageSquare,
  Swords,
  Coffee,
  MapPin,
  Camera,
  CheckCircle,
  Upload,
  Building2,
  Calendar,
  Award,
  Settings,
  Filter,
} from 'lucide-react';
import { api } from '../lib/api';

interface HomePageProps {
  profile: ProfileData | null;
  onNavigate: (tab: string) => void;
  onRefresh?: () => void;
}

// Client-side image resize helper to keep uploaded pictures fast and under size limits
function resizeImage(file: File, maxWidth = 900, maxHeight = 900): Promise<string> {
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

export const HomePage: React.FC<HomePageProps> = ({ profile, onNavigate, onRefresh }) => {
  const { isAdmin, isNirofyOnline, openAuthModal } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState<string | null>(null);
  const [avatarErrorMsg, setAvatarErrorMsg] = useState<string | null>(null);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const educationList: EducationItem[] = useMemo(() => {
    if (!profile?.educationDetails) return [];
    return profile.educationDetails;
  }, [profile?.educationDetails]);

  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    educationList.forEach((e) => {
      if (e.level) set.add(e.level);
    });
    return Array.from(set);
  }, [educationList]);

  const filteredEducation = useMemo(() => {
    if (selectedLevelFilter === 'All') return educationList;
    return educationList.filter(
      (e) => (e.level || '').toLowerCase() === selectedLevelFilter.toLowerCase()
    );
  }, [educationList, selectedLevelFilter]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      openAuthModal('admin-login');
      return;
    }

    setUploadingAvatar(true);
    setAvatarSuccessMsg(null);
    setAvatarErrorMsg(null);
    try {
      const dataUrl = await resizeImage(file, 900, 900);
      await api.updateAvatar(dataUrl);
      setAvatarSuccessMsg('Profile picture updated successfully from your device!');
      if (onRefresh) onRefresh();
      setTimeout(() => setAvatarSuccessMsg(null), 4000);
    } catch (err: any) {
      setAvatarErrorMsg(err.message || 'Failed to update profile picture from device');
      setTimeout(() => setAvatarErrorMsg(null), 5000);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getLevelBadgeClasses = (level?: string) => {
    const lvl = (level || '').toLowerCase();
    if (lvl.includes('univ')) {
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
    }
    if (lvl.includes('college')) {
      return 'bg-sky-500/15 border-sky-500/30 text-sky-300';
    }
    if (lvl.includes('school')) {
      return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
    }
    if (lvl.includes('cert')) {
      return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    }
    return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Toast alert if avatar was updated */}
      {avatarSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{avatarSuccessMsg}</span>
          </div>
          <button
            onClick={() => setAvatarSuccessMsg(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toast alert if avatar update failed */}
      {avatarErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-medium">{avatarErrorMsg}</span>
          </div>
          <button
            onClick={() => setAvatarErrorMsg(null)}
            className="text-rose-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Header Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/95 via-slate-900/70 to-sky-950/40 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar / Photo with Device Upload Trigger */}
          <div className="relative shrink-0 group">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl p-1 bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-500 shadow-2xl shadow-sky-900/40 relative overflow-hidden">
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-full h-full object-cover rounded-[22px] bg-slate-950"
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-slate-950/80 rounded-[22px] flex flex-col items-center justify-center text-xs text-sky-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>

            {/* Hidden File Input for Device Photo Upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />

            {/* Camera Button to Update Photo from Device */}
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  fileInputRef.current?.click();
                } else {
                  openAuthModal('admin-login');
                }
              }}
              title="Change Profile Picture from Device"
              className="absolute -top-1 -right-1 p-2 rounded-xl bg-slate-900 hover:bg-sky-500 text-slate-300 hover:text-slate-950 border border-slate-700 hover:border-sky-400 shadow-xl transition-all cursor-pointer group-hover:scale-105 active:scale-95"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Live Status indicator */}
            <div className="absolute -bottom-2 right-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-700/80 text-[11px] font-medium shadow-md">
              <span
                className={`w-2 h-2 rounded-full ${
                  isNirofyOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className={isNirofyOnline ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {isNirofyOnline ? 'Online Now' : 'Away'}
              </span>
            </div>
          </div>

          {/* Name, Headline & Customizable Status */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Official Portfolio & Platform</span>
                </div>

                {profile.statusBadge && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                    <span>{profile.statusBadge}</span>
                  </div>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                {profile.fullName}{' '}
                <span className="text-sky-400 font-medium text-2xl sm:text-3xl">({profile.nickname})</span>
              </h1>

              {profile.title && (
                <div className="text-base sm:text-lg text-sky-200/90 font-medium">
                  {profile.title}
                </div>
              )}

              <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-2xl leading-relaxed">
                {profile.tagline}
              </p>

              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-slate-400 pt-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>{profile.location}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={() => onNavigate('chat')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-semibold text-xs shadow-lg shadow-sky-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Private Message Me</span>
              </button>
              <button
                onClick={() => onNavigate('chess')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-500/40 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Swords className="w-4 h-4" />
                <span>Play Live Chess</span>
              </button>
              <button
                onClick={() => onNavigate('coffee')}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Coffee className="w-4 h-4" />
                <span>Support</span>
              </button>

              {isAdmin && (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                  <button
                    onClick={() => onNavigate('admin')}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Customize Profile</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Personal Biography & Story */}
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Personal Biography & Story</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className="text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Edit Bio</span>
            </button>
          )}
        </div>
        <p className="text-slate-200 leading-relaxed text-sm sm:text-base whitespace-pre-line">
          {profile.bio}
        </p>
      </section>


      {/* Educational Background & Institutions (Fully Customizable) */}
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-sky-400 font-semibold text-sm uppercase tracking-wider">
              <GraduationCap className="w-5 h-5 text-sky-400" />
              <span>Educational Journey & Academic Background</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Complete academic history, qualifications, degrees, and institutional milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>+ Manage Education</span>
              </button>
            )}
          </div>
        </div>

        {/* Level Filters (if multiple levels exist) */}
        {availableLevels.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
              <span>Filter:</span>
            </span>
            <button
              onClick={() => setSelectedLevelFilter('All')}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedLevelFilter === 'All'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All ({educationList.length})
            </button>
            {availableLevels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevelFilter(lvl)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  selectedLevelFilter.toLowerCase() === lvl.toLowerCase()
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Education Cards */}
        {filteredEducation.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs space-y-2">
            <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No education records found for the selected filter.</p>
            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="mt-2 text-sky-400 underline hover:text-sky-300 font-semibold"
              >
                Add Education Entries in Admin Dashboard
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEducation.map((edu) => (
              <div
                key={edu.id || edu.institution}
                className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800/90 hover:border-sky-500/50 hover:bg-slate-950/90 transition-all flex flex-col justify-between space-y-4 group shadow-lg relative overflow-hidden"
              >
                {/* Top badges bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {edu.level && (
                      <span
                        className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold tracking-wide ${getLevelBadgeClasses(
                          edu.level
                        )}`}
                      >
                        {edu.level}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      {edu.isCurrent && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active / Enrolled</span>
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-sky-400" />
                        <span>{edu.period}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-100 text-base group-hover:text-sky-300 transition-colors flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span>{edu.institution}</span>
                    </h3>
                    <div className="text-xs text-sky-200 font-medium mt-1">
                      {edu.degree}
                      {edu.field && <span className="text-slate-400 font-normal"> ({edu.field})</span>}
                    </div>
                  </div>
                </div>

                {/* Grade / Honors & Location */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {edu.grade && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-medium flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>{edu.grade}</span>
                      </span>
                    )}
                    {edu.location && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{edu.location}</span>
                      </span>
                    )}
                  </div>

                  {edu.description && (
                    <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3 whitespace-pre-line">
                      {edu.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
