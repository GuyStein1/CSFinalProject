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
  fixerLat?: number;
  fixerLng?: number;
  /** Task IDs the fixer has already bid on — shown with green border */
  bidTaskIds?: Set<string>;
  mapRegion: DiscoveryMapRegion;
  onSelectTask: (taskId: string) => void;
  onClearSelection: () => void;
  onRegionChangeComplete: (region: DiscoveryMapRegion) => void;
}
