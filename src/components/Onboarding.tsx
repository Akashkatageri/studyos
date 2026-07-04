import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserState, Subject } from '../types';
import { COURSE_TEMPLATES, AVATARS, getPriorSemesterSubjects } from '../data';
import { 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  AlertTriangle, 
  User, 
  Check, 
  School, 
  GitBranch, 
  Calendar, 
  GraduationCap, 
  Atom, 
  FlaskConical, 
  FolderKanban,
  CheckCircle2,
  HelpCircle,
  FolderOpen,
  LogOut
} from 'lucide-react';
import { getSubjectsForCycle } from '../utils/cycleSubjects';

interface OnboardingProps {
  partialState: Partial<UserState>;
  onComplete: (userState: UserState) => void;
  onSignOut?: () => void;
}

type OnboardingStep = 'university' | 'branch' | 'scheme' | 'semester' | 'cycle' | 'backlogs' | 'profile';

export default function Onboarding({ partialState, onComplete, onSignOut }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('university');
  
  // Selection States
  const [university, setUniversity] = useState('VTU');
  const [branch, setBranch] = useState('ISE');
  const [scheme, setScheme] = useState('2025 Scheme');
  const [semester, setSemester] = useState(1);
  const [firstYearCycle, setFirstYearCycle] = useState<'Physics' | 'Chemistry'>('Physics');
  const [hasBacklogsOpt, setHasBacklogsOpt] = useState<'yes' | 'no' | null>(null);
  const [backlogIds, setBacklogIds] = useState<string[]>([]);
  const [username, setUsername] = useState(partialState.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [expandedYears, setExpandedYears] = useState<string[]>(['First Year', 'Second Year', 'Third Year', 'Fourth Year']);

  const stepList: OnboardingStep[] = [
    'university',
    'branch',
    'scheme',
    'semester',
    'cycle',
    ...(semester > 1 ? ['backlogs' as OnboardingStep] : []),
    'profile'
  ];

  const currentStepIndex = stepList.indexOf(currentStep);

  // List options
  const universities = [
    { id: 'VTU', name: 'Visvesvaraya Technological University', desc: 'Standard autonomous curriculum for Karnataka state engineering colleges.' }
  ];

  const branches = [
    { id: 'ISE', name: 'Information Science', desc: 'ISE / IT Stream' },
    { id: 'CSE', name: 'Computer Science', desc: 'CSE / Core Software' },
    { id: 'AIML', name: 'AI & Machine Learning', desc: 'Specialized Intelligence Track' },
    { id: 'ECE', name: 'Electronics & Communication', desc: 'ECE / Hardware' },
    { id: 'IOT', name: 'Internet of Things', desc: 'IOT / Embedded Systems & Connected devices' },
    { id: 'EEE', name: 'Electrical & Electronics', desc: 'EEE / Electrical Power Systems' },
    { id: 'Mechanical', name: 'Mechanical Engineering', desc: 'Mechanical & CAD Designs' }
  ];

  const schemes = [
    { id: '2025 Scheme', name: '2025 Scheme', desc: 'Newest VTU Outcome-Based Syllabus' },
    { id: '2022 Scheme', name: '2022 Scheme', desc: 'Choice-Based Credit System (CBCS)' }
  ];

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  // Dynamically resolve backlog subjects by academic year & semester
  const getOnboardingBacklogSubjects = (): { semester: number; subjects: Subject[] }[] => {
    const list: { semester: number; subjects: Subject[] }[] = [];
    const uData = COURSE_TEMPLATES[university] || COURSE_TEMPLATES['VTU'];
    const bData = uData[branch] || uData['CSE'];
    const sData = bData[scheme] || bData['2022 Scheme'];

    for (let semNum = 1; semNum < semester; semNum++) {
      let subjects: Subject[] = [];
      if ((semNum === 1 || semNum === 2) && firstYearCycle) {
        subjects = getSubjectsForCycle(firstYearCycle, semNum);
      } else if (sData[semNum]) {
        subjects = sData[semNum];
      }
      if (subjects.length > 0) {
        list.push({ semester: semNum, subjects });
      }
    }
    return list;
  };

  const backlogPriorSemesters = getOnboardingBacklogSubjects();

  // Handle next button click
  const handleNext = () => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < stepList.length) {
      setCurrentStep(stepList[nextIdx]);
    }
  };

  // Handle back button click
  const handleBack = () => {
    const prevIdx = currentStepIndex - 1;
    if (prevIdx >= 0) {
      setCurrentStep(stepList[prevIdx]);
    }
  };

  const handleBacklogToggle = (id: string) => {
    setBacklogIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleYearExpansion = (year: string) => {
    setExpandedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const handleSubmit = () => {
    if (!username.trim()) return;

    const newUserState: UserState = {
      ...partialState,
      onboarded: true,
      username: username.trim(),
      university,
      branch,
      semester,
      scheme,
      firstYearCycle,
      avatar: selectedAvatar,
      joinedDate: new Date().toISOString(),
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      completedTopics: [],
      completedModules: [],
      completedSubjects: [],
      completedSemesters: [],
      backlogSubjects: backlogIds,
      revisions: [],
      activeTab: 'home',
      inProgressTopics: [],
      studyActivity: {},
      subjectDifficulties: {},
    };

    onComplete(newUserState);
  };

  // Helper to map semester to academic year name
  const getYearName = (sem: number): string => {
    if (sem === 1 || sem === 2) return 'First Year';
    if (sem === 3 || sem === 4) return 'Second Year';
    if (sem === 5 || sem === 6) return 'Third Year';
    return 'Fourth Year';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0F12] text-white p-4 font-sans select-none">
      <div className="w-full max-w-2xl bg-[#141A1F] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Top Progress bar */}
        <div className="relative h-1.5 bg-gray-900 w-full">
          <div 
            className="absolute h-full bg-blue-500 transition-all duration-500 ease-out" 
            style={{ width: `${((currentStepIndex + 1) / stepList.length) * 100}%` }}
          />
        </div>

        {/* Header branding */}
        <div className="p-6 border-b border-gray-800/80 bg-gradient-to-r from-blue-950/20 to-indigo-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              <BookOpen className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                StudyOS
                <span className="text-[10px] bg-blue-500/20 text-blue-400 font-mono px-2 py-0.5 rounded-full border border-blue-500/20">Onboarding</span>
              </h1>
              <p className="text-xs text-gray-400">Initialize your custom student directory workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-gray-400 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
              Step {currentStepIndex + 1} of {stepList.length}
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-800/50 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Switch Google account or sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Switch Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Step contents with dynamic framer-motion container */}
        <div className="p-8 flex-1 flex flex-col min-h-[400px] justify-start overflow-y-auto max-h-[550px] scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 w-full"
            >
              {/* STEP 1: SELECT UNIVERSITY */}
              {currentStep === 'university' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold font-display tracking-wide text-white flex items-center gap-2">
                      <School className="w-5 h-5 text-blue-500" />
                      Select University
                    </h2>
                    <p className="text-xs text-gray-400">Where are you enrolled? We will customize syllabus models to your university.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {universities.map(u => (
                      <div
                        key={u.id}
                        onClick={() => setUniversity(u.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
                          university === u.id
                            ? 'bg-blue-500/5 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                          university === u.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-900 border-gray-800 text-gray-500'
                        }`}>
                          <School className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold">{u.name}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{u.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT BRANCH */}
              {currentStep === 'branch' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold font-display tracking-wide text-white flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-indigo-500" />
                      Select Branch
                    </h2>
                    <p className="text-xs text-gray-400">Choose your engineering branch major to retrieve your core courses.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {branches.map(b => (
                      <div
                        key={b.id}
                        onClick={() => setBranch(b.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-28 ${
                          branch === b.id
                            ? 'bg-blue-500/5 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono bg-gray-900 px-2.5 py-1 rounded-full border border-gray-800 font-bold text-gray-400">
                            {b.id}
                          </span>
                          {branch === b.id && <Check className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{b.name}</p>
                          <p className="text-[10px] text-gray-500 mt-1 truncate">{b.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: SELECT SCHEME */}
              {currentStep === 'scheme' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold font-display tracking-wide text-white flex items-center gap-2">
                      <FolderKanban className="w-5 h-5 text-amber-500" />
                      Select Syllabus Scheme
                    </h2>
                    <p className="text-xs text-gray-400">Each batch uses unique credit schemas. Select your academic regulations scheme.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {schemes.map(s => (
                      <div
                        key={s.id}
                        onClick={() => setScheme(s.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          scheme === s.id
                            ? 'bg-blue-500/5 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            scheme === s.id ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-900 text-gray-600'
                          }`}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{s.name}</p>
                            <p className="text-[11px] text-gray-500">{s.desc}</p>
                          </div>
                        </div>
                        {scheme === s.id && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: SELECT CURRENT SEMESTER */}
              {currentStep === 'semester' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold font-display tracking-wide text-white flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-purple-500" />
                      Select Current Semester
                    </h2>
                    <p className="text-xs text-gray-400">Which semester are you in? This determines which subjects become active.</p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {semesters.map(sem => (
                      <button
                        key={sem}
                        onClick={() => setSemester(sem)}
                        className={`py-6 rounded-xl border font-bold text-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          semester === sem
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_4px_15px_rgba(37,99,235,0.3)] scale-105'
                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-normal text-gray-500 uppercase tracking-widest font-mono">Sem</span>
                        <span>{sem}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: SELECT FIRST YEAR CYCLE */}
              {currentStep === 'cycle' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold font-display tracking-wide text-white flex items-center gap-2">
                      <Atom className="w-5 h-5 text-emerald-500" />
                      {semester === 1 ? 'Which cycle are you enrolled in?' : 'Which cycle did you take in Semester 1?'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      VTU splits first year into Physics and Chemistry tracks. This tells us which layout of subjects you took.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Physics Cycle */}
                    <div
                      onClick={() => setFirstYearCycle('Physics')}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-40 relative overflow-hidden group ${
                        firstYearCycle === 'Physics'
                          ? 'bg-emerald-500/5 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-2.5 rounded-xl border ${
                          firstYearCycle === 'Physics' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-500'
                        }`}>
                          <Atom className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
                        </div>
                        {firstYearCycle === 'Physics' && <Check className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Physics Cycle</h3>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                          Includes Engineering Physics, Basic Electronics, Electrical Engineering, and Physics Labs.
                        </p>
                      </div>
                    </div>

                    {/* Chemistry Cycle */}
                    <div
                      onClick={() => setFirstYearCycle('Chemistry')}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-40 relative overflow-hidden group ${
                        firstYearCycle === 'Chemistry'
                          ? 'bg-emerald-500/5 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-2.5 rounded-xl border ${
                          firstYearCycle === 'Chemistry' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-500'
                        }`}>
                          <FlaskConical className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        {firstYearCycle === 'Chemistry' && <Check className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Chemistry Cycle</h3>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                          Includes Engineering Chemistry, CAED Engineering Drawing, Mechanical Science, and Chemistry Labs.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: BACKLOG SUBJECT SELECTION */}
              {currentStep === 'backlogs' && semester > 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold font-display tracking-wide text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      {semester === 2 ? 'Do you have any backlog subjects from Semester 1?' : 'Do you have any backlog subjects?'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      If yes, select the subjects you still need to clear. They will sync as active subjects in your workspace dashboard.
                    </p>
                  </div>

                  {/* Yes/No selection buttons to match "○ None / Yes" */}
                  {hasBacklogsOpt === null ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
                      <button
                        onClick={() => {
                          setHasBacklogsOpt('no');
                          setBacklogIds([]);
                          handleNext();
                        }}
                        className="py-5 px-6 rounded-xl border border-gray-800 bg-gray-950 hover:bg-gray-900/60 transition-all text-sm font-bold text-white flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-6 h-6 text-blue-500" />
                        <span>No Backlogs (All Clear)</span>
                      </button>
                      
                      <button
                        onClick={() => setHasBacklogsOpt('yes')}
                        className="py-5 px-6 rounded-xl border border-gray-800 bg-gray-950 hover:bg-gray-900/60 transition-all text-sm font-bold text-white flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
                        <span>Yes, I have backlogs</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Backlog List with Expandable Sections Grouped by Academic Year */}
                      <div className="max-h-[260px] overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                        {(() => {
                          const academicYears = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
                          
                          return academicYears.map(yr => {
                            // Filter semesters matching this year
                            const matchingSems = backlogPriorSemesters.filter(
                              ps => getYearName(ps.semester) === yr
                            );
                            
                            if (matchingSems.length === 0) return null;
                            const isExpanded = expandedYears.includes(yr);

                            return (
                              <div key={yr} className="bg-gray-950/60 border border-gray-800 rounded-xl overflow-hidden">
                                <button
                                  onClick={() => toggleYearExpansion(yr)}
                                  className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-900/80 transition-colors flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-400"
                                >
                                  <div className="flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4 text-gray-500" />
                                    <span>{yr}</span>
                                  </div>
                                  <span className="text-[10px] bg-gray-850 border border-gray-800 px-2 py-0.5 rounded text-gray-500 font-mono">
                                    {isExpanded ? 'Collapse' : 'Expand'}
                                  </span>
                                </button>

                                {isExpanded && (
                                  <div className="p-4 space-y-4 divide-y divide-gray-900">
                                    {matchingSems.map(ps => (
                                      <div key={ps.semester} className="pt-3 first:pt-0 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                                          Semester {ps.semester}
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                          {ps.subjects.map(sub => {
                                            const isChecked = backlogIds.includes(sub.id);
                                            return (
                                              <button
                                                key={sub.id}
                                                onClick={() => handleBacklogToggle(sub.id)}
                                                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                                                  isChecked
                                                    ? 'bg-red-500/5 border-red-500/40 text-red-300'
                                                    : 'bg-gray-950 border-gray-850 hover:border-gray-800 text-gray-400 hover:text-white'
                                                }`}
                                              >
                                                <div className="space-y-0.5">
                                                  <p className="text-xs font-semibold">{sub.name}</p>
                                                  <p className="text-[9px] text-gray-600 font-mono">{sub.id}</p>
                                                </div>
                                                <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                                                  isChecked ? 'bg-red-500 border-red-500 text-white' : 'border-gray-700'
                                                }`}>
                                                  {isChecked && (
                                                    <svg className="w-3 h-3 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                  )}
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="flex gap-2 justify-between pt-1">
                        <button
                          onClick={() => setHasBacklogsOpt(null)}
                          className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-white transition-colors"
                        >
                          Change choice
                        </button>
                        <button
                          onClick={() => {
                            setBacklogIds([]);
                            handleNext();
                          }}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Clear Selection and Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 7: CREATE PROFILE */}
              {currentStep === 'profile' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold font-display tracking-wide text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-500 animate-bounce" />
                      Create Student Profile
                    </h2>
                    <p className="text-xs text-gray-400">Establish your unique identifier inside the StudyOS social platform network.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-display">Syllabus Username</label>
                    <input
                      type="text"
                      value={username}
                      readOnly={!!partialState.username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none ${
                        !!partialState.username 
                          ? 'bg-gray-950/40 border-gray-800/60 text-gray-400 select-none' 
                          : 'bg-gray-950 border-blue-500/50 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      placeholder="Enter username handle"
                    />
                    {!!partialState.username ? (
                      <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">✓ Username permanently linked to your profile</p>
                    ) : (
                      <p className="text-[10px] text-gray-400">Choose a unique username handle (letters, numbers, underscores only).</p>
                    )}
                    {onSignOut && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={onSignOut}
                          className="text-xs text-red-400 hover:text-red-300 hover:underline flex items-center gap-1.5 transition-all cursor-pointer bg-transparent border-none p-0"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Not your account? Switch accounts / Sign out</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-display">Select Avatar Badge</label>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATARS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setSelectedAvatar(emoji)}
                          className={`h-12 text-2xl flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                            selectedAvatar === emoji
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.2)] scale-110'
                              : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-white hover:scale-105'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gray-800 bg-gray-950/80 flex gap-4">
          {currentStepIndex > 0 && (
            <button
              onClick={handleBack}
              className="px-5 py-3.5 bg-gray-900 hover:bg-gray-800 text-sm font-semibold rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer border border-gray-800 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          
          <button
            onClick={
              currentStep === 'profile'
                ? handleSubmit
                : currentStep === 'backlogs'
                ? handleNext
                : handleNext
            }
            disabled={
              (currentStep === 'profile' && !username.trim()) ||
              (currentStep === 'backlogs' && hasBacklogsOpt === null)
            }
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-bold rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {currentStep === 'profile' ? (
              <>
                <span>Complete Quest Onboarding</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </>
            ) : (
              <>
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
