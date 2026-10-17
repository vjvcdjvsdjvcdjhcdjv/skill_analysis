/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Export Report Modal & Generator
 * Produces clean downloadable Markdown and print-ready summary for academic advisors.
 */

import React, { useState } from 'react';
import { DomainKey, DOMAINS, CareerFitResult, PlanMilestone } from '../utils/scoring.ts';
import type { QuizAttempt } from '../utils/quizBank.ts';
import {
  DownloadIcon,
  PrinterIcon,
  CheckIcon,
  XIcon,
  ZapIcon,
} from './icons.tsx';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentYear: string;
  studentFocus: string;
  domainScores: Record<DomainKey, number>;
  careerFits: CareerFitResult[];
  activePlan: PlanMilestone[];
  completedTasks: Record<string, boolean>;
  latestQuizAttempt?: QuizAttempt | null;
  selfReportedScores?: Record<DomainKey, number>;
}

export function ExportModal({
  isOpen,
  onClose,
  studentName,
  studentYear,
  studentFocus,
  domainScores,
  careerFits,
  activePlan,
  completedTasks,
  latestQuizAttempt,
  selfReportedScores,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const topCareer = careerFits[0]?.career;
  const topFit = careerFits[0]?.fitPercentage;

  // Calculate plan completion %
  const totalTasks = activePlan.reduce((acc, m) => acc + m.tasks.length, 0);
  const doneTasks = activePlan.reduce(
    (acc, m) => acc + m.tasks.filter((t) => completedTasks[t.id]).length,
    0
  );
  const planProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Build Markdown payload
  const generateMarkdown = () => {
    return `# SkillPath AI – Comprehensive Career Pathway Report
Generated on: ${new Date().toLocaleDateString()}
Tone Notice: Self-reported student strengths & objective diagnostic screening, not a clinical psychometric examination.

## Student Profile
- Name: ${studentName || 'Student'}
- Academic Standing: ${studentYear || 'Undergraduate'}
- Area of Interest: ${studentFocus || 'Technology & Engineering'}

## 1. Domain Strengths Assessment
Formula: Score = 0.20 * Marks + 0.30 * Confidence + 0.40 * Practice + 0.10 * Skill
(Note: When academic marks are not supplied, weights are rescaled over 0.80)

| Domain | Final Score | Relative Standing | Key Focus Area |
| :--- | :---: | :--- | :--- |
| Programming | ${domainScores.programming}/100 | ${domainScores.programming >= 70 ? 'Primary Strength' : 'Developing'} | Software execution & debugging |
| Analytical thinking | ${domainScores.analytical}/100 | ${domainScores.analytical >= 70 ? 'Primary Strength' : 'Developing'} | Quantitative logic & problem decomposition |
| Communication | ${domainScores.communication}/100 | ${domainScores.communication >= 70 ? 'Primary Strength' : 'Developing'} | Articulation & cross-functional empathy |
| Design | ${domainScores.design}/100 | ${domainScores.design >= 70 ? 'Primary Strength' : 'Developing'} | Visual hierarchy & user ergonomics |

## 2. Objective Aptitude Diagnostic Screening
${latestQuizAttempt ? `Status: Completed (${latestQuizAttempt.dateLabel})
- Mode: ${latestQuizAttempt.mode.toUpperCase()} (${latestQuizAttempt.totalQuestions} questions)
- Overall Measured Score: ${latestQuizAttempt.overallScore}/100 (${latestQuizAttempt.correctQuestions}/${latestQuizAttempt.totalQuestions} problems solved correctly)
- Duration: ${Math.floor(latestQuizAttempt.timeTakenSeconds / 60)}m ${latestQuizAttempt.timeTakenSeconds % 60}s
- Strongest Measured Aptitude: ${DOMAINS[latestQuizAttempt.strongestDomain]?.name || latestQuizAttempt.strongestDomain}

### Inputs Behind These Scores (0.60 Self-Reported + 0.40 Aptitude Screening)
| Domain | Self-Reported (60%) | Quiz Measured (40%) | Final Calibrated Score |
| :--- | :---: | :---: | :---: |
| Programming | ${selfReportedScores ? selfReportedScores.programming : domainScores.programming} pts | ${latestQuizAttempt.domainScores.programming} pts | ${domainScores.programming} pts |
| Analytical thinking | ${selfReportedScores ? selfReportedScores.analytical : domainScores.analytical} pts | ${latestQuizAttempt.domainScores.analytical} pts | ${domainScores.analytical} pts |
| Communication | ${selfReportedScores ? selfReportedScores.communication : domainScores.communication} pts | ${latestQuizAttempt.domainScores.communication} pts | ${domainScores.communication} pts |
| Design | ${selfReportedScores ? selfReportedScores.design : domainScores.design} pts | ${latestQuizAttempt.domainScores.design} pts | ${domainScores.design} pts |
` : `Status: Not yet taken (Scores are 100% self-reported baseline)`}

## 3. Career Pathway Match Rankings
${careerFits
  .map(
    (fit, idx) => `### ${idx + 1}. ${fit.career.title} (${fit.fitPercentage}% Fit)
- Role Focus: ${fit.career.firstRole}
- Dominant Driver: ${fit.dominantStrength}
- Actionable Growth: ${fit.growthOpportunity}
- Starter Capstone: ${fit.career.starterProject}`
  )
  .join('\n\n')}

## 4. Recommended 30-Day Action Roadmap: ${topCareer ? topCareer.title : 'Action Plan'}
Current Roadmap Progress: ${planProgress}% (${doneTasks} of ${totalTasks} tasks completed)

${activePlan
  .map(
    (milestone) => `### ${milestone.dayRange}: ${milestone.title}
*Objective: ${milestone.objective}*
Tasks:
${milestone.tasks
  .map((task) => {
    const isDone = completedTasks[task.id];
    return `- [${isDone ? 'x' : ' '}] ${task.label} (~${task.estimatedMinutes} mins): ${task.detail}`;
  })
  .join('\n')}`
  )
  .join('\n\n')}

Report compiled deterministically via SkillPath AI.
`;
  };

  const handleDownload = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SkillPath_Report_${(studentName || 'Student').replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#14262b] rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] flex items-center justify-center">
              <DownloadIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Export Pathway Dossier
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Self-reported strengths analysis, aptitude screening & 30-day action plan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-[#276459]"
            aria-label="Close modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Preview */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
          
          {/* Student Banner */}
          <div className="p-4 rounded-xl bg-[#f6f8f6] dark:bg-[#0e1c20] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">Student Record</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-display">
                {studentName || 'Alex Chen'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {studentYear || 'Year 2 Undergraduate'} • {studentFocus || 'Computer Science'}
              </div>
            </div>
            {topCareer && (
              <div className="sm:text-right">
                <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Top Pathway Match</div>
                <div className="text-sm font-bold text-[#1b4e45] dark:text-[#d7f78c]">
                  {topCareer.title} ({topFit}% Fit)
                </div>
              </div>
            )}
          </div>

          {/* Domain Breakdown Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
              Domain Competencies (Deterministic 0-100)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(domainScores) as DomainKey[]).map((d) => (
                <div key={d} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a3840]/40">
                  <div className="text-xs text-slate-700 dark:text-slate-300 truncate font-semibold">{DOMAINS[d].name}</div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {domainScores[d]}<span className="text-xs text-slate-500 font-normal">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aptitude Quiz Screening Status */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#f6f8f6] dark:bg-[#0e1c20] text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ZapIcon className="w-3.5 h-3.5 text-[#1b4e45] dark:text-[#d7f78c]" />
                Objective Aptitude Screening:
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {latestQuizAttempt ? `${latestQuizAttempt.mode.toUpperCase()} (${latestQuizAttempt.dateLabel})` : 'Not Taken'}
              </span>
            </div>
            {latestQuizAttempt ? (
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Measured Score: <strong className="text-slate-900 dark:text-white font-mono">{latestQuizAttempt.overallScore}/100</strong> ({latestQuizAttempt.correctQuestions}/{latestQuizAttempt.totalQuestions} correct) • Blended into final score as 60% Self-Reported + 40% Measured Quiz.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                Aptitude quiz not yet taken; scores are based purely on self-reported inputs.
              </p>
            )}
          </div>

          {/* Career Matches */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
              Ranked Career Matches
            </h3>
            <div className="space-y-2">
              {careerFits.slice(0, 3).map((fit, idx) => (
                <div
                  key={fit.career.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{fit.career.title}</span>
                  </div>
                  <span className="font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c]">
                    {fit.fitPercentage}% Match
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 30-Day Plan Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Action Roadmap Progress
              </h3>
              <span className="text-xs font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c]">
                {planProgress}% Complete ({doneTasks}/{totalTasks} tasks)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-[#1b4e45] dark:bg-[#d7f78c] transition-all duration-300"
                style={{ width: `${planProgress}%` }}
              />
            </div>
          </div>

          {/* Honest disclaimer notice */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>Honest Assessment Disclaimer:</strong> These metrics reflect student self-reported confidence, practice habits, and optional coursework marks alongside a diagnostic aptitude screening. They represent exploratory compass directions and learned skills, never fixed or immutable intelligence.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={handleCopy}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : null}
            {copied ? 'Copied to Clipboard' : 'Copy Markdown'}
          </button>
          <button
            onClick={handlePrint}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            <PrinterIcon className="w-3.5 h-3.5" />
            Print / PDF
          </button>
          <button
            onClick={handleDownload}
            className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg bg-[#17333b] dark:bg-[#d7f78c] text-white dark:text-[#17333b] hover:bg-[#20444f] dark:hover:bg-[#cbf476] transition-colors inline-flex items-center gap-1.5 shadow-sm focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Download .md File
          </button>
        </div>
      </div>
    </div>
  );
}
