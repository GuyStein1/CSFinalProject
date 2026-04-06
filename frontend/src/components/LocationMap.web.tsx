import React from 'react';
import { View } from 'react-native';

// Map is not supported on web — render nothing
export default function LocationMap(_props: {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  pinCoords: { latitude: number; longitude: number } | null;
  onRegionChange: (r: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
  onPress: (coords: { latitude: number; longitude: number }) => void;
}) {
  return <View />;
}
