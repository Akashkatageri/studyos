import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Youtube, 
  FileText, 
  Cloud, 
  Presentation, 
  Globe, 
  FileEdit, 
  AlertCircle, 
  Loader2, 
  X,
  Bookmark
} from 'lucide-react';
import { ModuleResource, UserState } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

interface ModuleResourcesSectionProps {
  moduleId: string;
  userState: UserState;
}

const RESOURCE_TYPES = [
  { value: 'youtube', label: '📺 YouTube Video / Playlist', icon: Youtube, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { value: 'pdf', label: '📄 PDF Link', icon: FileText, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'drive', label: '☁️ Google Drive Link', icon: Cloud, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'ppt', label: '📑 PPT / Presentation Link', icon: Presentation, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'website', label: '🌐 Website / Documentation', icon: Globe, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { value: 'notes', label: '📝 Notes Link', icon: FileEdit, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
] as const;

export default function ModuleResourcesSection({ moduleId, userState }: ModuleResourcesSectionProps) {
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ModuleResource['type']>('website');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to validate URL
  const isValidHttpsUrl = (urlString: string): boolean => {
    try {
      const parsedUrl = new URL(urlString);
      return parsedUrl.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const getLocalStorageKey = () => `studyos_resources_${userState.uid || 'guest'}_${moduleId}`;

  // Fetch Resources
  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      setError(null);

      // 1. Try local cache first for instant loading
      const cached = localStorage.getItem(getLocalStorageKey());
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ModuleResource[];
          // Sort by dateAdded descending
          setResources(parsed.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()));
        } catch (e) {
          console.error('Error parsing cached resources:', e);
        }
      }

      // 2. Fetch from Firestore if authenticated and online
      const isOnline = userState.uid && !userState.isOffline;
      if (isOnline) {
        try {
          const colRef = collection(db, 'users', userState.uid!, 'resources', moduleId, 'items');
          const q = query(colRef);
          const querySnapshot = await getDocs(q);
          const items: ModuleResource[] = [];
          
          querySnapshot.forEach((d) => {
            items.push({ id: d.id, ...d.data() } as ModuleResource);
          });

          // Sort descending
          items.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
          
          setResources(items);
          localStorage.setItem(getLocalStorageKey(), JSON.stringify(items));
        } catch (err: any) {
          console.error('Error fetching resources from Firestore:', err);
          // If Firestore fails (e.g. permission or network), we don't crash, just show error if local is empty
          if (!cached) {
            setError('Failed to fetch resources from cloud database. Showing offline view.');
          }
        }
      }

      setIsLoading(false);
    };

    fetchResources();
  }, [moduleId, userState.uid, userState.isOffline]);

  // Open Add Form
  const handleOpenAdd = () => {
    setTitle('');
    setType('website');
    setUrl('');
    setDescription('');
    setEditingId(null);
    setValidationError(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (res: ModuleResource, e: React.MouseEvent) => {
    e.stopPropagation();
    setTitle(res.title);
    setType(res.type);
    setUrl(res.url);
    setDescription(res.description || '');
    setEditingId(res.id);
    setValidationError(null);
    setIsFormOpen(true);
  };

  // Save (Create or Update) Resource
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Trim values
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();
    const cleanDescription = description.trim();

    // Validation checks
    if (!cleanTitle) {
      setValidationError('Please enter a descriptive title.');
      return;
    }

    if (!cleanUrl) {
      setValidationError('Please enter a URL.');
      return;
    }

    if (!isValidHttpsUrl(cleanUrl)) {
      setValidationError('Invalid URL. Only valid HTTPS URLs (https://...) are supported.');
      return;
    }

    setIsSaving(true);

    const resourceId = editingId || `res-${Date.now()}`;
    const dateAdded = editingId 
      ? resources.find(r => r.id === editingId)?.dateAdded || new Date().toISOString()
      : new Date().toISOString();

    const resourceData: ModuleResource = {
      id: resourceId,
      moduleId,
      title: cleanTitle,
      type,
      url: cleanUrl,
      description: cleanDescription || undefined,
      dateAdded
    };

    // Update state locally first for positive UI feel
    const updatedResources = editingId
      ? resources.map((r) => (r.id === editingId ? resourceData : r))
      : [resourceData, ...resources];

    try {
      // 1. Write to Firestore if online
      if (userState.uid && !userState.isOffline) {
        const docRef = doc(db, 'users', userState.uid, 'resources', moduleId, 'items', resourceId);
        await setDoc(docRef, resourceData, { merge: true });
      }

      // 2. Save local cache
      setResources(updatedResources);
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(updatedResources));

      // 3. Reset form
      setIsFormOpen(false);
      setEditingId(null);
    } catch (err: any) {
      console.error('Error saving resource:', err);
      setValidationError('Could not sync with the cloud database. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Resource
  const handleDeleteResource = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Quick confirmation
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    const updatedResources = resources.filter((r) => r.id !== id);

    try {
      // 1. Delete from Firestore if online
      if (userState.uid && !userState.isOffline) {
        const docRef = doc(db, 'users', userState.uid, 'resources', moduleId, 'items', id);
        await deleteDoc(docRef);
      }

      // 2. Update local state & cache
      setResources(updatedResources);
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(updatedResources));
    } catch (err) {
      console.error('Error deleting resource:', err);
      alert('Could not delete from cloud. Please try again.');
    }
  };

  // Help determine which icon to render
  const getTypeIcon = (typeVal: ModuleResource['type']) => {
    const matched = RESOURCE_TYPES.find((r) => r.value === typeVal);
    return matched ? matched.icon : Globe;
  };

  // Help determine type colors
  const getTypeColors = (typeVal: ModuleResource['type']) => {
    const matched = RESOURCE_TYPES.find((r) => r.value === typeVal);
    return matched ? matched.color : 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  };

  if (isLoading && resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        <p className="text-xs font-medium font-mono">Loading module resources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative text-sans">
      {/* Header and Add Button */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 font-mono">
          Saved Resources ({resources.length})
        </span>
        {!isFormOpen && (
          <button
            onClick={handleOpenAdd}
            className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Resource
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add / Edit Resource Form */}
      {isFormOpen && (
        <form 
          onSubmit={handleSaveResource}
          className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4 relative animate-fade-in"
        >
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h6 className="text-xs font-extrabold uppercase tracking-wider text-white">
              {editingId ? 'Edit Resource' : 'Add Module Resource'}
            </h6>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {validationError && (
            <div className="p-2.5 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-2 text-[11px] text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Resource Title
              </label>
              <input
                type="text"
                required
                placeholder="E.g., YouTube playlist, notes, doc link..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0C0F12] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/40 transition-colors"
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Resource Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ModuleResource['type'])}
                className="w-full bg-[#0C0F12] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/40 transition-colors cursor-pointer"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#141A1F] text-white text-xs">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* URL */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              HTTPS URL Link
            </label>
            <input
              type="text"
              required
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-[#0C0F12] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Optional Description / Notes
            </label>
            <textarea
              placeholder="What is this study link about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-[#0C0F12] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/40 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-800">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsFormOpen(false)}
              className="px-3.5 py-1.5 text-xs font-bold text-gray-400 hover:text-white rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId ? 'Save Changes' : 'Add Resource'}
            </button>
          </div>
        </form>
      )}

      {/* Resources list */}
      {resources.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {resources.map((res) => {
            const IconComponent = getTypeIcon(res.type);
            const badgeStyle = getTypeColors(res.type);
            
            return (
              <div
                key={res.id}
                className="group relative bg-[#141A1F]/40 border border-gray-850/60 rounded-xl p-3.5 flex items-start gap-3.5 hover:border-gray-800 hover:bg-[#141A1F]/80 transition-all duration-200"
              >
                {/* Visual Icon Node */}
                <div className={`p-2.5 rounded-xl border ${badgeStyle} shrink-0`}>
                  <IconComponent className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 pr-16 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className="text-xs font-extrabold text-white leading-tight truncate">
                      {res.title}
                    </h5>
                    <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                      {res.type}
                    </span>
                  </div>

                  {res.description && (
                    <p className="text-[10.5px] text-gray-400 font-medium leading-relaxed truncate-2-lines">
                      {res.description}
                    </p>
                  )}

                  <div className="text-[8.5px] text-gray-500 font-mono">
                    Added on {new Date(res.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                {/* Actions overlay */}
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 bg-[#0C0F12]/80 hover:bg-amber-500/10 hover:text-amber-400 border border-gray-800 hover:border-amber-500/20 text-gray-400 rounded-lg transition-all"
                    title="Open Resource"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={(e) => handleOpenEdit(res, e)}
                    className="p-1.5 bg-[#0C0F12]/80 hover:bg-blue-500/10 hover:text-blue-400 border border-gray-800 hover:border-blue-500/20 text-gray-400 rounded-lg transition-all cursor-pointer"
                    title="Edit Resource"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteResource(res.id, e)}
                    className="p-1.5 bg-[#0C0F12]/80 hover:bg-red-500/10 hover:text-red-400 border border-gray-800 hover:border-red-500/20 text-gray-400 rounded-lg transition-all cursor-pointer"
                    title="Delete Resource"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !isFormOpen && (
          <div className="flex flex-col items-center justify-center py-8 border border-dashed border-gray-800/80 rounded-2xl text-center p-5 bg-[#0C0F12]/10 space-y-3">
            <div className="p-3 bg-amber-500/5 rounded-full border border-amber-500/10 text-amber-500/40">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-300">No resources added yet</p>
              <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
                Organise YouTube videos, presentation slides, notes, and PDF study guides directly inside this module.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="text-[10px] font-extrabold uppercase tracking-wider py-2 px-3.5 rounded-xl border border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Resource
            </button>
          </div>
        )
      )}
    </div>
  );
}
