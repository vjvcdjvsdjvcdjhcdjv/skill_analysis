/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for SkillPath AI deterministic scoring engine & Aptitude Quiz
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDomainScore,
  calculateCareerFit,
  getDemoDomainScores,
  computeScoreDeltas,
  calculateCombinedScore,
  SELF_REPORTED_WEIGHT,
  QUIZ_WEIGHT,
  DEMO_PROFILE,
  DOMAINS,
  CAREERS,
} from './scoring.ts';
import {
  QUIZ_BANK,
  generateQuizSession,
  calculateQuizResults,
  DIFFICULTY_WEIGHTS,
} from './quizBank.ts';

test('deterministic scoring with marks: 0.20 marks + 0.30 conf + 0.40 prac + 0.10 skill', () => {
  const perfect = calculateDomainScore({ marks: 100, confidence: 100, practice: 100, skill: 100 });
  assert.equal(perfect.score, 100);
  assert.equal(perfect.hasMarks, true);
  assert.equal(perfect.marksContribution, 20);
  assert.equal(perfect.confidenceContribution, 30);
  assert.equal(perfect.practiceContribution, 40);
  assert.equal(perfect.skillContribution, 10);

  const half = calculateDomainScore({ marks: 50, confidence: 50, practice: 50, skill: 50 });
  assert.equal(half.score, 50);

  const prog = calculateDomainScore({ marks: 80, confidence: 70, practice: 80, skill: 70 });
  assert.equal(prog.score, 76);
});

test('deterministic scoring without marks: excluded and rescaled across 0.80 remaining', () => {
  const noMarks = calculateDomainScore({ marks: null, confidence: 80, practice: 80, skill: 80 });
  assert.equal(noMarks.score, 80);
  assert.equal(noMarks.hasMarks, false);
  assert.equal(noMarks.marksContribution, 0);
  assert.equal(noMarks.weights.confidence, 0.375);
  assert.equal(noMarks.weights.practice, 0.5);
  assert.equal(noMarks.weights.skill, 0.125);

  const varied = calculateDomainScore({ marks: undefined, confidence: 100, practice: 50, skill: 20 });
  assert.equal(varied.score, 65);
});

test('demo profile non-negotiable rule: domain scores must be 76, 28, 68, 22', () => {
  const demoScores = getDemoDomainScores();
  assert.equal(demoScores.programming, 76, 'Programming must equal 76');
  assert.equal(demoScores.analytical, 28, 'Analytical thinking must equal 28');
  assert.equal(demoScores.communication, 68, 'Communication must equal 68');
  assert.equal(demoScores.design, 22, 'Design must equal 22');
});

test('demo profile non-negotiable rule: Frontend Developer is top ranked career', () => {
  const demoScores = getDemoDomainScores();
  const ranked = calculateCareerFit(demoScores, CAREERS);
  assert.ok(ranked.length === 5, 'Must evaluate all 5 careers');
  assert.equal(ranked[0].career.id, 'frontend-developer', 'Top career must be Frontend Developer');
  assert.ok(ranked[0].fitPercentage > ranked[1].fitPercentage, 'Frontend Developer must have highest fit %');
});

test('history snapshots: computeScoreDeltas accurately measures progress', () => {
  const prev = { programming: 60, analytical: 25, communication: 60, design: 30 };
  const latest = { programming: 76, analytical: 28, communication: 68, design: 22 };
  const deltas = computeScoreDeltas(prev, latest);

  assert.equal(deltas.find(d => d.domain === 'programming')?.delta, 16);
  assert.equal(deltas.find(d => d.domain === 'analytical')?.delta, 3);
  assert.equal(deltas.find(d => d.domain === 'communication')?.delta, 8);
  assert.equal(deltas.find(d => d.domain === 'design')?.delta, -8);
});

test('quiz score integration: domain score = 0.6 * existing + 0.4 * quiz', () => {
  assert.equal(SELF_REPORTED_WEIGHT, 0.6, 'SELF_REPORTED_WEIGHT must be 0.6');
  assert.equal(QUIZ_WEIGHT, 0.4, 'QUIZ_WEIGHT must be 0.4');

  // When no quiz exists: return existing untouched
  assert.equal(calculateCombinedScore(76, null), 76);
  assert.equal(calculateCombinedScore(76, undefined), 76);

  // When quiz exists: 0.6 * 80 + 0.4 * 90 = 48 + 36 = 84
  assert.equal(calculateCombinedScore(80, 90), 84);

  // 0.6 * 76 + 0.4 * 100 = 45.6 + 40 = 85.6 -> round to 86
  assert.equal(calculateCombinedScore(76, 100), 86);

  // 0.6 * 50 + 0.4 * 50 = 50
  assert.equal(calculateCombinedScore(50, 50), 50);
});

