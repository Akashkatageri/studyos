import React from 'react';
import { motion } from 'motion/react';
import { 
  ExternalLink, 
  AlertCircle, 
  LogOut, 
  Loader2, 
  HardDrive, 
  ShieldCheck 
} from 'lucide-react';
import AppLogo from '../components/AppLogo';

interface WebAuthProps {
  isLoadingAuth: boolean;
  isIframe: boolean;
  showIframeWarning: boolean;
  setShowIframeWarning: (show: boolean) => void;
  redirectWarning: string | null;
  authError: { message: string } | null;
  cachedUser: any | null;
  handleGoogleSignIn: () => Promise<void>;
  handleContinueOffline: () => void;
  handleSignOutAndReset: () => Promise<void>;
}

export default function WebAuth({
  isLoadingAuth,
  isIframe,
  showIframeWarning,
  redirectWarning,
  authError,
  cachedUser,
  handleGoogleSignIn,
  handleContinueOffline,
  handleSignOutAndReset,
}: WebAuthProps) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 text-center"
    >
      {/* App Brand Icon */}
      <div className="mx-auto w-20 h-20 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.25)] hover:scale-105 transition-transform duration-300 flex items-center justify-center bg-[#090D14] border border-cyan-500/30 p-2">
        <AppLogo className="w-full h-full animate-fade-in" transparent={true} />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
          Welcome to StudyOS
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xs mx-auto leading-relaxed font-sans">
          Retrieve active syllabus guides, design custom revision calendars, and sync study targets.
        </p>
      </div>

      {isIframe && (
        <div className="p-4 bg-blue-950/20 border border-blue-900/40 rounded-2xl text-left space-y-2.5 shadow-md">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Running in Preview Mode?</span>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
            Modern browsers block iframe storage and cookies for security, which logs you out every time you close this preview pane. <strong>Open StudyOS in a new tab to stay signed in permanently!</strong>
          </p>
          <button
            id="open-new-tab-btn"
            onClick={() => window.open(window.location.href, '_blank')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98 border-none"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open App in New Tab</span>
          </button>
        </div>
      )}

      {redirectWarning && (
        <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl text-left space-y-2 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <span>Google Sign-In Redirect Interrupted</span>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
            {redirectWarning}
          </p>
        </div>
      )}

      {showIframeWarning && (
        <div className="p-3.5 bg-amber-950/20 border border-amber-900/50 rounded-2xl text-left space-y-1.5 shadow-inner">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Troubleshooting Sign-In</span>
          </div>
          <ul className="list-disc pl-4 text-[11px] text-gray-300 space-y-1.5 leading-relaxed font-sans">
            <li>
              Ensure Google Sign-In is enabled under <strong>Authentication &gt; Sign-in method</strong> in your Firebase Console.
            </li>
            <li>
              Add <code className="px-1 py-0.5 bg-gray-900 rounded border border-gray-800 text-amber-300 font-mono text-[10px] select-all">{window.location.hostname}</code> to <strong>Authorized Domains</strong> in Authentication Settings.
            </li>
            <li>
              Open the application in a <strong>new tab</strong> to bypass iframe-restricted cookies.
            </li>
          </ul>
        </div>
      )}

      {authError && (
        <div className="p-4 bg-red-950/25 border border-red-900/50 rounded-2xl text-left space-y-3 shadow-md">
          <div className="flex items-start gap-2 text-red-400 font-bold text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="block text-red-300">Connection Error / Setup Required</span>
              <p className="text-[11px] font-normal text-gray-300 mt-1 leading-relaxed font-sans">
                {authError.message}
              </p>
            </div>
          </div>
          
          <div className="pt-1.5 border-t border-red-900/30">
            <button
              id="auth-error-reset-btn"
              onClick={handleSignOutAndReset}
              className="w-full py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 text-gray-300 hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Sign Out & Try Different Account</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1">
        {/* Google Sign In */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={isLoadingAuth}
          className="w-full py-3.5 bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 active:scale-98 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md border-none"
        >
          {isLoadingAuth ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </button>

        {cachedUser && (
          <button
            id="continue-offline-btn"
            onClick={handleContinueOffline}
            disabled={isLoadingAuth}
            className="w-full py-3.5 bg-gray-900/40 text-gray-300 hover:text-white border border-gray-800/80 hover:bg-gray-800 disabled:opacity-50 active:scale-98 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <span>Access Cached Data Offline ({cachedUser.username})</span>
          </button>
        )}
      </div>

      <div className="text-[10px] text-gray-500 pt-2 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-500/80" />
        <span>Secure Google Authentication</span>
      </div>
    </motion.div>
  );
}
