/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SkillPath AI - Deterministic Strengths & Career Pathway Scoring Engine
 * Written for first-year engineering explanation:
 * Every domain score is computed deterministically from self-reported metrics.
 * Formula:
 * domainScore = 0.20 * marks + 0.30 * confidence + 0.40 * practice + 0.10 * skill
 * When academic marks are not provided (missing/null/undefined), the remaining
 * three factors are rescaled so their weights still sum to 1.0 (100%):
 * remainingWeight = 0.30 + 0.40 + 0.10 = 0.80
 * rescaledConfidenceWeight = 0.30 / 0.80 = 0.375
 * rescaledPracticeWeight   = 0.40 / 0.80 = 0.500
 * rescaledSkillWeight      = 0.10 / 0.80 = 0.125
 */

export type DomainKey = 'programming' | 'analytical' | 'communication' | 'design';

/**
 * Named constants for combining self-reported assessment and measured aptitude quiz scores
 * When a quiz attempt exists: domain score = 0.6 * existing score + 0.4 * quiz score
 */
export const SELF_REPORTED_WEIGHT = 0.6;
export const QUIZ_WEIGHT = 0.4;

/**
 * Calculates combined domain score deterministically.
 * Backward compatible: if quizScore is not provided (null/undefined), returns existing score untouched.
 */
export function calculateCombinedScore(existingScore: number, quizScore?: number | null): number {
  if (quizScore === null || quizScore === undefined || Number.isNaN(quizScore)) {
    return existingScore;
  }
  return Math.round(SELF_REPORTED_WEIGHT * existingScore + QUIZ_WEIGHT * quizScore);
}

export interface DomainMetrics {
  marks?: number | null; // Optional academic course percentage (0 - 100)
  confidence: number;    // Self-reported confidence (0 - 100)
  practice: number;      // Self-reported practice frequency / habits (0 - 100)
  skill: number;         // Self-reported current skill rating (0 - 100)
}

export interface DomainScoreResult {
  score: number;
  hasMarks: boolean;
  marksContribution: number;
  confidenceContribution: number;
  practiceContribution: number;
  skillContribution: number;
  weights: {
    marks: number;
    confidence: number;
    practice: number;
    skill: number;
  };
}

export interface DomainConfig {
  key: DomainKey;
  name: string;
  tagline: string;
  description: string;
  color: string;
  badgeBg: string;
}

export const DOMAINS: Record<DomainKey, DomainConfig> = {
  programming: {
    key: 'programming',
    name: 'Programming',
    tagline: 'Code fluency & technical execution',
    description: 'Writing software, debugging, systems logic, algorithms, and technical building.',
    color: '#276459',
    badgeBg: '#e8f5f1',
  },
  analytical: {
    key: 'analytical',
    name: 'Analytical thinking',
    tagline: 'Data reasoning & structural problem solving',
    description: 'Quantitative synthesis, mathematical modeling, edge case decomposition, and logic puzzles.',
    color: '#345e69',
    badgeBg: '#eaf1f3',
  },
  communication: {
    key: 'communication',
    name: 'Communication',
    tagline: 'Technical translation & cross-functional clarity',
    description: 'Articulating complex ideas, documentation, empathetic user interviews, and team alignment.',
    color: '#17333b',
    badgeBg: '#e7ecec',
  },
  design: {
    key: 'design',
    name: 'Design',
    tagline: 'Visual hierarchy & user interaction craft',
    description: 'Wireframing, typography, interaction ergonomics, information architecture, and UI polish.',
    color: '#497e3a',
    badgeBg: '#edf6eb',
  },
};

/**
 * Computes a single domain score from 4 metrics using deterministic weights.
 * Handles missing marks by rescaling remaining factors cleanly.
 */
