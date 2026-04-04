import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Button,
  Card,
  Portal,
  Modal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AppLogo from '../components/AppLogo';
import DiscoveryMap from '../components/DiscoveryMap';
import type { DiscoveryMapRegion } from '../components/DiscoveryMap.types';
import DiscoveryPreviewCard from '../components/DiscoveryPreviewCard';
import DiscoveryListCard from '../components/DiscoveryListCard';
import EmptyState from '../components/EmptyState';
import FilterBar, { type PriceRange, type ViewMode } from '../components/FilterBar';
import LoadingScreen from '../components/LoadingScreen';
import useTasks, { type Category } from '../hooks/useTasks';
import { brandColors } from '../theme';

type PermissionState = 'checking' | 'rationale' | 'denied' | 'ready' | 'error';
type CenterMode = 'gps' | 'manual';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

interface DiscoveryCenter {
  lat: number;
  lng: number;
  label: string;
}

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_DELTA = 0.06;

function priceBounds(range: PriceRange): { minPrice: number | null; maxPrice: number | null } {
  switch (range) {
    case '0-100': return { minPrice: 0, maxPrice: 100 };
    case '100-500': return { minPrice: 100, maxPrice: 500 };
    case '500+': return { minPrice: 500, maxPrice: 100000 };
    default: return { minPrice: null, maxPrice: null };
  }
}

