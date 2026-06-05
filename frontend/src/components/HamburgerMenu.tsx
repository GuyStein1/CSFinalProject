import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppLogo from './AppLogo';
import { brandColors, radii, shadows, spacing, typography } from '../theme';

const DRAWER_WIDTH = 320;

type Mode = 'requester' | 'fixer';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  onRequesterHomePress?: () => void;
  onRequesterTasksPress?: () => void;
  onPostTaskPress?: () => void;
  fixerActivated?: boolean;
  onFixerWorkspacePress?: () => void;
  onFixerHomePress?: () => void;
  onFixerBidsPress?: () => void;
  onFixerProfilePress?: () => void;
  onNotificationsPress?: () => void;
  onSettingsPress: () => void;
  notificationCount?: number;
}

export default function HamburgerMenu({
  visible,
  onClose,
  currentMode,
  onModeChange,
  onRequesterHomePress,
  onRequesterTasksPress,
  onPostTaskPress,
  fixerActivated = true,
  onFixerWorkspacePress,
  onFixerHomePress,
  onFixerBidsPress,
  onFixerProfilePress,
  onNotificationsPress,
  onSettingsPress,
  notificationCount = 0,
}: HamburgerMenuProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible && (slideAnim as Animated.Value & { _value: number })._value === -DRAWER_WIDTH) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      {/* backdrop */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close navigation menu"
        style={styles.backdrop}
        onPress={onClose}
      />

      {/* drawer */}
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.drawer,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* close button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close navigation menu"
          style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
          onPress={onClose}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="close" size={22} color={brandColors.textMuted} />
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.drawerContent}
        >
          <View style={styles.brandBlock}>
            <AppLogo compact />
            {currentMode === 'fixer' && (
              <View style={styles.currentModeChip}>
                <MaterialCommunityIcons name="wrench-outline" size={13} color={brandColors.secondaryDark} />
                <Text style={[typography.caption, styles.currentModeText]}>Fixer Workspace</Text>
              </View>
            )}
          </View>

          {currentMode === 'fixer' ? (
            <>
              <MenuRow
                icon="arrow-left"
                label="← Home"
                description="Return to your requester dashboard"
                onPress={() => { onModeChange('requester'); (onRequesterHomePress ?? (() => {}))(); onClose(); }}
              />

              <View style={styles.divider} />

              <Text style={[typography.eyebrow, styles.sectionLabel]}>Fixer Workspace</Text>

              <MenuRow
                icon="map-search-outline"
                label="Find Jobs"
                description="Browse and bid on tasks near you"
                onPress={() => { (onFixerHomePress ?? (() => {}))(); onClose(); }}
              />

              <MenuRow
                icon="format-list-bulleted"
                label="My Bids"
                description="Track pending and accepted offers"
                onPress={() => { (onFixerBidsPress ?? (() => {}))(); onClose(); }}
              />

              <MenuRow
                icon="account-hard-hat"
                label="Fixer Profile"
                description="Skills, portfolio, and payment details"
                onPress={() => { (onFixerProfilePress ?? (() => {}))(); onClose(); }}
              />
            </>
          ) : (
            <>
              <Text style={[typography.eyebrow, styles.sectionLabel]}>My Workspace</Text>

              <MenuRow
                icon="view-dashboard-outline"
                label="Home"
                description="Dashboard and task shortcuts"
                onPress={() => { (onRequesterHomePress ?? (() => {}))(); onClose(); }}
              />

              <MenuRow
                icon="clipboard-list-outline"
                label="My Tasks"
                description="Review bids and manage posted tasks"
                onPress={() => { (onRequesterTasksPress ?? (() => {}))(); onClose(); }}
              />

              {onPostTaskPress && (
                <MenuRow
                  icon="plus-circle-outline"
                  label="Post a Task"
                  description="Create a new task"
                  onPress={() => { onPostTaskPress(); onClose(); }}
                />
              )}
            </>
          )}

          {onNotificationsPress && (
            <MenuRow
              icon="bell-outline"
              label="Notifications"
              description={notificationCount > 0 ? `${notificationCount} unread update${notificationCount === 1 ? '' : 's'}` : 'No unread updates'}
              badge={notificationCount > 0 ? (notificationCount > 9 ? '9+' : String(notificationCount)) : undefined}
              onPress={() => { onNotificationsPress(); onClose(); }}
            />
          )}

          <MenuRow
            icon="cog-outline"
            label="Settings"
            description="Password, phone, and notification controls"
            onPress={() => { onSettingsPress(); onClose(); }}
          />

          {currentMode === 'requester' && (
            <>
              <View style={styles.divider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={fixerActivated ? 'Open Fixer Workspace' : 'Become a Fixer'}
                style={({ pressed }) => [
                  styles.fixerWorkspaceEntry,
                  !fixerActivated && styles.fixerWorkspaceEntryPrimary,
                  pressed && styles.fixerWorkspaceEntryPressed,
                ]}
                onPress={() => { (onFixerWorkspacePress ?? (() => { onModeChange('fixer'); (onFixerHomePress ?? (() => {}))(); }))(); onClose(); }}
              >
                <View style={[styles.fixerWorkspaceEntryIcon, !fixerActivated && styles.fixerWorkspaceEntryIconPrimary]}>
                  <MaterialCommunityIcons name="wrench-outline" size={20} color="#fff" />
                </View>
                <View style={styles.modeText}>
                  <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
                    {fixerActivated ? 'Open Fixer Workspace' : 'Become a Fixer'}
                  </Text>
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                    {fixerActivated ? 'Find jobs and earn money' : 'Set up your profile and start earning'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={brandColors.textMuted} />
              </Pressable>
            </>
          )}

          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={brandColors.success} />
            <Text style={[typography.caption, styles.footerText]}>
              Your workspace, payments, and alerts stay tied to this account.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  description,
  badge,
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge}. ${description}` : `${label}. ${description}`}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <MaterialCommunityIcons name={icon as never} size={21} color={brandColors.primaryMuted} />
      </View>
      <View style={styles.menuText}>
        <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>{label}</Text>
        <Text style={[typography.caption, { color: brandColors.textMuted }]}>{description}</Text>
      </View>
      {badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={20} color={brandColors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: brandColors.overlay,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: brandColors.surface,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'column',
    ...shadows.lg,
  },
  drawerContent: {
    paddingBottom: spacing.xl,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.lg,
    padding: spacing.xs,
    zIndex: 1,
  },
  brandBlock: {
    paddingRight: spacing.xl,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  currentModeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.warningSoft,
    borderWidth: 1,
    borderColor: brandColors.secondary,
  },
  currentModeText: {
    color: brandColors.secondaryDark,
    fontWeight: '700',
  },
  fixerWorkspaceEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brandColors.secondary,
    backgroundColor: brandColors.warningSoft,
  },
  fixerWorkspaceEntryPrimary: {
    borderColor: brandColors.secondaryDark,
    backgroundColor: brandColors.warningSoft,
  },
  fixerWorkspaceEntryPressed: {
    opacity: 0.82,
  },
  fixerWorkspaceEntryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: brandColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixerWorkspaceEntryIconPrimary: {
    backgroundColor: brandColors.secondaryDark,
  },
  sectionLabel: {
    color: brandColors.textMuted,
    marginBottom: spacing.md,
  },
  modeText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: brandColors.outlineLight,
    marginVertical: spacing.xl,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
  },
  menuRowPressed: {
    backgroundColor: brandColors.surfaceAlt,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuBadge: {
    minWidth: 26,
    height: 22,
    borderRadius: 11,
    backgroundColor: brandColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  menuBadgeText: {
    color: brandColors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  footerNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: brandColors.successSoft,
    marginTop: spacing.xl,
  },
  footerText: {
    color: brandColors.success,
    flex: 1,
  },
});
