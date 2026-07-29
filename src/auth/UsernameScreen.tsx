import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  CircleAlert, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ChevronRight 
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, isUsernameUnique } from '../lib/firebase';
import { containsProfanity } from '../utils/moderation';

interface UsernameScreenProps {
  authData: {
    uid?: string;
    email?: string;
    displayName?: string;
    usernameViolation?: boolean;
  };
  onAuthComplete: (authData: {
    uid?: string;
    email?: string;
    displayName?: string;
    isOffline: boolean;
    username?: string;
  }) => void;
  handleSignOutAndReset: () => void;
}

export default function UsernameScreen({
  authData,
  onAuthComplete,
  handleSignOutAndReset,
}: UsernameScreenProps) {
  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [usernameSubmitError, setUsernameSubmitError] = useState<string | null>(null);
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);

  // Initialize username suggestion from display name / email on load
  useEffect(() => {
    const base = (authData.displayName || authData.email || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    setUsername(base.slice(0, 15));
  }, [authData]);

  // Username validation handler
  useEffect(() => {
    if (!username) {
      setIsAvailable(null);
      setUsernameError(null);
      setSuggestions([]);
      return;
    }

    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(username)) {
      setUsernameError("Usernames can contain only letters, numbers, and underscores.");
      setIsAvailable(null);
      setSuggestions([]);
      return;
    }

    if (username.length < 3) {
      setUsernameError("Username is too short (min 3 characters).");
      setIsAvailable(null);
      setSuggestions([]);
      return;
    }

    if (containsProfanity(username)) {
      setUsernameError("Usernames cannot contain vulgar or inappropriate words.");
      setIsAvailable(null);
      setSuggestions([]);
      return;
    }

    setUsernameError(null);
    setIsValidating(true);

    const checkUnique = setTimeout(async () => {
      try {
        const unique = await isUsernameUnique(username, authData.uid);
        setIsAvailable(unique);
        if (!unique) {
          setUsernameError("This username is already taken.");
          const cleanBase = username.slice(0, 12);
          const sugList = [
            `${cleanBase}_stud`,
            `${cleanBase}_${Math.floor(100 + Math.random() * 900)}`
          ];
          setSuggestions(sugList);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Error checking username uniqueness:", err);
        setIsAvailable(true); // default fallback to unblock
      } finally {
        setIsValidating(false);
      }
    }, 400);

    return () => clearTimeout(checkUnique);
  }, [username, authData.uid]);

  const handleSubmitUsername = async () => {
    if (!username || isAvailable !== true || usernameError) return;

    setIsSubmittingUsername(true);
    setUsernameSubmitError(null);

    if (authData.uid) {
      try {
        const usernameKey = username.toLowerCase().trim();
        const usernameDocRef = doc(db, "usernames", usernameKey);
        
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Database write timed out. Please check your network or Firestore settings.")), 10000)
        );

        await Promise.race([
          setDoc(usernameDocRef, { uid: authData.uid, username }, { merge: true }),
          timeoutPromise
        ]);
      } catch (err: any) {
        console.error("Failed to reserve username in Firestore:", err);
        setUsernameSubmitError(
          "Could not reserve username in cloud database. Please verify your connection."
        );
        setIsSubmittingUsername(false);
        return;
      }
    }

    setIsSubmittingUsername(false);
    onAuthComplete({
      uid: authData.uid,
      email: authData.email,
      displayName: authData.displayName,
      isOffline: false,
      username: username.trim()
    });
  };

  return (
    <motion.div
      key="username"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" />
          Choose Username
        </h2>
        <p className="text-xs text-gray-400">
          Set up your unique handle inside the StudyOS network directory.
        </p>
      </div>

      {authData.usernameViolation && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Action Required</p>
            <p className="text-[11px] text-red-300/80 mt-0.5">
              This username violates our community guidelines. Please choose a new handle to continue.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Unique Username
        </label>
        <div className="relative">
          <input
            id="username-input"
            type="text"
            maxLength={18}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            className={`w-full bg-gray-950 border rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-all font-mono ${
              usernameError 
                ? 'border-red-500/50 focus:border-red-500' 
                : isAvailable 
                ? 'border-emerald-500/50 focus:border-emerald-500' 
                : 'border-gray-800 focus:border-blue-500'
            }`}
            placeholder="e.g. akashkatageri"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isValidating && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            )}
            {!isValidating && isAvailable && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-500/10" />
            )}
            {!isValidating && usernameError && (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
          </div>
        </div>

        {/* Real-time status/error alerts */}
        {usernameError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <CircleAlert className="w-3.5 h-3.5" />
            <span>{usernameError}</span>
          </p>
        )}
        {!isValidating && isAvailable && (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Username is available!</span>
          </p>
        )}

        <p className="text-[10px] text-gray-500">
          Letters, numbers, and underscores only. Max 18 characters.
        </p>
      </div>

      {/* Username suggestions block */}
      {suggestions.length > 0 && (
        <div className="space-y-2 bg-gray-950/50 border border-gray-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Suggested Names:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug) => (
              <button
                id={`suggestion-btn-${sug}`}
                key={sug}
                onClick={() => setUsername(sug)}
                className="px-2.5 py-1 text-xs font-mono bg-gray-900 border border-gray-800 rounded-lg hover:border-blue-500/50 hover:bg-blue-500/5 text-gray-300 transition-all cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {usernameSubmitError && (
        <div className="p-4 bg-red-950/25 border border-red-900/50 rounded-2xl text-left shadow-md">
          <div className="flex items-start gap-2 text-red-400 font-bold text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="block text-red-300">Registration Failed</span>
              <p className="text-[11px] font-normal text-gray-300 mt-1 leading-relaxed">
                {usernameSubmitError}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2.5 pt-2">
        <button
          id="username-signout-btn"
          type="button"
          onClick={handleSignOutAndReset}
          className="px-4 bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          title="Sign out of this Google account"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
        <button
          id="username-submit-btn"
          onClick={handleSubmitUsername}
          disabled={!username || isValidating || isAvailable !== true || !!usernameError || isSubmittingUsername}
          className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none active:scale-98 text-white text-sm font-bold rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmittingUsername ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Reserving Username...</span>
            </>
          ) : (
            <>
              <span>Continue to Syllabus Selection</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
