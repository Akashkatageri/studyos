export interface SubjectTheme {
  primary: string;       // HEX color
  accent: string;        // HEX color
  bgGrad: string;        // Tailwind gradient classes (e.g. "from-purple-500/10 to-indigo-500/5")
  btnGrad: string;       // Button gradient classes (e.g. "from-purple-500 to-indigo-600")
  border: string;        // Border color class (e.g. "border-purple-500/20")
  borderHover: string;   // Hover border
  text: string;          // Text color class (e.g. "text-purple-400")
  tagBg: string;         // Tag background class
  shadowGlow: string;    // Shadow class
  barGrad: string;       // Progress bar gradient
}

const THEMES: SubjectTheme[] = [
  {
    primary: '#6C63FF',
    accent: '#8B5CF6',
    bgGrad: 'from-blue-600/10 via-[#131139]/20 to-[#0F0E2A]',
    btnGrad: 'from-[#6C63FF] via-[#7B5CFF] to-[#8B5CF6]',
    border: 'border-indigo-500/25',
    borderHover: 'hover:border-indigo-500/40',
    text: 'text-indigo-400',
    tagBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    shadowGlow: 'shadow-[0_0_15px_rgba(108,99,255,0.15)]',
    barGrad: 'from-[#6C63FF] to-[#8B5CF6]',
  },
  {
    primary: '#8B5CF6',
    accent: '#D946EF',
    bgGrad: 'from-purple-600/10 via-[#1E1139]/20 to-[#0F0E2A]',
    btnGrad: 'from-[#8B5CF6] via-purple-500 to-fuchsia-600',
    border: 'border-purple-500/25',
    borderHover: 'hover:border-purple-500/40',
    text: 'text-purple-400',
    tagBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    shadowGlow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]',
    barGrad: 'from-[#8B5CF6] to-fuchsia-600',
  },
  {
    primary: '#10B981',
    accent: '#06B6D4',
    bgGrad: 'from-emerald-600/10 via-[#0C2422]/20 to-[#0F0E2A]',
    btnGrad: 'from-[#10B981] via-emerald-500 to-teal-600',
    border: 'border-emerald-500/25',
    borderHover: 'hover:border-emerald-500/40',
    text: 'text-emerald-400',
    tagBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    shadowGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    barGrad: 'from-[#10B981] to-teal-500',
  },
  {
    primary: '#38BDF8',
    accent: '#3B82F6',
    bgGrad: 'from-sky-600/10 via-[#0C1A35]/20 to-[#0F0E2A]',
    btnGrad: 'from-[#38BDF8] via-sky-500 to-blue-600',
    border: 'border-sky-500/25',
    borderHover: 'hover:border-sky-500/40',
    text: 'text-sky-400',
    tagBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    shadowGlow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]',
    barGrad: 'from-[#38BDF8] to-blue-600',
  },
  {
    primary: '#FBBF24',
    accent: '#F97316',
    bgGrad: 'from-amber-600/10 via-[#291F0B]/20 to-[#0F0E2A]',
    btnGrad: 'from-[#FBBF24] via-amber-500 to-orange-500',
    border: 'border-amber-500/25',
    borderHover: 'hover:border-amber-500/40',
    text: 'text-amber-400',
    tagBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    shadowGlow: 'shadow-[0_0_15px_rgba(251,191,36,0.15)]',
    barGrad: 'from-[#FBBF24] to-orange-500',
  },
  {
    primary: '#EC4899',
    accent: '#8B5CF6',
    bgGrad: 'from-pink-600/10 via-[#230C1E]/20 to-[#0F0E2A]',
    btnGrad: 'from-pink-500 via-purple-500 to-indigo-600',
    border: 'border-pink-500/25',
    borderHover: 'hover:border-pink-500/40',
    text: 'text-pink-400',
    tagBg: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    shadowGlow: 'shadow-[0_0_15px_rgba(236,72,153,0.15)]',
    barGrad: 'from-pink-500 to-purple-600',
  },
];

export function getSubjectTheme(subjectId: string, subjectName?: string): SubjectTheme {
  const identifier = (subjectId + ' ' + (subjectName || '')).toLowerCase();
  
  if (identifier.includes('math') || identifier.includes('m1') || identifier.includes('m2') || identifier.includes('m3') || identifier.includes('calculus')) {
    return THEMES[3]; // Sky theme (Blue/Sky)
  }
  if (identifier.includes('chem') || identifier.includes('science') || identifier.includes('physics')) {
    return THEMES[2]; // Emerald/Teal theme
  }
  if (identifier.includes('electro') || identifier.includes('electronics') || identifier.includes('circuit') || identifier.includes('comm')) {
    return THEMES[4]; // Amber/Orange theme
  }
  if (identifier.includes('ai') || identifier.includes('intelligence') || identifier.includes('python') || identifier.includes('java') || identifier.includes('programming') || identifier.includes('code') || identifier.includes('cse') || identifier.includes('ise')) {
    return THEMES[0]; // Indigo theme
  }
  
  // Dynamic hash fallback
  let hash = 0;
  const str = subjectId + ' ' + (subjectName || '');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % THEMES.length;
  return THEMES[index];
}
