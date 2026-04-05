import type { DiscoveryTask } from '../hooks/useTasks';

export interface DiscoveryMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface DiscoveryMapProps {
  tasks: DiscoveryTask[];
  centerLat: number;
  centerLng: number;
  mapRegion: DiscoveryMapRegion;
  onSelectTask: (taskId: string) => void;
  onClearSelection: () => void;
  onRegionChangeComplete: (region: DiscoveryMapRegion) => void;
}

export const CATEGORY_MARKER_COLORS: Record<DiscoveryTask['category'], string> = {
  ASSEMBLY:    '#7B61FF',
  MOUNTING:    '#0D7C6E',
  MOVING:      '#1E8449',
  PAINTING:    '#C0392B',
  PLUMBING:    '#2E86C1',
  ELECTRICITY: '#D4900A',
  OUTDOORS:    '#27AE60',
  CLEANING:    '#8E44AD',
};
