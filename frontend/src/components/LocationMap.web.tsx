import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { Asset } from 'expo-asset';
import { brandColors } from '../theme';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const LIBRARIES: ('places')[] = ['places'];

const MAP_CONTAINER_STYLE = { width: '100%', height: 250 } as const;

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

const MARKER_SIZE = 44;
const BORDER_WIDTH = 3;

function buildCircleMarkerUrl(logoUri: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = MARKER_SIZE;
    canvas.height = MARKER_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(''); return; }

    const r = MARKER_SIZE / 2;

    ctx.beginPath();
    ctx.arc(r, r, r - BORDER_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFCF6';
    ctx.fill();

    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeStyle = brandColors.primary;
    ctx.stroke();

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

interface Props {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  pinCoords: { latitude: number; longitude: number } | null;
  onRegionChange: (r: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
  onPress: (coords: { latitude: number; longitude: number }) => void;
}

export default function LocationMap({ region, pinCoords, onRegionChange, onPress }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY, libraries: LIBRARIES });
  const [markerIcon, setMarkerIcon] = useState<google.maps.Icon | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

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

  const center = { lat: region.latitude, lng: region.longitude };

  // Pan the map when the parent updates the region (e.g. geolocation or geocoding)
  const latestCenterRef = useRef(center);
  latestCenterRef.current = center;

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo(center);
    }
  }, [center.lat, center.lng]);

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onPress({ latitude: e.latLng.lat(), longitude: e.latLng.lng() });
    },
    [onPress],
  );

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onPress({ latitude: e.latLng.lat(), longitude: e.latLng.lng() });
    },
    [onPress],
  );

  const handleLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      // If GPS arrived before the map loaded, pan to the real center now
      map.panTo(latestCenterRef.current);
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
        zoom={16}
        options={MAP_OPTIONS}
        onClick={handleClick}
        onLoad={handleLoad}
      >
        {pinCoords && (
          <MarkerF
            position={{ lat: pinCoords.latitude, lng: pinCoords.longitude }}
            icon={markerIcon ?? undefined}
            draggable
            onDragEnd={handleDragEnd}
          />
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
    height: 250,
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: 12,
  },
});
