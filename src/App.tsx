/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SkillPath AI – Main Application Container
 * Student Strengths -> Career Pathways -> 30-Day Plan
 * Cloud & Local Persistence Architecture:
 * - Supabase Authentication with Google Sign-In & Split-Screen Login (#login)
 * - Supabase Database synchronization under profiles / quiz_attempts tables
 * - Real-time Saved / Saving / Offline sync indicator
 * - Guest mode preserved via localStorage with First-Login Guest Data Import
 * - Aptitude Quiz screening (#quiz) with named 0.6 / 0.4 constants and backward compatibility
 * - URL Hash sync for Browser Back/Forward navigation
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TopBar, PageId, SyncStatus } from './components/TopBar.tsx';
import { BottomTabBar } from './components/BottomTabBar.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { ImportGuestModal } from './components/ImportGuestModal.tsx';
import { HomeView } from './views/HomeView.tsx';
import { AssessmentView } from './views/AssessmentView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { CareersView } from './views/CareersView.tsx';
import { PlanView } from './views/PlanView.tsx';
import { MethodView } from './views/MethodView.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { LoginView } from './views/LoginView.tsx';
import { QuizView } from './views/QuizView.tsx';
import { VaultView } from './views/VaultView.tsx';
import { EvidenceView } from './views/EvidenceView.tsx';
import {
  DomainKey,
  DomainMetrics,
  AssessmentSnapshot,
  calculateDomainScore,
  calculateCareerFit,
  calculateCombinedScore,
  SELF_REPORTED_WEIGHT,
  QUIZ_WEIGHT,
  DEMO_PROFILE,
  SAMPLE_PROFILE,
  CAREER_PLANS,
  CAREERS,
} from './utils/scoring.ts';
import type { QuizAttempt } from './utils/quizBank.ts';
import {
  onAuthStateChanged,
  fetchUserData,
  saveUserData,
  logoutUser,
  AppUser,
  FirebaseUser,
  getPendingSignupName,
  clearPendingSignupName,
  VaultItem,
  fetchVaultMetadataList,
} from './services/supabase.ts';

const VALID_PAGES: PageId[] = [
  'home',
  'profile',
  'assessment',
  'quiz',
  'dashboard',
  'careers',
  'plan',
  'method',
  'login',
  'vault',
  'evidence',
];

export default function App() {
  // Helper to read current URL hash
  const getPageFromHash = (): PageId => {
    const raw = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    if (!raw || raw === 'home') return 'home';
    return VALID_PAGES.includes(raw as PageId) ? (raw as PageId) : 'home';
  };

  // Page Routing State initialized from URL hash
  const [activePage, setActivePage] = useState<PageId>(getPageFromHash);

  // Synchronize on browser Back / Forward (hashchange)
  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(getPageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigation handler that updates window.location.hash
  const navigate = useCallback((page: PageId) => {
    window.location.hash = `#${page}`;
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Dark Mode State with prefers-color-scheme detection and localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('skillpath_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('skillpath_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('skillpath_theme', 'light');
    }
  }, [isDarkMode]);

  // Guest Mode persistent choice flag ('skillpath_guest_chosen')
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('skillpath_guest_chosen') === 'true';
    } catch {
      return false;
    }
  });

  const handleContinueAsGuest = useCallback(() => {
    try {
      localStorage.setItem('skillpath_guest_chosen', 'true');
    } catch (e) {
      console.warn('Unable to persist guest flag', e);
    }
    setIsGuestMode(true);
    navigate('home');
  }, [navigate]);

  // Demo Mode flag: read-only benchmark mode (scores 76, 28, 68, 22)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Student Profile State
  const [studentName, setStudentName] = useState<string>(DEMO_PROFILE.name);
  const [studentYear, setStudentYear] = useState<string>(DEMO_PROFILE.year);
  const [studentFocus, setStudentFocus] = useState<string>(DEMO_PROFILE.focus);
  const [studentStatement, setStudentStatement] = useState<string>(DEMO_PROFILE.statement);

  // Domain metrics containing marks, confidence, practice, and skill
  const [domainMetrics, setDomainMetrics] = useState<Record<DomainKey, DomainMetrics>>({
    programming: { ...DEMO_PROFILE.domainMetrics.programming },
    analytical: { ...DEMO_PROFILE.domainMetrics.analytical },
    communication: { ...DEMO_PROFILE.domainMetrics.communication },
    design: { ...DEMO_PROFILE.domainMetrics.design },
  });

  // 8 Self-Report Question Answers
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({
    ...DEMO_PROFILE.answers,
  });

  // Selected Career for 30-Day Plan (retained across retakes!)
  const [selectedCareerId, setSelectedCareerId] = useState<string>('frontend-developer');

  // Plan progress saved PER CAREER in localStorage or Cloud
  const [planProgressByCareer, setPlanProgressByCareer] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem('skillpath_career_plans');
      return saved ? JSON.parse(saved) : {
        'frontend-developer': { 'fe-1': true, 'fe-2': true },
      };
    } catch {
      return { 'frontend-developer': { 'fe-1': true, 'fe-2': true } };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('skillpath_career_plans', JSON.stringify(planProgressByCareer));
    } catch (e) {
      console.warn('Unable to persist career plans locally', e);
    }
  }, [planProgressByCareer]);

  // Dated Assessment Snapshots History
  const [snapshots, setSnapshots] = useState<AssessmentSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('skillpath_snapshot_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Unable to read snapshot history', e);
    }
    return [
      {
        id: 'snap_baseline',
        timestamp: Date.now() - 14 * 86400000,
        dateLabel: 'Week 1 Baseline',
        scores: { programming: 60, analytical: 25, communication: 60, design: 30 },
        answers: { ...DEMO_PROFILE.answers },
      },
      {
        id: 'snap_latest',
        timestamp: Date.now(),
        dateLabel: 'Latest Retake',
        scores: { programming: 76, analytical: 28, communication: 68, design: 22 },
        answers: { ...DEMO_PROFILE.answers },
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('skillpath_snapshot_history', JSON.stringify(snapshots));
    } catch (e) {
      console.warn('Unable to persist snapshot history locally', e);
    }
  }, [snapshots]);

  // Aptitude Quiz Attempts History
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>(() => {
    try {
      const saved = localStorage.getItem('skillpath_quiz_attempts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Unable to read quiz attempts from localStorage', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('skillpath_quiz_attempts', JSON.stringify(quizAttempts));
    } catch (e) {
      console.warn('Unable to persist quiz attempts locally', e);
    }
  }, [quizAttempts]);

  // --- Authentication & Cloud Sync States ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => setSyncStatus('saved');
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to Supabase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        setSyncStatus('saving');

        // Fetch student's private Study Vault items for Dashboard counts and deadlines
        fetchVaultMetadataList(user.uid)
          .then((items) => setVaultItems(items))
          .catch((err) => console.warn('Study vault fetch notice:', err));

        // If user is logged in, skip login screen and go straight to dashboard (#dashboard)
        const currentHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
        if (currentHash === 'login' || currentHash === 'home' || !currentHash) {
          navigate('dashboard');
        }

        try {
          const pendingName = getPendingSignupName();
          const resolvedName = pendingName || user.displayName || '';
          const cloudData = await fetchUserData(user.uid);

          if (cloudData) {
            // Existing cloud profile found: load into state
            const finalStudentName = cloudData.studentName || resolvedName || user.displayName || '';
            setStudentName(finalStudentName);
            setStudentYear(cloudData.studentYear || 'Year 1 Undergraduate');
            setStudentFocus(cloudData.studentFocus || '');
            setStudentStatement(cloudData.studentStatement || '');
            if (cloudData.domainMetrics) setDomainMetrics(cloudData.domainMetrics);
            if (cloudData.assessmentAnswers) setAssessmentAnswers(cloudData.assessmentAnswers);
            if (cloudData.selectedCareerId) setSelectedCareerId(cloudData.selectedCareerId);
            if (cloudData.planProgressByCareer) setPlanProgressByCareer(cloudData.planProgressByCareer);
            if (cloudData.snapshots) setSnapshots(cloudData.snapshots);
            if (cloudData.quizAttempts) setQuizAttempts(cloudData.quizAttempts);
            setIsDemoMode(false);
            setSyncStatus('saved');
            setIsCloudLoaded(true);

            // Ensure name is synced if it was previously blank
            if ((!cloudData.studentName || !cloudData.displayName) && resolvedName) {
              saveUserData(user.uid, {
                studentName: finalStudentName,
                displayName: finalStudentName,
              });
            }
            clearPendingSignupName();
          } else {
            // Check if user had non-demo guest data
            const hadGuestWork = !isDemoMode && (Object.keys(assessmentAnswers).length > 0 || quizAttempts.length > 0);
            if (hadGuestWork) {
              setShowImportModal(true);
            } else {
              // Newly logged-in user with no cloud data starts with an empty profile (not demo mode)
              setIsDemoMode(false);
              setStudentName(resolvedName);
              setStudentYear('Year 1 Undergraduate');
              setStudentFocus('');
              setStudentStatement('');
              const freshMetrics: Record<DomainKey, DomainMetrics> = {
                programming: { marks: null, confidence: 50, practice: 50, skill: 50 },
                analytical: { marks: null, confidence: 50, practice: 50, skill: 50 },
                communication: { marks: null, confidence: 50, practice: 50, skill: 50 },
                design: { marks: null, confidence: 50, practice: 50, skill: 50 },
              };
              setDomainMetrics(freshMetrics);
              setAssessmentAnswers({});
              setSelectedCareerId('frontend-developer');
              setPlanProgressByCareer({});
              setSnapshots([]);
              setQuizAttempts([]);

              await saveUserData(user.uid, {
                email: user.email,
                displayName: resolvedName,
                photoURL: user.photoURL,
                studentName: resolvedName,
                studentYear: 'Year 1 Undergraduate',
                studentFocus: '',
                studentStatement: '',
                domainMetrics: freshMetrics,
                assessmentAnswers: {},
                selectedCareerId: 'frontend-developer',
                planProgressByCareer: {},
                snapshots: [],
                quizAttempts: [],
              });
              setIsCloudLoaded(true);
              setSyncStatus('saved');
              clearPendingSignupName();
            }
          }
        } catch (error) {
          console.error('Error fetching user cloud data:', error);
          setSyncStatus('error');
          setSyncError('Could not retrieve cloud data. Check connection.');
        }
      } else {
        setCurrentUser(null);
        setVaultItems([]);
        setIsCloudLoaded(false);
        setSyncStatus('saved');
      }
    });

    return () => unsubscribe();
  }, []);

  // Debounced cloud save when user is logged in
  useEffect(() => {
    if (!currentUser || !isCloudLoaded || isDemoMode) return;

    setSyncStatus('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
      }
      try {
        await saveUserData(currentUser.uid, {
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          studentName,
          studentYear,
          studentFocus,
          studentStatement,
          domainMetrics,
          assessmentAnswers,
          selectedCareerId,
          planProgressByCareer,
          snapshots,
          quizAttempts,
        });
        setSyncStatus('saved');
        setSyncError(null);
      } catch (err) {
        console.error('Debounced save failed:', err);
        setSyncStatus('error');
        setSyncError('Failed to save changes to cloud.');
      }
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    currentUser,
    isCloudLoaded,
    isDemoMode,
    studentName,
    studentYear,
    studentFocus,
    studentStatement,
    domainMetrics,
    assessmentAnswers,
    selectedCareerId,
    planProgressByCareer,
    snapshots,
    quizAttempts,
  ]);

  // Handle first-login import of guest data
  const handleImportGuestData = async () => {
    if (!currentUser) return;
    try {
      setSyncStatus('saving');
      await saveUserData(currentUser.uid, {
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        studentName: studentName || currentUser.displayName || '',
        studentYear,
        studentFocus,
        studentStatement,
        domainMetrics,
        assessmentAnswers,
        selectedCareerId,
        planProgressByCareer,
        snapshots,
        quizAttempts,
      });
      setIsCloudLoaded(true);
      setShowImportModal(false);
      setSyncStatus('saved');
    } catch (e) {
      console.error('Failed to import guest data:', e);
      setSyncStatus('error');
    }
  };

  // Handle starting fresh on first login
  const handleStartFresh = async () => {
    if (!currentUser) return;
    try {
      setSyncStatus('saving');
      const freshName = currentUser.displayName || '';
      setStudentName(freshName);
      setStudentYear('Year 1 Undergraduate');
      setStudentFocus('');
      setStudentStatement('');
      setAssessmentAnswers({});
      setQuizAttempts([]);

      await saveUserData(currentUser.uid, {
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        studentName: freshName,
        studentYear: 'Year 1 Undergraduate',
        studentFocus: '',
        studentStatement: '',
        domainMetrics: {
          programming: { marks: null, confidence: 50, practice: 50, skill: 50 },
          analytical: { marks: null, confidence: 50, practice: 50, skill: 50 },
          communication: { marks: null, confidence: 50, practice: 50, skill: 50 },
          design: { marks: null, confidence: 50, practice: 50, skill: 50 },
        },
        assessmentAnswers: {},
        selectedCareerId: 'frontend-developer',
        planProgressByCareer: {},
        snapshots: [],
        quizAttempts: [],
      });
      setIsCloudLoaded(true);
      setShowImportModal(false);
      setSyncStatus('saved');
      navigate('profile');
    } catch (e) {
      console.error('Failed to start fresh:', e);
      setSyncStatus('error');
    }
  };

  // Save new Aptitude Quiz attempt
  const handleSaveQuizAttempt = async (attempt: QuizAttempt) => {
    const updated = [...quizAttempts, attempt];
    setQuizAttempts(updated);
    setIsDemoMode(false);

    if (currentUser) {
      setSyncStatus('saving');
      try {
        await saveUserData(currentUser.uid, {
          quizAttempts: updated,
        });
        setSyncStatus('saved');
      } catch (e) {
        console.warn('Failed saving quiz attempt to cloud', e);
      }
    }
  };

  // Clear Aptitude Quiz attempts
  const handleClearQuizAttempts = async () => {
    setQuizAttempts([]);
    if (currentUser) {
      try {
        await saveUserData(currentUser.uid, {
          quizAttempts: [],
        });
      } catch (e) {
        console.warn('Failed clearing quiz attempts in cloud', e);
      }
    }
  };

  // Handle Logout: returns directly to full-screen login gate
  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setVaultItems([]);
      setIsGuestMode(false);
      try {
        localStorage.removeItem('skillpath_guest_chosen');
      } catch (e) {
        console.warn('Failed clearing guest flag', e);
      }
      setIsCloudLoaded(false);
      setIsDemoMode(true);
      setStudentName(DEMO_PROFILE.name);
      setStudentYear(DEMO_PROFILE.year);
      setStudentFocus(DEMO_PROFILE.focus);
      setStudentStatement(DEMO_PROFILE.statement);
      setDomainMetrics({
        programming: { ...DEMO_PROFILE.domainMetrics.programming },
        analytical: { ...DEMO_PROFILE.domainMetrics.analytical },
        communication: { ...DEMO_PROFILE.domainMetrics.communication },
        design: { ...DEMO_PROFILE.domainMetrics.design },
      });
      setAssessmentAnswers({ ...DEMO_PROFILE.answers });
      navigate('login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Export Modal State
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Latest saved aptitude quiz attempt
  const latestQuizAttempt = quizAttempts.length > 0 ? quizAttempts[quizAttempts.length - 1] : null;

  // Calculate Domain Scores deterministically from metrics
  const domainScoreResults = useMemo(() => {
    return {
      programming: calculateDomainScore(domainMetrics.programming),
      analytical: calculateDomainScore(domainMetrics.analytical),
      communication: calculateDomainScore(domainMetrics.communication),
      design: calculateDomainScore(domainMetrics.design),
    };
  }, [domainMetrics]);

  // Self-reported score baseline
  const selfReportedScores: Record<DomainKey, number> = useMemo(() => {
    return {
      programming: domainScoreResults.programming.score,
      analytical: domainScoreResults.analytical.score,
      communication: domainScoreResults.communication.score,
      design: domainScoreResults.design.score,
    };
  }, [domainScoreResults]);

  // Final domain scores: if quiz was taken and not in demo mode: 0.6 * self + 0.4 * quiz; otherwise identical to self
  const domainScores: Record<DomainKey, number> = useMemo(() => {
    if (!latestQuizAttempt || isDemoMode) {
      return selfReportedScores;
    }
    return {
      programming: calculateCombinedScore(selfReportedScores.programming, latestQuizAttempt.domainScores.programming),
      analytical: calculateCombinedScore(selfReportedScores.analytical, latestQuizAttempt.domainScores.analytical),
      communication: calculateCombinedScore(selfReportedScores.communication, latestQuizAttempt.domainScores.communication),
      design: calculateCombinedScore(selfReportedScores.design, latestQuizAttempt.domainScores.design),
    };
  }, [selfReportedScores, latestQuizAttempt, isDemoMode]);

  // Calculate Career Fits based on domain scores
  const careerFits = useMemo(() => {
    return calculateCareerFit(domainScores);
  }, [domainScores]);

  // Handle assessment question response
  const handleAnswerChange = (questionId: string, value: number) => {
    const updatedAnswers = { ...assessmentAnswers, [questionId]: value };
    setAssessmentAnswers(updatedAnswers);
    setIsDemoMode(false);

    // Map answer back to domain metrics
    const parts = questionId.split('_');
    const domainPrefix = parts[0];
    const metricType = parts[1] as 'practice' | 'confidence';

    let domainKey: DomainKey = 'programming';
    if (domainPrefix === 'anal') domainKey = 'analytical';
    else if (domainPrefix === 'comm') domainKey = 'communication';
    else if (domainPrefix === 'design') domainKey = 'design';

    setDomainMetrics((prev) => ({
      ...prev,
      [domainKey]: {
        ...prev[domainKey],
        [metricType]: value,
      },
    }));
  };

  // Submit assessment: saves a new dated snapshot WITHOUT wiping 30-day plan or career!
  const handleSubmitAssessment = () => {
    const now = new Date();
    const dateLabel = now.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const newSnapshot: AssessmentSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      dateLabel: `Assessment #${snapshots.length + 1} (${dateLabel})`,
      scores: { ...domainScores },
      answers: { ...assessmentAnswers },
    };
    setSnapshots((prev) => [...prev, newSnapshot]);
  };

  // Update domain metric (e.g. course marks from Profile view)
  const handleUpdateDomainMetric = (
    domain: DomainKey,
    field: keyof DomainMetrics,
    val: number | null
  ) => {
    setIsDemoMode(false);
    setDomainMetrics((prev) => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [field]: val,
      },
    }));
  };

  // Load Benchmark Demo Profile (Read-only reference: 76, 28, 68, 22)
  const handleLoadDemo = () => {
    setIsDemoMode(true);
    setStudentName(DEMO_PROFILE.name);
    setStudentYear(DEMO_PROFILE.year);
    setStudentFocus(DEMO_PROFILE.focus);
    setStudentStatement(DEMO_PROFILE.statement);
    setDomainMetrics({
      programming: { ...DEMO_PROFILE.domainMetrics.programming },
      analytical: { ...DEMO_PROFILE.domainMetrics.analytical },
      communication: { ...DEMO_PROFILE.domainMetrics.communication },
      design: { ...DEMO_PROFILE.domainMetrics.design },
    });
    setAssessmentAnswers({ ...DEMO_PROFILE.answers });
    setSelectedCareerId('frontend-developer');
    navigate('dashboard');
  };

  // Load Sample Profile (Editable form values, NOT demo mode)
  const handleLoadSample = () => {
    setIsDemoMode(false);
    setStudentName(SAMPLE_PROFILE.name);
    setStudentYear(SAMPLE_PROFILE.year);
    setStudentFocus(SAMPLE_PROFILE.focus);
    setStudentStatement(SAMPLE_PROFILE.statement);
    setDomainMetrics({
      programming: { ...SAMPLE_PROFILE.domainMetrics.programming },
      analytical: { ...SAMPLE_PROFILE.domainMetrics.analytical },
      communication: { ...SAMPLE_PROFILE.domainMetrics.communication },
      design: { ...SAMPLE_PROFILE.domainMetrics.design },
    });
    setAssessmentAnswers({ ...SAMPLE_PROFILE.answers });
    navigate('profile');
  };

  // Reset to Fresh State
  const handleReset = () => {
    setIsDemoMode(false);
    setStudentName('');
    setStudentYear('Year 1 Undergraduate');
    setStudentFocus('Exploring STEM Pathways');
    setStudentStatement('');
    setDomainMetrics({
      programming: { marks: null, confidence: 50, practice: 50, skill: 50 },
      analytical: { marks: null, confidence: 50, practice: 50, skill: 50 },
      communication: { marks: null, confidence: 50, practice: 50, skill: 50 },
      design: { marks: null, confidence: 50, practice: 50, skill: 50 },
    });
    setAssessmentAnswers({});
    navigate('assessment');
  };

  // Toggle task inside active career's plan
  const handleToggleTask = (taskId: string) => {
    setPlanProgressByCareer((prev) => {
      const current = prev[selectedCareerId] || {};
      return {
        ...prev,
        [selectedCareerId]: {
          ...current,
          [taskId]: !current[taskId],
        },
      };
    });
  };

  // Reset tasks for active career only
  const handleResetTasks = () => {
    setPlanProgressByCareer((prev) => ({
      ...prev,
      [selectedCareerId]: {},
    }));
  };

  const activeCareerTasks = planProgressByCareer[selectedCareerId] || {};
  const activePlanMilestones = CAREER_PLANS[selectedCareerId] || CAREER_PLANS['frontend-developer'];

  // Full-Screen Login Entry Gate:
  // 1. On first load, if not logged in and not chosen guest mode -> ONLY login screen.
  // 2. Or if on #login
  const isEntryGate = (!currentUser && !isGuestMode) || activePage === 'login';

  if (isEntryGate) {
    return (
      <LoginView
        onNavigate={navigate}
        currentUser={currentUser}
        onLoginSuccess={() => {
          navigate('dashboard');
        }}
        onContinueAsGuest={handleContinueAsGuest}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isInsideApp={isGuestMode && !currentUser}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8f6] text-[#17333b] dark:bg-[#0e1c20] dark:text-[#f0f5f3] transition-colors">
      
      {/* Glass Top Bar with User Avatar & Cloud Sync status */}
      <TopBar
        activePage={activePage}
        onNavigate={navigate}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isDemoMode={isDemoMode}
        onLoadDemo={handleLoadDemo}
        onLoadSample={handleLoadSample}
        onReset={handleReset}
        onOpenExport={() => setIsExportOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        syncStatus={syncStatus}
      />

      {/* Sync Error Banner if any */}
      {syncError && currentUser && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs px-4 py-2 text-center font-medium">
          {syncError}
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-12">
        {activePage === 'home' && (
          <HomeView
            onNavigate={navigate}
            onLoadDemo={handleLoadDemo}
            onLoadSample={handleLoadSample}
            studentName={studentName}
            isDemoMode={isDemoMode}
            domainScores={domainScores}
            selfReportedScores={selfReportedScores}
            careerFits={careerFits}
            latestQuizAttempt={latestQuizAttempt}
            quizAttempts={quizAttempts}
            planProgressByCareer={planProgressByCareer}
            selectedCareerId={selectedCareerId}
            assessmentAnswers={assessmentAnswers}
            onToggleTask={handleToggleTask}
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {activePage === 'assessment' && (
          <AssessmentView
            answers={assessmentAnswers}
            onAnswerChange={handleAnswerChange}
            onSubmitAssessment={handleSubmitAssessment}
            onNavigate={navigate}
            onLoadDemo={handleLoadDemo}
            onLoadSample={handleLoadSample}
          />
        )}

        {activePage === 'quiz' && (
          <QuizView
            onNavigate={navigate}
            selfReportedScores={selfReportedScores}
            quizAttempts={quizAttempts}
            onSaveQuizAttempt={handleSaveQuizAttempt}
            onClearQuizAttempts={handleClearQuizAttempts}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardView
            studentName={studentName}
            studentYear={studentYear}
            domainScores={domainScores}
            domainDetails={domainScoreResults}
            careerFits={careerFits}
            snapshots={snapshots}
            latestQuizAttempt={latestQuizAttempt}
            selfReportedScores={selfReportedScores}
            onNavigate={navigate}
            onLoadDemo={handleLoadDemo}
            isDemoMode={isDemoMode}
            vaultItems={vaultItems}
            activeCareerTasks={activeCareerTasks}
            activePlanMilestones={activePlanMilestones}
            selectedCareerId={selectedCareerId}
          />
        )}

        {activePage === 'careers' && (
          <CareersView
            careerFits={careerFits}
            selectedCareerId={selectedCareerId}
            onSelectCareerForPlan={setSelectedCareerId}
            onNavigate={navigate}
          />
        )}

        {activePage === 'plan' && (
          <PlanView
            selectedCareerId={selectedCareerId}
            onSelectCareer={setSelectedCareerId}
            completedTasks={activeCareerTasks}
            onToggleTask={handleToggleTask}
            onResetTasks={handleResetTasks}
            onOpenExport={() => setIsExportOpen(true)}
            onNavigate={navigate}
          />
        )}

        {activePage === 'method' && (
          <MethodView onNavigate={navigate} />
        )}

        {activePage === 'profile' && (
          <ProfileView
            name={studentName}
            setName={setStudentName}
            year={studentYear}
            setYear={setStudentYear}
            focus={studentFocus}
            setFocus={setStudentFocus}
            statement={studentStatement}
            setStatement={setStudentStatement}
            domainMetrics={domainMetrics}
            onUpdateDomainMetric={handleUpdateDomainMetric}
            onLoadDemo={handleLoadDemo}
            onLoadSample={handleLoadSample}
            onReset={handleReset}
            onNavigate={navigate}
          />
        )}

        {activePage === 'vault' && (
          <VaultView
            onNavigate={navigate}
            currentUser={currentUser}
            onVaultItemsChange={setVaultItems}
          />
        )}

        {activePage === 'evidence' && (
          <EvidenceView
            onNavigate={navigate}
            selfReportedScores={selfReportedScores}
            latestQuizAttempt={latestQuizAttempt}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar for screens under 760px */}
      <BottomTabBar
        activePage={activePage}
        onNavigate={navigate}
      />

      {/* First-login Guest Data Import Modal */}
      <ImportGuestModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportGuestData}
        onStartFresh={handleStartFresh}
        studentName={studentName}
        answeredCount={Object.keys(assessmentAnswers).length}
        completedTasksCount={Object.values(activeCareerTasks).filter(Boolean).length}
      />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        studentName={studentName}
        studentYear={studentYear}
        studentFocus={studentFocus}
        domainScores={domainScores}
        careerFits={careerFits}
        activePlan={activePlanMilestones}
        completedTasks={activeCareerTasks}
        latestQuizAttempt={latestQuizAttempt}
        selfReportedScores={selfReportedScores}
      />

      {/* Footer */}
      <footer className="hidden lg:block border-t border-slate-200/80 dark:border-slate-800/80 py-6 text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">SkillPath AI</span>
            <span>•</span>
            <span>Exploratory Career Compass for Undergraduates</span>
            <span>•</span>
            <span className="italic">Self-reported & screening, not validated</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('quiz')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Aptitude Quiz
            </button>
            <button
              onClick={() => navigate('login')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {currentUser ? 'Cloud Account' : 'Sign In'}
            </button>
            <button
              onClick={() => navigate('method')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Scoring Methodology
            </button>
            <button
              onClick={() => navigate('profile')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Student Record
            </button>
            <button
              onClick={() => setIsExportOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Export Report
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
