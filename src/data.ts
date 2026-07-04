import { Subject, Achievement } from './types';
import { COURSE_TEMPLATES, loadSemesterSubjects } from './courses';

export { COURSE_TEMPLATES } from './courses';

// Standard Emojis for Avatars
export const AVATARS = ['🔥', '🚀', '🦊', '🦉', '🐱', '🎓', '👾', '🐼', '🦁', '⭐', '🍀', '🌈'];

// Default Achievements
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'streak-3',
    title: 'Streak Starter',
    description: 'Maintain a 3-day study streak',
    icon: '🔥',
    unlockedAt: null,
  },
  {
    id: 'streak-7',
    title: 'Consistency King',
    description: 'Maintain a 7-day study streak',
    icon: '👑',
    unlockedAt: null,
  },
  {
    id: 'xp-100',
    title: 'XP Initiate',
    description: 'Reach 100 XP',
    icon: '⚡',
    unlockedAt: null,
  },
  {
    id: 'xp-500',
    title: 'Knowledge Warrior',
    description: 'Reach 500 XP',
    icon: '⚔️',
    unlockedAt: null,
  },
  {
    id: 'xp-1000',
    title: 'Study Overlord',
    description: 'Reach 1000 XP',
    icon: '🔮',
    unlockedAt: null,
  },
  {
    id: 'first-topic',
    title: 'First Step',
    description: 'Mark your very first topic completed',
    icon: '👟',
    unlockedAt: null,
  },
  {
    id: 'first-module',
    title: 'Module Master',
    description: 'Complete all topics inside a module',
    icon: '🏆',
    unlockedAt: null,
  },
  {
    id: 'backlog-slayer',
    title: 'Backlog Slayer',
    description: 'Complete all topics in a backlog subject',
    icon: '💀',
    unlockedAt: null,
  },
  {
    id: 'semester-conqueror',
    title: 'Semester Conqueror',
    description: 'Complete an entire semester',
    icon: '🎓',
    unlockedAt: null,
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete a topic after 10 PM',
    icon: '🦉',
    unlockedAt: null,
  },
];

// Return matching template or default to VTU CSE 2022 Scheme
export function getTemplateSubjects(univ: string, branch: string, scheme: string, semester: number): Subject[] {
  return loadSemesterSubjects(univ, branch, scheme, semester);
}

// Get all subjects in prior semesters of this course for backlog selection
export function getPriorSemesterSubjects(univ: string, branch: string, scheme: string, currentSemester: number): { semester: number, subjects: Subject[] }[] {
  const result: { semester: number, subjects: Subject[] }[] = [];
  const u = COURSE_TEMPLATES[univ] || COURSE_TEMPLATES['VTU'];
  const b = u[branch] || u['CSE'];
  const s = b[scheme] || b['2022 Scheme'];

  for (let sem = 1; sem < currentSemester; sem++) {
    if (s[sem]) {
      result.push({
        semester: sem,
        subjects: s[sem],
      });
    }
  }
  return result;
}

// Find a topic by ID in the current template or backlog templates
export function findTopicById(topicId: string, activeSubjects: Subject[], backlogSubjects: Subject[]): { topic: any, module: any, subject: Subject } | null {
  const allAvailable = [...activeSubjects, ...backlogSubjects];
  for (const sub of allAvailable) {
    for (const mod of sub.modules) {
      const top = mod.topics.find(t => t.id === topicId);
      if (top) {
        return { topic: top, module: mod, subject: sub };
      }
    }
  }
  return null;
}
