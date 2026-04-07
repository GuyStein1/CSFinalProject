import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const MARKER_SIZE = 40;
const BORDER_WIDTH = 3;

function buildCircleMarkerUrl(logoUri: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = MARKER_SIZE;
    canvas.height = MARKER_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(''); return; }

    const r = MARKER_SIZE / 2;

    // Draw white filled circle
    ctx.beginPath();
    ctx.arc(r, r, r - BORDER_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFCF6';
    ctx.fill();

    // Draw blue border
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeStyle = brandColors.primary;
    ctx.stroke();

    // Draw logo inside the circle
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - BORDER_WIDTH - 1, 0, Math.PI * 2);
      ctx.clip();
      const pad = BORDER_WIDTH + 3;
      const drawSize = MARKER_SIZE - pad * 2;
      ctx.drawImage(img, pad, pad, drawSize, drawSize);
      ctx.restore();
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = logoUri;
  });
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
  const [markerIcon, setMarkerIcon] = useState<google.maps.Icon | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Build the circular marker icon once the Maps JS API is loaded
  useEffect(() => {
    if (!isLoaded) return;
    const uri = resolveLogoUri();
    if (!uri) return;
    buildCircleMarkerUrl(uri).then((dataUrl) => {
      if (!dataUrl) return;
      setMarkerIcon({
        url: dataUrl,
        scaledSize: new google.maps.Size(MARKER_SIZE, MARKER_SIZE),
        anchor: new google.maps.Point(MARKER_SIZE / 2, MARKER_SIZE / 2),
      });
    });
  }, [isLoaded]);

  // Stable center: only changes when the user explicitly searches or GPS updates.
  const center = useMemo(
    () => ({ lat: centerLat, lng: centerLng }),
    [centerLat, centerLng],
  );

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
            icon={markerIcon ?? undefined}
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
