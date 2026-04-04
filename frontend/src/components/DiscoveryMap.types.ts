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
  ELECTRICITY: '#D28F1B',
  PLUMBING: '#496B84',
  CARPENTRY: '#7B5D3D',
  PAINTING: '#A85B5B',
  MOVING: '#517A58',
  GENERAL: '#1C3C56',
};
