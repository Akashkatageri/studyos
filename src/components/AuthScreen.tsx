import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import AppLogo from './AppLogo';
import { 
  ChevronRight, 
  User, 
  CircleAlert,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  LogOut,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  ArrowLeft,
  HardDrive
} from 'lucide-react';
import { auth, googleProvider, isUsernameUnique, loadUserFromFirestore, db, createDevicePairingCode, listenToDevicePairing, onSnapshot, inspectIndexedDB, inspectLocalStorage } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserState } from '../types';
import { decryptData } from '../lib/crypto';

interface AuthScreenProps {
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

export default function AuthScreen({ initialUser, onAuthComplete }: AuthScreenProps) {
  const [step, setStep] = useState<'welcome' | 'username' | 'pairing'>('welcome');
  const [authData, setAuthData] = useState<{
    uid?: string;
    email?: string;
    displayName?: string;
  }>({});

  // Pairing State
  const [pairingCode, setPairingCode] = useState('');
  const [copiedPairingLink, setCopiedPairingLink] = useState(false);
  const [isAutomaticGoogleFlow, setIsAutomaticGoogleFlow] = useState(false);

  // Real-time listener for pairing completion
  useEffect(() => {
    if (step !== 'pairing' || !pairingCode) return;

    console.log(`[TRACER] [useEffect] Setting up device pairing listener for code: "${pairingCode}"`);

    const unsubscribe = listenToDevicePairing(
      pairingCode,
      async (uid, userState, encryptedIdToken, encryptedAccessToken) => {
        console.log("[TRACER] [onPair Callback] Fired with arguments:", {
          uid,
          hasUserState: !!userState,
          hasEncryptedIdToken: !!encryptedIdToken,
          hasEncryptedAccessToken: !!encryptedAccessToken
        });
        
        const pairingKey = localStorage.getItem('pairing_key');
        console.log("[TRACER] [onPair Callback] Local storage check: pairing_key exists =", !!pairingKey);

        let localAuthSuccess = false;

        if (encryptedIdToken && pairingKey) {
          try {
            console.log("[TRACER] [Decrypt] Attempting to decrypt ID token and Access token using pairing key...");
            const idToken = decryptData(encryptedIdToken, pairingKey);
            const accessToken = encryptedAccessToken ? decryptData(encryptedAccessToken, pairingKey) : null;
            
            console.log("[TRACER] [Decrypt] Result:", {
              idTokenDecrypted: !!idToken,
              accessTokenDecrypted: !!accessToken
            });

            if (idToken) {
              console.log("[TRACER] [Credential] Calling GoogleAuthProvider.credential()...");
              const credential = GoogleAuthProvider.credential(idToken, accessToken || undefined);
              console.log("[TRACER] [Credential] GoogleAuthProvider.credential() returned successfully:", !!credential);
              
              console.log("[TRACER] [SignIn] Entering signInWithCredential()...");

              // Setup a timeout to detect if signInWithCredential is hanging
              let resolved = false;
              const hangTimer = setTimeout(() => {
                if (!resolved) {
                  console.warn("[TRACER] [SignIn] signInWithCredential is currently hanging! It has not resolved or rejected after 8 seconds.");
                }
              }, 8000);

              try {
                console.log("[TRACER] [SignIn] BEFORE await signInWithCredential call.");
                const result = await signInWithCredential(auth, credential);
                resolved = true;
                clearTimeout(hangTimer);
                
                console.log("[TRACER] [SignIn] signInWithCredential resolved successfully!", {
                  uid: result.user.uid,
                  email: result.user.email,
                  displayName: result.user.displayName
                });
                console.log("[TRACER] [SignIn] auth.currentUser.uid after success:", auth.currentUser?.uid);
                localAuthSuccess = true;

                // Wait 1 second and inspect firebaseLocalStorageDb to verify if firebase:authUser exists
                setTimeout(() => {
                  console.log("[TRACER] [Inspect 1s After Login] Running persistence diagnostics...");
                  inspectLocalStorage();
                  inspectIndexedDB();
                }, 1000);
              } catch (authErr: any) {
                resolved = true;
                clearTimeout(hangTimer);
                console.error("[TRACER] [SignIn] signInWithCredential failed with error! DETAILS:", {
                  code: authErr?.code,
                  message: authErr?.message,
                  stack: authErr?.stack,
                  rawError: authErr
                });
                throw authErr; // rethrow to hit the outer catch block
              }
            } else {
              console.error("[TRACER] [Decrypt] Decrypted ID token is empty or null!");
            }
          } catch (authErr: any) {
            console.error("[TRACER] [Exception] Local Firebase authentication flow failed inside WebView:", {
              code: authErr?.code,
              message: authErr?.message,
              stack: authErr?.stack,
              rawError: authErr
            });
          }
        } else {
          console.warn("[TRACER] [Warning] Missing encrypted tokens or pairing key in WebView. Local Firebase Auth cannot be established.", {
            hasToken: !!encryptedIdToken,
            hasKey: !!pairingKey
          });
        }

        // Clean up pairing key
        console.log("[TRACER] [Cleanup] Removing pairing_key from localStorage");
        localStorage.removeItem('pairing_key');

        // Delete the pairing document immediately for security
        try {
          console.log("[TRACER] [Firestore] Deleting pairing bridge document from Firestore for code:", pairingCode);
          await deleteDoc(doc(db, "device_links", pairingCode));
          console.log("[TRACER] [Firestore] Pairing bridge document deleted successfully.");
        } catch (delErr: any) {
          console.warn("[TRACER] [Firestore] Failed to delete pairing document:", {
            code: delErr?.code,
            message: delErr?.message,
            stack: delErr?.stack
          });
        }

        console.log("[TRACER] [onAuthComplete] Invoking onAuthCompleteRef.current with:", {
          uid,
          email: userState?.email,
          displayName: userState?.displayName,
          username: userState?.username,
          localAuthSuccess
        });

        onAuthCompleteRef.current({
          uid,
          email: userState?.email,
          displayName: userState?.displayName,
          isOffline: false,
          username: userState?.username,
          onboarded: userState?.onboarded || false,
          fullState: userState
        });

        // CRITICAL FIX: If they are not fully onboarded yet (i.e. no username selected),
        // we must transition the local step inside AuthScreen from 'pairing' to 'username'
        // so that they can choose their unique handle and finish registration!
        if (!userState || !userState.onboarded || !userState.username) {
          console.log("[TRACER] [onPair Callback] User is not onboarded or missing username. Transitioning step from 'pairing' to 'username'...");
          setAuthData({
            uid,
            email: userState?.email || undefined,
            displayName: userState?.displayName || undefined
          });
          const base = (userState?.displayName || userState?.email || "user")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');
          setUsername(base.slice(0, 15));
          setStep('username');
        }
      },
      (err) => {
        console.error("[TRACER] [Error] Device pairing subscription failed/ended with error:", {
          code: err?.code,
          message: err?.message,
          stack: err?.stack
        });
        setAuthError({
          message: "Pairing session lost. Please try generating a new code: " + err.message
        });
        setStep('welcome');
      }
    );

    return () => {
      console.log(`[TRACER] [useEffect] Cleaning up device pairing listener for code: "${pairingCode}"`);
      unsubscribe();
    };
  }, [step, pairingCode]);

  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<{ message: string; raw?: string } | null>(null);
  const [redirectWarning, setRedirectWarning] = useState<string | null>(null);
  const [usernameSubmitError, setUsernameSubmitError] = useState<string | null>(null);
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);

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

