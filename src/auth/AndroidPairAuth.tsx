import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { 
  ArrowLeft, 
  Smartphone, 
  Loader2, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check 
} from 'lucide-react';

interface AndroidPairAuthProps {
  pairingCode: string;
  isAutomaticGoogleFlow: boolean;
  setIsAutomaticGoogleFlow: (val: boolean) => void;
  setStep: (step: 'welcome' | 'username' | 'pairing') => void;
  handleResumeOrFocus: () => Promise<void>;
  authError?: { message: string; raw?: string } | null;
  setAuthError?: (err: any) => void;
}

export default function AndroidPairAuth({
  pairingCode,
  isAutomaticGoogleFlow,
  setIsAutomaticGoogleFlow,
  setStep,
  handleResumeOrFocus,
  authError,
  setAuthError,
}: AndroidPairAuthProps) {
  const [copiedPairingLink, setCopiedPairingLink] = useState(false);

  const handleCancelAndGoBack = () => {
    localStorage.removeItem('pairing_key');
    localStorage.removeItem('pairing_code');
    localStorage.removeItem('pairing_step_active');
    setStep('welcome');
    setIsAutomaticGoogleFlow(false);
  };

  const handleCopyLink = () => {
    const pairingKey = localStorage.getItem('pairing_key') || '';
    const realUrl = `https://ais-dev-5qkfwaoj2q5v7zsluse4zi-358182587374.asia-east1.run.app/?pair_code=${pairingCode}${pairingKey ? `&k=${pairingKey}` : ''}`;
    navigator.clipboard.writeText(realUrl).then(() => {
      setCopiedPairingLink(true);
      setTimeout(() => setCopiedPairingLink(false), 2000);
    });
  };

  const handleRelaunch = () => {
    const liveUrl = "https://ais-dev-5qkfwaoj2q5v7zsluse4zi-358182587374.asia-east1.run.app";
    const pairingKey = localStorage.getItem('pairing_key') || '';
    const realUrl = `${liveUrl}/?pair_code=${pairingCode}${pairingKey ? `&k=${pairingKey}` : ''}`;
    window.open(realUrl, '_blank');
  };

  return (
    <motion.div
      key="pairing"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 text-center"
    >
      <div className="flex items-center gap-2">
        <button
          id="pairing-back-btn"
          onClick={handleCancelAndGoBack}
          className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xs font-black font-mono text-blue-400 uppercase tracking-widest text-left flex-1">
          Google Sign-In Connection
        </h2>
      </div>

      {isAutomaticGoogleFlow || Capacitor.isNativePlatform() ? (
        <>
          {authError && (
            <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-left text-xs text-red-400 space-y-1">
              <p className="font-bold">⚠️ Connection Issue</p>
              <p>{authError.message}</p>
              {setAuthError && (
                <button
                  onClick={() => setAuthError(null)}
                  className="mt-1 text-[10px] text-red-300 hover:text-red-200 underline cursor-pointer bg-transparent border-none outline-none p-0"
                >
                  Clear Error
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 relative">
              <svg className="w-8 h-8 animate-pulse" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M21.35 11.1H12v2.7h5.3c-.23 1.28-.91 2.37-1.95 3.07v2.55h3.15c1.84-1.7 2.9-4.2 2.9-7.17c0-.64-.06-1.25-.15-1.65z"
                />
                <path
                  fill="currentColor"
                  d="M12 21c2.43 0 4.47-.8 5.96-2.18l-2.55-1.97c-.72.48-1.63.75-2.81.75c-2.34 0-4.32-1.58-5.03-3.7H4.35v2.73C5.83 19.57 8.68 21 12 21z"
                />
                <path
                  fill="currentColor"
                  d="M6.97 13.9C6.8 13.36 6.7 12.79 6.7 12s.1-1.36.27-1.9V7.37H4.35C3.78 8.5 3.45 9.77 3.45 11s.33 2.5 1.1 3.63l2.42-2.73z"
                />
                <path
                  fill="currentColor"
                  d="M12 6.4c1.33 0 2.52.46 3.46 1.35l2.6-2.6C16.47 3.6 14.43 3 12 3C8.68 3 5.83 4.43 4.35 7.37l2.62 1.9c.71-2.12 2.69-3.7 5.03-3.7z"
                />
              </svg>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0C0F12] flex items-center justify-center border border-gray-800">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Completing Google Sign-In...</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                We opened a secure browser window for you to select your Google Account.
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl text-left space-y-2 text-xs text-gray-400">
            <p className="font-semibold text-blue-300">What to do:</p>
            <ul className="list-disc pl-4 space-y-1 leading-relaxed">
              <li>Choose your Google Account in the web browser tab.</li>
              <li>This app will immediately sign you in the moment you complete it.</li>
            </ul>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="pairing-relaunch-btn"
              type="button"
              onClick={handleRelaunch}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Relaunch Google Login Window</span>
            </button>

            <button
              id="pairing-cancel-btn"
              type="button"
              onClick={handleCancelAndGoBack}
              className="text-[11px] text-gray-500 hover:text-gray-400 underline transition-all cursor-pointer bg-transparent border-none outline-none"
            >
              Cancel and Go Back
            </button>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 pt-2 border-t border-gray-900">
            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Waiting for Google Account response...</span>
            </div>
            
            <button
              id="pairing-check-btn"
              type="button"
              onClick={handleResumeOrFocus}
              className="mt-1 px-4 py-2 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 hover:border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-500/5 active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>I completed Sign-In, Check Now</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Your Pairing Code</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Use this code to sync this Android device with your Google profile from a browser.
            </p>
          </div>

          {/* Massive 6-digit code display */}
          <div className="bg-gray-950/60 border border-gray-850 py-5 px-6 rounded-2xl tracking-[0.2em] text-3xl font-black text-emerald-400 font-mono shadow-inner select-all flex items-center justify-center gap-1.5">
            <span>{pairingCode.slice(0, 3)}</span>
            <span className="text-gray-600 font-sans tracking-normal text-xl select-none">-</span>
            <span>{pairingCode.slice(3, 6)}</span>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-gray-950/40 border border-gray-850 rounded-xl text-left space-y-2 text-xs text-gray-400">
            <p className="font-semibold text-white">Steps to Pair:</p>
            <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
              <li>Open a web browser on another device or computer.</li>
              <li>
                Go to the web app:{" "}
                <span className="text-blue-400 font-bold select-all break-all block mt-0.5 font-mono">
                  https://ais-dev-5qkfwaoj2q5v7zsluse4zi-358182587374.asia-east1.run.app
                </span>
              </li>
              <li>Sign in and enter this pairing code under Settings.</li>
              <li>Or click the link below to copy and open.</li>
            </ol>
          </div>

          {/* Copy / Direct URL Button */}
          <button
            id="pairing-copy-btn"
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2.5 bg-gray-900 border border-gray-800 hover:bg-gray-850 hover:border-gray-700 text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedPairingLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied Pairing URL!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Pairing Link (Option A)</span>
              </>
            )}
          </button>

          {/* Polling/Loading feedback */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 pt-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            <span>Waiting for your web browser session...</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
