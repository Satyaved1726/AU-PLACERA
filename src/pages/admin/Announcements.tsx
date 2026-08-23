// Digital Notice Board Management Screen - Supporting file and image uploader controls
import React, { useState, useRef } from 'react';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { useAuth } from '../../features/auth/useAuth';
import { useAnnouncements } from '../../features/announcements/hooks/useAnnouncements';
import { useCreateAnnouncement } from '../../features/announcements/hooks/useCreateAnnouncement';
import { useDeleteAnnouncement } from '../../features/announcements/hooks/useDeleteAnnouncement';
import type { DigitalAnnouncement } from '../../types';
import { 
  Megaphone, Plus, Trash2, Upload, X, 
  ExternalLink, CheckCircle2, AlertCircle, ShieldCheck, FileText, Download,
  FileSpreadsheet, Image, Loader2
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { announcementsService } from '../../features/announcements/announcementsService';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface AttachmentItemProps {
  attachment: any;
  isAdmin: boolean;
  onDelete?: (id: string, filePath: string) => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({ attachment, isAdmin, onDelete }) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  React.useEffect(() => {
    let active = true;
    const fetchSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('announcement-attachments')
          .createSignedUrl(attachment.file_path, 3600);
        
        if (error) {
          if (import.meta.env.DEV) {
            console.warn('Failed to generate signed URL:', error.message);
          }
          return;
        }

        if (active && data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Failed to fetch signed URL:', err);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchSignedUrl();
    return () => {
      active = false;
    };
  }, [attachment]);

  const isPdf = attachment.file_name.toLowerCase().endsWith('.pdf');
  const isExcel = attachment.file_name.toLowerCase().endsWith('.xlsx') || attachment.file_name.toLowerCase().endsWith('.xls');
  const isImage = attachment.file_type.startsWith('image/') || attachment.file_name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="h-9 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
    );
  }

  if (!signedUrl) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100/50 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 truncate">
          {isPdf ? (
            <FileText className="h-5 w-5 text-red-500 shrink-0" />
          ) : isExcel ? (
            <FileSpreadsheet className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <Image className="h-5 w-5 text-blue-500 shrink-0" />
          )}
          <div className="flex flex-col truncate">
            <span className="text-[10px] font-black text-slate-800 truncate" title={attachment.file_name}>
              {attachment.file_name}
            </span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {formatFileSize(attachment.file_size)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={isExcel ? attachment.file_name : undefined}
            className="h-7 px-3 bg-white border border-slate-200 text-slate-700 hover:text-primary hover:border-primary rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
            title={isExcel ? 'Download Excel' : 'Open Attachment'}
          >
            {isExcel ? <Download className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
            <span>{isExcel ? 'Download' : isPdf ? 'Open PDF' : 'View'}</span>
          </a>
          
          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(attachment.id, attachment.file_path)}
              className="h-7 w-7 bg-red-50 hover:bg-red-150 text-red-600 rounded-lg flex items-center justify-center border border-red-100 transition-colors"
              title="Delete Attachment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {isImage && (
        <a 
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 rounded-lg overflow-hidden border border-slate-200/60 bg-white block max-w-xs cursor-zoom-in"
        >
          <img 
            src={signedUrl}
            alt={attachment.file_name}
            className="max-h-24 object-contain mx-auto"
            loading="lazy"
          />
        </a>
      )}
    </div>
  );
};

