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
import api from '../api/axiosInstance';
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
const DEFAULT_DELTA = 0.03;

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
  const [fixerGps, setFixerGps] = useState<{ lat: number; lng: number } | null>(null);
  const [bidTaskIds, setBidTaskIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user ID once on mount to filter out own tasks
  useEffect(() => {
    api.get('/api/users/me')
      .then((res) => setCurrentUserId(res.data.user?.id ?? null))
      .catch(() => { /* ignore */ });
  }, []);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<DiscoveryMapRegion | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [radius, setRadius] = useState(DEFAULT_RADIUS_KM);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(PRICE_SLIDER_MAX);

  const hasPriceFilter = priceMin > 0 || priceMax < PRICE_SLIDER_MAX;
  const apiMinPrice = hasPriceFilter ? priceMin : null;
  const apiMaxPrice = hasPriceFilter ? (priceMax < PRICE_SLIDER_MAX ? priceMax : 999999) : null;
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
    let filtered = rawTasks;
    // Hide tasks the current user created (fixer shouldn't see own tasks)
    if (currentUserId) {
      filtered = filtered.filter((t) => t.requesterId !== currentUserId);
    }
    if (selectedCategories.length > 1) {
      filtered = filtered.filter((t) => selectedCategories.includes(t.category));
    }
    return filtered;
  }, [rawTasks, selectedCategories, currentUserId]);

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
    try {
      let gps: { lat: number; lng: number };

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        // Use browser geolocation directly — expo-location can hang on web
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60_000,
          });
        });
        gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } else {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        gps = { lat: position.coords.latitude, lng: position.coords.longitude };
      }

      setFixerGps(gps);
      syncCenter({ ...gps, label: 'Current location' }, 'gps');
    } catch {
      // GPS failed — fall back to default
      syncCenter(DEFAULT_CENTER, 'manual');
    }
  }, [syncCenter]);

  const evaluatePermissionState = useCallback(async () => {
    setSearchError(null);
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        // If the user already chose a work area manually, respect it — don't snap back to GPS.
        if (centerMode === 'manual') {
          setPermissionState('ready');
          return;
        }
        await loadGpsCenter();
        return;
      }
      if (permission.status === 'undetermined') {
        setPermissionState('rationale');
        return;
      }
      // GPS denied — keep manual center if set, otherwise default to Tel Aviv
      if (centerMode === 'manual') {
        setPermissionState('ready');
        return;
      }
      syncCenter(DEFAULT_CENTER, 'manual');
    } catch {
      if (centerMode !== 'manual') syncCenter(DEFAULT_CENTER, 'manual');
    }
  // Intentionally exclude `center` — including it causes useFocusEffect to re-run
  // every time the center changes, which would snap the map back to GPS after a manual search.
  }, [centerMode, loadGpsCenter, syncCenter]);

  useFocusEffect(
    useCallback(() => {
      evaluatePermissionState();
      // Fetch fixer's bids for green markers
      api.get('/api/users/me/bids', { params: { limit: 50 } })
        .then((res) => {
          const ids = new Set<string>(
            (res.data.bids ?? [])
              .filter((b: { status: string }) => b.status === 'PENDING' || b.status === 'ACCEPTED')
              .map((b: { task_id: string }) => b.task_id),
          );
          setBidTaskIds(ids);
        })
        .catch(() => { /* ignore */ });
    }, [evaluatePermissionState])
  );

  useEffect(() => {
    if (selectedTaskId && !selectedTask) {
      setSelectedTaskId(null);
    }
  }, [selectedTask, selectedTaskId]);

  const handleAllowLocation = async () => {
    try {
      if (Platform.OS === 'web') {
        // On web, skip expo-location permission API — go straight to browser geolocation
        // which triggers the native permission prompt automatically
        await loadGpsCenter();
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        await loadGpsCenter();
        return;
      }
      syncCenter(DEFAULT_CENTER, 'manual');
    } catch {
      syncCenter(DEFAULT_CENTER, 'manual');
    }
  };

  const handleSkipLocation = () => {
    syncCenter(DEFAULT_CENTER, 'manual');
  };

  // --- Autocomplete & geocoding ---
  // We use PlacesService.getDetails (placeId → lat/lng) instead of the REST Geocoding API.
  // This works with just the Places library already loaded — no separate Geocoding API needed.

  function getOrCreatePlacesService(): google.maps.places.PlacesService | null {
    if (placesServiceRef.current) return placesServiceRef.current;
    if (typeof google === 'undefined' || !google.maps?.places) return null;
    // PlacesService needs a DOM node that is attached to the document body,
    // otherwise getDetails silently fails in some browsers.
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;';
    document.body.appendChild(div);
    placesServiceRef.current = new google.maps.places.PlacesService(div);
    return placesServiceRef.current;
  }

  const geocodeByPlaceId = useCallback((placeId: string, label: string) => {
    const service = getOrCreatePlacesService();
    if (!service) {
      setSearchError('Maps not ready — please try again.');
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    service.getDetails(
      { placeId, fields: ['geometry', 'formatted_address', 'name'] },
      (place, status) => {
        setSearchLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const loc = place.geometry.location;
          syncCenter({ lat: loc.lat(), lng: loc.lng(), label }, 'manual');
        } else {
          setSearchError('Could not resolve that place. Please try again.');
        }
      },
    );
  }, [syncCenter]);

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
        // Places library not loaded yet — ignore
      }
    }, 300);
  }, []);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    setSearchError(null);
    fetchSuggestions(text);
  }, [fetchSuggestions]);

  // Select an autocomplete suggestion — geocode via placeId (reliable, no REST Geocoding API needed)
  const handleSelectSuggestion = useCallback((placeId: string, description: string) => {
    setSearchText(description);
    geocodeByPlaceId(placeId, description);
  }, [geocodeByPlaceId]);

  // Submit raw text — first get the top prediction, then geocode its placeId
  const handleSearchSubmit = useCallback(() => {
    const query = searchText.trim();
    if (!query) return;
    setShowSuggestions(false);

    if (!autocompleteRef.current && typeof google !== 'undefined' && google.maps?.places) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
    }
    const autoSvc = autocompleteRef.current;
    if (!autoSvc) {
      setSearchError('Maps not ready — please try again.');
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    autoSvc.getPlacePredictions(
      { input: query, types: ['geocode'] },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions?.[0]) {
          geocodeByPlaceId(predictions[0].place_id, predictions[0].description);
        } else {
          setSearchLoading(false);
          setSearchError('No results found for that area.');
        }
      },
    );
  }, [searchText, geocodeByPlaceId]);

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

      {/* Work-area search strip — always visible, affects both map and list */}
      <View style={styles.workAreaStrip}>
        <MaterialCommunityIcons name="briefcase-search-outline" size={16} color={brandColors.primary} />
        <View style={styles.workAreaInputWrapper}>
          <FInput
            placeholder="Search a city or area to find work there…"
            value={searchText}
            onChangeText={handleSearchTextChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onSubmitEditing={handleSearchSubmit}
            dense
            style={styles.workAreaInput}
            right={
              searchText.length > 0 ? (
                <FInput.Icon
                  icon="close-circle"
                  size={16}
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
                    onPress={() => handleSelectSuggestion(s.placeId, s.description)}
                  >
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={brandColors.textMuted} />
                    <Text style={[typography.bodySm, { color: brandColors.textPrimary, flex: 1 }]} numberOfLines={1}>
                      {s.description}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        {searchLoading ? (
          <ActivityIndicator size="small" color={brandColors.primary} />
        ) : (
          <Pressable onPress={handleSearchSubmit} style={styles.searchGoBtn}>
            <MaterialCommunityIcons name="arrow-right" size={18} color={brandColors.surface} />
          </Pressable>
        )}
      </View>
      {center && centerMode === 'manual' && !searchLoading && (
        <View style={styles.workAreaActiveBar}>
          <MaterialCommunityIcons name="map-marker-check" size={13} color={brandColors.success} />
          <Text style={[typography.caption, { color: brandColors.textMuted, flex: 1 }]} numberOfLines={1}>
            Showing tasks in: <Text style={{ color: brandColors.textPrimary, fontWeight: '600' }}>{center.label}</Text>
          </Text>
          <Pressable onPress={() => { setSearchText(''); loadGpsCenter(); }}>
            <Text style={[typography.caption, { color: brandColors.primary, fontWeight: '600' }]}>Use my location</Text>
          </Pressable>
        </View>
      )}
      {searchError && (
        <View style={styles.searchErrorBar}>
          <MaterialCommunityIcons name="alert-circle-outline" size={13} color={brandColors.danger} />
          <Text style={[typography.caption, { color: brandColors.danger }]}>{searchError}</Text>
        </View>
      )}

      {viewMode === 'map' ? (
        <View style={styles.mapWrapper}>
          {mapRegion && center && (
            <DiscoveryMap
              tasks={tasks}
              centerLat={center.lat}
              centerLng={center.lng}
              fixerLat={fixerGps?.lat}
              fixerLng={fixerGps?.lng}
              bidTaskIds={bidTaskIds}
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
  workAreaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: brandColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
    zIndex: 20,
  },
  workAreaInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  workAreaInput: {
    backgroundColor: brandColors.surfaceAlt,
    fontSize: 13,
  },
  workAreaActiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 1,
    backgroundColor: brandColors.successSoft ?? brandColors.surfaceAlt,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
  },
  searchErrorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 1,
    backgroundColor: brandColors.dangerSoft ?? '#fff0f0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
  },
  searchGoBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: brandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    borderTopWidth: 0,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    zIndex: 30,
    ...shadows.md,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
  },
  mapWrapper: {
    flex: 1,
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
