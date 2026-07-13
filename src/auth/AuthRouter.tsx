import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';

import { 
  auth, 
  googleProvider, 
  loadUserFromFirestore, 
  db, 
  createDevicePairingCode, 
  onSnapshot 
} from '../lib/firebase';
import { UserState } from '../types';

import WebAuth from './WebAuth';
import AndroidPairAuth from './AndroidPairAuth';
import UsernameScreen from './UsernameScreen';
import { useAndroidPairing } from './hooks/useAndroidPairing';

interface AuthRouterProps {
  initialUser?: UserState | null;
  onAuthComplete: (authData: { 
    uid?: string; 
    email?: string; 
    displayName?: string; 
    isOffline: boolean; 
    username?: string;
    onboarded?: boolean;
    fullState?: any;
  }) => void;
}

export default function AuthRouter({ initialUser, onAuthComplete }: AuthRouterProps) {
  // 1. Core routing steps: 'welcome' | 'username' | 'pairing'
  const [step, setStep] = useState<'welcome' | 'username' | 'pairing'>(() => {
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem('pairing_step_active');
      const code = localStorage.getItem('pairing_code');
      if (active === 'true' && code) {
        console.log(`[TRACER] [State Init] Restoring step 'pairing' because active flow was found in localStorage.`);
        console.log("[PAIRING RESTORE - step]", {
          pairingStep: localStorage.getItem("pairing_step_active"),
          pairingCode: localStorage.getItem("pairing_code"),
          pairingKey: !!localStorage.getItem("pairing_key"),
          restoredStep: 'pairing',
          restoredPairingCode: code
        });
        return 'pairing';
      }
    }
    console.log("[PAIRING RESTORE - step]", {
      pairingStep: typeof window !== 'undefined' ? localStorage.getItem("pairing_step_active") : null,
      pairingCode: typeof window !== 'undefined' ? localStorage.getItem("pairing_code") : null,
      pairingKey: typeof window !== 'undefined' ? !!localStorage.getItem("pairing_key") : false,
      restoredStep: 'welcome',
      restoredPairingCode: null
    });
    return 'welcome';
  });

  const [authData, setAuthData] = useState<{
    uid?: string;
    email?: string;
    displayName?: string;
  }>({});

  // Pairing state
  const [pairingCode, setPairingCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const code = localStorage.getItem('pairing_code');
      if (code) {
        console.log(`[TRACER] [State Init] Restoring pairingCode "${code}" from localStorage.`);
        console.log("[PAIRING RESTORE - pairingCode]", {
          pairingStep: localStorage.getItem("pairing_step_active"),
          pairingCode: localStorage.getItem("pairing_code"),
          pairingKey: !!localStorage.getItem("pairing_key"),
          restoredStep: null,
          restoredPairingCode: code
        });
        return code;
      }
    }
    console.log("[PAIRING RESTORE - pairingCode]", {
      pairingStep: typeof window !== 'undefined' ? localStorage.getItem("pairing_step_active") : null,
      pairingCode: typeof window !== 'undefined' ? localStorage.getItem("pairing_code") : null,
      pairingKey: typeof window !== 'undefined' ? !!localStorage.getItem("pairing_key") : false,
      restoredStep: null,
      restoredPairingCode: ''
    });
    return '';
  });

  const [isAutomaticGoogleFlow, setIsAutomaticGoogleFlow] = useState(() => {
    if (typeof window !== 'undefined') {
      const activeVal = localStorage.getItem('pairing_step_active') === 'true';
      console.log("[PAIRING RESTORE - isAutomaticGoogleFlow]", {
        pairingStep: localStorage.getItem("pairing_step_active"),
        pairingCode: localStorage.getItem("pairing_code"),
        pairingKey: !!localStorage.getItem("pairing_key"),
        restoredStep: null,
        restoredPairingCode: null,
        isAutomaticGoogleFlow: activeVal
      });
      return activeVal;
    }
    console.log("[PAIRING RESTORE - isAutomaticGoogleFlow]", {
      pairingStep: null,
      pairingCode: null,
      pairingKey: false,
      restoredStep: null,
      restoredPairingCode: null,
      isAutomaticGoogleFlow: false
    });
    return false;
  });

  // Loading & error feedback
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<{ message: string; raw?: string } | null>(null);
  const [redirectWarning, setRedirectWarning] = useState<string | null>(null);
  const [showIframeWarning, setShowIframeWarning] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  // Offline caching
  const [cachedUser, setCachedUser] = useState<any | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('studyos-user-state');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.username) {
          setCachedUser(parsed);
        }
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleContinueOffline = () => {
    if (cachedUser) {
      onAuthCompleteRef.current({
        uid: cachedUser.uid,
        email: cachedUser.email,
        displayName: cachedUser.displayName,
        isOffline: true,
        username: cachedUser.username,
        onboarded: cachedUser.onboarded,
        fullState: { ...cachedUser, isOffline: true }
      });
    }
  };

  // Detect if running inside an iframe (such as AI Studio preview stage)
  useEffect(() => {
    try {
      if (window.self !== window.top) {
        setIsIframe(true);
      }
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  const onAuthCompleteRef = useRef(onAuthComplete);
  useEffect(() => {
    onAuthCompleteRef.current = onAuthComplete;
  }, [onAuthComplete]);

  // Handle successful pairing or direct complete callback
  const handlePairComplete = useCallback((uid: string, userState: any, localAuthSuccess: boolean) => {
    console.log("[TRACER] handlePairComplete called. localAuthSuccess:", localAuthSuccess);
    onAuthCompleteRef.current({
      uid,
      email: userState?.email,
      displayName: userState?.displayName,
      isOffline: false,
      username: userState?.username,
      onboarded: userState?.onboarded || false,
      fullState: userState
    });

    // If they are not fully onboarded yet (i.e. no username selected),
    // transition local step inside AuthScreen from 'pairing' to 'username'
    if (!userState || !userState.onboarded || !userState.username) {
      console.log("[TRACER] [onPair Callback] User is not onboarded or missing username. Transitioning step to 'username'...");
      setAuthData({
        uid,
        email: userState?.email || undefined,
        displayName: userState?.displayName || undefined
      });
      setStep('username');
    }
  }, []);

  // Set up the Android pairing state listener hook
  const { handleResumeOrFocus } = useAndroidPairing({
    pairingCode,
    step,
    onPairComplete: handlePairComplete,
    onError: useCallback((err: any) => {
      setAuthError({
        message: "Pairing session lost. Please try generating a new code: " + err.message
      });
      setStep('welcome');
    }, []),
    onLocalAuthFailed: useCallback((err: any) => {
      setAuthError({
        message: err.message || "Android pairing authentication failed. Please try again."
      });
    }, []),
  });



  // Monitor initial parent state sync
  useEffect(() => {
    const hasPairCode = typeof window !== 'undefined' && !!localStorage.getItem('pending_pair_code');
    if (hasPairCode) return;

    if (step === 'welcome' && initialUser && initialUser.uid && !initialUser.username) {
      setAuthData({
        uid: initialUser.uid,
        email: initialUser.email,
        displayName: initialUser.displayName
      });
      setStep('username');
    }
  }, [initialUser, step]);

  // Handle Google Sign-In (with iframe popup optimization and standard web fallback)
  const handleGoogleSignIn = async () => {
    setIsLoadingAuth(true);
    setShowIframeWarning(false);
    setAuthError(null);
    setRedirectWarning(null);

    // If running inside a native environment (Android app), route Google login via browser-sync bridge
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        const code = await createDevicePairingCode();
        const key = Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
        localStorage.setItem('pairing_key', key);
        localStorage.setItem('pairing_code', code);
        localStorage.setItem('pairing_step_active', 'true');
        setPairingCode(code);
        setIsAutomaticGoogleFlow(true);
        setStep('pairing');
        
        const liveUrl = "https://ais-dev-5qkfwaoj2q5v7zsluse4zi-358182587374.asia-east1.run.app";
        const realUrl = `${liveUrl}/?pair_code=${code}&k=${key}`;
        
        // Launch standard system web browser to complete authentication
        window.open(realUrl, '_blank');
      } catch (err: any) {
        console.error("Failed to initialize Google pairing bridge:", err);
        setAuthError({
          message: "Failed to initialize Google Sign-In. Please check your internet connection: " + (err.message || String(err))
        });
      } finally {
        setIsLoadingAuth(false);
      }
      return;
    }

    try {
      if (isIframe) {
        const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const popupUrl = `${window.location.origin}${window.location.pathname}?auth_popup=true&session_id=${sessionId}`;
        const width = 500;
        const height = 650;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          popupUrl,
          'studyos_auth_popup',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );
        
        if (!popup) {
          throw new Error("Popup blocked by browser. Please allow popups for this site, or click the 'Open App in New Tab' button above.");
        }
        
        const handleAuthSuccessPayload = async (data: any) => {
          setIsLoadingAuth(true);
          try {
            let firebaseUser = null;
            if (data.idToken) {
              const credential = GoogleAuthProvider.credential(data.idToken, data.accessToken);
              const result = await signInWithCredential(auth, credential);
              firebaseUser = result.user;
            } else {
              firebaseUser = auth.currentUser;
            }

            if (firebaseUser) {
              const uid = firebaseUser.uid;
              const email = firebaseUser.email || undefined;
              const displayName = firebaseUser.displayName || undefined;

              let cloudData = null;
              try {
                cloudData = await loadUserFromFirestore(uid);
              } catch (dbErr) {
                console.warn("Failed to query Firestore inside iframe during message handling:", dbErr);
              }

              if (cloudData && cloudData.onboarded) {
                onAuthComplete({
                  uid,
                  email,
                  displayName,
                  isOffline: false,
                  username: cloudData.username,
                  onboarded: true,
                  fullState: cloudData
                });
              } else {
                const hasPairCode = typeof window !== 'undefined' && !!localStorage.getItem('pending_pair_code');
                if (hasPairCode) {
                  onAuthComplete({
                    uid,
                    email,
                    displayName,
                    isOffline: false,
                    onboarded: false
                  });
                } else {
                  setAuthData({ uid, email, displayName });
                  setStep('username');
                }
              }
            } else {
              throw new Error("No user profile received after popup authorization.");
            }
          } catch (err: any) {
            console.error("Iframe token integration failed:", err);
            setAuthError({
              message: "Syncing Google sign-in with your preview session failed: " + (err.message || String(err))
            });
          } finally {
            setIsLoadingAuth(false);
          }
        };

        const unsubFirestore = onSnapshot(doc(db, 'auth_sessions', sessionId), async (snapshot) => {
          try {
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (data && data.status === 'success' && data.payload) {
                unsubFirestore();
                window.removeEventListener('message', handleAuthMessage);
                clearInterval(pollTimer);
                
                try {
                  await deleteDoc(doc(db, 'auth_sessions', sessionId));
                } catch (cleanErr) {
                  console.warn("Failed to clean up temporary auth session document:", cleanErr);
                }
                
                if (popup && !popup.closed) {
                  popup.close();
                }
                await handleAuthSuccessPayload(data.payload);
              }
            }
          } catch (snapshotErr) {
            console.warn("Error processing Firestore auth session snapshot:", snapshotErr);
          }
        });

        const handleAuthMessage = async (e: MessageEvent) => {
          if (e.data && e.data.type === 'firebase-auth-success') {
            unsubFirestore();
            window.removeEventListener('message', handleAuthMessage);
            clearInterval(pollTimer);
            try { localStorage.removeItem('studyos_auth_success'); } catch (_) {}
            await handleAuthSuccessPayload(e.data);
          }
        };
        window.addEventListener('message', handleAuthMessage);

        const pollTimer = setInterval(async () => {
          try {
            const stored = localStorage.getItem('studyos_auth_success');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.type === 'firebase-auth-success' && Date.now() - parsed.timestamp < 120000) {
                unsubFirestore();
                window.removeEventListener('message', handleAuthMessage);
                clearInterval(pollTimer);
                localStorage.removeItem('studyos_auth_success');
                if (popup && !popup.closed) {
                  popup.close();
                }
                await handleAuthSuccessPayload(parsed);
                return;
              }
            }
          } catch (storageErr) {
            console.warn("localStorage polling error:", storageErr);
          }

          if (popup && popup.closed) {
            unsubFirestore();
            clearInterval(pollTimer);
            window.removeEventListener('message', handleAuthMessage);
            setIsLoadingAuth(false);
          }
        }, 800);

        return;
      }

      // Standard browser Google login popup
      const isMobileDevice = typeof navigator !== 'undefined' && 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobileDevice) {
        console.log("[AuthRouter] Mobile device browser detected. Triggering signInWithRedirect directly...");
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      let result;
      try {
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        result = await signInWithPopup(auth, googleProvider);
      } catch (err: any) {
        if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
          console.warn("Google Sign-In popup blocked. Falling back to Redirect...");
          googleProvider.setCustomParameters({ prompt: 'select_account' });
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw err;
      }

      const user = result.user;
      const email = user.email || undefined;
      const displayName = user.displayName || undefined;
      const uid = user.uid;

      // Capture and store Google credentials
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        console.log("[PAIRING] Storing popup Google credentials in sessionStorage...");
        if (credential.idToken) sessionStorage.setItem('google_id_token', credential.idToken);
        if (credential.accessToken) sessionStorage.setItem('google_access_token', credential.accessToken);
      }

      let cloudData = null;
      try {
        cloudData = await loadUserFromFirestore(uid);
      } catch (dbErr: any) {
        console.error("Database check failed during Google Sign-In:", dbErr);
        throw new Error(
          "Failed to connect to the cloud database. Please verify your internet connection and Firestore setup."
        );
      }

      if (cloudData && cloudData.onboarded) {
        onAuthComplete({
          uid,
          email,
          displayName,
          isOffline: false,
          username: cloudData.username,
          onboarded: true,
          fullState: cloudData
        });
        return;
      }

      const hasPairCode = typeof window !== 'undefined' && !!localStorage.getItem('pending_pair_code');
      if (hasPairCode) {
        onAuthComplete({
          uid,
          email,
          displayName,
          isOffline: false,
          onboarded: false
        });
        return;
      }

      setAuthData({ uid, email, displayName });
      setStep('username');
    } catch (err: any) {
      console.error("Google Authentication error:", err);
      setShowIframeWarning(true);
      
      let errorObj = { message: "" };
      const rawMsg = err.message || String(err);
      
      if (rawMsg.includes("auth/unauthorized-domain")) {
        errorObj.message = `This domain (${window.location.hostname}) is not authorized for OAuth in Firebase. Please add "${window.location.hostname}" to your Authorized Domains in the Firebase Console.`;
      } else if (rawMsg.includes("auth/popup-blocked")) {
        errorObj.message = "The sign-in popup was blocked by your browser. Please allow popups for this site, or open the app in a new tab.";
      } else if (rawMsg.includes("auth/popup-closed-by-user")) {
        errorObj.message = "The sign-in popup was closed before completion. Please try again.";
      } else {
        errorObj.message = "Google Authentication failed: " + rawMsg;
      }
      
      setAuthError(errorObj);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Sign out and reset local state fields
  const handleSignOutAndReset = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      console.log("[StudyOS Trace] [AuthScreen] Explicit sign-out triggered via handleSignOutAndReset()");
      await auth.signOut();
      console.log("[StudyOS Trace] [AuthScreen] auth.signOut() completed successfully in handleSignOutAndReset()");
    } catch (err) {
      console.warn("[StudyOS Trace] [AuthScreen] Error signing out in handleSignOutAndReset():", err);
    }
    setAuthData({});
    setStep('welcome');
    setIsLoadingAuth(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0F12] text-white p-4 font-sans select-none">
      <div className="w-full max-w-md bg-[#141A1F] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Glow ambient decoration */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <WebAuth
                isLoadingAuth={isLoadingAuth}
                isIframe={isIframe}
                showIframeWarning={showIframeWarning}
                setShowIframeWarning={setShowIframeWarning}
                redirectWarning={redirectWarning}
                authError={authError}
                cachedUser={cachedUser}
                handleGoogleSignIn={handleGoogleSignIn}
                handleContinueOffline={handleContinueOffline}
                handleSignOutAndReset={handleSignOutAndReset}
              />
            )}

            {step === 'username' && (
              <UsernameScreen
                authData={authData}
                onAuthComplete={onAuthComplete}
                handleSignOutAndReset={handleSignOutAndReset}
              />
            )}

            {step === 'pairing' && (
              <AndroidPairAuth
                pairingCode={pairingCode}
                isAutomaticGoogleFlow={isAutomaticGoogleFlow}
                setIsAutomaticGoogleFlow={setIsAutomaticGoogleFlow}
                setStep={setStep}
                handleResumeOrFocus={handleResumeOrFocus}
                authError={authError}
                setAuthError={setAuthError}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
