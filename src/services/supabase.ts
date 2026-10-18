/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ============================================================================
 * SUPABASE SERVICE FOR SKILLPATH AI
 * ============================================================================
 * Connects our student app to Supabase for:
 * 1. User Authentication (Signup, Login, Logout, Forgot Password)
 * 2. Database Storage (Profiles, Answers, Career Choices, Quiz Attempts)
 * 3. Study Vault Storage & Metadata:
 *    - Bucket: "vault"
 *    - Table: "vault_items"
 * ============================================================================
 */

import publicConfig from '../config/supabase.public.json';
import { consumeAuthAttempt, resetAuthAttempts } from '../utils/authGuard.ts';
import { createClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';
import { type DomainKey, type DomainMetrics, type AssessmentSnapshot, sanitizeDomainMetrics } from '../utils/scoring.ts';
import type { QuizAttempt } from '../utils/quizBank.ts';

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : typeof process !== 'undefined' && process.env
    ? (process.env as Record<string, string | undefined>)
    : {};

export const SUPABASE_URL: string =
  env.VITE_SUPABASE_URL || publicConfig.url;

export const SUPABASE_PUBLISHABLE_KEY: string =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  publicConfig.publishableKey;

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
    SUPABASE_PUBLISHABLE_KEY !== 'PASTE_KEY' &&
    !SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_')
  );
}

// Initialize the Supabase Client with configured credentials
export const supabase = createClient(SUPABASE_URL || 'http://127.0.0.1:9', SUPABASE_PUBLISHABLE_KEY || 'unconfigured', {
  auth: {
    persistSession: isSupabaseConfigured(),
    autoRefreshToken: isSupabaseConfigured(),
    detectSessionInUrl: isSupabaseConfigured(),

  },
});

// ---------------------------------------------------------------------------
// 2. USER TYPES & SESSION MAPPING
// ---------------------------------------------------------------------------

export interface AppUser {
  uid: string;
  id: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export type FirebaseUser = AppUser;

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
// 3. PENDING SIGNUP NAME
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

export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string,
  captchaToken?: string
): Promise<AppUser | null> {
  const cleanEmail = email.trim();
  const cleanName = displayName.trim();

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Account services are not configured. Use guest mode, or configure the Supabase environment variables.'
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !cleanName || pass.length < 8) throw new Error('Use a valid email, name, and a password of at least 8 characters.');
  consumeAuthAttempt();
  setPendingSignupName(cleanName);
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: pass,
    options: {
      captchaToken,
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

  if (!data.session) { clearPendingSignupName(); return null; }
  const mappedUser = mapSupabaseUser(data.user)!;


  return mappedUser;
}

export async function loginWithEmail(email: string, pass: string, captchaToken?: string): Promise<AppUser> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Account services are not configured. Use guest mode, or configure the Supabase environment variables.'
    );
  }

  consumeAuthAttempt();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
    options: {captchaToken},
  });

  if (error) {
    console.error('Supabase sign in error:', error);
    throw error;
  }

  if (!data.user) {
    throw new Error('Sign in failed: no user account was returned.');
  }

  resetAuthAttempts();
  return mapSupabaseUser(data.user)!;
}

export async function loginWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Account services are not configured. Use guest mode, or configure the Supabase environment variables.'
    );
  }

  consumeAuthAttempt();
  const settingsResponse = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});
  if (!settingsResponse.ok) throw new Error('Could not check Google sign-in. Please retry.');
  const settings = await settingsResponse.json();
  if (!settings.external?.google) throw new Error('Google sign-in is not enabled for this site yet. Use email sign-in or ask the site owner to enable Google in Supabase.');
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

  // OAuth completes through the auth listener after the redirect.
  return;
}

