/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Plan notification utility functions for daily incomplete task check
 */

import type { PlanMilestone } from './scoring.ts';

export const DAILY_NOTIFICATION_STORAGE_KEY = 'skillpath_last_daily_plan_check';

/**
 * Calculates total and incomplete tasks count for a career plan
 */
export function getPlanTaskCounts(
  milestones: PlanMilestone[] = [],
  taskProgress: Record<string, boolean> = {}
): { totalTasks: number; completedTasks: number; incompleteTasks: number } {
  const allTasks = milestones.flatMap((m) => m.tasks || []);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => Boolean(taskProgress[t.id])).length;
  const incompleteTasks = Math.max(0, totalTasks - completedTasks);

  return {
    totalTasks,
    completedTasks,
    incompleteTasks,
  };
}

/**
 * Determines whether a daily notification should be shown based on:
 * - date of last notification check vs current date (YYYY-MM-DD)
 * - number of incomplete tasks in the active career plan
 */
export function shouldShowDailyPlanNotification(
  lastNotificationDate: string | null | undefined,
  currentDateStr: string,
  incompleteTasksCount: number
): boolean {
  // If no incomplete tasks remaining, no reminder needed
  if (incompleteTasksCount <= 0) {
    return false;
  }

  // If already notified today, do not show again
  if (lastNotificationDate === currentDateStr) {
    return false;
  }

  // Has incomplete tasks and has not been notified today
  return true;
}

/**
 * Formats the daily notification toast message
 */
export function getDailyNotificationMessage(
  careerTitle: string,
  incompleteCount: number
): { title: string; message: string } {
  return {
    title: 'Daily Action Plan Reminder',
    message: `You have ${incompleteCount} incomplete ${
      incompleteCount === 1 ? 'task' : 'tasks'
    } in your ${careerTitle} roadmap. Keep your momentum going!`,
  };
}
