import { Subject, Achievement, UserState } from './types';
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
  const u = COURSE_TEMPLATES[univ] || COURSE_TEMPLATES['VTU'] || {};
  const b = u[branch] || u['CSE'] || (Object.keys(u).length > 0 ? u[Object.keys(u)[0]] : {});
  const s = b[scheme] || b['2022 Scheme'] || (Object.keys(b).length > 0 ? b[Object.keys(b)[0]] : {});

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

// Calculate user active and backlog subjects based on UserState
export function getUserSubjects(state?: Partial<UserState> | null): { activeSubjects: Subject[]; backlogSubjects: Subject[] } {
  if (!state) return { activeSubjects: [], backlogSubjects: [] };
  const { university = 'VTU', branch = 'CSE', scheme = '2022 Scheme', semester = 1, backlogSubjects = [] } = state;

  const activeSubjects = getTemplateSubjects(university || 'VTU', branch || 'CSE', scheme || '2022 Scheme', semester || 1);

  const backlogSubjectsList: Subject[] = [];
  const uData = COURSE_TEMPLATES[university || 'VTU'] || COURSE_TEMPLATES['VTU'];
  const bData = uData?.[branch || 'CSE'] || (uData ? uData[Object.keys(uData)[0]] : undefined);
  const sData = bData?.[scheme || '2022 Scheme'] || (bData ? bData[Object.keys(bData)[0]] : undefined);

  for (let semNum = 1; semNum < (semester || 1); semNum++) {
    let priorSubjects: Subject[] = [];
    if (semNum === 1 || semNum === 2) {
      priorSubjects = getTemplateSubjects(university || 'VTU', branch || 'CSE', scheme || '2022 Scheme', semNum);
    } else if (sData && sData[semNum]) {
      priorSubjects = sData[semNum];
    }

    priorSubjects.forEach((sub) => {
      if (backlogSubjects && Array.isArray(backlogSubjects) && backlogSubjects.includes(sub.id)) {
        backlogSubjectsList.push(sub);
      }
    });
  }

  return { activeSubjects, backlogSubjects: backlogSubjectsList };
}

// Get all subjects within the user's active review scope (Current Semester + Backlogs + Included Archived Semesters)
export function getReviewSubjectsForState(state?: Partial<UserState> | null): Subject[] {
  if (!state) return [];
  const { activeSubjects, backlogSubjects } = getUserSubjects(state);

  const { university = 'VTU', branch = 'CSE', scheme = '2022 Scheme', semester = 1, includedReviewSemesters = [] } = state;

  const subjectsMap = new Map<string, Subject>();
  activeSubjects.forEach((s) => subjectsMap.set(s.id, s));
  backlogSubjects.forEach((s) => subjectsMap.set(s.id, s));

  // If user selected any archived/previous semesters to include in review (for GATE/Placements revision)
  if (Array.isArray(includedReviewSemesters) && includedReviewSemesters.length > 0) {
    const uData = COURSE_TEMPLATES[university || 'VTU'] || COURSE_TEMPLATES['VTU'];
    const bData = uData?.[branch || 'CSE'] || (uData ? uData[Object.keys(uData)[0]] : undefined);
    const sData = bData?.[scheme || '2022 Scheme'] || (bData ? bData[Object.keys(bData)[0]] : undefined);

    includedReviewSemesters.forEach((semNum) => {
      if (semNum !== semester) {
        let semSubjects: Subject[] = [];
        if (semNum === 1 || semNum === 2) {
          semSubjects = getTemplateSubjects(university || 'VTU', branch || 'CSE', scheme || '2022 Scheme', semNum);
        } else if (sData && sData[semNum]) {
          semSubjects = sData[semNum];
        }
        semSubjects.forEach((sub) => {
          if (!subjectsMap.has(sub.id)) {
            subjectsMap.set(sub.id, sub);
          }
        });
      }
    });
  }

  return Array.from(subjectsMap.values());
}


