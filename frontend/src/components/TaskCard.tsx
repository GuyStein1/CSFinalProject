import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Icon, Text, useTheme } from 'react-native-paper';
import StatusBadge from './StatusBadge';
import { brandColors } from '../theme';

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
  const theme = useTheme();

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      mode="elevated"
    >
      <Card.Title
        title={title}
        titleNumberOfLines={2}
        titleVariant="titleSmall"
        titleStyle={styles.title}
        left={() => (
          <View style={styles.iconShell}>
            <Icon source={CATEGORY_ICONS[category]} size={24} color={theme.colors.primary} />
          </View>
        )}
      />
      <Card.Content style={styles.content}>
        <StatusBadge status={status} />
        <Text variant="bodySmall" style={styles.location}>
          {locationName}
        </Text>
        {suggestedPrice != null && (
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            ₪{suggestedPrice}
          </Text>
        )}
        {bidCount != null && status === 'OPEN' && (
          <Text variant="bodySmall" style={styles.meta}>
            {bidCount} bids
          </Text>
        )}
        {fixerName && status === 'IN_PROGRESS' && (
          <Text variant="bodySmall" style={styles.meta}>
            Assigned to {fixerName}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 4,
    borderRadius: 22,
    shadowColor: '#112336',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  title: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  content: {
    gap: 8,
    paddingBottom: 12,
  },
  location: {
    color: brandColors.textMuted,
  },
  meta: {
    color: brandColors.textMuted,
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
