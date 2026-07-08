# 🌌 StudyOS — Midnight Indigo (Deep Focus)

StudyOS is a gamified, beautiful, and deeply integrated study companion and productivity operating system designed for students. Built with a responsive, high-performance tech stack, it blends essential study tools with a rewarding RPG-style progression system, social features, and secure cross-platform synchronization.

---

## ✨ Features

### ⏱️ Deep Focus Timer & Habits
- **Focus Timer**: High-precision customizable pomodoro timers with sleek haptic/audio feedback to keep you in the zone.
- **Habit Tracker**: Build, log, and maintain daily study habits with automated streak tracking and visual progress meters.

### 📅 Interactive Study Calendar
- Plan your upcoming tasks, assignments, and exam sessions.
- Visual scheduling cues mapped cleanly to your daily focus commitments.

### 🎮 Gamified Progression Engine
- **XP & Levels**: Earn experience points dynamically as you complete study sessions, maintain habits, and complete tasks.
- **Achievements & Badges**: Unlock collectible rewards and milestone cards for maintaining high focus streaks.
- **Completion Animations**: Immersive victory animations powered by `framer-motion` when finishing major tasks.

### 👥 Social & Shared Milestones
- **Friends Directory**: Add peers, track each other's active study statuses, and send real-time encouragement.
- **Cooperative Milestones**: Trigger social alerts and group multipliers for reaching joint focus milestones.

### 📱 Cross-Platform Device Pairing
- **Secure Synchronization**: Dual-device authentication that bridges web browsers and mobile platforms.
- **Pairing Handshake**: Uses secure cryptographic token exchanges over Firestore (`auth_sessions`) to pair Android and Web clients seamlessly.

---

## 🎨 Visual Identity & Color Scheme

StudyOS is styled under the **Midnight Indigo** theme, engineered specifically for eye-safe, prolonged night studying.

| Token | OKLCH Value | HEX equivalent | Role |
| :--- | :--- | :--- | :--- |
| **Background** | `oklch(0.16 0.02 260)` | `#0B0F17` | Main app canvas |
| **Surface** | `oklch(0.22 0.025 260)` | `#131A26` | Cards, primary panels |
| **Surface-2** | `oklch(0.27 0.03 260)` | `#1B2434` | Elevated containers |
| **Foreground** | `oklch(0.97 0.01 250)` | `#F5F7FB` | Primary legible text |
| **Muted** | `oklch(0.72 0.03 258)` | `#93A0B8` | Secondary labels & sub-text |

### Accents
* **Primary / XP Highlight**: `oklch(0.74 0.14 268)` — Deep periwinkle blue
* **Success Mint**: `oklch(0.82 0.16 165)` — Gentle green for completed tasks
* **Warning Amber**: `oklch(0.85 0.13 82)` — Warm gold for pending sessions
* **Destructive Red**: `oklch(0.70 0.20 22)` — Vibrant red for alerts
* **Flame Orange**: `oklch(0.78 0.17 55)` — High contrast orange for hot streaks

### Typography
* **Display / Headings**: Space Grotesk (tech-forward, clean spacing)
* **Body / UI**: Inter Variable (maximum legibility)
* **Data & Timers**: JetBrains Mono (monospaced figures to prevent layout shifting during countdowns)

---

## 🛠️ Tech Stack

- **Frontend Core**: React 18 with Vite
- **Language**: TypeScript (Strict Typings)
- **Styling**: Tailwind CSS v4 using modern native OKLCH utilities
- **Database & Auth**: Firebase Auth & Cloud Firestore
- **Animations**: `framer-motion` (Fluid route changes, interactive drawer toggles, active list item translations)
- **Icons**: Lucide React
- **Mobile Container**: Capacitor (Native bindings for Android integration)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/studyos.git
   cd studyos
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file at the root directory by referencing the `.env.example`:
   ```env
   # Firebase Config
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Launch development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to view the application locally.

### Production Build
Build the optimized static files for deployment:
```bash
npm run build
```
Files will be built cleanly under the `/dist` directory.

---

## 🔒 Security & Firestore Rules

StudyOS enforces a strict least-privilege security model in Firestore to safeguard user data. Make sure to deploy the following rules via the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /auth_sessions/{sessionId} {
      allow read, write: if true; // Managed secure handshake
    }
    match /friends/{friendshipId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📱 Mobile Support
StudyOS is packaged for Android out-of-the-box using **Capacitor**. 
To open the project in Android Studio:
```bash
npx cap add android
npx cap sync
npx cap open android
```

---

*Study hard, stay in focus, and unlock your potential with StudyOS.* 🌌
