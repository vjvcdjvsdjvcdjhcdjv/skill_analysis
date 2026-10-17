/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Slim Top Bar Navigation
 * [Zone 1: Wordmark]
 * [Zone 2: 5 Main Links (Home, Assessment, Quiz, Dashboard, Plan) + More ▾]
 * [Zone 3: Theme Toggle + Sign In / User Avatar Menu]
 * Never overflows or clips at 1280px or 1912px. Uses BottomTabBar under 760px.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  CompassIcon,
  SunIcon,
  MoonIcon,
  DownloadIcon,
  UserIcon,
  BriefcaseIcon,
  CalculatorIcon,
  VaultIcon,
  BarChartIcon,
} from './icons.tsx';
import type { FirebaseUser } from '../services/supabase.ts';

export type PageId =
  | 'home'
  | 'profile'
  | 'assessment'
  | 'quiz'
  | 'dashboard'
  | 'careers'
  | 'plan'
  | 'method'
  | 'login'
  | 'vault'
  | 'evidence';

export type SyncStatus = 'saved' | 'saving' | 'offline' | 'error';

interface TopBarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isDemoMode: boolean;
  onLoadDemo: () => void;
  onLoadSample: () => void;
  onReset: () => void;
  onOpenExport: () => void;
  currentUser: FirebaseUser | null;
  onLogout: () => void;
  syncStatus: SyncStatus;
}

export function TopBar({
  activePage,
  onNavigate,
  isDarkMode,
  onToggleDarkMode,
  onOpenExport,
  currentUser,
  onLogout,
  syncStatus,
}: TopBarProps) {
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // 5 primary links as requested
  const primaryLinks: { id: PageId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'assessment', label: 'Assessment' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'plan', label: 'Plan' },
  ];

  // Close menus on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setIsAvatarOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAvatarOpen(false);
        setIsMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isMoreActive =
    activePage === 'careers' ||
    activePage === 'method' ||
    activePage === 'profile' ||
    activePage === 'vault' ||
    activePage === 'evidence';

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#f6f8f6]/95 dark:bg-[#0e1c20]/95 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        
        {/* Zone 1: Wordmark (Properly aligned, zero text clipping) */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group min-h-[44px] py-1 px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] rounded-xl transition-all shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-[#17333b] dark:bg-[#d7f78c] flex items-center justify-center text-[#d7f78c] dark:text-[#17333b] shadow-xs shrink-0">
            <CompassIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col justify-center leading-normal">
            <span className="font-display font-bold text-lg tracking-tight text-[#17333b] dark:text-[#f0f5f3] leading-snug whitespace-nowrap pt-0.5">
              SkillPath <span className="text-[#1b4e45] dark:text-[#d7f78c]">AI</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight whitespace-nowrap">
              Student Career Compass
            </span>
          </div>
        </button>

        {/* Zone 2: 5 Clean Single-Line Links + More ▾ Dropdown */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          {primaryLinks.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`min-h-[40px] px-3 py-2 rounded-lg transition-all whitespace-nowrap text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] ${
                  isActive
                    ? 'text-[#17333b] dark:text-white font-bold bg-white dark:bg-slate-800 shadow-xs'
                    : 'hover:text-[#17333b] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* More Dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              aria-expanded={isMoreOpen}
              aria-haspopup="true"
              className={`min-h-[40px] px-3 py-2 rounded-lg transition-all whitespace-nowrap text-xs font-semibold flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] ${
                isMoreActive
                  ? 'text-[#17333b] dark:text-white font-bold bg-white dark:bg-slate-800 shadow-xs'
                  : 'hover:text-[#17333b] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <span>More</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isMoreOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/90 dark:border-slate-800 shadow-xl py-2 px-1.5 z-50 text-left animate-in fade-in duration-150 space-y-1">
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onNavigate('careers');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                    activePage === 'careers'
                      ? 'bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BriefcaseIcon className="w-3.5 h-3.5" />
                  <span>Careers (5 Tech Paths)</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onNavigate('method');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                    activePage === 'method'
                      ? 'bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CalculatorIcon className="w-3.5 h-3.5" />
                  <span>Scoring Methodology</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onNavigate('profile');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                    activePage === 'profile'
                      ? 'bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Student Profile</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onNavigate('vault');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                    activePage === 'vault'
                      ? 'bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <VaultIcon className="w-3.5 h-3.5" />
                  <span>Study Vault</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onNavigate('evidence');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                    activePage === 'evidence'
                      ? 'bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BarChartIcon className="w-3.5 h-3.5" />
                  <span>Evidence & Calibration</span>
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      setIsMoreOpen(false);
                      onOpenExport();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>Export Dossier (Markdown/Print)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Actions + Auth (Guaranteed visible, zero overflow) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Cloud Sync Status Dot (Compact, never overflows) */}
          {currentUser && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono font-medium border border-slate-200 dark:border-slate-700"
              title={
                syncStatus === 'saving'
                  ? 'Saving changes to Supabase...'
                  : syncStatus === 'saved'
                  ? 'Synced to Supabase'
                  : syncStatus === 'offline'
                  ? 'Offline. Changes stored on device.'
                  : 'Sync error'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'saving'
                    ? 'bg-amber-400 animate-pulse'
                    : syncStatus === 'saved'
                    ? 'bg-emerald-500'
                    : syncStatus === 'offline'
                    ? 'bg-slate-400'
                    : 'bg-rose-500'
                }`}
              />
              <span className="hidden sm:inline text-slate-600 dark:text-slate-400 capitalize text-[10px]">
                {syncStatus === 'saving' ? 'Saving' : syncStatus === 'saved' ? 'Saved' : 'Offline'}
              </span>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            {isDarkMode ? <SunIcon className="w-4 h-4 text-[#d7f78c]" /> : <MoonIcon className="w-4 h-4 text-[#17333b]" />}
          </button>

          {/* User Auth: Avatar Menu when logged in, or Sign In button when logged out */}
          {currentUser ? (
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                aria-expanded={isAvatarOpen}
                aria-label="User account menu"
                className="min-w-[44px] min-h-[44px] p-1 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 transition-all"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1b4e45] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
              </button>

              {/* Avatar Dropdown */}
              {isAvatarOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/90 dark:border-slate-800 shadow-xl py-3 px-4 z-50 text-left animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.displayName || 'Signed In Student'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {currentUser.email}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] text-[10px] font-mono font-bold">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          syncStatus === 'saving'
                            ? 'bg-amber-400 animate-pulse'
                            : syncStatus === 'saved'
                            ? 'bg-emerald-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span>Cloud Sync: {syncStatus}</span>
                    </div>
                  </div>
                  <div className="py-2 space-y-1">
                    <button
                      onClick={() => {
                        setIsAvatarOpen(false);
                        onNavigate('profile');
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Student Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsAvatarOpen(false);
                        onNavigate('dashboard');
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Diagnostics Cockpit
                    </button>
                    <button
                      onClick={() => {
                        setIsAvatarOpen(false);
                        onNavigate('vault');
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Study Vault
                    </button>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                    <button
                      onClick={() => {
                        setIsAvatarOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <span>Log out</span>
                      <span className="text-[10px] font-normal text-slate-400">(Switch to guest)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459] shadow-xs ${
                activePage === 'login'
                  ? 'bg-[#17333b] text-white dark:bg-[#d7f78c] dark:text-[#17333b] border-[#17333b] dark:border-[#d7f78c]'
                  : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-[#1b4e45] dark:text-[#d7f78c]" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
