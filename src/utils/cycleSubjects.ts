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
    name: '1BPHYS102: Quantum Physics and Applications',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-physics-m1',
        name: 'Module 1: Quantum Mechanics',
        topics: [
          { id: 'phys-s1-physics-m1-t1', name: "de Broglie Hypothesis & Heisenberg's Uncertainty Principle", difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-physics-m1-t2', name: 'Wave Function & Time-Independent Schrödinger Equation', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-physics-m1-t3', name: 'Born Interpretation, Eigen Values & 1D Potential Well', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-physics-m1-t4', name: 'Finite Potential Well, Quantum Tunneling & Numerical Problems', difficulty: 'Hard', estimatedTime: 35 }
        ]
      },
      {
        id: 'phys-s1-physics-m2',
        name: 'Module 2: Electrical Properties of Metals and Semiconductors',
        topics: [
          { id: 'phys-s1-physics-m2-t1', name: 'Quantum Free Electron Theory & Density of States', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-physics-m2-t2', name: 'Fermi Dirac Statistics & Fermi Factor', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-physics-m2-t3', name: 'Electron Concentration in Intrinsic/Extrinsic Semiconductors & Hall Effect', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'phys-s1-physics-m3',
        name: 'Module 3: Superconductivity',
        topics: [
          { id: 'phys-s1-physics-m3-t1', name: 'Meissner Effect, Silsbee Effect & BCS Theory', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-physics-m3-t2', name: 'Type-I & Type-II Superconductors, Josephson Junction & SQUID', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'phys-s1-physics-m4',
        name: 'Module 4: Photonics',
        topics: [
          { id: 'phys-s1-physics-m4-t1', name: "Einstein's A & B Coefficients & Semiconductor Diode LASER", difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-physics-m4-t2', name: 'Optical Fiber NA Derivation, Modes, SPAD & Mach-Zehnder Interferometer', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'phys-s1-physics-m5',
        name: 'Module 5: Quantum Computing',
        topics: [
          { id: 'phys-s1-physics-m5-t1', name: 'Bits, Qubits, Bloch Sphere, Superconducting Qubits & Matrices', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-physics-m5-t2', name: 'Single Qubit Gates (Pauli, Hadamard) & Two-Qubit Gates (CNOT, Bell States)', difficulty: 'Hard', estimatedTime: 40 }
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
    id: 'phys-s1-c-prog',
    name: 'Programming in C',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-c-prog-m1',
        name: 'Introduction to Computing, Overview of C, and Expressions',
        topics: [
          { id: 'phys-s1-c-prog-m1-t1', name: 'Computer Languages, Creating & Running Programs, System Development', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'phys-s1-c-prog-m1-t2', name: 'Overview of C: History, Features, Structured Programming, Compilers vs. Interpreters', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'phys-s1-c-prog-m1-t3', name: 'Form of a C Program, Library, Linking, Compiling, C Memory Map', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m1-t4', name: 'Basic Data Types, Modifiers, Identifiers, Variables', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'phys-s1-c-prog-m1-t5', name: 'The Four C Scopes, Type Qualifiers, Storage Class Specifiers', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m1-t6', name: 'Variable Initializations and Constants', difficulty: 'Easy', estimatedTime: 20 },
          { id: 'phys-s1-c-prog-m1-t7', name: 'Operators and Expressions', difficulty: 'Medium', estimatedTime: 30 }
        ]
      },
      {
        id: 'phys-s1-c-prog-m2',
        name: 'Console I/O and Statements',
        topics: [
          { id: 'phys-s1-c-prog-m2-t1', name: 'Console I/O: Reading and Writing Characters & Strings', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'phys-s1-c-prog-m2-t2', name: 'Formatted Console I/O: printf() and scanf()', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m2-t3', name: 'True and False in C', difficulty: 'Easy', estimatedTime: 15 },
          { id: 'phys-s1-c-prog-m2-t4', name: 'Selection Statements (if, switch)', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m2-t5', name: 'Iteration Statements (for, while, do-while)', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m2-t6', name: 'Jump Statements (break, continue, goto, return)', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'phys-s1-c-prog-m2-t7', name: 'Expression Statements and Block Statements', difficulty: 'Easy', estimatedTime: 20 }
        ]
      },
      {
        id: 'phys-s1-c-prog-m3',
        name: 'Arrays, Strings, and Pointers',
        topics: [
          { id: 'phys-s1-c-prog-m3-t1', name: 'Single-Dimension Arrays & Array Initialization', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'phys-s1-c-prog-m3-t2', name: 'Generating Pointers to Arrays & Array Function Arguments', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m3-t3', name: 'Strings and String Manipulation Concepts', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-c-prog-m3-t4', name: 'Two-Dimensional & Multidimensional Arrays, VLAs', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-c-prog-m3-t5', name: 'Introduction to Pointers: Pointer Variables & Operators', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m3-t6', name: 'Pointer Expressions, Pointers and Arrays', difficulty: 'Hard', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m3-t7', name: 'Multiple Indirection & Initializing Pointers', difficulty: 'Hard', estimatedTime: 35 }
        ]
      },
      {
        id: 'phys-s1-c-prog-m4',
        name: 'Functions and Advanced Pointers',
        topics: [
          { id: 'phys-s1-c-prog-m4-t1', name: 'General Form, Scope, and Function Arguments', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'phys-s1-c-prog-m4-t2', name: 'argc and argv - Arguments to main() & Return values', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m4-t3', name: 'return Statement and Function Prototypes', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'phys-s1-c-prog-m4-t4', name: 'Recursion', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-c-prog-m4-t5', name: 'Variable Length Parameter Declarations & inline Keyword', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m4-t6', name: 'Pointers to Functions', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-c-prog-m4-t7', name: 'C Dynamic Allocation (malloc, calloc, realloc, free)', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'phys-s1-c-prog-m5',
        name: 'Structures, Unions, Enumerations, and typedef',
        topics: [
          { id: 'phys-s1-c-prog-m5-t1', name: 'Structures: Basics & Arrays of Structures', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m5-t2', name: 'Passing Structures to Functions & Structure Pointers', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m5-t3', name: 'Arrays and Structures within Structures', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-c-prog-m5-t4', name: 'Unions and Bit-Fields', difficulty: 'Hard', estimatedTime: 35 },
          { id: 'phys-s1-c-prog-m5-t5', name: 'Enumerations', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'phys-s1-c-prog-m5-t6', name: 'Using sizeof to Ensure Portability & typedef Keyword', difficulty: 'Medium', estimatedTime: 30 }
        ]
      }
    ]
  },
  {
    id: 'phys-s1-c-lab',
    name: '1BPOPL107: C Programming Lab',
    semester: 1,
    modules: [
      {
        id: 'phys-s1-c-lab-m1',
        name: 'PART-A: Conventional Experiments',
        topics: [
          { id: 'phys-s1-c-lab-m1-t1', name: 'Straight-Line Distance Calculation Between Two Coordinates on a 2D Plane', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'phys-s1-c-lab-m1-t2', name: 'Student Marks Evaluation and Grade Assignment Using Efficient Control Structures', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'phys-s1-c-lab-m1-t3', name: 'Stored KYC Records Matching and Unique Identification Verification', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-c-lab-m1-t4', name: 'Quadratic Equation Roots Calculation and Nature Classification', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-c-lab-m1-t5', name: 'Approximation of sin(x) Using Series Expansion Method for Robotic Arm Rotation', difficulty: 'Hard', estimatedTime: 35 },
          { id: 'phys-s1-c-lab-m1-t6', name: 'Course Description Keyword Search Using String Functions', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'phys-s1-c-lab-m1-t7', name: 'Three-Subject Marks Pass/Fail Verification and Average Calculation Function', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'phys-s1-c-lab-m1-t8', name: 'Swapping Account Balances in an ATM System Using Pointer Functions', difficulty: 'Medium', estimatedTime: 30 }
        ]
      },
      {
        id: 'phys-s1-c-lab-m2',
        name: 'PART-B: Typical Open-Ended Experiments',
        topics: [
          { id: 'phys-s1-c-lab-m2-t1', name: 'Digital Bookshelf Searching System Using Unique Book IDs in Sorted Arrays', difficulty: 'Medium', estimatedTime: 40 },
          { id: 'phys-s1-c-lab-m2-t2', name: '100-Meter Race Scores Sorting in Descending Order for Result Sheet Generation', difficulty: 'Medium', estimatedTime: 40 },
          { id: 'phys-s1-c-lab-m2-t3', name: 'Warehouse Product Units and Unit Revenue Matrix Dataset Combination for Branch Total Revenue', difficulty: 'Hard', estimatedTime: 45 },
          { id: 'phys-s1-c-lab-m2-t4', name: 'Mobile Contact Manager Name Concatenation and Length Validation Without Built-in String Functions', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'phys-s1-c-lab-m2-t5', name: 'Currency Exchange Simulation and Actual Update Implementation Using Call by Value and Call by Reference', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'phys-s1-c-lab-m2-t6', name: 'Library Book Catalog System Using Custom Structures (Title, Author, Year)', difficulty: 'Medium', estimatedTime: 40 }
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
    name: '1BCHEC102: Applied Chemistry',
    semester: 1,
    modules: [
      {
        id: 'chem-s1-chemistry-m1',
        name: 'Module 1: Functional Materials for Memory and Display Systems',
        topics: [
          { id: 'chem-s1-chemistry-m1-t1', name: 'Organic Semiconductors: Pentacene & Perfluoropentacene', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'chem-s1-chemistry-m1-t2', name: 'Resistive RAM (ReRAM) & TiO2 Nanomaterial Synthesis', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-chemistry-m1-t3', name: 'Liquid Crystals, LEDs, OLEDs, AMOLEDs & QLEDs', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-chemistry-m2',
        name: 'Module 2: Quantum Materials and Polymers',
        topics: [
          { id: 'chem-s1-chemistry-m2-t1', name: 'Quantum Confinement Effect & Cd-Se Quantum Dots', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-chemistry-m2-t2', name: 'Quantum Dot Sensitized Solar Cells (QDSSCs)', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'chem-s1-chemistry-m2-t3', name: 'Polymer Molecular Weight & Conducting Polymers (Polyaniline)', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-chemistry-m3',
        name: 'Module 3: Sustainable Energy Systems',
        topics: [
          { id: 'chem-s1-chemistry-m3-t1', name: 'Li-Ion & Sodium-Ion Batteries for EV Applications', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-chemistry-m3-t2', name: 'Asymmetric Supercapacitors & Solid-Oxide Fuel Cells', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'chem-s1-chemistry-m3-t3', name: 'Solar PV Cells & Photocatalytic Green Hydrogen Production', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-chemistry-m4',
        name: 'Module 4: Sensors and Corrosion Science',
        topics: [
          { id: 'chem-s1-chemistry-m4-t1', name: 'Conductometric, Colorimetric, Gas & Biosensors', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-chemistry-m4-t2', name: 'Electrochemical Theory of Corrosion & Protection Techniques', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-chemistry-m5',
        name: 'Module 5: Green Materials and E-Waste Management',
        topics: [
          { id: 'chem-s1-chemistry-m5-t1', name: 'Green Solvents, Biomaterials (PLA, PEG) & Hydrogels', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-chemistry-m5-t2', name: 'AI in E-Waste Management & Gold Extraction by Bioleaching', difficulty: 'Easy', estimatedTime: 30 }
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
    id: 'chem-s1-ece',
    name: '1BECE105: Fundamentals of Electronics and Communication Engineering',
    semester: 1,
    modules: [
      {
        id: 'chem-s1-ece-m1',
        name: 'Module 1: Diodes and Their Applications',
        topics: [
          { id: 'chem-s1-ece-m1-t1', name: 'Diodes Introduction, Characteristics and Parameters', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'chem-s1-ece-m1-t2', name: 'Diode Approximation and DC Load Line Analysis', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-ece-m1-t3', name: 'Half Wave and Full Wave Bridge Rectifiers', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-ece-m1-t4', name: 'Zener Diode, Voltage Regulation & Diode Logic Circuits', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-ece-m2',
        name: 'Module 2: Bipolar Junction Transistors and Field Effect Transistors',
        topics: [
          { id: 'chem-s1-ece-m2-t1', name: 'BJT Introduction, Voltages, Currents, Amplification & Switching', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-ece-m2-t2', name: 'Common Base & Common Emitter Characteristics and Biasing', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'chem-s1-ece-m2-t3', name: 'JFET (N-Channel) Characteristics, MOSFETs & Case Studies', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-ece-m3',
        name: 'Module 3: Operational Amplifiers and Applications',
        topics: [
          { id: 'chem-s1-ece-m3-t1', name: 'Op-Amp Introduction, Parameters & Equivalent Circuit', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-ece-m3-t2', name: 'Inverting, Non-Inverting & Differential Amplifiers', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-ece-m3-t3', name: 'Integrator, Differentiator & Voltage Follower Circuits', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-ece-m4',
        name: 'Module 4: Fundamentals of Communication Systems',
        topics: [
          { id: 'chem-s1-ece-m4-t1', name: 'Elements of Communication & Wireline/Optical/Wireless Channels', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'chem-s1-ece-m4-t2', name: 'Analog Modulation (AM, FM, PM), Superheterodyne FM Receiver', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-ece-m4-t3', name: 'Mobile Wireless Systems & Analog to Digital Conversion (PCM)', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-ece-m5',
        name: 'Module 5: Digital Systems, Binary Numbers, and Boolean Algebra',
        topics: [
          { id: 'chem-s1-ece-m5-t1', name: 'Number Systems, Base Conversion, 1s & 2s Complement Arithmetic', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-ece-m5-t2', name: 'Boolean Logic, Universal Logic Gates & Standard Forms', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-ece-m5-t3', name: 'Half/Full Adders & 4-Bit Adder Simulation Case Study', difficulty: 'Medium', estimatedTime: 35 }
        ]
      }
    ]
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
    id: 'chem-s1-caed',
    name: 'Computer-Aided Engineering Drawing',
    semester: 1,
    modules: [
      {
        id: 'chem-s1-caed-m1',
        name: 'Module 1: Projections of Points & Lines',
        topics: [
          { id: 'chem-s1-caed-m1-t1', name: 'Projections in Different Quadrants', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-caed-m1-t2', name: 'True Length and Inclination of Lines', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-caed-m2',
        name: 'Module 2: Projections of Planes & Solids',
        topics: [
          { id: 'chem-s1-caed-m2-t1', name: 'Projections of Prisms & Pyramids', difficulty: 'Hard', estimatedTime: 45 },
          { id: 'chem-s1-caed-m2-t2', name: 'Isometric Projections of Combination Solids', difficulty: 'Hard', estimatedTime: 40 }
        ]
      }
    ]
  },
  {
    id: 'chem-s1-ai-app',
    name: 'Introduction to AI and Applications',
    semester: 1,
    modules: [
      {
        id: 'chem-s1-ai-app-m1',
        name: 'Introduction to Artificial Intelligence, Machine Intelligence and Knowledge Representation',
        topics: [
          { id: 'chem-s1-ai-app-m1-t1', name: 'Overview of AI & Machine Intelligence', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'chem-s1-ai-app-m1-t2', name: 'Knowledge Representation Techniques', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-ai-app-m2',
        name: 'Introduction to Prompt Engineering and Techniques',
        topics: [
          { id: 'chem-s1-ai-app-m2-t1', name: 'Fundamentals of Prompting & LLMs', difficulty: 'Easy', estimatedTime: 25 },
          { id: 'chem-s1-ai-app-m2-t2', name: 'Advanced Prompting Frameworks & Few-Shot', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-ai-app-m3',
        name: 'Machine Learning Techniques in AI',
        topics: [
          { id: 'chem-s1-ai-app-m3-t1', name: 'Supervised vs Unsupervised Learning Concepts', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-ai-app-m3-t2', name: 'Neural Networks & Deep Learning Intro', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-ai-app-m4',
        name: 'Trends in AI',
        topics: [
          { id: 'chem-s1-ai-app-m4-t1', name: 'Generative AI & Multimodal Models', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-ai-app-m4-t2', name: 'AI Ethics, Bias & Governance', difficulty: 'Easy', estimatedTime: 25 }
        ]
      },
      {
        id: 'chem-s1-ai-app-m5',
        name: 'Robotics and Industrial Applications of AI',
        topics: [
          { id: 'chem-s1-ai-app-m5-t1', name: 'Robotic Perception and Kinematics', difficulty: 'Hard', estimatedTime: 35 },
          { id: 'chem-s1-ai-app-m5-t2', name: 'Industrial Automation & Smart Systems', difficulty: 'Medium', estimatedTime: 30 }
        ]
      }
    ]
  },
  {
    id: 'chem-s1-python',
    name: '1BPLC105B: Python Programming',
    semester: 1,
    modules: [
      {
        id: 'chem-s1-python-m1',
        name: 'Module 1: The Way of the Program, Variables, Expressions, Statements, Iteration & Functions',
        topics: [
          { id: 'chem-s1-python-m1-t1', name: 'Python Language, Debugging & Syntax/Runtime/Semantic Errors', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'chem-s1-python-m1-t2', name: 'Values, Data Types, Variables, Keywords & Statements', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'chem-s1-python-m1-t3', name: 'Operators, Type Converters, Order of Operations & String Ops', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-python-m1-t4', name: 'Iteration (for, while, Collatz), Nested Loops & Functions', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-python-m2',
        name: 'Module 2: Strings, Tuples, and Lists',
        topics: [
          { id: 'chem-s1-python-m2-t1', name: 'Strings: Traversal, Slices, Immutability & String Methods', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-python-m2-t2', name: 'Tuples: Data Grouping, Tuple Assignment & Composability', difficulty: 'Easy', estimatedTime: 30 },
          { id: 'chem-s1-python-m2-t3', name: 'Lists: Operations, Slices, Aliasing, Cloning & List Methods', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-python-m3',
        name: 'Module 3: Dictionaries, NumPy, and File Operations',
        topics: [
          { id: 'chem-s1-python-m3-t1', name: 'Dictionaries: Operations, Methods, Aliasing & Copying', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-python-m3-t2', name: 'NumPy Basics & Advanced: Shape, Slicing, Masking & Broadcasting', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'chem-s1-python-m3-t3', name: 'Files, Binary Operations, Directories & Web Fetching', difficulty: 'Medium', estimatedTime: 35 }
        ]
      },
      {
        id: 'chem-s1-python-m4',
        name: 'Module 4: Modules, Mutability, and Object-Oriented Programming Basics',
        topics: [
          { id: 'chem-s1-python-m4-t1', name: 'Standard Modules (random, time, math) & Custom Modules', difficulty: 'Medium', estimatedTime: 35 },
          { id: 'chem-s1-python-m4-t2', name: 'Mutable vs Immutable Types & Aliasing', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-python-m4-t3', name: 'OOP Basics: Classes, Objects, Attributes, Methods & Parameters', difficulty: 'Hard', estimatedTime: 40 }
        ]
      },
      {
        id: 'chem-s1-python-m5',
        name: 'Module 5: Object-Oriented Programming Advanced, Inheritance, and Exceptions',
        topics: [
          { id: 'chem-s1-python-m5-t1', name: 'OOP Advanced: Sameness, Copying & Mutability', difficulty: 'Medium', estimatedTime: 30 },
          { id: 'chem-s1-python-m5-t2', name: 'Inheritance, Operator Overloading & Polymorphism', difficulty: 'Hard', estimatedTime: 40 },
          { id: 'chem-s1-python-m5-t3', name: 'Exceptions: Catching and Raising Custom Exceptions', difficulty: 'Medium', estimatedTime: 35 }
        ]
      }
    ]
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
    name: '1BCHEC102: Applied Chemistry',
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
    id: 'chem-s2-caed',
    name: 'Computer-Aided Engineering Drawing',
    semester: 2,
    modules: CHEMISTRY_CYCLE_S1_SUBJECTS[6].modules
  },
  {
    id: 'chem-s2-ai-app',
    name: 'Introduction to AI and Applications',
    semester: 2,
    modules: CHEMISTRY_CYCLE_S1_SUBJECTS[7].modules
  },
  {
    id: 'chem-s2-python',
    name: '1BPLC105B: Python Programming',
    semester: 2,
    modules: CHEMISTRY_CYCLE_S1_SUBJECTS[8].modules
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
    id: 'phys-s2-c-prog',
    name: 'Programming in C',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[6].modules
  },
  {
    id: 'phys-s2-c-lab',
    name: '1BPOPL107: C Programming Lab',
    semester: 2,
    modules: PHYSICS_CYCLE_S1_SUBJECTS[7].modules
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