export function calculateDomainScore(metrics: DomainMetrics): DomainScoreResult {
  const hasMarks = metrics.marks !== null && metrics.marks !== undefined && !Number.isNaN(metrics.marks);

  if (hasMarks) {
    const marksVal = Math.max(0, Math.min(100, metrics.marks as number));
    const confVal = Math.max(0, Math.min(100, metrics.confidence));
    const pracVal = Math.max(0, Math.min(100, metrics.practice));
    const skillVal = Math.max(0, Math.min(100, metrics.skill));

    const marksContrib = 0.20 * marksVal;
    const confContrib = 0.30 * confVal;
    const pracContrib = 0.40 * pracVal;
    const skillContrib = 0.10 * skillVal;

    const rawScore = marksContrib + confContrib + pracContrib + skillContrib;

    return {
      score: Math.round(rawScore),
      hasMarks: true,
      marksContribution: Math.round(marksContrib * 10) / 10,
      confidenceContribution: Math.round(confContrib * 10) / 10,
      practiceContribution: Math.round(pracContrib * 10) / 10,
      skillContribution: Math.round(skillContrib * 10) / 10,
      weights: {
        marks: 0.20,
        confidence: 0.30,
        practice: 0.40,
        skill: 0.10,
      },
    };
  } else {
    // Missing marks: exclude and rescale over remaining 0.80 weight
    const confVal = Math.max(0, Math.min(100, metrics.confidence));
    const pracVal = Math.max(0, Math.min(100, metrics.practice));
    const skillVal = Math.max(0, Math.min(100, metrics.skill));

    const wConf = Math.round((0.30 / 0.80) * 10000) / 10000; // 0.375
    const wPrac = Math.round((0.40 / 0.80) * 10000) / 10000; // 0.500
    const wSkill = Math.round((0.10 / 0.80) * 10000) / 10000; // 0.125

    const confContrib = wConf * confVal;
    const pracContrib = wPrac * pracVal;
    const skillContrib = wSkill * skillVal;

    const rawScore = confContrib + pracContrib + skillContrib;

    return {
      score: Math.round(rawScore),
      hasMarks: false,
      marksContribution: 0,
      confidenceContribution: Math.round(confContrib * 10) / 10,
      practiceContribution: Math.round(pracContrib * 10) / 10,
      skillContribution: Math.round(skillContrib * 10) / 10,
      weights: {
        marks: 0,
        confidence: wConf,
        practice: wPrac,
        skill: wSkill,
      },
    };
  }
}

/**
 * Career Definition & Domain Weight Matrices
 */
export interface CareerProfile {
  id: string;
  title: string;
  summary: string;
  weights: Record<DomainKey, number>;
  keyCompetencies: string[];
  firstRole: string;
  growthPerspective: string;
  starterProject: string;
}

export const CAREERS: CareerProfile[] = [
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    summary: 'Builds interactive, high-performance web applications bridging software engineering and visual design.',
    weights: {
      programming: 0.55,
      communication: 0.20,
      design: 0.15,
      analytical: 0.10,
    },
    keyCompetencies: ['TypeScript / React', 'Responsive CSS & DOM', 'Web Performance', 'Component Architecture'],
    firstRole: 'Junior Frontend Engineer / Web Applications Specialist',
    growthPerspective: 'Frontend engineers with strong communication excel in cross-functional squads and rapid prototype delivery.',
    starterProject: 'Build a keyboard-navigable interactive component system with real state management.',
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    summary: 'Transforms raw information into strategic intelligence through statistical rigor and exploratory analytics.',
    weights: {
      analytical: 0.55,
      programming: 0.25,
      communication: 0.15,
      design: 0.05,
    },
    keyCompetencies: ['SQL Queries & Relational Data', 'Python / Pandas', 'Statistical Modeling', 'Executive Dashboards'],
    firstRole: 'Junior Business Intelligence Analyst / Associate Data Scientist',
    growthPerspective: 'Analytical rigor combined with technical query automation unlocks deep product and growth insights.',
    starterProject: 'Analyze an open municipal or educational dataset and publish a reproducible trend report.',
  },
  {
    id: 'ux-designer',
    title: 'UX Designer',
    summary: 'Architects intuitive user journeys, conduct user research, and crafts accessible design systems.',
    weights: {
      design: 0.55,
      communication: 0.25,
      analytical: 0.10,
      programming: 0.10,
    },
    keyCompetencies: ['Wireframing & Prototyping', 'User Research Interviews', 'Usability Audits', 'Design Systems (Figma)'],
    firstRole: 'Junior Product Designer / UX Research Associate',
    growthPerspective: 'Empathy-driven research combined with functional technical awareness creates seamless product experiences.',
    starterProject: 'Redesign an overloaded university course registration workflow into an accessible 3-step flow.',
  },
  {
    id: 'cybersecurity-explorer',
    title: 'Cybersecurity Explorer',
    summary: 'Investigates vulnerability vectors, secures network boundaries, and enforces cryptographic defensive hygiene.',
    weights: {
      programming: 0.40,
      analytical: 0.40,
      communication: 0.15,
      design: 0.05,
    },
    keyCompetencies: ['Network Fundamentals & Protocols', 'Vulnerability Assessment', 'Threat Modeling', 'Defensive Scripting'],
    firstRole: 'Junior Security Operations Analyst / Information Security Associate',
    growthPerspective: 'Combines algorithmic detective work with rigorous technical verification to protect digital assets.',
    starterProject: 'Set up a local network lab to inspect TLS handshakes, packet payloads, and basic auth headers.',
  },
  {
    id: 'product-management-explorer',
    title: 'Product Management Explorer',
    summary: 'Aligns engineering, user empathy, and business viability to steer meaningful software outcomes.',
    weights: {
      communication: 0.45,
      analytical: 0.25,
      programming: 0.15,
      design: 0.15,
    },
    keyCompetencies: ['User Story Framing', 'Product Prioritization', 'Feature Scoping & PRDs', 'Metrics Definition'],
    firstRole: 'Associate Product Manager (APM) / Product Operations Specialist',
    growthPerspective: 'Translates high-level organizational goals into clear, executable technical scopes for engineering teams.',
    starterProject: 'Write a comprehensive Product Requirements Document (PRD) for a campus textbook exchange tool.',
  },
];

