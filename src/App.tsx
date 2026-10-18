/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SkillPath AI - Main Application Container
 * Student Strengths -> Career Pathways -> 30-Day Plan
 * Cloud & Local Persistence Architecture:
 * - Supabase Authentication with Google Sign-In & Split-Screen Login (#login)
 * - Supabase Database synchronization under profiles / quiz_attempts tables
 * - Real-time Saved / Saving / Offline sync indicator
 * - Guest mode preserved via localStorage with First-Login Guest Data Import
 * - Aptitude Quiz screening (#quiz) with named 0.6 / 0.4 constants and backward compatibility
 * - URL Hash sync for Browser Back/Forward navigation
 */

import {freshWorkspace,readGuestWorkspace,writeGuestWorkspace,sanitizeWorkspace} from './utils/workspaceStorage.ts';
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
import { PasswordRecoveryView } from './views/PasswordRecoveryView.tsx';
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
  sanitizeDomainMetrics,
  DEMO_PROFILE,
  SAMPLE_PROFILE,
  CAREER_PLANS,
} from './utils/scoring.ts';
import type { QuizAttempt } from './utils/quizBank.ts';
import {
  onAuthStateChanged,
  fetchUserData,
  saveUserData,
  logoutUser,
  FirebaseUser,
  getPendingSignupName,
  clearPendingSignupName,
  clearUserQuizAttempts,
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
  const initialWorkspace=useMemo(readGuestWorkspace,[]);
  const [isPasswordRecovery,setIsPasswordRecovery]=useState(()=>new URLSearchParams(location.search).get('recovery')==='1' || /type=recovery/.test(location.hash));
  useEffect(()=>{const recover=()=>setIsPasswordRecovery(true);window.addEventListener('skillpath-password-recovery',recover);return ()=>window.removeEventListener('skillpath-password-recovery',recover);},[]);
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
    try {const saved = localStorage.getItem('skillpath_theme');
    if (saved) return saved === 'dark';} catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      try {localStorage.setItem('skillpath_theme', 'dark');} catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {localStorage.setItem('skillpath_theme', 'light');} catch {}
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

  const [isDemoMode,setIsDemoMode]=useState(initialWorkspace.isDemoMode);
  const [studentName,setStudentName]=useState(initialWorkspace.studentName);
  const [studentYear,setStudentYear]=useState(initialWorkspace.studentYear);
  const [studentFocus,setStudentFocus]=useState(initialWorkspace.studentFocus);
  const [studentStatement,setStudentStatement]=useState(initialWorkspace.studentStatement);
  const [domainMetrics,setDomainMetrics]=useState(initialWorkspace.domainMetrics);
  const [assessmentAnswers,setAssessmentAnswers]=useState(initialWorkspace.assessmentAnswers);
  const [selectedCareerId,setSelectedCareerId]=useState(initialWorkspace.selectedCareerId);
  const [planProgressByCareer,setPlanProgressByCareer]=useState(initialWorkspace.planProgressByCareer);
  const [snapshots,setSnapshots]=useState(initialWorkspace.snapshots);
  const [quizAttempts,setQuizAttempts]=useState(initialWorkspace.quizAttempts);
  const guestWorkspaceRef=useRef(initialWorkspace);
  const authUidRef=useRef<string|null>(null);
  const authEpochRef=useRef(0);
  const applyWorkspace=useCallback((data:ReturnType<typeof freshWorkspace>)=>{
    setIsDemoMode(data.isDemoMode);setStudentName(data.studentName);setStudentYear(data.studentYear);
    setStudentFocus(data.studentFocus);setStudentStatement(data.studentStatement);setDomainMetrics(data.domainMetrics);
    setAssessmentAnswers(data.assessmentAnswers);setSelectedCareerId(data.selectedCareerId);
    setPlanProgressByCareer(data.planProgressByCareer);setSnapshots(data.snapshots);setQuizAttempts(data.quizAttempts);
  },[]);

  // --- Authentication & Cloud Sync States ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const hasGuest = localStorage.getItem('skillpath_guest_chosen') === 'true';
      if (hasGuest) return false;
      const keys = Object.keys(localStorage);
      return keys.some((k) => k.includes('auth-token') || k.startsWith('sb-'));
    } catch {
      return false;
    }
  });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [connectionRevision,setConnectionRevision]=useState(0);
  useEffect(()=>{
    if(currentUser || authUidRef.current || isAuthInitializing)return;
    const data={isDemoMode,studentName,studentYear,studentFocus,studentStatement,domainMetrics,assessmentAnswers,selectedCareerId,planProgressByCareer,snapshots,quizAttempts};
    guestWorkspaceRef.current=data;
    if(!writeGuestWorkspace(data)){setSyncStatus('error');setSyncError('Browser storage is unavailable or full. Export your work before closing this page.');}
  },[currentUser,isAuthInitializing,isDemoMode,studentName,studentYear,studentFocus,studentStatement,domainMetrics,assessmentAnswers,selectedCareerId,planProgressByCareer,snapshots,quizAttempts]);

  useEffect(()=>{
    const online=()=>setConnectionRevision(v=>v+1);
    const offline=()=>setSyncStatus('offline');
    window.addEventListener('online',online);window.addEventListener('offline',offline);
    return ()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline);};
  },[]);

  // One subscription. Ignore stale fetches when the account changes or logs out.
  useEffect(()=>{
    let disposed=false;
    const unsubscribe=onAuthStateChanged(async user=>{
      const epoch=++authEpochRef.current;
      const previousUid=authUidRef.current;
      authUidRef.current=user?.uid || null;
      const stillCurrent=()=>!disposed && epoch===authEpochRef.current;
      setIsAuthInitializing(false);setIsCloudLoaded(false);setShowImportModal(false);setVaultItems([]);setSyncError(null);
      if(!user){setCurrentUser(null);if(previousUid)applyWorkspace(guestWorkspaceRef.current);setSyncStatus('saved');return;}
      setCurrentUser(user);setSyncStatus('saving');
      const guest=guestWorkspaceRef.current;
      const name=getPendingSignupName() || user.displayName || '';
      applyWorkspace(freshWorkspace(false,name));
      void fetchVaultMetadataList(user.uid).then(items=>{if(stillCurrent())setVaultItems(items);}).catch(error=>{if(stillCurrent())console.warn('Vault could not load:',error);});
      const currentHash=window.location.hash.replace(/^#\/?/,'').toLowerCase();
      if(currentHash==='login')navigate('home');
      try {
        const data=await fetchUserData(user.uid);
        if(!stillCurrent())return;
        if(data){applyWorkspace(sanitizeWorkspace({...data,isDemoMode:false}));setIsCloudLoaded(true);setSyncStatus('saved');}
        else if(!guest.isDemoMode && (Object.keys(guest.assessmentAnswers).length || guest.quizAttempts.length || guest.studentName)){
          setShowImportModal(true);
        } else {
          const fresh=freshWorkspace(false,name);
          applyWorkspace(fresh);
          await saveUserData(user.uid,{...fresh,email:user.email,displayName:name});
          if(!stillCurrent())return;
          setIsCloudLoaded(true);setSyncStatus('saved');
        }
        clearPendingSignupName();
      }catch(error){if(stillCurrent()){setSyncStatus('error');setSyncError('Cloud data could not be loaded. Your saved data was not overwritten. Check the connection and reload.');}}
    });
    return ()=>{disposed=true;++authEpochRef.current;unsubscribe();};
  },[navigate,applyWorkspace]);

  // Debounced cloud save when user is logged in
  useEffect(() => {
    if (!currentUser || !isCloudLoaded || isDemoMode || showImportModal) return;
    const saveUid=currentUser.uid;
    const saveEpoch=authEpochRef.current;
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
        if(authEpochRef.current!==saveEpoch || authUidRef.current!==saveUid)return;
        setSyncStatus('saved');
        setSyncError(null);
      } catch (err) {
        if(authEpochRef.current!==saveEpoch || authUidRef.current!==saveUid)return;
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
    connectionRevision,
    showImportModal,
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
    const uid=currentUser.uid;const epoch=authEpochRef.current;
    const imported={...guestWorkspaceRef.current,isDemoMode:false};
    try {
      setSyncStatus('saving');
      await saveUserData(uid,{...imported,email:currentUser.email,displayName:currentUser.displayName});
      if(authEpochRef.current!==epoch)return;
      applyWorkspace(imported);setIsCloudLoaded(true);setShowImportModal(false);setSyncStatus('saved');
    }catch{if(authEpochRef.current===epoch){setSyncStatus('error');setSyncError('Guest data could not be imported. Please retry.');}}
  };

  // Handle starting fresh on first login
  const handleStartFresh = async () => {
    if (!currentUser) return;
    try {
      setSyncStatus('saving');
      const freshName = currentUser.displayName || '';
      applyWorkspace(freshWorkspace(false,freshName));
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
      setIsDemoMode(false);
      setIsCloudLoaded(true);
      setShowImportModal(false);
      setSyncStatus('saved');
      navigate('home');
    } catch (e) {
      console.error('Failed to start fresh:', e);
      setSyncStatus('error');
    }
  };

  // The debounced, ordered save handles the new attempt once.
  const handleSaveQuizAttempt=(attempt:QuizAttempt)=>{
    setQuizAttempts(prev=>prev.some(a=>a.id===attempt.id)?prev:[...prev,attempt].slice(-100));setIsDemoMode(false);
  };
  const handleClearQuizAttempts=async()=>{
    if(debounceTimerRef.current)clearTimeout(debounceTimerRef.current);
    try {
      if(currentUser){setSyncStatus('saving');await clearUserQuizAttempts(currentUser.uid);}
      setQuizAttempts([]);setSyncStatus('saved');
    }catch{setSyncStatus('error');setSyncError('Quiz history could not be deleted. It has been kept so you can retry.');}
  };

  // Handle Logout: returns directly to full-screen login gate
  const handleLogout=async()=>{
    try {await logoutUser();setIsGuestMode(false);try{localStorage.removeItem('skillpath_guest_chosen');}catch{}navigate('login');}
    catch {setSyncStatus('error');setSyncError('Sign out failed. Please retry while online.');}
  };

  // Export Modal State
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Latest saved aptitude quiz attempt
  const latestQuizAttempt = quizAttempts.length > 0 ? quizAttempts[quizAttempts.length - 1] : null;

  const hasSelfAssessment = isDemoMode || Object.keys(assessmentAnswers).length > 0 || Object.values(domainMetrics).some(m => m.marks != null || m.confidence !== 50 || m.practice !== 50 || m.skill !== 50);
  const hasPersonalEvidence = hasSelfAssessment || !!latestQuizAttempt;

  // Calculate Domain Scores deterministically from metrics
  const domainScoreResults = useMemo(() => {
    return {
      programming: calculateDomainScore(domainMetrics?.programming),
      analytical: calculateDomainScore(domainMetrics?.analytical),
      communication: calculateDomainScore(domainMetrics?.communication),
      design: calculateDomainScore(domainMetrics?.design),
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
    if (!hasPersonalEvidence) return {programming:0, analytical:0, communication:0, design:0};
    if (latestQuizAttempt && !hasSelfAssessment) return latestQuizAttempt.domainScores;
    if (!latestQuizAttempt || isDemoMode) {
      return selfReportedScores;
    }
    const quizScores = latestQuizAttempt.domainScores;
    return {
      programming: calculateCombinedScore(
        selfReportedScores.programming,
        quizScores?.programming ?? selfReportedScores.programming
      ),
      analytical: calculateCombinedScore(
        selfReportedScores.analytical,
        quizScores?.analytical ?? selfReportedScores.analytical
      ),
      communication: calculateCombinedScore(
        selfReportedScores.communication,
        quizScores?.communication ?? selfReportedScores.communication
      ),
      design: calculateCombinedScore(
        selfReportedScores.design,
        quizScores?.design ?? selfReportedScores.design
      ),
    };
  }, [selfReportedScores, latestQuizAttempt, isDemoMode, hasSelfAssessment, hasPersonalEvidence]);

  // Calculate Career Fits based on domain scores
  const careerFits = useMemo(() => {
    return calculateCareerFit(domainScores);
  }, [domainScores]);

  // Handle assessment question response
  const handleAnswerChange = (questionId: string, value: number) => {
    const updatedAnswers = { ...assessmentAnswers, [questionId]: value };
    setAssessmentAnswers(updatedAnswers);
    setIsDemoMode(false);

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
    setDomainMetrics((prev) => {
      const current = prev?.[domain] || { marks: null, confidence: 50, practice: 50, skill: 50 };
      return {
        ...prev,
        [domain]: {
          ...current,
          [field]: val,
        },
      };
    });
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

  if (isPasswordRecovery) return <PasswordRecoveryView onDone={()=>{setIsPasswordRecovery(false);const url=new URL(location.href);url.searchParams.delete('recovery');url.hash='home';history.replaceState(null,'',url);navigate('home');}}/>;

  if (isAuthInitializing && activePage !== 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8f6] dark:bg-[#0e1c20]">
        <div className="w-8 h-8 rounded-full border-2 border-[#1b4e45] dark:border-[#d7f78c] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Full-Screen Login Entry Gate:
  // 1. On first load, if not logged in and not chosen guest mode -> ONLY login screen.
  // 2. Or if on #login
  const isEntryGate = (!currentUser && !isGuestMode) || activePage === 'login';

  if (isEntryGate) {
    return (
      <LoginView
        onNavigate={navigate}
        currentUser={currentUser}
        onLoginSuccess={(loggedInUser) => {
          // Verified auth events own the account state.
          // 1. After successful login or signup -> go to HOME (#home)
          navigate('home');
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

      {syncError && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs px-4 py-2 text-center font-medium">
          {syncError}
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-12">
        {activePage === 'home' && (
          <HomeView
            hasAssessment={hasPersonalEvidence}
            hasSelfAssessment={hasSelfAssessment}
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
            key={currentUser?.uid || "guest"}
            hasSelfAssessment={hasSelfAssessment}
            onNavigate={navigate}
            selfReportedScores={selfReportedScores}
            quizAttempts={quizAttempts}
            onSaveQuizAttempt={handleSaveQuizAttempt}
            onClearQuizAttempts={handleClearQuizAttempts}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardView
            hasAssessment={hasPersonalEvidence}
            hasSelfAssessment={hasSelfAssessment}
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
            hasAssessment={hasPersonalEvidence}
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
            key={currentUser?.uid || "guest"}
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

      <BottomTabBar
        activePage={activePage}
        onNavigate={navigate}
      />

      <ImportGuestModal
        isOpen={showImportModal}
        onClose={handleStartFresh}
        onImport={handleImportGuestData}
        onStartFresh={handleStartFresh}
        studentName={guestWorkspaceRef.current.studentName}
        answeredCount={Object.keys(guestWorkspaceRef.current.assessmentAnswers).length}
        completedTasksCount={Object.values(guestWorkspaceRef.current.planProgressByCareer[guestWorkspaceRef.current.selectedCareerId] || {}).filter(Boolean).length}
      />

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
