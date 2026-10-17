/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ============================================================================
 * SUPABASE SERVICE FOR SKILLPATH AI
 * ============================================================================
 * Connects our student app to Supabase for:
 * 1. User Authentication (Signup, Login, Logout, Forgot Password)
 * 2. Database Storage (Profiles, Answers, Career Choices, Quiz Attempts)
 *
 * Configured with live Supabase credentials.
 * ============================================================================
 */

import { createClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { DomainKey, DomainMetrics, AssessmentSnapshot } from '../utils/scoring.ts';
import type { QuizAttempt } from '../utils/quizBank.ts';

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : typeof process !== 'undefined' && process.env
    ? (process.env as Record<string, string | undefined>)
    : {};

export const SUPABASE_URL: string =
  env.VITE_SUPABASE_URL || 'https://yxyxpovlnbzyvhakfpoe.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY: string =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_e-xx9bhB50IZVfV17tsD2g__GEsWucX';

export const SUPABASE_ANON_KEY: string = SUPABASE_PUBLISHABLE_KEY;

/**
 * Checks whether Supabase has a valid URL and publishable key configured.
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    SUPABASE_URL !== 'PASTE_URL' &&
    (SUPABASE_URL.startsWith('http://') || SUPABASE_URL.startsWith('https://')) &&
    Boolean(SUPABASE_PUBLISHABLE_KEY) &&
    SUPABASE_PUBLISHABLE_KEY !== 'PASTE_KEY'
  );
}

// Initialize the Supabase Client with configured credentials
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// ---------------------------------------------------------------------------
// 2. USER TYPES & SESSION MAPPING
// ---------------------------------------------------------------------------

/**
 * Unified user interface representing the currently signed-in student.
 * Provides both `.uid` and `.id` for 100% compatibility with all UI views.
 */
export interface AppUser {
  uid: string;
  id: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

// Alias for backwards compatibility with existing UI components
export type FirebaseUser = AppUser;

/**
 * Converts a Supabase Auth User object into the application's AppUser format.
 */
export function mapSupabaseUser(user: SupabaseAuthUser | null): AppUser | null {
  if (!user) return null;
  return {
    uid: user.id,
    id: user.id,
    email: user.email ?? null,
    displayName:
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.user_metadata?.name ||
      (user.email ? user.email.split('@')[0] : 'Student'),
    photoURL: user.user_metadata?.avatar_url ?? null,
  };
}

// ---------------------------------------------------------------------------
// 3. PENDING SIGNUP NAME (Prevents race conditions during account creation)
// ---------------------------------------------------------------------------
let pendingSignupName: string | null = null;

export function getPendingSignupName(): string | null {
  return pendingSignupName;
}

export function setPendingSignupName(name: string | null): void {
  pendingSignupName = name;
}

export function clearPendingSignupName(): void {
  pendingSignupName = null;
}

// ---------------------------------------------------------------------------
// 4. USER CLOUD DATA STRUCTURE (Profiles & Quiz Attempts)
// ---------------------------------------------------------------------------
export interface UserCloudData {
  id: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  studentName: string;
  studentYear: string;
  studentFocus: string;
  studentStatement: string;
  domainMetrics: Record<DomainKey, DomainMetrics>;
  assessmentAnswers: Record<string, number>;
  selectedCareerId: string;
  planProgressByCareer: Record<string, Record<string, boolean>>;
  snapshots: AssessmentSnapshot[];
  quizAttempts?: QuizAttempt[];
  updatedAt: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// 5. AUTHENTICATION FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Sign up a new student using email and password.
 * Saves their display name in Supabase user metadata and seeds their initial profile.
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<AppUser> {
  const cleanEmail = email.trim();
  const cleanName = displayName.trim();
  setPendingSignupName(cleanName);

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured yet! Please open src/services/supabase.ts and paste your Project URL and Publishable Key.'
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: pass,
    options: {
      data: {
        full_name: cleanName,
        display_name: cleanName,
      },
    },
  });

  if (error) {
    clearPendingSignupName();
    console.error('Supabase sign up error:', error);
    throw error;
  }

  if (!data.user) {
    clearPendingSignupName();
    throw new Error('Sign up failed: no user account was returned.');
  }

  const mappedUser = mapSupabaseUser(data.user)!;

  // Immediately save initial profile in Supabase database
  try {
    await saveUserData(data.user.id, {
      studentName: cleanName,
      displayName: cleanName,
      email: cleanEmail,
    });
  } catch (dbErr) {
    console.warn('Initial profile seed notice (will retry on next sync):', dbErr);
  }

  return mappedUser;
}

/**
 * Log in an existing student with their email and password.
 */
export async function loginWithEmail(email: string, pass: string): Promise<AppUser> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured yet! Please open src/services/supabase.ts and paste your Project URL and Publishable Key.'
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });

  if (error) {
    console.error('Supabase sign in error:', error);
    throw error;
  }

  if (!data.user) {
    throw new Error('Sign in failed: no user account was returned.');
  }

  return mapSupabaseUser(data.user)!;
}

