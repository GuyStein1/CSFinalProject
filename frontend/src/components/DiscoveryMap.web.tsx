import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { Asset } from 'expo-asset';
import { brandColors } from '../theme';
import {
  type DiscoveryMapProps,
  type DiscoveryMapRegion,
} from './DiscoveryMap.types';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const LIBRARIES: ('places')[] = ['places'];

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' } as const;

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoAsset = require('../../assets/logo-without-text.png');

function resolveLogoUri(): string {
  try {
    const asset = Asset.fromModule(logoAsset);
    return asset.uri ?? asset.localUri ?? '';
  } catch {
    return '';
  }
}

export default function DiscoveryMap({
  tasks,
  centerLat,
  centerLng,
  mapRegion: _mapRegion,
  onSelectTask,
  onClearSelection,
  onRegionChangeComplete,
}: DiscoveryMapProps) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY, libraries: LIBRARIES });
  const markerIconRef = useRef<google.maps.Icon | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Stable center: only changes when the user explicitly searches or GPS updates.
  // Do NOT derive from mapRegion — that would snap the map back on every pan.
  const center = useMemo(
    () => ({ lat: centerLat, lng: centerLng }),
    [centerLat, centerLng],
  );

  const getMarkerIcon = useCallback((): google.maps.Icon | undefined => {
    if (markerIconRef.current) return markerIconRef.current;
    const uri = resolveLogoUri();
    if (!uri) return undefined;
    markerIconRef.current = {
      url: uri,
      scaledSize: new google.maps.Size(36, 24),
      anchor: new google.maps.Point(18, 12),
    };
    return markerIconRef.current;
  }, []);

  // When user explicitly searches / GPS updates, pan to the new center imperatively.
  // This avoids the snap-back caused by passing a controlled `center` prop.
  const prevCenterRef = useRef({ lat: centerLat, lng: centerLng });
  useEffect(() => {
    const prev = prevCenterRef.current;
    if (mapRef.current && (prev.lat !== centerLat || prev.lng !== centerLng)) {
      mapRef.current.panTo({ lat: centerLat, lng: centerLng });
      prevCenterRef.current = { lat: centerLat, lng: centerLng };
    }
  }, [centerLat, centerLng]);

  const handleIdle = useCallback(
    (map: google.maps.Map) => {
      const c = map.getCenter();
      const bounds = map.getBounds();
      if (!c || !bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const region: DiscoveryMapRegion = {
        latitude: c.lat(),
        longitude: c.lng(),
        latitudeDelta: Math.abs(ne.lat() - sw.lat()),
        longitudeDelta: Math.abs(ne.lng() - sw.lng()),
      };
      onRegionChangeComplete(region);
    },
    [onRegionChangeComplete],
  );

  if (!isLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.container}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={14}
        options={MAP_OPTIONS}
        onClick={onClearSelection}
        onLoad={(map) => {
          mapRef.current = map;
          map.addListener('idle', () => handleIdle(map));
        }}
      >
        {tasks.map((task) => (
          <MarkerF
            key={task.id}
            position={{ lat: task.lat, lng: task.lng }}
            icon={getMarkerIcon()}
            onClick={() => onSelectTask(task.id)}
          />
        ))}
      </GoogleMap>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  loading: {
    flex: 1,
    backgroundColor: brandColors.surfaceAlt,
  },
});
