import React from 'react';
import { UserState } from '../types';
import { Search, Bell } from 'lucide-react';
import { getLevelAndProgress } from '../utils/xpUtils';
import AvatarRenderer from './AvatarRenderer';

interface HeaderProps {
  userState: UserState;
  onTabChange: (tab: UserState['activeTab']) => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  hasActiveNotifications?: boolean;
}

export default function Header({ 
  userState, 
  onTabChange,
  onOpenSearch,
  onOpenNotifications,
  hasActiveNotifications
}: HeaderProps) {
  const { xp, level, semester, avatar } = userState;
  
  // Calculate level progression with progressive XP
  const { xpInCurrentLevel, xpNeededForNextLevel, xpPercent } = getLevelAndProgress(xp);

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-2.5 md:py-3 font-sans select-none">
      <div className="max-w-7xl mx-auto flex flex-row justify-between items-center gap-3 w-full">
        
        {/* Left: View Profile and Settings */}
        <div 
          onClick={() => onTabChange('profile')}
          className="flex items-center gap-2.5 px-3 py-1.5 bg-[#141418] hover:bg-[#1A1A20] border border-white/5 hover:border-[#7C5CFF]/40 rounded-2xl cursor-pointer transition-all group select-none shadow-sm"
          title="View Profile & Settings"
          id="header-profile-settings-btn"
        >
          <div className="filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform flex items-center justify-center shrink-0 w-8 h-8 rounded-full overflow-hidden">
            <AvatarRenderer avatar={avatar} className="w-full h-full" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs md:text-sm font-bold text-white tracking-tight truncate group-hover:text-[#A78BFA] transition-colors">
                {userState.displayName || userState.username || 'User'}
              </span>
              <span className="text-[9px] bg-[#7C5CFF]/15 text-[#A78BFA] border border-[#7C5CFF]/30 px-1.5 py-0.2 rounded-full font-mono font-bold">
                S{semester}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] md:text-[10px] font-mono font-semibold text-[#A78BFA]">Lvl {level}</span>
              <div className="w-12 md:w-20 h-1.5 bg-[#09090B] border border-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA] rounded-full transition-all duration-500" 
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <span className="hidden sm:inline text-[9px] font-mono text-gray-400">{xpInCurrentLevel}/{xpNeededForNextLevel} XP</span>
            </div>
          </div>
        </div>

        {/* Right: Search Option & Notification Button */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button 
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 md:px-3.5 md:py-2 bg-[#141418] hover:bg-[#1A1A20] border border-white/5 hover:border-[#7C5CFF]/30 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer text-xs font-medium group active:scale-95"
            title="Search Subjects & Topics"
            id="header-search-btn"
          >
            <Search className="w-4 h-4 text-[#A78BFA] group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline text-xs font-semibold text-gray-200">Search</span>
          </button>

          {/* Notification Button */}
          <button 
            onClick={onOpenNotifications}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#141418] hover:bg-[#1A1A20] border border-white/5 hover:border-[#7C5CFF]/30 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer relative group active:scale-95"
            title="Notifications"
            id="header-notification-btn"
          >
            <Bell className="w-4 h-4 text-[#A78BFA] group-hover:scale-110 transition-transform" />
            {hasActiveNotifications && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#7C5CFF] rounded-full shadow-[0_0_8px_rgba(124,92,255,0.9)] animate-pulse" />
            )}
          </button>
        </div>

      </div>
    </header>
  );
}


