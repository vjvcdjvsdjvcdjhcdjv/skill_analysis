/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Interactive Animated SVG Radar Chart
 * Renders multidimensional domain scores with smooth transitions,
 * concentric grid webs, and optional peer comparison benchmark.
 */

import React, { useState } from 'react';
import { DomainKey, DOMAINS } from '../utils/scoring.ts';

interface RadarChartProps {
  scores: Record<DomainKey, number>;
  previousScores?: Record<DomainKey, number>;
  benchmarkScores?: Record<DomainKey, number>;
  showBenchmark?: boolean;
  size?: number; // default 340
  interactive?: boolean;
  className?: string;
}

const DOMAIN_KEYS: DomainKey[] = ['programming', 'analytical', 'communication', 'design'];

function RadarChartComponent({
  scores,
  previousScores,
  benchmarkScores,
  showBenchmark = false,
  size = 340,
  interactive = true,
  className = '',
}: RadarChartProps) {
  const [hoveredDomain, setHoveredDomain] = useState<DomainKey | null>(null);

  const center = size / 2;
  const radius = (size / 2) - 60; // generous padding for external labels

  // Compute coordinate for a given domain index and score (0 - 100)
  const getCoordinates = (index: number, score: number) => {
    // 0 is top (-pi/2)
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / DOMAIN_KEYS.length;
    const r = (Math.max(0, Math.min(100, score)) / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Generate polygon points string for student data
  const dataPoints = DOMAIN_KEYS.map((key, i) => {
    const coord = getCoordinates(i, scores[key] || 0);
    return `${coord.x},${coord.y}`;
  }).join(' ');

  // Generate polygon points string for previous assessment (if present)
  const previousPoints = previousScores
    ? DOMAIN_KEYS.map((key, i) => {
        const coord = getCoordinates(i, previousScores[key] || 0);
        return `${coord.x},${coord.y}`;
      }).join(' ')
    : '';

  // Generate polygon points string for benchmark data (if enabled)
  const benchmarkPoints = benchmarkScores
    ? DOMAIN_KEYS.map((key, i) => {
        const coord = getCoordinates(i, benchmarkScores[key] || 0);
        return `${coord.x},${coord.y}`;
      }).join(' ')
    : '';

  // Concentric levels (25, 50, 75, 100)
  const levels = [25, 50, 75, 100];

  const ariaDescription = `Radar chart showing domain scores: Programming ${scores.programming}, Analytical thinking ${scores.analytical}, Communication ${scores.communication}, Design ${scores.design}`;

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        role="img"
        aria-label={ariaDescription}
      >
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#276459" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d7f78c" stopOpacity="0.30" />
          </linearGradient>
          <linearGradient id="radarStrokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#276459" />
            <stop offset="100%" stopColor="#17333b" />
          </linearGradient>
          <filter id="radarShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#276459" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Concentric grid webs */}
        {levels.map((level) => {
          const gridPoints = DOMAIN_KEYS.map((_, i) => {
            const coord = getCoordinates(i, level);
            return `${coord.x},${coord.y}`;
          }).join(' ');

          return (
            <g key={`level-${level}`}>
              <polygon
                points={gridPoints}
                fill="none"
                stroke="currentColor"
                strokeDasharray={level === 100 ? undefined : '3 3'}
                className="text-slate-300 dark:text-slate-700/60"
                strokeWidth={level === 100 ? 1.5 : 1}
              />
              {/* Level scale labels positioned on 45-degree diagonal web spoke */}
              {level < 100 && (
                <text
                  x={center + (level / 100) * radius * 0.7071 + 4}
                  y={center - (level / 100) * radius * 0.7071}
                  textAnchor="start"
                  dominantBaseline="central"
                  className="text-[9px] font-mono fill-slate-400 dark:fill-slate-500 tabular-nums pointer-events-none select-none font-medium"
                >
                  {level}
                </text>
              )}
            </g>
          );
        })}

        {/* Radial spoke lines */}
        {DOMAIN_KEYS.map((key, i) => {
          const outerCoord = getCoordinates(i, 100);
          return (
            <line
              key={`axis-${key}`}
              x1={center}
              y1={center}
              x2={outerCoord.x}
              y2={outerCoord.y}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700/80"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Optional Benchmark Polygon */}
        {showBenchmark && benchmarkPoints && (
          <g className="transition-all duration-300">
            <polygon
              points={benchmarkPoints}
              fill="rgba(148, 163, 184, 0.12)"
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </g>
        )}

        {/* Previous Assessment Polygon */}
        {previousPoints && (
          <g className="transition-all duration-300">
            <polygon
              points={previousPoints}
              fill="rgba(100, 116, 139, 0.15)"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="3 3"
              className="dark:stroke-slate-400"
            />
          </g>
        )}

        {/* Student Data Polygon (Animated) */}
        <polygon
          points={dataPoints}
          fill="url(#radarGradient)"
          stroke="#1b4e45"
          strokeWidth="2.5"
          filter="url(#radarShadow)"
          className="transition-all duration-500 ease-out dark:stroke-[#d7f78c]"
        />

        {/* Vertex interactive points and dots */}
        {DOMAIN_KEYS.map((key, i) => {
          const score = scores[key] || 0;
          const coord = getCoordinates(i, score);
          const isHovered = hoveredDomain === key;

          return (
            <g
              key={`dot-${key}`}
              className="cursor-pointer transition-transform duration-200"
              onMouseEnter={() => interactive && setHoveredDomain(key)}
              onMouseLeave={() => interactive && setHoveredDomain(null)}
              tabIndex={0}
              role="button"
              aria-label={`${DOMAINS[key].name}: ${score} points`}
            >
              {isHovered && (
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r="12"
                  fill="#d7f78c"
                  opacity="0.35"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={coord.x}
                cy={coord.y}
                r={isHovered ? 6 : 4.5}
                fill="#ffffff"
                stroke="#17333b"
                strokeWidth="2.5"
                className="transition-all duration-300 dark:fill-[#0e1c20] dark:stroke-[#d7f78c]"
              />
            </g>
          );
        })}

        {/* Axis Labels positioned outside the circumference with generous margins */}
        {DOMAIN_KEYS.map((key, i) => {
          const domain = DOMAINS[key];
          const score = scores[key] || 0;
          const isHovered = hoveredDomain === key;

          let labelX = center;
          let labelY = center;
          let ptsX = center;
          let ptsY = center;
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';

          if (i === 0) {
            labelX = center;
            labelY = center - radius - 20;
            ptsX = center;
            ptsY = center - radius - 7;
            textAnchor = 'middle';
          } else if (i === 1) {
            labelX = center + radius + 14;
            labelY = center - 5;
            ptsX = center + radius + 14;
            ptsY = center + 10;
            textAnchor = 'start';
          } else if (i === 2) {
            labelX = center;
            labelY = center + radius + 18;
            ptsX = center;
            ptsY = center + radius + 32;
            textAnchor = 'middle';
          } else {
            labelX = center - radius - 14;
            labelY = center - 5;
            ptsX = center - radius - 14;
            ptsY = center + 10;
            textAnchor = 'end';
          }

          return (
            <g
              key={`label-${key}`}
              className={`transition-all duration-200 cursor-pointer ${
                isHovered ? 'scale-105' : ''
              }`}
              onMouseEnter={() => interactive && setHoveredDomain(key)}
              onMouseLeave={() => interactive && setHoveredDomain(null)}
            >
              <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                className={`text-xs font-bold tracking-tight transition-colors ${
                  isHovered
                    ? 'fill-[#1b4e45] dark:fill-[#d7f78c]'
                    : 'fill-[#17333b] dark:fill-[#f1f5f9]'
                }`}
              >
                {domain.name}
              </text>
              <text
                x={ptsX}
                y={ptsY}
                textAnchor={textAnchor}
                className="text-[11px] font-mono tabular-nums font-bold fill-[#1b4e45] dark:fill-[#d7f78c]"
              >
                {score} pts
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredDomain && (
        <div
          role="status"
          className="mt-2 px-3 py-1.5 rounded-lg bg-[#17333b] text-white dark:bg-[#1a3840] dark:border dark:border-[#276459]/40 text-xs shadow-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="font-semibold text-[#d7f78c]">{DOMAINS[hoveredDomain].name}:</span>
          <span>{scores[hoveredDomain]} / 100</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 text-[11px]">{DOMAINS[hoveredDomain].tagline}</span>
        </div>
      )}
    </div>
  );
}

export const RadarChart = React.memo(RadarChartComponent);
