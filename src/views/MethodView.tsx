/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Methodology & Scoring Engine Walkthrough
 */

import React, { useState } from 'react';
import { PageId } from '../components/TopBar.tsx';
import {
  calculateDomainScore,
  calculateCombinedScore,
  SELF_REPORTED_WEIGHT,
  QUIZ_WEIGHT,
  CAREERS,
} from '../utils/scoring.ts';
import {
  CalculatorIcon,
  InfoIcon,
  SparklesIcon,
  ZapIcon,
} from '../components/icons.tsx';

interface MethodViewProps {
  onNavigate: (page: PageId) => void;
}

export function MethodView({ onNavigate }: MethodViewProps) {
  const [simMarksEnabled, setSimMarksEnabled] = useState<boolean>(true);
  const [simMarks, setSimMarks] = useState<number>(80);
  const [simConf, setSimConf] = useState<number>(70);
  const [simPrac, setSimPrac] = useState<number>(80);
  const [simSkill, setSimSkill] = useState<number>(70);

  const [simQuizEnabled, setSimQuizEnabled] = useState<boolean>(true);
  const [simQuizScore, setSimQuizScore] = useState<number>(85);

  const simResult = calculateDomainScore({
    marks: simMarksEnabled ? simMarks : null,
    confidence: simConf,
    practice: simPrac,
    skill: simSkill,
  });

  const simCalibratedScore = simQuizEnabled
    ? calculateCombinedScore(simResult.score, simQuizScore)
    : simResult.score;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16">
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
          <CalculatorIcon className="w-4 h-4" />
          <span>Algorithmic Transparency</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display">
          How SkillPath AI Scoring Works
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
          A 100% deterministic, auditable mathematical framework designed for undergraduate students. No opaque neural networks, zero hallucinated weights, and full formula disclosure.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3.5 text-xs text-amber-900 dark:text-amber-200">
        <InfoIcon className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block font-semibold">Honest Assessment Notice ("Self-Reported & Screening, Not Validated"):</strong>
          <p className="leading-relaxed">
            SkillPath AI relies on self-reported habit estimates, subjective confidence, self-supplied marks, and an objective screening quiz. It is not an accredited certification or standardized IQ exam. Its sole purpose is exploratory: providing students with a transparent compass to prioritize their 30-day independent learning projects.
          </p>
        </div>
      </div>

      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c] uppercase tracking-wider">
            Formula 1.0
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">
            Deterministic Domain Weighting
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Each domain score is a convex linear combination of four verifiable student signals:
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#f6f8f6] dark:bg-[#0e1c20] border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm text-[#17333b] dark:text-[#d7f78c] overflow-x-auto text-center font-bold">
          Domain Score = 0.20 * Marks + 0.30 * Confidence + 0.40 * Practice + 0.10 * Skill
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
            <span className="font-mono text-base font-extrabold text-[#1b4e45] dark:text-[#d7f78c] block">
              40% Practice
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block mt-1">
              Highest Factor
            </span>
            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
              Daily coding or problem-solving habits are the #1 predictor of engineering competence.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
            <span className="font-mono text-base font-extrabold text-[#1b4e45] dark:text-[#d7f78c] block">
              30% Confidence
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block mt-1">
              Second Factor
            </span>
            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
              Independent debugging conviction and resilience when confronting unfamiliar runtime failures.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
            <span className="font-mono text-base font-extrabold text-[#1b4e45] dark:text-[#d7f78c] block">
              20% Marks
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block mt-1">
              Optional Academic Anchor
            </span>
            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
              Coursework grades from midterm or final syllabus evaluations when available.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
            <span className="font-mono text-base font-extrabold text-[#1b4e45] dark:text-[#d7f78c] block">
              10% Skill
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block mt-1">
              Self-Perception Anchor
            </span>
            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
              Self-rated proficiency index, damped to 10% to prevent inflation or imposter bias.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            Rescaling Mechanics When Academic Marks Are Omitted
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            If a student has not taken formal coursework in a domain (e.g. self-taught UI Design), academic marks are excluded. To guarantee scores remain strictly on the 0-100 scale, the remaining weights are rescaled over their remaining sum (0.30 + 0.40 + 0.10 = 0.80):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400 text-[11px] block font-bold">Confidence:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">0.30 / 0.80 = 37.5%</span>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400 text-[11px] block font-bold">Practice:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">0.40 / 0.80 = 50.0%</span>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400 text-[11px] block font-bold">Skill:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">0.10 / 0.80 = 12.5%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c] uppercase tracking-wider">
            Formula 2.0
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">
            Aptitude Quiz Calibration & Weighting
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            When a student completes an Aptitude Quiz screening, their self-reported baseline is calibrated using named deterministic constants:
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#f6f8f6] dark:bg-[#0e1c20] border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm text-[#17333b] dark:text-[#d7f78c] overflow-x-auto text-center font-bold">
          Final Domain Score = {SELF_REPORTED_WEIGHT.toFixed(1)} * Self-Reported Score + {QUIZ_WEIGHT.toFixed(1)} * Measured Quiz Score
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
            <span className="font-mono text-sm font-bold text-[#1b4e45] dark:text-[#d7f78c] block uppercase">
              60% Self-Reported Foundation
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Captures longitudinal study consistency, weekly project execution habits, and independent debugging tenacity. Prevents single-session testing variance or fatigue from artificially wiping out weeks of sustained practice.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
            <span className="font-mono text-sm font-bold text-[#1b4e45] dark:text-[#d7f78c] block uppercase">
              40% Measured Aptitude Check
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Provides an objective verification of real problem-solving heuristics: tracing code execution, analyzing data ratios, reviewing technical grammar, and evaluating UI hierarchy and touch ergonomics.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <strong className="text-slate-800 dark:text-slate-200 block">Strict Backward Compatibility Guarantee:</strong>
          <p>
            If no quiz has been taken yet, the weighting factor is strictly 100% self-reported (Formula 1.0), guaranteeing that initial profiles and benchmarks work identically to standard defaults.
          </p>
        </div>
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c] uppercase tracking-wider">
              Interactive Sandbox
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">
              Live Formula Simulator
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Adjust variables in real-time to observe deterministic calculation and rescaling.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Include Course Marks:
            </label>
            <button
              onClick={() => setSimMarksEnabled(!simMarksEnabled)}
              aria-label={simMarksEnabled ? 'Disable course marks' : 'Enable course marks'}
              className={`w-12 h-7 min-h-[44px] flex items-center rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-[#276459] ${
                simMarksEnabled ? 'bg-[#1b4e45] dark:bg-[#d7f78c]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white dark:bg-[#17333b] absolute top-1 transition-transform ${
                  simMarksEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">Practice Habits ({Math.round(simResult.weights.practice * 100)}% weight)</span>
              <span className="font-mono font-bold">{simPrac} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simPrac}
              onChange={(e) => setSimPrac(Number(e.target.value))}
              className="w-full accent-[#1b4e45] dark:accent-[#d7f78c] cursor-pointer min-h-[44px]"
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-medium">
              Contribution: {simResult.practiceContribution} points
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">Confidence ({Math.round(simResult.weights.confidence * 100)}% weight)</span>
              <span className="font-mono font-bold">{simConf} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simConf}
              onChange={(e) => setSimConf(Number(e.target.value))}
              className="w-full accent-[#1b4e45] dark:accent-[#d7f78c] cursor-pointer min-h-[44px]"
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-medium">
              Contribution: {simResult.confidenceContribution} points
            </span>
          </div>

          <div className={`space-y-2 ${!simMarksEnabled ? 'opacity-40' : ''}`}>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Academic Marks ({simMarksEnabled ? '20% weight' : 'Excluded & Rescaled'})
              </span>
              <span className="font-mono font-bold">{simMarksEnabled ? `${simMarks} pts` : 'N/A'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              disabled={!simMarksEnabled}
              value={simMarks}
              onChange={(e) => setSimMarks(Number(e.target.value))}
              className="w-full accent-[#1b4e45] dark:accent-[#d7f78c] cursor-pointer min-h-[44px]"
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-medium">
              Contribution: {simResult.marksContribution} points
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">Skill Self-Rating ({Math.round(simResult.weights.skill * 100)}% weight)</span>
              <span className="font-mono font-bold">{simSkill} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simSkill}
              onChange={(e) => setSimSkill(Number(e.target.value))}
              className="w-full accent-[#1b4e45] dark:accent-[#d7f78c] cursor-pointer min-h-[44px]"
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-medium">
              Contribution: {simResult.skillContribution} points
            </span>
          </div>

          <div className="sm:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ZapIcon className="w-3.5 h-3.5 text-[#1b4e45] dark:text-[#d7f78c]" />
                  Aptitude Diagnostic Screening (40% Weight):
                </label>
                <button
                  onClick={() => setSimQuizEnabled(!simQuizEnabled)}
                  className={`w-10 h-6 min-h-[44px] flex items-center rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-[#276459] ${
                    simQuizEnabled ? 'bg-[#1b4e45] dark:bg-[#d7f78c]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white dark:bg-[#17333b] absolute top-1 transition-transform ${
                      simQuizEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {simQuizEnabled ? `Measured Quiz Score: ${simQuizScore} pts` : 'Quiz Not Included (100% Self-Reported)'}
              </span>
            </div>
            {simQuizEnabled && (
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simQuizScore}
                  onChange={(e) => setSimQuizScore(Number(e.target.value))}
                  className="w-full accent-[#1b4e45] dark:accent-[#d7f78c] cursor-pointer min-h-[44px]"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>0 pts (Needs Practice)</span>
                  <span>Screening Score: {simQuizScore} pts</span>
                  <span>100 pts (Flawless)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#17333b] text-white dark:bg-[#0e1c20] dark:border dark:border-[#276459]/40 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-[#d7f78c] tracking-wider block">
              {simQuizEnabled ? 'Calibrated Final Domain Score' : 'Baseline Self-Reported Score'}
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold font-mono text-white flex items-baseline gap-2">
              {simCalibratedScore}
              <span className="text-sm font-sans text-slate-300 font-normal">/ 100 points</span>
            </div>
            <div className="text-xs text-slate-300 font-mono pt-1">
              {simQuizEnabled ? (
                <>
                  Blended Formula: <span className="text-[#d7f78c] font-bold">0.60 * {simResult.score} (Self) + 0.40 * {simQuizScore} (Quiz) = {simCalibratedScore} pts</span>
                </>
              ) : (
                <>
                  Self-Reported Only: {simResult.hasMarks ? '0.20M + 0.30C + 0.40P + 0.10S' : '0.375C + 0.50P + 0.125S (Rescaled)'}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setSimMarksEnabled(true);
                setSimMarks(80);
                setSimConf(70);
                setSimPrac(80);
                setSimSkill(70);
                setSimQuizEnabled(false);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/20 transition-colors flex items-center justify-center"
            >
              Load Demo Baseline (76 pts)
            </button>
            <button
              onClick={() => onNavigate('quiz')}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#d7f78c] text-[#17333b] hover:bg-[#cbf476] text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <ZapIcon className="w-3.5 h-3.5" />
              Take Actual Quiz
            </button>
          </div>
        </div>
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-mono font-bold text-[#1b4e45] dark:text-[#d7f78c] uppercase tracking-wider">
            Formula 3.0
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">
            Career Pathway Fit Algorithm
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Career match percentage is calculated as the normalized dot product between the student's domain vector and the career competency matrix:
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                <th className="py-2.5 px-3">Career Pathway</th>
                <th className="py-2.5 px-3">Programming</th>
                <th className="py-2.5 px-3">Analytical</th>
                <th className="py-2.5 px-3">Communication</th>
                <th className="py-2.5 px-3">Design</th>
                <th className="py-2.5 px-3">Demo Score Fit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {CAREERS.map((c) => {
                const isFrontend = c.id === 'frontend-developer';
                return (
                  <tr
                    key={c.id}
                    className={isFrontend ? 'bg-[#d7f78c]/15 dark:bg-[#d7f78c]/10 font-bold' : ''}
                  >
                    <td className="py-3 px-3 font-sans text-slate-900 dark:text-white">
                      {c.title} {isFrontend && '• Top Match'}
                    </td>
                    <td className="py-3 px-3">{Math.round(c.weights.programming * 100)}%</td>
                    <td className="py-3 px-3">{Math.round(c.weights.analytical * 100)}%</td>
                    <td className="py-3 px-3">{Math.round(c.weights.communication * 100)}%</td>
                    <td className="py-3 px-3">{Math.round(c.weights.design * 100)}%</td>
                    <td className="py-3 px-3 text-[#1b4e45] dark:text-[#d7f78c] font-extrabold">
                      {isFrontend ? '64%' : c.id === 'cybersecurity-explorer' ? '53%' : c.id === 'product-management-explorer' ? '52%' : c.id === 'data-analyst' ? '46%' : '40%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
          <SparklesIcon className="w-4 h-4" />
          <span>Student Defense Guide</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
          How Two First-Year Students Can Explain This System
        </h2>
        <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed list-disc list-inside">
          <li>
            <strong>Why not machine learning?</strong> Complex ML black-box classifiers cannot justify to a student why they were routed to a specific career. Our linear weighting is 100% deterministic, reproducible, and explainable in 30 seconds.
          </li>
          <li>
            <strong>Why is practice weighted at 40%?</strong> Coding and analytical problem-solving are psychomotor and experiential disciplines. Passive reading or exam cramming does not substitute for regular debugging practice.
          </li>
          <li>
            <strong>How does the Aptitude Quiz calibrate scores?</strong> It balances self-reported practice (60%) with objective screening (40%). If a student has high practice but lacks test heuristics, or is confident but overlooks edge cases, the 60/40 blend provides a balanced reflection of both sustained habits and immediate problem-solving skills.
          </li>
        </ul>
      </section>
    </div>
  );
}
