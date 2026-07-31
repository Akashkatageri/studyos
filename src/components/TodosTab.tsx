import React, { useState, useMemo, useEffect } from 'react';
import { UserState, TodoItem, TodoPriority, TodoRepeat } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import { addDaysToDateString, parseDateUTC } from '../lib/spacedRepetition';
import { SoundManager } from '../utils/soundManager';
import { sanitizeTodos } from '../utils/todoUtils';
import { 
  Check, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  MoreVertical,
  X,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TodosTabProps {
  userState: UserState;
  onUpdateState: (updated: Partial<UserState>) => void;
}

export default function TodosTab({ userState, onUpdateState }: TodosTabProps) {
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Quick Add State
  const [newTitle, setNewTitle] = useState('');

  // Editing & Details Modal State
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null);

  // Sanitized todos array free of duplicates
  const todos = useMemo(() => sanitizeTodos(userState.todos || []), [userState.todos]);

  // Automatic cleanup effect for duplicate or corrupt tasks in userState
  useEffect(() => {
    if (!userState.todos) return;
    const sanitized = sanitizeTodos(userState.todos);
    if (sanitized.length !== userState.todos.length) {
      onUpdateState({ todos: sanitized });
    }
  }, [userState.todos, onUpdateState]);

  // Handle Auto-Move uncompleted tasks
  useEffect(() => {
    if (userState.autoMoveUncompletedTodos) {
      const pastUncompleted = todos.filter(t => !t.completed && t.dateCreated < todayStr);
      if (pastUncompleted.length > 0) {
        const updatedTodos = todos.map(t => {
          if (!t.completed && t.dateCreated < todayStr) {
            return { ...t, dateCreated: todayStr };
          }
          return t;
        });
        onUpdateState({ todos: updatedTodos });
      }
    }
  }, [todos, todayStr, userState.autoMoveUncompletedTodos, onUpdateState]);

  // Get tasks for selected date (including recurring tasks)
  const dateTasks = useMemo(() => {
    const rawForDate = todos.filter(t => t.dateCreated === selectedDate);
    const dateObj = parseDateUTC(selectedDate);
    const dayOfWeek = dateObj.getUTCDay();

    const repeatingTemplates = todos.filter(t => 
      t.repeat && 
      t.repeat !== 'none' && 
      !t.isInstance && 
      !t.parentTaskId && 
      t.dateCreated < selectedDate
    );
    const newlyGeneratedRepeats: TodoItem[] = [];

    repeatingTemplates.forEach(template => {
      let applies = false;
      if (template.repeat === 'daily') applies = true;
      else if (template.repeat === 'mon-wed-fri' && (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5)) applies = true;
      else if (template.repeat === 'weekly' && parseDateUTC(template.dateCreated).getUTCDay() === dayOfWeek) applies = true;

      if (applies) {
        const titleLower = (template.title || '').trim().toLowerCase();
        const existingInstance = rawForDate.find(t => 
          t.id === `${template.id}_${selectedDate}` || 
          t.parentTaskId === template.id ||
          (t.title || '').trim().toLowerCase() === titleLower
        ) || newlyGeneratedRepeats.find(t => 
          (t.title || '').trim().toLowerCase() === titleLower
        );

        if (!existingInstance) {
          newlyGeneratedRepeats.push({
            ...template,
            id: `${template.id}_${selectedDate}`,
            parentTaskId: template.id,
            isInstance: true,
            dateCreated: selectedDate,
            repeat: 'none',
            completed: false,
            completedAt: undefined,
          });
        }
      }
    });

    return [...rawForDate, ...newlyGeneratedRepeats];
  }, [todos, selectedDate]);

  // Uncompleted & completed count
  const completedCount = dateTasks.filter(t => t.completed).length;
  const totalCount = dateTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Past incomplete count
  const pastIncompleteCount = useMemo(() => {
    return todos.filter(t => !t.completed && t.dateCreated < todayStr).length;
  }, [todos, todayStr]);

  // Sorted list: Uncompleted first, then Completed
  const sortedTasks = useMemo(() => {
    return [...dateTasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.order || 0) - (b.order || 0);
    });
  }, [dateTasks]);

  // Quick Add Handler
  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: TodoItem = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newTitle.trim(),
      completed: false,
      priority: 'medium',
      category: 'study',
      dateCreated: selectedDate,
      order: todos.length + 1,
    };

    onUpdateState({ todos: [...todos, newTask] });
    SoundManager.play('click');
    SoundManager.vibrate('light');
    setNewTitle('');
  };

  // Toggle Completion
  const handleToggleTask = (id: string) => {
    const isExistingInState = todos.some(t => t.id === id);
    let updated: TodoItem[];

    if (isExistingInState) {
      updated = todos.map(t => {
        if (t.id === id) {
          const next = !t.completed;
          if (next) {
            SoundManager.play('topic_complete');
            SoundManager.vibrate('success');
          } else {
            SoundManager.play('click');
          }
          return { ...t, completed: next, completedAt: next ? new Date().toISOString() : undefined };
        }
        return t;
      });
    } else {
      // Toggle virtual generated repeating task
      const virtualTask = dateTasks.find(t => t.id === id);
      if (!virtualTask) return;
      const nextCompleted = !virtualTask.completed;
      if (nextCompleted) {
        SoundManager.play('topic_complete');
        SoundManager.vibrate('success');
      } else {
        SoundManager.play('click');
      }
      const newInstance: TodoItem = {
        ...virtualTask,
        repeat: 'none',
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : undefined
      };
      updated = [...todos, newInstance];
    }

    onUpdateState({ todos: sanitizeTodos(updated) });
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    onUpdateState({ todos: todos.filter(t => t.id !== id) });
    SoundManager.play('click');
  };

  // Carry Over Past Incomplete
  const handleCarryOverPast = () => {
    const updated = todos.map(t => {
      if (!t.completed && t.dateCreated < selectedDate) {
        return { ...t, dateCreated: selectedDate };
      }
      return t;
    });
    onUpdateState({ todos: updated });
    SoundManager.play('streak_secured');
  };

  // Format Date Display
  const dateFormatted = useMemo(() => {
    const d = parseDateUTC(selectedDate);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    if (selectedDate === todayStr) return `Today • ${dayName}, ${monthDay}`;
    return `${dayName}, ${monthDay}`;
  }, [selectedDate, todayStr]);

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 pt-2 animate-fadeIn">
      
      {/* HEADER SECTION */}
      <div className="bg-[#111114] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
        {/* Title & Date Nav */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black font-display text-white tracking-tight">Daily Tasks</h1>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{dateFormatted}</p>
          </div>

          <div className="flex items-center gap-1 bg-[#18181C] border border-white/5 rounded-xl p-1">
            <button
              onClick={() => {
                setSelectedDate(prev => addDaysToDateString(prev, -1));
                SoundManager.play('click');
              }}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative flex items-center px-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="w-6 h-6 opacity-0 absolute inset-0 cursor-pointer z-10"
              />
              <CalendarIcon className="w-4 h-4 text-[#7C5CFF]" />
            </div>
            <button
              onClick={() => {
                setSelectedDate(prev => addDaysToDateString(prev, 1));
                SoundManager.play('click');
              }}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400 font-medium">Progress</span>
            <span className="text-white font-bold">{completedCount} / {totalCount} Completed</span>
          </div>
          <div className="h-2 bg-[#18181C] border border-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#7C5CFF] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Past Incomplete Tasks Carry Over Notice */}
        {pastIncompleteCount > 0 && selectedDate === todayStr && (
          <button
            onClick={handleCarryOverPast}
            className="w-full flex items-center justify-between bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{pastIncompleteCount} uncompleted task{pastIncompleteCount > 1 ? 's' : ''} from previous days</span>
            </span>
            <span className="font-bold underline">Move to today</span>
          </button>
        )}
      </div>

      {/* ULTRA-SIMPLE ADD TASK INPUT */}
      <form onSubmit={handleAddTask} className="flex items-center gap-3 bg-[#111114] border border-[#7C5CFF]/30 rounded-2xl px-4 py-3 shadow-md focus-within:border-[#7C5CFF] transition-all">
        <Plus className="w-5 h-5 text-[#7C5CFF] shrink-0" />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        {newTitle.trim() && (
          <button
            type="submit"
            className="bg-[#7C5CFF] hover:bg-[#6C4BFF] text-white px-3 py-1 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
          >
            Add
          </button>
        )}
      </form>

      {/* TASK LIST (APPLE REMINDERS STYLE) */}
      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="bg-[#111114] border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-1">
            <p className="text-sm font-medium text-gray-300">No tasks for today</p>
            <p className="text-xs text-gray-500">Type above and press Enter to quickly add your daily study goals.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group bg-[#111114] border rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all ${
                  task.completed ? 'border-white/5 opacity-50 bg-[#0d0d10]' : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Checkbox + Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      task.completed
                        ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white'
                        : 'border-white/20 hover:border-[#7C5CFF] bg-white/5'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  <span className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                    {task.title}
                  </span>
                </div>

                {/* Right Options / Delete */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-1.5 text-gray-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Task options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* MORE SETTINGS / TASK DETAILS MODAL (HIDDEN UNTIL REQUESTED BY USER) */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111114] border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-white">Task Details</h3>
                <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-gray-400 mb-1 block">Title</label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full bg-[#18181C] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#7C5CFF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 mb-1 block">Priority</label>
                    <select
                      value={editingTask.priority}
                      onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TodoPriority })}
                      className="w-full bg-[#18181C] border border-white/10 rounded-xl p-2 text-white focus:outline-none"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 mb-1 block">Category</label>
                    <select
                      value={editingTask.category}
                      onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                      className="w-full bg-[#18181C] border border-white/10 rounded-xl p-2 text-white focus:outline-none"
                    >
                      <option value="study">Study</option>
                      <option value="assignment">Assignment</option>
                      <option value="project">Project</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 mb-1 block">Repeat Schedule</label>
                  <select
                    value={editingTask.repeat || 'none'}
                    onChange={(e) => setEditingTask({ ...editingTask, repeat: e.target.value as TodoRepeat })}
                    className="w-full bg-[#18181C] border border-white/10 rounded-xl p-2 text-white focus:outline-none"
                  >
                    <option value="none">No repeat</option>
                    <option value="daily">Daily</option>
                    <option value="mon-wed-fri">Mon, Wed, Fri</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => setEditingTask(null)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!editingTask.title.trim()) return;
                    onUpdateState({ todos: todos.map(t => t.id === editingTask.id ? editingTask : t) });
                    setEditingTask(null);
                    SoundManager.play('click');
                  }}
                  className="px-3 py-1.5 bg-[#7C5CFF] hover:bg-[#6C4BFF] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auto-Move Toggle inside Footer Settings */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-white/5">
        <span>Auto-move incomplete tasks to today</span>
        <button
          onClick={() => onUpdateState({ autoMoveUncompletedTodos: !userState.autoMoveUncompletedTodos })}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            userState.autoMoveUncompletedTodos ? 'bg-[#7C5CFF]/20 text-[#A78BFA] border border-[#7C5CFF]/30' : 'bg-white/5 text-gray-400'
          }`}
        >
          {userState.autoMoveUncompletedTodos ? 'On' : 'Off'}
        </button>
      </div>

    </div>
  );
}
