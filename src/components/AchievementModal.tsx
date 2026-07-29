import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  X, 
  Search, 
  Lock, 
  CheckCircle2, 
  Zap, 
  Share2,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  RotateCcw,
  Gift
} from 'lucide-react';
import { UserState, Subject } from '../types';
import { ALL_ACHIEVEMENTS, AchievementRarity, claimAchievement, claimAllAchievements } from '../utils/achievements';
import { SoundManager } from '../utils/soundManager';

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  activeSubjects?: Subject[];
  backlogSubjects?: Subject[];
  onUpdateState?: (updated: UserState) => void;
  onTriggerToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type SortOption = 'recommended' | 'progress' | 'xp' | 'rarity' | 'unlocked_first' | 'locked_first' | 'alphabetical';
type StatusFilter = 'all' | 'unlocked' | 'locked' | 'ready';
type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary' | 'ultra_rare' | 'secret' | 'college' | 'social';

export default function AchievementModal({
  isOpen,
  onClose,
  userState,
  activeSubjects = [],
  backlogSubjects = [],
  onUpdateState,
  onTriggerToast
}: AchievementModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortOption>('recommended');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Temporary sheet state before user taps "Apply" or live update
  const [tempSortMode, setTempSortMode] = useState<SortOption>('recommended');
  const [tempStatusFilter, setTempStatusFilter] = useState<StatusFilter>('all');
  const [tempRarityFilter, setTempRarityFilter] = useState<RarityFilter>('all');

  const openSheet = () => {
    setTempSortMode(sortMode);
    setTempStatusFilter(statusFilter);
    setTempRarityFilter(rarityFilter);
    setIsFilterSheetOpen(true);
  };

  const applySheetFilters = () => {
    setSortMode(tempSortMode);
    setStatusFilter(tempStatusFilter);
    setRarityFilter(tempRarityFilter);
    setIsFilterSheetOpen(false);
  };

  const resetFilters = () => {
    setTempSortMode('recommended');
    setTempStatusFilter('all');
    setTempRarityFilter('all');
    setSortMode('recommended');
    setStatusFilter('all');
    setRarityFilter('all');
    setSearchQuery('');
    setIsFilterSheetOpen(false);
  };

  // Calculate unlocked achievements & progress
  const achievementStatuses = useMemo(() => {
    const claimedIds = userState?.unlockedAchievements || [];
    return ALL_ACHIEVEMENTS.map((ach) => {
      const isClaimed = claimedIds.includes(ach.id);
      const isCompleted = ach.checkUnlocked(userState, activeSubjects, backlogSubjects);
      const isReadyToClaim = isCompleted && !isClaimed;
      const isUnlocked = isClaimed;

      const progress = ach.getProgress ? ach.getProgress(userState, activeSubjects, backlogSubjects) : null;
      const progressPct = isClaimed ? 1 : (progress ? Math.min(1, Math.max(0, progress.current / progress.target)) : (isCompleted ? 1 : 0));
      return {
        ...ach,
        isClaimed,
        isCompleted,
        isReadyToClaim,
        isUnlocked,
        progress,
        progressPct
      };
    });
  }, [userState, activeSubjects, backlogSubjects]);

  const readyToClaimList = useMemo(() => {
    return achievementStatuses.filter(a => a.isReadyToClaim);
  }, [achievementStatuses]);

  const totalReadyXP = useMemo(() => {
    return readyToClaimList.reduce((sum, a) => sum + a.xpReward, 0);
  }, [readyToClaimList]);

  const totalUnlocked = achievementStatuses.filter(a => a.isUnlocked).length;
  const totalCount = ALL_ACHIEVEMENTS.length;
  const totalXPEarned = achievementStatuses
    .filter(a => a.isUnlocked)
    .reduce((sum, a) => sum + a.xpReward, 0);

  // Claim Handlers
  const handleClaimSingle = (achId: string) => {
    const { updatedState, claimedAchievement } = claimAchievement(userState, achId, activeSubjects, backlogSubjects);
    if (claimedAchievement && onUpdateState) {
      SoundManager.play('badge_unlock');
      SoundManager.vibrate('success');
      onUpdateState(updatedState);
      if (onTriggerToast) {
        onTriggerToast('🏆 Achievement Claimed!', `Unlocked "${claimedAchievement.title}" (+${claimedAchievement.xpReward} XP)`, 'success');
      }
    }
  };

  const handleClaimAll = () => {
    const { updatedState, claimedAchievements, totalXpAdded } = claimAllAchievements(userState, activeSubjects, backlogSubjects);
    if (claimedAchievements.length > 0 && onUpdateState) {
      SoundManager.play('badge_unlock');
      SoundManager.vibrate('success');
      onUpdateState(updatedState);
      if (onTriggerToast) {
        onTriggerToast('🎉 All Claimed!', `Claimed ${claimedAchievements.length} achievements (+${totalXpAdded} XP)`, 'success');
      }
    }
  };

  // Identify next milestone to unlock
  const nextMilestone = useMemo(() => {
    const locked = achievementStatuses.filter(a => !a.isUnlocked && !a.isReadyToClaim);
    if (locked.length === 0) return null;
    
    // Sort locked by progress percentage if available, otherwise by xpReward
    const sorted = [...locked].sort((a, b) => {
      if (a.progressPct !== b.progressPct) return b.progressPct - a.progressPct;
      return b.xpReward - a.xpReward;
    });

    return sorted[0];
  }, [achievementStatuses]);

  // Rarity weight dictionary for sorting
  const rarityWeights: Record<string, number> = {
    ultra_rare: 5,
    legendary: 4,
    epic: 3,
    rare: 2,
    common: 1,
    secret: 3,
    college: 2,
    social: 1,
    tiered: 2
  };

  // Combined Filter & Sort Logic
  const filteredAchievements = useMemo(() => {
    let result = achievementStatuses.filter((ach) => {
      // Status Filter
      if (statusFilter === 'unlocked' && !ach.isUnlocked) return false;
      if (statusFilter === 'locked' && (ach.isUnlocked || ach.isReadyToClaim)) return false;
      if (statusFilter === 'ready' && !ach.isReadyToClaim) return false;

      // Rarity Filter
      if (rarityFilter !== 'all') {
        if (rarityFilter === 'secret') {
          if (!ach.isSecret && ach.rarity !== 'secret') return false;
        } else if (ach.rarity !== rarityFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = ach.title.toLowerCase().includes(query);
        const matchesDesc = ach.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });

    // Apply Sorting (Ready to Claim ALWAYS comes first!)
    result.sort((a, b) => {
      if (a.isReadyToClaim !== b.isReadyToClaim) {
        return a.isReadyToClaim ? -1 : 1;
      }

      switch (sortMode) {
        case 'recommended':
          // Recommended: Locked items near completion first, then highest XP, then unlocked
          if (a.isUnlocked !== b.isUnlocked) {
            return a.isUnlocked ? 1 : -1; // Locked first so active goals are at top
          }
          if (!a.isUnlocked && !b.isUnlocked) {
            if (b.progressPct !== a.progressPct) return b.progressPct - a.progressPct;
            return b.xpReward - a.xpReward;
          }
          return b.xpReward - a.xpReward;

        case 'progress':
          if (b.progressPct !== a.progressPct) return b.progressPct - a.progressPct;
          return b.xpReward - a.xpReward;

        case 'xp':
          return b.xpReward - a.xpReward;

        case 'rarity':
          const wA = rarityWeights[a.rarity] || 0;
          const wB = rarityWeights[b.rarity] || 0;
          if (wB !== wA) return wB - wA;
          return b.xpReward - a.xpReward;

        case 'unlocked_first':
          if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
          return b.xpReward - a.xpReward;

        case 'locked_first':
          if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? 1 : -1;
          return b.xpReward - a.xpReward;

        case 'alphabetical':
          return a.title.localeCompare(b.title);

        default:
          return 0;
      }
    });

    return result;
  }, [achievementStatuses, statusFilter, rarityFilter, searchQuery, sortMode]);

  if (!isOpen) return null;

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (rarityFilter !== 'all' ? 1 : 0) + (sortMode !== 'recommended' ? 1 : 0);

  const getRarityBadge = (rarity: AchievementRarity) => {
    switch (rarity) {
      case 'common':
        return <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">Common</span>;
      case 'rare':
        return <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400">Rare</span>;
      case 'epic':
        return <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300">Epic</span>;
      case 'legendary':
        return <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300">Legendary</span>;
      case 'secret':
        return <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-pink-500/15 border border-pink-500/30 text-pink-400">Secret</span>;
      case 'ultra_rare':
        return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">Ultra-Rare</span>;
      default:
        return <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-500/15 border border-gray-500/30 text-gray-300">{rarity}</span>;
    }
  };

  const getCardStyle = (ach: typeof achievementStatuses[0]) => {
    if (!ach.isUnlocked) {
      return 'bg-[#151222] border-purple-900/40 hover:border-purple-700/60 opacity-80 hover:opacity-100';
    }
    switch (ach.rarity) {
      case 'legendary':
      case 'ultra_rare':
        return 'bg-gradient-to-br from-[#231A3A] via-[#1B142D] to-[#161224] border-amber-500/60 shadow-[0_4px_20px_rgba(245,158,11,0.18)] ring-1 ring-amber-500/30';
      case 'epic':
        return 'bg-gradient-to-br from-[#211738] to-[#151122] border-purple-500/50 shadow-[0_4px_16px_rgba(168,85,247,0.15)]';
      case 'rare':
        return 'bg-gradient-to-br from-[#161B32] to-[#111322] border-blue-500/40 shadow-[0_4px_14px_rgba(59,130,246,0.12)]';
      case 'secret':
        return 'bg-gradient-to-br from-[#28142E] to-[#161022] border-pink-500/40 shadow-[0_4px_16px_rgba(236,72,153,0.12)]';
      default:
        return 'bg-gradient-to-br from-[#161E28] to-[#121422] border-emerald-500/35 shadow-[0_2px_12px_rgba(16,185,129,0.1)]';
    }
  };

  const handleShareAchievement = (ach: typeof achievementStatuses[0]) => {
    if (!ach.isUnlocked) return;
    if (onTriggerToast) {
      onTriggerToast(
        "Trophy Showcased! 🏆",
        `Shared "${ach.title}" (+${ach.xpReward} XP) to your StudyOS profile!`,
        "success"
      );
    }
  };

  const sortLabels: Record<SortOption, string> = {
    recommended: 'Recommended',
    progress: 'Highest Progress',
    xp: 'Highest XP',
    rarity: 'Rarity',
    unlocked_first: 'Unlocked First',
    locked_first: 'Locked First',
    alphabetical: 'A–Z'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#120F1D] border border-purple-500/20 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
        id="achievement-modal-container"
      >
        {/* COMPACT GAMIFIED HEADER */}
        <div className="p-2.5 sm:p-3 border-b border-purple-500/20 bg-gradient-to-r from-[#1A152C] via-[#151124] to-[#1D1632] space-y-2 shrink-0">
          {/* ROW 1: TITLE, COUNTERS & CLOSE BUTTON */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight font-display flex items-center gap-2 truncate">
                <span>Trophy Hall</span>
                <span className="text-[10px] font-extrabold font-mono text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  {totalUnlocked}/{totalCount} ({Math.round((totalUnlocked / totalCount) * 100)}%)
                </span>
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5 active:scale-95 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ROW 2: PROGRESS BAR & TOTAL XP + NEXT TARGET STRIP */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
            {/* Overall Progress Bar */}
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <div className="w-full max-w-[180px] sm:max-w-[200px] h-2 bg-gray-950 rounded-full overflow-hidden border border-white/10 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${totalCount > 0 ? Math.min(100, Math.max(0, Math.round((totalUnlocked / totalCount) * 100))) : 0}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300">
                {totalCount > 0 ? Math.round((totalUnlocked / totalCount) * 100) : 0}%
              </span>
            </div>

            {/* Total XP & Next Target Compact Group */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-black text-[10px]">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>+{totalXPEarned.toLocaleString()} XP</span>
              </div>

              {nextMilestone && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] text-amber-300 font-bold truncate">
                  <span className="text-amber-400">🎯 Next:</span>
                  <span className="text-white truncate max-w-[130px] sm:max-w-[220px]">{nextMilestone.title}</span>
                  <span className="text-amber-400 font-mono font-black">+{nextMilestone.xpReward} XP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STREAMLINED SEARCH & FILTER/SORT CONTROL BAR */}
        <div className="p-2 bg-[#161224] border-b border-purple-500/10 flex items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-purple-300/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trophies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#100D1A] border border-purple-500/20 rounded-lg pl-7 pr-6 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-[10px] font-bold bg-white/10 px-1.5 py-0.2 rounded"
              >
                ✕
              </button>
            )}
          </div>

          {/* SINGLE FILTER & SORT TRIGGER BUTTON */}
          <button
            onClick={openSheet}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 select-none ${
              activeFilterCount > 0
                ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Filter & Sort</span>
            <span className="sm:hidden">Filter</span>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded-md border border-purple-500/30">
              {sortLabels[sortMode]}
            </span>
            {activeFilterCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* COMPACT COLLECTIBLE BADGES GRID */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {/* PROMINENT TOP READY TO CLAIM BANNER */}
          {readyToClaimList.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/25 via-purple-600/25 to-indigo-600/25 border-2 border-amber-400 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_25px_rgba(245,158,11,0.25)] animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                  🎁
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <span>{readyToClaimList.length} Achievement{readyToClaimList.length > 1 ? 's' : ''} Ready to Claim!</span>
                    <span className="text-[10px] sm:text-xs text-amber-300 font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      +{totalReadyXP} XP Total
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-300">Tap claim to receive your XP rewards and unlock these badges on your profile.</p>
                </div>
              </div>
              <button
                onClick={handleClaimAll}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-4 h-4 fill-current text-gray-950" />
                Claim All (+{totalReadyXP} XP)
              </button>
            </div>
          )}

          {filteredAchievements.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-800/80 border border-white/10 flex items-center justify-center mx-auto text-2xl text-gray-400">
                🔍
              </div>
              <h3 className="text-sm font-bold text-gray-300">No trophies match your filters</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Try clearing your search query or adjusting your Filter & Sort options.
              </p>
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-lg hover:bg-purple-600/30 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredAchievements.map((ach) => {
                const isSecretLocked = ach.isSecret && !ach.isUnlocked && !ach.isReadyToClaim;

                return (
                  <div
                    key={ach.id}
                    onClick={() => {
                      if (ach.isReadyToClaim) {
                        handleClaimSingle(ach.id);
                      } else {
                        handleShareAchievement(ach);
                      }
                    }}
                    className={`rounded-xl p-3 border flex flex-col justify-between gap-2.5 transition-all relative group cursor-pointer ${getCardStyle(ach)}`}
                  >
                    {/* CARD HEADER: EMBLEM ICON, TITLE, XP REWARD & STATUS BADGE */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Emblem Square Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 border shadow-inner ${
                          ach.isReadyToClaim
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-bounce'
                            : ach.isUnlocked
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-gray-800/70 border-gray-700/60 text-gray-500'
                        }`}>
                          {isSecretLocked ? '🔒' : ach.icon}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-amber-300 transition-colors tracking-tight flex items-center gap-1.5">
                            <span>{isSecretLocked ? 'Secret Trophy' : ach.title}</span>
                            {ach.isReadyToClaim && (
                              <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-400">
                                READY!
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-1 flex-wrap">
                            {getRarityBadge(ach.rarity)}
                            {ach.tierName && (
                              <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                                T{ach.tierLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Right XP Badge */}
                      <div className="shrink-0 flex items-center gap-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                          ach.isReadyToClaim
                            ? 'bg-amber-400 text-gray-950 font-black border-amber-300 shadow-md animate-pulse'
                            : ach.isUnlocked
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                            : 'bg-gray-800/80 border-gray-700/80 text-gray-400'
                        }`}>
                          <Zap className="w-3 h-3 fill-current" />
                          +{ach.xpReward} XP
                        </span>
                      </div>
                    </div>

                    {/* CARD DESCRIPTION */}
                    <p className="text-[11px] text-gray-400 leading-snug line-clamp-2 min-h-[1.75rem]">
                      {isSecretLocked
                        ? 'Keep studying and exploring StudyOS to unlock this mysterious secret trophy!'
                        : ach.description}
                    </p>

                    {/* CARD FOOTER: PROGRESS & STATUS TAG */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      {!isSecretLocked && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                            <span className="text-gray-400">Progress</span>
                            <span className={ach.isReadyToClaim ? "text-amber-300 font-extrabold" : ach.isUnlocked ? "text-emerald-400" : "text-purple-300"}>
                              {ach.isUnlocked || ach.isReadyToClaim
                                ? `${(ach.progress?.target || 1).toLocaleString()} / ${(ach.progress?.target || 1).toLocaleString()} ${ach.progress?.unit || ''}`
                                : `${(ach.progress?.current || 0).toLocaleString()} / ${(ach.progress?.target || 1).toLocaleString()} ${ach.progress?.unit || ''}`
                              }
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden border border-white/10">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                ach.isReadyToClaim
                                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse'
                                  : ach.isUnlocked
                                  ? 'bg-gradient-to-r from-amber-400 to-emerald-400'
                                  : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400'
                              }`}
                              style={{ 
                                width: `${
                                  ach.isUnlocked || ach.isReadyToClaim
                                    ? 100
                                    : (ach.progress && ach.progress.target > 0
                                        ? Math.min(100, Math.max(0, Math.round((ach.progress.current / ach.progress.target) * 100)))
                                        : 0)
                                }%` 
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] pt-0.5">
                        {ach.isReadyToClaim ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimSingle(ach.id);
                            }}
                            className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Gift className="w-3.5 h-3.5 fill-current" />
                            <span>CLAIM +{ach.xpReward} XP</span>
                          </button>
                        ) : ach.isUnlocked ? (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1 font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>✔ COMPLETED</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareAchievement(ach);
                              }}
                              className="text-gray-400 hover:text-white flex items-center gap-1 font-bold transition-colors cursor-pointer"
                            >
                              <Share2 className="w-3 h-3" />
                              Showcase
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-mono text-gray-400 bg-gray-800/80 border border-gray-700/80 px-2 py-0.5 rounded-md">
                            <Lock className="w-3 h-3" />
                            <span>LOCKED</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM SHEET / DRAWER DIALOG FOR FILTER & SORT */}
        {isFilterSheetOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-6 animate-fade-in">
            <div className="bg-[#181328] border border-purple-500/30 rounded-t-2xl sm:rounded-2xl max-w-lg w-full mx-auto p-4 sm:p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[85vh]">
              {/* SHEET HEADER */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-extrabold text-white">Filter & Sort Trophies</h3>
                </div>
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SECTION 1: SORT BY */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Sort Order
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'recommended', label: '🎯 Recommended' },
                      { id: 'progress', label: '📈 Highest Progress' },
                      { id: 'xp', label: '⚡ Highest XP' },
                      { id: 'rarity', label: '🏆 Rarity Level' },
                      { id: 'unlocked_first', label: '🔓 Unlocked First' },
                      { id: 'locked_first', label: '🔒 Locked First' },
                      { id: 'alphabetical', label: '🔤 Alphabetical (A–Z)' }
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setTempSortMode(opt.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                        tempSortMode === opt.id
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                          : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {tempSortMode === opt.id && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: STATUS FILTER */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Completion Status
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All Badges' },
                      { id: 'unlocked', label: 'Unlocked' },
                      { id: 'locked', label: 'Locked' }
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setTempStatusFilter(st.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer border ${
                        tempStatusFilter === st.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 3: RARITY FILTER */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Rarity & Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All Rarities' },
                      { id: 'common', label: '🟢 Common' },
                      { id: 'rare', label: '🔵 Rare' },
                      { id: 'epic', label: '🟣 Epic' },
                      { id: 'legendary', label: '🟡 Legendary' },
                      { id: 'ultra_rare', label: '⚡ Ultra-Rare' },
                      { id: 'secret', label: '🌟 Secret' },
                      { id: 'college', label: '🏫 College' },
                      { id: 'social', label: '👥 Social' }
                    ] as const
                  ).map((rf) => (
                    <button
                      key={rf.id}
                      onClick={() => setTempRarityFilter(rf.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        tempRarityFilter === rf.id
                          ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {rf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SHEET FOOTER CONTROLS */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applySheetFilters}
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

