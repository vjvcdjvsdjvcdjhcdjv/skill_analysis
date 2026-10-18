/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Optional Feedback & Evidence Collection Card
 */

import React, { useState } from 'react';
import { CheckCircleIcon, RefreshCwIcon, MessageSquareIcon } from './icons.tsx';
import { submitFeedback, FeedbackSubmission } from '../services/supabase.ts';

interface FeedbackCardProps {
  timeToFinishAssessment?: number | null;
  timeToFinishQuiz?: number | null;
  className?: string;
}

const LOCAL_STORAGE_FEEDBACK_KEY = 'skillpath_device_feedback';

export function getLocalDeviceFeedbackList(): FeedbackSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FEEDBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-200) : [];
  } catch {
    return [];
  }
}

export function saveLocalDeviceFeedback(feedback: FeedbackSubmission): void {
  try {
    const list = getLocalDeviceFeedbackList();
    list.push(feedback);
    localStorage.setItem(LOCAL_STORAGE_FEEDBACK_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not cache feedback locally', err);
  }
}

export function FeedbackCard({
  timeToFinishAssessment = null,
  timeToFinishQuiz = null,
  className = '',
}: FeedbackCardProps) {
  const [clarityRating, setClarityRating] = useState<number>(5);
  const [selfMatchRating, setSelfMatchRating] = useState<number>(4);
  const [expectedCareer, setExpectedCareer] = useState<string>('Frontend Developer');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const submission: FeedbackSubmission = {
      clarityRating,
      selfMatchRating,
      expectedCareer,
      timeToFinishAssessment: timeToFinishAssessment || null,
      timeToFinishQuiz: timeToFinishQuiz || null,
      deviceType: isMobile ? 'mobile' : 'desktop',
      timestamp: new Date().toISOString(),
    };

    saveLocalDeviceFeedback(submission);

    try {
      await submitFeedback(submission);
      setIsSubmitted(true);
    } catch (err) {
      console.warn('Feedback cloud submission caught:', err);
      setErrorMessage('Cloud submission failed. A copy is stored on this device; please retry when online.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={`p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-3 animate-in fade-in duration-200 ${className}`}>
        <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="font-bold text-sm">Thank you for your response!</p>
          <p className="text-slate-600 dark:text-slate-400 mt-0.5">
            Your anonymous response has been recorded to help calibrate diagnostic accuracy. View aggregate metrics on the <a href="#evidence" className="underline font-semibold hover:text-[#1b4e45] dark:hover:text-[#d7f78c]">#evidence</a> page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] flex items-center justify-center">
          <MessageSquareIcon className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            Diagnostic Calibration & Feedback
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Optional 30-second check-in • Completely anonymous (no student name or email saved)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-[11px]">
            {errorMessage}
          </div>
        )}

        {/* Question A: Clarity */}
        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            Was this assessment and diagnostic screening clear?
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setClarityRating(val)}
                className={`min-h-[44px] min-w-[44px] rounded-xl font-bold text-xs transition-all flex items-center justify-center border ${
                  clarityRating === val
                    ? 'bg-[#17333b] text-white dark:bg-[#d7f78c] dark:text-[#17333b] border-[#17333b] dark:border-[#d7f78c] shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{val}</span>
              </button>
            ))}
            <span className="text-[10px] text-slate-400 ml-2">
              (1 = Confusing, 5 = Crystal Clear)
            </span>
          </div>
        </div>

        {/* Question B: Self-match */}
        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            Does this match how you see yourself?
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setSelfMatchRating(val)}
                className={`min-h-[44px] min-w-[44px] rounded-xl font-bold text-xs transition-all flex items-center justify-center border ${
                  selfMatchRating === val
                    ? 'bg-[#17333b] text-white dark:bg-[#d7f78c] dark:text-[#17333b] border-[#17333b] dark:border-[#d7f78c] shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{val}</span>
              </button>
            ))}
            <span className="text-[10px] text-slate-400 ml-2">
              (1 = Far off, 5 = Spot on)
            </span>
          </div>
        </div>

        {/* Question C: Expected career */}
        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            Which career pathway did you expect before taking the diagnostic?
          </label>
          <select
            value={expectedCareer}
            onChange={(e) => setExpectedCareer(e.target.value)}
            className="w-full sm:max-w-xs min-h-[44px] px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#276459]"
          >
            <option value="Frontend Developer">Frontend Developer</option>
            <option value="Data Analyst">Data Analyst</option>
            <option value="Product Manager">Product Manager</option>
            <option value="UX/UI Designer">UX/UI Designer</option>
            <option value="Technical Writer">Technical Writer</option>
            <option value="Other">Other / Undecided</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] text-slate-400 font-mono">
            {timeToFinishQuiz ? `Quiz time: ${timeToFinishQuiz}s` : ''}
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />}
            <span>Submit Feedback</span>
          </button>
        </div>
      </form>
    </div>
  );
}