export const Announcements: React.FC = () => {
  const { profile, loading } = useAuth();
  const { data: announcements = [], isLoading, error } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const queryClient = useQueryClient();

  // Search and OIA filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [oiaFilter, setOiaFilter] = useState<'all' | 'general' | 'oia'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<DigitalAnnouncement | null>(null);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [isOia, setIsOia] = useState(false);
  
  // Image/file uploading states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Attachments states
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [uploadingAnnId, setUploadingAnnId] = useState<string | null>(null);
  const [attachmentUploadStatus, setAttachmentUploadStatus] = useState<string | null>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);
  const inlineFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateAttachmentFile = (file: File): boolean => {
    const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const isAllowed = allowedExtensions.includes(fileExt);

    if (!isAllowed) {
      triggerToast(`Invalid format: ${file.name}. Only PDF, Excel, and images are allowed.`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      triggerToast(`File too large: ${file.name}. Maximum size is 10MB.`);
      return false;
    }
    return true;
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateAttachmentFile);
    setSelectedAttachments(prev => [...prev, ...validFiles]);
    if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = '';
  };

  const handleInlineAttachmentUpload = async (announcementId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateAttachmentFile(file)) return;
    if (!profile?.id) return;

    try {
      setUploadingAnnId(announcementId);
      await announcementsService.uploadAttachment(announcementId, file, profile.id);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      triggerToast('Attachment uploaded successfully.');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to upload attachment.');
    } finally {
      setUploadingAnnId(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, filePath: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await announcementsService.deleteAttachment(attachmentId, filePath);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      triggerToast('Attachment deleted successfully.');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete attachment.');
    }
  };

  React.useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      triggerToast('Please select a valid image or PDF file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      triggerToast('File size is too large (max 15MB).');
      return;
    }

    setImageFile(file);
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview('pdf-placeholder');
    }
  };
  
  // Delete Dialog state
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<DigitalAnnouncement | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Selection Handler for Image or PDF
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      triggerToast('Please select a valid image or PDF file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      triggerToast('File size is too large (max 15MB).');
      return;
    }

    setImageFile(file);
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview('pdf-placeholder');
    }
  };

  // Create Submit Handler
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      triggerToast('Title is required.');
      return;
    }
    if (!imageFile) {
      triggerToast('Please upload an announcement poster flyer or PDF.');
      return;
    }
    if (loading) {
      triggerToast('User session is still loading. Please wait.');
      return;
    }
    if (!profile?.id) {
      triggerToast('User session error. Please log in again.');
      return;
    }

    try {
      setIsCompressing(true);
      const newAnn = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        imageFile,
        externalUrl: externalUrl.trim() || null,
        isOia,
        createdBy: profile.id
      });

      // Upload attachments sequentially
      if (selectedAttachments.length > 0) {
        for (const file of selectedAttachments) {
          setAttachmentUploadStatus(`Uploading "${file.name}"...`);
          await announcementsService.uploadAttachment(newAnn.id, file, profile.id);
        }
      }

      // Reset Form
      setTitle('');
      setDescription('');
      setExternalUrl('');
      setIsOia(false);
      setImageFile(null);
      setImagePreview(null);
      setSelectedAttachments([]);
      setIsCreateOpen(false);
      triggerToast('Notice published successfully to Digital Notice Board.');
      // Refresh list to show attachments
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (err: any) {
      triggerToast(err.message || 'Failed to publish notice.');
    } finally {
      setIsCompressing(false);
      setAttachmentUploadStatus(null);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingAnnouncement) return;

    try {
      await deleteMutation.mutateAsync({
        id: deletingAnnouncement.id,
        imageUrl: deletingAnnouncement.image_url
      });
      setDeletingAnnouncement(null);
      triggerToast('Notice removed permanently from Digital Notice Board.');
    } catch {
      triggerToast('Failed to delete notice.');
    }
  };

  // Apply filters
  const filteredAnnouncements = announcements.filter(ann => {
    const textMatch = (
      ann.title + ' ' + (ann.description || '')
    ).toLowerCase().includes(searchQuery.toLowerCase());

    const oiaMatch = oiaFilter === 'all' || 
      (oiaFilter === 'oia' && ann.is_oia) || 
      (oiaFilter === 'general' && !ann.is_oia);

    return textMatch && oiaMatch;
  });

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12 select-none px-4 sm:px-0">
      
      {/* Global Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-white/5"
          >
            <CheckCircle2 className="h-4 w-4 text-[#D9B310] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight uppercase tracking-wide">Digital Notice Board</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Publish recruitment poster flyers, campus notices, and program PDF bulletins.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          variant="primary"
          size="sm"
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Publish Notice</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <SearchBar onSearchChange={setSearchQuery} className="w-full sm:max-w-xs" />
          
          {/* Target Group Filters */}
          <div className="flex gap-2 select-none">
            <button
              onClick={() => setOiaFilter('all')}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                oiaFilter === 'all'
                  ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              All Notice Board
            </button>
            <button
              onClick={() => setOiaFilter('general')}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                oiaFilter === 'general'
                  ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setOiaFilter('oia')}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 transition-all ${
                oiaFilter === 'oia'
                  ? 'bg-purple-50 border-purple-250 text-purple-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className={`h-3 w-3 ${oiaFilter === 'oia' ? 'text-purple-500' : 'text-slate-400'}`} />
              <span>OIA Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <span>Failed to load digital notice board. Check connection and reload.</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredAnnouncements.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-sm mx-auto shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-full inline-block mb-3 text-slate-400">
            <Megaphone className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">No flyers uploaded</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Click "Publish Notice" to upload visual flyers or adjust your search filter.
          </p>
        </div>
      )}

      {/* Skeletons */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-200 rounded-full shrink-0" />
                <div className="space-y-2 flex-grow">
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
              <div className="h-64 bg-slate-200 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Visual Flyers Feed */}
      {!isLoading && (
        <div className="space-y-6">
          {filteredAnnouncements.map(ann => {
            const isPdf = ann.image_url.toLowerCase().split('?')[0].endsWith('.pdf');
            const initials = ann.profiles?.full_name 
              ? ann.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : 'P';

            return (
              <div 
                key={ann.id}
                className="bg-white border border-slate-100/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-5 space-y-4 hover:shadow-soft transition-all"
              >
                {/* 1. Header with Publisher info & action buttons */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-black text-xs shrink-0 uppercase select-none border border-slate-200">
                      {initials}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-800 text-xs sm:text-sm">
                        {ann.profiles?.full_name || 'Placement Coordinator'}
                        <span className="text-slate-400 font-semibold"> | {ann.profiles?.role === 'super_admin' ? 'Head' : 'Coordinator'}</span>
                      </div>
                      <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">
                        {new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="normal-case"> at </span>
                        {new Date(ann.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ann.is_oia && (
                      <span className="text-[8px] font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full uppercase">
                        OIA
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeletingAnnouncement(ann)}
                      className="h-8 w-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center border border-red-100 transition-colors"
                      title="Delete Notice"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Visual Document (original size image or PDF placeholder) */}
                <div className="overflow-hidden rounded-xl border border-slate-100/50 bg-slate-50">
                  {isPdf ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-3 select-none text-center">
                      <FileText className="h-14 w-14 text-red-500" />
                      <div>
                        <span className="text-xs font-black text-slate-800 block uppercase tracking-wider">{ann.title}</span>
                        <span className="text-[9px] text-slate-450 font-bold uppercase tracking-widest mt-1 block">PDF Notice Attachment</span>
                      </div>
                      <a 
                        href={ann.image_url}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-2 h-9 px-4.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open PDF</span>
                      </a>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setSelectedAnnouncement(ann)}
                      className="flex items-center justify-center max-h-[600px] relative group overflow-hidden cursor-pointer"
                    >
                      <img 
                        src={ann.image_url} 
                        alt={ann.title} 
                        className="w-full h-auto object-contain animate-fade-in group-hover:scale-[1.01] transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Text Info */}
                <div className="space-y-2 pt-1">
                  <h3 className="text-sm font-black text-slate-800 leading-snug uppercase tracking-wide">
                    {ann.title}
                  </h3>
                  {ann.description && (
                    <p className="text-xs text-slate-555 font-semibold leading-relaxed whitespace-pre-wrap select-text">
                      {ann.description}
                    </p>
                  )}

                  {/* Attachments Section */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Attachments
                      </span>
                      <div className="flex items-center gap-2">
                        {uploadingAnnId === ann.id && (
                          <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span>Uploading...</span>
                          </div>
                        )}
                        <input 
                          type="file"
                          ref={el => { inlineFileInputRefs.current[ann.id] = el; }}
                          accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => handleInlineAttachmentUpload(ann.id, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploadingAnnId === ann.id}
                          onClick={() => inlineFileInputRefs.current[ann.id]?.click()}
                          className="h-6 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Attachment</span>
                        </button>
                      </div>
                    </div>

                    {ann.attachments && ann.attachments.length > 0 ? (
                      <div className="space-y-1.5 mt-1.5">
                        {ann.attachments.map((att) => (
                          <AttachmentItem 
                            key={att.id} 
                            attachment={att} 
                            isAdmin={true} 
                            onDelete={handleDeleteAttachment} 
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400 font-semibold italic">No attachments uploaded.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 select-none">
                    <span />
                    {ann.external_url && (
                      <a
                        href={ann.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-dark flex items-center gap-1"
                      >
                        <span>External Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE DIALOG MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full md:max-w-xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 flex flex-col max-h-[85vh] md:max-h-[90vh] pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-0"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Publish Notice Board Post</h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-655 h-9 w-9 flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                
                {/* Form Error Banner */}
                {createMutation.error && (
                  <div className="p-4 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{(createMutation.error as any).message || 'Failed to publish notice. Please check file type/size and try again.'}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                    Title / Heading
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AWS Recruitment Drive 2026 Poster"
                    className="au-input"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                    Highlights / Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notice highlights, eligibility, salary, test instructions..."
                    className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-secondary focus:ring-4 focus:ring-secondary/5 text-xs font-semibold leading-relaxed transition-all"
                  />
                </div>

                {/* Link */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                    External Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="e.g. https://forms.gle/recruitment"
                    className="au-input"
                  />
                </div>

                {/* Document Picker Dropzone */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                    Flyer Image or PDF Bulletin Document
                  </label>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-44 flex items-center justify-center p-4">
                      {imagePreview === 'pdf-placeholder' ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-10 w-10 text-red-500" />
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                            {imageFile?.name || 'Selected PDF Notice'}
                          </span>
                        </div>
                      ) : (
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/70 text-white rounded-lg hover:bg-slate-900 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer bg-slate-50/30 ${
                        isDragging 
                          ? 'border-primary bg-primary/5 text-primary scale-[1.01]' 
                          : 'border-slate-250 hover:border-primary text-slate-450 hover:text-primary'
                      }`}
                    >
                      <Upload className="h-6 w-6" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Drag & drop or click to upload</span>
                      <span className="text-[8px] text-slate-400 font-semibold">Supports Images & PDF Bulletins (max 15MB)</span>
                    </div>
                  )}
                </div>

                {/* Attachments Section */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                    Attachments (Optional)
                  </label>
                  <input 
                    type="file"
                    ref={attachmentFileInputRef}
                    multiple
                    accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
                    onChange={handleAttachmentSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => attachmentFileInputRef.current?.click()}
                    className="h-8 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 select-none transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Files</span>
                  </button>
                  
                  {selectedAttachments.length > 0 && (
                    <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto pr-1">
                      {selectedAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-semibold text-slate-700">
                          <div className="flex items-center gap-2 truncate">
                            {file.name.toLowerCase().endsWith('.pdf') ? (
                              <FileText className="h-4.5 w-4.5 text-red-500 shrink-0" />
                            ) : file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx') ? (
                              <FileSpreadsheet className="h-4.5 w-4.5 text-green-600 shrink-0" />
                            ) : (
                              <Image className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                            <span className="text-[8px] text-slate-400">({formatFileSize(file.size)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* OIA Toggle Option */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100 select-none">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-purple-500" />
                    <span>Target OIA Eligible Students Only</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isOia}
                      onChange={(e) => setIsOia(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {attachmentUploadStatus && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-[10px] font-bold mt-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
                    <span>{attachmentUploadStatus}</span>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="h-10 px-5 text-[10px] font-black uppercase tracking-wider text-slate-555 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all select-none"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={createMutation.isPending || isCompressing || loading || !!attachmentUploadStatus}
                    disabled={!profile}
                    className="h-10 px-6 rounded-xl"
                  >
                    {loading 
                      ? 'Loading Session...' 
                      : attachmentUploadStatus 
                        ? attachmentUploadStatus 
                        : isCompressing 
                          ? 'Compressing...' 
                          : createMutation.isPending 
                            ? 'Publishing...' 
                            : 'Publish Notice'}
                  </Button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {deletingAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingAnnouncement(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            {/* Confirmation Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative z-10 space-y-4"
            >
              <div className="text-center space-y-2">
                <div className="p-3 bg-red-50 border border-red-100 rounded-full inline-block text-red-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Remove Notice?</h3>
                <p className="text-[10px] text-slate-400 font-bold tracking-normal leading-relaxed">
                  This action is permanent. The visual file poster/PDF will be deleted from Supabase Storage and all records will be destroyed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setDeletingAnnouncement(null)}
                  className="py-2.5 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleDeleteConfirm}
                  variant="danger"
                  isLoading={deleteMutation.isPending}
                  className="py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX / FULL SCREEN IMAGE VIEWER */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 select-none p-0 sm:p-4 animate-fade-in">
            {/* Close backdrop */}
            <div 
              onClick={() => setSelectedAnnouncement(null)}
              className="absolute inset-0 cursor-zoom-out" 
            />

            {/* Lightbox Container Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-slate-950 sm:rounded-2xl overflow-hidden relative z-10 flex flex-col h-[90vh] sm:h-[85vh]"
            >

              {/* Floating Action Header */}
              <div className="absolute top-4 right-4 z-40 flex items-center gap-3">
                <a
                  href={selectedAnnouncement.image_url}
                  download={`notice-${selectedAnnouncement.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10 flex items-center justify-center shadow-md shadow-black/20"
                  title="Download Document"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-5 w-5" />
                </a>
                
                {selectedAnnouncement.external_url && (
                  <a
                    href={selectedAnnouncement.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors flex items-center justify-center shadow-md shadow-blue-500/10"
                    title="Register / View Link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}

                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full backdrop-blur-sm transition-colors border border-white/10 flex items-center justify-center shadow-md shadow-black/20"
                  aria-label="Close details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Document display panel */}
              <div className="w-full h-full bg-slate-950 flex items-center justify-center p-4">
                {selectedAnnouncement.image_url.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                  <iframe
                    src={selectedAnnouncement.image_url}
                    className="w-full h-full border-0 rounded-xl"
                    title={selectedAnnouncement.title}
                  />
                ) : (
                  <img
                    src={selectedAnnouncement.image_url}
                    alt={selectedAnnouncement.title}
                    className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-2xl border border-white/5 my-auto"
                  />
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Announcements;