test('quiz bank contains exactly 32 questions: 8 per domain with valid options and correct index', () => {
  assert.equal(QUIZ_BANK.length, 32, 'Must have 32 questions total');
  const domains = ['programming', 'analytical', 'communication', 'design'] as const;
  for (const dom of domains) {
    const domQuestions = QUIZ_BANK.filter(q => q.domain === dom);
    assert.equal(domQuestions.length, 8, `Domain ${dom} must have exactly 8 questions`);
    for (const q of domQuestions) {
      assert.ok(q.id, 'Question must have id');
      assert.ok(q.prompt && q.prompt.length > 5, 'Question must have clear prompt');
      assert.equal(q.options.length, 4, 'Must have exactly 4 options');
      assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3, 'Correct index must be 0-3');
      assert.ok(q.explanation && q.explanation.length > 5, 'Must have explanation');
      assert.ok([1, 2, 3].includes(q.difficulty), 'Difficulty must be 1, 2, or 3');
    }
  }
});

test('generateQuizSession generates balanced Quick (12) and Full (24) sessions', () => {
  const quickSession = generateQuizSession('quick');
  assert.equal(quickSession.length, 12, 'Quick mode must have 12 questions');
  assert.equal(quickSession.filter(q => q.domain === 'programming').length, 3);
  assert.equal(quickSession.filter(q => q.domain === 'analytical').length, 3);
  assert.equal(quickSession.filter(q => q.domain === 'communication').length, 3);
  assert.equal(quickSession.filter(q => q.domain === 'design').length, 3);

  const fullSession = generateQuizSession('full');
  assert.equal(fullSession.length, 24, 'Full mode must have 24 questions');
  assert.equal(fullSession.filter(q => q.domain === 'programming').length, 6);
  assert.equal(fullSession.filter(q => q.domain === 'analytical').length, 6);
  assert.equal(fullSession.filter(q => q.domain === 'communication').length, 6);
  assert.equal(fullSession.filter(q => q.domain === 'design').length, 6);
});

test('calculateQuizResults scores difficulty-weighted accuracy and determines strongest domain', () => {
  const session = generateQuizSession('quick');

  // 1. All correct: overallScore 100, all domains 100
  const allCorrectAnswers: Record<string, number> = {};
  session.forEach((q) => {
    allCorrectAnswers[q.id] = q.correctIndex;
  });
  const perfectResult = calculateQuizResults(session, allCorrectAnswers, 120, 'quick');
  assert.equal(perfectResult.totalQuestions, 12);
  assert.equal(perfectResult.correctQuestions, 12);
  assert.equal(perfectResult.overallScore, 100);
  assert.equal(perfectResult.domainScores.programming, 100);
  assert.equal(perfectResult.domainScores.analytical, 100);
  assert.equal(perfectResult.domainScores.communication, 100);
  assert.equal(perfectResult.domainScores.design, 100);

  // 2. Only programming correct: programming is 100, others 0, strongestDomain is programming
  const progOnlyAnswers: Record<string, number> = {};
  session.forEach((q) => {
    if (q.domain === 'programming') {
      progOnlyAnswers[q.id] = q.correctIndex;
    } else {
      progOnlyAnswers[q.id] = (q.correctIndex + 1) % 4;
    }
  });
  const progResult = calculateQuizResults(session, progOnlyAnswers, 95, 'quick');
  assert.equal(progResult.correctQuestions, 3);
  assert.equal(progResult.domainScores.programming, 100);
  assert.equal(progResult.domainScores.analytical, 0);
  assert.equal(progResult.domainScores.communication, 0);
  assert.equal(progResult.domainScores.design, 0);
  assert.equal(progResult.strongestDomain, 'programming');
  assert.ok(progResult.overallScore > 0 && progResult.overallScore < 100);
});
