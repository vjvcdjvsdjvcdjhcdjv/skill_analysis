/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dashboard View
 */

import React, { useState, useEffect } from 'react';
import { PageId } from '../components/TopBar.tsx';
import { RadarChart } from '../components/RadarChart.tsx';
import { CountUp } from '../components/CountUp.tsx';
import {
  DomainKey,
  DOMAINS,
  DomainScoreResult,
  CareerFitResult,
  AssessmentSnapshot,
  computeScoreDeltas,
  SELF_REPORTED_WEIGHT,
  QUIZ_WEIGHT,
  PlanMilestone,
  CAREER_PLANS,
  CAREERS,
} from '../utils/scoring.ts';
import type { QuizAttempt } from '../utils/quizBank.ts';
import type { VaultItem } from '../services/supabase.ts';
import {
  SparklesIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircleIcon,
  InfoIcon,
  ZapIcon,
  VaultIcon,
  AlertTriangleIcon,
  BellIcon,
  XIcon,
} from '../components/icons.tsx';
import {
  DAILY_NOTIFICATION_STORAGE_KEY,
  getPlanTaskCounts,
  shouldShowDailyPlanNotification,
  getDailyNotificationMessage,
} from '../utils/planNotifications.ts';

interface DashboardViewProps {
  hasAssessment: boolean;
  hasSelfAssessment: boolean;
  studentName: string;
  studentYear: string;
  domainScores: Record<DomainKey, number>;
  domainDetails: Record<DomainKey, DomainScoreResult>;
  careerFits: CareerFitResult[];
  snapshots: AssessmentSnapshot[];
  latestQuizAttempt?: QuizAttempt | null;
  selfReportedScores?: Record<DomainKey, number>;
  onNavigate: (page: PageId) => void;
  onLoadDemo: () => void;
  isDemoMode: boolean;
  vaultItems?: VaultItem[];
  activeCareerTasks?: Record<string, boolean>;
  activePlanMilestones?: PlanMilestone[];
  selectedCareerId?: string;
}

