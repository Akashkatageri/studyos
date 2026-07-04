import { Subject } from '../types';

export const PHYSICS_CYCLE_S1_SUBJECTS: Subject[] = [
  {
    id: 'phys-s1-math-1',
    name: 'Engineering Mathematics I',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-math-1-m1',
        name: 'Module 1: Differential Calculus',
        topics: [
          { id: 'phys-s1-math-1-m1-t1', name: 'Polar Curves & Angle of Intersection', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-math-1-m1-t2', name: 'Pedal Equations of Polar Curves', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'phys-s1-math-1-m2',
        name: 'Module 2: Multivariable Calculus',
        topics: [
          { id: 'phys-s1-math-1-m2-t1', name: 'Partial Derivatives & Jacobians', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-math-1-m2-t2', name: 'Maxima and Minima of Two Variables', difficulty: 'Hard', estimatedTime: 45 }
        ]
      },
      {
        id: 'phys-s1-math-1-m3',
        name: 'Module 3: Linear Algebra',
        topics: [
          { id: 'phys-s1-math-1-m3-t1', name: 'Rank of Matrix & Gauss Elimination', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-math-1-m3-t2', name: 'Eigenvalues and Eigenvectors', difficulty: 'Hard', estimatedTime: 40 }
        ]
      }
    ]
  },
  {
    id: 'phys-s1-physics',
    name: 'Physics',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-physics-m1',
        name: 'Module 1: Quantum Mechanics',
        topics: [
          { id: 'phys-s1-physics-m1-t1', name: 'Wave-Particle Duality & de Broglie Waves', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-physics-m1-t2', name: 'Schrodinger Time-Independent Equation', difficulty: 'Hard', estimatedTime: 45 }
        ]
      },
      {
        id: 'phys-s1-physics-m2',
        name: 'Module 2: Lasers & Optical Fibers',
        topics: [
          { id: 'phys-s1-physics-m2-t1', name: 'Einstein Coefficients & Laser Action', difficulty: 'Medium', estimatedTime: 25 },
          { id: 'phys-s1-physics-m2-t2', name: 'Optical Fiber Attenuation & Sensors', difficulty: 'Easy', estimatedTime: 20 }
        ]
      },
      {
        id: 'phys-s1-physics-m3',
        name: 'Module 3: Semiconductor Physics',
        topics: [
          { id: 'phys-s1-physics-m3-t1', name: 'Fermi Level & Carrier Concentration', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-physics-m3-t2', name: 'Hall Effect & Photodiodes', difficulty: 'Medium', estimatedTime: 30 }
        ]
      }
    ]
  },
  {
    id: 'phys-s1-elec',
    name: 'Basic Electrical Engineering',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-elec-m1',
        name: 'Module 1: DC Circuits',
        topics: [
          { id: 'phys-s1-elec-m1-t1', name: 'Kirchhoff Laws & Nodal Analysis', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-elec-m1-t2', name: 'Network Theorems', difficulty: 'Hard', estimatedTime: 45 }
        ]
      },
      {
        id: 'phys-s1-elec-m2',
        name: 'Module 2: AC Circuits',
        topics: [
          { id: 'phys-s1-elec-m2-t1', name: 'Single Phase AC & Phasor Representation', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-elec-m2-t2', name: 'Three-Phase Balanced Star-Delta', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'phys-s1-elec-m3',
        name: 'Module 3: Domestic Wiring & Safety',
        topics: [
          { id: 'phys-s1-elec-m3-t1', name: 'Two-Way and Three-Way Control of Lamps', difficulty: 'Easy', estimatedTime: 20 },
          { id: 'phys-s1-elec-m3-t2', name: 'Earthing & Fuse Safety Principles', difficulty: 'Easy', estimatedTime: 25 }
        ]
      }
    ]
  },
  {
    id: 'phys-s1-eln',
    name: 'Basic Electronics',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-eln-m1',
        name: 'Module 1: Semiconductor Diodes',
        topics: [
          { id: 'phys-s1-eln-m1-t1', name: 'PN Junction Diode Characteristics', difficulty: 'Easy', estimatedTime: 20 },
          { id: 'phys-s1-eln-m1-t2', name: 'Rectifiers & Filter Circuits', difficulty: 'Medium', estimatedTime: 30 }
        ]
      },
      {
        id: 'phys-s1-eln-m2',
        name: 'Module 2: Transistors & Op-Amps',
        topics: [
          { id: 'phys-s1-eln-m2-t1', name: 'BJT Characteristics & Biasing', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-eln-m2-t2', name: 'Operational Amplifiers as Inverting Amplifiers', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'phys-s1-eln-m3',
        name: 'Module 3: Digital Logic & Oscillators',
        topics: [
          { id: 'phys-s1-eln-m3-t1', name: 'Boolean Algebra & Basic Logic Gates', difficulty: 'Easy', estimatedTime: 20 },
          { id: 'phys-s1-eln-m3-t2', name: 'Barkhausen Criterion & RC Phase Shift', difficulty: 'Hard', estimatedTime: 40 }
        ]
      }
    ]
  },
  {
    id: 'phys-s1-english',
    name: 'English',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-english-m1',
        name: 'Module 1: Vocabulary Building',
        topics: [
          { id: 'phys-s1-english-m1-t1', name: 'Synonyms, Antonyms, and Homophones', difficulty: 'Easy', estimatedTime: 15 },
          { id: 'phys-s1-english-m1-t2', name: 'Prefixes, Suffixes, and Word Formation', difficulty: 'Easy', estimatedTime: 15 }
        ]
      },
      {
        id: 'phys-s1-english-m2',
        name: 'Module 2: Grammar & Error Correction',
        topics: [
          { id: 'phys-s1-english-m2-t1', name: 'Subject-Verb Agreement Rules', difficulty: 'Medium', estimatedTime: 25 },
          { id: 'phys-s1-english-m2-t2', name: 'Tenses and Prepositions', difficulty: 'Medium', estimatedTime: 25 }
        ]
      },
      {
        id: 'phys-s1-english-m3',
        name: 'Module 3: Professional Writing',
        topics: [
          { id: 'phys-s1-english-m3-t1', name: 'E-mail and Technical Essay Layout', difficulty: 'Medium', estimatedTime: 30 }
        ]
      }
    ]
  },
  {
    id: 'phys-s1-lab',
    name: 'Physics Lab',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-lab-m1',
        name: 'Module 1: Elasticity & Pendulums',
        topics: [
          { id: 'phys-s1-lab-m1-t1', name: 'Torsional Pendulum Experiment', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-lab-m1-t2', name: 'Young Modulus Single Cantilever', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'phys-s1-lab-m2',
        name: 'Module 2: Optics & Electronics Labs',
        topics: [
          { id: 'phys-s1-lab-m2-t1', name: 'Laser Diffraction Experiment', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-lab-m2-t2', name: 'Photodiode Characterization', difficulty: 'Medium', estimatedTime: 30 }
        ]
      }
    ]
  },
  {
    id: 'phys-s1-workshop',
    name: 'Programming Workshop',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-workshop-m1',
        name: 'Module 1: Algorithms & Flowcharts',
        topics: [
          { id: 'phys-s1-workshop-m1-t1', name: 'Designing Flowcharts for Control Flow', difficulty: 'Easy', estimatedTime: 20 },
          { id: 'phys-s1-workshop-m1-t2', name: 'Writing Structured Pseudocode', difficulty: 'Easy', estimatedTime: 25 }
        ]
      },
      {
        id: 'phys-s1-workshop-m2',
        name: 'Module 2: Introduction to C',
        topics: [
          { id: 'phys-s1-workshop-m2-t1', name: 'Variables, Data Types, and Operators', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'phys-s1-workshop-m2-t2', name: 'If-Else Conditionals & Loops', difficulty: 'Medium', estimatedTime: 35 }
        ]
      }
    ]
  }
];

