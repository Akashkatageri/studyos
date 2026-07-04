import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export default function AuthPopupScreen() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPartitionError, setIsPartitionError] = useState(false);

  const handleAuthSuccess = async (user: any) => {
    setStatus('success');
    
    let idToken = null;
    try {
      idToken = await user.getIdToken();
    } catch (e) {
      console.warn("Failed to retrieve user ID token:", e);
    }

    const authPayload = {
      type: 'firebase-auth-success',
      idToken,
      accessToken: null,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
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
  };

  const startRedirectSignIn = async () => {
    setStatus('loading');
    setErrorMsg('');
    setIsPartitionError(false);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Popup Redirect Trigger Error:", err);
      handleAuthError(err);
    }
  };

  const startPopupSignIn = async () => {
    setStatus('loading');
    setErrorMsg('');
    setIsPartitionError(false);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        await handleAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Popup Sign-In Error:", err);
      handleAuthError(err);
    }
  };

  const handleAuthError = (err: any) => {
    setStatus('error');
    let msg = err.message || String(err);
    const errCode = err.code || "";

    const isPartition = 
      errCode === "auth/missing-initial-state" || 
      msg.toLowerCase().includes("missing-initial-state") || 
      msg.toLowerCase().includes("missing initial state") ||
      msg.toLowerCase().includes("sessionstorage");

    if (isPartition) {
      setIsPartitionError(true);
      msg = "Your browser's privacy or cookie settings interrupted the secure redirect authentication. Please click 'Sign In via Popup Method' below to log in directly.";
    } else if (msg.includes("auth/popup-blocked")) {
      msg = "Google login popup was blocked. Please allow popups for this domain and try again.";
    } else if (msg.includes("auth/popup-closed-by-user")) {
      msg = "The authentication window was closed. Please try again.";
    } else if (msg.includes("auth/unauthorized-domain") || errCode === "auth/unauthorized-domain") {
      msg = `This domain (${window.location.hostname}) is not authorized for Google Sign-In in your Firebase Console. Please add it to your Authorized Domains in the Firebase settings.`;
    }
    setErrorMsg(msg);
  };

  useEffect(() => {
    let active = true;

    const handleRedirectResultAndSync = async () => {
      try {
        // 1. Check if we have a redirect result (returning from Google redirect)
        const result = await getRedirectResult(auth);
        if (result && result.user && active) {
          await handleAuthSuccess(result.user);
          return;
        }

        // 2. Check if already logged in (standard session restore)
        if (auth.currentUser && active) {
          await handleAuthSuccess(auth.currentUser);
          return;
        }

        // 3. If neither, trigger standard Google Sign-In redirect immediately!
        if (active) {
          await signInWithRedirect(auth, googleProvider);
        }
      } catch (err: any) {
        console.error("Popup Authentication Error:", err);
        if (active) {
          handleAuthError(err);
        }
      }
    };

    handleRedirectResultAndSync();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0C0F12] text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none relative">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-sm bg-[#141A1F] rounded-3xl border border-gray-800 p-8 space-y-6 shadow-2xl relative z-10">
        {/* Brand */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] animate-pulse">
          <BookOpen className="w-6 h-6 text-white" />
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Connecting to Google</h2>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Redirecting you to the official Google Account selection page...
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
                Your profile has been connected securely. Closing this window...
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
              <h2 className="text-base font-bold text-red-400 tracking-tight font-display">
                {isPartitionError ? "Security Settings Fallback" : "Connection Failed"}
              </h2>
              <p className="text-xs text-gray-300 mt-2 bg-gray-950 p-3 rounded-xl border border-gray-900 font-sans text-xs text-left leading-relaxed">
                {errorMsg}
              </p>
            </div>
            
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={startPopupSignIn}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
              >
                Sign In via Popup Method
              </button>
              <button
                onClick={startRedirectSignIn}
                className="w-full py-2 bg-gray-950 hover:bg-gray-900 text-gray-300 border border-gray-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Try Secure Redirect Again
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
