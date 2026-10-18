/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Assessment View
 */

import React, { useState } from 'react';
import { PageId } from '../components/TopBar.tsx';
import {
  ASSESSMENT_QUESTIONS,
  DOMAINS,
} from '../utils/scoring.ts';
import {
  CheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  InfoIcon,
} from '../components/icons.tsx';

interface AssessmentViewProps {
  answers: Record<string, number>;
  onAnswerChange: (questionId: string, value: number) => void;
  onSubmitAssessment: () => void;
  onNavigate: (page: PageId) => void;
  onLoadDemo: () => void;
  onLoadSample: () => void;
}

export function AssessmentView({
  answers,
  onAnswerChange,
  onSubmitAssessment,
  onNavigate,
  onLoadDemo,
  onLoadSample,
}: AssessmentViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const totalQuestions = ASSESSMENT_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const currentQuestion = ASSESSMENT_QUESTIONS[currentStepIndex];
  const currentDomain = DOMAINS[currentQuestion.domain];
  const selectedValue = answers[currentQuestion.id];

  const handleNext = () => {
    if (currentStepIndex < totalQuestions - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onSubmitAssessment();
      onNavigate('dashboard');
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="space-y-1">
        <div className="text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
          Student Competency Evaluation
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display">
          Strengths Self-Assessment
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Answer 8 targeted questions reflecting your regular habits, debugging conviction, and problem decomposition.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <InfoIcon className="w-4 h-4 text-[#1b4e45] dark:text-[#d7f78c] shrink-0" />
            <span>
              <strong>Honest Self-Assessment:</strong> Reflect on your typical week. No one is grading this; accurate self-reflection yields trustworthy career roadmaps.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onLoadSample}
              className="min-h-[44px] text-xs font-bold text-[#1b4e45] dark:text-[#d7f78c] hover:underline whitespace-nowrap"
            >
              Fill Sample
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={onLoadDemo}
              className="min-h-[44px] text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline whitespace-nowrap"
            >
              Demo (76, 28, 68, 22)
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>
              Question <span className="font-mono text-slate-900 dark:text-white font-bold">{currentStepIndex + 1}</span> of <span className="font-mono">{totalQuestions}</span>
            </span>
            <span className="font-mono tabular-nums text-[#1b4e45] dark:text-[#d7f78c] font-bold">
              {progressPercent}% Complete
            </span>
          </div>
          
          <div
            className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[#1b4e45] dark:bg-[#d7f78c] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-1">
          {ASSESSMENT_QUESTIONS.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Jump to question ${idx + 1}`}
                className={`flex-1 min-w-[44px] min-h-[44px] rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#276459] ${
                  isCurrent
                    ? 'bg-[#17333b] text-white dark:bg-[#d7f78c] dark:text-[#17333b] ring-2 ring-[#1b4e45]/50 shadow-xs'
                    : isAnswered
                    ? 'bg-[#276459]/15 text-[#1b4e45] dark:bg-[#d7f78c]/20 dark:text-[#d7f78c]'
                    : 'bg-white dark:bg-slate-800/80 text-slate-500 border border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {isAnswered && !isCurrent ? <CheckIcon className="w-4 h-4" /> : idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentDomain.color }}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {currentDomain.name}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {currentQuestion.metricType === 'practice' ? 'Practice & Habits (40% Weight)' : 'Confidence & Judgment (30% Weight)'}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-[#17333b] dark:text-white font-display leading-snug">
            {currentQuestion.prompt}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {currentQuestion.explanation}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {currentQuestion.options.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <button
                type="button"
                aria-pressed={isSelected}
                key={opt.value}
                onClick={() => onAnswerChange(currentQuestion.id, opt.value)}
                className={`w-full text-left p-4 min-h-[44px] rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 group hover:-translate-y-0.5 ${
                  isSelected
                    ? 'border-[#1b4e45] bg-[#276459]/10 dark:border-[#d7f78c] dark:bg-[#d7f78c]/15 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'border-[#1b4e45] bg-[#1b4e45] text-white dark:border-[#d7f78c] dark:bg-[#d7f78c] dark:text-[#17333b]'
                      : 'border-slate-400 dark:border-slate-600 group-hover:border-slate-500'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white dark:bg-[#17333b]" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {opt.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                      {opt.value} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-[#276459] ${
              currentStepIndex === 0
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={selectedValue === undefined}
            className={`min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#276459] ${
              selectedValue === undefined
                ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500'
                : 'bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] hover:-translate-y-0.5'
            }`}
          >
            <span>
              {currentStepIndex === totalQuestions - 1 ? 'Save Snapshot & View Dashboard' : 'Next Question'}
            </span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {answeredCount === totalQuestions && (
        <div className="p-4 rounded-2xl bg-[#eaf4ed] dark:bg-[#132c33] border border-[#276459]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#1b4e45] dark:text-[#d7f78c]">
            <CheckCircleIcon className="w-5 h-5 shrink-0" />
            <span className="font-semibold">
              All 8 questions answered! Your progress is preserved and ready for review.
            </span>
          </div>
          <button
            onClick={() => {
              onSubmitAssessment();
              onNavigate('dashboard');
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1b4e45] dark:bg-[#d7f78c] text-white dark:text-[#17333b] font-bold text-xs whitespace-nowrap shadow-xs hover:-translate-y-0.5 transition-transform"
          >
            Open Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