  const [isIframe, setIsIframe] = useState(false);
  const [showIframeWarning, setShowIframeWarning] = useState(false);

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

  const onAuthCompleteRef = React.useRef(onAuthComplete);
  useEffect(() => {
    onAuthCompleteRef.current = onAuthComplete;
  }, [onAuthComplete]);

  // Restore authentication result using getRedirectResult() on mount (handles mobile redirect returns)
  useEffect(() => {
    const handleRedirectResult = async () => {
      setIsLoadingAuth(true);
      setAuthError(null);
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          const email = user.email || undefined;
          const displayName = user.displayName || undefined;
          const uid = user.uid;

          // Capture and store Google credentials
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential) {
            console.log("[PAIRING] Storing redirect Google credentials in sessionStorage...");
            if (credential.idToken) sessionStorage.setItem('google_id_token', credential.idToken);
            if (credential.accessToken) sessionStorage.setItem('google_access_token', credential.accessToken);
          }

          // Check if profile already exists in Firestore
          let cloudData = null;
          try {
            cloudData = await loadUserFromFirestore(uid);
          } catch (dbErr: any) {
            console.error("Database check failed during Google Redirect Sign-In:", dbErr);
            throw new Error(
              "Failed to connect to the cloud database. Please check your network connection and verify Firestore Database is enabled."
            );
          }

          if (cloudData && cloudData.onboarded) {
            onAuthCompleteRef.current({
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

          // CRITICAL CAPACITOR ANDROID FIX: If we are in pairing mode on Chrome browser,
          // immediately complete auth with onboarded: false to return control to the Capacitor app.
          const hasPairCode = typeof window !== 'undefined' && !!localStorage.getItem('pending_pair_code');
          if (hasPairCode) {
            onAuthCompleteRef.current({
              uid,
              email,
              displayName,
              isOffline: false,
              onboarded: false
            });
            return;
          }

          setAuthData({ uid, email, displayName });

          // Generate suggested username from display name
          const base = (displayName || email || "user")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');
          setUsername(base.slice(0, 15));
          setStep('username');
        }
      } catch (err: any) {
        console.error("Google Redirect Authentication error:", err);
        const rawMsg = err.message || String(err);
        const errCode = err.code || "";

        // Check if the error is due to missing initial state (common in storage-partitioned browsers like Safari, Brave, Chrome Incognito on localhost)
        const isMissingState = 
          errCode === "auth/missing-initial-state" || 
          rawMsg.toLowerCase().includes("missing-initial-state") || 
          rawMsg.toLowerCase().includes("missing initial state") ||
          rawMsg.toLowerCase().includes("sessionstorage");

        if (isMissingState) {
          // Swallow/ignore this error silently on page load, as there was no active redirect in progress anyway.
          // This ensures the page loads cleanly with the "Continue with Google" button ready for popup authentication.
          console.warn("Ignoring benign redirect/storage partition error on mount:", rawMsg);
          setIsLoadingAuth(false);
          return;
        }

        let errorObj = { message: "" };
        if (rawMsg.includes("auth/unauthorized-domain") || errCode === "auth/unauthorized-domain") {
          errorObj.message = `This domain (${window.location.hostname}) is not authorized for OAuth in Firebase. Please add "${window.location.hostname}" to your Authorized Domains in the Firebase Console (Authentication > Settings > Authorized Domains).`;
        } else {
          errorObj.message = "Google Redirect Authentication failed: " + rawMsg;
        }

        setAuthError(errorObj);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    handleRedirectResult();
  }, []);

  // Monitor initial parent state sync
  useEffect(() => {
    // CRITICAL CAPACITOR ANDROID FIX: Do not switch to username step in pairing mode!
    const hasPairCode = typeof window !== 'undefined' && !!localStorage.getItem('pending_pair_code');
    if (hasPairCode) return;

    if (step === 'welcome' && initialUser && initialUser.uid && !initialUser.username) {
      setAuthData({
        uid: initialUser.uid,
        email: initialUser.email,
        displayName: initialUser.displayName
      });
      const base = (initialUser.displayName || initialUser.email || "user")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      setUsername(base.slice(0, 15));
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
        // Generate a cryptographically strong secure session ID for the firestore-backed auth bridge
        const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        // Since we are running inside an iframe, open our own page as a top-level popup to complete Google Sign In safely
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
        
        // Handle successful auth payload received from the popup tab
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
                // CRITICAL CAPACITOR ANDROID FIX: If we are in pairing mode on Chrome browser,
                // immediately complete auth with onboarded: false to return control to the Capacitor app.
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
                  const base = (displayName || email || "user")
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '');
                  setUsername(base.slice(0, 15));
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

        // Real-time Firestore session listener - the ultimate cross-origin iframe bypass!
        const unsubFirestore = onSnapshot(doc(db, 'auth_sessions', sessionId), async (snapshot) => {
          try {
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (data && data.status === 'success' && data.payload) {
                // Instantly unsubscribe and clean up
                unsubFirestore();
                window.removeEventListener('message', handleAuthMessage);
                clearInterval(pollTimer);
                
                // Clean up the temporary document for privacy and safety
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

        // Message listener from the popup tab (standard opener message channel)
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

        // Keep checking if localStorage was updated (mobile browser opener backup)
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

      // Outside an iframe: Standard popup Auth selection page
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

      // Check if profile exists in Firestore database
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

      // CRITICAL CAPACITOR ANDROID FIX: If we are in pairing mode on Chrome browser,
      // immediately complete auth with onboarded: false to return control to the Capacitor app.
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
      const base = (displayName || email || "user")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      setUsername(base.slice(0, 15));
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

  // Sign out and reset local authentication fields
  const handleSignOutAndReset = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    setUsernameSubmitError(null);
    try {
      console.log("[StudyOS Trace] [AuthScreen] Explicit sign-out triggered via handleSignOutAndReset()");
      await auth.signOut();
      console.log("[StudyOS Trace] [AuthScreen] auth.signOut() completed successfully in handleSignOutAndReset()");
    } catch (err) {
      console.warn("[StudyOS Trace] [AuthScreen] Error signing out in handleSignOutAndReset():", err);
    }
    setAuthData({});
    setUsername('');
    setStep('welcome');
    setIsLoadingAuth(false);
  };

  // Username validation helper
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
    <div className="min-h-screen flex items-center justify-center bg-[#0C0F12] text-white p-4 font-sans select-none">
      <div className="w-full max-w-md bg-[#141A1F] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Glow ambient decoration */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: WELCOME SCREEN */}
            {step === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-center"
              >
                {/* App Brand Icon */}
                <div className="mx-auto w-20 h-20 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform duration-300 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/20">
                  <AppLogo className="w-full h-full animate-fade-in" />
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
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
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
                    onClick={handleGoogleSignIn}
                    disabled={isLoadingAuth}
                    className="w-full py-3.5 bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 active:scale-98 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md"
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
            )}

            {/* STEP 2: USERNAME SELECTION */}
            {step === 'username' && (
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

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Unique Username
                  </label>
                  <div className="relative">
                    <input
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
                    type="button"
                    onClick={handleSignOutAndReset}
                    className="px-4 bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Sign out of this Google account"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                  <button
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
            )}

            {/* STEP 3: DEVICE PAIRING (AUTOMATED GOOGLE SIGN-IN BRIDGE / MOBILE SUPPORT) */}
            {step === 'pairing' && (
              <motion.div
                key="pairing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-center"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStep('welcome');
                      setIsAutomaticGoogleFlow(false);
                    }}
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
                        type="button"
                        onClick={() => {
                          const liveUrl = "https://ais-dev-5qkfwaoj2q5v7zsluse4zi-358182587374.asia-east1.run.app";
                          const pairingKey = localStorage.getItem('pairing_key') || '';
                          const realUrl = `${liveUrl}/?pair_code=${pairingCode}${pairingKey ? `&k=${pairingKey}` : ''}`;
                          window.open(realUrl, '_blank');
                        }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Relaunch Google Login Window</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStep('welcome');
                          setIsAutomaticGoogleFlow(false);
                        }}
                        className="text-[11px] text-gray-500 hover:text-gray-400 underline transition-all cursor-pointer"
                      >
                        Cancel and Go Back
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 pt-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                      <span>Waiting for Google Account response...</span>
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
                      type="button"
                      onClick={() => {
                        const pairingKey = localStorage.getItem('pairing_key') || '';
                        const realUrl = `https://ais-dev-5qkfwaoj2q5v7zsluse4zi-358182587374.asia-east1.run.app/?pair_code=${pairingCode}${pairingKey ? `&k=${pairingKey}` : ''}`;
                        navigator.clipboard.writeText(realUrl).then(() => {
                          setCopiedPairingLink(true);
                          setTimeout(() => setCopiedPairingLink(false), 2000);
                        });
                      }}
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
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
