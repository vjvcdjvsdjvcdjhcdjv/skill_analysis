/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Full-Screen Authentication Entry Gate (#login)
 * Requirements:
 * 1. Fills the entire viewport (h-screen / w-screen, no outer scroll on desktop).
 * 2. Desktop split screen:
 *    - Left 55%: Brand panel with slow animated gradient (ink #17333b -> teal #276459 with mint #d7f78c glow),
 *      wordmark logo, headline "Find your path in tech", and 3 short value props:
 *      * "Your scores, explained" (transparent formula, no black box)
 *      * "30-day plan that saves your progress"
 *      * "Private by default: only you can see your data"
 *    - Right 45%: Form card with:
 *      * Tabs: "Log in" and "Create account"
 *      * Order: "Continue with Google" -> divider "or" -> Email Form -> divider "or" -> "Continue as guest"
 * 3. Mobile (< 760px): Single column, brand header on top, form below, no sideways scroll, min 44px tap targets.
 * 4. Honest tone: "Self-reported, not validated. An exploration tool, not a verdict."
 * 5. Password strength meter (4 levels), show/hide toggles, neutral password reset feedback, friendly error messages.
 */

import React, { useState, useId } from 'react';
import { PageId } from '../components/TopBar.tsx';
import {
  CompassIcon,
  SparklesIcon,
  ShieldIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  CalendarIcon,
  EyeIcon,
  EyeOffIcon,
  SunIcon,
  MoonIcon,
} from '../components/icons.tsx';
import {
  loginWithGoogle,
  loginWithEmail,
  signUpWithEmail,
  resetPassword,
  logoutUser,
  FirebaseUser,
} from '../services/supabase.ts';

interface LoginViewProps {
  onNavigate: (page: PageId) => void;
  currentUser: FirebaseUser | null;
  onLoginSuccess: (user: FirebaseUser) => void;
  onContinueAsGuest: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isInsideApp?: boolean;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export function LoginView({
  onNavigate,
  currentUser,
  onLoginSuccess,
  onContinueAsGuest,
  isDarkMode,
  onToggleDarkMode,
  isInsideApp = false,
}: LoginViewProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Accessible unique IDs
  const loginEmailId = useId();
  const loginPasswordId = useId();
  const signupNameId = useId();
  const signupEmailId = useId();
  const signupPasswordId = useId();
  const signupConfirmPasswordId = useId();
  const forgotEmailId = useId();

  // Password strength calculator (0 = None, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong)
  const passwordStrength = React.useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-slate-200 dark:bg-slate-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-500',
  ];

  // Friendly human-readable authentication error message mapper
  const formatAuthError = (err: unknown): string => {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const msg = rawMsg.toLowerCase();

    if (rawMsg.includes('not configured')) {
      return 'Supabase is not configured yet! Please open src/services/supabase.ts and paste your Project URL and Publishable Key.';
    }

    if (
      msg.includes('auth/invalid-credential') ||
      msg.includes('auth/wrong-password') ||
      msg.includes('auth/user-not-found') ||
      msg.includes('invalid login credentials') ||
      msg.includes('invalid credentials')
    ) {
      return 'Incorrect email or password. Please verify your credentials or reset your password.';
    }

    if (
      msg.includes('auth/email-already-in-use') ||
      msg.includes('user already registered') ||
      msg.includes('already exists')
    ) {
      return 'An account already exists with this email address. Please log in instead.';
    }

    if (
      msg.includes('auth/weak-password') ||
      msg.includes('password should be at least') ||
      msg.includes('weak-password')
    ) {
      return 'Password is too weak. Please use at least 6 characters.';
    }

    if (msg.includes('email not confirmed')) {
      return 'Please check your email and confirm your account before logging in (or disable "Confirm email" in Supabase Auth Settings).';
    }

    if (msg.includes('auth/too-many-requests') || msg.includes('rate limit')) {
      return 'Too many attempts. Access is temporarily restricted for security; please try again shortly.';
    }

    if (msg.includes('auth/network-request-failed') || msg.includes('fetch failed')) {
      return 'Network connection issue. Please check your internet connection.';
    }

    if (msg.includes('auth/invalid-email') || msg.includes('valid email')) {
      return 'Please enter a valid email address.';
    }

    return rawMsg || 'An authentication error occurred. Please check your details and try again.';
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setAuthError(null);
    setSuccessNotice(null);
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user);
    } catch (err: unknown) {
      console.error('Google Sign-In error:', err);
      setAuthError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Email Submit Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setAuthError(null);
    setSuccessNotice(null);

    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailTrimmed) {
      setAuthError('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(emailTrimmed)) {
      setAuthError('Please enter a valid email address (e.g. student@university.edu).');
      return;
    }

    // Forgot Password Flow
    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        await resetPassword(emailTrimmed);
      } catch (err) {
        console.warn('Password reset request error:', err);
      } finally {
        setIsLoading(false);
        // Neutral message per specification: same whether or not the email exists
        setSuccessNotice(
          `If an account with that email exists, we've sent password reset instructions. Please check your inbox and spam folder.`
        );
      }
      return;
    }

    // Password Validation
    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }

    // Sign Up Flow
    if (mode === 'signup') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setAuthError('Please enter your full name for your student profile.');
        return;
      }
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match. Please re-enter.');
        return;
      }

      setIsLoading(true);
      try {
        const user = await signUpWithEmail(emailTrimmed, password, trimmedName);
        onLoginSuccess(user);
      } catch (err) {
        console.error('Sign up error:', err);
        setAuthError(formatAuthError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Log In Flow
    setIsLoading(true);
    try {
      const user = await loginWithEmail(emailTrimmed, password);
      onLoginSuccess(user);
    } catch (err) {
      console.error('Sign in error:', err);
      setAuthError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      onNavigate('home');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#f6f8f6] dark:bg-[#0e1c20] text-[#17333b] dark:text-[#f0f5f3] transition-colors">
      
      {/* ======================================================== */}
      {/* LEFT 55%: BRAND PANEL (Slow animated gradient + mint glow) */}
      {/* ======================================================== */}
      <div className="w-full lg:w-[55%] lg:h-full relative p-6 sm:p-10 lg:p-12 xl:p-16 flex flex-col justify-between overflow-hidden brand-gradient-panel text-white shrink-0">
        
        {/* Subtle slow animated background glows (mint glow #d7f78c + teal glow #276459) */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 bg-[#d7f78c] rounded-full blur-3xl pointer-events-none mint-glow-animated"
        />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#276459]/40 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Wordmark & Mobile Theme Toggle */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d7f78c] text-[#17333b] flex items-center justify-center shadow-md shrink-0">
              <CompassIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-xl tracking-tight text-white block leading-none">
                SkillPath <span className="text-[#d7f78c]">AI</span>
              </span>
              <span className="text-[11px] text-slate-300 font-medium tracking-wide">
                Student Career Compass
              </span>
            </div>
          </div>
          {/* Theme toggle on mobile inside brand panel */}
          <button
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isDarkMode ? <SunIcon className="w-4 h-4 text-[#d7f78c]" /> : <MoonIcon className="w-4 h-4 text-white" />}
          </button>
        </div>

        {/* Middle: Headline & 3 Value Props */}
        <div className="relative z-10 my-8 lg:my-auto space-y-6 max-w-xl">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold font-display leading-[1.15] text-white tracking-tight">
              Find your path in tech
            </h1>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
              A transparent diagnostic system that maps your natural strengths to high-conviction engineering careers and gives you a 30-day action plan.
            </p>
          </div>

          {/* 3 Short Value Props with Icons */}
          <div className="space-y-4 pt-2 border-t border-white/10 text-xs sm:text-sm">
            
            {/* Prop 1 */}
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#d7f78c]/20 text-[#d7f78c] flex items-center justify-center shrink-0 mt-0.5">
                <SparklesIcon className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-white block font-bold text-sm">
                  Your scores, explained
                </strong>
                <span className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Transparent formula (0.20M + 0.30C + 0.40P + 0.10S), no black box.
                </span>
              </div>
            </div>

            {/* Prop 2 */}
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#d7f78c]/20 text-[#d7f78c] flex items-center justify-center shrink-0 mt-0.5">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-white block font-bold text-sm">
                  30-day plan that saves your progress
                </strong>
                <span className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Weekly milestones and task checklists saved across your devices.
                </span>
              </div>
            </div>

            {/* Prop 3 */}
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#d7f78c]/20 text-[#d7f78c] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldIcon className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-white block font-bold text-sm">
                  Private by default: only you can see your data
                </strong>
                <span className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Zero-Trust security rules ensure only your authenticated account can access your data.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Honest Tone Disclaimer */}
        <div className="relative z-10 pt-4 text-[11px] text-slate-400 font-medium border-t border-white/10">
          Self-reported, not validated. An exploration tool, not a verdict.
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT 45%: THE FORM CARD                                 */}
      {/* ======================================================== */}
      <div className="w-full lg:w-[45%] lg:h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto bg-white dark:bg-[#14262b] relative">
        
        {/* Desktop Top Bar: Theme Toggle & Return to app link if guest */}
        <div className="w-full flex items-center justify-between pb-4">
          {isInsideApp ? (
            <button
              onClick={() => onNavigate('home')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <span>← Back to app</span>
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="hidden lg:flex min-w-[44px] min-h-[44px] items-center justify-center p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            {isDarkMode ? <SunIcon className="w-4 h-4 text-[#d7f78c]" /> : <MoonIcon className="w-4 h-4 text-[#17333b]" />}
          </button>
        </div>

        {/* Central Form Container */}
        <div className="max-w-md mx-auto w-full my-auto space-y-5 py-4">
          
          {/* If already logged in: show connected status */}
          {currentUser ? (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] text-xs font-bold uppercase tracking-wider mb-2">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Account Connected
                </div>
                <h2 className="text-2xl font-extrabold text-[#17333b] dark:text-white font-display">
                  Welcome Back!
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You are currently signed in. Your scores and plan progress sync automatically to Supabase.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Student'}
                    className="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#1b4e45] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.displayName || 'Signed In Student'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Auth Form */
            <div className="space-y-4">
              
              {/* Header text */}
              <div>
                <h2 className="text-2xl font-extrabold text-[#17333b] dark:text-white font-display">
                  {mode === 'signup'
                    ? 'Create Student Account'
                    : mode === 'forgot'
                    ? 'Reset Your Password'
                    : 'Sign In to SkillPath AI'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {mode === 'signup'
                    ? 'Join to save your scores, aptitude screening, and 30-day plan across devices.'
                    : mode === 'forgot'
                    ? 'Enter your student email to receive recovery instructions.'
                    : 'Access your persistent career trajectory cockpit.'}
                </p>
              </div>

              {/* Tabs: "Log in" and "Create account" */}
              {mode !== 'forgot' && (
                <div
                  role="tablist"
                  aria-label="Authentication modes"
                  className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    onClick={() => {
                      setMode('login');
                      setAuthError(null);
                      setSuccessNotice(null);
                    }}
                    className={`flex-1 min-h-[40px] rounded-lg transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] ${
                      mode === 'login'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signup'}
                    onClick={() => {
                      setMode('signup');
                      setAuthError(null);
                      setSuccessNotice(null);
                    }}
                    className={`flex-1 min-h-[40px] rounded-lg transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] ${
                      mode === 'signup'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Error Banner with aria-live="polite" */}
              {authError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 leading-relaxed flex items-start gap-2.5 animate-in fade-in"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Success Notice with aria-live="polite" */}
              {successNotice && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-2.5 animate-in fade-in"
                >
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* 1. BUTTON: "Continue with Google" (Requested FIRST in order) */}
              {mode !== 'forgot' && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}

              {/* 2. DIVIDER "or" */}
              {mode !== 'forgot' && (
                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                  <span className="bg-white dark:bg-[#14262b] px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    or
                  </span>
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                </div>
              )}

              {/* 3. EMAIL FORM */}
              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                
                {/* Name field (Signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor={signupNameId}
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id={signupNameId}
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Chen"
                      required
                      className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
                    />
                  </div>
                )}

                {/* Email field */}
                <div>
                  <label
                    htmlFor={mode === 'signup' ? signupEmailId : mode === 'forgot' ? forgotEmailId : loginEmailId}
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    id={mode === 'signup' ? signupEmailId : mode === 'forgot' ? forgotEmailId : loginEmailId}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    required
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
                  />
                </div>

                {/* Password field (Login & Signup) */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor={mode === 'signup' ? signupPasswordId : loginPasswordId}
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                      >
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot');
                            setAuthError(null);
                            setSuccessNotice(null);
                          }}
                          className="text-[11px] font-semibold text-[#1b4e45] dark:text-[#d7f78c] hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id={mode === 'signup' ? signupPasswordId : loginPasswordId}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full min-h-[44px] pl-3.5 pr-11 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter (Signup only, 4 levels) */}
                    {mode === 'signup' && password.length > 0 && (
                      <div className="mt-2 space-y-1.5 animate-in fade-in">
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 rounded-full transition-colors ${
                                passwordStrength >= level
                                  ? strengthColors[passwordStrength]
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                          <span>Password Strength:</span>
                          <span className="font-bold">{strengthLabels[passwordStrength]}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirm Password field (Signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor={signupConfirmPasswordId}
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id={signupConfirmPasswordId}
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full min-h-[44px] pl-3.5 pr-11 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showConfirmPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button with Loading State */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {mode === 'signup'
                          ? 'Creating account...'
                          : mode === 'forgot'
                          ? 'Sending reset link...'
                          : 'Signing in...'}
                      </span>
                    </span>
                  ) : mode === 'signup' ? (
                    'Create Account'
                  ) : mode === 'forgot' ? (
                    'Send Reset Link'
                  ) : (
                    'Log In with Email'
                  )}
                </button>

                {/* Back to Log In from Forgot Password */}
                {mode === 'forgot' && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setAuthError(null);
                        setSuccessNotice(null);
                      }}
                      className="min-h-[44px] text-xs text-[#1b4e45] dark:text-[#d7f78c] hover:underline font-semibold"
                    >
                      ← Back to Log In
                    </button>
                  </div>
                )}
              </form>

              {/* 4. DIVIDER "or" */}
              {mode !== 'forgot' && (
                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                  <span className="bg-white dark:bg-[#14262b] px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    or
                  </span>
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                </div>
              )}

              {/* 5. "Continue as guest" (Saves flag and navigates to #home) */}
              {mode !== 'forgot' && (
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
                >
                  <span>Continue as guest</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer info line */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
          Zero-Trust Cloud Architecture. Diagnostic data is isolated to your profile.
        </div>
      </div>
    </div>
  );
}
