import { Subject } from '../types';

import vtu_2022_cse_s3 from './vtu/2022/cse/semester3.json';

import vtu_2022_ise_s3 from './vtu/2022/ise/semester3.json';

import vtu_2022_aiml_s3 from './vtu/2022/aiml/semester3.json';

import vtu_2022_ece_s3 from './vtu/2022/ece/semester3.json';

import vtu_2025_ise_s1 from './vtu/2025/ise/semester1.json';
import vtu_2025_ise_s2 from './vtu/2025/ise/semester2.json';
import vtu_2025_ise_s3 from './vtu/2025/ise/semester3.json';
import vtu_2025_ise_s4 from './vtu/2025/ise/semester4.json';
import vtu_2025_ise_s5 from './vtu/2025/ise/semester5.json';
import vtu_2025_ise_s6 from './vtu/2025/ise/semester6.json';
import vtu_2025_ise_s7 from './vtu/2025/ise/semester7.json';
import vtu_2025_ise_s8 from './vtu/2025/ise/semester8.json';

import vtu_2025_cse_s3 from './vtu/2025/cse/semester3.json';
import vtu_2025_cse_s4 from './vtu/2025/cse/semester4.json';
import vtu_2025_cse_s5 from './vtu/2025/cse/semester5.json';
import vtu_2025_cse_s6 from './vtu/2025/cse/semester6.json';
import vtu_2025_cse_s7 from './vtu/2025/cse/semester7.json';
import vtu_2025_cse_s8 from './vtu/2025/cse/semester8.json';

import vtu_2025_aiml_s3 from './vtu/2025/aiml/semester3.json';
import vtu_2025_aiml_s4 from './vtu/2025/aiml/semester4.json';
import vtu_2025_aiml_s5 from './vtu/2025/aiml/semester5.json';
import vtu_2025_aiml_s6 from './vtu/2025/aiml/semester6.json';
import vtu_2025_aiml_s7 from './vtu/2025/aiml/semester7.json';
import vtu_2025_aiml_s8 from './vtu/2025/aiml/semester8.json';

import vtu_2025_eee_s3 from './vtu/2025/eee/semester3.json';
import vtu_2025_eee_s4 from './vtu/2025/eee/semester4.json';
import vtu_2025_eee_s5 from './vtu/2025/eee/semester5.json';
import vtu_2025_eee_s6 from './vtu/2025/eee/semester6.json';
import vtu_2025_eee_s7 from './vtu/2025/eee/semester7.json';
import vtu_2025_eee_s8 from './vtu/2025/eee/semester8.json';

import vtu_2025_ece_s3 from './vtu/2025/ece/semester3.json';
import vtu_2025_ece_s4 from './vtu/2025/ece/semester4.json';
import vtu_2025_ece_s5 from './vtu/2025/ece/semester5.json';
import vtu_2025_ece_s6 from './vtu/2025/ece/semester6.json';
import vtu_2025_ece_s7 from './vtu/2025/ece/semester7.json';
import vtu_2025_ece_s8 from './vtu/2025/ece/semester8.json';

import vtu_2025_iot_s3 from './vtu/2025/iot/semester3.json';
import vtu_2025_iot_s4 from './vtu/2025/iot/semester4.json';
import vtu_2025_iot_s5 from './vtu/2025/iot/semester5.json';
import vtu_2025_iot_s6 from './vtu/2025/iot/semester6.json';
import vtu_2025_iot_s7 from './vtu/2025/iot/semester7.json';
import vtu_2025_iot_s8 from './vtu/2025/iot/semester8.json';

import vtu_2025_mechanical_s3 from './vtu/2025/mechanical/semester3.json';
import vtu_2025_mechanical_s4 from './vtu/2025/mechanical/semester4.json';
import vtu_2025_mechanical_s5 from './vtu/2025/mechanical/semester5.json';
import vtu_2025_mechanical_s6 from './vtu/2025/mechanical/semester6.json';
import vtu_2025_mechanical_s7 from './vtu/2025/mechanical/semester7.json';
import vtu_2025_mechanical_s8 from './vtu/2025/mechanical/semester8.json';

function normalizeSemesterData(raw: any, fallbackSemester: number): Subject[] {
  if (!raw) return [];

  let subjectsRaw: any[] = [];
  let rootSemester = fallbackSemester;

  if (Array.isArray(raw)) {
    subjectsRaw = raw;
  } else if (raw && typeof raw === 'object') {
    if (typeof raw.semester === 'number') {
      rootSemester = raw.semester;
    }
    if (Array.isArray(raw.subjects)) {
      subjectsRaw = raw.subjects;
    } else if (Array.isArray(raw.courses)) {
      subjectsRaw = raw.courses;
    }
  }

  return subjectsRaw.map((sub: any) => {
    return {
      id: sub.id || sub.code || '',
      name: sub.name || sub.title || '',
      semester: typeof sub.semester === 'number' ? sub.semester : rootSemester,
      modules: Array.isArray(sub.modules) ? sub.modules.map((mod: any) => {
        return {
          id: mod.id || '',
          name: mod.name || mod.title || '',
          topics: Array.isArray(mod.topics) ? mod.topics.map((top: any) => {
            return {
              id: top.id || '',
              name: top.name || top.title || '',
              difficulty: (top.difficulty === 'Easy' || top.difficulty === 'Medium' || top.difficulty === 'Hard') ? top.difficulty : 'Medium',
              estimatedTime: typeof top.estimatedTime === 'number' ? top.estimatedTime : (typeof top.estimatedMinutes === 'number' ? top.estimatedMinutes : 30),
            };
          }) : []
        };
      }) : []
    };
  });
}

