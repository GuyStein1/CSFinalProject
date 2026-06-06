import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
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
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const supportsWorkAreaSearch = Platform.OS === 'web';
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
  const [bidFilter, setBidFilter] = useState<'all' | 'has_bid' | 'no_bid'>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
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
  const hasActiveFilters = radius !== DEFAULT_RADIUS_KM || selectedCategories.length > 0 || hasPriceFilter;
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
    // Apply bid filter from stats pills
    if (bidFilter === 'has_bid') {
      filtered = filtered.filter((t) => bidTaskIds.has(t.id));
    } else if (bidFilter === 'no_bid') {
      filtered = filtered.filter((t) => !bidTaskIds.has(t.id));
    }
    return filtered;
  }, [rawTasks, selectedCategories, currentUserId, bidFilter, bidTaskIds]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );

  const priceSummary = hasPriceFilter
    ? `₪${priceMin}-${priceMax >= PRICE_SLIDER_MAX ? '5000+' : priceMax}`
    : t('discovery.filters.anyBudget');
  const categorySummary =
    selectedCategories.length === 0
      ? t('discovery.filters.allTrades')
      : selectedCategories.length === 1
        ? t('discovery.filters.oneTrade')
        : t('discovery.filters.nTrades', { n: selectedCategories.length });

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
      syncCenter({ ...gps, label: t('discovery.filterBar.currentLocation') }, 'gps');
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

  const handleUseDefaultLocation = () => {
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
      setSearchError(t('discovery.error.mapsNotReady'));
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
          setSearchError(t('discovery.error.couldNotResolve'));
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
      setSearchError(t('discovery.error.mapsNotReady'));
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
          setSearchError(t('discovery.error.noResults'));
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

  const handleClearFilters = useCallback(() => {
    setRadius(DEFAULT_RADIUS_KM);
    setSelectedCategories([]);
    setPriceMin(0);
    setPriceMax(PRICE_SLIDER_MAX);
  }, []);

  // Early returns for location-permission states

  if (permissionState === 'checking' && !center) {
    return <LoadingScreen label={t('discovery.location.checking')} />;
  }

  if (permissionState === 'rationale' && !center) {
    return (
      <View style={styles.rationaleContainer}>
        <FCard style={styles.rationaleCard} shadow="md">
          <View style={styles.rationaleContent}>
            <AppLogo />
            <Text style={[typography.h2, { color: brandColors.textPrimary, textAlign: 'center' }]}>
              {t('discovery.location.rationale.title')}
            </Text>
            <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center', maxWidth: 300 }]}>
              {t('discovery.location.rationale.description')}
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
              {t('discovery.location.modal.title')}
            </Text>
            <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
              {t('discovery.location.modal.description')}
            </Text>
            <View style={styles.modalActions}>
              <FButton variant="outline" onPress={handleUseDefaultLocation} style={{ flex: 1 }}>
                {t('discovery.location.modal.useTelAviv')}
              </FButton>
              <FButton onPress={handleAllowLocation} style={{ flex: 1 }} icon="crosshairs-gps">
                {t('discovery.location.modal.allow')}
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
      <View style={[styles.workspaceHeader, isWide && styles.workspaceHeaderWide]}>
        <View style={styles.workspaceHeaderMain}>
          <View style={styles.headerKickerRow}>
            <View style={styles.headerIconShell}>
              <MaterialCommunityIcons name="toolbox-outline" size={17} color={brandColors.secondary} />
            </View>
            <Text style={[styles.headerKicker, { textAlign: isRTL ? 'right' : 'left' }]}>{t('discovery.header.kicker')}</Text>
          </View>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('discovery.header.title')}</Text>
          <Text style={[styles.headerSub, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {t('discovery.header.sub', { location: center?.label ?? t('discovery.location.workArea'), categories: categorySummary, budget: priceSummary })}
          </Text>
        </View>

        <View style={[styles.workspaceStats, isWide && styles.workspaceStatsWide]}>
          <Pressable
            style={[styles.workspaceStat, bidFilter === 'all' && styles.workspaceStatActive]}
            onPress={() => setBidFilter('all')}
          >
            <Text style={styles.workspaceStatValue}>{loading ? '...' : rawTasks.filter((t) => !currentUserId || t.requesterId !== currentUserId).length}</Text>
            <Text style={styles.workspaceStatLabel}>{t('discovery.stats.openJobs')}</Text>
          </Pressable>
          <Pressable
            style={[styles.workspaceStat, bidFilter === 'no_bid' && styles.workspaceStatActive]}
            onPress={() => setBidFilter('no_bid')}
          >
            <Text style={styles.workspaceStatValue}>{loading ? '...' : rawTasks.filter((task) => (!currentUserId || task.requesterId !== currentUserId) && !bidTaskIds.has(task.id)).length}</Text>
            <Text style={styles.workspaceStatLabel}>{t('discovery.stats.new')}</Text>
          </Pressable>
          <Pressable
            style={[styles.workspaceStat, bidFilter === 'has_bid' && styles.workspaceStatActive]}
            onPress={() => setBidFilter('has_bid')}
          >
            <Text style={styles.workspaceStatValue}>{bidTaskIds.size}</Text>
            <Text style={styles.workspaceStatLabel}>{t('discovery.stats.alreadyBid')}</Text>
          </Pressable>
          <Pressable
            style={[styles.workspaceStat, showFilterPanel && styles.workspaceStatActive]}
            onPress={() => setShowFilterPanel(!showFilterPanel)}
          >
            <Text style={styles.workspaceStatValue}>{radius} km</Text>
            <Text style={styles.workspaceStatLabel}>{t('discovery.stats.range')}</Text>
          </Pressable>
        </View>
      </View>

      <FilterBar
        compact={isWide && Platform.OS === 'web'}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        radius={radius}
        onRadiusChange={setRadius}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        priceMin={priceMin}
        priceMax={priceMax}
        onPriceChange={(min, max) => { setPriceMin(min); setPriceMax(max); }}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        forceExpanded={showFilterPanel}
      />

      {/* Work-area search uses Google Places on web; native keeps GPS/default centers only. */}
      {supportsWorkAreaSearch && (
        <View style={[styles.workAreaStrip, isWide && styles.workAreaStripWide]}>
          <MaterialCommunityIcons name="briefcase-search-outline" size={16} color={brandColors.primary} />
          <View style={styles.workAreaInputWrapper}>
            <FInput
              placeholder={t('discovery.location.searchPlaceholder')}
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
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${s.description} as work area`}
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
            <Pressable
              onPress={handleSearchSubmit}
              style={styles.searchGoBtn}
              accessibilityRole="button"
              accessibilityLabel="Search this work area"
            >
              <MaterialCommunityIcons name="arrow-right" size={18} color={brandColors.surface} />
            </Pressable>
          )}
        </View>
      )}
      {center && centerMode === 'manual' && !searchLoading && (
        <View style={[styles.workAreaActiveBar, isWide && styles.workAreaActiveBarWide]}>
          <MaterialCommunityIcons name="map-marker-check" size={13} color={brandColors.success} />
          <Text style={[typography.caption, { color: brandColors.textMuted, flex: 1 }]} numberOfLines={1}>
            {t('discovery.location.showingTasksIn')}<Text style={{ color: brandColors.textPrimary, fontWeight: '600' }}>{center.label}</Text>
          </Text>
          <Pressable
            onPress={() => { setSearchText(''); loadGpsCenter(); }}
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
          >
            <Text style={[typography.caption, { color: brandColors.primary, fontWeight: '600' }]}>{t('discovery.location.useMyLocation')}</Text>
          </Pressable>
        </View>
      )}
      {searchError && (
        <View style={[styles.searchErrorBar, isWide && styles.searchErrorBarWide]}>
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
                    {t('discovery.loading.nearby')}
                  </Text>
                </View>
              </FCard>
            </View>
          )}

          {!loading && error && (
            <View style={styles.loadingOverlay}>
              <FCard style={styles.overlayCard} shadow="md">
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{t('discovery.error.couldNotLoad')}</Text>
                <Text style={[typography.bodySm, { color: brandColors.textMuted, marginTop: spacing.sm }]}>
                  {error}
                </Text>
                <FButton onPress={refetch} size="sm" style={{ marginTop: spacing.lg }}>
                  {t('discovery.filters.retry')}
                </FButton>
              </FCard>
            </View>
          )}

          {!loading && !error && tasks.length === 0 && (
            <View style={styles.loadingOverlay}>
              <FCard style={styles.overlayCard} shadow="md">
                <EmptyState
                  icon="map-search-outline"
                  title={t('discovery.empty.noTasks.title')}
                  message={t('discovery.empty.noTasks.message')}
                />
              </FCard>
            </View>
          )}

          {selectedTask && !loading && (
            <View style={styles.previewCardWrapper}>
              <DiscoveryPreviewCard
                task={selectedTask}
                hasBid={bidTaskIds.has(selectedTask.id)}
                onViewDetails={handleViewDetails}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.listWrapper}>
          {loading ? (
            <LoadingScreen label={t('discovery.loading.nearby')} />
          ) : error ? (
            <EmptyState
              icon="alert-circle-outline"
              title={t('discovery.error.couldNotLoad')}
              message={error}
              actionLabel={t('discovery.filters.retry')}
              onAction={refetch}
            />
          ) : tasks.length === 0 ? (
            <EmptyState
              icon="map-search-outline"
              title={t('discovery.empty.noTasksArea.title')}
              message={t('discovery.empty.noTasksArea.message')}
            />
          ) : (
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <DiscoveryListCard
                  task={item}
                  hasBid={bidTaskIds.has(item.id)}
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
  workspaceHeader: {
    backgroundColor: brandColors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: brandColors.secondary,
  },
  workspaceHeaderWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  workspaceHeaderMain: {
    flex: 1,
    gap: spacing.xs,
  },
  headerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconShell: {
    width: 26,
    height: 26,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(241,181,69,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241,181,69,0.22)',
  },
  headerKicker: {
    ...typography.eyebrow,
    color: brandColors.secondary,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.textOnDark,
  },
  headerSub: {
    ...typography.bodySm,
    color: brandColors.textOnDarkMuted,
    maxWidth: 560,
  },
  workspaceStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  workspaceStatsWide: {
    justifyContent: 'flex-end',
    minWidth: 280,
  },
  workspaceStat: {
    minWidth: 88,
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,252,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.14)',
  },
  workspaceStatActive: {
    borderColor: brandColors.secondary,
    borderWidth: 2,
    backgroundColor: 'rgba(241,181,69,0.12)',
  },
  workspaceStatValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.secondary,
  },
  workspaceStatLabel: {
    ...typography.caption,
    color: brandColors.textOnDarkMuted,
    marginTop: 1,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: brandColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
    zIndex: 20,
  },
  workAreaStripWide: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
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
    backgroundColor: brandColors.successSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
  },
  workAreaActiveBarWide: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 5,
  },
  searchErrorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 1,
    backgroundColor: brandColors.dangerSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
  },
  searchErrorBarWide: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 5,
  },
  searchGoBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
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
    backgroundColor: brandColors.neutralSoft,
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
    paddingVertical: spacing.lg,
    paddingBottom: spacing.huge,
  },
});
