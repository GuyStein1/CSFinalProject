import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  SegmentedButtons,
  Portal,
  Modal,
  IconButton,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../api/axiosInstance';
import LocationMap from '../components/LocationMap';
import { FButton, FInput } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

type Category = 'ASSEMBLY' | 'MOUNTING' | 'MOVING' | 'PAINTING' | 'PLUMBING' | 'ELECTRICITY' | 'OUTDOORS' | 'CLEANING';

const CATEGORIES: { value: Category; label: string; icon: string; color: string; bg: string }[] = [
  { value: 'ASSEMBLY',    label: 'Assembly',    icon: 'hammer-screwdriver', color: '#7B61FF', bg: '#EFECFF' },
  { value: 'MOUNTING',    label: 'Mounting',    icon: 'television',         color: '#0D7C6E', bg: '#E0F5F3' },
  { value: 'MOVING',      label: 'Moving',      icon: 'truck-delivery',     color: '#1E8449', bg: '#E6F4EC' },
  { value: 'PAINTING',    label: 'Painting',    icon: 'brush',              color: '#C0392B', bg: '#FCECEA' },
  { value: 'PLUMBING',    label: 'Plumbing',    icon: 'water-pump',         color: '#2E86C1', bg: '#E4F2FB' },
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt',     color: '#D4900A', bg: '#FEF3D7' },
  { value: 'OUTDOORS',    label: 'Outdoors',    icon: 'tree-outline',       color: '#27AE60', bg: '#E8F8EF' },
  { value: 'CLEANING',    label: 'Cleaning',    icon: 'broom',             color: '#8E44AD', bg: '#F4ECF7' },
];

const STEP_ICONS = ['text-box-outline', 'camera-outline', 'shape-outline', 'cash-multiple', 'map-marker-outline'];
const STEP_LABELS = ['Details', 'Photos', 'Category', 'Budget', 'Location'];

interface Props {
  navigation: { goBack: () => void; navigate: (screen: string) => void };
  route?: { params?: { category?: Category } };
}

