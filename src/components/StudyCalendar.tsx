import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Shield, 
  Clock, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Sparkles, 
  Info, 
  AlertTriangle, 
  X, 
  Check, 
  PlaneTakeoff,
  TrendingUp
} from 'lucide-react';
import { UserState } from '../types';

interface StudyCalendarProps {
  userState: UserState;
  onUpdateState: (newState: Partial<UserState>) => void;
  onClose?: () => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const StudyCalendar: React.FC<StudyCalendarProps> = ({ 
  userState, 
  onUpdateState, 
  onClose 
}) => {
  // Local states initialized with values from userState or defaults
  const [dailyFocusGoal, setDailyFocusGoal] = useState<number>(userState.dailyFocusGoal ?? 25);
  const [isCustomGoal, setIsCustomGoal] = useState<boolean>(
    ![15, 25, 45, 60, 90].includes(userState.dailyFocusGoal ?? 25)
  );
  const [customGoalVal, setCustomGoalVal] = useState<string>(
    isCustomGoal ? String(userState.dailyFocusGoal ?? 25) : '45'
  );

  const [semesterStartDate, setSemesterStartDate] = useState<string>(
    userState.semesterStartDate || ''
  );
  const [semesterEndDate, setSemesterEndDate] = useState<string>(
    userState.semesterEndDate || ''
  );

  const [weeklyStudySchedule, setWeeklyStudySchedule] = useState<string[]>(
    userState.weeklyStudySchedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );

  const [semesterBreaks, setSemesterBreaks] = useState<any[]>(
    userState.semesterBreaks || []
  );

  const [vacationActive, setVacationActive] = useState<boolean>(
    userState.vacationMode?.active ?? false
  );
  const [vacationStart, setVacationStart] = useState<string>(
    userState.vacationMode?.startDate || ''
  );
  const [vacationEnd, setVacationEnd] = useState<string>(
    userState.vacationMode?.endDate || ''
  );
  const [vacationReason, setVacationReason] = useState<string>(
    userState.vacationMode?.reason || ''
  );

  // Modal / input helpers
  const [newBreakName, setNewBreakName] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');
  const [breakError, setBreakError] = useState('');
  const [vacationError, setVacationError] = useState('');

  // Handle schedule checkbox toggle
  const handleDayToggle = (day: string) => {
    if (weeklyStudySchedule.includes(day)) {
      if (weeklyStudySchedule.length <= 1) return; // Must have at least 1 study day
      setWeeklyStudySchedule(weeklyStudySchedule.filter(d => d !== day));
    } else {
      setWeeklyStudySchedule([...weeklyStudySchedule, day]);
    }
  };

  // Add new semester break
  const handleAddBreak = () => {
    if (!newBreakName.trim() || !newBreakStart || !newBreakEnd) {
      setBreakError('All fields are required.');
      return;
    }

    if (new Date(newBreakStart) > new Date(newBreakEnd)) {
      setBreakError('Start Date cannot be after End Date.');
      return;
    }

    const newBreak = {
      id: `break-${Date.now()}`,
      name: newBreakName.trim(),
      startDate: newBreakStart,
      endDate: newBreakEnd
    };

    const updatedBreaks = [...semesterBreaks, newBreak];
    setSemesterBreaks(updatedBreaks);
    
    // Clear input fields
    setNewBreakName('');
    setNewBreakStart('');
    setNewBreakEnd('');
    setBreakError('');
  };

  // Delete a semester break
  const handleDeleteBreak = (id: string) => {
    setSemesterBreaks(semesterBreaks.filter(b => b.id !== id));
  };

  // Save all settings to state & Firestore
  const handleSaveAll = () => {
    let finalGoal = dailyFocusGoal;
    if (isCustomGoal) {
      const parsed = parseInt(customGoalVal, 10);
      finalGoal = isNaN(parsed) || parsed <= 0 ? 30 : parsed;
    }

    // Validate Vacation Duration: Max 30 days
    let vacMode = {
      active: vacationActive,
      startDate: vacationStart || null,
      endDate: vacationEnd || null,
      reason: vacationReason || ''
    };

    if (vacationActive) {
      if (!vacationStart || !vacationEnd) {
        setVacationError('Vacation start and end dates must be configured.');
        return;
      }
      const startD = new Date(vacationStart);
      const endD = new Date(vacationEnd);
      if (startD > endD) {
        setVacationError('Vacation Start cannot be after End.');
        return;
      }
      const diffTime = Math.abs(endD.getTime() - startD.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        setVacationError('Vacation Mode is limited to a maximum of 30 days.');
        return;
      }
    } else {
      setVacationError('');
    }

    const updatedFields: Partial<UserState> = {
      dailyFocusGoal: finalGoal,
      semesterStartDate: semesterStartDate || null,
      semesterEndDate: semesterEndDate || null,
      weeklyStudySchedule,
      semesterBreaks,
      vacationMode: vacMode
    };

    onUpdateState(updatedFields);

    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent select-none">
      
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5 font-display">
              Study Calendar
              <span className="text-[10px] bg-blue-500/20 border border-blue-500/30 text-blue-400 font-mono px-1.5 py-0.5 rounded uppercase tracking-widest">Config</span>
            </h3>
            <p className="text-xs text-gray-400">Establish your study goals, schedules, holiday breaks, and vacation mode protection.</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-700 flex items-center justify-center text-gray-200 hover:text-white cursor-pointer transition-all shadow-lg"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT COLUMN: DAILY GOAL, STUDY SCHEDULE, SHIELDS */}
        <div className="space-y-6">

          {/* 1. DAILY FOCUS GOAL */}
          <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold font-display text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Daily Focus Goal
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {[15, 25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setIsCustomGoal(false);
                    setDailyFocusGoal(mins);
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    !isCustomGoal && dailyFocusGoal === mins
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                      : 'bg-gray-950 border-gray-850 text-gray-400 hover:border-gray-800 hover:text-white'
                  }`}
                >
                  {mins} min
                </button>
              ))}
              <button
                onClick={() => setIsCustomGoal(true)}
                className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  isCustomGoal
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                    : 'bg-gray-950 border-gray-850 text-gray-400 hover:border-gray-800 hover:text-white'
                }`}
              >
                Custom
              </button>
            </div>

            {isCustomGoal && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={customGoalVal}
                  onChange={(e) => setCustomGoalVal(e.target.value)}
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Minutes"
                />
                <span className="text-xs text-gray-500 font-mono">minutes / day</span>
              </motion.div>
            )}
            
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Your Daily Focus Goal represents the minimum focus time required to increment and maintain your **Academic Study Streak**.
            </p>
          </div>

          {/* 2. WEEKLY STUDY SCHEDULE */}
          <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold font-display text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              Weekly Study Schedule
            </h4>

            <p className="text-[10px] text-gray-400">
              Select which days are counted towards your focus streak. Days not selected are considered **free rest days** and will never break or stall your streak!
            </p>

            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isActive = weeklyStudySchedule.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    className={`p-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-blue-600/10 border-blue-500/50 text-blue-300'
                        : 'bg-gray-950 border-gray-850 text-gray-500 hover:border-gray-800 hover:text-gray-300'
                    }`}
                  >
                    <span>{day}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isActive ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-800'
                    }`}>
                      {isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. STUDY SHIELDS PANEL */}
          <div className="bg-[#141A1F] border border-gray-850 rounded-xl p-5 space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute right-3 top-3 w-16 h-16 opacity-5 pointer-events-none">
              <Shield className="w-full h-full text-blue-500" />
            </div>

            <h4 className="text-xs font-bold font-display text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400 animate-pulse" />
              Academic Study Shields
            </h4>

            <div className="flex items-center justify-between py-1.5 bg-gray-950/50 border border-gray-850 rounded-xl px-4">
              <span className="text-xs font-semibold text-gray-400">Shields Remaining:</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((idx) => {
                  const hasShield = (userState.studyShields ?? 3) >= idx;
                  return (
                    <Shield
                      key={idx}
                      className={`w-5 h-5 ${
                        hasShield 
                          ? 'text-blue-400 fill-blue-500/20 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' 
                          : 'text-gray-800 fill-transparent'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-gray-500 leading-relaxed">
              **Academic Study Shields** protect your focus streak when you miss a scheduled study day. You receive **3 shields per semester**. Shields reset automatically at the start of each new semester!
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: SEMESTER DATES, BREAKS, VACATION */}
        <div className="space-y-6">

