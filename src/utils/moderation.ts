// Content Moderation & Profanity Filtering Utility for StudyOS

// Extended list of vulgar, explicit, profane, and inappropriate terms
const VULGAR_WORDS = [
  'sex',
  'sexx',
  'sexxx',
  'sexual',
  'sexy',
  'fuck',
  'fucking',
  'fucker',
  'fck',
  'fuk',
  'fuking',
  'rape',
  'rapist',
  'raped',
  'raping',
  'porn',
  'porno',
  'pornhub',
  'bitch',
  'slut',
  'whore',
  'cunt',
  'dick',
  'pussy',
  'asshole',
  'bastard',
  'nigger',
  'nigga',
  'chink',
  'faggot',
  'penis',
  'vagina',
  'boobs',
  'cock',
  'hentai',
  'nude',
  'nudes',
  'anal',
  'orgasm',
  'erotic',
  'xxx',
  'horny',
  'milf',
  'dildo',
  'masturbat',
  'masterbat',
  'blowjob',
  'handjob',
  'cumshot',
  'deepthroat',
  'incest',
  'pedophil',
  'twat',
  'wanker',
  'prick',
  'motherfucker',
  'hoe'
];

/**
 * Normalizes input text by mapping common leetspeak characters
 * and stripping non-alphanumeric punctuation to prevent simple bypasses.
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b');
}

/**
 * Checks if a string contains any vulgar, explicit, or profane content.
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const rawLower = text.toLowerCase();
  const normalized = normalizeText(text);
  const stripped = normalized.replace(/[^a-z0-9]/g, '');

  for (const word of VULGAR_WORDS) {
    // 1. Direct word boundary match in original lowercased string
    const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, 'i');
    if (wordBoundaryRegex.test(rawLower)) return true;

    // 2. Substring match in raw, normalized, or stripped text
    if (rawLower.includes(word) || normalized.includes(word) || stripped.includes(word)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a username or display name for profane or vulgar content.
 * Returns an object with isValid status and a user-friendly error message if invalid.
 */
export function validateModeratedText(
  text: string,
  fieldName = 'This field'
): { isValid: boolean; error?: string } {
  if (!text) return { isValid: true };

  if (containsProfanity(text)) {
    return {
      isValid: false,
      error: `${fieldName} contains inappropriate or vulgar words. Please choose a appropriate phrase.`
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes a bio string: clears it completely if vulgar or inappropriate terms are found.
 */
export function sanitizeBio(bio?: string): string {
  if (!bio) return '';
  if (containsProfanity(bio)) {
    return ''; // Remove vulgar bio
  }
  return bio;
}

/**
 * Sanitizes a display name: returns default fallback if vulgar terms are found.
 */
export function sanitizeDisplayName(displayName?: string, fallback = 'Student'): string {
  if (!displayName) return fallback;
  if (containsProfanity(displayName)) {
    return fallback;
  }
  return displayName;
}

/**
 * Sanitizes a username: returns a clean default generated username if vulgar terms are found.
 */
export function sanitizeUsername(username?: string, uid?: string): string {
  if (!username) return `user_${(uid || 's').slice(-5)}`;
  if (containsProfanity(username)) {
    const cleanSuffix = Math.floor(1000 + Math.random() * 9000);
    return `student_${cleanSuffix}`;
  }
  return username;
}
