/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * First-login modal offering to import existing local guest data into Supabase cloud profile.
 */

import React from 'react';
import { SparklesIcon, CheckCircleIcon, ArrowRightIcon, XIcon } from './icons.tsx';

interface ImportGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  onStartFresh: () => void;
  studentName: string;
  answeredCount: number;
  completedTasksCount: number;
}

export function ImportGuestModal({
  isOpen,
  onClose,
  onImport,
  onStartFresh,
  studentName,
  answeredCount,
  completedTasksCount,
}: ImportGuestModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#14262b] rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#d7f78c]/30 text-[#1b4e45] dark:text-[#d7f78c] flex items-center justify-center shrink-0">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            aria-label="Dismiss modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#17333b] dark:text-white font-display">
            Import Your Guest Progress?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Welcome! We noticed assessment answers and roadmap progress saved locally on this browser. Would you like to upload them to your account?
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Profile Name:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{studentName || 'Student'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Answered Questions:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{answeredCount} of 8</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Completed Roadmap Tasks:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{completedTasksCount} tasks</span>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={onImport}
            className="w-full min-h-[44px] px-5 py-3 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Import & Save to Cloud</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onStartFresh}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Start Fresh with Cloud Data
          </button>
        </div>
      </div>
    </div>
  );
}