/**
 * Sign in with Google (OAuth)
 */
export async function loginWithGoogle(): Promise<AppUser> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured yet! Please open src/services/supabase.ts and paste your Project URL and Publishable Key.'
    );
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });

  if (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return mapSupabaseUser(user)!;
}

/**
 * Send a password reset email to the student's inbox.
 */
export async function resetPassword(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured yet! Please open src/services/supabase.ts and paste your Project URL and Publishable Key.'
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}#login` : undefined,
  });

  if (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}

/**
 * Log out the currently signed-in student.
 */
export async function logoutUser(): Promise<void> {
  clearPendingSignupName();
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Logout signOut error:', err);
    }
  }
}

export function onAuthStateChanged(
  callback: (user: AppUser | null) => void | Promise<void>
): () => void;
export function onAuthStateChanged(
  auth: unknown,
  callback: (user: AppUser | null) => void | Promise<void>
): () => void;
export function onAuthStateChanged(
  authOrCb: unknown,
  maybeCb?: (user: AppUser | null) => void | Promise<void>
): () => void {
  const callback = (typeof authOrCb === 'function' ? authOrCb : maybeCb) as (
    user: AppUser | null
  ) => void;

  if (!callback) return () => {};

  if (!isSupabaseConfigured()) {
    callback(null);
    return () => {};
  }

  // 1. Immediately emit current cached session user
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(mapSupabaseUser(session?.user ?? null));
  }).catch((err) => {
    console.warn('getSession error:', err);
    callback(null);
  });

  // 2. Listen to subsequent auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapSupabaseUser(session?.user ?? null));
  });

  return () => {
    subscription.unsubscribe();
  };
}

// ---------------------------------------------------------------------------
// 6. DATABASE SYNC: PROFILES & QUIZ ATTEMPTS
// ---------------------------------------------------------------------------

/**
 * Fetches the user profile and quiz attempts from Supabase tables:
 * - "profiles" (keyed by id = uid)
 * - "quiz_attempts" (keyed by user_id = uid)
 */
export async function fetchUserData(uid: string): Promise<UserCloudData | null> {
  if (!isSupabaseConfigured() || !uid) {
    return null;
  }

  try {
    // 1. Fetch profile row from public.profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (profileError) {
      console.error('Supabase profile query error:', profileError);
      throw profileError;
    }

    if (!profile) {
      return null;
    }

    // 2. Fetch all quiz attempts from public.quiz_attempts
    let quizAttempts: QuizAttempt[] = [];
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', uid)
      .order('timestamp', { ascending: true });

    if (attemptsError) {
      console.warn('Supabase quiz attempts query warning:', attemptsError);
    } else if (attempts && attempts.length > 0) {
      quizAttempts = attempts.map((row) => ({
        id: row.id,
        timestamp: Number(row.timestamp),
        dateLabel: row.date_label || '',
        mode: (row.mode as 'quick' | 'full') || 'quick',
        totalQuestions: Number(row.total_questions) || 0,
        correctQuestions: Number(row.correct_questions) || 0,
        timeTakenSeconds: Number(row.time_taken_seconds) || 0,
        overallScore: Number(row.overall_score) || 0,
        domainScores: row.domain_scores || {},
        domainBreakdowns: row.domain_breakdowns || {},
        strongestDomain: row.strongest_domain || 'programming',
      }));
    }

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      studentName: profile.student_name || profile.display_name || '',
      studentYear: profile.student_year || 'Year 1 Undergraduate',
      studentFocus: profile.student_focus || '',
      studentStatement: profile.student_statement || '',
      domainMetrics: profile.domain_metrics || {},
      assessmentAnswers: profile.assessment_answers || {},
      selectedCareerId: profile.selected_career_id || 'frontend-developer',
      planProgressByCareer: profile.plan_progress || {},
      snapshots: profile.snapshots || [],
      quizAttempts,
      updatedAt: profile.updated_at || new Date().toISOString(),
      createdAt: profile.created_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error('fetchUserData failed:', error);
    throw error;
  }
}

