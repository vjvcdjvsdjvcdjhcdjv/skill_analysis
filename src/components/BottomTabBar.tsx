/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mobile Bottom Tab Bar for screens under 760px.
 */

import React from 'react';
import { PageId } from './TopBar.tsx';
import {
  CompassIcon,
  CheckCircleIcon,
  BarChartIcon,
  BriefcaseIcon,
  CalendarIcon,
  CalculatorIcon,
  ZapIcon,
} from './icons.tsx';

interface BottomTabBarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export function BottomTabBar({ activePage, onNavigate }: BottomTabBarProps) {
  const tabs: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: CompassIcon },
    { id: 'assessment', label: 'Assess', icon: CheckCircleIcon },
    { id: 'quiz', label: 'Quiz', icon: ZapIcon },
    { id: 'dashboard', label: 'Dashboard', icon: BarChartIcon },
    { id: 'careers', label: 'Careers', icon: BriefcaseIcon },
    { id: 'plan', label: 'Plan', icon: CalendarIcon },
    { id: 'method', label: 'Method', icon: CalculatorIcon },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#f6f8f6]/95 dark:bg-[#0e1c20]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 px-1 py-1 shadow-lg"
      style={{ maxHeight: '68px' }}
    >
      <div className="grid grid-cols-7 items-center max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activePage === tab.id;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-0.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276459] ${
                isActive
                  ? 'text-[#1b4e45] dark:text-[#d7f78c] font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'scale-110 text-[#1b4e45] dark:text-[#d7f78c]' : ''}`} />
              <span className="text-[10px] tracking-tight mt-0.5 leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