export const COMMON_S1 = normalizeSemesterData(vtu_2025_ise_s1, 1);
export const COMMON_S2 = normalizeSemesterData(vtu_2025_ise_s2, 2);

export const COURSE_TEMPLATES: {
  [univ: string]: {
    [branch: string]: {
      [scheme: string]: {
        [semester: number]: Subject[];
      };
    };
  };
} = {
  VTU: {
    CSE: {
      '2022 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2022_cse_s3, 3),
      },
      '2025 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2025_cse_s3, 3),
        4: normalizeSemesterData(vtu_2025_cse_s4, 4),
        5: normalizeSemesterData(vtu_2025_cse_s5, 5),
        6: normalizeSemesterData(vtu_2025_cse_s6, 6),
        7: normalizeSemesterData(vtu_2025_cse_s7, 7),
        8: normalizeSemesterData(vtu_2025_cse_s8, 8),
      },
    },
    ISE: {
      '2022 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2022_ise_s3, 3),
      },
      '2025 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2025_ise_s3, 3),
        4: normalizeSemesterData(vtu_2025_ise_s4, 4),
        5: normalizeSemesterData(vtu_2025_ise_s5, 5),
        6: normalizeSemesterData(vtu_2025_ise_s6, 6),
        7: normalizeSemesterData(vtu_2025_ise_s7, 7),
        8: normalizeSemesterData(vtu_2025_ise_s8, 8),
      },
    },
    AIML: {
      '2022 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2022_aiml_s3, 3),
      },
      '2025 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2025_aiml_s3, 3),
        4: normalizeSemesterData(vtu_2025_aiml_s4, 4),
        5: normalizeSemesterData(vtu_2025_aiml_s5, 5),
        6: normalizeSemesterData(vtu_2025_aiml_s6, 6),
        7: normalizeSemesterData(vtu_2025_aiml_s7, 7),
        8: normalizeSemesterData(vtu_2025_aiml_s8, 8),
      },
    },
    EEE: {
      '2022 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2025_eee_s3, 3),
      },
      '2025 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2025_eee_s3, 3),
        4: normalizeSemesterData(vtu_2025_eee_s4, 4),
        5: normalizeSemesterData(vtu_2025_eee_s5, 5),
        6: normalizeSemesterData(vtu_2025_eee_s6, 6),
        7: normalizeSemesterData(vtu_2025_eee_s7, 7),
        8: normalizeSemesterData(vtu_2025_eee_s8, 8),
      },
    },
    ECE: {
      '2022 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2022_ece_s3, 3),
      },
      '2025 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2025_ece_s3, 3),
        4: normalizeSemesterData(vtu_2025_ece_s4, 4),
        5: normalizeSemesterData(vtu_2025_ece_s5, 5),
        6: normalizeSemesterData(vtu_2025_ece_s6, 6),
        7: normalizeSemesterData(vtu_2025_ece_s7, 7),
        8: normalizeSemesterData(vtu_2025_ece_s8, 8),
      },
    },
    IOT: {
      '2022 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2022_cse_s3, 3),
      },
      '2025 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2025_iot_s3, 3),
        4: normalizeSemesterData(vtu_2025_iot_s4, 4),
        5: normalizeSemesterData(vtu_2025_iot_s5, 5),
        6: normalizeSemesterData(vtu_2025_iot_s6, 6),
        7: normalizeSemesterData(vtu_2025_iot_s7, 7),
        8: normalizeSemesterData(vtu_2025_iot_s8, 8),
      },
    },
    Mechanical: {
      '2022 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2022_cse_s3, 3),
      },
      '2025 Scheme': {
        1: COMMON_S1,
        2: COMMON_S2,
        3: normalizeSemesterData(vtu_2025_mechanical_s3, 3),
        4: normalizeSemesterData(vtu_2025_mechanical_s4, 4),
        5: normalizeSemesterData(vtu_2025_mechanical_s5, 5),
        6: normalizeSemesterData(vtu_2025_mechanical_s6, 6),
        7: normalizeSemesterData(vtu_2025_mechanical_s7, 7),
        8: normalizeSemesterData(vtu_2025_mechanical_s8, 8),
      },
    },
  },
};

export function loadSemesterSubjects(
  univ: string,
  branch: string,
  scheme: string,
  semester: number
): Subject[] {
  if (semester === 1) {
    return COMMON_S1;
  }
  if (semester === 2) {
    return COMMON_S2;
  }
  const u = COURSE_TEMPLATES[univ] || COURSE_TEMPLATES['VTU'];
  const b = u[branch] || u['CSE'];
  const s = b[scheme] || b['2022 Scheme'];
  return s[semester] || [];
}
