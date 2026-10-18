/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ============================================================================
 * STUDY VAULT ACTIONABLE PLAN INSIGHTS & SUGGESTION ENGINE
 * ============================================================================
 * Transparent, deterministic rule-based suggestion generator for student study vaults.
 * PRIVACY & COMPLIANCE NOTICE:
 * SkillPath AI does NOT inspect or read the contents of your uploaded files.
 * All suggestions are generated strictly from the assignment scores, due dates,
 * and statuses entered by the student.
 * ============================================================================
 */

import { DOMAINS, type DomainKey } from './scoring.ts';
import type { VaultItem, VaultDomain } from '../services/supabase.ts';

export interface VaultSuggestion {
  id: string;
  title: string;
  description: string;
  why: string; // Required one-line WHY explanation
  domain: VaultDomain | 'General';
  severity: 'urgent' | 'warning' | 'info' | 'success';
  suggestedAction?: string;
}

export interface DomainScoreTrend {
  domain: VaultDomain;
  scoredCount: number;
  latestAvg: number | null;
  previousAvg: number | null;
  delta: number | null;
  trendLabel: string; // e.g. "+8 points", "-3 points", or "Not enough data yet"
}

export interface AssignmentDeadlineCounts {
  onTime: number;
  late: number;
  overdue: number;
  totalAssignments: number;
}

/**
 * Calculates deadline metrics: On-time, Late, Overdue.
 * - Overdue: not submitted and due_date < today
 * - On-time: submitted and (no due_date OR submitted_at <= due_date)
 * - Late: submitted and submitted_at > due_date
 */
export function calculateDeadlineCounts(
  items: VaultItem[],
  referenceDate = new Date()
): AssignmentDeadlineCounts {
  let onTime = 0;
  let late = 0;
  let overdue = 0;
  let totalAssignments = 0;

  const todayStr = referenceDate.toISOString().split('T')[0];

  for (const item of items) {
    if (item.kind !== 'Assignment') continue;
    totalAssignments++;

    const isSubmitted = item.status === 'Submitted';
    const dueDateStr = item.due_date ? item.due_date.split('T')[0] : null;
    const submittedDateStr = item.submitted_at ? item.submitted_at.split('T')[0] : null;

    if (!isSubmitted) {
      if (dueDateStr && dueDateStr < todayStr) {
        overdue++;
      }
    } else {
      if (dueDateStr && submittedDateStr && submittedDateStr > dueDateStr) {
        late++;
      } else {
        onTime++;
      }
    }
  }

  return { onTime, late, overdue, totalAssignments };
}

/**
 * Calculates the score trend per domain:
 * Compares average of the latest up to 3 scored assignments vs previous up to 3 scored assignments.
 * Rule: Needs at least 2 scored items in that domain, otherwise returns "Not enough data yet".
 */
