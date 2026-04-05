import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text, useTheme } from 'react-native-paper';
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
  onCancel?: () => void;
  onMarkCompleted?: () => void;
  onEdit?: () => void;
  onReactivate?: () => void;
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
  onCancel,
  onMarkCompleted,
  onEdit,
  onReactivate,
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
        right={() => <StatusBadge status={status} />}
        rightStyle={styles.statusRight}
      />
      <Card.Content style={styles.content}>
        <Text variant="bodySmall" style={styles.location}>
          {locationName}
        </Text>
        {suggestedPrice != null && (
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            ₪{suggestedPrice}
          </Text>
        )}
        {bidCount != null && bidCount > 0 && status === 'OPEN' && (
          <View style={styles.bidBadge}>
            <Icon source="hand-extended" size={14} color={brandColors.primary} />
            <Text variant="labelSmall" style={styles.bidBadgeText}>
              {bidCount} {bidCount === 1 ? 'new offer' : 'new offers'} — tap to review
            </Text>
          </View>
        )}
        {bidCount != null && bidCount === 0 && status === 'OPEN' && (
          <Text variant="bodySmall" style={styles.meta}>
            No bids yet
          </Text>
        )}
        {fixerName && status === 'IN_PROGRESS' && (
          <Text variant="bodySmall" style={styles.meta}>
            Assigned to {fixerName}
          </Text>
        )}
        {(onCancel || onMarkCompleted || onEdit || onReactivate) && (
          <View style={styles.actions}>
            {onReactivate && (
              <Button mode="outlined" compact textColor={brandColors.success} onPress={onReactivate} style={[styles.actionBtn, { borderColor: brandColors.success }]}>
                Reactivate
              </Button>
            )}
            {onEdit && (
              <Button mode="outlined" compact onPress={onEdit} icon="pencil" style={styles.actionBtn}>
                Edit
              </Button>
            )}
            {onMarkCompleted && (
              <Button mode="outlined" compact textColor={brandColors.success} onPress={onMarkCompleted} style={[styles.actionBtn, { borderColor: brandColors.success }]}>
                Mark as Completed
              </Button>
            )}
            {onCancel && (
              <Button mode="outlined" compact textColor={brandColors.danger} onPress={onCancel} style={[styles.actionBtn, { borderColor: brandColors.danger }]}>
                Cancel
              </Button>
            )}
          </View>
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
  bidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brandColors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  bidBadgeText: {
    color: brandColors.warning,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    borderRadius: 12,
  },
  statusRight: {
    marginRight: 8,
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
