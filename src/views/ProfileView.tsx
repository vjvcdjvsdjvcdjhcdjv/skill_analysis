/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Student Profile View
 */

import React from 'react';
import { PageId } from '../components/TopBar.tsx';
import {
  DomainKey,
  DOMAINS,
  DomainMetrics,
} from '../utils/scoring.ts';
import {
  UserIcon,
  SparklesIcon,
  ArrowRightIcon,
  RefreshCwIcon,
} from '../components/icons.tsx';

interface ProfileViewProps {
  name: string;
  setName: (name: string) => void;
  year: string;
  setYear: (year: string) => void;
  focus: string;
  setFocus: (focus: string) => void;
  statement: string;
  setStatement: (statement: string) => void;
  domainMetrics: Record<DomainKey, DomainMetrics>;
  onUpdateDomainMetric: (domain: DomainKey, field: keyof DomainMetrics, value: number | null) => void;
  onLoadDemo: () => void;
  onLoadSample: () => void;
  onReset: () => void;
  onNavigate: (page: PageId) => void;
}

export function ProfileView({
  name,
  setName,
  year,
  setYear,
  focus,
  setFocus,
  domainMetrics,
  onUpdateDomainMetric,
  onLoadDemo,
  onLoadSample,
  onReset,
  onNavigate,
}: ProfileViewProps) {
  const domainKeys: DomainKey[] = ['programming', 'analytical', 'communication', 'design'];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
              <UserIcon className="w-4 h-4" />
              <span>Student Profile Record</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display mt-1">
              Academic Background & Course Marks
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Customize your student profile or calibrate domain-specific coursework marks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onLoadSample}
              className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459]"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#1b4e45] dark:text-[#d7f78c]" />
              Load Sample Profile
            </button>
            <button
              onClick={onLoadDemo}
              className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 shadow-xs transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459]"
            >
              <SparklesIcon className="w-3.5 h-3.5 text-[#1b4e45] dark:text-[#d7f78c]" />
              Demo (Alex Chen)
            </button>
            <button
              onClick={onReset}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-[#276459]"
              title="Reset profile"
              aria-label="Reset profile"
            >
              <RefreshCwIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Chen"
              className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
              Year of Study
            </label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. Year 2 Undergraduate"
              className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
              Major / Academic Focus
            </label>
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. Computer Science & Human-Centered Technology"
              className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459]"
            />
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
            <span>Optional Academic Factor (20% Weight)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">
            Course Marks / Exam Grades
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Enter percentage marks (0-100) from university courses. If you have not taken coursework in a domain, leave it empty: the system automatically excludes it and rescales confidence (37.5%), practice (50%), and skill (12.5%).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {domainKeys.map((key) => {
            const domain = DOMAINS[key];
            const metrics = domainMetrics?.[key] || { marks: null, confidence: 50, practice: 50, skill: 50 };
            const hasMarks = metrics.marks !== null && metrics.marks !== undefined;
            return (
              <div
                key={key}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: domain.color }}
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {domain.name}
                    </span>
                  </div>
                  <button
                    onClick={() => onUpdateDomainMetric(key, 'marks', hasMarks ? null : 75)}
                    className="min-h-[44px] flex items-center text-xs font-bold text-[#1b4e45] dark:text-[#d7f78c] hover:underline"
                  >
                    {hasMarks ? 'Exclude (Rescale)' : 'Provide Marks'}
                  </button>
                </div>

                {hasMarks ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Course Mark Percentage:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {metrics.marks}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={metrics.marks || 0}
                      onChange={(e) => onUpdateDomainMetric(key, 'marks', Number(e.target.value))}
                      className="w-full accent-[#1b4e45] dark:accent-[#d7f78c] cursor-pointer min-h-[44px]"
                    />
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono font-medium">
                      <span>0%</span>
                      <span>20% Formula Weight</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 text-center font-medium">
                    Marks Excluded • Rescaled to 0.375C + 0.50P + 0.125S
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => onNavigate('assessment')}
            className="min-h-[44px] flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            ← Back to Assessment
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-xs transition-transform hover:-translate-y-0.5 inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            <span>Proceed to Dashboard</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