export interface CareerFitResult {
  career: CareerProfile;
  fitPercentage: number;
  dominantStrength: string;
  growthOpportunity: string;
}

/**
 * Calculates career fit score as a weighted sum of domain scores (0 - 100).
 */
export function calculateCareerFit(
  domainScores: Record<DomainKey, number>,
  careers: CareerProfile[] = CAREERS
): CareerFitResult[] {
  const results = careers.map((career) => {
    let fit = 0;
    (Object.keys(career.weights) as DomainKey[]).forEach((d) => {
      fit += (domainScores[d] || 0) * career.weights[d];
    });

    const roundedFit = Math.round(fit);

    // Identify student's relative strength and area for this career
    const domainKeys = Object.keys(career.weights) as DomainKey[];
    const sortedByWeight = [...domainKeys].sort((a, b) => career.weights[b] - career.weights[a]);
    const topDomainKey = sortedByWeight[0];
    const studentScoreInTop = domainScores[topDomainKey] || 0;
    const dominantStrength = `${DOMAINS[topDomainKey].name} (${studentScoreInTop} pts)`;
    
    // Find the domain with lowest student score among career weights >= 0.10
    const relevantDomains = domainKeys.filter((d) => career.weights[d] >= 0.10);
    const growthDomain = [...relevantDomains].sort((a, b) => (domainScores[a] || 0) - (domainScores[b] || 0))[0] || topDomainKey;
    const growthOpportunity = `Strengthen ${DOMAINS[growthDomain].name} (${domainScores[growthDomain] || 0} pts) to increase match`;

    return {
      career,
      fitPercentage: roundedFit,
      dominantStrength,
      growthOpportunity,
    };
  });

  // Sort descending by fit percentage
  return results.sort((a, b) => b.fitPercentage - a.fitPercentage);
}

/**
 * Standard 8 self-report questions (2 per domain: 1 for confidence/skill, 1 for practice habits)
 */
