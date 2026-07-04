import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export default function AuthPopupScreen() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuthClick = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      // Since this is triggered by a direct user click, the browser will never block it!
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setStatus('success');
        
        // Extract Google credential and tokens
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const idToken = credential?.idToken || null;
        const accessToken = credential?.accessToken || null;

        const authPayload = {
          type: 'firebase-auth-success',
          idToken,
          accessToken,
          user: {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL
          },
          timestamp: Date.now()
        };

        // Fallback for mobile browser iframes where window.opener might be null/blocked
        try {
          localStorage.setItem('studyos_auth_success', JSON.stringify(authPayload));
        } catch (storageErr) {
          console.warn("Failed to write to localStorage in popup tab:", storageErr);
        }
        
        // Notify the parent window (iframe) that authentication was successful with tokens
        if (window.opener) {
          window.opener.postMessage(authPayload, '*');
        }
        
        // Close the popup window after a brief friendly confirmation delay
        setTimeout(() => {
          window.close();
        }, 1200);
      } else {
        throw new Error("No user profile received from Google Authentication.");
      }
    } catch (err: any) {
      console.error("Popup Authentication Error:", err);
      setStatus('error');
      
      let msg = err.message || String(err);
      if (msg.includes("auth/popup-blocked")) {
        msg = "Google login popup was blocked. Please allow popups for this domain and try again.";
      } else if (msg.includes("auth/popup-closed-by-user")) {
        msg = "The authentication window was closed before completion. Please try again.";
      } else if (msg.includes("auth/unauthorized-domain")) {
        msg = "This domain is not authorized for Google Sign-In in your Firebase Console. Please add it to your Authorized Domains.";
      }
      setErrorMsg(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0F12] text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none relative">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-sm bg-[#141A1F] rounded-3xl border border-gray-800 p-8 space-y-6 shadow-2xl relative z-10">
        {/* Brand */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] animate-bounce">
          <BookOpen className="w-6 h-6 text-white" />
        </div>

        {status === 'idle' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight font-display">Confirm Google Sign-In</h2>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Click the button below to authorize StudyOS via Google. This secure popup bypasses iframe security restrictions.
              </p>
            </div>
            
            <button
              onClick={handleAuthClick}
              className="w-full py-3.5 bg-white text-gray-950 hover:bg-gray-100 disabled:opacity-50 active:scale-98 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md"
            >
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
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Connecting Google Account</h2>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Please complete the account selection and sign-in inside the Google window.
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-fade-in">
            <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-400 tracking-tight font-display">Authentication Successful!</h2>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Your profile has been connected securely. Closing this helper window...
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-fade-in">
            <div className="mx-auto w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-red-400 tracking-tight font-display">Connection Failed</h2>
              <p className="text-xs text-gray-300 mt-2 bg-gray-950 p-3 rounded-xl border border-gray-900 font-mono text-[11px] text-left break-words max-h-32 overflow-y-auto">
                {errorMsg}
              </p>
            </div>
            
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleAuthClick}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
              >
                Retry Google Authentication
              </button>
              <button
                onClick={() => window.close()}
                className="w-full py-2 text-gray-500 hover:text-gray-400 text-xs font-semibold transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
