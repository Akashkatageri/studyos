export interface UIPreferences {
  theme: 'dark' | 'light' | 'oled';
  accentColor?: string;
  language?: string;
  activeTab: string;
  onboarded: boolean;
}

const UI_PREFS_KEY = 'studyos-ui-preferences';
const DEPRECATED_USER_STATE_KEY = 'studyos-user-state';

/**
 * Loads lightweight UI preferences from localStorage.
 * Ensures sensitive data (streak, XP, achievements, sessions, history, friends, etc.)
 * are never persisted in localStorage as Firestore is the single source of truth.
 */
export function getUIPreferences(): UIPreferences {
  if (typeof window === 'undefined') {
    return {
      theme: 'dark',
      accentColor: 'purple',
      language: 'en',
      activeTab: 'home',
      onboarded: false,
    };
  }

  // Purge old local storage key if it exists to adhere strictly to single source of truth rules
  try {
    if (localStorage.getItem(DEPRECATED_USER_STATE_KEY)) {
      localStorage.removeItem(DEPRECATED_USER_STATE_KEY);
    }
  } catch (e) {
    // Ignore storage errors
  }

  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme || 'dark',
        accentColor: parsed.accentColor || 'purple',
        language: parsed.language || 'en',
        activeTab: parsed.activeTab || 'home',
        onboarded: Boolean(parsed.onboarded),
      };
    }
  } catch (e) {
    console.warn("Failed to read UI preferences from localStorage:", e);
  }

  return {
    theme: 'dark',
    accentColor: 'purple',
    language: 'en',
    activeTab: 'home',
    onboarded: false,
  };
}

/**
 * Saves only lightweight UI preferences to localStorage.
 */
export function saveUIPreferences(prefs: Partial<UIPreferences>): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getUIPreferences();
    const updated: UIPreferences = {
      ...existing,
      ...prefs,
    };
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save UI preferences to localStorage:", e);
  }
}
