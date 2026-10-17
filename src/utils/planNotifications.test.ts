import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlanTaskCounts,
  shouldShowDailyPlanNotification,
  getDailyNotificationMessage,
} from './planNotifications.ts';
import type { PlanMilestone } from './scoring.ts';

const mockMilestones: PlanMilestone[] = [
  {
    dayRange: 'Days 1 - 7',
    title: 'Foundations',
    objective: 'Learn basics',
    tasks: [
      { id: 't-1', label: 'Task 1', detail: 'Details 1', estimatedMinutes: 30 },
      { id: 't-2', label: 'Task 2', detail: 'Details 2', estimatedMinutes: 45 },
    ],
  },
  {
    dayRange: 'Days 8 - 14',
    title: 'Advanced',
    objective: 'Deep dive',
    tasks: [
      { id: 't-3', label: 'Task 3', detail: 'Details 3', estimatedMinutes: 60 },
    ],
  },
];

test('getPlanTaskCounts: accurately calculates total, completed, and incomplete tasks', () => {
  // Case 1: No progress
  const res1 = getPlanTaskCounts(mockMilestones, {});
  assert.strictEqual(res1.totalTasks, 3);
  assert.strictEqual(res1.completedTasks, 0);
  assert.strictEqual(res1.incompleteTasks, 3);

  // Case 2: Partial progress (1 completed)
  const res2 = getPlanTaskCounts(mockMilestones, { 't-1': true });
  assert.strictEqual(res2.totalTasks, 3);
  assert.strictEqual(res2.completedTasks, 1);
  assert.strictEqual(res2.incompleteTasks, 2);

  // Case 3: All completed
  const res3 = getPlanTaskCounts(mockMilestones, { 't-1': true, 't-2': true, 't-3': true });
  assert.strictEqual(res3.totalTasks, 3);
  assert.strictEqual(res3.completedTasks, 3);
  assert.strictEqual(res3.incompleteTasks, 0);
});

test('shouldShowDailyPlanNotification: triggers when there are incomplete tasks and not yet notified today', () => {
  const today = '2026-10-17';
  const yesterday = '2026-10-16';

  // First time check (no previous date recorded)
  assert.strictEqual(shouldShowDailyPlanNotification(null, today, 2), true);
  assert.strictEqual(shouldShowDailyPlanNotification(undefined, today, 1), true);

  // Previous day recorded -> should notify today
  assert.strictEqual(shouldShowDailyPlanNotification(yesterday, today, 3), true);

  // Already notified today -> should NOT notify
  assert.strictEqual(shouldShowDailyPlanNotification(today, today, 3), false);

  // All tasks completed (0 incomplete) -> should NOT notify even if new day
  assert.strictEqual(shouldShowDailyPlanNotification(yesterday, today, 0), false);
  assert.strictEqual(shouldShowDailyPlanNotification(null, today, 0), false);
});

test('getDailyNotificationMessage: formats message with career title and incomplete count', () => {
  const single = getDailyNotificationMessage('Frontend Developer', 1);
  assert.match(single.message, /1 incomplete task in your Frontend Developer roadmap/);

  const multiple = getDailyNotificationMessage('Data Analyst', 5);
  assert.match(multiple.message, /5 incomplete tasks in your Data Analyst roadmap/);
});
