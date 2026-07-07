import React from 'react';
import { UserState } from '../types';
import { Flame, Trophy } from 'lucide-react';
import { getLevelAndProgress } from '../utils/xpUtils';

interface HeaderProps {
  userState: UserState;
  onTabChange: (tab: UserState['activeTab']) => void;
}

export default function Header({ userState, onTabChange }: HeaderProps) {
  const { xp, level, streak, semester, avatar } = userState;
  
  // Calculate level progression with progressive XP
  const { xpInCurrentLevel, xpNeededForNextLevel, xpPercent } = getLevelAndProgress(xp);

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-2.5 md:py-4 font-sans select-none">
      <div className="max-w-7xl mx-auto flex flex-row justify-between items-center gap-4 md:gap-0 w-full">
        
        {/* Branding & Level Badge */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div 
            onClick={() => onTabChange('profile')}
            className="flex items-center gap-2.5 md:gap-3 cursor-pointer group select-none"
            title="View Profile"
          >
            <span className="text-2xl md:text-3xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform">{avatar}</span>
            <div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <h1 className="text-sm md:text-lg font-bold font-display tracking-tight text-white leading-none group-hover:text-[#7C5CFF] transition-colors">{userState.username}</h1>
                <span className="text-[9px] md:text-[10px] bg-[#7C5CFF]/10 text-[#A78BFA] border border-[#7C5CFF]/20 px-1.5 md:py-0.5 rounded-full font-mono font-semibold">
                  SEM {semester}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] md:text-xs font-mono font-medium text-gray-400">Lvl {level}</span>
                <div className="w-16 md:w-24 h-1.5 md:h-2 bg-[#18181C] border border-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA] rounded-full transition-all duration-500" 
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <span className="text-[9px] md:text-[10px] font-mono text-gray-500">{xpInCurrentLevel}/{xpNeededForNextLevel} XP</span>
              </div>
            </div>
          </div>

          {/* Mobile Streak & XP (hidden on md+) */}
          <div 
            onClick={() => onTabChange('progress')}
            className="flex md:hidden items-center gap-2 cursor-pointer group select-none active:scale-95 transition-transform"
            title="View Stats"
          >
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border transition-all group-hover:border-amber-500/50 ${
              streak > 0 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.15)] animate-pulse' 
                : 'bg-gray-800/40 border-gray-800 text-gray-500'
            }`}>
              <Flame className={`w-3.5 h-3.5 ${streak > 0 ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-bold font-mono">{streak}d</span>
            </div>
            
            <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-xl transition-all group-hover:border-blue-500/50">
              <Trophy className="w-3 h-3" />
              <span className="text-[10px] font-mono font-bold">{xp}</span>
            </div>
          </div>
        </div>

        {/* Desktop Streak & XP (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-4">
          {/* Streak */}
          <div 
            onClick={() => onTabChange('progress')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-pointer hover:border-amber-500/50 hover:scale-[1.02] active:scale-[0.98] select-none ${
              streak > 0 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.12)]' 
                : 'bg-[#141A1F] border-gray-800 text-gray-500'
            }`}
            title="View Streak Statistics"
          >
            <Flame className={`w-5 h-5 ${streak > 0 ? 'fill-current text-amber-500 animate-bounce' : ''}`} />
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-gray-500 leading-none">Streak</p>
              <p className="text-sm font-bold font-mono mt-0.5 leading-none">{streak} Days</p>
            </div>
          </div>

          {/* XP */}
          <div 
            onClick={() => onTabChange('progress')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#141A1F] border border-gray-800 hover:border-blue-500/50 hover:scale-[1.02] active:scale-[0.98] rounded-xl transition-all cursor-pointer select-none"
            title="View XP Progression"
          >
            <Trophy className="w-5 h-5 text-blue-500" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-gray-500 leading-none">Total XP</p>
              <p className="text-sm font-bold font-mono text-blue-400 mt-0.5 leading-none">{xp} XP</p>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
