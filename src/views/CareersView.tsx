/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Careers View:
 * Comprehensive exploration of all 5 tech career pathways,
 * comparative domain weights, competencies, starter capstones,
 * and direct routing into the 30-day action plan.
 */

import React, { useState } from 'react';
import { PageId } from '../components/TopBar.tsx';
import {
  CareerFitResult,
  CareerProfile,
  DomainKey,
  DOMAINS,
} from '../utils/scoring.ts';
import {
  BriefcaseIcon,
  SparklesIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  InfoIcon,
} from '../components/icons.tsx';
import { CountUp } from '../components/CountUp.tsx';

interface CareersViewProps {
  careerFits: CareerFitResult[];
  selectedCareerId: string;
  onSelectCareerForPlan: (careerId: string) => void;
  onNavigate: (page: PageId) => void;
}

export function CareersView({
  careerFits,
  selectedCareerId,
  onSelectCareerForPlan,
  onNavigate,
}: CareersViewProps) {
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string>(careerFits[0]?.career.id || 'frontend-developer');

  const filteredCareers = careerFits.filter((fit) => {
    if (filterDomain === 'all') return true;
    return fit.career.weights[filterDomain as DomainKey] >= 0.25;
  });

  const handleChoosePlan = (careerId: string) => {
    onSelectCareerForPlan(careerId);
    onNavigate('plan');
  };

  return (
    <div className="space-y-10 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#14262b] border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
            Pathway Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17333b] dark:text-white font-display mt-1">
            5 High-Impact Tech Career Pathways
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Ranked by weighted alignment with your 4 domain scores. Every pathway includes actionable entry-level competencies and starter capstones.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-x-auto">
          <button
            onClick={() => setFilterDomain('all')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#276459] ${
              filterDomain === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            All Tracks
          </button>
          <button
            onClick={() => setFilterDomain('programming')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#276459] ${
              filterDomain === 'programming'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Code Heavy
          </button>
          <button
            onClick={() => setFilterDomain('analytical')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#276459] ${
              filterDomain === 'analytical'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setFilterDomain('communication')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#276459] ${
              filterDomain === 'communication'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Communication
          </button>
          <button
            onClick={() => setFilterDomain('design')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#276459] ${
              filterDomain === 'design'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Design
          </button>
        </div>
      </div>

      {/* Career Cards List */}
      <div className="space-y-6">
        {filteredCareers.map((fit, idx) => {
          const career = fit.career;
          const isSelected = selectedCareerId === career.id;
          const isExpanded = expandedId === career.id;
          const isTopRank = idx === 0;

          return (
            <div
              key={career.id}
              className={`p-6 sm:p-8 rounded-3xl border transition-all duration-200 hover:-translate-y-0.5 ${
                isTopRank
                  ? 'bg-white dark:bg-[#14262b] border-[#1b4e45] dark:border-[#d7f78c]/80 shadow-md ring-1 ring-[#1b4e45]/20'
                  : 'bg-white dark:bg-[#14262b] border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Career Title & Summary */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                      Rank #{idx + 1}
                    </span>
                    {isTopRank && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#d7f78c]/30 text-[#17333b] dark:bg-[#d7f78c]/20 dark:text-[#d7f78c]">
                        <SparklesIcon className="w-3 h-3" />
                        Top Profile Match
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-[11px] font-semibold text-[#1b4e45] dark:text-[#d7f78c] bg-[#276459]/10 dark:bg-[#d7f78c]/15 px-2 py-0.5 rounded-md">
                        Active 30-Day Plan Target
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display">
                    {career.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                    {career.summary}
                  </p>
                </div>

                {/* Score & Plan Button */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold block">
                      Competency Match
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#1b4e45] dark:text-[#d7f78c]">
                      <CountUp value={fit.fitPercentage} suffix="%" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleChoosePlan(career.id)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#17333b] hover:bg-[#20444f] dark:bg-[#d7f78c] dark:hover:bg-[#cbf476] text-white dark:text-[#17333b] font-bold text-xs shadow-xs transition-all duration-200 hover:-translate-y-0.5 inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#276459]"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>View 30-Day Plan</span>
                  </button>
                </div>
              </div>

              {/* Rationale strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                    Why You Match
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {fit.dominantStrength}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                    Growth Opportunity
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {fit.growthOpportunity}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                    Entry Level Job Title
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {career.firstRole}
                  </p>
                </div>
              </div>

              {/* Domain Weight Matrix */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">Formula Weights:</span>
                  {(Object.keys(career.weights) as DomainKey[]).map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOMAINS[d].color }} />
                      {DOMAINS[d].name.split(' ')[0]}: {Math.round(career.weights[d] * 100)}%
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => setExpandedId(isExpanded ? '' : career.id)}
                  className="min-h-[44px] flex items-center text-xs font-semibold text-[#1b4e45] dark:text-[#d7f78c] hover:underline"
                >
                  {isExpanded ? 'Hide Capstone & Skills' : 'Inspect Capstone Project & Skills'}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Key Competencies to Master
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {career.keyCompetencies.map((comp) => (
                        <span
                          key={comp}
                          className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 leading-relaxed">
                      {career.growthPerspective}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b4e45] dark:text-[#d7f78c]">
                      <BriefcaseIcon className="w-4 h-4" />
                      <span>Starter Portfolio Capstone</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {career.starterProject}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Complete this within the 30-day action roadmap to construct an auditable proof-of-work asset for your portfolio.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
