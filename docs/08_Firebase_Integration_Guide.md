# 8. Firebase Integration Guide

This document outlines the required steps for developers to integrate Firebase into the Fixlt project. For the MVP, Firebase is used primarily for:
1. **Firebase Authentication:** User registration, login, email verification, and token validation.
2. **Firebase Storage:** Hosting images (task photos and fixer portfolios).

> **Push notification note:** The initial mobile push flow is handled through `expo-notifications` and Expo push tokens. It is documented in the development plan as part of the app setup, not as part of the Firebase integration itself.

## 1. Initial Setup (Firebase Console)
The project lead/admin must perform these steps in the Firebase Console:
* **Create Project:** Initialize a new project in the Firebase Console.
* **Enable Storage:** Navigate to Storage and enable it. Configure basic Security Rules (e.g., allow public read, authenticated write).
* **Generate Keys:**
  * **Backend:** Generate and download a Service Account Key (JSON) from `Project Settings -> Service Accounts`.
  * **Frontend:** Register a Web App (used for Expo) to get the `firebaseConfig` object.

## 2. Backend Tasks (Node.js)
The server interacts with Firebase using Admin privileges to verify auth tokens and (optionally) manage files.
* **Installation:** Install the Admin SDK: `npm install firebase-admin`.
* **Environment Variables:** Add the Service Account Key details to the `.env` file. **Never commit these keys to version control!**
* **Initialization:** Create a config file (e.g., `src/config/firebase.ts`) to initialize `firebase-admin` using the environment variables.
* **Auth Verification:** Use the Admin SDK in backend middleware to validate Firebase ID tokens on protected routes.

## 3. Frontend Tasks (Expo / React Native)
The mobile client handles uploading images directly to Firebase Storage.
* **Installation:**
  * Firebase Client: `npm install firebase`
  * Expo Notifications: `npx expo install expo-notifications expo-device`
* **Initialization:** Create `firebaseConfig.ts` to initialize the Firebase app with the public keys.
* **Image Upload (Storage):** Create a utility function that takes a local image URI, converts it to a Blob, and uploads it to Firebase Storage. The function should return the public download URL to be sent to the Backend for storage in PostgreSQL.
* **Push Notifications Registration:** Covered separately in the development plan via `expo-notifications` and Expo push tokens.