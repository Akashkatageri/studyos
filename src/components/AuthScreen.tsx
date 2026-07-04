import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  User, 
  CircleAlert,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  LogOut,
  RotateCcw,
  ExternalLink,
  Smartphone,
  Sparkles,
  Link2,
  Copy,
  Check
} from 'lucide-react';
import { auth, googleProvider, isUsernameUnique, db, loadUserFromFirestore } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithCredential, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { UserState } from '../types';

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
  const [step, setStep] = useState<'welcome' | 'username'>('welcome');
  const [isOffline, setIsOffline] = useState(false);
  const [authData, setAuthData] = useState<{
    uid?: string;
    email?: string;
    displayName?: string;
  }>({});

  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<{ message: string; isOfflineError?: boolean; raw?: string } | null>(null);
  const [redirectWarning, setRedirectWarning] = useState<string | null>(null);
  const [usernameSubmitError, setUsernameSubmitError] = useState<string | null>(null);
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);

  const [isIframe, setIsIframe] = useState(false);
  const [showIframeWarning, setShowIframeWarning] = useState(false);
  const [showDomainWarning, setShowDomainWarning] = useState(false);

  // Device pairing states
  const [deviceLinkCode, setDeviceLinkCode] = useState<string | null>(null);
  const [deviceLinkStatus, setDeviceLinkStatus] = useState<'idle' | 'generating' | 'waiting' | 'authorized' | 'failed'>('idle');
  const [incomingPairCode, setIncomingPairCode] = useState<string | null>(null);
  const [pairingSuccess, setPairingSuccess] = useState(false);
  const [isPairingSubmitting, setIsPairingSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentWebUser, setCurrentWebUser] = useState<any>(null);

  // Monitor auth state to support one-click authorization when already logged in on the web
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentWebUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Detect incoming pairing code in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('pair_code');
      if (code && /^[0-9]{6}$/.test(code)) {
        setIncomingPairCode(code);
      }
    }
  }, []);

  const isNativeAndroid = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' || 
    (window as any).Capacitor || 
    (window.location.hostname === 'localhost' && /android/i.test(navigator.userAgent))
  );

  useEffect(() => {
    try {
      if (window.self !== window.top) {
        setIsIframe(true);
      }
    } catch (e) {
      setIsIframe(true);
    }

    // Verify if current hostname is standard or not to provide a dynamic setup warning
    const hostname = window.location.hostname;
    if (
      hostname !== "localhost" && 
      hostname !== "127.0.0.1" && 
      !hostname.endsWith(".firebaseapp.com") && 
      !hostname.endsWith(".web.app")
    ) {
      setShowDomainWarning(true);
    }
  }, []);

  const onAuthCompleteRef = React.useRef(onAuthComplete);
  useEffect(() => {
    onAuthCompleteRef.current = onAuthComplete;
  }, [onAuthComplete]);

  // Restore authentication result using getRedirectResult() on mount
  useEffect(() => {
    const handleRedirectResult = async () => {
      if (isNativeAndroid) {
        setIsLoadingAuth(false);
        return; // Skip getRedirectResult on native Android to avoid errors/hangs
      }
      setIsLoadingAuth(true);
      setAuthError(null);
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          const params = new URLSearchParams(window.location.search);
          const pCode = params.get('pair_code');
          if (pCode && /^[0-9]{6}$/.test(pCode)) {
            const idToken = await user.getIdToken();
            await setDoc(doc(db, 'device_links', pCode), {
              status: 'authorized',
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              idToken,
              accessToken: null
            }, { merge: true });
            setPairingSuccess(true);
            setIsLoadingAuth(false);
            return;
          }

          const email = user.email || undefined;
          const displayName = user.displayName || undefined;
          const uid = user.uid;

          // Check if profile already exists in Firestore
          let cloudData = null;
          try {
            cloudData = await loadUserFromFirestore(uid);
          } catch (dbErr: any) {
            console.warn("Database check failed during Google Redirect Sign-In, preparing fallback:", dbErr);
            const errMsg = dbErr?.message || String(dbErr);
            throw new Error(JSON.stringify({
              error: "Failed to connect to the cloud database. " + 
                     "If you are setting up a new Firebase project, make sure 'Firestore Database' is created/enabled in your Firebase Console. " +
                     "Alternatively, you can choose 'Continue Offline using Google Profile' below to start your journey locally.",
              isOfflineError: true,
              raw: errMsg
            }));
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

          setAuthData({ uid, email, displayName });
          setIsOffline(false);

          // Generate suggested username from display name
          const base = (displayName || email || "user")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');
          setUsername(base.slice(0, 15));
          setStep('username');
        }
      } catch (err: any) {
        console.error("Google Redirect Authentication error:", err);
        let errorObj = { message: "", isOfflineError: false, raw: "" };
        const rawMsg = err.message || String(err);

        if (rawMsg.includes("auth/missing-initial-state") || rawMsg.includes("missing-initial-state")) {
          setRedirectWarning("Your browser's privacy or cookie settings interrupted the redirect authentication. Don't worry! Just click 'Continue with Google' again to log in securely using the popup method.");
          setIsLoadingAuth(false);
          return;
        }

        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) {
            errorObj.message = parsed.error;
            errorObj.isOfflineError = parsed.isOfflineError;
            errorObj.raw = parsed.raw;
          }
        } catch (parseErr) {
          if (rawMsg.includes("auth/unauthorized-domain")) {
            errorObj.message = `This domain (${window.location.hostname}) is not authorized for OAuth operations in your Firebase project. Please add it to your Authorized Domains in the Firebase Console (Authentication > Settings > Authorized Domains).`;
            errorObj.raw = rawMsg;
          } else {
            const isOffline = rawMsg.includes("offline") || rawMsg.includes("client is offline") || rawMsg.includes("network") || rawMsg.includes("failed-precondition") || rawMsg.includes("permission-denied");
            errorObj.message = isOffline
              ? "Failed to connect to the cloud database. If you are setting up a new Firebase project, make sure 'Firestore Database' is created/enabled in your Firebase Console. Alternatively, you can choose to Continue Offline."
              : "Google Redirect Authentication failed: " + rawMsg;
            errorObj.isOfflineError = isOffline;
            errorObj.raw = rawMsg;
          }
        }

        setAuthError(errorObj);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    handleRedirectResult();
  }, []);

  useEffect(() => {
    // If the parent already has an authenticated user who is not yet onboarded (username is missing),
    // and the AuthScreen is still on the welcome step, transition them directly to username selection.
    if (step === 'welcome' && initialUser && initialUser.uid && !initialUser.username) {
      setAuthData({
        uid: initialUser.uid,
        email: initialUser.email,
        displayName: initialUser.displayName
      });
      setIsOffline(false);
      const base = (initialUser.displayName || initialUser.email || "user")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      setUsername(base.slice(0, 15));
      setStep('username');
    }
  }, [initialUser, step]);

  // 1. Google Sign-In with Desktop (Popup) and Mobile (Redirect) optimization
  const handleGoogleSignIn = async () => {
    setIsLoadingAuth(true);
    setShowIframeWarning(false);
    setAuthError(null);
    setRedirectWarning(null);
    try {
      if (isNativeAndroid) {
        await startDevicePairing();
        return;
      }

      if (isIframe) {
        // Since we are running inside an iframe, open our own page as a top-level popup to complete Google Sign In safely!
        const popupUrl = `${window.location.origin}${window.location.pathname}?auth_popup=true`;
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
        
        // Shared handler for successful authentication payload (used by window message AND localStorage poll)
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
                setAuthData({ uid, email, displayName });
                setIsOffline(false);
                
                // Suggest username
                const base = (displayName || email || "user")
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, '');
                setUsername(base.slice(0, 15));
                setStep('username');
              }
            } else {
              throw new Error("No user profile received after popup authorization.");
            }
          } catch (err: any) {
            console.error("Iframe token integration failed:", err);
            setAuthError({
              message: "Syncing Google sign-in with your preview session failed: " + (err.message || String(err)),
              isOfflineError: false,
              raw: String(err)
            });
          } finally {
            setIsLoadingAuth(false);
          }
        };

        // Listen for message from the popup
        const handleAuthMessage = async (e: MessageEvent) => {
          if (e.data && e.data.type === 'firebase-auth-success') {
            window.removeEventListener('message', handleAuthMessage);
            clearInterval(pollTimer);
            try { localStorage.removeItem('studyos_auth_success'); } catch (_) {}
            await handleAuthSuccessPayload(e.data);
          }
        };
        window.addEventListener('message', handleAuthMessage);

        // Keep checking if local storage was updated (mobile browser opener backup) OR popup closed
        const pollTimer = setInterval(async () => {
          try {
            const stored = localStorage.getItem('studyos_auth_success');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.type === 'firebase-auth-success' && Date.now() - parsed.timestamp < 120000) {
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
            clearInterval(pollTimer);
            window.removeEventListener('message', handleAuthMessage);
            setIsLoadingAuth(false);
          }
        }, 800);

        return;
      }

      // On desktop AND mobile direct tabs: Try using signInWithPopup() first since it works beautifully on mobile direct tabs
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (err: any) {
        // Fallback to signInWithRedirect if popup is blocked by the mobile browser configuration
        if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
          console.warn("Google Sign-In popup blocked. Falling back to Redirect...");
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw err;
      }

      const user = result.user;
      if (incomingPairCode) {
        await handleAuthorizeDevice(user);
        return;
      }
      
      const email = user.email || undefined;
      const displayName = user.displayName || undefined;
      const uid = user.uid;

      // Check if profile already exists in Firestore (Any of the separate collections exist)
      let cloudData = null;
      try {
        cloudData = await loadUserFromFirestore(uid);
      } catch (dbErr: any) {
        console.warn("Database check failed during Google Sign-In, preparing fallback:", dbErr);
        const errMsg = dbErr?.message || String(dbErr);
        throw new Error(JSON.stringify({
          error: "Failed to connect to the cloud database. " + 
                 "If you are setting up a new Firebase project, make sure 'Firestore Database' is created/enabled in your Firebase Console.",
          isOfflineError: false,
          raw: errMsg
        }));
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

      setAuthData({ uid, email, displayName });
      setIsOffline(false);

      // Generate suggested username from display name
      const base = (displayName || email || "user")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      setUsername(base.slice(0, 15));
      setStep('username');
    } catch (err: any) {
      console.error("Google Authentication error:", err);
      setShowIframeWarning(true);
      
      let errorObj = { message: "", isOfflineError: false, raw: "" };
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          errorObj.message = parsed.error;
          errorObj.isOfflineError = parsed.isOfflineError;
          errorObj.raw = parsed.raw;
        }
      } catch (parseErr) {
        const rawMsg = err.message || String(err);
        
        // Handle specific Firebase popup blocker and cancellation errors elegantly
        if (rawMsg.includes("auth/unauthorized-domain")) {
          errorObj.message = `This domain (${window.location.hostname}) is not authorized for OAuth in Firebase. Please add "${window.location.hostname}" to your Authorized Domains in the Firebase Console (Authentication > Settings > Authorized Domains).`;
          errorObj.raw = rawMsg;
        } else if (rawMsg.includes("auth/popup-blocked")) {
          errorObj.message = "The sign-in popup was blocked by your browser. Please allow popups for this site, or open the app in a new tab.";
          errorObj.raw = rawMsg;
        } else if (rawMsg.includes("auth/popup-closed-by-user")) {
          errorObj.message = "The sign-in popup was closed before completing. If you didn't close it, please check your network connection or try again.";
          errorObj.raw = rawMsg;
        } else {
          const isOffline = rawMsg.includes("offline") || rawMsg.includes("client is offline") || rawMsg.includes("network") || rawMsg.includes("failed-precondition") || rawMsg.includes("permission-denied");
          errorObj.message = isOffline
            ? "Failed to connect to the cloud database. If you are setting up a new Firebase project, make sure 'Firestore Database' is created/enabled in your Firebase Console. Alternatively, you can choose to Continue Offline."
            : "Google Authentication failed: " + rawMsg;
          errorObj.isOfflineError = isOffline;
          errorObj.raw = rawMsg;
        }
      }
      
      setAuthError(errorObj);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Sign out / Disconnect active session to switch Google account or restart flow
  const handleSignOutAndReset = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    setUsernameSubmitError(null);
    try {
      await auth.signOut();
    } catch (err) {
      console.warn("Error signing out:", err);
    }
    setAuthData({});
    setUsername('');
    setIsOffline(false);
    setStep('welcome');
    setIsLoadingAuth(false);
  };

  // Setup a secure, local offline session
  const handleContinueOffline = () => {
    setIsOffline(true);
    setAuthData({
      uid: "offline_user_" + Math.floor(1000 + Math.random() * 9000),
      displayName: "Offline Scholar",
      email: "offline@studyos.local"
    });
    // Set a default available username and step forward
    setUsername("scholar_" + Math.floor(100 + Math.random() * 900));
    setStep('username');
  };

  // Start the pairing process on native Android
  const startDevicePairing = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    setDeviceLinkStatus('generating');
    try {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setDeviceLinkCode(code);
      setDeviceLinkStatus('waiting');
      
      const linkRef = doc(db, 'device_links', code);
      await setDoc(linkRef, {
        code,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      const unsubscribe = onSnapshot(linkRef, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.status === 'authorized') {
            unsubscribe();
            setIsLoadingAuth(true);
            try {
              const credential = GoogleAuthProvider.credential(data.idToken, data.accessToken || undefined);
              const result = await signInWithCredential(auth, credential);
              const firebaseUser = result.user;
              
              if (firebaseUser) {
                try {
                  await deleteDoc(linkRef);
                } catch (delErr) {
                  console.warn("Could not delete temporary pairing document:", delErr);
                }

                const uid = firebaseUser.uid;
                const email = firebaseUser.email || undefined;
                const displayName = firebaseUser.displayName || undefined;
                
                let cloudData = null;
                try {
                  cloudData = await loadUserFromFirestore(uid);
                } catch (dbErr) {
                  console.warn("Failed to load user during device linking:", dbErr);
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
                } else {
                  setAuthData({ uid, email, displayName });
                  setIsOffline(false);
                  
                  const base = (displayName || email || "user")
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '');
                  setUsername(base.slice(0, 15));
                  setStep('username');
                }
              }
            } catch (authErr: any) {
              console.error("Sign-in with paired credentials failed:", authErr);
              setAuthError({
                message: "Authentication failed. Please verify your connection: " + (authErr.message || String(authErr)),
                isOfflineError: false
              });
              setDeviceLinkStatus('failed');
            } finally {
              setIsLoadingAuth(false);
            }
          }
        }
      }, (err) => {
        console.error("Device link live listener error:", err);
      });

      // Timeout after 5 minutes
      setTimeout(async () => {
        try {
          unsubscribe();
          await deleteDoc(linkRef);
        } catch (_) {}
        setDeviceLinkStatus((prev) => prev === 'waiting' ? 'failed' : prev);
      }, 300000);

    } catch (err: any) {
      console.error("Failed to generate device link:", err);
      setAuthError({
        message: "Failed to initialize secure link. Please check your internet connection.",
        isOfflineError: false
      });
      setDeviceLinkStatus('failed');
      setIsLoadingAuth(false);
    }
  };

  // Handles completing the pairing handshake on the WEB browser side
  const handleAuthorizeDevice = async (userObject?: any) => {
    const activeUser = userObject || auth.currentUser;
    if (!activeUser || !incomingPairCode) return;
    
    setIsPairingSubmitting(true);
    setAuthError(null);
    try {
      const idToken = await activeUser.getIdToken();
      
      const linkRef = doc(db, 'device_links', incomingPairCode);
      await setDoc(linkRef, {
        status: 'authorized',
        uid: activeUser.uid,
        email: activeUser.email,
        displayName: activeUser.displayName,
        idToken,
        accessToken: null
      }, { merge: true });
      
      setPairingSuccess(true);
    } catch (err: any) {
      console.error("Failed to authorize paired device:", err);
      setAuthError({
        message: "Failed to authorize device: " + (err.message || String(err)),
        isOfflineError: false
      });
    } finally {
      setIsPairingSubmitting(false);
    }
  };

  // 3. Username validation effect
  useEffect(() => {
    if (!username) {
      setIsAvailable(null);
      setUsernameError(null);
      setSuggestions([]);
      return;
    }

    // Letters, numbers, underscores only
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

    // Bypassing network check if user selected offline mode
    if (isOffline) {
      setIsAvailable(true);
      setSuggestions([]);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);

    const checkUnique = setTimeout(async () => {
      try {
        const unique = await isUsernameUnique(username, authData.uid);
        setIsAvailable(unique);
        if (!unique) {
          setUsernameError("This username is already taken.");
          // Generate suggestions
          const cleanBase = username.slice(0, 12);
          const sugList = [
            `${cleanBase}_vtu`,
            `${cleanBase}_stud`,
            `${cleanBase}_${Math.floor(100 + Math.random() * 900)}`
          ];
          setSuggestions(sugList);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Error checking username uniqueness:", err);
        // Fallback: if checking uniqueness fails due to offline/uninitialized db, allow offline transition
        setIsAvailable(true);
      } finally {
        setIsValidating(false);
      }
    }, 400);

    return () => clearTimeout(checkUnique);
  }, [username, authData.uid, isOffline]);

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
          "Could not reserve username in cloud database. If you just set up Firebase, make sure the Firestore Database is fully enabled in your Firebase console."
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
      isOffline,
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
            
            {/* 1. WEBPAGE PORTAL: INCOMING DEVICE LINKING SUCCESS */}
            {incomingPairCode && pairingSuccess && (
              <motion.div
                key="pairing-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-center py-6"
              >
                <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold font-display text-white">
                    Device Linked Successfully!
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                    Your Android app has been paired with your Google Account <code className="px-1.5 py-0.5 bg-gray-950 rounded text-emerald-400 font-mono text-[11px]">{auth.currentUser?.email}</code>.
                  </p>
                </div>
                <div className="p-4 bg-emerald-950/10 border border-emerald-900/30 rounded-2xl text-[11px] text-gray-300 leading-relaxed font-sans">
                  You can now return to the StudyOS app on your Android device. It will automatically log you in. You can close this web browser tab.
                </div>
                <button
                  onClick={() => window.close()}
                  className="w-full py-2.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close Window
                </button>
              </motion.div>
            )}

            {/* 2. WEBPAGE PORTAL: ALREADY SIGNED-IN USER PAIRING REQUEST */}
            {incomingPairCode && auth.currentUser && !pairingSuccess && (
              <motion.div
                key="pairing-auth-request"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-center py-4"
              >
                <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center shadow-lg">
                  <Link2 className="w-8 h-8 text-blue-400 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold font-display text-white">
                    Link Android Device
                  </h2>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed font-sans">
                    StudyOS wants to link your Android device using code <strong className="text-blue-400 font-mono text-sm tracking-wider">{incomingPairCode}</strong> to your active Google Account:
                  </p>
                  <div className="inline-block px-3 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-xs font-mono text-blue-300 mt-2">
                    {auth.currentUser.email}
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-xl text-xs text-red-400 text-left font-sans">
                    {authError.message}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleAuthorizeDevice()}
                    disabled={isPairingSubmitting}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isPairingSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>Authorize & Link Device</span>
                  </button>
                  
                  <button
                    onClick={() => auth.signOut()}
                    className="w-full py-2 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Use a different account
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. NATIVE ANDROID: PAIRING CODE GENERATOR & INSTRUCTIONS SCREEN */}
            {isNativeAndroid && deviceLinkStatus !== 'idle' && (
              <motion.div
                key="android-pairing-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-center py-4"
              >
                <div className="mx-auto w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center shadow-lg">
                  <Smartphone className="w-8 h-8 text-indigo-400" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold font-display text-white">
                    Verify Google Account
                  </h2>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed font-sans">
                    To connect your Google Account securely on Android, please verify this device.
                  </p>
                </div>

                {deviceLinkStatus === 'generating' && (
                  <div className="py-8 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-xs text-gray-500 font-mono">Generating secure code...</p>
                  </div>
                )}

                {deviceLinkStatus === 'waiting' && (
                  <div className="space-y-6">
                    {/* The 6-digit Code */}
                    <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 shadow-inner">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                        Your Verification Code
                      </div>
                      <div className="text-3xl font-black tracking-[0.2em] text-blue-400 font-mono pl-[0.2em]">
                        {deviceLinkCode?.slice(0,3)} {deviceLinkCode?.slice(3)}
                      </div>
                    </div>

                    {/* Instruction Steps */}
                    <div className="text-left space-y-4 bg-gray-950/40 p-4 border border-gray-900 rounded-2xl">
                      <div className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">
                          1
                        </div>
                        <div className="text-xs text-gray-300 leading-relaxed font-sans flex-1">
                          Click the button below to authorize on this device, or open this link on your computer/phone:
                          <div className="mt-1.5 flex items-center gap-2 bg-gray-950 rounded-lg p-2 border border-gray-900">
                            <span className="text-[10px] font-mono text-gray-400 truncate select-all flex-1">
                              {window.location.host}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?pair_code=${deviceLinkCode}`);
                                setCopiedLink(true);
                                setTimeout(() => setCopiedLink(false), 2000);
                              }}
                              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-900 transition-all cursor-pointer"
                            >
                              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">
                          2
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed font-sans">
                          Sign in with your Google account.
                        </p>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">
                          3
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed font-sans">
                          This screen will update and sign you in automatically!
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <button
                        onClick={() => window.open(`${window.location.origin}${window.location.pathname}?pair_code=${deviceLinkCode}`, '_blank')}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Authorize on this Device</span>
                      </button>

                      <button
                        onClick={() => setDeviceLinkStatus('idle')}
                        className="w-full py-2 bg-gray-900/60 border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1 animate-pulse font-sans">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                      <span>Waiting for secure pairing authorization...</span>
                    </p>
                  </div>
                )}

                {deviceLinkStatus === 'failed' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl text-left space-y-2">
                      <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Pairing Timed Out or Failed</span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-sans">
                        The 5-minute session expired or there was a connection error. Please try again.
                      </p>
                    </div>
                    <button
                      onClick={startDevicePairing}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => setDeviceLinkStatus('idle')}
                      className="w-full py-2 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. STEP 1: WELCOME SCREEN */}
            {step === 'welcome' && (!incomingPairCode || !auth.currentUser || pairingSuccess) && (!isNativeAndroid || deviceLinkStatus === 'idle') && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-center"
              >
                {/* App Brand Icon */}
                <div className="mx-auto w-20 h-20 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(124,92,255,0.35)] hover:scale-105 transition-transform duration-300">
                  <img 
                    src="/logo.png" 
                    alt="StudyOS Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
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
                      Google Sign-In might be blocked by iframe cookie restrictions. Open StudyOS in a new tab for a seamless experience!
                    </p>
                    <button
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open App in New Tab</span>
                    </button>
                  </div>
                )}

                {incomingPairCode && (
                  <div className="p-4 bg-blue-950/20 border border-blue-900/40 rounded-2xl text-left space-y-2 shadow-md">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <Link2 className="w-4 h-4 text-blue-400 flex-shrink-0 animate-pulse" />
                      <span>Device Pairing Mode Active</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                      You are linking an Android device with code <strong className="text-blue-300 font-mono text-xs">{incomingPairCode}</strong>. Please sign in with Google below to authorize this device instantly.
                    </p>
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

                {isNativeAndroid && (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-2xl text-left space-y-2 shadow-md">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs animate-pulse">
                      <Smartphone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span>Android App Mode Fully Enabled</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                      Secure Google Account Sync is active! Click <strong>Continue with Google</strong> below to pair this device with your Google account.
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
                    
                    <div className="pt-1.5 border-t border-red-900/30 flex flex-col gap-2">
                      {!isNativeAndroid && (
                        <button
                          onClick={handleContinueOffline}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Continue Offline instead</span>
                        </button>
                      )}
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

                <div className="space-y-3 pt-3">
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

                  {/* Study Offline Option */}
                  {!isNativeAndroid && (
                    <button
                      type="button"
                      onClick={handleContinueOffline}
                      disabled={isLoadingAuth}
                      className="w-full py-3 bg-[#111114] border border-gray-800 hover:bg-gray-900 hover:border-gray-700 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Study Offline (Local Session)</span>
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-gray-500 pt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500/80" />
                  <span>Secure Account Authentication</span>
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

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
