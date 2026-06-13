import React, { useEffect, useRef } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { brandColors } from '../theme';
import type { DiscoveryMapProps, DiscoveryMapRegion } from './DiscoveryMap.types';

const BID_MARKER_COLOR = '#66BB6A';
const DEFAULT_MARKER_COLOR = brandColors.primary;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoAsset = require('../../assets/logo-without-text.png');

export default function DiscoveryMap({
  tasks,
  centerLat,
  centerLng,
  fixerLat,
  fixerLng,
  bidTaskIds,
  mapRegion,
  onSelectTask,
  onClearSelection,
  onRegionChangeComplete,
}: DiscoveryMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const prevCenter = useRef({ lat: centerLat, lng: centerLng });
  const markerPressedRef = useRef(false);

  // Pan to new center when it changes (e.g. search)
  useEffect(() => {
    if (
      mapRef.current &&
      (prevCenter.current.lat !== centerLat || prevCenter.current.lng !== centerLng)
    ) {
      mapRef.current.animateToRegion(
        {
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: mapRegion.latitudeDelta,
          longitudeDelta: mapRegion.longitudeDelta,
        },
        300,
      );
      prevCenter.current = { lat: centerLat, lng: centerLng };
    }
  }, [centerLat, centerLng, mapRegion.latitudeDelta, mapRegion.longitudeDelta]);

  const handleRegionChange = (region: Region) => {
    const r: DiscoveryMapRegion = {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    };
    onRegionChangeComplete(r);
  };

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
      }}
      onPress={() => {
        if (!markerPressedRef.current) {
          onClearSelection();
        }
      }}
      onRegionChangeComplete={handleRegionChange}
    >
      {tasks.map((task) => {
        const hasBid = bidTaskIds?.has(task.id);
        return (
          <Marker
            key={task.id}
            coordinate={{ latitude: task.lat, longitude: task.lng }}
            onPress={() => {
              markerPressedRef.current = true;
              onSelectTask(task.id);
              setTimeout(() => { markerPressedRef.current = false; }, 0);
            }}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.taskMarker, { borderColor: hasBid ? BID_MARKER_COLOR : DEFAULT_MARKER_COLOR }]}>
              <Image source={logoAsset} style={styles.taskMarkerImage} />
            </View>
          </Marker>
        );
      })}

      {/* Fixer's own location */}
      {fixerLat != null && fixerLng != null && (
        <Marker
          coordinate={{ latitude: fixerLat, longitude: fixerLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.fixerMarker}>
            <Image source={logoAsset} style={styles.fixerMarkerImage} />
          </View>
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fixerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: brandColors.secondaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brandColors.secondaryDark,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 7,
    elevation: 5,
  },
  fixerMarkerImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  taskMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  taskMarkerImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});
