import React from 'react';
import MapView, { Marker, Region } from 'react-native-maps';
import { radii } from '../theme';

interface Props {
  region: Region;
  pinCoords: { latitude: number; longitude: number } | null;
  onRegionChange: (r: Region) => void;
  onPress: (coords: { latitude: number; longitude: number }) => void;
}

export default function LocationMap({ region, pinCoords, onRegionChange, onPress }: Props) {
  return (
    <MapView
      style={{ width: '100%', height: 200, borderRadius: radii.md }}
      region={region}
      onRegionChangeComplete={onRegionChange}
      onPress={(e) => onPress(e.nativeEvent.coordinate)}
    >
      {pinCoords && <Marker coordinate={pinCoords} />}
    </MapView>
  );
}