export const CHEMISTRY_CYCLE_S1_SUBJECTS: Subject[] = [
  {
    id: 'chem-s1-math-1',
    name: 'Engineering Mathematics I',
    semester: 1,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[0].modules
  },
  {
    id: 'chem-s1-chemistry',
    name: 'Chemistry',
    semester: 1,
    modules: [
      {
        id: 'chem-s1-chemistry-m1',
        name: 'Module 1: Electrochemistry & Battery',
        topics: [
          { id: 'chem-s1-chemistry-m1-t1', name: 'Nernst Equation & Standard Potentials', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-chemistry-m1-t2', name: 'Modern Battery Tech (Lithium-ion)', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-chemistry-m2',
        name: 'Module 2: Corrosion and Metal Finishing',
        topics: [
          { id: 'chem-s1-chemistry-m2-t1', name: 'Electrochemical Theory of Corrosion', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-chemistry-m2-t2', name: 'Anodizing & Electroplating Techniques', difficulty: 'Medium', estimatedTime: 30 }
        ]
      },
      {
        id: 'chem-s1-chemistry-m3',
        name: 'Module 3: Materials & Water Chemistry',
        topics: [
          { id: 'chem-s1-chemistry-m3-t1', name: 'Nanomaterials Synthesis & Application', difficulty: 'Hard', estimatedTime: 35 },
          { id: 'chem-s1-chemistry-m3-t2', name: 'Water Hardness & Softening Methods', difficulty: 'Medium', estimatedTime: 30 }
        ]
      }
    ]
  },
  {
    id: 'chem-s1-elec',
    name: 'Basic Electrical Engineering',
    semester: 1,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[2].modules
  },
  {
    id: 'chem-s1-eln',
    name: 'Basic Electronics',
    semester: 1,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[3].modules
  },
  {
    id: 'chem-s1-english',
    name: 'English',
    semester: 1,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[4].modules
  },
  {
    id: 'chem-s1-lab',
    name: 'Chemistry Lab',
    semester: 1,
    modules: [
      {
        id: 'chem-s1-lab-m1',
        name: 'Module 1: Volumetric Estimations',
        topics: [
          { id: 'chem-s1-lab-m1-t1', name: 'Determination of Total Hardness of Water', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-lab-m1-t2', name: 'Estimation of Copper in Brass Alloy', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-lab-m2',
        name: 'Module 2: Instrumental Analysis',
        topics: [
          { id: 'chem-s1-lab-m2-t1', name: 'Potentiometric Titrations', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-lab-m2-t2', name: 'Conductometric Titrations', difficulty: 'Medium', estimatedTime: 30 }
        ]
      }
    ]
  },
  {
    id: 'chem-s1-workshop',
    name: 'Programming Workshop',
    semester: 1,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[6].modules
  }
];

// Semester 2 (Chemistry Cycle subjects) for students who took Physics Cycle in Semester 1
export const CHEMISTRY_CYCLE_S2_SUBJECTS: Subject[] = [
  {
    id: 'chem-s2-math-2',
    name: 'Engineering Mathematics II',
    semester: 2,
    modules: [
      {
        id: 'chem-s2-math-2-m1',
        name: 'Module 1: Vector Integration',
        topics: [
          { id: 'chem-s2-math-2-m1-t1', name: 'Line, Surface and Volume Integrals', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s2-math-2-m1-t2', name: 'Green, Stokes & Gauss Theorems', difficulty: 'Hard', estimatedTime: 45 }
        ]
      },
      {
        id: 'chem-s2-math-2-m2',
        name: 'Module 2: Infinite Series & Fourier',
        topics: [
          { id: 'chem-s2-math-2-m2-t1', name: 'Convergence Tests (Ratio, Root tests)', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s2-math-2-m2-t2', name: 'Fourier Series and Harmonic Analysis', difficulty: 'Hard', estimatedTime: 45 }
        ]
      }
    ]
  },
  {
    id: 'chem-s2-chemistry',
    name: 'Chemistry',
    semester: 2,
    modules: CHEMISTRY_CYCLE_S1_SUBJECTS[1].modules
  },
  {
    id: 'chem-s2-caed',
    name: 'Computer-Aided Engineering Drawing',
    semester: 2,
    modules: [
      {
        id: 'chem-s2-caed-m1',
        name: 'Module 1: Projections of Points & Lines',
        topics: [
          { id: 'chem-s2-caed-m1-t1', name: 'Projections in Different Quadrants', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s2-caed-m1-t2', name: 'True Length and Inclination of Lines', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s2-caed-m2',
        name: 'Module 2: Projections of Planes & Solids',
        topics: [
          { id: 'chem-s2-caed-m2-t1', name: 'Projections of Prisms & Pyramids', difficulty: 'Hard', estimatedTime: 45 },
          { id: 'chem-s2-caed-m2-t2', name: 'Isometric Projections of Combination Solids', difficulty: 'Hard', estimatedTime: 40 }
        ]
      }
    ]
  },
  {
    id: 'chem-s2-mech',
    name: 'Basic Mechanical Engineering',
    semester: 2,
    modules: [
      {
        id: 'chem-s2-mech-m1',
        name: 'Module 1: Steam & IC Engines',
        topics: [
          { id: 'chem-s2-mech-m1-t1', name: 'Properties of Steam & Steam Generators', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s2-mech-m1-t2', name: 'Two-Stroke and Four-Stroke IC Engines', difficulty: 'Medium', estimatedTime: 30 }
        ]
      },
      {
        id: 'chem-s2-mech-m2',
        name: 'Module 2: Machining Operations',
        topics: [
          { id: 'chem-s2-mech-m2-t1', name: 'Lathe, Drilling & Milling Machines', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'chem-s2-mech-m2-t2', name: 'Advanced Joining (Welding & Brazing)', difficulty: 'Easy', estimatedTime: 25 }
        ]
      }
    ]
  },
  {
    id: 'chem-s2-english',
    name: 'Technical English',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[4].modules
  },
  {
    id: 'chem-s2-lab',
    name: 'Chemistry Lab',
    semester: 2,
    modules: CHEMISTRY_CYCLE_S1_SUBJECTS[5].modules
  },
  {
    id: 'chem-s2-c-lab',
    name: 'Programming Workshop',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[6].modules
  }
];

// Semester 2 (Physics Cycle subjects) for students who took Chemistry Cycle in Semester 1
export const PHYSICS_CYCLE_S2_SUBJECTS: Subject[] = [
  {
    id: 'phys-s2-math-2',
    name: 'Engineering Mathematics II',
    semester: 2,
    modules: CHEMISTRY_CYCLE_S2_SUBJECTS[0].modules
  },
  {
    id: 'phys-s2-physics',
    name: 'Physics',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[1].modules
  },
  {
    id: 'phys-s2-elec',
    name: 'Basic Electrical Engineering',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[2].modules
  },
  {
    id: 'phys-s2-eln',
    name: 'Basic Electronics',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[3].modules
  },
  {
    id: 'phys-s2-english',
    name: 'Communicative English',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[4].modules
  },
  {
    id: 'phys-s2-lab',
    name: 'Physics Lab',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[5].modules
  },
  {
    id: 'phys-s2-workshop',
    name: 'Programming Workshop',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[6].modules
  }
];

export function getSubjectsForCycle(
  cycle: 'Physics' | 'Chemistry',
  semester: number
): Subject[] {
  if (semester === 1) {
    return cycle === 'Physics' ? PHYSICS_CYCLE_S1_SUBJECTS : CHEMISTRY_CYCLE_S1_SUBJECTS;
  } else if (semester === 2) {
    // Note: If they selected Physics Cycle in S1, S2 is Chemistry Cycle
    // If they selected Chemistry Cycle in S1, S2 is Physics Cycle
    return cycle === 'Physics' ? CHEMISTRY_CYCLE_S2_SUBJECTS : PHYSICS_CYCLE_S2_SUBJECTS;
  }
  return [];
}
