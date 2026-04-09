import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
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
      initialRegion={{
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
      }}
      onPress={onClearSelection}
      onRegionChangeComplete={handleRegionChange}
    >
      {tasks.map((task) => {
        const hasBid = bidTaskIds?.has(task.id);
        return (
          <Marker
            key={task.id}
            coordinate={{ latitude: task.lat, longitude: task.lng }}
            pinColor={hasBid ? BID_MARKER_COLOR : DEFAULT_MARKER_COLOR}
            onPress={() => onSelectTask(task.id)}
          />
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixerMarkerImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
});