export function calculateDomainScoreTrend(
  items: VaultItem[],
  domain: VaultDomain
): DomainScoreTrend {
  const scoredItems = items
    .filter(
      (item) =>
        item.kind === 'Assignment' &&
        item.domain === domain &&
        item.score !== null &&
        item.score !== undefined &&
        !Number.isNaN(Number(item.score))
    )
    .sort((a, b) => {
      const dateA = a.submitted_at || a.due_date || a.created_at;
      const dateB = b.submitted_at || b.due_date || b.created_at;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

  const count = scoredItems.length;

  if (count < 2) {
    return {
      domain,
      scoredCount: count,
      latestAvg: count === 1 ? Math.round(Number(scoredItems[0].score)) : null,
      previousAvg: null,
      delta: null,
      trendLabel: 'Not enough data yet',
    };
  }

  // Split non-overlapping: latest up to 3 vs preceding up to 3
  let latestChunk: VaultItem[];
  let previousChunk: VaultItem[];

  if (count >= 6) {
    latestChunk = scoredItems.slice(-3);
    previousChunk = scoredItems.slice(-6, -3);
  } else {
    const splitIndex = Math.max(1, count - Math.min(3, Math.ceil(count / 2)));
    previousChunk = scoredItems.slice(0, splitIndex);
    latestChunk = scoredItems.slice(splitIndex);
  }

  const latestSum = latestChunk.reduce((acc, curr) => acc + Number(curr.score || 0), 0);
  const latestAvg = Math.round((latestSum / latestChunk.length) * 10) / 10;

  const prevSum = previousChunk.reduce((acc, curr) => acc + Number(curr.score || 0), 0);
  const previousAvg = Math.round((prevSum / previousChunk.length) * 10) / 10;

  const delta = Math.round((latestAvg - previousAvg) * 10) / 10;
  const trendLabel = delta > 0 ? `+${delta} points` : delta < 0 ? `${delta} points` : '0 points';

  return {
    domain,
    scoredCount: count,
    latestAvg,
    previousAvg,
    delta,
    trendLabel,
  };
}

/**
 * Maps domain name to DomainKey for competency lookups
 */
export function mapVaultDomainToKey(domain: VaultDomain): DomainKey | null {
  switch (domain) {
    case 'Programming':
      return 'programming';
    case 'Analytical thinking':
      return 'analytical';
    case 'Communication':
      return 'communication';
    case 'Design':
      return 'design';
    default:
      return null;
  }
}

/**
 * Generates 3-5 readable rule-based study suggestions with one-line WHY explanations.
 */
export function generateVaultSuggestions(
  items: VaultItem[],
  domainScores: Record<DomainKey, number>,
  referenceDate = new Date()
): VaultSuggestion[] {
  const suggestions: VaultSuggestion[] = [];
  const todayStr = referenceDate.toISOString().split('T')[0];

  const domains: VaultDomain[] = [
    'Programming',
    'Analytical thinking',
    'Communication',
    'Design',
  ];

  // -------------------------------------------------------------------------
  // RULE 1: Overdue Items (Urgent)
  // -------------------------------------------------------------------------
  const overdueAssignments = items.filter((item) => {
    if (item.kind !== 'Assignment') return false;
    if (item.status === 'Submitted') return false;
    if (!item.due_date) return false;
    return item.due_date.split('T')[0] < todayStr;
  });

  if (overdueAssignments.length > 0) {
    const mostOverdue = overdueAssignments.sort(
      (a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    )[0];

    suggestions.push({
      id: `sug_overdue_${mostOverdue.id}`,
      title: `Submit Overdue Work: "${mostOverdue.title}"`,
      description: `You have ${overdueAssignments.length} overdue assignment${overdueAssignments.length > 1 ? 's' : ''}. Prioritize submitting or updating their progress to keep your academic schedule on track.`,
      why: `WHY: Due date (${mostOverdue.due_date?.split('T')[0]}) has passed and status is currently "${mostOverdue.status || 'To do'}".`,
      domain: mostOverdue.domain,
      severity: 'urgent',
      suggestedAction: 'Mark Submitted or update timeline',
    });
  }

  // -------------------------------------------------------------------------
  // RULE 2: Falling Score Trend (Warning)
  // -------------------------------------------------------------------------
  for (const dom of domains) {
    const trend = calculateDomainScoreTrend(items, dom);
    if (trend.delta !== null && trend.delta <= -5) {
      suggestions.push({
        id: `sug_trend_${dom}`,
        title: `Address Recent Score Dip in ${dom}`,
        description: `Your recent assignment average dropped from ${trend.previousAvg} to ${trend.latestAvg}. Review feedback from recent problem sets to identify gaps.`,
        why: `WHY: Recent scores dropped by ${Math.abs(trend.delta)} points (${trend.trendLabel}) across your latest 3 submissions.`,
        domain: dom,
        severity: 'warning',
        suggestedAction: 'Create a revision note on challenging concepts',
      });
    }
  }

  // -------------------------------------------------------------------------
  // RULE 3: Weakest Competency Domain (Focus Recommendation)
  // -------------------------------------------------------------------------
  const domainKeys: DomainKey[] = ['programming', 'analytical', 'communication', 'design'];
  const sortedByScore = [...domainKeys].sort(
    (a, b) => (domainScores[a] || 0) - (domainScores[b] || 0)
  );
  const weakestKey = sortedByScore[0];
  const weakestScore = domainScores[weakestKey] || 0;
  const weakestConfig = DOMAINS[weakestKey];

  if (weakestConfig) {
    const matchingDomainName = weakestConfig.name as VaultDomain;
    suggestions.push({
      id: `sug_weakest_${weakestKey}`,
      title: `Reinforce ${weakestConfig.name} Portfolio Evidence`,
      description: `Adding structured assignments and problem sets in ${weakestConfig.name} helps you build hands-on proof-of-work in your lowest baseline domain.`,
      why: `WHY: Your competency score in ${weakestConfig.name} is currently ${weakestScore}/100, which is your lowest area.`,
      domain: matchingDomainName,
      severity: 'info',
      suggestedAction: 'Add an assignment or project artifact',
    });
  }

  // -------------------------------------------------------------------------
  // RULE 4: Domain with Notes but No Scored Work (Action Item)
  // -------------------------------------------------------------------------
  for (const dom of domains) {
    const domainNotes = items.filter((i) => i.domain === dom && i.kind === 'Note');
    const domainScored = items.filter(
      (i) => i.domain === dom && i.kind === 'Assignment' && i.score !== null && i.score !== undefined
    );

    if (domainNotes.length >= 1 && domainScored.length === 0) {
      suggestions.push({
        id: `sug_notes_untested_${dom}`,
        title: `Validate ${dom} Theory with a Scored Assignment`,
        description: `You have ${domainNotes.length} study note${domainNotes.length > 1 ? 's' : ''} in ${dom}, but have not logged any graded assignments or evaluated test scores yet.`,
        why: `WHY: You have ${domainNotes.length} note${domainNotes.length > 1 ? 's' : ''} in ${dom} but zero scored assignments to track measured mastery.`,
        domain: dom,
        severity: 'info',
        suggestedAction: 'Record an assignment score or quiz result',
      });
    }
  }

  // -------------------------------------------------------------------------
  // RULE 5: High Momentum / Consistent Mastery (Affirmation)
  // -------------------------------------------------------------------------
  if (suggestions.length < 3) {
    for (const dom of domains) {
      const trend = calculateDomainScoreTrend(items, dom);
      if (trend.latestAvg !== null && trend.latestAvg >= 80) {
        suggestions.push({
          id: `sug_mastery_${dom}`,
          title: `Strong Momentum in ${dom}`,
          description: `Your average scored work in ${dom} is ${trend.latestAvg} pts. Consider showcasing these deliverables as case studies in your capstone dossier.`,
          why: `WHY: Your recent submissions in ${dom} average ${trend.latestAvg}/100 with consistent on-time delivery.`,
          domain: dom,
          severity: 'success',
          suggestedAction: 'Feature this work in your export dossier',
        });
        break;
      }
    }
  }

  // Fallback if brand new vault
  if (suggestions.length === 0) {
    suggestions.push({
      id: 'sug_welcome_vault',
      title: 'Upload Your First Coursework Artifact',
      description: 'Log an assignment or study note to start building an auditable vault of your technical growth.',
      why: 'WHY: No vault records logged yet. Your submissions provide personalized progress trends.',
      domain: 'General',
      severity: 'info',
      suggestedAction: 'Click "Add Note or Assignment"',
    });
  }

  // Return top 3-5 suggestions, prioritizing urgent > warning > info > success
  const severityOrder = { urgent: 0, warning: 1, info: 2, success: 3 };
  return suggestions
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 5);
}