export interface AssessmentQuestion {
  id: string;
  domain: DomainKey;
  metricType: 'confidence' | 'practice';
  prompt: string;
  explanation: string;
  options: {
    label: string;
    description: string;
    value: number; // mapped to 0-100 scale
  }[];
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'prog_practice',
    domain: 'programming',
    metricType: 'practice',
    prompt: 'How frequently do you write, debug, or experiment with code outside of mandatory assignments?',
    explanation: 'Consistent hands-on building develops muscle memory far beyond passive lecture attendance.',
    options: [
      { label: 'Rarely / Never', description: 'Only during required coursework submissions', value: 20 },
      { label: 'Occasionally', description: '1-2 hours every couple of weeks when exploring a topic', value: 45 },
      { label: 'Regularly', description: '3-5 hours weekly on independent tutorials or personal scripts', value: 70 },
      { label: 'Intensively', description: '6+ hours weekly actively building side projects or contributing to repos', value: 95 },
    ],
  },
  {
    id: 'prog_confidence',
    domain: 'programming',
    metricType: 'confidence',
    prompt: 'When you encounter an unfamiliar compiler bug or runtime crash, how confident are you isolating the cause?',
    explanation: 'Independent debugging demonstrates mental model maturity and error literacy.',
    options: [
      { label: 'Uncertain', description: 'I get stuck easily and require step-by-step guidance', value: 25 },
      { label: 'Emerging', description: 'I search documentation and can solve standard syntax errors', value: 50 },
      { label: 'Confident', description: 'I read stack traces, inspect variables, and isolate edge cases systematically', value: 75 },
      { label: 'High Mastery', description: 'I trace runtime flows comfortably and architect resilient error handling', value: 95 },
    ],
  },
  {
    id: 'anal_practice',
    domain: 'analytical',
    metricType: 'practice',
    prompt: 'How often do you engage in data analysis, statistical reasoning, or structured problem decomposition?',
    explanation: 'Working with structured schemas, spreadsheets, or logic puzzles sharpens quantitative precision.',
    options: [
      { label: 'Minimal', description: 'Seldom look at datasets or formal logic problems', value: 20 },
      { label: 'Occasional', description: 'Basic spreadsheet formulas or introductory math homework', value: 40 },
      { label: 'Frequent', description: 'Analyzing structured datasets, writing queries, or solving puzzles', value: 65 },
      { label: 'Daily / Dedicated', description: 'Heavy mathematical modeling, algorithmic analysis, or automated SQL', value: 90 },
    ],
  },
  {
    id: 'anal_confidence',
    domain: 'analytical',
    metricType: 'confidence',
    prompt: 'How confident are you breaking down an ambiguous problem into mutually exclusive sub-problems?',
    explanation: 'Decomposition is the foundational skill of analysts and system architects.',
    options: [
      { label: 'Overwhelmed', description: 'Ambiguity feels paralyzing without pre-packaged steps', value: 25 },
      { label: 'Cautious', description: 'Can structure simple problems with predefined templates', value: 45 },
      { label: 'Methodical', description: 'Comfortably outline hypotheses, identify variables, and test edge cases', value: 75 },
      { label: 'Strategic', description: 'Rigorously formalize complex multi-variable systems with clarity', value: 95 },
    ],
  },
  {
    id: 'comm_practice',
    domain: 'communication',
    metricType: 'practice',
    prompt: 'How often do you write technical documentation, lead group presentations, or explain concepts to non-experts?',
    explanation: 'Communication is an active engineering discipline that requires regular audience feedback.',
    options: [
      { label: 'Infrequent', description: 'Prefer silent solo work; avoid speaking or documenting unless required', value: 25 },
      { label: 'Moderate', description: 'Contribute occasionally to team slide decks or project READMEs', value: 55 },
      { label: 'Active', description: 'Regularly draft summaries, guide peers through technical concepts, or facilitate discussions', value: 75 },
      { label: 'Community Leader', description: 'Publish articles, organize workshops, or synthesize complex team roadmaps', value: 95 },
    ],
  },
  {
    id: 'comm_confidence',
    domain: 'communication',
    metricType: 'confidence',
    prompt: 'How confident do you feel defending an architectural decision or presenting technical findings to stakeholders?',
    explanation: 'Confidence in communication ensures high-value technical ideas gain organizational buy-in.',
    options: [
      { label: 'Anxious', description: 'Find technical debate stressful and struggle to articulate rationale', value: 30 },
      { label: 'Competent', description: 'Can convey facts clearly when given ample preparation time', value: 60 },
      { label: 'Persuasive', description: 'Comfortably explain trade-offs, adapt to questions, and maintain audience empathy', value: 80 },
      { label: 'Executive', description: 'Compelling storyteller who builds trust effortlessly across disciplines', value: 95 },
    ],
  },
  {
    id: 'design_practice',
    domain: 'design',
    metricType: 'practice',
    prompt: 'How often do you draft wireframes, critique user interfaces, or refine visual spacing in your projects?',
    explanation: 'Design sensibility grows through deliberate observation of user friction and layout math.',
    options: [
      { label: 'Negligible', description: 'Rely purely on default unstyled browser elements or bare terminal scripts', value: 15 },
      { label: 'Surface Level', description: 'Occasionally tweak margins or colors without systematic design thinking', value: 40 },
      { label: 'Systematic', description: 'Regularly sketch layouts, maintain consistent typography scales, and test usability', value: 70 },
      { label: 'Obsessive Craft', description: 'Build component libraries, obsess over micro-interactions, and design in Figma', value: 95 },
    ],
  },
  {
    id: 'design_confidence',
    domain: 'design',
    metricType: 'confidence',
    prompt: 'When reviewing a web interface, how confident are you spotting subtle visual imbalances, hierarchy failures, and poor accessibility?',
    explanation: 'Trained visual critique translates directly into polished, accessible software interfaces.',
    options: [
      { label: 'Low', description: 'Everything looks roughly the same to me unless noticeably broken', value: 20 },
      { label: 'Basic', description: 'Notice color clashes and broken layouts, but struggle to pinpoint the cause', value: 45 },
      { label: 'Keen Eye', description: 'Quickly spot font mismatches, contrast failures, and irregular padding rhythms', value: 75 },
      { label: 'Expert Eye', description: 'Instantly diagnose design system defects, WCAG violations, and UX friction', value: 95 },
    ],
  },
];

