/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Study Vault View (#vault)
 * Powered exclusively by Supabase:
 * - Table: vault_items (columns: title, kind, domain, tags, note_text, due_date, submitted_at, status, score, file_path, file_name, file_type)
 * - Storage Bucket: "vault"
 * - Storage Path: <user_id>/<random-uuid>.<lowercase extension> only
 * - Full error transparency, real error text, retry on failed files, and missing setup detection.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageId } from '../components/TopBar.tsx';
import {
  VaultIcon,
  FileTextIcon,
  UploadCloudIcon,
  Trash2Icon,
  Edit3Icon,
  DownloadIcon,
  EyeIcon,
  SearchIcon,
  TagIcon,
  CalendarIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  RefreshCwIcon,
  ShieldIcon,
  ArrowRightIcon,
  UserIcon,
  SparklesIcon,
  BarChartIcon,
  ClockIcon,
  InfoIcon,
} from '../components/icons.tsx';
import {
  VaultItem,
  VaultKind,
  VaultDomain,
  VaultStatus,
  fetchVaultMetadataList,
  insertVaultItemRow,
  updateVaultItemRow,
  deleteVaultMetadataItem,
  uploadVaultFile,
  getVaultFileSignedUrl,
  validateVaultFile,
  isMissingTableOrBucket,
  extractErrorMessage,
  MISSING_VAULT_SETUP_MESSAGE,
  FirebaseUser,
} from '../services/supabase.ts';
import {
  calculateDeadlineCounts,
  calculateDomainScoreTrend,
  generateVaultSuggestions,
  VaultSuggestion,
} from '../utils/vaultInsights.ts';
import { DomainKey } from '../utils/scoring.ts';

interface VaultViewProps {
  onNavigate: (page: PageId) => void;
  currentUser: FirebaseUser | null;
  domainScores?: Record<DomainKey, number>;
  onVaultItemsCountChange?: (countByDomain: Record<VaultDomain, number>) => void;
  onVaultItemsChange?: (items: VaultItem[]) => void;
}

export interface UploadProgressItem {
  id: string;
  file: File;
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
  filePath?: string;
  domain?: VaultDomain;
}

