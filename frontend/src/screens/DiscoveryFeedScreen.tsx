import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import FilterBar, { type ViewMode } from '../components/FilterBar';
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

// Default center (Tel Aviv) when GPS is unavailable
const DEFAULT_CENTER: DiscoveryCenter = { lat: 32.0853, lng: 34.7818, label: 'Tel Aviv' };

const PRICE_SLIDER_MAX = 5000;

export default function DiscoveryFeedScreen({ navigation }: Props) {
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const [centerMode, setCenterMode] = useState<CenterMode>('gps');
  const [center, setCenter] = useState<DiscoveryCenter | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ placeId: string; description: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<DiscoveryMapRegion | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [radius, setRadius] = useState(DEFAULT_RADIUS_KM);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(PRICE_SLIDER_MAX);

  const apiMinPrice = priceMin > 0 ? priceMin : null;
  const apiMaxPrice = priceMax < PRICE_SLIDER_MAX ? priceMax : null;
  const apiCategory = selectedCategories.length === 1 ? selectedCategories[0] : null;

  const { tasks: rawTasks, loading, error, refetch } = useTasks({
    lat: center?.lat,
    lng: center?.lng,
    radius,
    category: apiCategory,
    minPrice: apiMinPrice,
    maxPrice: apiMaxPrice,
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
    setSearchError(null);
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
      // GPS denied — default to Tel Aviv and go straight to map
      syncCenter(DEFAULT_CENTER, 'manual');
    } catch {
      // On error, still show the map with default center
      syncCenter(DEFAULT_CENTER, 'manual');
    }
  }, [center, centerMode, loadGpsCenter, syncCenter]);

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
      // Denied — go straight to map with default
      syncCenter(DEFAULT_CENTER, 'manual');
    } catch {
      syncCenter(DEFAULT_CENTER, 'manual');
    }
  };

  const handleSkipLocation = () => {
    syncCenter(DEFAULT_CENTER, 'manual');
  };

  // --- Autocomplete ---

  const fetchSuggestions = useCallback((text: string) => {
    if (Platform.OS !== 'web' || text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        if (!autocompleteRef.current && typeof google !== 'undefined' && google.maps?.places) {
          autocompleteRef.current = new google.maps.places.AutocompleteService();
        }
        const service = autocompleteRef.current;
        if (!service) return;
        service.getPlacePredictions(
          { input: text.trim(), types: ['geocode'] },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              setSuggestions(
                predictions.slice(0, 5).map((p) => ({ placeId: p.place_id, description: p.description })),
              );
              setShowSuggestions(true);
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
            }
          },
        );
      } catch {
        // Places library not loaded yet
      }
    }, 300);
  }, []);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    setSearchError(null);
    fetchSuggestions(text);
  }, [fetchSuggestions]);

  const geocodeAndCenter = useCallback(async (address: string) => {
    setSearchLoading(true);
    setSearchError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (key) {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`,
          );
          const data = await res.json();
          if (data.status === 'OK' && data.results.length > 0) {
            lat = data.results[0].geometry.location.lat;
            lng = data.results[0].geometry.location.lng;
          }
        } catch {
          // Fall through to expo-location
        }
      }

      if (lat === null || lng === null) {
        const results = await Location.geocodeAsync(address);
        if (results.length > 0) {
          lat = results[0].latitude;
          lng = results[0].longitude;
        }
      }

      if (lat === null || lng === null) {
        setSearchError('Could not find that area.');
        return;
      }
      syncCenter({ lat, lng, label: address }, 'manual');
    } catch {
      setSearchError('Failed to search. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  }, [syncCenter]);

  const handleSelectSuggestion = useCallback((description: string) => {
    setSearchText(description);
    geocodeAndCenter(description);
  }, [geocodeAndCenter]);

  const handleSearchSubmit = useCallback(() => {
    if (!searchText.trim()) return;
    setShowSuggestions(false);
    geocodeAndCenter(searchText.trim());
  }, [searchText, geocodeAndCenter]);

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

  // Main discovery view — always show the map

  return (
    <View style={styles.container}>
      <FilterBar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        radius={radius}
        onRadiusChange={setRadius}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        priceMin={priceMin}
        priceMax={priceMax}
        onPriceChange={(min, max) => { setPriceMin(min); setPriceMax(max); }}
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
              onClearSelection={() => {
                setSelectedTaskId(null);
                setShowSuggestions(false);
                setSearchFocused(false);
              }}
              onRegionChangeComplete={setMapRegion}
            />
          )}

          {/* Search bar overlay */}
          <View style={styles.searchOverlay}>
            <View style={styles.searchBarContainer}>
              <FInput
                placeholder="Search city, street, or area..."
                value={searchText}
                onChangeText={handleSearchTextChange}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  // Delay hiding so suggestion press can register
                  setTimeout(() => setSearchFocused(false), 200);
                }}
                onSubmitEditing={handleSearchSubmit}
                dense
                style={styles.searchInput}
                left={<FInput.Icon icon="magnify" size={20} />}
                right={
                  searchText.length > 0 ? (
                    <FInput.Icon
                      icon="close-circle"
                      size={18}
                      onPress={() => {
                        setSearchText('');
                        setSuggestions([]);
                        setShowSuggestions(false);
                        setSearchError(null);
                      }}
                    />
                  ) : undefined
                }
              />
              {searchLoading && (
                <ActivityIndicator
                  size="small"
                  color={brandColors.primary}
                  style={styles.searchSpinner}
                />
              )}
            </View>

            {showSuggestions && suggestions.length > 0 && searchFocused && (
              <View style={styles.suggestionsContainer}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.placeId}
                      style={({ pressed }) => [
                        styles.suggestionItem,
                        pressed && { backgroundColor: brandColors.surfaceAlt },
                      ]}
                      onPress={() => handleSelectSuggestion(s.description)}
                    >
                      <MaterialCommunityIcons name="map-marker-outline" size={16} color={brandColors.textMuted} />
                      <Text style={[typography.body, { color: brandColors.textPrimary, flex: 1 }]} numberOfLines={1}>
                        {s.description}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {searchError && (
              <View style={styles.searchErrorBubble}>
                <Text style={[typography.bodySm, { color: brandColors.danger }]}>{searchError}</Text>
              </View>
            )}
          </View>

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
  searchOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: brandColors.surface,
    fontSize: 14,
  },
  searchSpinner: {
    position: 'absolute',
    right: 48,
  },
  searchErrorBubble: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: brandColors.surface,
    ...shadows.sm,
  },
  suggestionsContainer: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    borderTopWidth: 0,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    backgroundColor: brandColors.surface,
    ...shadows.md,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
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
