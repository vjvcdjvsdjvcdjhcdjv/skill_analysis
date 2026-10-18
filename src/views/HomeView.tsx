/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SkillPath AI - Clean Premium Dashboard Home View (#home)
 */

import React, { useMemo } from 'react';
import { PageId } from '../components/TopBar.tsx';
import { RadarChart } from '../components/RadarChart.tsx';
import { CountUp } from '../components/CountUp.tsx';
import {
  DomainKey,
  DOMAINS,
  CareerFitResult,
  CAREER_PLANS,
} from '../utils/scoring.ts';
import type { QuizAttempt } from '../utils/quizBank.ts';
import {
  CodeIcon,
  BarChartIcon,
  MessageSquareIcon,
  PaletteIcon,
  ArrowRightIcon,
  CalendarIcon,
  ZapIcon,
  ClockIcon,
  CheckCircleIcon,
  TargetIcon,
  DownloadIcon,
  SparklesIcon,
} from '../components/icons.tsx';

export interface HomeViewProps {
  hasAssessment: boolean;
  hasSelfAssessment: boolean;
  onNavigate: (page: PageId) => void;
  onLoadDemo: () => void;
  onLoadSample: () => void;
  onOpenExport?: () => void;
  onToggleTask?: (taskId: string) => void;
  studentName: string;
  isDemoMode: boolean;
  domainScores: Record<DomainKey, number>;
  selfReportedScores: Record<DomainKey, number>;
  careerFits: CareerFitResult[];
  latestQuizAttempt: QuizAttempt | null;
  quizAttempts: QuizAttempt[];
  planProgressByCareer: Record<string, Record<string, boolean>>;
  selectedCareerId: string;
  assessmentAnswers: Record<string, number>;
}

export function HomeView({
  hasAssessment,
  hasSelfAssessment,
  onNavigate,
  onLoadDemo,
  onLoadSample,
  onOpenExport,
  onToggleTask,
  studentName,
  isDemoMode,
  domainScores,
  selfReportedScores,
  careerFits,
  latestQuizAttempt,
  planProgressByCareer,
  selectedCareerId,
  assessmentAnswers,
}: HomeViewProps) {
  const hasQuiz = Boolean(latestQuizAttempt);
  const activePlanTasks = planProgressByCareer[selectedCareerId] || {};
  const completedTasksCount = Object.values(activePlanTasks).filter(Boolean).length;
  const milestones = CAREER_PLANS[selectedCareerId] || CAREER_PLANS['frontend-developer'] || [];

  const allCareerTasks = useMemo(() => {
    const list: {
      id: string;
      label: string;
      detail: string;
      estimatedMinutes: number;
      dayRange: string;
      milestoneTitle: string;
    }[] = [];
    for (const milestone of milestones) {
      for (const t of milestone.tasks) {
        list.push({
          ...t,
          dayRange: milestone.dayRange,
          milestoneTitle: milestone.title,
        });
      }
    }
    return list;
  }, [milestones]);

  const totalTasks = allCareerTasks.length || 12;
  const planPercentage = Math.round((completedTasksCount / totalTasks) * 100);

  const todayTask = useMemo(() => {
    return allCareerTasks.find((t) => !activePlanTasks[t.id]) || allCareerTasks[0];
  }, [allCareerTasks, activePlanTasks]);

  const currentDay = Math.min(30, Math.max(1, completedTasksCount * 2 + 1));

  const ctaState = useMemo(() => {
    if (!hasAssessment) {
      return {
        label: 'Start 8-question assessment',
        target: 'assessment' as PageId,
        nextStep: 'Complete your initial 4-domain strengths self-assessment (takes ~2 minutes).',
      };
    }
    if (!hasQuiz && !isDemoMode) {
      return {
        label: 'Take the aptitude quiz',
        target: 'quiz' as PageId,
        nextStep: 'Calibrate your scores with an objective diagnostic screening (12 or 24 questions).',
      };
    }
    return {
      label: `Continue Day ${currentDay} of your plan`,
      target: 'plan' as PageId,
      nextStep: todayTask
        ? `Next step: finish "${todayTask.label}" (${todayTask.dayRange})`
        : 'All 30-day milestones completed! Ready for portfolio review.',
    };
  }, [hasAssessment, hasQuiz, isDemoMode, currentDay, todayTask]);

  const upcomingDeadlines = useMemo(() => {
    const pending = allCareerTasks.filter((t) => !activePlanTasks[t.id]);
    if (pending.length === 0) {
      return allCareerTasks.slice(-3);
    }
    return pending.slice(0, 3);
  }, [allCareerTasks, activePlanTasks]);

  const domainList: {
    key: DomainKey;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: 'programming', icon: CodeIcon },
    { key: 'analytical', icon: BarChartIcon },
    { key: 'communication', icon: MessageSquareIcon },
    { key: 'design', icon: PaletteIcon },
  ];

  function getTierLabel(score: number) {
    if (score >= 70) {
      return {
        label: 'Strong',
        badgeClass:
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
      };
    }
    if (score >= 40) {
      return {
        label: 'Developing',
        badgeClass:
          'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60',
      };
    }
    return {
      label: 'Needs focus',
      badgeClass:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    };
  }

  const displayName = studentName?.trim() || '';
  const topCareers = careerFits.slice(0, 3);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Welcome Strip */}
      <section
        aria-label="Student overview and next step"
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17333b] dark:text-white font-display tracking-tight truncate">
              {displayName ? `Hi ${displayName}` : 'Welcome to SkillPath AI'}
            </h1>
            {isDemoMode && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] border border-[#276459]/20 dark:border-[#d7f78c]/30 font-mono">
                Demo data
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate max-w-2xl leading-relaxed">
            {ctaState.nextStep}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto flex-wrap">
          <button
            onClick={() => onNavigate(ctaState.target)}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-md transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
          >
            <span>{ctaState.label}</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
          {!isDemoMode ? (
            <button
              onClick={onLoadDemo}
              className="min-h-[44px] px-3 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] rounded-lg"
            >
              Explore demo
            </button>
          ) : (
            <button
              onClick={onLoadSample}
              className="min-h-[44px] px-3 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] rounded-lg"
            >
              Load sample profile
            </button>
          )}
        </div>
      </section>

      {/* 2. Row of 4 Domain Cards */}
      <section
        aria-label="Domain scores breakdown"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {domainList.map(({ key, icon: IconComponent }) => {
          const score = hasAssessment ? domainScores[key] : null;
          const selfScore = selfReportedScores[key];
          const quizScore = latestQuizAttempt ? latestQuizAttempt.domainScores[key] : null;
          const tier = score !== null ? getTierLabel(score) : null;

          return (
            <div
              key={key}
              onClick={() => onNavigate('dashboard')}
              className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between min-h-[152px] group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate('dashboard');
                }
              }}
              aria-label={`${DOMAINS[key].name} domain score`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#1b4e45] dark:text-[#d7f78c] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {DOMAINS[key].name}
                  </span>
                </div>
                {tier && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.badgeClass}`}>
                    {tier.label}
                  </span>
                )}
              </div>

              <div className="my-2.5">
                {score !== null ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-[#17333b] dark:text-white font-mono tracking-tight">
                      <CountUp value={score} />
                    </span>
                    <span className="text-xs text-slate-400 font-mono">/ 100</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-2xl font-bold text-slate-400 font-mono">—</span>
                    <p className="text-[11px] text-slate-400">Not assessed yet</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#276459] to-[#d7f78c] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${score ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {quizScore !== null && !isDemoMode ? (
                    <span className="font-medium text-[#1b4e45] dark:text-[#d7f78c]">
                      Self {hasSelfAssessment ? selfScore : "not assessed"} / Measured {quizScore}
                    </span>
                  ) : score !== null ? (
                    <span>Deterministic formula</span>
                  ) : (
                    <span>Click to assess</span>
                  )}
                  <span className="font-bold">{score !== null ? `${score}%` : '—'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. Two-Column Dashboard Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Radar Chart + 30-Day Plan Card + Deadlines */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Aptitude Strengths Polygon
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Multidimensional visualizer showing your current 4-domain profile.
                </p>
              </div>
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-xs font-semibold text-[#1b4e45] dark:text-[#d7f78c] hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] rounded-md px-1 py-0.5"
              >
                <span>Full Cockpit</span>
                <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>

            {hasAssessment ? (
              <div className="py-2 flex justify-center">
                <RadarChart
                  scores={domainScores}
                  previousScores={latestQuizAttempt && !isDemoMode && hasSelfAssessment ? selfReportedScores : undefined}
                  size={340}
                  className="w-full max-w-sm mx-auto"
                />
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <TargetIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No strengths data recorded yet
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5">
                    Answer 8 self-report prompts to generate your deterministic strengths radar.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => onNavigate('assessment')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs"
                  >
                    Start Assessment
                  </button>
                  <button
                    onClick={onLoadSample}
                    className="text-xs font-semibold text-[#1b4e45] dark:text-[#d7f78c] hover:underline"
                  >
                    or load sample profile
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c]" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  30-Day Action Roadmap
                </h2>
              </div>
              <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                Today: Day {currentDay}/30
              </span>
            </div>

            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-slate-800 stroke-current"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#1b4e45] dark:text-[#d7f78c] stroke-current transition-all duration-700"
                    strokeWidth="3.5"
                    strokeDasharray={`${planPercentage}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold font-mono text-slate-800 dark:text-slate-200">
                  {planPercentage}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Milestone progress</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {completedTasksCount} / {totalTasks} done
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#276459] to-[#d7f78c] rounded-full transition-all duration-500"
                    style={{ width: `${planPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {todayTask && (
              <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#102025] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c] font-mono">
                    Today's Task • {todayTask.dayRange}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ~{todayTask.estimatedMinutes} mins
                  </span>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={Boolean(activePlanTasks[todayTask.id])}
                    onChange={() => onToggleTask && onToggleTask(todayTask.id)}
                    className="mt-0.5 w-4 h-4 rounded text-[#1b4e45] focus:ring-[#276459] cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold transition-all ${
                        activePlanTasks[todayTask.id]
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white group-hover:text-[#1b4e45] dark:group-hover:text-[#d7f78c]'
                      }`}
                    >
                      {todayTask.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {todayTask.detail}
                    </p>
                  </div>
                </label>
              </div>
            )}

            <button
              onClick={() => onNavigate('plan')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
            >
              <span>Open 30-Day Plan</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c]" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Upcoming Deadlines
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">Next milestone checkpoints</span>
            </div>

            <div className="space-y-2.5">
              {upcomingDeadlines.map((task, index) => {
                const isDone = Boolean(activePlanTasks[task.id]);
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold shrink-0">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.label}
                        </p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {task.dayRange} • ~{task.estimatedMinutes} mins
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] max-w-[110px] truncate">
                        {task.milestoneTitle.split('&')[0].trim()}
                      </span>
                      {isDone ? (
                        <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Top Careers + Quiz Card + Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Top Career Matches
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Based on your assessment and available quiz results.
                </p>
              </div>
              <button
                onClick={() => onNavigate('careers')}
                className="text-xs font-semibold text-[#1b4e45] dark:text-[#d7f78c] hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] rounded-md px-1 py-0.5"
              >
                <span>View all careers</span>
                <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>

            {hasAssessment ? (
              <div className="space-y-3">
                {topCareers.map((fit, index) => {
                  const keySkill = fit.career.keyCompetencies[0] || 'Core Engineering';
                  return (
                    <div
                      key={fit.career.id}
                      onClick={() => onNavigate('careers')}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0 font-mono">
                            #{index + 1}
                          </span>
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-[#1b4e45] dark:group-hover:text-[#d7f78c] transition-colors">
                            {fit.career.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-extrabold font-mono text-[#1b4e45] dark:text-[#d7f78c]">
                            {fit.fitPercentage}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] border border-[#276459]/15 dark:border-[#d7f78c]/20 truncate">
                          <SparklesIcon className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{keySkill}</span>
                        </span>
                        <div className="w-20">
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#276459] to-[#d7f78c] rounded-full"
                              style={{ width: `${fit.fitPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Complete the strengths assessment to compute alignment with tech pathways.
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ZapIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c]" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  {latestQuizAttempt ? 'Quiz: Self vs Measured' : 'Aptitude Screening'}
                </h2>
              </div>
              {latestQuizAttempt && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
                  Calibrated
                </span>
              )}
            </div>

            {latestQuizAttempt ? (
              <div className="space-y-3.5">
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span>Domain</span>
                    <span>Self • Measured</span>
                  </div>
                  {domainList.map(({ key }) => {
                    const self = selfReportedScores[key] || 0;
                    const measured = latestQuizAttempt.domainScores[key] || 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {DOMAINS[key].name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {hasSelfAssessment ? `${self} pts` : "Not assessed"} • <span className="font-bold text-[#1b4e45] dark:text-[#d7f78c]">{measured} pts</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-slate-400 dark:bg-slate-600 rounded-full"
                              style={{ width: `${hasSelfAssessment ? self : 0}%` }}
                              title={`Self-reported: ${self}`}
                            />
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#276459] to-[#d7f78c] rounded-full"
                              style={{ width: `${measured}%` }}
                              title={`Measured quiz: ${measured}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>Strongest: <strong>{DOMAINS[latestQuizAttempt.strongestDomain].name}</strong></span>
                  <span className="font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c]">
                    Score: {latestQuizAttempt.overallScore}%
                  </span>
                </div>

                <button
                  onClick={() => onNavigate('quiz')}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
                >
                  <span>Retake Aptitude Quiz</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Calibrate your scores with a 5-min quiz. Replace subjective self-ratings with 12 or 24 objective logic, math, clarity, and visual hierarchy challenges.
                </p>
                <button
                  onClick={() => onNavigate('quiz')}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
                >
                  <span>Take Aptitude Quiz</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigate('assessment')}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
              >
                <CheckCircleIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c] shrink-0" />
                <span className="truncate">Retake Assessment</span>
              </button>
              <button
                onClick={() => onNavigate('quiz')}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
              >
                <ZapIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c] shrink-0" />
                <span className="truncate">Take Quiz</span>
              </button>
              <button
                onClick={() => onOpenExport && onOpenExport()}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
              >
                <DownloadIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c] shrink-0" />
                <span className="truncate">Export Report</span>
              </button>
              <button
                onClick={onLoadDemo}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459]"
              >
                <SparklesIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c] shrink-0" />
                <span className="truncate">Load Demo</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-center pt-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Scores are self-reported and not validated. An exploration tool, not a verdict.
        </p>
      </footer>
    </div>
  );
}