          {/* 4. SEMESTER DATE BOUNDARIES */}
          <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold font-display text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              Semester Calendar Dates
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Start Date</label>
                <input
                  type="date"
                  value={semesterStartDate}
                  onChange={(e) => setSemesterStartDate(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">End Date</label>
                <input
                  type="date"
                  value={semesterEndDate}
                  onChange={(e) => setSemesterEndDate(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-500">
              Academic study streaks do not carry over across semester boundary dates. Focus stats aggregate per semester.
            </p>
          </div>

          {/* 5. VACATION MODE */}
          <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-display text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <PlaneTakeoff className="w-4 h-4 text-amber-400" />
                Vacation Mode
              </h4>

              <button
                onClick={() => setVacationActive(!vacationActive)}
                className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${
                  vacationActive ? 'bg-amber-500' : 'bg-gray-850'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform ${
                  vacationActive ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <p className="text-[10px] text-gray-400">
              Planning to go off-grid? Enable Vacation Mode to **pause your Academic Study Streak** safely. It will not break or advance until you return!
            </p>

            {vacationActive && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-2"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">Starts</label>
                    <input
                      type="date"
                      value={vacationStart}
                      onChange={(e) => setVacationStart(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">Ends</label>
                    <input
                      type="date"
                      value={vacationEnd}
                      onChange={(e) => setVacationEnd(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">Reason for vacation</label>
                  <input
                    type="text"
                    value={vacationReason}
                    onChange={(e) => setVacationReason(e.target.value)}
                    placeholder="e.g. Family Trip, Trekking"
                    className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>

                {vacationError && (
                  <p className="text-[10px] text-red-400 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    {vacationError}
                  </p>
                )}

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-amber-300 leading-relaxed">
                    Max vacation duration is strictly **30 days**. You will be protected from streak breaks during these dates.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* 6. SEMESTER BREAKS */}
          <div className="bg-[#141A1F] border border-gray-800 rounded-xl p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold font-display text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Configure Semester Breaks
            </h4>

            {semesterBreaks.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                {semesterBreaks.map((brk) => (
                  <div key={brk.id} className="bg-gray-950 border border-gray-850 rounded-lg p-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{brk.name}</p>
                      <p className="text-[9px] text-gray-500 font-mono">
                        {brk.startDate} to {brk.endDate}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteBreak(brk.id)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 italic text-center py-2">No scheduled breaks configured for this semester.</p>
            )}

            {/* Break adding interface */}
            <div className="border-t border-gray-850 pt-3 space-y-2.5">
              <input
                type="text"
                placeholder="Break Name (e.g. Winter Break)"
                value={newBreakName}
                onChange={(e) => setNewBreakName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newBreakStart}
                  onChange={(e) => setNewBreakStart(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
                />
                <input
                  type="date"
                  value={newBreakEnd}
                  onChange={(e) => setNewBreakEnd(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              {breakError && (
                <p className="text-[10px] text-red-400 font-semibold">{breakError}</p>
              )}

              <button
                type="button"
                onClick={handleAddBreak}
                className="w-full py-1.5 bg-gray-900 border border-gray-850 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Break Segment</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* FOOTER SAVE BUTTON */}
      <div className="border-t border-gray-800 pt-4 flex gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="px-5 py-3 md:py-2 text-xs font-bold text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-750 hover:text-white rounded-xl transition-all cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            Cancel Changes
          </button>
        )}
        
        <button
          onClick={handleSaveAll}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
          <span>Save Study Calendar Configuration</span>
        </button>
      </div>

    </div>
  );
};
