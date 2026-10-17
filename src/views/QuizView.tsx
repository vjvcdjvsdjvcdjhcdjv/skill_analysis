/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Aptitude Quiz View (#quiz):
 * Objective diagnostic screening with Quick (12 Q) and Full (24 Q) modes.
 * Features balanced domain selection, shuffled options, gentle timer, immediate explanation,
 * difficulty-weighted accuracy, self-reported vs measured calibration, confetti,
 * animated radar comparison, and growth-mindset framing.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PageId } from '../components/TopBar.tsx';
import { RadarChart } from '../components/RadarChart.tsx';
import { CountUp } from '../components/CountUp.tsx';
import { Confetti } from '../components/Confetti.tsx';
import {
  DomainKey,
  DOMAINS,
  calculateCareerFit,
  calculateCombinedScore,
  SELF_REPORTED_WEIGHT,
  QUIZ_WEIGHT,
} from '../utils/scoring.ts';
import {
  QuizQuestion,
  QuizAttempt,
  generateQuizSession,
  calculateQuizResults,
  DIFFICULTY_WEIGHTS,
} from '../utils/quizBank.ts';
import {
  ClockIcon,
  TrophyIcon,
  ZapIcon,
  SparklesIcon,
  CheckCircleIcon,
  CheckIcon,
  XIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  RefreshCwIcon,
  InfoIcon,
  BriefcaseIcon,
  CodeIcon,
  BarChartIcon,
  MessageSquareIcon,
  PaletteIcon,
} from '../components/icons.tsx';

interface QuizViewProps {
  onNavigate: (page: PageId) => void;
  selfReportedScores: Record<DomainKey, number>;
  quizAttempts: QuizAttempt[];
  onSaveQuizAttempt: (attempt: QuizAttempt) => void;
  onClearQuizAttempts: () => void;
}

