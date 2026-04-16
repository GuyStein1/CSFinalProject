import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Uploads a local image URI to Firebase Storage and returns the public download URL.
 *
 * @param uri   Local file URI from expo-image-picker (e.g. "file:///...")
 * @param path  Destination path in Firebase Storage (e.g. "avatars/userId/123.jpg")
 * @returns     Public HTTPS download URL
 *
 * Usage:
 *   Avatar:    uploadImage(localUri, `avatars/${userId}/${Date.now()}.jpg`)
 *   Portfolio: uploadImage(localUri, `portfolio/${userId}/${Date.now()}.jpg`)
 *   Task:      uploadImage(localUri, `tasks/${taskId}/${Date.now()}.jpg`)
 */
export async function uploadImage(uri: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
