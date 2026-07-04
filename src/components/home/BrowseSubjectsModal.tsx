import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Play, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, Topic, Module } from '../../types';

interface BrowseSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubjects: Subject[];
  backlogSubjects: Subject[];
  completedTopics: string[];
  recommendation: { topic: Topic; module: Module; subject: Subject } | null;
  onSelectTopicManually: (subj: Subject, top: Topic) => void;
}

export default function BrowseSubjectsModal({
  isOpen,
  onClose,
  activeSubjects,
  backlogSubjects,
  completedTopics,
  recommendation,
  onSelectTopicManually,
}: BrowseSubjectsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);

  // Toggle subject accordion
  const toggleSubject = (subjId: string) => {
    setExpandedSubjectIds(prev => 
      prev.includes(subjId) ? prev.filter(id => id !== subjId) : [...prev, subjId]
    );
  };

  // Toggle module accordion
  const toggleModule = (modId: string) => {
    setExpandedModuleIds(prev => 
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  // Search filter logic
  const allAvailableSubjects = [...activeSubjects, ...backlogSubjects];
  const filteredSearchResults = searchQuery.trim() === '' ? [] : allAvailableSubjects.flatMap(sub => 
    sub.modules.flatMap(mod => 
      mod.topics.filter(top => 
        top.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(top => ({ topic: top, module: mod, subject: sub }))
    )
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-end" id="browse-modal-overlay">
          {/* Background Closer */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Bottom Sheet Frame */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="relative max-w-md w-full mx-auto bg-[#0F1318] border-t border-gray-880 rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] z-10"
            id="browse-sheet-content"
          >
            {/* Drag Handle & Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Browse Subjects</h3>
                <p className="text-[10px] text-gray-400">Select any topic to start studying immediately</p>
              </div>
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-full bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-200 hover:text-white hover:bg-gray-700 flex items-center justify-center transition-all cursor-pointer shadow-md"
                style={{ minHeight: '44px', minWidth: '44px' }}
                id="close-browse-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar Input */}
            <div className="p-4 border-b border-gray-800/50 bg-gray-950/40">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search Topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 focus:border-gray-700 focus:ring-1 focus:ring-gray-750 rounded-xl text-xs text-white placeholder-gray-500 outline-none transition-all"
                  id="search-topics-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-white transition-all cursor-pointer border-0 bg-transparent"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              
              {searchQuery.trim() !== '' ? (
                // SEARCH RESULTS VIEW
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Search Results ({filteredSearchResults.length})</p>
                  {filteredSearchResults.length > 0 ? (
                    <div className="space-y-2">
                      {filteredSearchResults.map(({ topic, module, subject }) => (
                        <div 
                          key={topic.id}
                          onClick={() => onSelectTopicManually(subject, topic)}
                          className="p-3 bg-gray-950 hover:bg-gray-900 border border-gray-850 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-blue-400 font-bold font-mono uppercase tracking-wider">{subject.name}</span>
                            <p className="text-xs font-bold text-white leading-tight">{topic.name}</p>
                            <p className="text-[10px] text-gray-500">{module.name}</p>
                          </div>
                          <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400/10 shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-gray-500 italic">
                      No matches found for "{searchQuery}"
                    </div>
                  )}
                </div>
              ) : (
                // HIERARCHICAL ACCORDION DRILL DOWN
                <div className="space-y-4">
                  
                  {/* Continuing Current Subject Quick Link */}
                  {recommendation && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Continue Current Subject</p>
                      <div 
                        onClick={() => {
                          setExpandedSubjectIds([recommendation.subject.id]);
                          setExpandedModuleIds([recommendation.module.id]);
                        }}
                        className="p-3.5 bg-blue-950/10 border border-blue-900/30 rounded-xl flex items-center justify-between cursor-pointer hover:bg-blue-950/20 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <BookOpen className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="text-xs font-bold text-white">{recommendation.subject.name}</p>
                            <p className="text-[10px] text-gray-400">Current module: {recommendation.module.name}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 flex items-center gap-0.5">
                          <span>Open</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Semester Subjects Section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Semester Subjects</p>
                    <div className="space-y-2">
                      {activeSubjects.map((subject) => {
                        const isExpanded = expandedSubjectIds.includes(subject.id);
                        return (
                          <div key={subject.id} className="border border-gray-850 rounded-xl overflow-hidden bg-gray-950/40">
                            <button
                              onClick={() => toggleSubject(subject.id)}
                              className="w-full p-3.5 flex items-center justify-between hover:bg-gray-900 transition-all text-left cursor-pointer border-0 bg-transparent outline-none"
                            >
                              <div>
                                <p className="text-xs font-extrabold text-white">{subject.name}</p>
                                <p className="text-[10px] text-gray-500">{subject.modules.length} Modules</p>
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-850 bg-gray-950 p-2.5 space-y-2">
                                {subject.modules.map((mod) => {
                                  const isModExpanded = expandedModuleIds.includes(mod.id);
                                  return (
                                    <div key={mod.id} className="border border-gray-850/60 rounded-lg overflow-hidden bg-[#101419]/30">
                                      <button
                                        onClick={() => toggleModule(mod.id)}
                                        className="w-full p-2.5 flex items-center justify-between hover:bg-gray-900 transition-all text-left cursor-pointer border-0 bg-transparent outline-none"
                                      >
                                        <p className="text-[11px] font-bold text-gray-300">{mod.name}</p>
                                        {isModExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                                      </button>

                                      {isModExpanded && (
                                        <div className="p-2 border-t border-gray-850/40 bg-gray-950/20 space-y-1.5">
                                          {mod.topics.map((top) => {
                                            const isCompleted = completedTopics.includes(top.id);
                                            return (
                                              <div
                                                key={top.id}
                                                onClick={() => onSelectTopicManually(subject, top)}
                                                className="p-2.5 hover:bg-gray-900 rounded-md flex items-center justify-between cursor-pointer transition-all border border-transparent hover:border-gray-850"
                                              >
                                                <div className="flex items-center gap-2">
                                                  {isCompleted ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                                  ) : (
                                                    <div className="w-4 h-4 rounded-full border border-gray-700 shrink-0" />
                                                  )}
                                                  <span className={`text-[11px] font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                    {top.name}
                                                  </span>
                                                </div>
                                                <Play className="w-3 h-3 text-blue-400 fill-blue-400/5" />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Backlog Subjects Section */}
                  {backlogSubjects.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Backlog Subjects</p>
                      <div className="space-y-2">
                        {backlogSubjects.map((subject) => {
                          const isExpanded = expandedSubjectIds.includes(subject.id);
                          return (
                            <div key={subject.id} className="border border-red-900/20 rounded-xl overflow-hidden bg-red-950/[0.05]">
                              <button
                                onClick={() => toggleSubject(subject.id)}
                                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-900 transition-all text-left cursor-pointer border-0 bg-transparent outline-none"
                              >
                                <div>
                                  <p className="text-xs font-extrabold text-red-300">{subject.name}</p>
                                  <p className="text-[10px] text-gray-500">Backlog Subject</p>
                                </div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </button>

                              {isExpanded && (
                                <div className="border-t border-red-950/20 bg-gray-950 p-2.5 space-y-2">
                                  {subject.modules.map((mod) => {
                                    const isModExpanded = expandedModuleIds.includes(mod.id);
                                    return (
                                      <div key={mod.id} className="border border-gray-850 rounded-lg overflow-hidden bg-gray-950/40">
                                        <button
                                          onClick={() => toggleModule(mod.id)}
                                          className="w-full p-2.5 flex items-center justify-between hover:bg-gray-900 transition-all text-left cursor-pointer border-0 bg-transparent outline-none"
                                        >
                                          <p className="text-[11px] font-bold text-gray-300">{mod.name}</p>
                                          {isModExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                                        </button>

                                        {isModExpanded && (
                                          <div className="p-2 border-t border-gray-850 bg-gray-950/20 space-y-1.5">
                                            {mod.topics.map((top) => {
                                              const isCompleted = completedTopics.includes(top.id);
                                              return (
                                                <div
                                                  key={top.id}
                                                  onClick={() => onSelectTopicManually(subject, top)}
                                                  className="p-2.5 hover:bg-gray-900 rounded-md flex items-center justify-between cursor-pointer transition-all border border-transparent hover:border-gray-850"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {isCompleted ? (
                                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                                  ) : (
                                                    <div className="w-4 h-4 rounded-full border border-gray-700 shrink-0" />
                                                  )}
                                                    <span className={`text-[11px] font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                      {top.name}
                                                    </span>
                                                  </div>
                                                  <Play className="w-3 h-3 text-blue-400 fill-blue-400/5" />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Archived Subjects */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Archived Subjects</p>
                    <div className="p-4 bg-gray-950/25 border border-gray-850 rounded-xl text-center text-xs text-gray-500 italic">
                      No archived subjects yet.
                    </div>
                  </div>

                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