/**
 * Benchmark Demo Profile matching the non-negotiable prompt requirement:
 * "The demo profile must still show domain scores 76, 28, 68, 22 and Frontend Developer as the top career."
 */
export const DEMO_PROFILE = {
  name: 'Alex Chen',
  year: 'Year 2 Undergraduate',
  focus: 'Computer Science & Human-Centered Technology',
  statement: 'Exploring whether to double-down on web application engineering or pivot toward product design.',
  domainMetrics: {
    programming: {
      marks: 80,
      confidence: 70,
      practice: 80,
      skill: 70,
    },
    analytical: {
      marks: 30,
      confidence: 25,
      practice: 30,
      skill: 25,
    },
    communication: {
      marks: 70,
      confidence: 70,
      practice: 65,
      skill: 70,
    },
    design: {
      marks: 20,
      confidence: 25,
      practice: 20,
      skill: 25,
    },
  },
  answers: {
    prog_practice: 70,
    prog_confidence: 75,
    anal_practice: 20,
    anal_confidence: 25,
    comm_practice: 75,
    comm_confidence: 60,
    design_practice: 15,
    design_confidence: 20,
  },
};

/**
 * Pre-calculated demo domain scores
 */
export function getDemoDomainScores(): Record<DomainKey, number> {
  return {
    programming: calculateDomainScore(DEMO_PROFILE.domainMetrics.programming).score, // 76
    analytical: calculateDomainScore(DEMO_PROFILE.domainMetrics.analytical).score,   // 28
    communication: calculateDomainScore(DEMO_PROFILE.domainMetrics.communication).score, // 68
    design: calculateDomainScore(DEMO_PROFILE.domainMetrics.design).score,           // 22
  };
}

/**
 * Assessment Snapshot definition for saving dated submission history
 */
export interface AssessmentSnapshot {
  id: string;
  timestamp: number;
  dateLabel: string;
  scores: Record<DomainKey, number>;
  answers: Record<string, number>;
}

export interface ScoreComparison {
  domain: DomainKey;
  previous: number;
  latest: number;
  delta: number;
}

/**
 * Computes comparative deltas between previous and latest assessment snapshots
 */
export function computeScoreDeltas(
  prevScores: Record<DomainKey, number>,
  latestScores: Record<DomainKey, number>
): ScoreComparison[] {
  const keys: DomainKey[] = ['programming', 'analytical', 'communication', 'design'];
  return keys.map((domain) => {
    const previous = prevScores[domain] || 0;
    const latest = latestScores[domain] || 0;
    return {
      domain,
      previous,
      latest,
      delta: latest - previous,
    };
  });
}

/**
 * Editable Sample Profile for the "Load Sample Profile" action
 * Distinct from the read-only benchmark DEMO_PROFILE
 */
export const SAMPLE_PROFILE = {
  name: 'Jordan Taylor',
  year: 'Year 2 Undergraduate',
  focus: 'Software Engineering & Interactive Systems',
  statement: 'Exploring frontend systems architecture and analytical data pipelines.',
  domainMetrics: {
    programming: {
      marks: 82,
      confidence: 65,
      practice: 75,
      skill: 70,
    },
    analytical: {
      marks: 65,
      confidence: 55,
      practice: 60,
      skill: 50,
    },
    communication: {
      marks: 75,
      confidence: 70,
      practice: 65,
      skill: 70,
    },
    design: {
      marks: 50,
      confidence: 45,
      practice: 40,
      skill: 45,
    },
  },
  answers: {
    prog_practice: 70,
    prog_confidence: 75,
    anal_practice: 65,
    anal_confidence: 45,
    comm_practice: 75,
    comm_confidence: 60,
    design_practice: 40,
    design_confidence: 45,
  },
};

/**
 * 30-Day Plan template for each career pathway
 */
export interface PlanMilestone {
  dayRange: string;
  title: string;
  objective: string;
  tasks: {
    id: string;
    label: string;
    detail: string;
    estimatedMinutes: number;
  }[];
}

