/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Evidence & Calibration View (#evidence)
 */

import React, { useState, useEffect } from 'react';
import { PageId } from '../components/TopBar.tsx';
import {
  BarChartIcon,
  AlertTriangleIcon,
  ClockIcon,
  ShieldIcon,
  ZapIcon,
} from '../components/icons.tsx';
import { DomainKey, DOMAINS } from '../utils/scoring.ts';
import type { QuizAttempt } from '../utils/quizBank.ts';
import { FeedbackSubmission } from '../services/supabase.ts';
import { getLocalDeviceFeedbackList } from '../components/FeedbackCard.tsx';

interface EvidenceViewProps {
  onNavigate: (page: PageId) => void;
  selfReportedScores: Record<DomainKey, number>;
  latestQuizAttempt: QuizAttempt | null;
}

export function EvidenceView({
  onNavigate,
  selfReportedScores,
  latestQuizAttempt,
}: EvidenceViewProps) {
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>([]);
  const [isCloudFeedbackPrivate, setIsCloudFeedbackPrivate] = useState<boolean>(true);

  useEffect(() => {
    const localData = getLocalDeviceFeedbackList();
    setFeedbackList(localData);
    setIsCloudFeedbackPrivate(true);
  }, []);

  const totalN = feedbackList.length;

  const averageClarity = totalN > 0
    ? (feedbackList.reduce((acc, f) => acc + f.clarityRating, 0) / totalN).toFixed(1)
    : null;
  const averageSelfMatch = totalN > 0
    ? (feedbackList.reduce((acc, f) => acc + f.selfMatchRating, 0) / totalN).toFixed(1)
    : null;

  const assessmentTimes = feedbackList
    .map((f) => f.timeToFinishAssessment)
    .filter((t): t is number => typeof t === 'number' && t > 0);
  const averageAssessmentTime = assessmentTimes.length > 0
    ? Math.round(assessmentTimes.reduce((a, b) => a + b, 0) / assessmentTimes.length)
    : null;

  const quizTimes = feedbackList
    .map((f) => f.timeToFinishQuiz)
    .filter((t): t is number => typeof t === 'number' && t > 0);
  const averageQuizTime = quizTimes.length > 0
    ? Math.round(quizTimes.reduce((a, b) => a + b, 0) / quizTimes.length)
    : null;

  const careerExpectations = feedbackList.reduce<Record<string, number>>((acc, f) => {
    acc[f.expectedCareer] = (acc[f.expectedCareer] || 0) + 1;
    return acc;
  }, {});

  const domainKeys: DomainKey[] = ['programming', 'analytical', 'communication', 'design'];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#276459]/10 text-[#1b4e45] dark:bg-[#d7f78c]/15 dark:text-[#d7f78c] text-xs font-bold uppercase tracking-wider mb-2">
          <BarChartIcon className="w-3.5 h-3.5" />
          Empirical Diagnostic Calibration
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display">
          Evidence & Diagnostic Accuracy
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Transparent metrics assessing clarity, student self-perception correlation, and measured aptitude gaps.
          Adheres to academic standards: zero prefilled or synthetic statistics.
        </p>
      </div>

      {isCloudFeedbackPrivate && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <ShieldIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Zero-Trust Privacy Rule Enforced</span>
            <p className="leading-relaxed opacity-90">
              Direct client-side reads from the Supabase <code className="font-mono font-bold bg-amber-200/40 dark:bg-amber-950/60 px-1 py-0.5 rounded">feedback</code> table are blocked by security rules to protect student confidentiality. The statistics below reflect verified feedback submissions recorded on this device.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Collected Responses & Ratings (N = {totalN})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {totalN > 0 ? `${totalN} real submission${totalN === 1 ? '' : 's'}` : 'Zero synthetic data'}
          </span>
        </div>

        {totalN === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                No data yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                No feedback responses have been submitted on this device yet. Complete the Aptitude Quiz screening or submit the check-in card on the Dashboard to record responses.
              </p>
            </div>
            <button
              onClick={() => onNavigate('quiz')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs"
            >
              <ZapIcon className="w-3.5 h-3.5" />
              <span>Take Aptitude Quiz</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Clarity Rating
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#17333b] dark:text-white font-mono">
                  {averageClarity}
                </span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Average assessment & question transparency
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Perception Match
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#17333b] dark:text-white font-mono">
                  {averageSelfMatch}
                </span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Correlation with student self-identity
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Avg Assessment Time
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#17333b] dark:text-white font-mono">
                  {averageAssessmentTime ? `${averageAssessmentTime}s` : 'N/A'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Duration to complete 8 self-report prompts
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Avg Quiz Time
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#17333b] dark:text-white font-mono">
                  {averageQuizTime ? `${averageQuizTime}s` : 'N/A'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Screening completion pacing
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Self-Reported vs Measured Aptitude Gap
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparison between your self-reported baseline (M/C/P/S) and your objective screening quiz attempt.
            </p>
          </div>
          {latestQuizAttempt && (
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
              Quiz {latestQuizAttempt.mode === 'quick' ? 'Quick (12 Q)' : 'Full (24 Q)'}
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14262b] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4 text-center">Self-Reported Baseline</th>
                <th className="py-3 px-4 text-center">Measured Screening</th>
                <th className="py-3 px-4 text-center">Delta (Measured - Self)</th>
                <th className="py-3 px-4">Qualitative Observation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {domainKeys.map((domain) => {
                const selfScore = selfReportedScores[domain];
                const quizScore = latestQuizAttempt ? latestQuizAttempt.domainScores[domain] : null;
                const delta = quizScore !== null ? quizScore - selfScore : null;
                let observation = 'Awaiting aptitude quiz screening attempt.';
                if (delta !== null) {
                  if (delta >= 15) {
                    observation = 'Underestimated confidence: measured screening outperformed self-rating significantly.';
                  } else if (delta <= -15) {
                    observation = 'Overestimated baseline: screening indicated opportunity for foundational review.';
                  } else if (Math.abs(delta) < 6) {
                    observation = 'High self-awareness: measured screening closely mirrors self-perception.';
                  } else if (delta > 0) {
                    observation = 'Moderate positive delta: student possesses latent domain intuition.';
                  } else {
                    observation = 'Moderate negative delta: minor gap between subjective practice and objective reasoning.';
                  }
                }
                return (
                  <tr key={domain} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {DOMAINS[domain].name}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {selfScore}/100
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {quizScore !== null ? (
                        <span className="font-bold text-[#1b4e45] dark:text-[#d7f78c]">
                          {quizScore}/100
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not taken yet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      {delta !== null ? (
                        <span
                          className={
                            delta > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : delta < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs">
                      {observation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!latestQuizAttempt && (
          <div className="text-right">
            <button
              onClick={() => onNavigate('quiz')}
              className="text-xs text-[#1b4e45] dark:text-[#d7f78c] hover:underline font-semibold"
            >
              Take Aptitude Quiz to populate measured scores →
            </button>
          </div>
        )}
      </div>

      {totalN > 0 && Object.keys(careerExpectations).length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Prior Career Expectations Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(careerExpectations).map(([career, count]) => {
              const pct = Math.round((count / totalN) * 100);
              return (
                <div key={career} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{career}</span>
                    <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#1b4e45] dark:bg-[#d7f78c] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Methodological Limitations & Research Disclosure
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          SkillPath AI is engineered strictly as an educational coaching and exploratory guidance tool. It is not an accredited psychometric instrument or hiring certification.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3 rounded-xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              1. Self-Reported Subjectivity
            </span>
            <p className="text-[11px] leading-relaxed">
              Confidence and practice answers reflect subjective perception and can be influenced by transient impostor syndrome, fatigue, or optimism.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              2. Short Screening Non-Validation
            </span>
            <p className="text-[11px] leading-relaxed">
              The 12-to-24 question quiz measures fast technical and design reasoning. It is not an officially normed IQ or psychometric exam.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              3. Five Tech Archetypes
            </span>
            <p className="text-[11px] leading-relaxed">
              Modern tech contains hundreds of specialized roles. The 5 pathways modeled represent broad entry trajectories, not an exhaustive job market.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              4. Sample Size Discipline
            </span>
            <p className="text-[11px] leading-relaxed">
              All quantitative metrics are computed strictly from real responses recorded on this device. When sample size N is low, variances may be elevated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
