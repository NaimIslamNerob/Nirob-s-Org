import React, { useState, useRef } from 'react';
import { GalleryPhoto, GalleryFolder } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Image as ImageIcon,
  Plus,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FolderPlus,
  Folder,
  Upload,
  CheckCircle,
  AlertCircle,
  Tag,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';

interface GalleryPageProps {
  photos: GalleryPhoto[];
  folders: GalleryFolder[];
  onRefresh: () => void;
  onOpenAdminUpload?: () => void;
}

// Client-side image resize helper to keep uploaded pictures fast and under size limits
function resizeImage(file: File, maxWidth = 1600, maxHeight = 1600): Promise<string> {
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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ photos, folders, onRefresh }) => {
  const { isAdmin, openAuthModal } = useAuth();
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Deletion modals state (replaces native window.confirm which is blocked in iframes)
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // In-app notification toast (replaces native window.alert)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string>(folders[0]?.id || 'general');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter photos by selected folder
  const filteredPhotos =
    selectedFolderId === 'all'
      ? photos
      : photos.filter((p) => p.folderId === selectedFolderId || p.category === selectedFolderId);

  const selectedPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % filteredPhotos.length);
  };

  // Trigger delete photo confirmation modal
  const handleInitiateDeletePhoto = (photo: GalleryPhoto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      openAuthModal('admin-login');
      return;
    }
    setPhotoToDelete(photo);
  };

  // Execute photo deletion
  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    setDeleting(true);
    try {
      await api.deletePhoto(photoToDelete.id);
      if (selectedPhoto?.id === photoToDelete.id) {
        setSelectedPhotoIndex(null);
      }
      setPhotoToDelete(null);
      showToast('Photograph deleted successfully from gallery.', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete photo', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Trigger delete folder confirmation modal
  const handleInitiateDeleteFolder = (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      openAuthModal('admin-login');
      return;
    }
    setFolderToDelete({ id: folderId, name: folderName });
  };

  // Execute folder deletion
  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    setDeleting(true);
    try {
      await api.deleteFolder(folderToDelete.id);
      if (selectedFolderId === folderToDelete.id) {
        setSelectedFolderId('all');
      }
      setFolderToDelete(null);
      showToast(`Album "${folderToDelete.name}" deleted.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete album', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Device files selected
  const handleDeviceFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const resizedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const dataUrl = await resizeImage(files[i]);
        resizedList.push(dataUrl);
      }
      setPreviewImages((prev) => [...prev, ...resizedList]);
      if (!uploadTitle && files[0]) {
        setUploadTitle(files[0].name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err) {
      showToast('Error reading images from device', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Submit device uploads
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewImages.length === 0) {
      showToast('Please choose at least one image from your device', 'error');
      return;
    }

    if (!isAdmin) {
      openAuthModal('admin-login');
      return;
    }

    setUploading(true);
    try {
      const folderObj = folders.find((f) => f.id === targetFolderId);
      const batchPayload = previewImages.map((dataUrl, idx) => ({
        title: previewImages.length === 1 ? uploadTitle.trim() || 'Untitled' : `${uploadTitle.trim() || 'Photo'} (${idx + 1})`,
        caption: uploadCaption.trim(),
        imageUrl: dataUrl,
        folderId: targetFolderId,
        category: folderObj?.name || 'General',
      }));

      await api.uploadBatchPhotos(batchPayload);
      setIsUploadModalOpen(false);
      setPreviewImages([]);
      setUploadTitle('');
      setUploadCaption('');
      showToast(`${batchPayload.length} photograph(s) uploaded successfully!`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photos from device', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Create new folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    if (!isAdmin) {
      openAuthModal('admin-login');
      return;
    }

    setCreatingFolder(true);
    try {
      const res = await api.createFolder({
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
      });
      setIsFolderModalOpen(false);
      setNewFolderName('');
      setNewFolderDesc('');
      setSelectedFolderId(res.folder.id);
      showToast(`Album "${res.folder.name}" created!`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to create folder', 'error');
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* In-app Toast Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xl animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-600/80 text-emerald-300'
              : 'bg-rose-950/90 border-rose-600/80 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <ImageIcon className="w-4 h-4" />
            <span>Visual Journal & Albums</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Photographs & Albums</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organized photo albums covering chess tournaments, campus memories, and developer life.
          </p>
        </div>

        {/* Action Buttons for Admin */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <button
                onClick={() => setIsFolderModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs border border-sky-500/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <FolderPlus className="w-4 h-4 text-sky-400" />
                <span>New Folder</span>
              </button>
              <button
                onClick={() => {
                  setTargetFolderId(selectedFolderId !== 'all' ? selectedFolderId : (folders[0]?.id || 'general'));
                  setIsUploadModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photos from Device</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => openAuthModal('admin-login')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs border border-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Admin Upload & Manage</span>
            </button>
          )}
        </div>
      </div>

      {/* Folders Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-bold text-slate-300">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Albums & Folders
          </span>
          <span className="font-mono">{photos.length} total photos</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {/* All Photos Tab */}
          <button
            onClick={() => setSelectedFolderId('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedFolderId === 'all'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>All Photos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedFolderId === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {photos.length}
            </span>
          </button>

          {/* Folder Tabs */}
          {folders.map((folder) => {
            const count = photos.filter((p) => p.folderId === folder.id || p.category === folder.name).length;
            const isSelected = selectedFolderId === folder.id;
            return (
              <div key={folder.id} className="relative group shrink-0">
                <button
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer pr-8 ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>{folder.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-slate-950 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>

                {isAdmin && (
                  <button
                    onClick={(e) => handleInitiateDeleteFolder(folder.id, folder.name, e)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-950/80 transition-colors"
                    title={`Delete folder "${folder.name}"`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-3">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-300">No photos in this album yet.</p>
          {isAdmin && (
            <button
              onClick={() => {
                setTargetFolderId(selectedFolderId !== 'all' ? selectedFolderId : (folders[0]?.id || 'general'));
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photos to this Album</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhotoIndex(index)}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 hover:border-sky-500/50 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-950 relative">
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Permanent direct delete button for Admin */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => handleInitiateDeletePhoto(photo, e)}
                    className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white shadow-xl transition-all z-20 cursor-pointer hover:scale-110 active:scale-95"
                    title="Delete photograph"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Hover overlay for full size viewing */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <div className="text-white text-xs flex items-center justify-between w-full">
                    <span className="font-medium flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                      View Full Size
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-1.5 bg-slate-900/90">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-sky-400 font-medium">
                    <Tag className="w-3 h-3" />
                    {photo.category}
                  </span>
                  <span className="font-mono">
                    {new Date(photo.uploadedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-100 text-sm group-hover:text-sky-300 transition-colors line-clamp-1">
                  {photo.title}
                </h3>
                {photo.caption && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhotoIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/95 backdrop-blur-xl"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[92vh] flex flex-col rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-medium">
                  {selectedPhoto.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(selectedPhoto.uploadedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleInitiateDeletePhoto(selectedPhoto)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Photo</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close Lightbox"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 min-h-[300px] max-h-[68vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.title}
                className="max-h-full max-w-full object-contain"
              />

              {filteredPhotos.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-lg transition-transform active:scale-90 cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-lg transition-transform active:scale-90 cursor-pointer"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="p-5 bg-slate-900 border-t border-slate-800 space-y-1">
              <h3 className="text-lg font-bold text-white">{selectedPhoto.title}</h3>
              {selectedPhoto.caption && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {selectedPhoto.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Non-Blocking Delete Photo Confirmation Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Photograph</h3>
                <p className="text-xs text-slate-400">Permanently remove from gallery</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-800">
                <img src={photoToDelete.imageUrl} alt={photoToDelete.title} className="w-full h-full object-cover" />
              </div>
              <div className="truncate">
                <h4 className="font-semibold text-xs text-white truncate">{photoToDelete.title}</h4>
                <span className="text-[11px] text-sky-400 font-mono uppercase">{photoToDelete.category}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this photograph? This change cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeletePhoto}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Delete Photograph'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Non-Blocking Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Album / Folder</h3>
                <p className="text-xs text-rose-400 font-medium">"{folderToDelete.name}"</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this album? All photographs inside will remain safe and accessible in "All Photos".
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteFolder}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Delete Album'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Photos from Device Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Upload Photos from Device</h3>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setPreviewImages([]);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Choose Folder */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Album / Folder *
                </label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Device File Selection Area */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Choose Image(s) from Phone or Computer *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleDeviceFilesSelected}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/60 transition-colors"
                >
                  <Upload className="w-8 h-8 mx-auto text-sky-400 mb-2" />
                  <span className="text-xs font-semibold text-white block">
                    Click to browse files from device
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Supports JPG, PNG, WEBP (Multiple photos allowed)
                  </span>
                </div>
              </div>

              {/* Thumbnails preview */}
              {previewImages.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">
                    Selected Photos ({previewImages.length}):
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1 max-h-24">
                    {previewImages.map((src, idx) => (
                      <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-700">
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPreviewImages(previewImages.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-950/80 text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Title & Caption */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Photo Title</label>
                <input
                  type="text"
                  placeholder="e.g. Chess Olympiad Blitz Game"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Story / Caption</label>
                <textarea
                  rows={2}
                  placeholder="Add a caption or memory description..."
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || previewImages.length === 0}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {uploading ? 'Processing & Uploading...' : `Upload ${previewImages.length} Photo${previewImages.length > 1 ? 's' : ''} to Gallery`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Create New Album / Folder</h3>
              </div>
              <button onClick={() => setIsFolderModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Folder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chess Tournaments 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Short note about what this folder contains..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingFolder || !newFolderName.trim()}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {creatingFolder ? 'Creating Folder...' : 'Create Folder'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
