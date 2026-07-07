import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { signInWithRedirect, getRedirectResult, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import AppLogo from './AppLogo';

export default function AuthPopupScreen() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPartitionError, setIsPartitionError] = useState(false);

  // Parse session_id from URL query params
  const queryParams = new URLSearchParams(window.location.search);
  const sessionId = queryParams.get('session_id');

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

    // If sessionId is present, write the payload to Firestore as a secure bridge
    if (sessionId) {
      try {
        await setDoc(doc(db, 'auth_sessions', sessionId), {
          status: 'success',
          payload: authPayload,
          createdAt: new Date().toISOString()
        });
        console.log("Auth session payload successfully posted to cloud bridge.");
      } catch (cloudErr) {
        console.error("Failed to post auth payload to cloud bridge:", cloudErr);
      }
    }

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
      googleProvider.setCustomParameters({ prompt: 'select_account' });
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
      googleProvider.setCustomParameters({ prompt: 'select_account' });
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

        // 2. Clear any stale session in the popup domain if we don't have a redirect result
        if (auth.currentUser && active) {
          console.log("[StudyOS Trace] [AuthPopupScreen] Signing out stale session to allow clean account selection. Current User UID:", auth.currentUser.uid);
          await signOut(auth);
          console.log("[StudyOS Trace] [AuthPopupScreen] Stale session signOut(auth) complete.");
        }

        // 3. Set status to idle to let the user sign in with popup
        if (active) {
          setStatus('idle');
        }
      } catch (err: any) {
        console.error("Popup Authentication Error:", err);
        if (active) {
          const msg = err.message || String(err);
          const errCode = err.code || "";
          const isBenign = 
            errCode === "auth/missing-initial-state" || 
            msg.toLowerCase().includes("missing-initial-state") || 
            msg.toLowerCase().includes("missing initial state") ||
            msg.toLowerCase().includes("sessionstorage");

          if (isBenign) {
            setStatus('idle');
          } else {
            handleAuthError(err);
          }
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
        <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform duration-300 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/20">
          <AppLogo className="w-full h-full" />
        </div>

        {status === 'idle' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Connect your Account</h2>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Click below to sign in securely with Google and link this preview session.
              </p>
            </div>

            <button
              onClick={startPopupSignIn}
              className="w-full py-2.5 bg-white hover:bg-gray-100 active:scale-98 text-gray-900 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.1.14 1.14-1.2l3.99 3.09c2.34-2.15 3.68-5.32 3.68-8.74z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.89-3.02c-1.08.72-2.45 1.16-4.07 1.16-3.14 0-5.8-2.11-6.75-4.96L1.31 17.3c2 3.97 6.1 6.7 10.69 6.7z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.25 14.27a7.22 7.22 0 0 1 0-4.54V6.64H1.31a11.96 11.96 0 0 0 0 10.72l3.94-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0 7.41 0 3.31 2.73 1.31 6.7l3.94 3.09c.95-2.85 3.61-4.96 6.75-4.96z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="pt-1">
              <button
                onClick={startRedirectSignIn}
                className="text-[10px] text-gray-500 hover:text-gray-400 underline transition-all cursor-pointer"
              >
                Trouble? Try Google Redirect Method
              </button>
            </div>
          </div>
        )}

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