export const CAREER_PLANS: Record<string, PlanMilestone[]> = {
  'frontend-developer': [
    {
      dayRange: 'Days 1 - 7',
      title: 'Semantic Foundations & Modern CSS Layout',
      objective: 'Master responsive flexbox/grid layout math, accessible HTML5 semantics, and clean DOM structures.',
      tasks: [
        { id: 'fe-1', label: 'Semantic Markup Audit', detail: 'Convert a legacy generic-div page into strict HTML5 landmark tags (<header>, <main>, <nav>, <article>).', estimatedMinutes: 45 },
        { id: 'fe-2', label: 'Intrinsic CSS Grid Layout', detail: 'Build a zero-media-query auto-fit card grid using CSS Grid repeat(auto-fit, minmax(280px, 1fr)).', estimatedMinutes: 60 },
        { id: 'fe-3', label: 'Keyboard Navigation Flow', detail: 'Implement visible focus rings and test full Tab/Shift+Tab navigation across all buttons and inputs.', estimatedMinutes: 45 },
        { id: 'fe-4', label: 'Typography Scale Discipline', detail: 'Set up a fluid clamp() type scale with responsive line-heights and measure controls.', estimatedMinutes: 50 },
      ],
    },
    {
      dayRange: 'Days 8 - 14',
      title: 'Component Architecture & TypeScript Ergonomics',
      objective: 'Build predictable, strongly-typed React state machines with modular component boundaries.',
      tasks: [
        { id: 'fe-5', label: 'Discriminated Union State Machine', detail: 'Refactor loading/idle/error states using TypeScript discriminated unions instead of loose booleans.', estimatedMinutes: 60 },
        { id: 'fe-6', label: 'Compound Component System', detail: 'Create a reusable Accordion or Tabs component utilizing React context for clean caller syntax.', estimatedMinutes: 75 },
        { id: 'fe-7', label: 'Custom Hook for Async Fetching', detail: 'Implement useQuery-style stateful hook with abort controller support and cached fallbacks.', estimatedMinutes: 90 },
      ],
    },
    {
      dayRange: 'Days 15 - 22',
      title: 'Real-World Data Flow & Micro-Interactions',
      objective: 'Connect realistic asynchronous datasets, optimize re-renders, and integrate smooth transitions.',
      tasks: [
        { id: 'fe-8', label: 'Radar / Chart SVG Renderer', detail: 'Write a declarative SVG polygon renderer mapping normalized scores to radial coordinates.', estimatedMinutes: 90 },
        { id: 'fe-9', label: 'Reduced Motion Enforcement', detail: 'Wrap CSS keyframes and transitions in @media (prefers-reduced-motion: reduce) overrides.', estimatedMinutes: 45 },
        { id: 'fe-10', label: 'Client Persistence & Offline Cache', detail: 'Wire localStorage state synchronization with defensive JSON parsing and schema validation.', estimatedMinutes: 60 },
      ],
    },
    {
      dayRange: 'Days 23 - 30',
      title: 'Portfolio Showcase, Audit & Capstone Deployment',
      objective: 'Deploy a high-performance web application, run Lighthouse audits, and document your learnings.',
      tasks: [
        { id: 'fe-11', label: 'Lighthouse Performance 95+ Audit', detail: 'Optimize bundle size, eliminate layout shifts (CLS), and verify fast First Contentful Paint.', estimatedMinutes: 75 },
        { id: 'fe-12', label: 'Interactive Project Case Study', detail: 'Draft a concise technical case study detailing trade-offs, architecture decisions, and metrics.', estimatedMinutes: 60 },
        { id: 'fe-13', label: 'Live Deployment & Defense Prep', detail: 'Host the live project on Cloud Run or Vercel and write an executive 2-minute elevator pitch.', estimatedMinutes: 60 },
      ],
    },
  ],
  'data-analyst': [
    {
      dayRange: 'Days 1 - 7',
      title: 'SQL Fundamentals & Relational Exploration',
      objective: 'Query structured databases, master group aggregates, and isolate data discrepancies.',
      tasks: [
        { id: 'da-1', label: 'Complex JOINs & Filtering', detail: 'Write multi-table INNER and LEFT JOINs on public database schemas.', estimatedMinutes: 60 },
        { id: 'da-2', label: 'Window Functions & Ranking', detail: 'Calculate rolling averages, dense ranks, and month-over-month growth metrics.', estimatedMinutes: 75 },
        { id: 'da-3', label: 'Data Cleaning & Null Handling', detail: 'Identify missing anomalies, handle type conversions, and sanitize raw columns.', estimatedMinutes: 60 },
      ],
    },
    {
      dayRange: 'Days 8 - 14',
      title: 'Python Pandas & Exploratory Data Analysis',
      objective: 'Clean, reshape, and statistically analyze real-world datasets using Jupyter / Pandas.',
      tasks: [
        { id: 'da-4', label: 'Pandas Vectorized Transformations', detail: 'Perform columnar math, pivot tables, and grouping aggregations efficiently.', estimatedMinutes: 75 },
        { id: 'da-5', label: 'Distribution & Outlier Detection', detail: 'Compute interquartile ranges, z-scores, and plot distribution histograms.', estimatedMinutes: 60 },
      ],
    },
    {
      dayRange: 'Days 15 - 22',
      title: 'Data Storytelling & Executive Visualizations',
      objective: 'Design clear charts that highlight actionable business insights rather than visual noise.',
      tasks: [
        { id: 'da-6', label: 'Chart Selection Matrix', detail: 'Choose appropriate visual encodings (scatter, bar, area) based on data dimensionality.', estimatedMinutes: 60 },
        { id: 'da-7', label: 'Dashboard Prototype', detail: 'Build a 3-view KPI summary displaying conversion, churn, and cohort retention.', estimatedMinutes: 90 },
      ],
    },
    {
      dayRange: 'Days 23 - 30',
      title: 'Capstone Analysis & Stakeholder Presentation',
      objective: 'Deliver an end-to-end data briefing answering a real strategic decision question.',
      tasks: [
        { id: 'da-8', label: 'Executive Summary Briefing', detail: 'Write a 1-page memo summarizing key findings with supporting data confidence intervals.', estimatedMinutes: 75 },
        { id: 'da-9', label: 'Reproducible Notebook Repository', detail: 'Document data provenance, assumptions, and steps in an open GitHub repo.', estimatedMinutes: 60 },
      ],
    },
  ],
  'ux-designer': [
    {
      dayRange: 'Days 1 - 7',
      title: 'User Research & Problem Framing',
      objective: 'Conduct generative user interviews and uncover root friction points in everyday software.',
      tasks: [
        { id: 'ux-1', label: 'Semi-Structured Interview Guide', detail: 'Formulate 5 open-ended user interview questions avoiding leading bias.', estimatedMinutes: 45 },
        { id: 'ux-2', label: 'Affinity Mapping & Insights', detail: 'Cluster user quotes into pain points, mental models, and opportunity areas.', estimatedMinutes: 60 },
      ],
    },
    {
      dayRange: 'Days 8 - 14',
      title: 'Information Architecture & Lo-Fi Wireframing',
      objective: 'Map user journeys, site maps, and draft wireframes prioritizing content hierarchy.',
      tasks: [
        { id: 'ux-3', label: 'User Flow Diagramming', detail: 'Map happy path, error recovery loops, and decision points for a core workflow.', estimatedMinutes: 60 },
        { id: 'ux-4', label: 'Greyscale Wireframe System', detail: 'Wireframe 4 mobile screens focusing strictly on layout and typographic scale without color.', estimatedMinutes: 75 },
      ],
    },
    {
      dayRange: 'Days 15 - 22',
      title: 'Interactive Prototyping & Usability Testing',
      objective: 'Build clickable prototypes and validate design decisions with target users.',
      tasks: [
        { id: 'ux-5', label: 'Clickable Figma Prototype', detail: 'Wire micro-interactions and transitions for key user paths.', estimatedMinutes: 90 },
        { id: 'ux-6', label: 'Moderated Usability Test', detail: 'Observe 2 users completing tasks and log task completion times and stumbling blocks.', estimatedMinutes: 75 },
      ],
    },
    {
      dayRange: 'Days 23 - 30',
      title: 'Design System Documentation & Case Study',
      objective: 'Package typography, colors, component tokens, and case study documentation.',
      tasks: [
        { id: 'ux-7', label: 'Design System Token Spec', detail: 'Document color palettes with WCAG AA ratios and 8pt spatial grid rules.', estimatedMinutes: 60 },
        { id: 'ux-8', label: 'Comprehensive UX Case Study', detail: 'Publish problem statement, user journey before/after, and quantified test outcomes.', estimatedMinutes: 90 },
      ],
    },
  ],
  'cybersecurity-explorer': [
    {
      dayRange: 'Days 1 - 7',
      title: 'Networking & Protocol Hygiene',
      objective: 'Understand TCP/IP, DNS, HTTP headers, and defensive packet analysis.',
      tasks: [
        { id: 'sec-1', label: 'Wireshark Packet Analysis', detail: 'Capture and inspect DNS requests and TLS handshakes in an isolated test environment.', estimatedMinutes: 60 },
        { id: 'sec-2', label: 'Security Headers Audit', detail: 'Analyze CSP, HSTS, X-Frame-Options, and CORS configurations on web applications.', estimatedMinutes: 45 },
      ],
    },
    {
      dayRange: 'Days 8 - 14',
      title: 'Threat Modeling & Authentication Flaws',
      objective: 'Learn OWASP Top 10 vectors, SQL injection mechanics, and credential security.',
      tasks: [
        { id: 'sec-3', label: 'STRIDE Threat Model', detail: 'Map potential spoofing, tampering, and denial-of-service vectors for a web API.', estimatedMinutes: 60 },
        { id: 'sec-4', label: 'Auth Token Defense', detail: 'Compare JWT vulnerabilities, cookie security flags (HttpOnly, SameSite, Secure).', estimatedMinutes: 60 },
      ],
    },
    {
      dayRange: 'Days 15 - 22',
      title: 'Vulnerability Scanning & Hardening',
      objective: 'Practice automated static analysis, dependency scanning, and firewall configurations.',
      tasks: [
        { id: 'sec-5', label: 'Dependency Vulnerability Audit', detail: 'Run npm audit and Trivy container scanner to identify and patch CVEs.', estimatedMinutes: 60 },
        { id: 'sec-6', label: 'Linux Hardening Script', detail: 'Write a bash script checking for open SSH ports, permissive file modes, and ufw rules.', estimatedMinutes: 75 },
      ],
    },
    {
      dayRange: 'Days 23 - 30',
      title: 'Incident Response Simulation & Lab Report',
      objective: 'Formulate an incident triage protocol and compile your security research log.',
      tasks: [
        { id: 'sec-7', label: 'Simulated Breach Post-Mortem', detail: 'Draft an incident response root cause report with remediation timelines.', estimatedMinutes: 75 },
        { id: 'sec-8', label: 'Security Explorer Defense Memo', detail: 'Summarize defensive best practices for non-technical leadership.', estimatedMinutes: 60 },
      ],
    },
  ],
  'product-management-explorer': [
    {
      dayRange: 'Days 1 - 7',
      title: 'Problem Discovery & Customer Empathy',
      objective: 'Uncover user pain points, analyze competitive alternatives, and define value propositions.',
      tasks: [
        { id: 'pm-1', label: 'Competitive Landscape Matrix', detail: 'Compare 3 software products across core jobs-to-be-done and pricing models.', estimatedMinutes: 60 },
        { id: 'pm-2', label: 'User Persona & Job Story', detail: 'Write 3 job stories in the "When [situation], I want to [motivation], So that [outcome]" format.', estimatedMinutes: 45 },
      ],
    },
    {
      dayRange: 'Days 8 - 14',
      title: 'Feature Prioritization & Scoping',
      objective: 'Apply frameworks (RICE, MoSCoW) to balance engineering feasibility and customer impact.',
      tasks: [
        { id: 'pm-3', label: 'RICE Scoring Workshop', detail: 'Score 8 candidate backlog features using Reach, Impact, Confidence, and Effort.', estimatedMinutes: 60 },
        { id: 'pm-4', label: 'Minimum Viable Product (MVP) Scope', detail: 'Slice a complex product idea down to its single most crucial workflow.', estimatedMinutes: 60 },
      ],
    },
    {
      dayRange: 'Days 15 - 22',
      title: 'PRD Authoring & Engineering Hand-off',
      objective: 'Write an actionable Product Requirements Document specifying edge cases and metrics.',
      tasks: [
        { id: 'pm-5', label: 'One-Page PRD Drafting', detail: 'Document problem statement, target audience, non-goals, and success metrics (North Star KPI).', estimatedMinutes: 90 },
        { id: 'pm-6', label: 'Engineering User Stories', detail: 'Write 5 technical user stories with strict acceptance criteria and test conditions.', estimatedMinutes: 60 },
      ],
    },
    {
      dayRange: 'Days 23 - 30',
      title: 'Go-to-Market Strategy & Product Pitch',
      objective: 'Formulate launch communication, telemetry instrumentation, and executive presentation.',
      tasks: [
        { id: 'pm-7', label: 'Telemetry & Analytics Spec', detail: 'Define event tracking schema (event names, payload parameters) for onboarding flow.', estimatedMinutes: 60 },
        { id: 'pm-8', label: 'Product Strategy Pitch Deck', detail: 'Create a 6-slide executive deck highlighting the opportunity, validation, and roadmap.', estimatedMinutes: 75 },
      ],
    },
  ],
};
