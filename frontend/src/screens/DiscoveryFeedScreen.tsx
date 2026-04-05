import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Portal,
  Modal,
  Text,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import AppLogo from '../components/AppLogo';
import DiscoveryMap from '../components/DiscoveryMap';
import type { DiscoveryMapRegion } from '../components/DiscoveryMap.types';
import DiscoveryPreviewCard from '../components/DiscoveryPreviewCard';
import DiscoveryListCard from '../components/DiscoveryListCard';
import EmptyState from '../components/EmptyState';
import FilterBar, { type PriceRange, type ViewMode } from '../components/FilterBar';
import LoadingScreen from '../components/LoadingScreen';
import { FButton, FCard, FInput } from '../components/ui';
import useTasks, { type Category } from '../hooks/useTasks';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

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
      { lat: position.coords.latitude, lng: position.coords.longitude, label: 'Current location' },
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
        { lat: results[0].latitude, lng: results[0].longitude, label: manualArea.trim() },
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

  // Early returns for location-permission states

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
        <View style={styles.manualBanner}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={20} color={brandColors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: brandColors.warning }]}>Using manual location</Text>
            <Text style={[typography.bodySm, { color: brandColors.textPrimary, marginTop: spacing.xs }]}>
              Enable GPS in Settings for automatic detection.
            </Text>
          </View>
        </View>

        <FCard style={styles.manualCard} shadow="md">
          <Text style={[typography.h2, { color: brandColors.textPrimary, marginBottom: spacing.sm }]}>
            Enter your city or area
          </Text>
          <Text style={[typography.bodySm, { color: brandColors.textMuted, marginBottom: spacing.lg }]}>
            We will center the job map around the area you choose.
          </Text>

          <FInput
            label="City or neighborhood"
            placeholder="Hadar, Haifa"
            value={manualArea}
            onChangeText={setManualArea}
          />

          {manualError && (
            <Text style={[typography.bodySm, { color: brandColors.danger, marginTop: spacing.sm }]}>
              {manualError}
            </Text>
          )}

          <FButton
            onPress={handleUseManualCenter}
            loading={manualLoading}
            disabled={manualLoading}
            fullWidth
            icon="map-marker-check-outline"
            style={{ marginTop: spacing.lg }}
          >
            Use This Area
          </FButton>
        </FCard>
      </View>
    );
  }

  if (permissionState === 'rationale' && !center) {
    return (
      <View style={styles.rationaleContainer}>
        <FCard style={styles.rationaleCard} shadow="md">
          <View style={styles.rationaleContent}>
            <AppLogo />
            <Text style={[typography.h2, { color: brandColors.textPrimary, textAlign: 'center' }]}>
              Find jobs near you
            </Text>
            <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center', maxWidth: 300 }]}>
              We need a discovery center before we can place nearby tasks on the map.
            </Text>
          </View>
        </FCard>

        <Portal>
          <Modal
            visible
            dismissable={false}
            contentContainerStyle={styles.modalContainer}
          >
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={32} color={brandColors.primary} />
            </View>
            <Text style={[typography.h2, { color: brandColors.textPrimary, textAlign: 'center' }]}>
              Share your location?
            </Text>
            <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
              Fixlt needs your location to show you tasks nearby. You can change this in Settings.
            </Text>
            <View style={styles.modalActions}>
              <FButton variant="outline" onPress={handleSkipLocation} style={{ flex: 1 }}>
                Skip
              </FButton>
              <FButton onPress={handleAllowLocation} style={{ flex: 1 }} icon="crosshairs-gps">
                Allow
              </FButton>
            </View>
          </Modal>
        </Portal>
      </View>
    );
  }

  // Main discovery view

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
            <View style={styles.manualOverlay}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={brandColors.primary} />
              <Text style={[typography.caption, { color: brandColors.primary, flex: 1 }]}>
                {center.label}
              </Text>
            </View>
          )}

          {loading && (
            <View style={styles.loadingOverlay}>
              <FCard style={styles.overlayCard} shadow="md">
                <View style={styles.overlayContent}>
                  <ActivityIndicator size="small" color={brandColors.primary} />
                  <Text style={[typography.body, { color: brandColors.textMuted }]}>
                    Loading nearby tasks...
                  </Text>
                </View>
              </FCard>
            </View>
          )}

          {!loading && error && (
            <View style={styles.loadingOverlay}>
              <FCard style={styles.overlayCard} shadow="md">
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>Could not load jobs</Text>
                <Text style={[typography.bodySm, { color: brandColors.textMuted, marginTop: spacing.sm }]}>
                  {error}
                </Text>
                <FButton onPress={refetch} size="sm" style={{ marginTop: spacing.lg }}>
                  Try Again
                </FButton>
              </FCard>
            </View>
          )}

          {!loading && !error && tasks.length === 0 && (
            <View style={styles.loadingOverlay}>
              <FCard style={styles.overlayCard} shadow="md">
                <EmptyState
                  icon="map-search-outline"
                  title="No tasks found nearby"
                  message="Try expanding your distance filter or adjusting category and price filters."
                />
              </FCard>
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
              onRefresh={refetch}
              refreshing={loading}
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
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  manualBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.warningSoft,
  },
  manualCard: {
    padding: spacing.xxl,
  },
  rationaleContainer: {
    flex: 1,
    backgroundColor: brandColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  rationaleCard: {
    width: '100%',
    maxWidth: 460,
    padding: spacing.xxl,
  },
  rationaleContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  modalContainer: {
    margin: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radii.xxxl,
    backgroundColor: brandColors.surface,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
    width: '100%',
  },
  mapWrapper: {
    flex: 1,
  },
  manualOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: brandColors.surface,
    ...shadows.sm,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    pointerEvents: 'box-none',
  },
  overlayCard: {
    width: '100%',
    maxWidth: 360,
    padding: spacing.xxl,
  },
  overlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewCardWrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
});
