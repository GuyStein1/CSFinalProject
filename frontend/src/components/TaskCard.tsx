import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import StatusBadge from './StatusBadge';
import { glass, glassText } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
type Category = 'ELECTRICITY' | 'PLUMBING' | 'CARPENTRY' | 'PAINTING' | 'MOVING' | 'GENERAL';

const CATEGORY_ICONS: Record<Category, string> = {
  ELECTRICITY: 'lightning-bolt',
  PLUMBING: 'water',
  CARPENTRY: 'hammer',
  PAINTING: 'format-paint',
  MOVING: 'truck',
  GENERAL: 'wrench',
};

interface TaskCardProps {
  title: string;
  category: Category;
  status: TaskStatus;
  suggestedPrice?: number | null;
  locationName: string;
  bidCount?: number;
  fixerName?: string;
  onPress?: () => void;
}

export default function TaskCard({
  title,
  category,
  status,
  suggestedPrice,
  locationName,
  bidCount,
  fixerName,
  onPress,
}: TaskCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.wrapper}>
      <BlurView intensity={glass.medium.blur} tint={glass.medium.tint} style={styles.card}>
        <View style={styles.border} />
        <View style={styles.header}>
          <BlurView intensity={glass.light.blur} tint={glass.light.tint} style={styles.iconShell}>
            <View style={styles.iconShellBorder} />
            <MaterialCommunityIcons
              name={CATEGORY_ICONS[category] as never}
              size={22}
              color={glassText.amber}
            />
          </BlurView>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
        </View>
        <View style={styles.content}>
          <StatusBadge status={status} />
          <Text style={styles.location}>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color={glassText.muted} />
            {' '}{locationName}
          </Text>
          {suggestedPrice != null && (
            <Text style={styles.price}>₪{suggestedPrice}</Text>
          )}
          {bidCount != null && status === 'OPEN' && (
            <Text style={styles.meta}>{bidCount} bids</Text>
          )}
          {fixerName && status === 'IN_PROGRESS' && (
            <Text style={styles.meta}>Assigned to {fixerName}</Text>
          )}
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    marginHorizontal: 4,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: glass.medium.bg,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: glass.medium.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  iconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.light.bg,
    flexShrink: 0,
  },
  iconShellBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: glass.light.border,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: glassText.primary,
    lineHeight: 20,
    paddingTop: 2,
  },
  content: {
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  location: {
    fontSize: 12,
    color: glassText.secondary,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: glassText.amber,
  },
  meta: {
    fontSize: 12,
    color: glassText.secondary,
  },
});
