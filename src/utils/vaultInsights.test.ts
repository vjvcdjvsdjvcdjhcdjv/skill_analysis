/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for Study Vault Insights, Deadline Counters, and Score Trend Algorithms
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeadlineCounts,
  calculateDomainScoreTrend,
  generateVaultSuggestions,
} from './vaultInsights.ts';
import type { VaultItem } from '../services/supabase.ts';

const baseDate = new Date('2026-10-17T00:00:00Z');

test('deadline counts: calculates on-time, late and overdue correctly', () => {
  const items: VaultItem[] = [
    // 1. Overdue: due yesterday, not submitted
    {
      id: 'item-1',
      user_id: 'user-1',
      title: 'Algorithms Problem Set 1',
      kind: 'Assignment',
      domain: 'Programming',
      tags: [],
      due_date: '2026-10-16',
      status: 'In progress',
      created_at: '2026-10-10T00:00:00Z',
    },
    // 2. On-time: due tomorrow, submitted
    {
      id: 'item-2',
      user_id: 'user-1',
      title: 'Database Schema Design',
      kind: 'Assignment',
      domain: 'Analytical thinking',
      tags: [],
      due_date: '2026-10-20',
      submitted_at: '2026-10-17',
      status: 'Submitted',
      created_at: '2026-10-12T00:00:00Z',
    },
    // 3. Late: due 2026-10-14, submitted 2026-10-16
    {
      id: 'item-3',
      user_id: 'user-1',
      title: 'Tech Memo Draft',
      kind: 'Assignment',
      domain: 'Communication',
      tags: [],
      due_date: '2026-10-14',
      submitted_at: '2026-10-16',
      status: 'Submitted',
      created_at: '2026-10-11T00:00:00Z',
    },
    // 4. Note (should not be counted in assignments)
    {
      id: 'item-4',
      user_id: 'user-1',
      title: 'Binary Search Notes',
      kind: 'Note',
      domain: 'Programming',
      tags: [],
      created_at: '2026-10-10T00:00:00Z',
    },
  ];

  const counts = calculateDeadlineCounts(items, baseDate);
  assert.equal(counts.totalAssignments, 3);
  assert.equal(counts.overdue, 1);
  assert.equal(counts.onTime, 1);
  assert.equal(counts.late, 1);
});

test('domain score trend: requires at least 2 scored items or reports not enough data yet', () => {
  const zeroItems: VaultItem[] = [];
  const trendZero = calculateDomainScoreTrend(zeroItems, 'Programming');
  assert.equal(trendZero.trendLabel, 'Not enough data yet');

  const oneItem: VaultItem[] = [
    {
      id: 'item-1',
      user_id: 'user-1',
      title: 'HW 1',
      kind: 'Assignment',
      domain: 'Programming',
      tags: [],
      score: 85,
      created_at: '2026-10-01T00:00:00Z',
    },
  ];
  const trendOne = calculateDomainScoreTrend(oneItem, 'Programming');
  assert.equal(trendOne.trendLabel, 'Not enough data yet');

  const multipleItems: VaultItem[] = [
    {
      id: 'item-1',
      user_id: 'user-1',
      title: 'HW 1',
      kind: 'Assignment',
      domain: 'Programming',
      tags: [],
      score: 70,
      created_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'item-2',
      user_id: 'user-1',
      title: 'HW 2',
      kind: 'Assignment',
      domain: 'Programming',
      tags: [],
      score: 80,
      created_at: '2026-10-08T00:00:00Z',
    },
  ];
  const trendMultiple = calculateDomainScoreTrend(multipleItems, 'Programming');
  assert.ok(trendMultiple.delta !== null);
  assert.equal(trendMultiple.trendLabel, '+10 points');
});

test('generateVaultSuggestions: produces 3-5 suggestions with explicit WHY rationale', () => {
  const items: VaultItem[] = [
    {
      id: 'item-overdue',
      user_id: 'user-1',
      title: 'Past Due Lab',
      kind: 'Assignment',
      domain: 'Programming',
      tags: [],
      due_date: '2026-10-15',
      status: 'To do',
      created_at: '2026-10-10T00:00:00Z',
    },
    {
      id: 'item-note',
      user_id: 'user-1',
      title: 'Typography & Layout Notes',
      kind: 'Note',
      domain: 'Design',
      tags: [],
      created_at: '2026-10-12T00:00:00Z',
    },
  ];

  const domainScores = {
    programming: 76,
    analytical: 65,
    communication: 70,
    design: 22,
  };

  const suggestions = generateVaultSuggestions(items, domainScores, baseDate);
  assert.ok(suggestions.length >= 3 && suggestions.length <= 5);

  // Every suggestion must have title, description, and explicit WHY
  for (const s of suggestions) {
    assert.ok(s.title && s.title.length > 5);
    assert.ok(s.description && s.description.length > 5);
    assert.ok(s.why.startsWith('WHY:'));
  }

  // The overdue suggestion must be marked as urgent
  const overdueSug = suggestions.find((s) => s.severity === 'urgent');
  assert.ok(overdueSug);
  assert.ok(overdueSug?.title.includes('Past Due Lab'));
});
