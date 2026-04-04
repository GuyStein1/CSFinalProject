import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { brandColors } from '../theme';
import {
  CATEGORY_MARKER_COLORS,
  DiscoveryMapProps,
} from './DiscoveryMap.types';

const WEB_MAP_WIDTH = 320;
const WEB_MAP_HEIGHT = 420;

export default function DiscoveryMap({
  tasks,
  centerLat,
  centerLng,
  mapRegion,
  onSelectTask,
  onClearSelection,
}: DiscoveryMapProps) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Nearby Jobs Map
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Tap a marker to preview a task. Tap the background to dismiss.
      </Text>

      <Pressable style={styles.canvas} onPress={onClearSelection}>
        {tasks.map((task) => {
          const leftRatio = getRelativeOffset(task.lng, centerLng, mapRegion.longitudeDelta);
          const topRatio = getRelativeOffset(task.lat, centerLat, mapRegion.latitudeDelta, true);

          return (
            <Pressable
              key={task.id}
              onPress={() => onSelectTask(task.id)}
              style={[
                styles.marker,
                {
                  left: leftRatio * WEB_MAP_WIDTH,
                  top: topRatio * WEB_MAP_HEIGHT,
                  backgroundColor: CATEGORY_MARKER_COLORS[task.category],
                },
              ]}
            />
          );
        })}
      </Pressable>
    </View>
  );
}

function getRelativeOffset(value: number, center: number, delta: number, invert = false) {
  const normalized = 0.5 + (value - center) / (delta * 2);
  const clamped = Math.max(0.08, Math.min(0.92, normalized));

  return invert ? 1 - clamped : clamped;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    color: brandColors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  canvas: {
    width: WEB_MAP_WIDTH,
    height: WEB_MAP_HEIGHT,
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: brandColors.surfaceAlt,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: brandColors.outline,
  },
  marker: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: brandColors.surface,
    marginLeft: -9,
    marginTop: -9,
  },
});