export default function DiscoveryFeedScreen({ navigation }: Props) {
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const [centerMode, setCenterMode] = useState<CenterMode>('gps');
  const [center, setCenter] = useState<DiscoveryCenter | null>(null);
  const [manualArea, setManualArea] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<DiscoveryMapRegion | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [radius, setRadius] = useState(DEFAULT_RADIUS_KM);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRange>('any');

  const { minPrice, maxPrice } = priceBounds(priceRange);
  const apiCategory = selectedCategories.length === 1 ? selectedCategories[0] : null;

  const { tasks: rawTasks, loading, error, refetch } = useTasks({
    lat: center?.lat,
    lng: center?.lng,
    radius,
    category: apiCategory,
    minPrice,
    maxPrice,
    enabled: permissionState === 'ready' && center != null,
  });

  const tasks = useMemo(() => {
    if (selectedCategories.length <= 1) return rawTasks;
    return rawTasks.filter((t) => selectedCategories.includes(t.category));
  }, [rawTasks, selectedCategories]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );

  const syncCenter = useCallback((nextCenter: DiscoveryCenter, mode: CenterMode) => {
    setCenter(nextCenter);
    setCenterMode(mode);
    setMapRegion({
      latitude: nextCenter.lat,
      longitude: nextCenter.lng,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    });
    setPermissionState('ready');
  }, []);

  const loadGpsCenter = useCallback(async () => {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    syncCenter(
      {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        label: 'Current location',
      },
      'gps'
    );
  }, [syncCenter]);

  const evaluatePermissionState = useCallback(async () => {
    setManualError(null);

    try {
      const permission = await Location.getForegroundPermissionsAsync();

      if (permission.status === 'granted') {
        await loadGpsCenter();
        return;
      }

      if (permission.status === 'undetermined') {
        setPermissionState('rationale');
        return;
      }

      if (center && centerMode === 'manual') {
        setPermissionState('ready');
        return;
      }

      setPermissionState('denied');
    } catch {
      setPermissionState('error');
    }
  }, [center, centerMode, loadGpsCenter]);

  useFocusEffect(
    useCallback(() => {
      evaluatePermissionState();
    }, [evaluatePermissionState])
  );

  useEffect(() => {
    if (selectedTaskId && !selectedTask) {
      setSelectedTaskId(null);
    }
  }, [selectedTask, selectedTaskId]);

  const handleAllowLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status === 'granted') {
        await loadGpsCenter();
        return;
      }

      setPermissionState('denied');
    } catch {
      setPermissionState('error');
    }
  };

  const handleSkipLocation = () => {
    setPermissionState('denied');
  };

  const handleUseManualCenter = async () => {
    if (!manualArea.trim()) {
      setManualError('Enter a city or neighborhood first.');
      return;
    }

    setManualLoading(true);
    setManualError(null);

    try {
      const results = await Location.geocodeAsync(manualArea.trim());

      if (results.length === 0) {
        setManualError('Could not find that area. Try a nearby neighborhood or city.');
        return;
      }

      syncCenter(
        {
          lat: results[0].latitude,
          lng: results[0].longitude,
          label: manualArea.trim(),
        },
        'manual'
      );
    } catch {
      setManualError('Failed to geocode that area. Please try again.');
    } finally {
      setManualLoading(false);
    }
  };

  const handleViewDetails = () => {
    if (!selectedTask) return;
    navigation.navigate('TaskDetailsFixer', { taskId: selectedTask.id });
  };

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'list') setSelectedTaskId(null);
  }, []);

  const handleToggleCategory = useCallback((category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }, []);

  // ── Early returns for location-permission states ──────────────────────

  if (permissionState === 'checking' && !center) {
    return <LoadingScreen label="Checking location permissions..." />;
  }

  if (permissionState === 'error' && !center) {
    return (
      <View style={styles.stateContainer}>
        <EmptyState
          icon="map-marker-alert-outline"
          title="We could not access location yet"
          message="Try again to load nearby jobs."
          actionLabel="Retry"
          onAction={() => {
            setPermissionState('checking');
            evaluatePermissionState();
          }}
        />
      </View>
    );
  }

  if (permissionState === 'denied' && !center) {
    return (
      <View style={styles.manualContainer}>
        <Card style={styles.bannerCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.bannerTitle}>
              Using manual location
            </Text>
            <Text variant="bodyMedium" style={styles.bannerText}>
              Enable GPS in Settings for automatic detection, or enter your city or neighborhood
              to use as the discovery center.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.manualCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.manualTitle}>
              Enter your city or area
            </Text>
            <Text variant="bodyMedium" style={styles.manualSubtitle}>
              We will center the job map around the area you choose.
            </Text>

            <TextInput
              mode="outlined"
              label="City or neighborhood"
              placeholder="Hadar, Haifa"
              value={manualArea}
              onChangeText={setManualArea}
              style={styles.manualInput}
            />

            {manualError && (
              <Text variant="bodySmall" style={styles.manualError}>
                {manualError}
              </Text>
            )}

            <Button
              mode="contained"
              onPress={handleUseManualCenter}
              loading={manualLoading}
              disabled={manualLoading}
            >
              Use This Area
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (permissionState === 'rationale' && !center) {
    return (
      <View style={styles.rationaleContainer}>
        <Card style={styles.rationaleCard}>
          <Card.Content style={styles.rationaleContent}>
            <AppLogo />
            <Text variant="titleLarge" style={styles.rationaleTitle}>
              Find jobs near you
            </Text>
            <Text variant="bodyMedium" style={styles.rationaleBody}>
              We need a discovery center before we can place nearby tasks on the map.
            </Text>
          </Card.Content>
        </Card>

        <Portal>
          <Modal
            visible
            dismissable={false}
            contentContainerStyle={styles.modalContainer}
          >
            <Text variant="titleLarge" style={styles.modalTitle}>
              Share your location?
            </Text>
            <Text variant="bodyMedium" style={styles.modalText}>
              Fixlt needs your location to show you tasks nearby. You can change this in
              Settings.
            </Text>
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={handleSkipLocation} style={styles.modalButton}>
                Skip
              </Button>
              <Button mode="contained" onPress={handleAllowLocation} style={styles.modalButton}>
                Allow
              </Button>
            </View>
          </Modal>
        </Portal>
      </View>
    );
  }

  // ── Main discovery view (map or list with filter bar) ─────────────────

  return (
    <View style={styles.container}>
      <FilterBar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        radius={radius}
        onRadiusChange={setRadius}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
      />

      {viewMode === 'map' ? (
        <View style={styles.mapWrapper}>
          {mapRegion && center && (
            <DiscoveryMap
              tasks={tasks}
              centerLat={center.lat}
              centerLng={center.lng}
              mapRegion={mapRegion}
              onSelectTask={setSelectedTaskId}
              onClearSelection={() => setSelectedTaskId(null)}
              onRegionChangeComplete={setMapRegion}
            />
          )}

          {centerMode === 'manual' && center && (
            <Card style={styles.manualOverlayCard}>
              <Card.Content>
                <Text variant="labelLarge" style={styles.manualOverlayTitle}>
                  Using manual discovery center
                </Text>
                <Text variant="bodySmall" style={styles.manualOverlayText}>
                  {center.label}. Enable GPS in Settings to switch back to live location.
                </Text>
              </Card.Content>
            </Card>
          )}

          {loading && (
            <View style={styles.loadingOverlay}>
              <Card style={styles.overlayCard}>
                <Card.Content style={styles.overlayContent}>
                  <ActivityIndicator size="small" />
                  <Text variant="bodyMedium" style={styles.overlayText}>
                    Loading nearby tasks...
                  </Text>
                </Card.Content>
              </Card>
            </View>
          )}

          {!loading && error && (
            <View style={styles.loadingOverlay}>
              <Card style={styles.overlayCard}>
                <Card.Content>
                  <Text variant="titleSmall" style={styles.errorTitle}>
                    Could not load jobs
                  </Text>
                  <Text variant="bodySmall" style={styles.overlayText}>
                    {error}
                  </Text>
                  <Button mode="contained" onPress={refetch} style={styles.retryButton}>
                    Try Again
                  </Button>
                </Card.Content>
              </Card>
            </View>
          )}

          {!loading && !error && tasks.length === 0 && (
            <View style={styles.loadingOverlay}>
              <Card style={styles.overlayCard}>
                <Card.Content style={styles.emptyOverlay}>
                  <EmptyState
                    icon="map-search-outline"
                    title="No tasks found nearby"
                    message="Try expanding your distance filter or adjusting category and price filters."
                  />
                </Card.Content>
              </Card>
            </View>
          )}

          {selectedTask && !loading && (
            <View style={styles.previewCardWrapper}>
              <DiscoveryPreviewCard task={selectedTask} onViewDetails={handleViewDetails} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.listWrapper}>
          {loading ? (
            <LoadingScreen label="Loading nearby tasks..." />
          ) : error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Could not load jobs"
              message={error}
              actionLabel="Try Again"
              onAction={refetch}
            />
          ) : tasks.length === 0 ? (
            <EmptyState
              icon="map-search-outline"
              title="No tasks found in your area"
              message="Try expanding your distance filter or changing categories."
            />
          ) : (
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <DiscoveryListCard
                  task={item}
                  onPress={() => navigation.navigate('TaskDetailsFixer', { taskId: item.id })}
                />
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  manualContainer: {
    flex: 1,
    backgroundColor: brandColors.background,
    padding: 20,
    justifyContent: 'center',
  },
  rationaleContainer: {
    flex: 1,
    backgroundColor: brandColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  rationaleCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 28,
    backgroundColor: brandColors.surface,
  },
  rationaleContent: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  rationaleTitle: {
    color: brandColors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  rationaleBody: {
    color: brandColors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  bannerCard: {
    borderRadius: 24,
    backgroundColor: brandColors.warningSoft,
    marginBottom: 16,
  },
  bannerTitle: {
    color: brandColors.warning,
    fontWeight: '700',
  },
  bannerText: {
    color: brandColors.textPrimary,
    marginTop: 8,
    lineHeight: 20,
  },
  manualCard: {
    borderRadius: 28,
    backgroundColor: brandColors.surface,
  },
  manualTitle: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  manualSubtitle: {
    color: brandColors.textMuted,
    marginTop: 8,
    marginBottom: 16,
  },
  manualInput: {
    marginBottom: 8,
    backgroundColor: brandColors.surface,
  },
  manualError: {
    color: brandColors.danger,
    marginBottom: 12,
  },
  mapWrapper: {
    flex: 1,
  },
  manualOverlayCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    borderRadius: 20,
    backgroundColor: brandColors.surface,
  },
  manualOverlayTitle: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  manualOverlayText: {
    color: brandColors.textMuted,
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    pointerEvents: 'box-none',
  },
  overlayCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: brandColors.surface,
  },
  overlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overlayText: {
    color: brandColors.textMuted,
    marginTop: 6,
  },
  errorTitle: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 999,
  },
  emptyOverlay: {
    minHeight: 260,
  },
  previewCardWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
  modalContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 28,
    backgroundColor: brandColors.surface,
  },
  modalTitle: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  modalText: {
    color: brandColors.textMuted,
    marginTop: 12,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 999,
  },
});
