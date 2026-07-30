# StudyOS Development Guidelines & Strict Rules

## Authentication Rules
1. **No Browser Fallbacks on Native Android**:
   - On Android (`Capacitor.isNativePlatform()`), authentication **MUST ONLY** use `FirebaseAuthentication.signInWithGoogle()`.
   - Never invoke `signInWithPopup()` or `signInWithRedirect()` on Android.
   - If native authentication fails, display the error message directly to the user and stop execution. Never redirect to browser.
2. **Authentication Flow Integrity**:
   - Do not alter or modify the authentication architecture/flow without explicit permission from the user.

## Architecture & Code Changes
1. Do not introduce unauthorized architectural changes or secondary fallbacks without prior explicit request.
2. Keep app icons, widgets, and native plugin registrations strictly aligned with the Android native environment (`MainActivity.java`).

## Debugging Rules
1. **Fix Root Causes**: Fix the root cause instead of adding workarounds.
2. **No Silent Error Suppression**: Never catch and ignore exceptions silently.
3. **Log Real Errors**: Always log the actual error message.
4. **Preserve Native Features**: Don't replace native features with web implementations or fallbacks.
5. **Build Verification**: Build errors/success are not proof alone that a feature works as intended.

## Decision & Execution Protocol
- If there are multiple possible solutions, do NOT implement any of them until the user explicitly chooses one.