export function QuizView({
  onNavigate,
  selfReportedScores,
  quizAttempts,
  onSaveQuizAttempt,
  onClearQuizAttempts,
}: QuizViewProps) {
  // Quiz state: 'intro' | 'active' | 'results' | 'history'
  const [viewState, setViewState] = useState<'intro' | 'active' | 'results' | 'history'>('intro');
  const [selectedMode, setSelectedMode] = useState<'quick' | 'full'>('quick');

  // Active quiz session data
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Latest calculated attempt for results view
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(() => {
    return quizAttempts.length > 0 ? quizAttempts[quizAttempts.length - 1] : null;
  });

  // Confetti trigger
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Timer hook
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && viewState === 'active') {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, viewState]);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  // Start new quiz session
  const handleStartQuiz = (mode: 'quick' | 'full') => {
    const sessionQuestions = generateQuizSession(mode);
    setQuestions(sessionQuestions);
    setCurrentIndex(0);
    setUserAnswers({});
    setShowExplanation(false);
    setSecondsElapsed(0);
    setSelectedMode(mode);
    setViewState('active');
    setIsTimerRunning(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle selecting an option
  const handleSelectOption = (optionIndex: number) => {
    if (showExplanation) return; // Prevent changing answer
    const currentQ = questions[currentIndex];
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
    setShowExplanation(true);
  };

  // Proceed to next question or complete quiz
  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowExplanation(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Completed quiz!
      setIsTimerRunning(false);
      const attempt = calculateQuizResults(questions, userAnswers, secondsElapsed, selectedMode);
      setCurrentAttempt(attempt);
      onSaveQuizAttempt(attempt);
      setShowConfetti(true);
      setViewState('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Cancel / Exit quiz dialog
  const handleExitQuiz = () => {
    if (window.confirm('Are you sure you want to exit? Your current progress will not be saved.')) {
      setIsTimerRunning(false);
      setViewState('intro');
    }
  };

  const domainIcons: Record<DomainKey, React.ComponentType<{ className?: string }>> = {
    programming: CodeIcon,
    analytical: BarChartIcon,
    communication: MessageSquareIcon,
    design: PaletteIcon,
  };

  // Computed combined scores using named constants: 0.6 * self + 0.4 * quiz
  const combinedScores: Record<DomainKey, number> = useMemo(() => {
    if (!currentAttempt) return selfReportedScores;
    return {
      programming: calculateCombinedScore(selfReportedScores.programming, currentAttempt.domainScores.programming),
      analytical: calculateCombinedScore(selfReportedScores.analytical, currentAttempt.domainScores.analytical),
      communication: calculateCombinedScore(selfReportedScores.communication, currentAttempt.domainScores.communication),
      design: calculateCombinedScore(selfReportedScores.design, currentAttempt.domainScores.design),
    };
  }, [selfReportedScores, currentAttempt]);

  // Recalculated career fits from combined scores
  const updatedCareerFits = useMemo(() => {
    return calculateCareerFit(combinedScores);
  }, [combinedScores]);

  // Current active question
  const currentQuestion: QuizQuestion | undefined = questions[currentIndex];
  const currentDomainConfig = currentQuestion ? DOMAINS[currentQuestion.domain] : null;
  const DomainIconComponent = currentQuestion ? domainIcons[currentQuestion.domain] : CodeIcon;

  // Render inline SVG for visual spatial design questions
  const renderSvgIllustration = (svgType: QuizQuestion['svgType']) => {
    if (svgType === 'spacing-rhythm') {
      return (
        <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
            Spatial Rhythm Inspector (Visual Pattern)
          </span>
          <svg viewBox="0 0 460 120" className="w-full max-w-md mx-auto" aria-label="Visual spacing rhythm diagram">
            {/* Box 1 */}
            <rect x="10" y="30" width="80" height="60" rx="8" fill="#276459" fillOpacity="0.8" />
            <text x="50" y="65" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Card A</text>
            
            {/* Gap 1: 16px */}
            <line x1="90" y1="20" x2="106" y2="20" stroke="#1b4e45" strokeWidth="2" />
            <text x="98" y="15" textAnchor="middle" fill="#1b4e45" fontSize="10" fontFamily="monospace">16px</text>

            {/* Box 2 */}
            <rect x="106" y="30" width="80" height="60" rx="8" fill="#276459" fillOpacity="0.8" />
            <text x="146" y="65" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Card B</text>

            {/* Gap 2: 16px */}
            <line x1="186" y1="20" x2="202" y2="20" stroke="#1b4e45" strokeWidth="2" />
            <text x="194" y="15" textAnchor="middle" fill="#1b4e45" fontSize="10" fontFamily="monospace">16px</text>

            {/* Box 3 */}
            <rect x="202" y="30" width="80" height="60" rx="8" fill="#276459" fillOpacity="0.8" />
            <text x="242" y="65" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Card C</text>

            {/* Irregular Gap: 28px highlighted in rose */}
            <line x1="282" y1="20" x2="310" y2="20" stroke="#e11d48" strokeWidth="2.5" strokeDasharray="3,3" />
            <text x="296" y="15" textAnchor="middle" fill="#e11d48" fontSize="10" fontFamily="monospace" fontWeight="bold">28px (!)</text>

            {/* Box 4 */}
            <rect x="310" y="30" width="80" height="60" rx="8" fill="#276459" fillOpacity="0.8" />
            <text x="350" y="65" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Card D</text>
          </svg>
        </div>
      );
    }
    if (svgType === 'touch-target') {
      return (
        <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
            Touch Target Ergonomics (Apple HIG & Material 3 Specs)
          </span>
          <svg viewBox="0 0 460 110" className="w-full max-w-md mx-auto" aria-label="Touch target sizing diagram">
            {/* Small 24px button with tap miss zone */}
            <g transform="translate(40, 20)">
              <rect x="0" y="10" width="48" height="24" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
              <text x="24" y="26" textAnchor="middle" fill="#64748b" fontSize="10">24px</text>
              <circle cx="24" cy="22" r="28" fill="#f43f5e" fillOpacity="0.15" stroke="#f43f5e" strokeDasharray="2,2" />
              <text x="24" y="68" textAnchor="middle" fill="#e11d48" fontSize="10" fontWeight="bold">High tap miss risk</text>
            </g>

            {/* Standard 44px button with safe thumb envelope */}
            <g transform="translate(240, 10)">
              <rect x="0" y="0" width="80" height="44" rx="8" fill="#276459" />
              <text x="40" y="27" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">44 × 44px</text>
              <circle cx="40" cy="22" r="28" fill="#10b981" fillOpacity="0.12" stroke="#10b981" />
              <text x="40" y="78" textAnchor="middle" className="fill-[#1b4e45] dark:fill-[#d7f78c]" fontSize="10" fontWeight="bold">Ergonomic human thumb zone</text>
            </g>
          </svg>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {showConfetti && <Confetti />}

      {/* ======================================================== */}
      {/* 1. INTRO SCREEN                                          */}
      {/* ======================================================== */}
      {viewState === 'intro' && (
        <div className="space-y-8">
          
          {/* Hero Header */}
          <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
              <ZapIcon className="w-4 h-4" />
              <span>Skills Screening Diagnostic</span>
              <span aria-hidden="true">•</span>
              <span>Practical Aptitude</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#17333b] dark:text-white font-display tracking-tight">
              Aptitude & Diagnostic Skills Screening
            </h1>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
              Calibrate your self-reported profile with real problem-solving exercises: tracing small code snippets, interpreting performance tables, reviewing communication clarity, and evaluating design hierarchy.
            </p>

            {/* Honest Disclaimer Callout (Mandatory) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3.5 text-xs text-amber-900 dark:text-amber-200">
              <InfoIcon className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-semibold block">Honest Assessment Notice:</strong>
                <p className="leading-relaxed">
                  This is a short diagnostic screening, not a validated psychometric test or standardized IQ exam. Results evaluate current problem-solving heuristics and pattern recognition in an undergraduate learning context. They reflect current practice and learned skills, never fixed intelligence.
                </p>
              </div>
            </div>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Quick Mode */}
            <div
              onClick={() => setSelectedMode('quick')}
              className={`p-6 sm:p-7 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedMode === 'quick'
                  ? 'border-[#276459] dark:border-[#d7f78c] bg-white dark:bg-[#14262b] shadow-md ring-2 ring-[#276459]/20 dark:ring-[#d7f78c]/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#14262b]/70 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c]">
                    QUICK SPRINT
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <ClockIcon className="w-3.5 h-3.5" />
                    ~4 mins
                  </div>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                  Quick Screening (12 Questions)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  3 balanced questions per domain. Ideal for an initial check or quick recalibration between study milestones.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>• 3 Programming</span>
                  <span>• 3 Analytical</span>
                  <span>• 3 Communication</span>
                  <span>• 3 Design</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedMode === 'quick' ? 'Selected Mode' : 'Click to Select'}
                </span>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  selectedMode === 'quick' ? 'bg-[#276459] text-white dark:bg-[#d7f78c] dark:text-[#17333b]' : 'border border-slate-300 dark:border-slate-700'
                }`}>
                  {selectedMode === 'quick' && <CheckIcon className="w-3 h-3" />}
                </span>
              </div>
            </div>

            {/* Full Mode */}
            <div
              onClick={() => setSelectedMode('full')}
              className={`p-6 sm:p-7 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedMode === 'full'
                  ? 'border-[#276459] dark:border-[#d7f78c] bg-white dark:bg-[#14262b] shadow-md ring-2 ring-[#276459]/20 dark:ring-[#d7f78c]/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#14262b]/70 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#17333b]/10 text-[#17333b] dark:bg-slate-700 dark:text-slate-200">
                    FULL DIAGNOSTIC
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <ClockIcon className="w-3.5 h-3.5" />
                    ~8 mins
                  </div>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                  Comprehensive Diagnostic (24 Questions)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  6 questions per domain across foundational, intermediate, and advanced difficulties for highest statistical calibration.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>• 6 Programming</span>
                  <span>• 6 Analytical</span>
                  <span>• 6 Communication</span>
                  <span>• 6 Design</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedMode === 'full' ? 'Selected Mode' : 'Click to Select'}
                </span>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  selectedMode === 'full' ? 'bg-[#276459] text-white dark:bg-[#d7f78c] dark:text-[#17333b]' : 'border border-slate-300 dark:border-slate-700'
                }`}>
                  {selectedMode === 'full' && <CheckIcon className="w-3 h-3" />}
                </span>
              </div>
            </div>
          </div>

          {/* Launch Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-sm block">
                Ready to begin the {selectedMode === 'quick' ? '12-question Quick screening' : '24-question Full diagnostic'}?
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                You will receive immediate feedback and explanation after each question.
              </span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {quizAttempts.length > 0 && (
                <button
                  onClick={() => setViewState('history')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto"
                >
                  View Past Attempts ({quizAttempts.length})
                </button>
              )}
              <button
                onClick={() => handleStartQuiz(selectedMode)}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <ZapIcon className="w-4 h-4 text-[#d7f78c] dark:text-[#17333b]" />
                Start {selectedMode === 'quick' ? 'Quick Quiz' : 'Full Diagnostic'}
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Previous Attempt Summary Preview if exists */}
          {currentAttempt && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] flex items-center justify-center shrink-0">
                  <TrophyIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Latest Saved Attempt ({currentAttempt.dateLabel})
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Overall Measured Score: <span className="font-mono text-[#1b4e45] dark:text-[#d7f78c] text-base">{currentAttempt.overallScore}/100</span> • {currentAttempt.correctQuestions}/{currentAttempt.totalQuestions} Correct
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewState('results')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#1b4e45] dark:text-[#d7f78c] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                View Latest Diagnostic Report →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ACTIVE QUESTION SCREEN                                */}
      {/* ======================================================== */}
      {viewState === 'active' && currentQuestion && currentDomainConfig && (
        <div className="space-y-6">
          
          {/* Header Bar: Progress, Timer, and Domain Badge */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            
            {/* Domain Badge */}
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentDomainConfig.color }}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {currentDomainConfig.name}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Level {currentQuestion.difficulty} ({currentQuestion.difficulty === 1 ? 'Foundational' : currentQuestion.difficulty === 2 ? 'Intermediate' : 'Advanced'})
              </span>
            </div>

            {/* Gentle Timer & Counter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <ClockIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatTime(secondsElapsed)}</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <button
                onClick={handleExitQuiz}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                title="Exit Quiz"
                aria-label="Exit Quiz"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-[#276459] dark:bg-[#d7f78c] transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Prompt Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed font-display">
              {currentQuestion.prompt}
            </h2>

            {/* Code Snippet if applicable */}
            {currentQuestion.codeSnippet && (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0e1c20] text-slate-100 p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest">
                  <span>Snippet Trace</span>
                  <span>JavaScript</span>
                </div>
                <pre>{currentQuestion.codeSnippet}</pre>
              </div>
            )}

            {/* Table Data if applicable */}
            {currentQuestion.tableData && (
              <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                    <tr>
                      {currentQuestion.tableData.headers.map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left font-mono uppercase tracking-wider text-[11px]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#14262b] font-mono">
                    {currentQuestion.tableData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2 text-slate-800 dark:text-slate-200">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Visual SVG Diagram if applicable */}
            {currentQuestion.svgType && renderSvgIllustration(currentQuestion.svgType)}

            {/* 4 Options Grid */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">
                Select your answer:
              </span>
              {currentQuestion.options.map((optionText, optIdx) => {
                const isSelected = userAnswers[currentQuestion.id] === optIdx;
                const isCorrect = optIdx === currentQuestion.correctIndex;
                let optionClasses = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14262b] text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700';

                if (showExplanation) {
                  if (isCorrect) {
                    optionClasses = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500';
                  } else if (isSelected && !isCorrect) {
                    optionClasses = 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-semibold';
                  } else {
                    optionClasses = 'border-slate-200 dark:border-slate-800 opacity-60 text-slate-500 dark:text-slate-400';
                  }
                } else if (isSelected) {
                  optionClasses = 'border-[#276459] dark:border-[#d7f78c] bg-[#eaf4ed] dark:bg-[#1b3d36] font-semibold ring-2 ring-[#276459]/20';
                }

                const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    disabled={showExplanation}
                    className={`w-full min-h-[50px] p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${optionClasses} ${
                      !showExplanation ? 'cursor-pointer hover:shadow-xs focus-visible:ring-2 focus-visible:ring-[#276459]' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        showExplanation && isCorrect
                          ? 'bg-emerald-600 text-white'
                          : showExplanation && isSelected && !isCorrect
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {letter}
                      </span>
                      <span className="text-xs sm:text-sm leading-relaxed">
                        {optionText}
                      </span>
                    </div>
                    {showExplanation && (
                      <div className="shrink-0">
                        {isCorrect && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            <CheckIcon className="w-4 h-4" /> Correct
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                            <XIcon className="w-4 h-4" /> Incorrect
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation Box (shows immediately after selection) */}
            {showExplanation && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-300">
                <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
                  userAnswers[currentQuestion.id] === currentQuestion.correctIndex
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {userAnswers[currentQuestion.id] === currentQuestion.correctIndex ? (
                      <span className="text-emerald-700 dark:text-emerald-400">✓ Well reasoned!</span>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-300">Explanation & Heuristic:</span>
                    )}
                    <span className="text-[11px] font-mono text-slate-500 font-normal">
                      (+{DIFFICULTY_WEIGHTS[currentQuestion.difficulty]} weighted pts possible)
                    </span>
                  </div>
                  <p>{currentQuestion.explanation}</p>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={handleNextQuestion}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 inline-flex items-center gap-2"
                  >
                    {currentIndex < questions.length - 1 ? (
                      <>
                        Next Question
                        <ArrowRightIcon className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <TrophyIcon className="w-4 h-4 text-[#d7f78c] dark:text-[#17333b]" />
                        Finish & View Diagnostics
                        <ArrowRightIcon className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RESULTS SCREEN                                        */}
      {/* ======================================================== */}
      {viewState === 'results' && currentAttempt && (
        <div className="space-y-10">
          
          {/* Header Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
                  <TrophyIcon className="w-4 h-4" />
                  <span>Aptitude Diagnostic Complete</span>
                  <span aria-hidden="true">•</span>
                  <span>{currentAttempt.mode === 'quick' ? 'Quick Sprint' : 'Full Diagnostic'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display mt-1">
                  Your Measured Competency Profile
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Completed in {formatTime(currentAttempt.timeTakenSeconds)} on {currentAttempt.dateLabel}.
                </p>
              </div>

              {/* Retake & Navigation Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleStartQuiz(currentAttempt.mode)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCwIcon className="w-3.5 h-3.5" />
                  Retake ({currentAttempt.mode === 'quick' ? '12 Q' : '24 Q'})
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-[#17333b] text-white dark:bg-[#d7f78c] dark:text-[#17333b] hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
                >
                  Back to Dashboard →
                </button>
              </div>
            </div>

            {/* Growth Mindset Reassurance (Never fixed intelligence) */}
            <div className="p-4 rounded-xl bg-[#eaf4ed] dark:bg-[#132d27] border border-[#276459]/20 text-xs text-[#17333b] dark:text-[#d7f78c] flex items-center gap-2.5">
              <SparklesIcon className="w-4 h-4 shrink-0" />
              <span>
                <strong>Growth-Oriented Measurement:</strong> Diagnostic scores measure active heuristic familiarity and current debugging habits – never innate capacity or fixed intelligence. Every domain compounds steadily with targeted practice.
              </span>
            </div>
          </div>

          {/* Key Metric Highlight Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Overall Score */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Overall Measured Score
              </span>
              <div className="text-4xl font-extrabold text-[#17333b] dark:text-white font-mono my-2">
                <CountUp value={currentAttempt.overallScore} />
                <span className="text-sm font-sans text-slate-500 font-normal"> / 100</span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Difficulty-weighted accuracy
              </span>
            </div>

            {/* Questions Accuracy */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Solved Correctly
              </span>
              <div className="text-4xl font-extrabold text-[#1b4e45] dark:text-[#d7f78c] font-mono my-2">
                {currentAttempt.correctQuestions}
                <span className="text-sm font-sans text-slate-500 font-normal"> / {currentAttempt.totalQuestions}</span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {Math.round((currentAttempt.correctQuestions / currentAttempt.totalQuestions) * 100)}% raw problem success
              </span>
            </div>

            {/* Strongest Aptitude */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Dominant Aptitude Peak
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-display my-2">
                {DOMAINS[currentAttempt.strongestDomain].name}
              </div>
              <span className="text-xs font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c]">
                Score: {currentAttempt.domainScores[currentAttempt.strongestDomain]} / 100
              </span>
            </div>
          </div>

          {/* Animated Radar Comparison + Domain Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Radar Chart */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">
                Measured Quiz vs Baseline Self-Report
              </span>
              <RadarChart
                scores={currentAttempt.domainScores}
                previousScores={selfReportedScores}
                size={320}
              />
              <div className="mt-4 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#276459]" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Measured Quiz Score</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border-2 border-dashed border-slate-400" />
                  <span className="text-slate-500">Self-Reported Baseline</span>
                </div>
              </div>
            </div>

            {/* Right: Domain Difficulty-Weighted Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['programming', 'analytical', 'communication', 'design'] as DomainKey[]).map((dom) => {
                const config = DOMAINS[dom];
                const quizScore = currentAttempt.domainScores[dom];
                const breakdown = currentAttempt.domainBreakdowns[dom];
                const IconComp = domainIcons[dom];

                return (
                  <div
                    key={dom}
                    className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                          {config.name}
                        </span>
                      </div>
                      <IconComp className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-3xl font-extrabold font-mono text-[#17333b] dark:text-white">
                        {quizScore}
                        <span className="text-xs font-sans text-slate-400 font-normal"> / 100</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        {breakdown.correctCount} of {breakdown.totalCount} correct
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${quizScore}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>

                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Earned {breakdown.earnedPoints} of {breakdown.maxPoints} difficulty-weighted points.
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calibrated Combined Score Table (0.6x self + 0.4x quiz) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
                  Deterministic Calibration Matrix
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display mt-0.5">
                  Self-Reported vs. Measured Aptitude Inputs
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                Combined = 0.6 * Self + 0.4 * Quiz
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To avoid penalizing students with temporary exam anxiety while mitigating subjective self-report bias, SkillPath AI blends both inputs deterministically: 60% self-reported practice habits + 40% measured screening performance.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono uppercase tracking-wider">Domain</th>
                    <th className="px-4 py-3 text-center font-mono uppercase tracking-wider">Self-Reported ({Math.round(SELF_REPORTED_WEIGHT * 100)}%)</th>
                    <th className="px-4 py-3 text-center font-mono uppercase tracking-wider">Measured Quiz ({Math.round(QUIZ_WEIGHT * 100)}%)</th>
                    <th className="px-4 py-3 text-center font-mono uppercase tracking-wider bg-[#276459]/5 dark:bg-[#d7f78c]/10 text-[#1b4e45] dark:text-[#d7f78c] font-bold">
                      Calibrated Combined
                    </th>
                    <th className="px-4 py-3 text-right font-mono uppercase tracking-wider">Calibration Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {(['programming', 'analytical', 'communication', 'design'] as DomainKey[]).map((dom) => {
                    const selfScore = selfReportedScores[dom];
                    const qScore = currentAttempt.domainScores[dom];
                    const comb = combinedScores[dom];
                    const delta = comb - selfScore;

                    return (
                      <tr key={dom} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-sans font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: DOMAINS[dom].color }}
                          />
                          {DOMAINS[dom].name}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                          {selfScore} pts
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                          {qScore} pts
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-[#1b4e45] dark:text-[#d7f78c] bg-[#276459]/5 dark:bg-[#d7f78c]/10 text-sm">
                          {comb} pts
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            delta > 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : delta < 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {delta > 0 ? `+${delta}` : delta} pts
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Updated Top Career Fits Highlight */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#17333b] to-[#20444f] text-white dark:from-[#132c33] dark:to-[#0f2228] border border-[#276459]/40 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d7f78c]/20 text-[#d7f78c] text-xs font-bold tracking-wide uppercase">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Calibrated Career Fit Rankings
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-display mt-2 text-white">
                  #1 Pathway: {updatedCareerFits[0].career.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-xl leading-relaxed">
                  Recalculated with your measured aptitude screening inputs. Matches your strongest verified skills.
                </p>
              </div>
              <div className="bg-white/10 dark:bg-white/5 p-4 rounded-2xl border border-white/15 text-center shrink-0">
                <span className="block text-xs uppercase tracking-wider text-[#d7f78c] font-semibold">
                  Calibrated Fit
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-extrabold text-[#d7f78c] my-1">
                  {updatedCareerFits[0].fitPercentage}%
                </div>
                <span className="text-[11px] text-slate-300">Weighted Fit</span>
              </div>
            </div>

            {/* Quick compare of top 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
              {updatedCareerFits.slice(0, 3).map((fit, idx) => (
                <div key={fit.career.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[#d7f78c] font-mono text-[11px] block font-bold">
                    Rank #{idx + 1} • {fit.fitPercentage}% Fit
                  </span>
                  <span className="font-bold text-white block mt-0.5">{fit.career.title}</span>
                  <span className="text-slate-300 text-[11px] line-clamp-1 mt-1">{fit.dominantStrength}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('careers')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#d7f78c] hover:bg-[#cbf476] text-[#17333b] font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
              >
                <BriefcaseIcon className="w-4 h-4" />
                Explore All 5 Calibrated Careers
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>

          {/* Attempt History Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Historical Records
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display mt-0.5">
                  Aptitude Screening History ({quizAttempts.length} Attempts)
                </h3>
              </div>
              {quizAttempts.length > 1 && (
                <button
                  onClick={onClearQuizAttempts}
                  className="min-h-[44px] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2"
                >
                  Clear History
                </button>
              )}
            </div>

            {/* Sparkline / Trend visualization */}
            {quizAttempts.length > 1 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Performance Progression Over Time (Score / 100)
                </span>
                <div className="flex items-end gap-2 h-24 pt-2">
                  {quizAttempts.map((att, i) => (
                    <div key={att.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full rounded-t-md bg-[#276459] dark:bg-[#d7f78c] transition-all hover:opacity-80"
                        style={{ height: `${Math.max(12, (att.overallScore / 100) * 80)}px` }}
                      />
                      <span className="text-[10px] font-mono text-slate-500">#{i + 1}</span>
                      <div className="hidden group-hover:block absolute -top-8 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow z-10 whitespace-nowrap">
                        {att.overallScore} pts ({att.dateLabel})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-sans font-bold">Attempt</th>
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-center">Mode</th>
                    <th className="px-4 py-2.5 text-center">Overall</th>
                    <th className="px-4 py-2.5 text-center">Prog</th>
                    <th className="px-4 py-2.5 text-center">Anal</th>
                    <th className="px-4 py-2.5 text-center">Comm</th>
                    <th className="px-4 py-2.5 text-center">Design</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {quizAttempts.map((att, idx) => (
                    <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-bold font-sans">#{idx + 1}</td>
                      <td className="px-4 py-2.5 text-slate-500">{att.dateLabel}</td>
                      <td className="px-4 py-2.5 text-center uppercase text-[10px]">{att.mode}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-[#1b4e45] dark:text-[#d7f78c]">{att.overallScore}</td>
                      <td className="px-4 py-2.5 text-center">{att.domainScores.programming}</td>
                      <td className="px-4 py-2.5 text-center">{att.domainScores.analytical}</td>
                      <td className="px-4 py-2.5 text-center">{att.domainScores.communication}</td>
                      <td className="px-4 py-2.5 text-center">{att.domainScores.design}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. HISTORY VIEW                                          */}
      {/* ======================================================== */}
      {viewState === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
                Saved Diagnostic Screenings
              </span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">
                Aptitude Attempt History
              </h1>
            </div>
            <button
              onClick={() => setViewState('intro')}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Back to Quiz Overview
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            {quizAttempts.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No quiz attempts recorded yet. Start a Quick (12 Q) or Full (24 Q) screening!
              </p>
            ) : (
              <div className="space-y-3">
                {quizAttempts.slice().reverse().map((att, idx) => (
                  <div
                    key={att.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {att.mode}
                        </span>
                        <span className="text-xs text-slate-500">{att.dateLabel}</span>
                        <span className="text-xs text-slate-400">• {formatTime(att.timeTakenSeconds)}</span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Programming: {att.domainScores.programming} • Analytical: {att.domainScores.analytical} • Comm: {att.domainScores.communication} • Design: {att.domainScores.design}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-[11px] text-slate-500 uppercase">Score</span>
                        <span className="text-lg font-mono font-extrabold text-[#1b4e45] dark:text-[#d7f78c]">
                          {att.overallScore}/100
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentAttempt(att);
                          setViewState('results');
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Inspect Report →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
