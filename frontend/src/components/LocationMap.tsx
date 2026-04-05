import React from 'react';
import { View } from 'react-native';

// This base file is used by TypeScript for type checking.
// At runtime, Metro resolves LocationMap.web.tsx or LocationMap.native.tsx instead.

interface Props {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  pinCoords: { latitude: number; longitude: number } | null;
  onRegionChange: (r: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
  onPress: (coords: { latitude: number; longitude: number }) => void;
}

export default function LocationMap(_props: Props) {
  return <View />;
}
