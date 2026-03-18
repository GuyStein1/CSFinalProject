# 8. Firebase Integration Guide

This document outlines the required steps for developers to integrate Firebase into the Fixlt project. Firebase is utilized for two primary features:
1. **Firebase Storage:** Hosting images (task photos, fixer portfolios, and certifications).
2. **Firebase Cloud Messaging (FCM):** Sending real-time push notifications.

## 1. Initial Setup (Firebase Console)
The project lead/admin must perform these steps in the Firebase Console:
* **Create Project:** Initialize a new project in the Firebase Console.
* **Enable Storage:** Navigate to Storage and enable it. Configure basic Security Rules (e.g., allow public read, authenticated write).
* **Enable Cloud Messaging:** Ensure the FCM service is active.
* **Generate Keys:**
  * **Backend:** Generate and download a Service Account Key (JSON) from `Project Settings -> Service Accounts`.
  * **Frontend:** Register a Web App (used for Expo) to get the `firebaseConfig` object.

## 2. Backend Tasks (Node.js)
The server interacts with Firebase using Admin privileges to send notifications and (optionally) manage files.
* **Installation:** Install the Admin SDK: `npm install firebase-admin`.
* **Environment Variables:** Add the Service Account Key details to the `.env` file. **Never commit these keys to version control!**
* **Initialization:** Create a config file (e.g., `src/config/firebase.ts`) to initialize `firebase-admin` using the environment variables.
* **Notification Service:** Write a utility function that accepts a `userId`, retrieves their Push Token from the database, and sends a notification using `admin.messaging().send()`.

## 3. Frontend Tasks (Expo / React Native)
The mobile client handles uploading images directly to Firebase Storage and receiving notifications.
* **Installation:**
  * Firebase Client: `npm install firebase`
  * Expo Notifications: `npx expo install expo-notifications expo-device`
* **Initialization:** Create `firebaseConfig.ts` to initialize the Firebase app with the public keys.
* **Image Upload (Storage):** Create a utility function that takes a local image URI, converts it to a Blob, and uploads it to Firebase Storage. The function should return the public download URL to be sent to the Backend for storage in PostgreSQL.
* **Push Notifications Registration:** Create a function that runs on app startup/login to request notification permissions, retrieve the Expo Push Token (or FCM Token), and send it to the Backend to update the User record.