export default function CreateTask({ navigation, route }: Props) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [category, setCategory] = useState<Category | null>(route?.params?.category ?? null);
  const [budgetType, setBudgetType] = useState<'fixed' | 'quote'>('fixed');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [generalLocationName, setGeneralLocationName] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [showLocationRationale, setShowLocationRationale] = useState(false);
  const [mapRegion, setMapRegion] = useState({ latitude: 32.0853, longitude: 34.7818, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [suggestions, setSuggestions] = useState<{ placeId: string; description: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSteps = 5;

  const centerMapOnGps = (lat: number, lng: number) => {
    setMapRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  };

  const requestLocationPermission = async () => {
    try {
      // Use the same approach as the fixer's DiscoveryFeedScreen
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[CreateTask] Location permission:', status);
      if (status === 'granted') {
        setLocationPermission('granted');
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        console.log('[CreateTask] GPS coords:', loc.coords.latitude, loc.coords.longitude);
        centerMapOnGps(loc.coords.latitude, loc.coords.longitude);
      } else {
        if (Platform.OS === 'web') {
          setLocationPermission('granted'); // still show map on web
        } else {
          setShowLocationRationale(true);
        }
      }
    } catch (err) {
      console.error('[CreateTask] Location error:', err);
      if (Platform.OS === 'web') {
        setLocationPermission('granted');
      }
    }
  };

  const handleLocationPermissionResponse = async (allow: boolean) => {
    setShowLocationRationale(false);
    if (!allow) {
      setLocationPermission('denied');
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationPermission('granted');
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        centerMapOnGps(loc.coords.latitude, loc.coords.longitude);
      } catch { /* ignore */ }
    } else {
      setLocationPermission('denied');
    }
  };

  // --- Autocomplete helpers (web only, uses Places library loaded by LocationMap) ---

  function getOrCreatePlacesService(): google.maps.places.PlacesService | null {
    if (placesServiceRef.current) return placesServiceRef.current;
    if (typeof google === 'undefined' || !google.maps?.places) return null;
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;';
    document.body.appendChild(div);
    placesServiceRef.current = new google.maps.places.PlacesService(div);
    return placesServiceRef.current;
  }

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
          { input: text.trim(), componentRestrictions: { country: 'il' } },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              setSuggestions(predictions.slice(0, 5).map((p) => ({ placeId: p.place_id, description: p.description })));
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

  const geocodeByPlaceId = useCallback((placeId: string, label: string) => {
    const service = getOrCreatePlacesService();
    if (!service) {
      setGeocodeError('Maps not ready — please try again.');
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    service.getDetails(
      { placeId, fields: ['geometry', 'formatted_address', 'address_components'] },
      (place, status) => {
        setGeocoding(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const loc = place.geometry.location;
          const coords = { latitude: loc.lat(), longitude: loc.lng() };
          setPinCoords(coords);
          setMapRegion({ ...coords, latitudeDelta: 0.005, longitudeDelta: 0.005 });
          setAddressConfirmed(true);

          // Derive general location name from address components
          const components = place.address_components ?? [];
          const neighborhood = components.find((c) => c.types.includes('neighborhood'))?.long_name;
          const locality = components.find((c) => c.types.includes('locality'))?.long_name;
          const sublocality = components.find((c) => c.types.includes('sublocality'))?.long_name;
          setGeneralLocationName(
            [neighborhood ?? sublocality, locality].filter(Boolean).join(', ') || label,
          );
        } else {
          setGeocodeError('Could not find this location. Please try again.');
        }
      },
    );
  }, []);

  const handleAddressChange = useCallback((text: string) => {
    setAddress(text);
    setGeocodeError(null);
    setAddressConfirmed(false);
    fetchSuggestions(text);
  }, [fetchSuggestions]);

  const handleSelectSuggestion = useCallback((placeId: string, description: string) => {
    setAddress(description);
    setShowSuggestions(false);
    geocodeByPlaceId(placeId, description);
  }, [geocodeByPlaceId]);

  const handleAddressSubmit = useCallback(() => {
    const query = address.trim();
    if (!query) return;
    setShowSuggestions(false);

    if (!autocompleteRef.current && typeof google !== 'undefined' && google.maps?.places) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
    }
    const autoSvc = autocompleteRef.current;
    if (!autoSvc) {
      setGeocodeError('Maps not ready — please try again.');
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    autoSvc.getPlacePredictions(
      { input: query, componentRestrictions: { country: 'il' } },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions?.[0]) {
          geocodeByPlaceId(predictions[0].place_id, predictions[0].description);
        } else {
          setGeocoding(false);
          setGeocodeError('No results found. Try a more specific address.');
        }
      },
    );
  }, [address, geocodeByPlaceId]);

  // Request GPS as soon as the component mounts so the map is ready by step 5
  useEffect(() => {
    console.log('[CreateTask] Mount — requesting GPS...');
    if (Platform.OS === 'web') {
      setLocationPermission('granted');
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          console.log('[CreateTask] Got GPS:', pos.coords.latitude, pos.coords.longitude);
          centerMapOnGps(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.warn('[CreateTask] GPS error:', err.message),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      requestLocationPermission();
    }
  }, []);

  const canNext = (): boolean => {
    switch (step) {
      case 1: return title.trim().length > 0 && description.trim().length > 0;
      case 2: return true;
      case 3: return category !== null;
      case 4: return budgetType === 'quote' || (budgetType === 'fixed' && parseFloat(price) > 0);
      case 5: return address.trim().length > 0 && addressConfirmed && pinCoords != null;
      default: return false;
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickImage = async () => {
    if (photos.length >= 5) return;
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library to add images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    }
  };

  const handleWebFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotos((prev) => [...prev, url]);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/tasks', {
        title: title.trim(),
        description: description.trim(),
        media_urls: [],
        category,
        suggested_price: budgetType === 'fixed' ? parseFloat(price) : null,
        general_location_name: generalLocationName || address.trim(),
        exact_address: address.trim(),
        lat: pinCoords?.latitude ?? 32.8,
        lng: pinCoords?.longitude ?? 35.0,
      });
      setShowReview(false);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepBar}>
      {STEP_ICONS.map((icon, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === step;
        const isDone = stepNum < step;
        return (
          <View key={icon} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                isActive && styles.stepDotActive,
                isDone && styles.stepDotDone,
              ]}
            >
              {isDone ? (
                <MaterialCommunityIcons name="check" size={14} color={brandColors.white} />
              ) : (
                <MaterialCommunityIcons
                  name={icon as never}
                  size={14}
                  color={isActive ? brandColors.white : brandColors.textMuted}
                />
              )}
            </View>
            <Text
              style={[
                typography.caption,
                {
                  color: isActive ? brandColors.primary : isDone ? brandColors.success : brandColors.textMuted,
                  marginTop: 4,
                },
              ]}
            >
              {STEP_LABELS[i]}
            </Text>
            {i < STEP_ICONS.length - 1 && (
              <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[typography.h2, styles.stepTitle]}>What do you need done?</Text>
            <Text style={[typography.bodySm, styles.stepSubtitle]}>Give a clear title and describe the job</Text>
            <FInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />
            <Text style={[typography.caption, styles.counter]}>{title.length}/80</Text>
            <FInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
              numberOfLines={5}
              placeholder="Describe what you need done..."
            />
            <Text style={[typography.caption, styles.counter]}>{description.length}/500</Text>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[typography.h2, styles.stepTitle]}>Add photos</Text>
            <Text style={[typography.bodySm, styles.stepSubtitle]}>Up to 5 photos (optional) help fixers understand the job</Text>
            <View style={styles.photoGrid}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.photo} />
                  <IconButton
                    icon="close-circle"
                    size={20}
                    style={styles.removePhoto}
                    iconColor={brandColors.danger}
                    onPress={() => removePhoto(index)}
                  />
                </View>
              ))}
              {photos.length < 5 && (
                <Pressable
                  style={({ pressed }) => [styles.addPhoto, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={pickImage}
                >
                  <MaterialCommunityIcons name="camera-plus-outline" size={28} color={brandColors.primaryMuted} />
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>Add</Text>
                </Pressable>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[typography.h2, styles.stepTitle]}>Choose a category</Text>
            <Text style={[typography.bodySm, styles.stepSubtitle]}>Helps fixers find your task</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      { backgroundColor: cat.bg, opacity: pressed ? 0.8 : 1 },
                      isSelected && styles.categoryCardSelected,
                    ]}
                  >
                    {isSelected && (
                      <View style={styles.categoryCheck}>
                        <MaterialCommunityIcons name="check" size={12} color={brandColors.white} />
                      </View>
                    )}
                    <View style={[styles.categoryIconCircle, { backgroundColor: cat.color }]}>
                      <MaterialCommunityIcons name={cat.icon as never} size={24} color={brandColors.white} />
                    </View>
                    <Text style={[typography.label, { color: brandColors.textPrimary }]}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={[typography.h2, styles.stepTitle]}>Set your budget</Text>
            <Text style={[typography.bodySm, styles.stepSubtitle]}>Choose a fixed price or let fixers quote</Text>
            <SegmentedButtons
              value={budgetType}
              onValueChange={(v) => setBudgetType(v as 'fixed' | 'quote')}
              buttons={[
                { value: 'fixed', label: 'Fixed Price' },
                { value: 'quote', label: 'Quote Required' },
              ]}
              style={styles.segmented}
            />
            {budgetType === 'fixed' ? (
              <FInput
                label="Budget (₪)"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="Enter your budget"
                left={<FInput.Affix text="₪" />}
              />
            ) : (
              <View style={styles.quoteNote}>
                <MaterialCommunityIcons name="information-outline" size={18} color={brandColors.primaryMuted} />
                <Text style={[typography.body, { color: brandColors.textMuted, flex: 1 }]}>
                  Fixers will propose their own price when bidding on your task.
                </Text>
              </View>
            )}
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={[typography.h2, styles.stepTitle]}>Location</Text>
            <Text style={[typography.bodySm, styles.stepSubtitle]}>
              Enter the address and verify the pin on the map
            </Text>

            <View style={styles.addressInputWrapper}>
              <FInput
                label="Task location"
                placeholder="e.g., Dizengoff 120, Tel Aviv"
                value={address}
                onChangeText={handleAddressChange}
                onSubmitEditing={handleAddressSubmit}
                textContentType="none"
                autoComplete="off"
                // @ts-expect-error -- web-only: prevent Safari autofill
                name="task-loc-search"
                id="task-loc-search"
                inputMode="search"
                right={
                  geocoding ? (
                    <FInput.Icon icon="loading" size={16} />
                  ) : address.length > 0 ? (
                    <FInput.Icon
                      icon="close-circle"
                      size={16}
                      onPress={() => {
                        setAddress('');
                        setSuggestions([]);
                        setShowSuggestions(false);
                        setGeocodeError(null);
                        setAddressConfirmed(false);
                        setPinCoords(null);
                      }}
                    />
                  ) : undefined
                }
              />
              {showSuggestions && suggestions.length > 0 && (
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

            {geocodeError && (
              <Text style={[typography.caption, { color: brandColors.danger }]}>{geocodeError}</Text>
            )}

            {/* Map — always shown on web; on native only if permission granted */}
            {(Platform.OS === 'web' || locationPermission === 'granted') && (
              <View style={styles.mapContainer}>
                <LocationMap
                  region={mapRegion}
                  pinCoords={pinCoords}
                  onRegionChange={setMapRegion}
                  onPress={(coords: { latitude: number; longitude: number }) => {
                    setPinCoords(coords);
                    setAddressConfirmed(true);
                  }}
                />
                {pinCoords && (
                  <Text style={[typography.caption, { color: brandColors.success, textAlign: 'center', marginTop: spacing.xs }]}>
                    <MaterialCommunityIcons name="check-circle" size={12} color={brandColors.success} />
                    {' '}Pin placed — drag it or tap the map to adjust
                  </Text>
                )}
                {!pinCoords && (
                  <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: 'center', marginTop: spacing.xs }]}>
                    Enter an address above to place the pin
                  </Text>
                )}
              </View>
            )}
            {Platform.OS !== 'web' && locationPermission === 'denied' && (
              <View style={styles.locationDeniedNote}>
                <MaterialCommunityIcons name="map-marker-off-outline" size={18} color={brandColors.textMuted} />
                <Text style={[typography.bodySm, { color: brandColors.textMuted, flex: 1 }]}>
                  Location access was denied. Enter the address above and we'll find it on the map.
                </Text>
              </View>
            )}

            <View style={styles.addressNote}>
              <MaterialCommunityIcons name="shield-lock-outline" size={16} color={brandColors.primaryMuted} />
              <Text style={[typography.caption, { color: brandColors.textMuted, flex: 1 }]}>
                Fixers see only an approximate location. The exact address is shared only after you accept a bid.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.wrapper}>
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebFileSelect}
        />
      )}

      {renderStepIndicator()}

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardShell}>
          {renderStep()}
        </View>

        <View style={styles.buttons}>
          {step > 1 && (
            <FButton variant="outline" onPress={() => setStep(step - 1)} style={styles.button}>
              Back
            </FButton>
          )}
          {step < totalSteps ? (
            <FButton
              onPress={() => setStep(step + 1)}
              disabled={!canNext()}
              style={styles.button}
              iconRight="arrow-right"
            >
              Next
            </FButton>
          ) : (
            <FButton
              variant="secondary"
              onPress={() => setShowReview(true)}
              disabled={!canNext()}
              style={styles.button}
              icon="check-circle-outline"
            >
              Review & Publish
            </FButton>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showReview}
          onDismiss={() => setShowReview(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={[typography.h2, { color: brandColors.textPrimary, marginBottom: spacing.lg }]}>
            Review your task
          </Text>

          <View style={styles.reviewRows}>
            <ReviewRow icon="text-box-outline" label="Title" value={title} />
            <ReviewRow icon="shape-outline" label="Category" value={CATEGORIES.find((c) => c.value === category)?.label ?? ''} />
            <ReviewRow icon="cash-multiple" label="Budget" value={budgetType === 'fixed' ? `₪${price}` : 'Quote Required'} />
            <ReviewRow icon="map-marker-outline" label="Location" value={address} />
            <ReviewRow icon="camera-outline" label="Photos" value={`${photos.length} photo(s)`} />
          </View>

          <FButton
            onPress={handlePublish}
            loading={submitting}
            disabled={submitting}
            fullWidth
            icon="send"
          >
            Publish Task
          </FButton>
          <FButton
            variant="ghost"
            onPress={() => setShowReview(false)}
            fullWidth
            style={{ marginTop: spacing.sm }}
          >
            Go Back & Edit
          </FButton>
        </Modal>
      </Portal>

      {/* Location Permission Rationale Modal */}
      <Portal>
        <Modal
          visible={showLocationRationale}
          onDismiss={() => handleLocationPermissionResponse(false)}
          contentContainerStyle={styles.rationaleModal}
        >
          <View style={styles.rationaleIconWrap}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={40} color={brandColors.primary} />
          </View>
          <Text style={[typography.h3, { color: brandColors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }]}>
            Enable Location Access
          </Text>
          <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center', marginBottom: spacing.xl }]}>
            We use your location to place a pin on the map so fixers in your area can find your task. Your exact address stays private.
          </Text>
          <FButton onPress={() => handleLocationPermissionResponse(true)} fullWidth>
            Allow Location
          </FButton>
          <FButton variant="ghost" onPress={() => handleLocationPermissionResponse(false)} fullWidth style={{ marginTop: spacing.sm }}>
            No thanks, I'll enter manually
          </FButton>
        </Modal>
      </Portal>
    </View>
  );
}

function ReviewRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={reviewStyles.row}>
      <View style={reviewStyles.iconShell}>
        <MaterialCommunityIcons name={icon as never} size={18} color={brandColors.primaryMuted} />
      </View>
      <View style={reviewStyles.text}>
        <Text style={[typography.caption, { color: brandColors.textMuted }]}>{label}</Text>
        <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: brandColors.background,
  },

  stepBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: brandColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
    gap: 0,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brandColors.outlineLight,
  },
  stepDotActive: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
  stepDotDone: {
    backgroundColor: brandColors.success,
    borderColor: brandColors.success,
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: brandColors.outlineLight,
    zIndex: -1,
  },
  stepLineDone: {
    backgroundColor: brandColors.success,
  },

  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  cardShell: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: brandColors.surface,
    borderRadius: radii.xxl,
    padding: spacing.xxl,
    ...shadows.sm,
  },
  stepContent: {
    gap: spacing.md,
  },
  stepTitle: {
    color: brandColors.textPrimary,
  },
  stepSubtitle: {
    color: brandColors.textMuted,
    marginBottom: spacing.sm,
  },
  counter: {
    textAlign: 'right',
    color: brandColors.textMuted,
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  addPhoto: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: brandColors.outlineLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.surfaceAlt,
    gap: spacing.xs,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  categoryCard: {
    width: '45%',
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  categoryCardSelected: {
    borderColor: brandColors.primary,
  },
  categoryCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: brandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmented: {
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: radii.pill,
  },
  quoteNote: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: brandColors.infoSoft,
    borderRadius: radii.md,
    alignItems: 'flex-start',
  },
  addressNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  addressInputWrapper: {
    position: 'relative',
    zIndex: 10,
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
    zIndex: 20,
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
  mapContainer: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  locationDeniedNote: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  rationaleModal: {
    backgroundColor: brandColors.surface,
    margin: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radii.xxxl,
    alignItems: 'center',
  },
  rationaleIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 500,
  },
  button: {
    flex: 1,
  },

  modal: {
    backgroundColor: brandColors.surface,
    margin: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radii.xxxl,
  },
  reviewRows: {
    marginBottom: spacing.xxl,
  },
});