/**
 * Saves or updates student profile and quiz attempts in Supabase tables.
 * Uses atomic upsert so creating new or updating existing data works seamlessly.
 */
export async function saveUserData(uid: string, data: Partial<UserCloudData>): Promise<void> {
  if (!isSupabaseConfigured() || !uid) {
    return;
  }

  try {
    // 1. Build profile upsert payload
    const profileRow: Record<string, unknown> = {
      id: uid,
      updated_at: new Date().toISOString(),
    };

    if (data.email !== undefined) profileRow.email = data.email;
    if (data.displayName !== undefined) profileRow.display_name = data.displayName;
    if (data.studentName !== undefined) profileRow.student_name = data.studentName;
    if (data.studentYear !== undefined) profileRow.student_year = data.studentYear;
    if (data.studentFocus !== undefined) profileRow.student_focus = data.studentFocus;
    if (data.studentStatement !== undefined) profileRow.student_statement = data.studentStatement;
    if (data.domainMetrics !== undefined) profileRow.domain_metrics = data.domainMetrics;
    if (data.assessmentAnswers !== undefined) profileRow.assessment_answers = data.assessmentAnswers;
    if (data.selectedCareerId !== undefined) profileRow.selected_career_id = data.selectedCareerId;
    if (data.planProgressByCareer !== undefined) profileRow.plan_progress = data.planProgressByCareer;
    if (data.snapshots !== undefined) profileRow.snapshots = data.snapshots;

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileRow, { onConflict: 'id' });

    if (profileError) {
      console.error('Failed to upsert student profile into Supabase:', profileError);
      throw profileError;
    }

    // 2. If quizAttempts are passed, upsert them into public.quiz_attempts
    if (data.quizAttempts && Array.isArray(data.quizAttempts)) {
      for (const attempt of data.quizAttempts) {
        const attemptRow = {
          id: attempt.id,
          user_id: uid,
          timestamp: attempt.timestamp,
          date_label: attempt.dateLabel,
          mode: attempt.mode,
          total_questions: attempt.totalQuestions,
          correct_questions: attempt.correctQuestions,
          time_taken_seconds: attempt.timeTakenSeconds,
          overall_score: attempt.overallScore,
          domain_scores: attempt.domainScores,
          domain_breakdowns: attempt.domainBreakdowns,
          strongest_domain: attempt.strongestDomain,
        };
        const { error: attemptError } = await supabase
          .from('quiz_attempts')
          .upsert(attemptRow, { onConflict: 'id' });

        if (attemptError) {
          console.warn('Failed to upsert quiz attempt into Supabase:', attemptError);
        }
      }
    }
  } catch (error) {
    console.error('saveUserData failed:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 7. STUDY VAULT COMPATIBILITY (Metadata API)
// ---------------------------------------------------------------------------
// 7. STUDY VAULT SUPABASE API (table: vault_items, storage: vault)
// ---------------------------------------------------------------------------
export type VaultKind = 'Note' | 'Assignment';
export type VaultDomain = 'Programming' | 'Analytical thinking' | 'Communication' | 'Design' | 'Other';
export type VaultStatus = 'To do' | 'In progress' | 'Submitted';

export interface VaultItem {
  id: string;
  user_id: string;
  title: string;
  kind: VaultKind;
  domain: VaultDomain;
  tags: string[];
  note_text?: string | null;
  // Aliased for UI convenience:
  content?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  submitted_at?: string | null;
  status?: VaultStatus;
  score?: number | null;
  file_path?: string | null;
  file_name?: string | null;
  fileName?: string | null;
  file_type?: string | null;
  fileType?: string | null;
  file_size?: number | null;
  fileSize?: number | null;
  created_at: string;
  createdAt?: string;
  updatedAt?: string;
}

// Backward compatibility alias for existing components
export type VaultItemMetadata = VaultItem;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.md'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/pjpeg',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
];

/**
 * Validates a vault file by size, extension, and MIME type.
 * Explicitly rejects HTML, SVG, and script files.
 */
export function validateVaultFile(file: File | { name: string; size: number; type: string }): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`,
    };
  }

  const nameLower = file.name.toLowerCase();

  // Strict security prohibition: Never allow HTML or SVG
  if (
    nameLower.endsWith('.html') ||
    nameLower.endsWith('.htm') ||
    nameLower.endsWith('.svg') ||
    file.type === 'text/html' ||
    file.type === 'image/svg+xml'
  ) {
    return {
      valid: false,
      error: 'HTML and SVG files are not permitted for security reasons.',
    };
  }

  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
  if (!hasAllowedExt) {
    return {
      valid: false,
      error: 'Unsupported file type. Only PDF, PNG, JPG, TXT, and MD files are allowed.',
    };
  }

  // Validate MIME type if provided
  if (file.type) {
    const mimeLower = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeLower)) {
      return {
        valid: false,
        error: `Unsupported file type (${file.type}). Only PDF, PNG, JPG, TXT, and MD files are allowed.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Uploads a file to the private Supabase Storage bucket "vault"
 * Path format: <user_id>/<random-id>-<safe-filename>
 * Supports real-time progress reporting per upload.
 */
export async function uploadVaultFile(
  userId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ filePath: string; fileName: string; fileType: string; fileSize: number }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  if (!navigator.onLine) {
    throw new Error('You are currently offline. Check your network connection.');
  }

  const validation = validateVaultFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file.');
  }

  const cleanSafeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const randomPrefix = Math.random().toString(36).substring(2, 10);
  const filePath = `${userId}/${randomPrefix}-${cleanSafeName}`;

  // Check for active session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_PUBLISHABLE_KEY;

  // Use XMLHttpRequest for real progress bar feedback when available
  if (typeof XMLHttpRequest !== 'undefined' && onProgress) {
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/vault/${filePath}`;
        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('apikey', SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('x-upsert', 'false');

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && onProgress) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            onProgress(Math.min(100, Math.max(0, pct)));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress(100);
            resolve();
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.message || res.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during file upload. Check connection.'));
        xhr.send(file);
      });

      return {
        filePath,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      };
    } catch (xhrErr) {
      console.warn('XHR upload fallback to standard storage upload:', xhrErr);
    }
  }

  // Standard fallback using Supabase SDK
  const { error: uploadError } = await supabase.storage
    .from('vault')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Supabase storage upload error:', uploadError);
    throw uploadError;
  }

  if (onProgress) onProgress(100);

  return {
    filePath,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
  };
}

/**
 * Creates a short-lived signed URL (default: 60 seconds) to open or download
 * private files securely from the "vault" bucket.
 */
export async function getVaultFileSignedUrl(
  filePath: string,
  expiresIn = 60,
  downloadName?: string
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const options: { download?: string | boolean } = {};
  if (downloadName) {
    options.download = downloadName;
  }

  const { data, error } = await supabase.storage
    .from('vault')
    .createSignedUrl(filePath, expiresIn, options);

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL for vault file:', error);
    throw error || new Error('Could not generate secure file URL.');
  }

  return data.signedUrl;
}

/**
 * Deletes a file from the private Storage bucket "vault".
 */
export async function deleteVaultStorageFile(filePath: string): Promise<void> {
  if (!isSupabaseConfigured() || !filePath) return;
  try {
    const { error } = await supabase.storage.from('vault').remove([filePath]);
    if (error) {
      console.warn('Could not remove file from storage bucket:', error);
    }
  } catch (err) {
    console.warn('deleteVaultStorageFile error:', err);
  }
}

/**
 * Fetches all vault items for a user from the Supabase table "vault_items".
 */
export async function fetchVaultMetadataList(uid: string): Promise<VaultItem[]> {
  if (!isSupabaseConfigured() || !uid) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchVaultMetadataList error:', error);
      throw error;
    }

    if (!data) return [];

    return data.map((d) => ({
      id: d.id,
      user_id: d.user_id,
      title: d.title,
      kind: d.kind,
      domain: d.domain,
      tags: Array.isArray(d.tags) ? d.tags : [],
      note_text: d.note_text,
      content: d.note_text,
      due_date: d.due_date,
      dueDate: d.due_date,
      submitted_at: d.submitted_at,
      status: d.status || 'To do',
      score: d.score !== null && d.score !== undefined ? Number(d.score) : null,
      file_path: d.file_path,
      file_name: d.file_name,
      fileName: d.file_name,
      file_type: d.file_type,
      fileType: d.file_type,
      file_size: d.file_size,
      fileSize: d.file_size,
      created_at: d.created_at || new Date().toISOString(),
      createdAt: d.created_at || new Date().toISOString(),
      updatedAt: d.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Failed to load vault items from Supabase:', err);
    throw err;
  }
}

/**
 * Saves or updates a vault item in the Supabase table "vault_items".
 */
export async function saveVaultMetadataItem(
  uid: string,
  item: Partial<VaultItem> & { id: string; title: string; kind: VaultKind; domain: VaultDomain }
): Promise<VaultItem> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const payload: Record<string, unknown> = {
    id: item.id,
    user_id: uid,
    title: item.title.trim(),
    kind: item.kind,
    domain: item.domain,
    tags: Array.isArray(item.tags) ? item.tags : [],
    note_text: item.note_text ?? item.content ?? null,
    due_date: item.due_date ?? item.dueDate ?? null,
    submitted_at: item.submitted_at ?? null,
    status: item.status ?? (item.kind === 'Assignment' ? 'To do' : null),
    score: item.score !== undefined && item.score !== null && !Number.isNaN(Number(item.score))
      ? Math.min(100, Math.max(0, Number(item.score)))
      : null,
    file_path: item.file_path ?? null,
    file_name: item.file_name ?? item.fileName ?? null,
    file_type: item.file_type ?? item.fileType ?? null,
  };

  const { data, error } = await supabase
    .from('vault_items')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('saveVaultMetadataItem error:', error);
    throw error;
  }

  const saved = data || payload;
  return {
    id: String(saved.id),
    user_id: uid,
    title: String(saved.title),
    kind: saved.kind as VaultKind,
    domain: saved.domain as VaultDomain,
    tags: Array.isArray(saved.tags) ? saved.tags : [],
    note_text: saved.note_text as string | null,
    content: saved.note_text as string | null,
    due_date: saved.due_date as string | null,
    dueDate: saved.due_date as string | null,
    submitted_at: saved.submitted_at as string | null,
    status: (saved.status as VaultStatus) || 'To do',
    score: saved.score !== null && saved.score !== undefined ? Number(saved.score) : null,
    file_path: saved.file_path as string | null,
    file_name: saved.file_name as string | null,
    fileName: saved.file_name as string | null,
    file_type: saved.file_type as string | null,
    fileType: saved.file_type as string | null,
    created_at: (saved.created_at as string) || new Date().toISOString(),
    createdAt: (saved.created_at as string) || new Date().toISOString(),
  };
}

/**
 * Deletes a vault item from the "vault_items" table and deletes its associated
 * file from the private "vault" Storage bucket.
 */
export async function deleteVaultMetadataItem(
  uid: string,
  itemId: string,
  filePath?: string | null
): Promise<void> {
  if (!isSupabaseConfigured() || !itemId) return;

  // 1. Delete associated storage file if path provided
  if (filePath) {
    await deleteVaultStorageFile(filePath);
  }

  // 2. Delete row from vault_items
  const { error } = await supabase
    .from('vault_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', uid);

  if (error) {
    console.error('deleteVaultMetadataItem error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 8. FEEDBACK & CALIBRATION SUBMISSION
// ---------------------------------------------------------------------------
export interface FeedbackSubmission {
  id?: string;
  clarityRating: number;
  selfMatchRating: number;
  expectedCareer: string;
  timeToFinishAssessment: number | null;
  timeToFinishQuiz: number | null;
  deviceType: 'mobile' | 'desktop';
  timestamp: string;
}

export async function submitFeedback(feedback: FeedbackSubmission): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('feedback').insert({
        clarity_rating: feedback.clarityRating,
        self_match_rating: feedback.selfMatchRating,
        expected_career: feedback.expectedCareer,
        time_to_finish_assessment: feedback.timeToFinishAssessment,
        time_to_finish_quiz: feedback.timeToFinishQuiz,
        device_type: feedback.deviceType,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Feedback submission to Supabase notice:', err);
    }
  }
}

// Backwards-compatibility alias
export const submitFeedbackToFirestore = submitFeedback;