export function DashboardView({
  hasAssessment,
  hasSelfAssessment,
  studentName,
  studentYear,
  domainScores,
  domainDetails,
  careerFits,
  snapshots,
  latestQuizAttempt,
  selfReportedScores,
  onNavigate,
  onLoadDemo,
  isDemoMode,
  vaultItems = [],
  activeCareerTasks = {},
  activePlanMilestones,
  selectedCareerId = 'frontend-developer',
}: DashboardViewProps) {
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<DomainKey | null>('programming');

  const [dailyPlanToast, setDailyPlanToast] = useState<{
    visible: boolean;
    title: string;
    message: string;
    incompleteCount: number;
    careerTitle: string;
  } | null>(null);

  useEffect(() => {
    if (!hasAssessment) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const milestones =
        activePlanMilestones ||
        (selectedCareerId ? CAREER_PLANS[selectedCareerId] : CAREER_PLANS['frontend-developer']) ||
        [];
      const { incompleteTasks } = getPlanTaskCounts(milestones, activeCareerTasks);
      const lastCheck = localStorage.getItem(DAILY_NOTIFICATION_STORAGE_KEY);
      const shouldNotify = shouldShowDailyPlanNotification(lastCheck, today, incompleteTasks);

      if (shouldNotify) {
        const career =
          CAREERS.find((c) => c.id === selectedCareerId) ||
          careerFits[0]?.career ||
          CAREERS[0];
        const { title, message } = getDailyNotificationMessage(career.title, incompleteTasks);
        setDailyPlanToast({
          visible: true,
          title,
          message,
          incompleteCount: incompleteTasks,
          careerTitle: career.title,
        });
        localStorage.setItem(DAILY_NOTIFICATION_STORAGE_KEY, today);
      }
    } catch (err) {
      console.warn('Daily notification check notice:', err);
    }
  }, [hasAssessment, activeCareerTasks, activePlanMilestones, selectedCareerId, careerFits]);

  useEffect(() => {
    if (!dailyPlanToast?.visible) return;
    const timer = setTimeout(() => {
      setDailyPlanToast((prev) => (prev ? { ...prev, visible: false } : null));
    }, 10000);
    return () => clearTimeout(timer);
  }, [dailyPlanToast?.visible]);

  const peerCohortAverage: Record<DomainKey, number> = {
    programming: 50,
    analytical: 55,
    communication: 52,
    design: 45,
  };

  const topFit = careerFits[0];
  const domainKeys: DomainKey[] = ['programming', 'analytical', 'communication', 'design'];

  const hasHistory = snapshots.length >= 2;
  const previousSnapshot = hasHistory ? snapshots[snapshots.length - 2] : null;
  const latestSnapshot = hasHistory ? snapshots[snapshots.length - 1] : null;
  const scoreDeltas = (previousSnapshot && latestSnapshot)
    ? computeScoreDeltas(previousSnapshot.scores, domainScores)
    : [];

  const vaultCountByDomain: Record<DomainKey, number> = {
    programming: vaultItems.filter((i) => i.domain === 'Programming').length,
    analytical: vaultItems.filter((i) => i.domain === 'Analytical thinking').length,
    communication: vaultItems.filter((i) => i.domain === 'Communication').length,
    design: vaultItems.filter((i) => i.domain === 'Design').length,
  };
  const totalVaultEvidence = vaultItems.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingDeadlines = vaultItems
    .filter((item) => item.kind === 'Assignment' && (item.due_date || item.dueDate))
    .map((item) => {
      const dueStr = (item.due_date || item.dueDate || '').split('T')[0];
      const isSubmitted = item.status === 'Submitted';
      const isOverdue = !isSubmitted && Boolean(dueStr) && dueStr < todayStr;
      return {
        ...item,
        dueStr,
        isOverdue,
      };
    })
    .sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.dueStr).getTime() - new Date(b.dueStr).getTime();
    })
    .slice(0, 3);

  if (!hasAssessment) return (
    <section className="max-w-3xl mx-auto p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200 dark:border-slate-800 space-y-5">
      <p className="text-sm font-semibold">Your dashboard</p>
      <h1 className="text-3xl font-bold">No scores yet</h1>
      <p>Welcome{studentName ? `, ${studentName}` : ''}! Complete an assessment or aptitude quiz to see your own scores, strengths, and career matches.</p>
      <div className="flex flex-wrap gap-3">
        <button className="px-5 py-3 rounded-xl bg-[#276459] text-white" onClick={()=>onNavigate('assessment')}>Start assessment</button>
        <button className="px-5 py-3 rounded-xl border" onClick={()=>onNavigate('quiz')}>Take aptitude quiz</button>
        <button className="px-5 py-3 rounded-xl border" onClick={()=>onNavigate('home')}>Back to Home</button>
      </div>
    </section>
  );

  return (
    <div className="space-y-10 pb-16 relative">
      {dailyPlanToast?.visible && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-auto p-4 rounded-2xl bg-[#17333b] text-white dark:bg-[#14262b] dark:text-[#f0f5f3] border border-[#276459]/60 dark:border-[#d7f78c]/30 shadow-2xl animate-in slide-in-from-top-4 duration-300 backdrop-blur-md"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d7f78c]/20 text-[#d7f78c] flex items-center justify-center shrink-0 mt-0.5">
              <BellIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#d7f78c]/20 text-[#d7f78c]">
                  Daily Reminder
                </span>
                <span className="text-xs font-bold text-slate-200 truncate">
                  {dailyPlanToast.careerTitle}
                </span>
              </div>
              <p className="text-xs font-medium mt-1 text-slate-100 leading-snug">
                {dailyPlanToast.message}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setDailyPlanToast((prev) => (prev ? { ...prev, visible: false } : null));
                    onNavigate('plan');
                  }}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#d7f78c] hover:bg-[#cbf476] text-[#17333b] text-xs font-bold inline-flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Open 30-Day Plan</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDailyPlanToast((prev) => (prev ? { ...prev, visible: false } : null))}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDailyPlanToast((prev) => (prev ? { ...prev, visible: false } : null))}
              aria-label="Close notification"
              className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
            <span>Student Competency Dossier</span>
            <span aria-hidden="true">•</span>
            <span>Deterministic Scoring</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display mt-1">
            {studentName ? `${studentName}'s Diagnostics` : 'Diagnostics & Pathway Analysis'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            {studentYear || 'Year 2 Undergraduate'} • Calculated deterministically from practice, confidence, skill, and academic marks.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all focus-visible:ring-2 focus-visible:ring-[#276459] ${
              showBenchmark
                ? 'bg-[#17333b] text-white border-[#17333b] dark:bg-[#d7f78c] dark:text-[#17333b] dark:border-[#d7f78c]'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            {showBenchmark ? 'Hide Peer Benchmark' : 'Compare vs Peer Benchmark'}
          </button>
        </div>
      </div>

      {hasHistory && previousSnapshot && (
        <section className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#14262b] border border-[#1b4e45]/30 dark:border-[#d7f78c]/30 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#d7f78c]/25 dark:bg-[#d7f78c]/20 text-[#17333b] dark:text-[#d7f78c] text-[11px] font-bold uppercase tracking-wide">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Before vs After Snapshot Analysis
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display mt-1">
                Comparative Assessment Progress
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Comparing <span className="font-semibold text-slate-900 dark:text-white">{previousSnapshot.dateLabel}</span> → <span className="font-semibold text-slate-900 dark:text-white">Latest ({latestSnapshot?.dateLabel})</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {scoreDeltas.map((comp) => {
              const isPositive = comp.delta > 0;
              const isZero = comp.delta === 0;
              return (
                <div
                  key={comp.domain}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {DOMAINS[comp.domain].name}
                    </span>
                    <span
                      className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : isZero
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isPositive ? `+${comp.delta}` : comp.delta} pts
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                    <span>Before: <strong className="text-slate-900 dark:text-white">{comp.previous}</strong></span>
                    <span>→</span>
                    <span>After: <strong className="text-slate-900 dark:text-white text-sm">{comp.latest}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Multidimensional Radar
            </span>
            <span className="text-xs font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c]">
              4 Dimensions
            </span>
          </div>
          <RadarChart
            scores={domainScores}
            previousScores={hasHistory && previousSnapshot ? previousSnapshot.scores : undefined}
            benchmarkScores={peerCohortAverage}
            showBenchmark={showBenchmark}
            size={320}
            interactive={true}
          />
          {hasHistory && previousSnapshot && (
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#1b4e45] dark:bg-[#d7f78c] rounded-full" />
                <span className="font-medium text-slate-800 dark:text-slate-200">Latest</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-slate-500" />
                <span>Previous ({previousSnapshot.dateLabel})</span>
              </div>
            </div>
          )}
          {showBenchmark && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-slate-400" />
                <span>Peer Cohort Avg</span>
              </div>
            </div>
          )}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 w-full text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c] shrink-0 mt-0.5" />
            <span>
              Hover over vertex points to view exact coordinates. High polygon stretch denotes higher relative domain strength.
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Domain Scores & Formula Contributions
            </h2>
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
              Range: 0 - 100 points
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {domainKeys.map((key) => {
              const domain = DOMAINS[key];
              const score = domainScores[key] || 0;
              const detail = domainDetails[key];
              const isExpanded = expandedDomain === key;

              return (
                <div
                  key={key}
                  className={`p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                    isExpanded
                      ? 'bg-white dark:bg-[#14262b] border-[#1b4e45] dark:border-[#d7f78c]/80 shadow-md ring-1 ring-[#1b4e45]/20'
                      : 'bg-white dark:bg-[#14262b] border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: domain.color }}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {domain.name}
                        </span>
                      </div>
                      <div className="text-3xl font-extrabold text-[#17333b] dark:text-white font-mono mt-1 flex items-baseline gap-1">
                        <CountUp value={score} />
                        <span className="text-xs font-sans text-slate-500 font-normal">/ 100</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedDomain(isExpanded ? null : key)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-bold text-[#1b4e45] dark:text-[#d7f78c] hover:underline p-1"
                    >
                      {hasSelfAssessment ? (isExpanded ? 'Hide math' : 'View math') : 'Quiz score'}
                    </button>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-3">
                    <div
                      className="h-full transition-all duration-700 ease-out rounded-full"
                      style={{
                        width: `${score}%`,
                        backgroundColor: domain.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed line-clamp-2">
                    {domain.description}
                  </p>

                  {isExpanded && hasSelfAssessment && detail && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
                      <div className="text-[11px] font-sans font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Weighted Factor Breakdown
                      </div>
                      <div className="flex justify-between">
                        <span>Academic Marks ({Math.round(detail.weights.marks * 100)}%):</span>
                        <span className="font-bold">{detail.marksContribution} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence ({Math.round(detail.weights.confidence * 100)}%):</span>
                        <span className="font-bold">{detail.confidenceContribution} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Practice ({Math.round(detail.weights.practice * 100)}%):</span>
                        <span className="font-bold">{detail.practiceContribution} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Skill ({Math.round(detail.weights.skill * 100)}%):</span>
                        <span className="font-bold">{detail.skillContribution} pts</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
                        <span className="font-sans">Total Deterministic Score:</span>
                        <span>{detail.score} pts</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
              <ZapIcon className="w-3.5 h-3.5" />
              <span>Algorithmic Factor Transparency</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display mt-0.5">
              Inputs Behind These Scores
            </h2>
          </div>
          <button
            onClick={() => onNavigate('quiz')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-[#1b4e45] dark:text-[#d7f78c] transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ZapIcon className="w-3.5 h-3.5" />
            {latestQuizAttempt ? 'Retake Aptitude Quiz' : 'Take Aptitude Quiz (12 Q)'}
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          When both inputs are available, scores use 60% self-report and 40% measured quiz. With only one input, that input supplies the score. Missing inputs are not treated as a personal score.
        </p>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-mono uppercase tracking-wider">Domain</th>
                <th className="px-4 py-3 text-center font-mono uppercase tracking-wider">
                  Self-Reported ({hasSelfAssessment ? (latestQuizAttempt ? 60 : 100) : 0}%)
                </th>
                <th className="px-4 py-3 text-center font-mono uppercase tracking-wider">
                  Aptitude Quiz ({latestQuizAttempt ? (hasSelfAssessment ? 40 : 100) : 0}%)
                </th>
                <th className="px-4 py-3 text-center font-mono uppercase tracking-wider bg-[#276459]/5 dark:bg-[#d7f78c]/10 text-[#1b4e45] dark:text-[#d7f78c] font-bold">
                  Final Calibrated Score
                </th>
                <th className="px-4 py-3 text-right font-mono uppercase tracking-wider">Calibration Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {domainKeys.map((key) => {
                const selfScore = selfReportedScores ? selfReportedScores[key] : domainDetails[key]?.score || 0;
                const quizScore = latestQuizAttempt ? latestQuizAttempt.domainScores[key] : null;
                const finalScore = domainScores[key] || 0;
                const delta = quizScore !== null && hasSelfAssessment ? finalScore - selfScore : 0;
                return (
                  <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-sans font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: DOMAINS[key].color }}
                      />
                      {DOMAINS[key].name}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                      {hasSelfAssessment ? `${selfScore} pts` : "Not assessed"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {quizScore !== null ? (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {quizScore} pts
                        </span>
                      ) : (
                        <button
                          onClick={() => onNavigate('quiz')}
                          className="text-[11px] font-sans text-[#1b4e45] dark:text-[#d7f78c] underline hover:opacity-80"
                        >
                          Not taken yet (Take Quiz)
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-[#1b4e45] dark:text-[#d7f78c] bg-[#276459]/5 dark:bg-[#d7f78c]/10 text-sm">
                      {finalScore} pts
                    </td>
                    <td className="px-4 py-3 text-right">
                      {quizScore !== null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          delta > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : delta < 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {delta > 0 ? `+${delta}` : delta} pts
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-sans italic">
                          Baseline untouched
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Study Vault Evidence & Upcoming Deadlines */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#276459]/10 dark:bg-[#d7f78c]/15 text-[#1b4e45] dark:text-[#d7f78c] flex items-center justify-center">
                  <VaultIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                    Evidence in your vault
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Coursework artifacts & project deliverables per domain
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Display Only
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {domainKeys.map((key) => {
                const count = vaultCountByDomain[key];
                const config = DOMAINS[key];
                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {config.name}
                      </span>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-slate-900 dark:text-white shrink-0 ml-2">
                      {count} {count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-3">
              Display only • Vault data does NOT change career scores or algorithmic weighting.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('vault')}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#276459]"
            >
              <VaultIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c]" />
              <span>Open Study Vault ({totalVaultEvidence} total evidence)</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                    Upcoming deadlines
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Next 3 assignments (overdue in red)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Display Only
              </span>
            </div>

            <div className="space-y-2.5 mt-4">
              {upcomingDeadlines.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No upcoming deadlines
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Log coursework in your Study Vault with due dates to track them here.
                  </p>
                </div>
              ) : (
                upcomingDeadlines.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        item.isOverdue
                          ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                          : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold truncate ${
                            item.isOverdue
                              ? 'text-rose-950 dark:text-rose-200 font-extrabold'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-600 text-white shrink-0">
                            <AlertTriangleIcon className="w-3 h-3" />
                            Overdue
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              item.status === 'Submitted'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : item.status === 'In progress'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {item.status || 'To do'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {item.domain}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            item.isOverdue
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Due: {item.dueStr}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('vault')}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#276459]"
            >
              <CalendarIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c]" />
              <span>Manage Deadlines in Vault</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {topFit && (
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#17333b] to-[#20444f] text-white dark:from-[#132c33] dark:to-[#0f2228] border border-[#276459]/40 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d7f78c]/20 text-[#d7f78c] text-xs font-bold tracking-wide uppercase">
                <SparklesIcon className="w-3.5 h-3.5" />
                #1 Recommended Career Pathway
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-display mt-2 text-white">
                {topFit.career.title}
              </h2>
              <p className="text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
                {topFit.career.summary}
              </p>
            </div>
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/15 text-center shrink-0">
              <span className="block text-xs uppercase tracking-wider text-[#d7f78c] font-semibold">
                Competency Match
              </span>
              <div className="text-4xl sm:text-5xl font-mono font-extrabold text-[#d7f78c] my-1">
                <CountUp value={topFit.fitPercentage} suffix="%" />
              </div>
              <span className="text-[11px] text-slate-300">Weighted Fit</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs text-slate-200">
            <div>
              <span className="block text-[#d7f78c] font-semibold uppercase tracking-wider text-[11px] mb-1">
                Dominant Strength Driver
              </span>
              <p>{topFit.dominantStrength}</p>
            </div>
            <div>
              <span className="block text-[#d7f78c] font-semibold uppercase tracking-wider text-[11px] mb-1">
                Actionable Growth Bridge
              </span>
              <p>{topFit.growthOpportunity}</p>
            </div>
            <div>
              <span className="block text-[#d7f78c] font-semibold uppercase tracking-wider text-[11px] mb-1">
                Typical First Industry Title
              </span>
              <p>{topFit.career.firstRole}</p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('plan')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#d7f78c] hover:bg-[#cbf476] text-[#17333b] font-bold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-white"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>View Custom 30-Day Action Roadmap</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('careers')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all duration-200 hover:-translate-y-0.5 inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-white"
            >
              <BriefcaseIcon className="w-4 h-4" />
              <span>Compare All 5 Pathways</span>
            </button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Secondary Career Matches
          </h2>
          <button
            onClick={() => onNavigate('careers')}
            className="min-h-[44px] flex items-center text-xs font-semibold text-[#1b4e45] dark:text-[#d7f78c] hover:underline"
          >
            Explore all profiles →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {careerFits.slice(1).map((fit, idx) => (
            <div
              key={fit.career.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    Rank #{idx + 2}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c] bg-[#276459]/10 dark:bg-[#d7f78c]/15 px-2 py-0.5 rounded-md">
                    {fit.fitPercentage}% Fit
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  {fit.career.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                  {fit.career.summary}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                  {fit.career.firstRole.split('/')[0]}
                </span>
                <button
                  onClick={() => onNavigate('careers')}
                  className="min-h-[44px] flex items-center font-bold text-[#1b4e45] dark:text-[#d7f78c] hover:underline text-[11px]"
                >
                  Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
