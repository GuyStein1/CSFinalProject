import type { Persistence } from 'firebase/auth';
import type AsyncStorage from '@react-native-async-storage/async-storage';

// getReactNativePersistence is present in the react-native Metro bundle but absent
// from firebase/auth's web TypeScript types. Augment the module so tsc is satisfied.
declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: typeof AsyncStorage,
  ): Persistence;
}
