# StudyOS Technical & Architectural Specification

## Executive Summary
StudyOS is a cloud-first, cross-platform academic focus and productivity OS built for students. The core architecture relies on **Firestore as the single source of truth** for all authoritative user metrics, streaks, XP, achievements, and social leaderboards, preventing local client-side state manipulation while providing instant offline resiliency via targeted, whitelisted `localStorage` client state.

---

## 1. Storage Architecture & Local Caching Strategy

### 1.1 Firestore as Single Source of Truth
Firestore handles all domain data persistence. Client apps sync with Firestore in memory to ensure competitive integrity:
* **Cloud-Enforced Data (Firestore):**
  * **User Stats & Streaks:** Level, total XP, current streak, longest streak, study shields count, study activity logs.
  * **Academic State:** Subject modules, syllabus progress, completed topics, spaced repetition schedules.
  * **Social Network:** Friends list, pending requests, activity feeds, weekly/monthly leaderboards.
  * **Achievements:** Unlocked badges, claimed rewards, quest logs.
  * **Notifications Center:** In-app notification bell history, read states, social alerts.

### 1.2 Whitelisted LocalStorage Keys
To prevent arbitrary local state tampering while ensuring offline widget responsiveness and timer crash recovery, client storage is strictly restricted to the following `localStorage` keys:

1. `activeFocusSession`: Real-time session crash recovery object.
   ```json
   {
     "activeFocusSession": {
       "subject": "Physics",
       "startTime": 1753950000,
       "elapsedSeconds": 1260
     }
   }
   ```
2. `widgetData`: Fast local snapshot for native Android widgets.
   ```json
   {
     "widgetData": {
       "streak": 5,
       "todayMinutes": 42
     }
   }
   ```
3. `theme`: Visual theme preference (`dark` | `light`).
4. `language`: Preferred UI localization language.
5. `onboarding`: Onboarding flow completion flag.

---

## 2. Focus Session & Crash Recovery

### 2.1 Recovery Flow
* During an active focus session, elapsed time and timestamps are continuously updated in `activeFocusSession`.
* If the app crashes or the browser tab closes unexpectedly, reopening StudyOS reads `activeFocusSession`, calculates the elapsed study time safely, and presents a recovery toast to resume or finish the session without progress loss.

### 2.2 Offline Gating
* Focus sessions cannot be finalized or awarded XP/streaks without an active internet connection to validate session timestamps against server time and prevent device clock manipulation.

---

## 3. Push Notifications & Android FCM Pipeline

### 3.1 Architecture Overview
Push notifications utilize **Firebase Cloud Messaging (FCM)**. Device tokens are registered on Android startup and stored in Firestore:

```
Path: users/{uid}/fcmToken
```

**Trigger Flow:**
```
Event Trigger (e.g., Friend Request / Streak Danger)
       ↓
Cloud Function Backend Listener
       ↓
Firebase Cloud Messaging (FCM)
       ↓
Android System Notification Tray
```

### 3.2 Notification Categories & Types
* **Social Notifications:**
  * Friend request received
  * Friend request accepted
  * New follower
  * Leaderboard position update ("Someone beat your streak")
* **Study Notifications:**
  * Daily study reminder
  * Streak danger alert ("🐼 PanPan says: 🔥 Your 5-day streak is at risk! Study for 10 minutes to protect it.")
  * Goal completed celebration
  * Study Shield activated
* **Achievement Notifications:**
  * Milestone streak (e.g., 7-day streak 🔥)
  * Level up ⭐
  * Badge unlocked 🏆
* **System Notifications:**
  * Scheduled maintenance
  * Platform updates (e.g., StudyOS 2.1 available)
  * Important bug fixes

### 3.3 Priority Core Trio
To maximize user engagement without causing notification fatigue, initial deployment prioritizes three core triggers:
1. **Friend Requests** (Immediate social loop)
2. **Streak Danger Alerts** (Retention & habit protection)
3. **Goal Completed Celebrations** (Positive reinforcement)

### 3.4 Anti-Spam Delivery Rules
To prevent users from disabling app notifications, Cloud Functions enforce mandatory rate-limits:
* **Streak Danger Reminders:** Maximum **1** notification per day.
* **Motivational Notifications:** Maximum **1** notification per **12 hours**.
* **Achievement Notifications:** Maximum **1** notification per unique achievement unlocked.

### 3.5 Offline Deep-Link Behavior
When a user opens a push notification while offline, StudyOS displays a dedicated offline fallback screen:

```
🐼 StudyOS is currently unavailable

You seem to be offline. Check your internet connection and try again.
```

---

## 4. Streak Calculation Models (Architectural Options)

The core streak engine evaluates user activity logs to calculate true consecutive study streaks. Three potential model variations exist for long-term product tuning:

| Model Option | Definition | Pros | Cons / Impact |
| :--- | :--- | :--- | :--- |
| **1. Calendar-day Streak** (Duolingo Style) | Any verified study activity or topic completion on a calendar day maintains the streak. | Low friction, encourages daily app check-in habits. | Can be trivial if user completes a 1-minute quick task. |
| **2. Focus-minute Streak** | Requires a cumulative minimum threshold (e.g. 30 focus minutes) per day. | Ensures meaningful academic engagement before awarding streak points. | Higher barrier to entry; may discourage students on busy exam/travel days. |
| **3. Task-completion Streak** | Requires completing all assigned daily goals or scheduled revision cards. | Directly ties streak progression to syllabus mastery and retention. | Streak breaking can feel punitive if daily task load is high. |

---

## 5. In-App Notification Center UI

Inside StudyOS, the notification drawer displays real-time social and academic events:

```
🔔 Notifications
• Rohit accepted your request.
• PanPan says your streak is in danger.
• You unlocked "Early Bird".
• StudyOS 2.1 is now available.
```

---

## 6. Native Android Authentication Constraints

* On Android native builds (`Capacitor.isNativePlatform()`), authentication strictly uses `FirebaseAuthentication.signInWithGoogle()`.
* Web popups/redirects (`signInWithPopup` / `signInWithRedirect`) are prohibited to maintain native app stability.