export function VaultView({
  onNavigate,
  currentUser,
  domainScores = { programming: 76, analytical: 28, communication: 68, design: 22 },
  onVaultItemsCountChange,
  onVaultItemsChange,
}: VaultViewProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMissingSetup, setIsMissingSetup] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<'All' | VaultKind>('All');
  const [domainFilter, setDomainFilter] = useState<'All' | VaultDomain>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | VaultStatus>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'dueDate' | 'title'>('newest');

  // Chart domain filter
  const [chartDomainFilter, setChartDomainFilter] = useState<'All' | VaultDomain>('All');

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<VaultItem | null>(null);

  // Preview States
  const [previewItem, setPreviewItem] = useState<VaultItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Upload Queue state for multiple files
  const [uploadQueue, setUploadQueue] = useState<UploadProgressItem[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // New Item Form State
  const [formKind, setFormKind] = useState<VaultKind>('Note');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDomain, setFormDomain] = useState<VaultDomain>('Programming');
  const [formContent, setFormContent] = useState<string>('');
  const [formTags, setFormTags] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formSubmittedAt, setFormSubmittedAt] = useState<string>('');
  const [formStatus, setFormStatus] = useState<VaultStatus>('To do');
  const [formScore, setFormScore] = useState<string>('');
  const [modalFiles, setModalFiles] = useState<File[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Show auto-dismiss toast
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  // Fetch items from Supabase table vault_items
  useEffect(() => {
    if (!currentUser) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function loadVault() {
      setIsLoading(true);
      try {
        const vaultData = await fetchVaultMetadataList(currentUser!.uid);
        if (!isMounted) return;
        setItems(vaultData);
        setIsMissingSetup(false);
      } catch (err: unknown) {
        console.error('Failed to load study vault items:', err);
        if (isMissingTableOrBucket(err)) {
          setIsMissingSetup(true);
          showToast(MISSING_VAULT_SETUP_MESSAGE, 'error');
        } else {
          const realReason = extractErrorMessage(err);
          showToast(`Could not load Study Vault: ${realReason}`, 'error');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadVault();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Notify parent of counts per domain (for Dashboard display-only count)
  useEffect(() => {
    if (!onVaultItemsCountChange) return;
    const counts: Record<VaultDomain, number> = {
      Programming: 0,
      'Analytical thinking': 0,
      Communication: 0,
      Design: 0,
      Other: 0,
    };
    for (const item of items) {
      counts[item.domain] = (counts[item.domain] || 0) + 1;
    }
    onVaultItemsCountChange(counts);
  }, [items, onVaultItemsCountChange]);

  // Sync items with parent app state for Dashboard metrics
  useEffect(() => {
    if (onVaultItemsChange) {
      onVaultItemsChange(items);
    }
  }, [items, onVaultItemsChange]);

  // Deadline metrics
  const deadlineCounts = useMemo(() => {
    return calculateDeadlineCounts(items);
  }, [items]);

  // Plan suggestions from readable rules
  const suggestions: VaultSuggestion[] = useMemo(() => {
    return generateVaultSuggestions(items, domainScores);
  }, [items, domainScores]);

  // Scored assignments for "My progress" chart
  const scoredAssignments = useMemo(() => {
    return items
      .filter((i) => {
        if (i.kind !== 'Assignment') return false;
        if (i.score === null || i.score === undefined || Number.isNaN(Number(i.score))) return false;
        if (chartDomainFilter !== 'All' && i.domain !== chartDomainFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.submitted_at || a.due_date || a.created_at;
        const dateB = b.submitted_at || b.due_date || b.created_at;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
  }, [items, chartDomainFilter]);

  // Domain score trends for the 4 core domains
  const coreDomains: VaultDomain[] = ['Programming', 'Analytical thinking', 'Communication', 'Design'];
  const domainTrends = useMemo(() => {
    return coreDomains.map((dom) => calculateDomainScoreTrend(items, dom));
  }, [items]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (kindFilter !== 'All' && item.kind !== kindFilter) return false;
        if (domainFilter !== 'All' && item.domain !== domainFilter) return false;
        if (statusFilter !== 'All' && item.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
          const matchesContent = (item.note_text || item.content || '').toLowerCase().includes(q);
          const matchesFile = (item.file_name || item.fileName || '').toLowerCase().includes(q);
          if (!matchesTitle && !matchesTags && !matchesContent && !matchesFile) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'dueDate') {
          const dueA = a.due_date || a.dueDate;
          const dueB = b.due_date || b.dueDate;
          if (!dueA) return 1;
          if (!dueB) return -1;
          return new Date(dueA).getTime() - new Date(dueB).getTime();
        }
        return 0;
      });
  }, [items, kindFilter, domainFilter, statusFilter, searchQuery, sortBy]);

  // Validate incoming files
  const validateAndFilterFiles = (fileList: File[]): File[] => {
    const valid: File[] = [];
    for (const f of fileList) {
      const result = validateVaultFile(f);
      if (!result.valid) {
        showToast(result.error || `File ${f.name} is not permitted.`, 'error');
      } else {
        valid.push(f);
      }
    }
    return valid;
  };

  /**
   * Internal function to execute an upload and insertion for a single queue item.
   */
  const processUploadQueueItem = async (qItem: UploadProgressItem, targetDomain: VaultDomain) => {
    setUploadQueue((prev) =>
      prev.map((it) => (it.id === qItem.id ? { ...it, status: 'uploading', progress: 20, error: undefined } : it))
    );

    try {
      // 1. Upload file with user_id from session and random uuid path and contentType
      const uploaded = await uploadVaultFile(qItem.file, (pct) => {
        setUploadQueue((prev) =>
          prev.map((it) => (it.id === qItem.id ? { ...it, progress: pct } : it))
        );
      });

      // 2. Only after successful upload, insert row into vault_items with ONLY the 12 columns
      const cleanTitle = qItem.file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      const isAssignmentCandidate =
        cleanTitle.toLowerCase().includes('assignment') ||
        cleanTitle.toLowerCase().includes('lab') ||
        cleanTitle.toLowerCase().includes('hw');

      const savedItem = await insertVaultItemRow({
        title: cleanTitle || 'Uploaded Document',
        kind: isAssignmentCandidate ? 'Assignment' : 'Note',
        domain: targetDomain,
        tags: ['attachment'],
        note_text: null,
        due_date: null,
        submitted_at: null,
        status: isAssignmentCandidate ? 'To do' : null,
        score: null,
        file_path: uploaded.filePath,
        file_name: uploaded.fileName,
        file_type: uploaded.fileType,
      });

      setItems((prev) => [savedItem, ...prev]);
      setUploadQueue((prev) =>
        prev.map((it) => (it.id === qItem.id ? { ...it, status: 'complete', progress: 100 } : it))
      );
      showToast(`Uploaded "${uploaded.fileName}" to Study Vault.`);

      // Auto-remove completed items after 3.5s
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((it) => it.id !== qItem.id));
      }, 3500);
    } catch (err: unknown) {
      console.error('File upload failure:', err);
      const realReason = extractErrorMessage(err);
      if (isMissingTableOrBucket(err)) {
        setIsMissingSetup(true);
      }
      setUploadQueue((prev) =>
        prev.map((it) => (it.id === qItem.id ? { ...it, status: 'error', error: realReason } : it))
      );
      showToast(realReason, 'error');
    }
  };

  /**
   * Retry uploading a failed item from the queue
   */
  const handleRetryUpload = (queueItem: UploadProgressItem) => {
    processUploadQueueItem(queueItem, queueItem.domain || 'Programming');
  };

  /**
   * Retry all failed items in the queue
   */
  const handleRetryAllFailed = () => {
    const failedItems = uploadQueue.filter((it) => it.status === 'error');
    for (const item of failedItems) {
      handleRetryUpload(item);
    }
  };

  /**
   * Dismiss a specific queue item
   */
  const handleDismissQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((it) => it.id !== id));
  };

  // Upload multiple files directly to Supabase Storage with individual progress bars
  const handleDirectUploadFiles = async (filesToUpload: File[], defaultDomain: VaultDomain = 'Programming') => {
    if (!currentUser) {
      showToast('Please sign in to upload files to your vault.', 'error');
      return;
    }
    if (!navigator.onLine) {
      showToast('You are currently offline. Check your internet connection.', 'error');
      return;
    }

    const validFiles = validateAndFilterFiles(filesToUpload);
    if (validFiles.length === 0) return;

    const newQueueItems: UploadProgressItem[] = validFiles.map((f) => ({
      id: `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file: f,
      fileName: f.name,
      progress: 0,
      status: 'uploading',
      domain: defaultDomain,
    }));

    setUploadQueue((prev) => [...prev, ...newQueueItems]);

    for (const qItem of newQueueItems) {
      await processUploadQueueItem(qItem, defaultDomain);
    }
  };

  // Reset new item form
  const resetForm = () => {
    setFormKind('Note');
    setFormTitle('');
    setFormDomain('Programming');
    setFormContent('');
    setFormTags('');
    setFormDueDate('');
    setFormSubmittedAt('');
    setFormStatus('To do');
    setFormScore('');
    setModalFiles([]);
    setModalError(null);
    if (modalFileInputRef.current) modalFileInputRef.current.value = '';
  };

  // Create new item from modal form
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please sign in to save vault items.', 'error');
      return;
    }
    if (!formTitle.trim()) {
      setModalError('Please provide a title for this item.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const parsedTags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const parsedScore =
        formScore.trim() !== '' && !Number.isNaN(Number(formScore))
          ? Math.min(100, Math.max(0, Number(formScore)))
          : null;

      let uploadedFilePath: string | null = null;
      let uploadedFileName: string | null = null;
      let uploadedFileType: string | null = null;

      // 4. If user selected a file in the modal form, upload to private bucket first
      if (modalFiles.length > 0) {
        const fileToUpload = modalFiles[0];
        const uploaded = await uploadVaultFile(fileToUpload);
        uploadedFilePath = uploaded.filePath;
        uploadedFileName = uploaded.fileName;
        uploadedFileType = uploaded.fileType;
      }

      // 4. Only after successful upload, insert a row with ONLY the 12 columns
      const saved = await insertVaultItemRow({
        title: formTitle.trim(),
        kind: formKind,
        domain: formDomain,
        tags: parsedTags,
        note_text: formContent.trim() || null,
        due_date: formKind === 'Assignment' && formDueDate ? formDueDate : null,
        submitted_at:
          formKind === 'Assignment'
            ? formSubmittedAt || (formStatus === 'Submitted' ? new Date().toISOString().split('T')[0] : null)
            : null,
        status: formKind === 'Assignment' ? formStatus : null,
        score: formKind === 'Assignment' ? parsedScore : null,
        file_path: uploadedFilePath,
        file_name: uploadedFileName,
        file_type: uploadedFileType,
      });

      setItems((prev) => [saved, ...prev]);

      // If user provided additional files in the modal, upload them as queued items
      if (modalFiles.length > 1) {
        handleDirectUploadFiles(modalFiles.slice(1), formDomain);
      }

      setIsNewModalOpen(false);
      resetForm();
      showToast(`Added "${saved.title}" to your Study Vault.`);
    } catch (err: unknown) {
      console.error('File upload failure:', err);
      const realReason = extractErrorMessage(err);
      if (isMissingTableOrBucket(err)) {
        setIsMissingSetup(true);
      }
      setModalError(realReason);
      showToast(realReason, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save changes to edited item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editingItem) return;
    if (!editingItem.title.trim()) {
      showToast('Title cannot be blank.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedScore =
        editingItem.score !== undefined && editingItem.score !== null && !Number.isNaN(Number(editingItem.score))
          ? Math.min(100, Math.max(0, Number(editingItem.score)))
          : null;

      const saved = await updateVaultItemRow(editingItem.id, {
        title: editingItem.title.trim(),
        kind: editingItem.kind,
        domain: editingItem.domain,
        tags: Array.isArray(editingItem.tags) ? editingItem.tags : [],
        note_text: editingItem.note_text ?? editingItem.content ?? null,
        due_date: editingItem.kind === 'Assignment' ? (editingItem.due_date || editingItem.dueDate || null) : null,
        submitted_at:
          editingItem.kind === 'Assignment'
            ? editingItem.submitted_at || (editingItem.status === 'Submitted' ? new Date().toISOString().split('T')[0] : null)
            : null,
        status: editingItem.kind === 'Assignment' ? editingItem.status || 'To do' : null,
        score: editingItem.kind === 'Assignment' ? parsedScore : null,
        file_path: editingItem.file_path,
        file_name: editingItem.file_name || editingItem.fileName,
        file_type: editingItem.file_type || editingItem.fileType,
      });

      setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      setEditingItem(null);
      showToast('Updated vault item successfully.');
    } catch (err: unknown) {
      console.error('Failed to update vault item:', err);
      const realReason = extractErrorMessage(err);
      showToast(`Could not save changes: ${realReason}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete item from Supabase and remove its private file from storage
  const handleDeleteItem = async (item: VaultItem) => {
    if (!currentUser) return;
    try {
      const result=await deleteVaultMetadataItem(item.id, item.file_path);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setDeletingItem(null);
      showToast(result.warning || `Deleted "${item.title}" and its private storage file.`,result.warning?'error':'success');
    } catch (err: unknown) {
      console.error('Failed to delete item:', err);
      const realReason = extractErrorMessage(err);
      showToast(`Delete failed: ${realReason}`, 'error');
    }
  };

  // Preview an item securely with a short-lived 60-second signed URL
  const handlePreview = async (item: VaultItem) => {
    setPreviewItem(item);
    setPreviewContent(null);
    setPreviewImageUrl(null);
    setPreviewPdfUrl(null);

    // If text note without file
    if (!item.file_path && (item.note_text || item.content)) {
      setPreviewContent(item.note_text || item.content || '');
      return;
    }

    if (item.file_path) {
      setIsPreviewLoading(true);
      try {
        const signedUrl = await getVaultFileSignedUrl(item.file_path, 60);
        const fileType = (item.file_type || item.fileType || '').toLowerCase();
        const fileName = (item.file_name || item.fileName || '').toLowerCase();

        // PDF
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
          setPreviewPdfUrl(signedUrl);
          setIsPreviewLoading(false);
          return;
        }

        // Image (PNG/JPG)
        if (
          fileType.startsWith('image/') ||
          fileName.endsWith('.png') ||
          fileName.endsWith('.jpg') ||
          fileName.endsWith('.jpeg')
        ) {
          setPreviewImageUrl(signedUrl);
          setIsPreviewLoading(false);
          return;
        }

        // Text or Markdown
        if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileType.includes('text')) {
          const resp = await fetch(signedUrl);
          const text = await resp.text();
          setPreviewContent(text);
          setIsPreviewLoading(false);
          return;
        }

        // Other safe allowed files
        handleDownload(item);
        setPreviewItem(null);
      } catch (err: unknown) {
        console.error('Failed to preview file:', err);
        const realReason = extractErrorMessage(err);
        showToast(`Could not load preview: ${realReason}`, 'error');
        setPreviewItem(null);
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  // Download file via short-lived signed URL
  const handleDownload = async (item: VaultItem) => {
    if (!item.file_path) return;
    try {
      const fileName = item.file_name || item.fileName || 'download';
      const signedUrl = await getVaultFileSignedUrl(item.file_path, 60, fileName);
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading "${fileName}"...`);
    } catch (err: unknown) {
      console.error('Failed to download file:', err);
      const realReason = extractErrorMessage(err);
      showToast(`Could not generate download link: ${realReason}`, 'error');
    }
  };

  // Guest Gate: If not signed in
  if (!currentUser) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200 py-6">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1b4e45]/10 dark:bg-[#d7f78c]/15 text-[#1b4e45] dark:text-[#d7f78c] flex items-center justify-center mx-auto shadow-sm">
            <VaultIcon className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#17333b] dark:text-white font-display">
            Student Study Vault
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Organize lecture notes, capstone project artifacts, and coursework assignments.
            Files are stored in your private Supabase storage bucket, protected with Row-Level Security.
          </p>
        </div>

        <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Sign In to Use the Vault
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Your coursework and files are private to your student account. Sign in with Google or your email to access your personal vault.
            </p>
          </div>
          <button
            onClick={() => onNavigate('login')}
            className="w-full min-h-[44px] px-6 py-3 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <UserIcon className="w-4 h-4" />
            <span>Sign In or Create Account</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const failedUploadCount = uploadQueue.filter((it) => it.status === 'error').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 max-w-md animate-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangleIcon className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="leading-snug break-words">{toastMessage.text}</span>
        </div>
      )}

      {/* 5. Warning banner when table or bucket is missing */}
      {isMissingSetup && (
        <div
          role="alert"
          className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3 shadow-md"
        >
          <AlertTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-rose-950 dark:text-rose-100">
              Vault storage is not set up yet. Run the vault SQL script in Supabase SQL Editor.
            </p>
            <p className="text-xs text-rose-800 dark:text-rose-300">
              The <code>vault_items</code> table or <code>vault</code> storage bucket does not exist yet in your Supabase project. Please execute your schema script to enable study vault storage.
            </p>
          </div>
        </div>
      )}

      {/* Main Vault Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] text-xs font-bold uppercase tracking-wider mb-2">
            <VaultIcon className="w-3.5 h-3.5" />
            Student Study Vault
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display">
            Coursework & Study Evidence
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Record study notes and upload PDF, image, and text evidence (max 10 MB per file). All records and files are stored privately in your Supabase account with Row Level Security.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleDirectUploadFiles(Array.from(e.target.files));
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            <UploadCloudIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c]" />
            <span>Choose file from laptop</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-md transition-all focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            <FileTextIcon className="w-4 h-4" />
            <span>Add Note / Assignment</span>
          </button>
        </div>
      </div>

      {/* 6. Upload Queue & Progress Area with Real Error Text and Retry Buttons */}
      {uploadQueue.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
            <span className="flex items-center gap-2">
              {uploadQueue.some((it) => it.status === 'uploading') ? (
                <>
                  <RefreshCwIcon className="w-3.5 h-3.5 animate-spin text-[#1b4e45] dark:text-[#d7f78c]" />
                  <span>Uploading {uploadQueue.filter((it) => it.status === 'uploading').length} file(s) to private vault...</span>
                </>
              ) : failedUploadCount > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  {failedUploadCount} upload{failedUploadCount > 1 ? 's' : ''} failed
                </span>
              ) : (
                <span className="text-emerald-600">All uploads finished</span>
              )}
            </span>

            {failedUploadCount > 1 && (
              <button
                type="button"
                onClick={handleRetryAllFailed}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCwIcon className="w-3 h-3" />
                <span>Retry All ({failedUploadCount})</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                  item.status === 'error'
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/80'
                    : item.status === 'complete'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs gap-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-sm">
                    {item.fileName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'error' ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wide">
                        Upload Failed
                      </span>
                    ) : item.status === 'complete' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs inline-flex items-center gap-1">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Complete
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {item.progress}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      item.status === 'error'
                        ? 'bg-rose-500'
                        : item.status === 'complete'
                        ? 'bg-emerald-500'
                        : 'bg-[#1b4e45] dark:bg-[#d7f78c]'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>

                {/* 1. Show the REAL reason in the red error text */}
                {item.status === 'error' && item.error && (
                  <div className="p-2.5 rounded-lg bg-rose-100/70 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 font-medium leading-relaxed break-words">
                    <p className="font-bold text-[11px] uppercase tracking-wider mb-0.5">Error details:</p>
                    <p>{item.error}</p>
                  </div>
                )}

                {/* 6. Retry button on failed files */}
                {item.status === 'error' && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDismissQueueItem(item.id)}
                      className="min-h-[36px] px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRetryUpload(item)}
                      className="min-h-[36px] px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <RefreshCwIcon className="w-3.5 h-3.5" />
                      <span>Retry Upload</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag and Drop Dropzone Strip */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleDirectUploadFiles(Array.from(e.dataTransfer.files));
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`p-4 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors ${
          isDraggingFile
            ? 'border-[#276459] bg-[#276459]/10 dark:border-[#d7f78c] dark:bg-[#d7f78c]/10'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white/60 dark:bg-[#14262b]/60'
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <UploadCloudIcon className="w-5 h-5 text-[#1b4e45] dark:text-[#d7f78c]" />
          <span>Drag and drop PDF, PNG, JPG, TXT, or MD files here to upload directly to private cloud storage</span>
          <span className="text-[10px] text-slate-400 font-normal">(max 10 MB per file)</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. "MY PROGRESS" SECTION                                 */}
      {/* ======================================================== */}
      <section className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
              <BarChartIcon className="w-4 h-4" />
              <span>Academic Performance Trajectory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display mt-0.5">
              My Progress
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Filter Domain:</span>
            <select
              value={chartDomainFilter}
              onChange={(e) => setChartDomainFilter(e.target.value as any)}
              className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#276459]"
            >
              <option value="All">All Domains</option>
              <option value="Programming">Programming</option>
              <option value="Analytical thinking">Analytical thinking</option>
              <option value="Communication">Communication</option>
              <option value="Design">Design</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Top 3 Metric Strips: Deadlines & On-Time Rates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                On-Time Submissions
              </span>
              <div className="text-2xl font-extrabold font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
                {deadlineCounts.onTime}
              </div>
            </div>
            <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Late Submissions
              </span>
              <div className="text-2xl font-extrabold font-mono text-amber-900 dark:text-amber-200 mt-0.5">
                {deadlineCounts.late}
              </div>
            </div>
            <ClockIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                Overdue Tasks
              </span>
              <div className="text-2xl font-extrabold font-mono text-rose-900 dark:text-rose-200 mt-0.5">
                {deadlineCounts.overdue}
              </div>
            </div>
            <AlertTriangleIcon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
        </div>

        {/* Line Chart of Assignment Scores Over Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Assignment Score History {chartDomainFilter !== 'All' ? `(${chartDomainFilter})` : ''}
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {scoredAssignments.length} scored submission{scoredAssignments.length === 1 ? '' : 's'}
            </span>
          </div>

          {scoredAssignments.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center space-y-1 text-slate-500">
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No data yet</p>
              <p className="text-xs text-slate-400">
                {chartDomainFilter === 'All'
                  ? 'Add assignments with scores (0-100) to render your score trajectory over time.'
                  : `No scored assignments recorded for ${chartDomainFilter} yet.`}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
              <svg viewBox="0 0 600 200" className="w-full min-w-[500px] h-48 overflow-visible">
                {[0, 25, 50, 75, 100].map((level) => {
                  const y = 170 - (level / 100) * 140;
                  return (
                    <g key={level}>
                      <line x1="40" y1={y} x2="580" y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
                      <text x="32" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                        {level}
                      </text>
                    </g>
                  );
                })}
                {(() => {
                  const n = scoredAssignments.length;
                  const pts = scoredAssignments.map((item, idx) => {
                    const x = n === 1 ? 310 : 60 + (idx / (n - 1)) * 500;
                    const y = 170 - (Math.max(0, Math.min(100, Number(item.score))) / 100) * 140;
                    return { x, y, item };
                  });
                  const linePath = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  return (
                    <g>
                      {n > 1 && (
                        <path d={linePath} fill="none" stroke="#276459" strokeWidth="2.5" className="dark:stroke-[#d7f78c] transition-all" />
                      )}
                      {pts.map((p) => (
                        <g key={p.item.id} className="group">
                          <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#17333b" strokeWidth="2" className="dark:fill-[#0e1c20] dark:stroke-[#d7f78c]" />
                          <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-800 dark:fill-slate-100">
                            {p.item.score}
                          </text>
                          <text x={p.x} y="190" textAnchor="middle" className="text-[9px] font-mono fill-slate-400 truncate">
                            {p.item.submitted_at || p.item.due_date || p.item.created_at.split('T')[0]}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          )}
        </div>

        {/* Per-Domain Trend Comparison Cards */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Domain Competency Trends (Latest 3 vs Previous 3)
            </h3>
            <span className="text-[11px] text-slate-400 font-normal">Requires at least 2 scored items</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {domainTrends.map((t) => {
              const isPositive = t.delta !== null && t.delta > 0;
              const isNegative = t.delta !== null && t.delta < 0;
              const isNoData = t.trendLabel === 'Not enough data yet';
              return (
                <div
                  key={t.domain}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {t.domain}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isNoData
                          ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : isPositive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : isNegative
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800'
                      }`}
                    >
                      {t.trendLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {t.scoredCount >= 2 ? (
                      <span>
                        Recent Avg: <strong className="text-slate-900 dark:text-white">{t.latestAvg}</strong> vs{' '}
                        <span>{t.previousAvg}</span>
                      </span>
                    ) : (
                      <span className="italic">{t.scoredCount === 1 ? '1 scored item logged' : '0 scored items'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. "PLAN SUGGESTIONS" CARD                              */}
      {/* ======================================================== */}
      <section className="p-6 sm:p-7 rounded-3xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] flex items-center justify-center">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white font-display">
                Study Plan Suggestions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Actionable advice generated from your vault deadlines, scores, and weakest domain baselines.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
            {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Transparency Guarantee:</strong> SkillPath AI does <em>not</em> read or parse your file contents. These recommendations depend solely on the assignment scores, due dates, and statuses you type in.
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {suggestions.map((sug) => (
            <div
              key={sug.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        sug.severity === 'urgent'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : sug.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : sug.severity === 'success'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {sug.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {sug.domain}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                    {sug.title}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {sug.description}
              </p>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                {sug.why}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. VAULT ITEM REPOSITORY & FILTER BAR                    */}
      {/* ======================================================== */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tag, or note..."
              className="w-full min-h-[40px] pl-9 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-1 overflow-x-auto text-xs py-1">
            {(['All', 'Note', 'Assignment'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                  kindFilter === k
                    ? 'bg-[#17333b] text-white dark:bg-[#d7f78c] dark:text-[#17333b]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {k === 'All' ? 'All Kinds' : k}
              </button>
            ))}
          </div>

          <div className="sm:col-span-4 flex items-center justify-end gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#276459]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="dueDate">Due Date</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">Domain:</span>
          {(['All', 'Programming', 'Analytical thinking', 'Communication', 'Design', 'Other'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                domainFilter === d
                  ? 'bg-[#1b4e45] text-white dark:bg-[#d7f78c] dark:text-[#17333b]'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {d}
            </button>
          ))}

          {kindFilter !== 'Note' && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">Status:</span>
              {(['All', 'To do', 'In progress', 'Submitted'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading or Item Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <RefreshCwIcon className="w-6 h-6 animate-spin text-[#1b4e45] dark:text-[#d7f78c]" />
          <p className="text-xs font-semibold">Loading Study Vault items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <VaultIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {items.length === 0 ? 'Your Study Vault is Empty' : 'No items match your filter'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {items.length === 0
                ? 'Store study notes, lab deliverables, or graded coursework. Vault evidence does not alter career weights.'
                : 'Try adjusting your search query, kind, or domain filters.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const hasFile = Boolean(item.file_path || item.file_name);
            const dueDateStr = item.due_date || item.dueDate;
            const isOverdue =
              item.kind === 'Assignment' &&
              item.status !== 'Submitted' &&
              dueDateStr &&
              dueDateStr.split('T')[0] < new Date().toISOString().split('T')[0];

            return (
              <div
                key={item.id}
                className={`rounded-2xl bg-white dark:bg-[#14262b] border p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4 ${
                  isOverdue
                    ? 'border-rose-400/80 dark:border-rose-800/80'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.kind === 'Assignment'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}
                      >
                        {item.kind}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.domain}
                      </span>
                      {item.status && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.status === 'Submitted'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : item.status === 'In progress'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : item.status}
                        </span>
                      )}
                    </div>
                    {item.score !== undefined && item.score !== null && (
                      <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        Score: {item.score}/100
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug break-words">
                    {item.title}
                  </h3>

                  {(item.note_text || item.content) && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {item.note_text || item.content}
                    </p>
                  )}

                  {item.kind === 'Assignment' && (
                    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      {dueDateStr && (
                        <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>Due: {new Date(dueDateStr).toLocaleDateString()}</span>
                        </div>
                      )}
                      {item.submitted_at && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                          <span>Submitted: {new Date(item.submitted_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {hasFile && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileTextIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                            {item.file_name || item.fileName || 'Attachment'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircleIcon className="w-3 h-3" />
                          Private Supabase Storage
                        </span>
                      </div>
                    </div>
                  )}

                  {item.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          <TagIcon className="w-2.5 h-2.5 opacity-60" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    {(item.note_text || item.content || hasFile) && (
                      <button
                        onClick={() => handlePreview(item)}
                        className="min-h-[44px] px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-1 transition-colors"
                        title="Secure 60s preview"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    )}
                    {hasFile && item.file_path && (
                      <button
                        onClick={() => handleDownload(item)}
                        className="min-h-[44px] px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-1 transition-colors"
                        title="Download file"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingItem({ ...item })}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit metadata"
                    >
                      <Edit3Icon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingItem(item)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete item"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW ITEM MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] flex items-center justify-center">
                  <VaultIcon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Add to Study Vault
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Show real error in red text */}
            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 font-medium leading-relaxed flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold uppercase tracking-wider text-[11px] mb-0.5">Error:</p>
                  <p className="break-words">{modalError}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleCreateItem(e as any)}
                  className="shrink-0 min-h-[32px] px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1"
                >
                  <RefreshCwIcon className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFormKind('Note')}
                  className={`py-2 rounded-lg transition-all min-h-[38px] ${
                    formKind === 'Note'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Study Note
                </button>
                <button
                  type="button"
                  onClick={() => setFormKind('Assignment')}
                  className={`py-2 rounded-lg transition-all min-h-[38px] ${
                    formKind === 'Assignment'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Assignment / Project
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Relational Normalization & SQL Queries"
                  required
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Domain
                  </label>
                  <select
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value as VaultDomain)}
                    className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
                  >
                    <option value="Programming">Programming</option>
                    <option value="Analytical thinking">Analytical thinking</option>
                    <option value="Communication">Communication</option>
                    <option value="Design">Design</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="sql, schema, lab2"
                    className="w-full min-h-[44px] px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
                  />
                </div>
              </div>

              {formKind === 'Assignment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full min-h-[40px] px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => {
                        const nextStatus = e.target.value as VaultStatus;
                        setFormStatus(nextStatus);
                        if (nextStatus === 'Submitted' && !formSubmittedAt) {
                          setFormSubmittedAt(new Date().toISOString().split('T')[0]);
                        }
                      }}
                      className="w-full min-h-[40px] px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="To do">To do</option>
                      <option value="In progress">In progress</option>
                      <option value="Submitted">Submitted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Submitted Date
                    </label>
                    <input
                      type="date"
                      value={formSubmittedAt}
                      onChange={(e) => setFormSubmittedAt(e.target.value)}
                      className="w-full min-h-[40px] px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Score (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formScore}
                      onChange={(e) => setFormScore(e.target.value)}
                      placeholder="Optional"
                      className="w-full min-h-[40px] px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Note Content / Summary
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Key concepts, lab takeaways, equations, or trade-off analysis..."
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Attach Files (PDF, PNG, JPG, TXT, MD • max 10 MB each)
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const valid = validateAndFilterFiles(Array.from(e.dataTransfer.files));
                      setModalFiles((prev) => [...prev, ...valid]);
                    }
                  }}
                  onClick={() => modalFileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-900/40"
                >
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const valid = validateAndFilterFiles(Array.from(e.target.files));
                        setModalFiles((prev) => [...prev, ...valid]);
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="space-y-1">
                    <UploadCloudIcon className="w-6 h-6 mx-auto text-[#1b4e45] dark:text-[#d7f78c]" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Drag and drop files here, or click to choose from laptop
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Files are encrypted and stored in private Supabase bucket "vault"
                    </p>
                  </div>
                </div>

                {modalFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {modalFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileTextIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModalFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save to Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Edit Vault Item
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  required
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Domain
                  </label>
                  <select
                    value={editingItem.domain}
                    onChange={(e) => setEditingItem({ ...editingItem, domain: e.target.value as VaultDomain })}
                    className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Programming">Programming</option>
                    <option value="Analytical thinking">Analytical thinking</option>
                    <option value="Communication">Communication</option>
                    <option value="Design">Design</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {editingItem.kind === 'Assignment' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={editingItem.status || 'To do'}
                      onChange={(e) => {
                        const newStatus = e.target.value as VaultStatus;
                        setEditingItem({
                          ...editingItem,
                          status: newStatus,
                          submitted_at:
                            newStatus === 'Submitted' && !editingItem.submitted_at
                              ? new Date().toISOString().split('T')[0]
                              : editingItem.submitted_at,
                        });
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="To do">To do</option>
                      <option value="In progress">In progress</option>
                      <option value="Submitted">Submitted</option>
                    </select>
                  </div>
                )}
              </div>

              {editingItem.kind === 'Assignment' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={editingItem.due_date || editingItem.dueDate || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, due_date: e.target.value, dueDate: e.target.value })}
                      className="w-full min-h-[40px] px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Submitted Date
                    </label>
                    <input
                      type="date"
                      value={editingItem.submitted_at || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, submitted_at: e.target.value })}
                      className="w-full min-h-[40px] px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Score (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingItem.score !== null && editingItem.score !== undefined ? editingItem.score : ''}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          score: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Optional"
                      className="w-full min-h-[40px] px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Note Content
                </label>
                <textarea
                  rows={4}
                  value={editingItem.note_text ?? editingItem.content ?? ''}
                  onChange={(e) => setEditingItem({ ...editingItem, note_text: e.target.value, content: e.target.value })}
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewItem && (previewContent !== null || previewImageUrl !== null || previewPdfUrl !== null || isPreviewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  {previewItem.title}
                </h3>
                {previewItem.file_name && (
                  <p className="text-xs text-slate-400 truncate">{previewItem.file_name}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setPreviewItem(null);
                  setPreviewContent(null);
                  setPreviewImageUrl(null);
                  setPreviewPdfUrl(null);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[60vh] rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200/80 dark:border-slate-800">
              {isPreviewLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCwIcon className="w-6 h-6 animate-spin text-[#1b4e45] dark:text-[#d7f78c]" />
                  <p className="text-xs">Generating 60-second secure signed URL...</p>
                </div>
              ) : previewPdfUrl ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <iframe
                    src={previewPdfUrl}
                    title={previewItem.title}
                    className="w-full h-[50vh] rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => previewItem && handleDownload(previewItem)}
                    className="text-xs text-[#1b4e45] dark:text-[#d7f78c] font-bold underline inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              ) : previewImageUrl ? (
                <div className="flex items-center justify-center">
                  <img
                    src={previewImageUrl}
                    alt={previewItem.title}
                    className="max-h-[50vh] object-contain rounded-lg shadow-sm"
                  />
                </div>
              ) : (
                <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed break-words font-sans">
                  {previewContent}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                {previewItem.file_path ? 'Signed URL valid for 60 seconds' : 'Study Note Preview'}
              </span>
              <button
                onClick={() => {
                  setPreviewItem(null);
                  setPreviewContent(null);
                  setPreviewImageUrl(null);
                  setPreviewPdfUrl(null);
                }}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-300"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Delete Vault Item?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                This will delete "{deletingItem.title}" from your database and remove any uploaded file from the private Supabase storage bucket.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteItem(deletingItem)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
