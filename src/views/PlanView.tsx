/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 30-Day Action Roadmap View:
 * Structured weekly milestones, interactive task check-offs, persistent completion tracking per career,
 * and export dossier triggers.
 * Complies with 44px tap target requirements and sequential headings.
 */

import React from 'react';
import { PageId } from '../components/TopBar.tsx';
import {
  CAREER_PLANS,
  CAREERS,
  PlanMilestone,
} from '../utils/scoring.ts';
import {
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  DownloadIcon,
  SparklesIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  InfoIcon,
} from '../components/icons.tsx';

interface PlanViewProps {
  selectedCareerId: string;
  onSelectCareer: (careerId: string) => void;
  completedTasks: Record<string, boolean>;
  onToggleTask: (taskId: string) => void;
  onResetTasks: () => void;
  onOpenExport: () => void;
  onNavigate: (page: PageId) => void;
}

export function PlanView({
  selectedCareerId,
  onSelectCareer,
  completedTasks,
  onToggleTask,
  onResetTasks,
  onOpenExport,
  onNavigate,
}: PlanViewProps) {
  const currentCareer = CAREERS.find((c) => c.id === selectedCareerId) || CAREERS[0];
  const milestones: PlanMilestone[] = CAREER_PLANS[currentCareer.id] || CAREER_PLANS['frontend-developer'];

  // Calculate completion percentage
  const totalTasks = milestones.reduce((sum, m) => sum + m.tasks.length, 0);
  const doneTasks = milestones.reduce(
    (sum, m) => sum + m.tasks.filter((t) => completedTasks[t.id]).length,
    0
  );
  const percentComplete = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-10 pb-16">
      
      {/* Header and Career Selector */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
              <CalendarIcon className="w-4 h-4" />
              <span>30-Day Execution Roadmap</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display mt-1">
              {currentCareer.title} Pathway Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              A curated 4-week progression translating conceptual strengths into demonstrable project deliverables and code artifacts. Plan progress is saved separately per career.
            </p>
          </div>

          {/* Career Switcher Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Active Pathway Roadmap:
            </label>
            <select
              value={currentCareer.id}
              onChange={(e) => onSelectCareer(e.target.value)}
              className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#276459] shadow-xs cursor-pointer"
            >
              {CAREERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Roadmap Progress Strip */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Roadmap Milestones: <span className="font-mono text-slate-900 dark:text-white">{doneTasks}</span> of <span className="font-mono">{totalTasks}</span> tasks done
              </span>
              <span className="font-mono font-extrabold text-[#1b4e45] dark:text-[#d7f78c] tabular-nums">
                {percentComplete}% Complete
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-[#1b4e45] dark:bg-[#d7f78c] transition-all duration-300 ease-out rounded-full"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onResetTasks}
              className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-lg text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459]"
            >
              <RefreshCwIcon className="w-3.5 h-3.5" />
              Reset Checks
            </button>
            <button
              onClick={onOpenExport}
              className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg bg-[#17333b] dark:bg-[#d7f78c] text-white dark:text-[#17333b] hover:bg-[#20444f] dark:hover:bg-[#cbf476] shadow-xs transition-transform hover:-translate-y-0.5 inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459]"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              Export Dossier
            </button>
          </div>
        </div>
      </div>

      {/* 4 Weekly Milestones Grid */}
      <div className="space-y-6">
        {milestones.map((milestone, mIdx) => {
          const milestoneTasks = milestone.tasks;
          const completedCount = milestoneTasks.filter((t) => completedTasks[t.id]).length;
          const isMilestoneComplete = completedCount === milestoneTasks.length;

          return (
            <div
              key={milestone.dayRange}
              className={`p-6 sm:p-8 rounded-3xl border transition-all duration-200 ${
                isMilestoneComplete
                  ? 'bg-[#f6fbf8] dark:bg-[#122b27] border-emerald-300/80 dark:border-emerald-700/80 shadow-xs'
                  : 'bg-white dark:bg-[#14262b] border-slate-200/80 dark:border-slate-800 shadow-xs'
              }`}
            >
              {/* Milestone Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c]">
                      {milestone.dayRange}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      Milestone 0{mIdx + 1}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display">
                    {milestone.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                    Objective: {milestone.objective}
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0 font-bold">
                  <span className="text-slate-900 dark:text-white">{completedCount}</span>/{milestoneTasks.length} tasks done
                </div>
              </div>

              {/* Task Items */}
              <div className="space-y-3 pt-5">
                {milestoneTasks.map((task) => {
                  const isChecked = !!completedTasks[task.id];
                  return (
                    <div
                      key={task.id}
                      onClick={() => onToggleTask(task.id)}
                      className={`p-4 min-h-[44px] rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 group hover:-translate-y-0.5 ${
                        isChecked
                          ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 hover:border-slate-300'
                      }`}
                    >
                      {/* Checkbox with min 44x44px touch area */}
                      <button
                        type="button"
                        aria-checked={isChecked}
                        role="checkbox"
                        aria-label={`Toggle task: ${task.label}`}
                        className={`w-6 h-6 rounded-md mt-0.5 border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] ${
                          isChecked
                            ? 'bg-[#1b4e45] border-[#1b4e45] text-white dark:bg-[#d7f78c] dark:border-[#d7f78c] dark:text-[#17333b]'
                            : 'border-slate-400 dark:border-slate-600 group-hover:border-slate-500'
                        }`}
                      >
                        {isChecked && <CheckIcon className="w-4 h-4" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm font-bold transition-all ${
                              isChecked
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.label}
                          </span>
                          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-bold tabular-nums shrink-0">
                            ~{task.estimatedMinutes} mins
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isChecked
                              ? 'text-slate-500 dark:text-slate-500'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {task.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Starter Capstone Callout */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#14262b] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-400">
            Target Deliverable
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
            {currentCareer.title} Starter Portfolio Project
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            {currentCareer.starterProject}
          </p>
        </div>
        <button
          onClick={onOpenExport}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#17333b] dark:bg-[#d7f78c] text-white dark:text-[#17333b] font-bold text-xs whitespace-nowrap shadow-xs hover:-translate-y-0.5 transition-transform shrink-0 flex items-center justify-center"
        >
          Export Full Roadmap Report
        </button>
      </div>
    </div>
  );
}
