import { useEffect, useRef, useCallback } from 'react';
import { enableNetwork } from 'firebase/firestore';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, listenToDevicePairing, inspectLocalStorage, inspectIndexedDB } from '../../lib/firebase';
import { decryptData } from '../../lib/crypto';
import { fetchPairingStatusRest, fetchPairingStatusSDK, deletePairingDoc } from '../services/pairingService';

interface UseAndroidPairingProps {
  pairingCode: string;
  step: 'welcome' | 'username' | 'pairing';
  onPairComplete: (uid: string, userState: any, localAuthSuccess: boolean) => void;
  onError: (err: any) => void;
  onLocalAuthFailed?: (err: any) => void;
}

export function useAndroidPairing({
  pairingCode,
  step,
  onPairComplete,
  onError,
  onLocalAuthFailed,
}: UseAndroidPairingProps) {
  const onPairCompleteRef = useRef(onPairComplete);
  const onErrorRef = useRef(onError);
  const onLocalAuthFailedRef = useRef(onLocalAuthFailed);

  useEffect(() => {
    onPairCompleteRef.current = onPairComplete;
    onErrorRef.current = onError;
    onLocalAuthFailedRef.current = onLocalAuthFailed;
  }, [onPairComplete, onError, onLocalAuthFailed]);

  const handleSuccessfulPair = useCallback(async (
    uid: string,
    userState: any,
    encryptedIdToken: string | null,
    encryptedAccessToken: string | null
  ) => {
    console.log("[TRACER] [handleSuccessfulPair] Starting pairing and authentication completion...", {
      uid,
      hasUserState: !!userState,
      hasEncryptedIdToken: !!encryptedIdToken,
      hasEncryptedAccessToken: !!encryptedAccessToken
    });

    const pairingKey = localStorage.getItem('pairing_key');
    let localAuthSuccess = false;

    // 1. signInWithCredential() completes successfully.
    if (encryptedIdToken && pairingKey) {
      try {
        console.log("[TRACER] [handleSuccessfulPair] Decrypting tokens...");
        const idToken = decryptData(encryptedIdToken, pairingKey);
        const accessToken = encryptedAccessToken ? decryptData(encryptedAccessToken, pairingKey) : null;

        if (idToken) {
          console.log("[TRACER] [handleSuccessfulPair] Calling signInWithCredential...");
          const credential = GoogleAuthProvider.credential(idToken, accessToken || undefined);
          await signInWithCredential(auth, credential);
          
          // 2. auth.currentUser is confirmed to be non-null.
          if (auth.currentUser) {
            console.log("[TRACER] [handleSuccessfulPair] signInWithCredential resolved successfully! auth.currentUser is non-null UID:", auth.currentUser.uid);
            localAuthSuccess = true;

            // Run persistence diagnostics after successful sign in
            setTimeout(() => {
              console.log("[TRACER] [Inspect 1s After Login] Running persistence diagnostics...");
              inspectLocalStorage();
              inspectIndexedDB();
            }, 1000);
          } else {
            throw new Error("signInWithCredential completed, but auth.currentUser remains null.");
          }
        } else {
          throw new Error("Decrypted ID token is empty or invalid.");
        }
      } catch (authErr: any) {
        console.error("[TRACER] [handleSuccessfulPair] Local Firebase auth failed! DETAILS:", {
          code: authErr?.code,
          message: authErr?.message,
          stack: authErr?.stack,
          rawError: authErr
        });
        if (onLocalAuthFailedRef.current) {
          onLocalAuthFailedRef.current(authErr);
        }
        return; // Abort cleanup and deletion! Keep the pairing state and document.
      }
    } else {
      const missingErr = new Error("Missing encrypted pairing tokens or decryption key in storage.");
      console.warn("[TRACER] [handleSuccessfulPair] Missing tokens or pairing key in localStorage. Key exists:", !!pairingKey);
      if (onLocalAuthFailedRef.current) {
        onLocalAuthFailedRef.current(missingErr);
      }
      return; // Abort cleanup and deletion!
    }

    // 3. onAuthComplete() finishes successfully (called via onPairCompleteRef)
    try {
      console.log("[TRACER] [handleSuccessfulPair] Triggering onPairComplete...");
      onPairCompleteRef.current(uid, userState || null, localAuthSuccess);
      console.log("[TRACER] [handleSuccessfulPair] onPairComplete completed successfully.");
    } catch (cbErr) {
      console.error("[TRACER] [handleSuccessfulPair] Exception in onPairComplete callback:", cbErr);
      if (onLocalAuthFailedRef.current) {
        onLocalAuthFailedRef.current(cbErr);
      }
      return; // Abort cleanup and deletion!
    }

    // 4. Only then remove pairing states from localStorage
    console.log("[TRACER] [handleSuccessfulPair] Removing pairing keys and state from localStorage.");
    localStorage.removeItem('pairing_key');
    localStorage.removeItem('pairing_code');
    localStorage.removeItem('pairing_step_active');

    // 5. Only then delete the Firestore pairing document
    try {
      console.log(`[TRACER] [handleSuccessfulPair] Deleting pairing document for code: "${pairingCode}"...`);
      await deletePairingDoc(pairingCode);
      console.log("[TRACER] [handleSuccessfulPair] Pairing document deleted successfully.");
    } catch (delErr) {
      console.error("[TRACER] [handleSuccessfulPair] Failed to delete pairing document:", delErr);
    }

    console.log("[TRACER] [handleSuccessfulPair] Pairing complete flow finished.");
  }, [pairingCode]);

  const handleResumeOrFocus = useCallback(async () => {
    if (step !== 'pairing' || !pairingCode) {
      console.log(`[TRACER] [Focus/Resume] handleResumeOrFocus skipped because step is "${step}" and pairingCode is "${pairingCode}"`);
      return;
    }

    console.log(`[TRACER] [Focus/Resume] App focus/resume/check triggered. Verifying device pairing status for code: "${pairingCode}"...`);
    try {
      // Enable Firestore network first to recover from background sleep
      try {
        await enableNetwork(db);
        console.log("[TRACER] [Focus/Resume] Firestore network enabled successfully.");
      } catch (e) {
        console.warn("[TRACER] [Focus/Resume] enableNetwork failed:", e);
      }

      let data = await fetchPairingStatusRest(pairingCode);

      // Fallback to standard Firestore SDK getDoc if REST fetch failed/returned empty
      if (!data) {
        console.log("[TRACER] [Focus/Resume] REST fetch empty. Falling back to standard Firestore SDK getDoc...");
        data = await fetchPairingStatusSDK(pairingCode);
      }

      if (data && data.status === "paired" && data.uid) {
        console.log("[TRACER] [Focus/Resume] Pairing document is PAIRED. Processing authentication via handleSuccessfulPair...");
        await handleSuccessfulPair(
          data.uid,
          data.userState || null,
          data.encryptedIdToken || null,
          data.encryptedAccessToken || null
        );
      } else {
        if (data) {
          console.log(`[TRACER] [Focus/Resume] Pairing document is still pending pairing (status: "${data?.status || 'unknown'}", uid: "${data?.uid || 'none'}").`);
        } else {
          console.log(`[TRACER] [Focus/Resume] Pairing document does not exist/could not be loaded for code: "${pairingCode}"`);
        }
      }
    } catch (err) {
      console.error("[TRACER] [Focus/Resume] Exception in focus/resume pairing check:", err);
    }
  }, [step, pairingCode, handleSuccessfulPair]);

  // Set up Firestore onSnapshot subscription
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
        
        await handleSuccessfulPair(uid, userState, encryptedIdToken, encryptedAccessToken);
      },
      (err) => {
        console.error("[TRACER] [Error] Device pairing subscription failed/ended with error:", {
          code: err?.code,
          message: err?.message,
          stack: err?.stack
        });
        onErrorRef.current(err);
      }
    );

    return () => {
      console.log(`[TRACER] [useEffect] Cleaning up device pairing listener for code: "${pairingCode}"`);
      unsubscribe();
    };
  }, [step, pairingCode, handleSuccessfulPair]);

  // Listen for App Resume, window focus, or visibility changes to trigger immediate checks (ONE-OFF checks, no setInterval!)
  useEffect(() => {
    if (step !== 'pairing' || !pairingCode) return;

    let appListener: any = null;

    const onAppActive = async () => {
      await handleResumeOrFocus();
    };

    // 1. Capacitor native App resume listener
    const setupNativeListener = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        appListener = await CapApp.addListener('appStateChange', async (state) => {
          console.log(`[TRACER] [Focus/Resume] Capacitor App state changed. isActive=${state.isActive}`);
          if (state.isActive) {
            await onAppActive();
          }
        });
      } catch (err) {
        console.log("[TRACER] [Focus/Resume] Capacitor App plugin not available natively. Standard browser focus/visibility listeners will be used instead.");
      }
    };
    setupNativeListener();

    // 2. Browser standard focus & visibilitychange listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onAppActive();
      }
    };

    const handleWindowFocus = () => {
      onAppActive();
    };

    const handleCustomPairingCheck = () => {
      console.log("[TRACER] [Custom Event] studyos-check-pairing received. Triggering check...");
      onAppActive();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('studyos-check-pairing', handleCustomPairingCheck);

    // Run an initial check immediately on mount/activation
    onAppActive();

    return () => {
      if (appListener) {
        appListener.remove();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('studyos-check-pairing', handleCustomPairingCheck);
    };
  }, [step, pairingCode, handleResumeOrFocus]);

  return { handleResumeOrFocus };
}
