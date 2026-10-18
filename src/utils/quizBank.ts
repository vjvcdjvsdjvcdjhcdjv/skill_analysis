/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Original 32-Question Aptitude Quiz Bank
 * Exactly 8 questions per domain: Programming, Analytical, Communication, Design.
 * Difficulties: 1 (Foundational), 2 (Intermediate), 3 (Advanced).
 * 100% verified answers and one-line explanations.
 */

import type { DomainKey } from './scoring.ts';

export interface QuizQuestion {
  id: string;
  domain: DomainKey;
  difficulty: 1 | 2 | 3;
  prompt: string;
  codeSnippet?: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  svgType?: 'spacing-rhythm' | 'touch-target' | 'contrast-grid';
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QUIZ_BANK: QuizQuestion[] = [
  // ==========================================
  // PROGRAMMING (8 questions: logical reasoning, code trace, debugging)
  // ==========================================
  {
    id: 'prog-1',
    domain: 'programming',
    difficulty: 1,
    prompt: 'Trace the execution of this loop. What is the final value of total?',
    codeSnippet: `let total = 10;\nfor (let i = 1; i <= 3; i++) {\n  total += i * 2;\n}`,
    options: ['16', '22', '24', '18'],
    correctIndex: 1,
    explanation: 'i takes values 1, 2, and 3; total increases by 2 + 4 + 6 = 12, reaching 10 + 12 = 22.',
  },
  {
    id: 'prog-2',
    domain: 'programming',
    difficulty: 1,
    prompt: 'A passing mark is defined as 75 or higher. What does this function return when called with score = 75?',
    codeSnippet: `function checkEligibility(score) {\n  if (score > 75) {\n    return "Pass";\n  }\n  return "Retake";\n}`,
    options: ['"Pass"', '"Retake"', 'undefined', 'Throws a RangeError'],
    correctIndex: 1,
    explanation: 'The strict inequality > 75 excludes 75; it evaluates to false and returns "Retake" instead of using >= 75.',
  },
  {
    id: 'prog-3',
    domain: 'programming',
    difficulty: 2,
    prompt: 'What array does the transformation pipeline produce?',
    codeSnippet: `const data = [3, 6, 9];\nconst out = data\n  .map(x => x + 1)\n  .filter(x => x % 2 === 0);`,
    options: ['[4, 10]', '[4, 7, 10]', '[6, 10]', '[4, 8]'],
    correctIndex: 0,
    explanation: 'map produces [4, 7, 10], and filter keeps only numbers where x % 2 === 0, leaving [4, 10].',
  },
  {
    id: 'prog-4',
    domain: 'programming',
    difficulty: 2,
    prompt: 'What value is assigned to role in JavaScript?',
    codeSnippet: `const role = null ?? ('admin' && 'dashboard');`,
    options: ['null', '"admin"', '"dashboard"', 'true'],
    correctIndex: 2,
    explanation: 'Logical AND returns the right operand ("dashboard"), and ?? falls back to it because the left operand is null.',
  },
  {
    id: 'prog-5',
    domain: 'programming',
    difficulty: 2,
    prompt: 'What does the recursive function return for sumDown(6)?',
    codeSnippet: `function sumDown(n) {\n  if (n <= 0) return 0;\n  return n + sumDown(n - 2);\n}`,
    options: ['10', '12', '14', '21'],
    correctIndex: 1,
    explanation: 'sumDown(6) evaluates to 6 + 4 + 2 + 0 = 12.',
  },
  {
    id: 'prog-6',
    domain: 'programming',
    difficulty: 3,
    prompt: 'What value is logged after executing this closure loop?',
    codeSnippet: `const callbacks = [];\nfor (var i = 0; i < 3; i++) {\n  callbacks.push(() => i);\n}\nconsole.log(callbacks[0]() + callbacks[1]());`,
    options: ['1', '3', '6', 'undefined'],
    correctIndex: 2,
    explanation: 'var is function-scoped; by the time callbacks execute, i is 3 for all closures, so 3 + 3 = 6.',
  },
  {
    id: 'prog-7',
    domain: 'programming',
    difficulty: 3,
    prompt: 'In what exact sequence are the letters printed to the console?',
    codeSnippet: `console.log('A');\nsetTimeout(() => console.log('B'), 0);\nPromise.resolve().then(() => console.log('C'));\nconsole.log('D');`,
    options: ['A, D, C, B', 'A, B, C, D', 'A, C, D, B', 'A, D, B, C'],
    correctIndex: 0,
    explanation: 'Synchronous statements (A, D) run first, followed by microtasks (C), and finally macrotask timers (B).',
  },
  {
    id: 'prog-8',
    domain: 'programming',
    difficulty: 3,
    prompt: 'An algorithm splits its input size from N to N/2 on each step and executes O(1) operations per step. What is its time complexity?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
    correctIndex: 1,
    explanation: 'Halving the input space on each iteration is the mathematical definition of logarithmic time complexity O(log N).',
  },

  // ==========================================
  // ANALYTICAL (8 questions: ratios, percentages, reading tables, rates)
  // ==========================================
  {
    id: 'anal-1',
    domain: 'analytical',
    difficulty: 1,
    prompt: 'A software subscription costs $400/month. A 25% startup discount is applied, followed by an additional 10% annual prepayment discount on the reduced price. What is the final monthly rate?',
    options: ['$260', '$270', '$280', '$300'],
    correctIndex: 1,
    explanation: '25% off $400 gives $300; 10% off $300 subtracts $30, resulting in $270.',
  },
  {
    id: 'anal-2',
    domain: 'analytical',
    difficulty: 1,
    prompt: 'A university assigns 150 engineering project teams in a 3 : 2 ratio between Web Apps and Data Science. How many teams work on Web Apps?',
    options: ['60', '75', '90', '100'],
    correctIndex: 2,
    explanation: 'The 3 : 2 ratio divides 150 into 5 parts of 30 teams; Web Apps receives 3 * 30 = 90 teams.',
  },
  {
    id: 'anal-3',
    domain: 'analytical',
    difficulty: 2,
    prompt: 'Examine the latency and traffic distribution table below. What is the global traffic-weighted average latency?',
    tableData: {
      headers: ['Region', 'Avg Latency (ms)', 'Traffic Share'],
      rows: [
        ['US East', 30, '50%'],
        ['EU Central', 40, '30%'],
        ['AP South', 70, '20%'],
      ],
    },
    options: ['38 ms', '41 ms', '45 ms', '46.7 ms'],
    correctIndex: 1,
    explanation: '(30 * 0.50) + (40 * 0.30) + (70 * 0.20) = 15 + 12 + 14 = 41 ms.',
  },
  {
    id: 'anal-4',
    domain: 'analytical',
    difficulty: 2,
    prompt: 'A telemetry pipeline ingests 14.4 gigabytes (GB) of sensor events in 2 hours. What is the average ingress speed in megabytes per second (MB/s)? (Assume 1 GB = 1,000 MB).',
    options: ['1.5 MB/s', '2.0 MB/s', '2.4 MB/s', '3.6 MB/s'],
    correctIndex: 1,
    explanation: '14.4 GB = 14,400 MB; dividing by 7,200 seconds (2 * 3,600) yields exactly 2.0 MB/s.',
  },
  {
    id: 'anal-5',
    domain: 'analytical',
    difficulty: 2,
    prompt: 'Review quarterly revenue in the table below. Which quarter experienced the fastest percentage growth compared to the immediately preceding quarter?',
    tableData: {
      headers: ['Quarter', 'Revenue ($k)'],
      rows: [
        ['Q1', 80],
        ['Q2', 100],
        ['Q3', 125],
        ['Q4', 150],
      ],
    },
    options: ['Q2 and Q3 tied at 25%', 'Q2 at 25%', 'Q3 at 31.25%', 'Q4 at 20%'],
    correctIndex: 0,
    explanation: 'Both Q2 ((100-80)/80 = 25%) and Q3 ((125-100)/100 = 25%) achieved 25% growth, while Q4 grew by 20%.',
  },
  {
    id: 'anal-6',
    domain: 'analytical',
    difficulty: 3,
    prompt: 'A vulnerability scanner has a 90% true positive rate on vulnerable codebases and a 10% false positive rate on secure ones. If 5% of 1,000 codebases have real vulnerabilities, what is the probability that a flagged codebase is actually vulnerable?',
    options: ['~32%', '~50%', '~75%', '~90%'],
    correctIndex: 0,
    explanation: 'Out of 1,000 repos, 45 true positives and 95 false positives are flagged, giving 45 / (45 + 95) = 32.1%.',
  },
  {
    id: 'anal-7',
    domain: 'analytical',
    difficulty: 3,
    prompt: 'Tier 1 charges $50/month base plus $0.005 per API call. Tier 2 charges a flat $200/month unlimited fee. At what minimum number of monthly API calls does Tier 2 become more economical?',
    options: ['15,000 calls', '25,000 calls', '30,000 calls', '40,000 calls'],
    correctIndex: 2,
    explanation: 'The $150 difference divided by $0.005 per call equals 30,000 calls; above 30,000 calls, Tier 2 costs less.',
  },
  {
    id: 'anal-8',
    domain: 'analytical',
    difficulty: 3,
    prompt: 'Node Alpha processes 360 tasks in 4 hours using 3 concurrent workers. Node Beta processes 480 tasks in 3 hours using 4 concurrent workers. What is the ratio of tasks completed per worker-hour between Alpha and Beta?',
    options: ['3 : 4', '4 : 3', '1 : 1', '2 : 3'],
    correctIndex: 0,
    explanation: 'Alpha outputs 360 / (4 * 3) = 30 tasks/worker-hr; Beta outputs 480 / (3 * 4) = 40 tasks/worker-hr; 30:40 simplifies to 3:4.',
  },

  // ==========================================
  // COMMUNICATION (8 questions: comprehension, clarity, grammar, tone)
  // ==========================================
  {
    id: 'comm-1',
    domain: 'communication',
    difficulty: 1,
    prompt: 'Which revision eliminates bureaucratic filler and communicates the issue most clearly to engineering?',
    codeSnippet: `"It has come to our attention that potentially detrimental performance anomalies are transpiring upon login attempts."`,
    options: [
      '"Performance anomalies transpire intermittently in our customer portal"',
      '"Login page takes >8 seconds to respond due to auth timeout"',
      '"Detrimental observations regarding user credential submission latency"',
      '"System operations team notes urgent remediation required for login"',
    ],
    correctIndex: 1,
    explanation: 'It states the measurable symptom (>8s response) and root cause (auth timeout) with zero wordy filler.',
  },
  {
    id: 'comm-2',
    domain: 'communication',
    difficulty: 1,
    prompt: 'Which sentence correctly follows standard subject-verb agreement rules for technical documentation?',
    options: [
      '"Neither the primary cache nor the database replicas were impacted by the power failure."',
      '"Neither the primary cache nor the database replicas was impacted by the power failure."',
      '"Neither the primary cache nor the database replicas has been impacted by the power failure."',
      '"Neither the primary cache or the database replicas were impacted by the power failure."',
    ],
    correctIndex: 0,
    explanation: 'With "neither... nor", the verb agrees with the closer subject ("database replicas" is plural, requiring "were").',
  },
  {
    id: 'comm-3',
    domain: 'communication',
    difficulty: 2,
    prompt: 'An engineer explains: "The API returned HTTP 429 because the burst token bucket exhausted its client quota." How should this be conveyed to a business stakeholder?',
    options: [
      '"The HTTP 429 status code indicates bucket leakage across our infrastructure."',
      '"Temporary traffic limits were triggered when user requests surged; users saw a brief retry notice until the rate reset."',
      '"The database crashed because client security tokens became corrupt in memory."',
      '"We need to replace our relational database architecture with NoSQL immediately."',
    ],
    correctIndex: 1,
    explanation: 'It translates technical quota semantics into user-visible business context without technical jargon.',
  },
  {
    id: 'comm-4',
    domain: 'communication',
    difficulty: 2,
    prompt: 'When reviewing a pull request containing an unindexed O(N^2) nested loop, which feedback comment promotes the best engineering collaboration?',
    options: [
      '"Why did you write an O(N^2) loop here? This will crash production."',
      '"Great progress getting the test cases passing! For large arrays, could we map this to a Set to bring lookup time down to O(N)?"',
      '"Please rewrite this entirely because clean code never uses nested loops."',
      '"Looks fine to me, let someone else check performance before merging."',
    ],
    correctIndex: 1,
    explanation: 'It validates the functional progress, explains the scaling trade-off, and suggests a specific constructive optimization.',
  },
  {
    id: 'comm-5',
    domain: 'communication',
    difficulty: 2,
    prompt: 'Which sentence correctly punctuates a complex list whose internal items contain commas?',
    options: [
      '"Our data centers are located in Ashburn, Virginia; Dublin, Ireland; and Frankfurt, Germany."',
      '"Our data centers are located in Ashburn, Virginia, Dublin, Ireland, and Frankfurt, Germany."',
      '"Our data centers are located in: Ashburn, Virginia; Dublin, Ireland, and Frankfurt; Germany."',
      '"Our data centers are located in Ashburn; Virginia; Dublin; Ireland; and Frankfurt; Germany."',
    ],
    correctIndex: 0,
    explanation: 'Semicolons are required to separate list items when the items themselves contain internal commas.',
  },
  {
    id: 'comm-6',
    domain: 'communication',
    difficulty: 3,
    prompt: 'Your release is delayed by one week due to a critical third-party security advisory. What is the most transparent executive update?',
    options: [
      '"Everything is generally going fine, though we might miss Friday depending on external teams."',
      '"Project status is Yellow: Vendor security patch adds 5 days of testing; launch is moved to Nov 12 with full compliance sign-off."',
      '"The third-party vendor broke our code, so the missed deadline is beyond our control."',
      '"We will work overnight shifts so nobody has to reschedule the release meeting."',
    ],
    correctIndex: 1,
    explanation: 'It gives an objective status rating (Yellow), specific cause, exact calendar impact (+5 days), and a revised target date.',
  },
  {
    id: 'comm-7',
    domain: 'communication',
    difficulty: 3,
    prompt: 'Which statement adheres to the industry principles of a blameless post-mortem after an outage?',
    options: [
      '"An engineer ran a migration without reading the documentation carefully."',
      '"The production migration tool lacked pre-flight environment checks; we have added automated safeguards and dry-run validation."',
      '"Human negligence caused the downtime, and the author has been cautioned."',
      '"Nobody remembered to take a database backup prior to deployment."',
    ],
    correctIndex: 1,
    explanation: 'Blameless engineering post-mortems analyze systemic guardrails and structural prevention rather than individual blame.',
  },
  {
    id: 'comm-8',
    domain: 'communication',
    difficulty: 3,
    prompt: 'What is the primary organizational purpose of an Architecture Decision Record (ADR)?',
    options: [
      '"To track git commit hashes during a sprint cycle"',
      '"To capture why a key architectural decision was chosen, the options evaluated, and the accepted trade-offs"',
      '"To provide marketing copy explaining product features to potential buyers"',
      '"To record daily standup notes and sprint backlog estimates"',
    ],
    correctIndex: 1,
    explanation: 'ADRs document the context, alternatives, and deliberate trade-offs of architectural decisions for current and future maintainers.',
  },

  // ==========================================
  // DESIGN (8 questions: hierarchy, contrast, spatial patterns, ergonomics)
  // ==========================================
  {
    id: 'design-1',
    domain: 'design',
    difficulty: 1,
    prompt: 'When styling an information card, which visual technique establishes the clearest primary focal point for rapid visual scanning?',
    options: [
      'Applying uniform medium-grey text across all titles, badges, and labels',
      'Creating distinct typographic scale and weight contrast on the primary headline with surrounding whitespace',
      'Adding a rapidly blinking neon border animation around the entire card',
      'Setting all paragraph text in italicized uppercase font',
    ],
    correctIndex: 1,
    explanation: 'Typographic hierarchy through scale, weight, and breathing room anchors user visual scanning before secondary details.',
  },
  {
    id: 'design-2',
    domain: 'design',
    difficulty: 1,
    prompt: 'Under WCAG 2.1 Level AA accessibility standards, what is the minimum required contrast ratio for regular body text (under 18pt) against its background?',
    options: ['3.0 : 1', '4.5 : 1', '7.0 : 1', '10.0 : 1'],
    correctIndex: 1,
    explanation: 'WCAG 2.1 AA mandates a minimum contrast ratio of 4.5:1 for standard body text (and 3:1 for large text 18pt+).',
  },
  {
    id: 'design-3',
    domain: 'design',
    difficulty: 2,
    prompt: 'Inspect the inline spatial pattern below. Cards A and B have 16px margins, but Card C has an unexpected 28px margin. What core layout principle is violated?',
    svgType: 'spacing-rhythm',
    options: [
      'Consistent spatial rhythm on an established grid scale (e.g. 8px/16px)',
      'Color wheel harmony and saturation balance',
      'Typographic tracking and kerning',
      'Skeuomorphic surface lighting',
    ],
    correctIndex: 0,
    explanation: 'Predictable spatial grids create subconscious visual rhythm; arbitrary margins break layout harmony and visual alignment.',
  },
  {
    id: 'design-4',
    domain: 'design',
    difficulty: 2,
    prompt: 'Which visual treatment best signifies a destructive action (such as "Delete Workspace") while preventing accidental user activation?',
    options: [
      'A large bright neon-green button labeled "Proceed"',
      'A subdued red-bordered button requiring a confirmation dialog or type-to-confirm step',
      'An unstyled hyperlink indistinguishable from normal body text',
      'A small icon button with no text label, tooltip, or confirmation',
    ],
    correctIndex: 1,
    explanation: 'Subdued red signals caution without overpowering positive actions, and a secondary step prevents accidental deletion.',
  },
  {
    id: 'design-5',
    domain: 'design',
    difficulty: 2,
    prompt: 'According to mobile ergonomic guidelines (Apple HIG and Material Design), what is the minimum recommended touch target size for interactive elements?',
    svgType: 'touch-target',
    options: ['24 x 24 px', '32 x 32 px', '44 x 44 px (or 48 x 48 px)', '64 x 64 px'],
    correctIndex: 2,
    explanation: 'A 44x44px (iOS) or 48x48px (Android) minimum target accommodates physical human finger pad variance and prevents tap errors.',
  },
  {
    id: 'design-6',
    domain: 'design',
    difficulty: 3,
    prompt: 'When translating a 4-column desktop dashboard table to a mobile screen (375px width), what is the most ergonomic UX transformation?',
    options: [
      'Scaling the entire 4-column layout down to 25% zoom so it fits on one screen without scrolling',
      'Reflowing into vertical stacked cards or a swipeable table with sticky headers and comfortable touch targets',
      'Permanently hiding 3 of the 4 columns for all mobile visitors',
      'Forcing horizontal scrolling with no visual clipping cues or indicators',
    ],
    correctIndex: 1,
    explanation: 'Reflowing into vertical cards or providing anchored column swiping preserves text legibility and ergonomic touch interaction.',
  },
  {
    id: 'design-7',
    domain: 'design',
    difficulty: 3,
    prompt: 'In responsive typography, what is the generally recommended optimal line length (measure) for sustained technical reading comfort?',
    options: ['15 to 25 characters', '50 to 75 characters', '120 to 160 characters', '200+ characters'],
    correctIndex: 1,
    explanation: '50 to 75 characters per line (including spaces) provides optimal scanning comfort without causing line-tracking fatigue.',
  },
  {
    id: 'design-8',
    domain: 'design',
    difficulty: 3,
    prompt: 'In form layout ergonomics, how does the Gestalt Law of Proximity govern spacing between labels, inputs, and neighboring fields?',
    options: [
      'All vertical gaps should be strictly equal (16px) regardless of functional relationship',
      'A field label must sit closer to its corresponding input (e.g. 6px) than the separation between field groups (e.g. 24px)',
      'The distance from a label to its input should be larger than the gap to the next input',
      'Validation helper text should be placed 36px below the input field',
    ],
    correctIndex: 1,
    explanation: 'Closer proximity between a label and its input visually binds them into a single coherent field unit.',
  },
];

export interface QuizAttempt {
  id: string;
  timestamp: number;
  dateLabel: string;
  mode: 'quick' | 'full';
  totalQuestions: number;
  correctQuestions: number;
  timeTakenSeconds: number;
  overallScore: number;
  domainScores: Record<DomainKey, number>;
  domainBreakdowns: Record<DomainKey, {
    score: number;
    earnedPoints: number;
    maxPoints: number;
    correctCount: number;
    totalCount: number;
  }>;
  strongestDomain: DomainKey;
}

export const DIFFICULTY_WEIGHTS: Record<1 | 2 | 3, number> = {
  1: 1.0,
  2: 1.5,
  3: 2.0,
};

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQuizSession(mode: 'quick' | 'full'): QuizQuestion[] {
  const questionsPerDomain = mode === 'quick' ? 3 : 6;
  const domains: DomainKey[] = ['programming', 'analytical', 'communication', 'design'];
  const selected: QuizQuestion[] = [];

  domains.forEach((dom) => {
    const domainQuestions = QUIZ_BANK.filter((q) => q.domain === dom);
    const shuffledPool = shuffleArray(domainQuestions);
    const picked = shuffledPool.slice(0, questionsPerDomain);

    picked.forEach((q) => {
      const originalCorrectOption = q.options[q.correctIndex];
      const shuffledOptions = shuffleArray(q.options);
      const newCorrectIndex = shuffledOptions.indexOf(originalCorrectOption);
      selected.push({
        ...q,
        options: shuffledOptions,
        correctIndex: newCorrectIndex,
      });
    });
  });

  return shuffleArray(selected);
}

export function calculateQuizResults(
  questions: QuizQuestion[],
  userAnswers: Record<string, number>,
  timeTakenSeconds: number,
  mode: 'quick' | 'full'
): QuizAttempt {
  const domains: DomainKey[] = ['programming', 'analytical', 'communication', 'design'];
  const domainBreakdowns: QuizAttempt['domainBreakdowns'] = {
    programming: { score: 0, earnedPoints: 0, maxPoints: 0, correctCount: 0, totalCount: 0 },
    analytical: { score: 0, earnedPoints: 0, maxPoints: 0, correctCount: 0, totalCount: 0 },
    communication: { score: 0, earnedPoints: 0, maxPoints: 0, correctCount: 0, totalCount: 0 },
    design: { score: 0, earnedPoints: 0, maxPoints: 0, correctCount: 0, totalCount: 0 },
  };

  let totalEarned = 0;
  let totalMax = 0;
  let correctQuestions = 0;

  questions.forEach((q) => {
    const isCorrect = userAnswers[q.id] === q.correctIndex;
    const weight = DIFFICULTY_WEIGHTS[q.difficulty];
    const dom = q.domain;

    domainBreakdowns[dom].totalCount += 1;
    domainBreakdowns[dom].maxPoints += weight;
    totalMax += weight;

    if (isCorrect) {
      domainBreakdowns[dom].correctCount += 1;
      domainBreakdowns[dom].earnedPoints += weight;
      totalEarned += weight;
      correctQuestions += 1;
    }
  });

  const domainScores: Record<DomainKey, number> = {
    programming: 0,
    analytical: 0,
    communication: 0,
    design: 0,
  };

  domains.forEach((dom) => {
    const b = domainBreakdowns[dom];
    b.score = b.maxPoints > 0 ? Math.round((b.earnedPoints / b.maxPoints) * 100) : 0;
    domainScores[dom] = b.score;
  });

  const overallScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  let strongestDomain: DomainKey = 'programming';
  let highestScore = -1;
  domains.forEach((dom) => {
    if (domainScores[dom] > highestScore) {
      highestScore = domainScores[dom];
      strongestDomain = dom;
    }
  });

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: `attempt_${crypto.randomUUID()}`,
    timestamp: Date.now(),
    dateLabel,
    mode,
    totalQuestions: questions.length,
    correctQuestions,
    timeTakenSeconds,
    overallScore,
    domainScores,
    domainBreakdowns,
    strongestDomain,
  };
}