export async function resetPassword(email: string, captchaToken?: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Account services are not configured. Use guest mode, or configure the Supabase environment variables.'
    );
  }

  consumeAuthAttempt();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    captchaToken,
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/?recovery=1` : undefined,
  });

  if (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  clearPendingSignupName();
  if (isSupabaseConfigured()) {const {error}=await supabase.auth.signOut();if(error) throw error;}
}

export async function requireOwner(expectedUid?: string): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error('Account services are not configured.');
  const {data,error}=await supabase.auth.getUser();
  if(error || !data.user) throw new Error('Your session expired. Please sign in again.');
  if(expectedUid && expectedUid!==data.user.id) throw new Error('This data belongs to a different account.');
  return data.user.id;
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

  let active=true;
  let lastUid: string | null | undefined;
  const deliver=(user: SupabaseAuthUser | null)=>{
    const uid=user?.id || null;
    if (!active || uid===lastUid) return;
    lastUid=uid;
    setTimeout(()=>{if(active) Promise.resolve(callback(mapSupabaseUser(user))).catch(error=>console.error('Auth callback failed:',error));},0);
  };
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY' && typeof window!=='undefined') window.dispatchEvent(new Event('skillpath-password-recovery'));
    deliver(session?.user || null);
  });
  return ()=>{active=false;subscription.unsubscribe();};
}

// ---------------------------------------------------------------------------
// 6. DATABASE SYNC: PROFILES & QUIZ ATTEMPTS
// ---------------------------------------------------------------------------

export async function fetchUserData(uid: string): Promise<UserCloudData | null> {
  if (!isSupabaseConfigured() || !uid) {
    return null;
  }

  await requireOwner(uid);
  try {
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

    let quizAttempts: QuizAttempt[] = [];
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', uid)
      .order('timestamp', { ascending: true });

    if (attemptsError) {
      throw attemptsError;
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
      domainMetrics: sanitizeDomainMetrics(profile.domain_metrics),
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

async function writeUserData(uid: string, data: Partial<UserCloudData>): Promise<void> {
  if (!isSupabaseConfigured() || !uid) {
    throw new Error('Account services are not configured.');
  }
  await requireOwner(uid);

  try {
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
          throw attemptError;
        }
      }
    }
  } catch (error) {
    console.error('saveUserData failed:', error);
    throw error;
  }
}

const saveQueues=new Map<string,Promise<void>>();
function enqueueSave(uid:string,work:()=>Promise<void>):Promise<void> {
  const next=(saveQueues.get(uid) || Promise.resolve()).catch(()=>{}).then(work);
  saveQueues.set(uid,next);
  void next.finally(()=>{if(saveQueues.get(uid)===next)saveQueues.delete(uid);}).catch(()=>{});
  return next;
}
export function saveUserData(uid:string,data:Partial<UserCloudData>):Promise<void> {
  return enqueueSave(uid,()=>writeUserData(uid,data));
}
export function clearUserQuizAttempts(uid:string):Promise<void> {
  return enqueueSave(uid,async()=>{await requireOwner(uid);const {error}=await supabase.from('quiz_attempts').delete().eq('user_id',uid);if(error)throw error;});
}

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
  content?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  submitted_at?: string | null;
  status?: VaultStatus | null;
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

export const MISSING_VAULT_SETUP_MESSAGE =
  'Vault storage is not set up yet. Run the vault SQL script in Supabase SQL Editor.';

/**
 * Checks whether an error indicates that the "vault_items" table or "vault" storage bucket is missing.
 */
export function isMissingTableOrBucket(err: unknown): boolean {
  if (!err) return false;

  let raw = '';
  if (err instanceof Error) {
    raw = err.message;
  } else if (typeof err === 'string') {
    raw = err;
  } else if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    raw = [
      o.message,
      o.error,
      o.error_description,
      o.details,
      o.hint,
      o.code,
      o.statusCode,
      o.statusText,
    ].filter(Boolean).join(' ');
  } else {
    raw = String(err);
  }

  const lower = raw.toLowerCase();

  const isTableMissing =
    lower.includes('vault_items') &&
    (lower.includes('does not exist') ||
      lower.includes('not found') ||
      lower.includes('could not find') ||
      lower.includes('undefined table'));

  const hasTableErrorCode =
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    ((err as any).code === '42P01' ||
      (err as any).code === 'PGRST204' ||
      (err as any).code === 'PGRST205');

  const isBucketMissing =
    lower.includes('bucket not found') ||
    lower.includes('bucket_not_found') ||
    (lower.includes('vault') && lower.includes('bucket') && (lower.includes('not found') || lower.includes('does not exist'))) ||
    (lower.includes('bucket') && (lower.includes('does not exist') || lower.includes('not found')));

  const isStorage404 =
    typeof err === 'object' &&
    err !== null &&
    (('statusCode' in err && ((err as any).statusCode === 404 || (err as any).statusCode === '404')) ||
      ('status' in err && ((err as any).status === 404 || (err as any).status === '404'))) &&
    (lower.includes('bucket') || lower.includes('vault') || lower.includes('not found'));

  return Boolean(isTableMissing || hasTableErrorCode || isBucketMissing || isStorage404);
}

/**
 * Extracts the real error message string, never hiding errors with generic text.
 * If the table or bucket is missing, returns the exact prompt requirement message.
 */
export function extractErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error occurred.';

  if (isMissingTableOrBucket(err)) {
    return MISSING_VAULT_SETUP_MESSAGE;
  }

  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  if (err instanceof Error && err.message && err.message.trim()) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) {
      return o.message;
    }
    if (typeof o.error_description === 'string' && o.error_description.trim()) {
      return o.error_description;
    }
    if (typeof o.error === 'string' && o.error.trim()) {
      return o.error;
    }
    if (typeof o.details === 'string' && o.details.trim()) {
      return o.details;
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch {
      // fallback
    }
  }

  return String(err);
}

/**
 * Extracts lowercase file extension (without dot).
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Upload with contentType from file.type, or from the extension if file.type is empty.
 */
export function resolveContentType(file: { name: string; type?: string }): string {
  if (file.type && file.type.trim() !== '') {
    return file.type;
  }
  const ext = getFileExtension(file.name);
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    gif: 'image/gif',
    webp: 'image/webp',
    html: 'text/html',
    htm: 'text/html',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Builds the Storage path as <user_id>/<random-uuid>.<lowercase extension> only.
 * Never puts the original file name in the path (handles spaces, brackets, dots).
 */
export function buildStoragePath(userId: string, originalFileName: string): { filePath: string; extension: string } {
  if (!/^[a-zA-Z0-9-]+$/.test(userId)) throw new Error('Invalid user ID in storage path.');
  const ext = getFileExtension(originalFileName);
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  const fileNameInStorage = ext ? `${uuid}.${ext}` : uuid;
  const filePath = `${userId}/${fileNameInStorage}`;
  return { filePath, extension: ext };
}

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

  if (!Number.isFinite(file.size) || file.size <= 0) return {valid:false,error:'File is empty or has an invalid size.'};
  const nameLower = file.name.toLowerCase();

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

  if (file.type) {
    const mimeLower = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeLower)) {
      return {
        valid: false,
        error: `Unsupported file type (${file.type}). Only PDF, PNG, JPG, TXT, and MD files are allowed.`,
      };
    }
  }

  const expected:Record<string,string[]>= {pdf:['application/pdf'],png:['image/png'],jpg:['image/jpeg','image/pjpeg'],jpeg:['image/jpeg','image/pjpeg'],txt:['text/plain'],md:['text/plain','text/markdown','text/x-markdown']};
  if(file.type && !expected[getFileExtension(file.name)]?.includes(file.type.toLowerCase())) return {valid:false,error:'File extension and content type do not match.'};
  return { valid: true };
}

/**
 * Uploads a file to the private Supabase Storage bucket "vault".
 * - User ID comes from the logged-in Supabase session (supabase.auth.getUser).
 * - Path format is: <user_id>/<random-uuid>.<lowercase extension> only.
 * - Uploads with contentType from file.type, or from extension if file.type is empty.
 */
export async function uploadVaultFile(
  fileOrUserId: File | string,
  fileOrProgress?: File | ((percent: number) => void),
  maybeProgress?: (percent: number) => void
): Promise<{ filePath: string; fileName: string; fileType: string; fileSize: number }> {
  let file: File;
  let onProgress: ((percent: number) => void) | undefined;

  if (typeof fileOrUserId === 'string' && fileOrProgress && typeof fileOrProgress !== 'function') {
    file = fileOrProgress;
    onProgress = maybeProgress;
  } else if (fileOrUserId instanceof File) {
    file = fileOrUserId;
    if (typeof fileOrProgress === 'function') {
      onProgress = fileOrProgress;
    }
  } else {
    throw new Error('Invalid file provided for upload.');
  }

  if (!isSupabaseConfigured()) {
    const err = new Error('Supabase is not configured.');
    console.error('Upload aborted:', err);
    throw err;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const err = new Error('You are currently offline. Check your network connection.');
    console.error('Upload aborted:', err);
    throw err;
  }

  const validation = validateVaultFile(file);
  if (!validation.valid) {
    const err = new Error(validation.error || 'Invalid file.');
    console.error('File validation failed:', err);
    throw err;
  }

  // 3. User ID must come from logged-in Supabase session (supabase.auth.getUser)
  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError || !authData?.user) {
    console.error('supabase.auth.getUser failed:', userError);
    throw userError || new Error('You must be signed in to upload files to your Study Vault.');
  }
  const userId = authData.user.id;

  // 2. Build Storage path as <user_id>/<random-uuid>.<lowercase extension> only
  const { filePath } = buildStoragePath(userId, file.name);

  // 4. Upload with contentType from file.type, or from the extension if file.type is empty
  const contentType = resolveContentType(file);

  if (onProgress) onProgress(30);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('vault')
    .upload(filePath, file, {
      contentType,
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
    fileType: contentType,
    fileSize: file.size,
  };
}

/**
 * 4. Inserts a row into vault_items with ONLY these 12 columns:
 * title, kind, domain, tags, note_text, due_date, submitted_at, status, score, file_path, file_name, file_type
 * If the insert fails, deletes the uploaded file again.
 */
export async function insertVaultItemRow(row: {
  title: string;
  kind: VaultKind;
  domain: VaultDomain;
  tags: string[];
  note_text?: string | null;
  due_date?: string | null;
  submitted_at?: string | null;
  status?: VaultStatus | null;
  score?: number | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}): Promise<VaultItem> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const owner=await requireOwner();
  if (!row.title?.trim()) throw new Error('A title is required.');
  if(row.file_path && (!row.file_path.startsWith(`${owner}/`) || row.file_path.includes('..'))) throw new Error('Invalid file owner.');
  const payload: Record<string, unknown> = {
    user_id: owner,
    title: row.title.trim(),
    kind: row.kind,
    domain: row.domain,
    tags: Array.isArray(row.tags) ? row.tags : [],
    note_text: row.note_text ?? null,
    due_date: row.due_date ?? null,
    submitted_at: row.submitted_at ?? null,
    status: row.status ?? null,
    score:
      row.score !== null && row.score !== undefined && !Number.isNaN(Number(row.score))
        ? Math.min(100, Math.max(0, Number(row.score)))
        : null,
    file_path: row.file_path ?? null,
    file_name: row.file_name ?? null,
    file_type: row.file_type ?? null,
  };

  const { data, error: insertError } = await supabase
    .from('vault_items')
    .insert([payload])
    .select()
    .single();

  if (insertError) {
    console.error('Supabase vault_items insert error:', insertError);
    // If the insert fails, delete the uploaded file again
    if (row.file_path) {
      try {
        console.warn('Deleting uploaded file from storage due to insert failure:', row.file_path);
        const {error:cleanupError}=await supabase.storage.from('vault').remove([row.file_path]);
        if(cleanupError)console.warn('Uploaded file cleanup also failed:',cleanupError);
      } catch (delErr) {
        console.error('Failed to clean up uploaded file after insert failure:', delErr);
      }
    }
    throw insertError;
  }

  return {
    id: String(data.id),
    user_id: String(data.user_id || ''),
    title: String(data.title || row.title),
    kind: (data.kind as VaultKind) || row.kind,
    domain: (data.domain as VaultDomain) || row.domain,
    tags: Array.isArray(data.tags) ? data.tags : row.tags,
    note_text: (data.note_text as string | null) ?? null,
    content: (data.note_text as string | null) ?? null,
    due_date: (data.due_date as string | null) ?? null,
    dueDate: (data.due_date as string | null) ?? null,
    submitted_at: (data.submitted_at as string | null) ?? null,
    status: (data.status as VaultStatus) || null,
    score: data.score !== null && data.score !== undefined ? Number(data.score) : null,
    file_path: (data.file_path as string | null) ?? null,
    file_name: (data.file_name as string | null) ?? row.file_name,
    fileName: (data.file_name as string | null) ?? row.file_name,
    file_type: (data.file_type as string | null) ?? row.file_type,
    fileType: (data.file_type as string | null) ?? row.file_type,
    file_size: null,
    fileSize: null,
    created_at: (data.created_at as string) || new Date().toISOString(),
    createdAt: (data.created_at as string) || new Date().toISOString(),
  };
}

/**
 * Updates an existing vault item with ONLY the allowed columns.
 */
export async function updateVaultItemRow(
  itemId: string,
  updates: Partial<VaultItem>
): Promise<VaultItem> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const owner=await requireOwner();
  if (updates.file_path && (!updates.file_path.startsWith(`${owner}/`) || updates.file_path.includes('..'))) throw new Error('Invalid file owner.');
  if (updates.title !== undefined && !updates.title.trim()) throw new Error('A title is required.');
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.kind !== undefined) payload.kind = updates.kind;
  if (updates.domain !== undefined) payload.domain = updates.domain;
  if (updates.tags !== undefined) payload.tags = Array.isArray(updates.tags) ? updates.tags : [];
  if (updates.note_text !== undefined || updates.content !== undefined) {
    payload.note_text = updates.note_text ?? updates.content ?? null;
  }
  if (updates.due_date !== undefined || updates.dueDate !== undefined) {
    payload.due_date = updates.due_date ?? updates.dueDate ?? null;
  }
  if (updates.submitted_at !== undefined) payload.submitted_at = updates.submitted_at ?? null;
  if (updates.status !== undefined) payload.status = updates.status ?? null;
  if (updates.score !== undefined) {
    payload.score =
      updates.score !== null && !Number.isNaN(Number(updates.score))
        ? Math.min(100, Math.max(0, Number(updates.score)))
        : null;
  }
  if (updates.file_path !== undefined) payload.file_path = updates.file_path ?? null;
  if (updates.file_name !== undefined || updates.fileName !== undefined) {
    payload.file_name = updates.file_name ?? updates.fileName ?? null;
  }
  if (updates.file_type !== undefined || updates.fileType !== undefined) {
    payload.file_type = updates.file_type ?? updates.fileType ?? null;
  }

  const { data, error } = await supabase
    .from('vault_items')
    .update(payload)
    .eq('user_id', owner)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Supabase vault_items update error:', error);
    throw error;
  }

  return {
    id: String(data.id),
    user_id: String(data.user_id || ''),
    title: String(data.title),
    kind: data.kind as VaultKind,
    domain: data.domain as VaultDomain,
    tags: Array.isArray(data.tags) ? data.tags : [],
    note_text: (data.note_text as string | null) ?? null,
    content: (data.note_text as string | null) ?? null,
    due_date: (data.due_date as string | null) ?? null,
    dueDate: (data.due_date as string | null) ?? null,
    submitted_at: (data.submitted_at as string | null) ?? null,
    status: (data.status as VaultStatus) || null,
    score: data.score !== null && data.score !== undefined ? Number(data.score) : null,
    file_path: (data.file_path as string | null) ?? null,
    file_name: (data.file_name as string | null) ?? null,
    fileName: (data.file_name as string | null) ?? null,
    file_type: (data.file_type as string | null) ?? null,
    fileType: (data.file_type as string | null) ?? null,
    file_size: null,
    fileSize: null,
    created_at: (data.created_at as string) || new Date().toISOString(),
    createdAt: (data.created_at as string) || new Date().toISOString(),
  };
}

/**
 * Backward compatibility wrapper for existing code:
 * Routes to insertVaultItemRow or updateVaultItemRow with ONLY the 12 columns.
 */
export async function saveVaultMetadataItem(
  uid: string,
  item: Partial<VaultItem> & { title: string; kind: VaultKind; domain: VaultDomain; id?: string }
): Promise<VaultItem> {
  if (item.id && !item.id.startsWith('item_') && !item.id.startsWith('vault_')) {
    return updateVaultItemRow(item.id, item);
  }
  return insertVaultItemRow({
    title: item.title,
    kind: item.kind,
    domain: item.domain,
    tags: Array.isArray(item.tags) ? item.tags : [],
    note_text: item.note_text ?? item.content ?? null,
    due_date: item.due_date ?? item.dueDate ?? null,
    submitted_at: item.submitted_at ?? null,
    status: item.status ?? (item.kind === 'Assignment' ? 'To do' : null),
    score: item.score ?? null,
    file_path: item.file_path ?? null,
    file_name: item.file_name ?? item.fileName ?? null,
    file_type: item.file_type ?? item.fileType ?? null,
  });
}

/**
 * Creates a short-lived signed URL (default: 60 seconds) to preview or download
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

  const owner=await requireOwner();
  if (!filePath.startsWith(`${owner}/`) || filePath.includes('..')) throw new Error('Invalid file owner or path.');
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
  const owner=await requireOwner();
  if(!filePath.startsWith(`${owner}/`) || filePath.includes('..')) throw new Error('Invalid file owner or path.');
  const {error}=await supabase.storage.from('vault').remove([filePath]);
  if(error) throw error;
}

/**
 * Fetches all vault items from the Supabase table "vault_items".
 */
export async function fetchVaultMetadataList(uid?: string): Promise<VaultItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    let query = supabase.from('vault_items').select('*');

    // If uid is explicitly provided, filter if desired; however RLS typically restricts rows
    const owner=await requireOwner(uid);
    query=query.eq('user_id',owner);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('fetchVaultMetadataList error:', error);
      throw error;
    }

    if (!data) return [];

    return data.map((d) => ({
      id: String(d.id),
      user_id: String(d.user_id || ''),
      title: d.title || '',
      kind: d.kind as VaultKind,
      domain: d.domain as VaultDomain,
      tags: Array.isArray(d.tags) ? d.tags : [],
      note_text: d.note_text,
      content: d.note_text,
      due_date: d.due_date,
      dueDate: d.due_date,
      submitted_at: d.submitted_at,
      status: (d.status as VaultStatus) || null,
      score: d.score !== null && d.score !== undefined ? Number(d.score) : null,
      file_path: d.file_path,
      file_name: d.file_name,
      fileName: d.file_name,
      file_type: d.file_type,
      fileType: d.file_type,
      file_size: null,
      fileSize: null,
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
 * Deletes a vault item from the "vault_items" table and deletes its associated
 * file from the private "vault" Storage bucket.
 */
export async function deleteVaultMetadataItem(
  uidOrItemId: string,
  itemIdOrFilePath?: string | null,
  maybeFilePath?: string | null
): Promise<{warning?:string}> {
  if (!isSupabaseConfigured()) throw new Error('Account services are not configured.');

  let itemId: string;
  let filePath: string | null = null;

  if (maybeFilePath !== undefined) {
    itemId = itemIdOrFilePath as string;
    filePath = maybeFilePath;
  } else if (itemIdOrFilePath) {
    itemId = uidOrItemId;
    filePath = itemIdOrFilePath;
  } else {
    itemId = uidOrItemId;
  }

  const owner=await requireOwner();
  const {data:item,error:readError}=await supabase.from('vault_items').select('file_path').eq('id',itemId).eq('user_id',owner).single();
  if(readError || !item) throw readError || new Error('Item not found.');
  // Use the stored path, never a caller-supplied path.
  const {error}=await supabase.from('vault_items').delete().eq('id',itemId).eq('user_id',owner);
  if(error)throw error;
  if(item.file_path) {try{await deleteVaultStorageFile(item.file_path);}catch(error){return {warning:'Item removed, but its attachment could not be cleaned up. Please contact the workspace administrator.'};}}
  return {};
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
  if(!isSupabaseConfigured()) throw new Error("Feedback service is not configured.");
  if (isSupabaseConfigured()) {
    try {
      const {error}=await supabase.from('feedback').insert({
        clarity_rating: feedback.clarityRating,
        self_match_rating: feedback.selfMatchRating,
        expected_career: feedback.expectedCareer,
        time_to_finish_assessment: feedback.timeToFinishAssessment,
        time_to_finish_quiz: feedback.timeToFinishQuiz,
        device_type: feedback.deviceType,
        created_at: new Date().toISOString(),
      });
      if(error)throw error;
    } catch (err) {
      throw err;
    }
  }
}

export const submitFeedbackToFirestore = submitFeedback;
