import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  ProgressBar,
  Card,
  useTheme,
  IconButton,
  Portal,
  Modal,
  SegmentedButtons,
} from 'react-native-paper';
import api from '../api/axiosInstance';

type Category = 'ELECTRICITY' | 'PLUMBING' | 'CARPENTRY' | 'PAINTING' | 'MOVING' | 'GENERAL';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'ELECTRICITY', label: 'Electricity', icon: '⚡' },
  { value: 'PLUMBING', label: 'Plumbing', icon: '🔧' },
  { value: 'CARPENTRY', label: 'Carpentry', icon: '🔨' },
  { value: 'PAINTING', label: 'Painting', icon: '🎨' },
  { value: 'MOVING', label: 'Moving', icon: '📦' },
  { value: 'GENERAL', label: 'General', icon: '🛠' },
];

interface Props {
  navigation: { goBack: () => void; navigate: (screen: string) => void };
}

export default function CreateTask({ navigation }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [budgetType, setBudgetType] = useState<'fixed' | 'quote'>('fixed');
  const [price, setPrice] = useState('');
  const [generalLocation, setGeneralLocation] = useState('');
  const [exactAddress, setExactAddress] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = 5;

  const canNext = (): boolean => {
    switch (step) {
      case 1: return title.trim().length > 0 && description.trim().length > 0;
      case 2: return true;
      case 3: return category !== null;
      case 4: return budgetType === 'quote' || (budgetType === 'fixed' && parseFloat(price) > 0);
      case 5: return generalLocation.trim().length > 0 && exactAddress.trim().length > 0;
      default: return false;
    }
  };

  const pickImage = async () => {
    if (photos.length >= 5) return;
    Alert.alert('Info', 'Photo picker is available on mobile only.');
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
        general_location_name: generalLocation.trim(),
        exact_address: exactAddress.trim(),
        lat: 32.8,
        lng: 35.0,
      });
      setShowReview(false);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text variant="headlineSmall" style={styles.stepTitle}>What do you need done?</Text>
            <TextInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              mode="outlined"
              style={styles.input}
            />
            <Text variant="bodySmall" style={styles.counter}>{title.length}/80</Text>
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              mode="outlined"
              multiline
              numberOfLines={5}
              placeholder="Describe what you need done..."
              style={styles.input}
            />
            <Text variant="bodySmall" style={styles.counter}>{description.length}/500</Text>
          </View>
        );

      case 2:
        return (
          <View>
            <Text variant="headlineSmall" style={styles.stepTitle}>Add photos</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Up to 5 photos (optional)</Text>
            <View style={styles.photoGrid}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.photo} />
                  <IconButton
                    icon="close-circle"
                    size={20}
                    style={styles.removePhoto}
                    onPress={() => removePhoto(index)}
                  />
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity style={styles.addPhoto} onPress={pickImage}>
                  <Text style={styles.addPhotoIcon}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text variant="headlineSmall" style={styles.stepTitle}>Choose a category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[
                    styles.categoryCard,
                    category === cat.value && { borderColor: theme.colors.primary, borderWidth: 2 },
                  ]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text variant="labelMedium">{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View>
            <Text variant="headlineSmall" style={styles.stepTitle}>Set your budget</Text>
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
              <TextInput
                label="Budget (₪)"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                placeholder="Enter your budget"
              />
            ) : (
              <Text variant="bodyMedium" style={styles.quoteNote}>
                Fixers will propose their own price.
              </Text>
            )}
          </View>
        );

      case 5:
        return (
          <View>
            <Text variant="headlineSmall" style={styles.stepTitle}>Location</Text>
            <TextInput
              label="General area (e.g., 'Hadar, Haifa')"
              value={generalLocation}
              onChangeText={setGeneralLocation}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Exact address (private — shared only with accepted Fixer)"
              value={exactAddress}
              onChangeText={setExactAddress}
              mode="outlined"
              style={styles.input}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.progressSection}>
        <ProgressBar progress={step / totalSteps} color={theme.colors.primary} />
        <Text variant="bodySmall" style={styles.stepIndicator}>Step {step} of {totalSteps}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          {renderStep()}
        </View>

        <View style={styles.buttons}>
          {step > 1 && (
            <Button mode="outlined" onPress={() => setStep(step - 1)} style={styles.button}>
              Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button
              mode="contained"
              onPress={() => setStep(step + 1)}
              disabled={!canNext()}
              style={styles.button}
            >
              Next
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => setShowReview(true)}
              disabled={!canNext()}
              style={styles.button}
            >
              Review & Publish
            </Button>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Modal visible={showReview} onDismiss={() => setShowReview(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>Review your task</Text>
          <Card style={styles.reviewCard}>
            <Card.Content>
              <Text variant="labelLarge">Title</Text>
              <Text variant="bodyMedium">{title}</Text>
              <Text variant="labelLarge" style={styles.reviewLabel}>Category</Text>
              <Text variant="bodyMedium">{CATEGORIES.find((c) => c.value === category)?.label}</Text>
              <Text variant="labelLarge" style={styles.reviewLabel}>Budget</Text>
              <Text variant="bodyMedium">
                {budgetType === 'fixed' ? `₪${price}` : 'Quote Required'}
              </Text>
              <Text variant="labelLarge" style={styles.reviewLabel}>Location</Text>
              <Text variant="bodyMedium">{generalLocation}</Text>
              <Text variant="labelLarge" style={styles.reviewLabel}>Photos</Text>
              <Text variant="bodyMedium">{photos.length} photo(s)</Text>
            </Card.Content>
          </Card>
          <Button
            mode="contained"
            onPress={handlePublish}
            loading={submitting}
            disabled={submitting}
            style={styles.publishButton}
            buttonColor="#2E7D32"
          >
            Publish Task
          </Button>
          <Button mode="text" onPress={() => setShowReview(false)} style={styles.cancelButton}>
            Go Back & Edit
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#E3F2FD',
  },
  progressSection: {
    backgroundColor: '#E3F2FD',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 90,
    paddingBottom: 16,
    alignItems: 'center',
  },
  stepIndicator: {
    textAlign: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    color: '#757575',
    backgroundColor: '#E3F2FD',
  },
  content: {
    width: '100%',
    maxWidth: 500,
  },
  stepTitle: {
    marginBottom: 16,
  },
  subtitle: {
    color: '#757575',
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  counter: {
    textAlign: 'right',
    color: '#9E9E9E',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: '#9E9E9E',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  categoryCard: {
    width: '45%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 16,
  },
  quoteNote: {
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 12,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    gap: 12,
    width: '100%',
    maxWidth: 500,
  },
  button: {
    flex: 1,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 16,
  },
  reviewCard: {
    marginBottom: 16,
  },
  reviewLabel: {
    marginTop: 12,
  },
  publishButton: {
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 0,
  },
});
