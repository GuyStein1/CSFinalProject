# 8. Firebase Integration Guide

This document outlines the required steps for developers to integrate Firebase into the FixIt project. Firebase is used for:
1. **Firebase Authentication** — email/password + Google sign-in, email verification, and ID-token validation.
2. **Firebase Storage** — hosting user-uploaded images (task photos, portfolios, certifications, identity verification photos).

> **Push notification note:** the mobile push flow is handled through `expo-notifications` and Expo push tokens (see `frontend/src/utils/registerForPushNotifications.ts` and `backend/src/services/notificationService.ts`). Push is not routed through Firebase Cloud Messaging.

## 1. Initial Setup (Firebase Console)
The project lead/admin performs these steps in the Firebase Console:
* **Create Project.**
* **Enable Authentication providers:**
  * Email/Password
  * Google — this also requires provisioning **OAuth 2.0 Client IDs** in the linked Google Cloud project, one per platform (Web / iOS / Android). The three client IDs are surfaced to the app via the `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` env vars (see §3).
* **Enable Storage** and configure basic Security Rules (authenticated write; read as required by the product).
* **Generate keys:**
  * **Backend:** generate and download a Service Account Key (JSON) from *Project Settings → Service Accounts*.
  * **Frontend:** register a Web App to obtain the `firebaseConfig` object; the six public keys are what get baked into `EXPO_PUBLIC_FIREBASE_*` env vars.

## 2. Backend Tasks (Node.js)
The server uses Admin privileges to verify auth tokens and (via the Admin SDK) delete users on account-deletion.

* **Installation:** `npm install firebase-admin`.
* **Init file:** `backend/src/config/firebaseAdmin.ts` — initializes `firebase-admin` using env vars. If the required env vars are missing (e.g. running tests without Firebase configured), initialization is skipped gracefully instead of throwing.
* **Environment variables** (in `backend/.env`):
  * `FIREBASE_PROJECT_ID`
  * `FIREBASE_CLIENT_EMAIL`
  * `FIREBASE_PRIVATE_KEY` — the multi-line private key from the service-account JSON. Store it as a single line with `\n` escapes; the init code replaces `\\n` with real newlines before passing it to `cert()`.
* **Auth middleware:** `backend/src/middleware/auth.ts` calls `admin.auth().verifyIdToken(token)` on every protected request, looks up the local `User` by `firebase_uid`, and attaches it to `req.user`.
* **Admin Auth middleware:** `backend/src/middleware/adminAuth.ts` gates `/api/admin/*` routes to users with `is_admin = true`.
* **Account deletion:** `DELETE /api/users/me` calls `admin.auth().deleteUser(uid)` after wiping local data.

## 3. Frontend Tasks (Expo / React Native)
The mobile client handles direct-to-Storage uploads and Firebase Auth on-device.

* **Installation:**
  * Firebase Client: `npm install firebase`
  * Google sign-in: `npx expo install expo-auth-session expo-crypto`
  * Push: `npx expo install expo-notifications expo-device`
* **Init file:** `frontend/src/config/firebase.ts` — initializes the Firebase app. Two notable details:
  * **React-Native persistence.** On native, `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` is used so the session survives app restarts. On web, `getAuth(app)` is used (browser storage handles persistence). Selecting the right branch is done via `Platform.OS`.
  * **Expo Go / OTA duplicate-init guard.** In Expo Go / OTA published updates the auth module can be initialised twice; the init file catches the `auth/already-initialized` error and falls back to `getAuth(app)`.
* **Environment variables** (from `frontend/.env` — also mirrored into `frontend/eas.json`'s `preview` profile so cloud builds have them):
  * `EXPO_PUBLIC_FIREBASE_API_KEY`
  * `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  * `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  * `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  * `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  * `EXPO_PUBLIC_FIREBASE_APP_ID`
* **Google sign-in / OAuth client IDs** (also in `frontend/.env` and `eas.json`):
  * `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  * `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  * `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
  * The auth flow lives in `frontend/src/utils/useGoogleAuth.ts` / `socialAuth.ts` — it selects the client ID based on the current platform.
* **Image Upload (Storage):** a shared utility takes a local image URI, converts it to a Blob, uploads it to Firebase Storage, and returns the public download URL. Only the URL is sent to the backend and stored in Postgres — binary payloads never touch the API server.
* **Push Notifications Registration:** `expo-notifications` requests permission on first launch, obtains an Expo push token, and posts it to `POST /api/users/me/push-token`. The backend `notificationService` reads it when sending pushes.
