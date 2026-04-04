import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { CATEGORY_MARKER_COLORS, DiscoveryMapProps } from './DiscoveryMap.types';

export default function DiscoveryMap({
  tasks,
  mapRegion,
  onSelectTask,
  onClearSelection,
  onRegionChangeComplete,
}: DiscoveryMapProps) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={mapRegion}
      region={mapRegion}
      onPress={onClearSelection}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {tasks.map((task) => (
        <Marker
          key={task.id}
          coordinate={{ latitude: task.lat, longitude: task.lng }}
          pinColor={CATEGORY_MARKER_COLORS[task.category]}
          onPress={() => onSelectTask(task.id)}
        />
      ))}
    </MapView>
  );
}
