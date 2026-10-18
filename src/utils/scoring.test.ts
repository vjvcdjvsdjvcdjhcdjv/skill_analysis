import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDomainScore,
  sanitizeDomainMetrics,
  DEMO_PROFILE,
} from './scoring.ts';

test('calculateDomainScore: accurately calculates DEMO_PROFILE benchmark scores', () => {
  const pScore = calculateDomainScore(DEMO_PROFILE.domainMetrics.programming).score;
  const aScore = calculateDomainScore(DEMO_PROFILE.domainMetrics.analytical).score;
  const cScore = calculateDomainScore(DEMO_PROFILE.domainMetrics.communication).score;
  const dScore = calculateDomainScore(DEMO_PROFILE.domainMetrics.design).score;

  assert.strictEqual(pScore, 76, 'Programming score should be 76');
  assert.strictEqual(aScore, 28, 'Analytical score should be 28');
  assert.strictEqual(cScore, 68, 'Communication score should be 68');
  assert.strictEqual(dScore, 22, 'Design score should be 22');
});

test('calculateDomainScore: safely handles undefined and null without throwing TypeError', () => {
  // Must not throw "TypeError: Cannot read properties of undefined (reading 'marks')"
  assert.doesNotThrow(() => {
    const res = calculateDomainScore(undefined);
    assert.strictEqual(typeof res.score, 'number');
    assert.strictEqual(res.hasMarks, false);
  });

  assert.doesNotThrow(() => {
    const res = calculateDomainScore(null);
    assert.strictEqual(typeof res.score, 'number');
    assert.strictEqual(res.hasMarks, false);
  });

  assert.doesNotThrow(() => {
    // Partial metrics missing marks
    const res = calculateDomainScore({ confidence: 80, practice: 70, skill: 60 } as any);
    assert.strictEqual(res.hasMarks, false);
    assert.strictEqual(typeof res.score, 'number');
  });
});

test('calculateDomainScore: correctly rescales when marks are null', () => {
  const res = calculateDomainScore({
    marks: null,
    confidence: 100,
    practice: 100,
    skill: 100,
  });

  assert.strictEqual(res.hasMarks, false);
  assert.strictEqual(res.score, 100);
});

test('sanitizeDomainMetrics: guarantees all 4 domains exist with valid numbers', () => {
  const emptyResult = sanitizeDomainMetrics({});
  assert.ok(emptyResult.programming);
  assert.ok(emptyResult.analytical);
  assert.ok(emptyResult.communication);
  assert.ok(emptyResult.design);
  assert.strictEqual(emptyResult.programming.marks, null);
  assert.strictEqual(emptyResult.programming.confidence, 50);

  const partialResult = sanitizeDomainMetrics({
    programming: { marks: 85 },
  });
  assert.strictEqual(partialResult.programming.marks, 85);
  assert.strictEqual(partialResult.programming.confidence, 50);
  assert.strictEqual(partialResult.design.confidence, 50);

  const nullResult = sanitizeDomainMetrics(null);
  assert.strictEqual(nullResult.programming.confidence, 50);
});
