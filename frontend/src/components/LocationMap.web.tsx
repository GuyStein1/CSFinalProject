import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { brandColors } from '../theme';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const LIBRARIES: ('places')[] = ['places'];

const MAP_CONTAINER_STYLE = { width: '100%', height: 200 } as const;

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

interface Props {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  pinCoords: { latitude: number; longitude: number } | null;
  onRegionChange: (r: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
  onPress: (coords: { latitude: number; longitude: number }) => void;
}

export default function LocationMap({ region, pinCoords, onRegionChange, onPress }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY, libraries: LIBRARIES });

  const center = { lat: region.latitude, lng: region.longitude };

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onPress({ latitude: e.latLng.lat(), longitude: e.latLng.lng() });
    },
    [onPress],
  );

  const handleLoad = useCallback(
    (map: google.maps.Map) => {
      map.addListener('idle', () => {
        const c = map.getCenter();
        const bounds = map.getBounds();
        if (!c || !bounds) return;
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        onRegionChange({
          latitude: c.lat(),
          longitude: c.lng(),
          latitudeDelta: Math.abs(ne.lat() - sw.lat()),
          longitudeDelta: Math.abs(ne.lng() - sw.lng()),
        });
      });
    },
    [onRegionChange],
  );

  if (!isLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.container}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={15}
        options={MAP_OPTIONS}
        onClick={handleClick}
        onLoad={handleLoad}
      >
        {pinCoords && (
          <MarkerF position={{ lat: pinCoords.latitude, lng: pinCoords.longitude }} />
        )}
      </GoogleMap>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loading: {
    height: 200,
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: 12,
  },
});
