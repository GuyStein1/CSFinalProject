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
import { useTranslation } from 'react-i18next';
import AppLogo from './AppLogo';
import { useLanguage } from '../context/LanguageContext';
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
  otherModeBadge?: number;
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
  otherModeBadge = 0,
}: HamburgerMenuProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const slideAnim = useRef(new Animated.Value(isRTL ? DRAWER_WIDTH : -DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : (isRTL ? DRAWER_WIDTH : -DRAWER_WIDTH),
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim, isRTL]);

  const hiddenOffset = isRTL ? DRAWER_WIDTH : -DRAWER_WIDTH;
  if (!visible && (slideAnim as Animated.Value & { _value: number })._value === hiddenOffset) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close navigation menu"
        style={styles.backdrop}
        onPress={onClose}
      />

      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.drawer,
          isRTL ? styles.drawerRTL : styles.drawerLTR,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close navigation menu"
          style={[styles.closeBtn, isRTL ? styles.closeBtnRTL : styles.closeBtnLTR, { top: insets.top + spacing.sm }]}
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
              <View style={[styles.currentModeChip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="wrench-outline" size={13} color={brandColors.secondaryDark} />
                <Text style={[typography.caption, styles.currentModeText]}>{t('menu.fixerWorkspace')}</Text>
              </View>
            )}
          </View>

          {currentMode === 'fixer' ? (
            <>
              <MenuRow
                icon={isRTL ? 'chevron-right' : 'chevron-left'}
                label={t('menu.openRequester')}
                description={t('menu.backToRequester')}
                badge={otherModeBadge > 0 ? String(otherModeBadge) : undefined}
                isRTL={isRTL}
                onPress={() => { onModeChange('requester'); (onRequesterHomePress ?? (() => {}))(); onClose(); }}
              />

              <View style={styles.divider} />

              <Text style={[typography.eyebrow, styles.sectionLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('menu.fixerSection')}
              </Text>

              <MenuRow
                icon="map-search-outline"
                label={t('menu.findJobs')}
                description={t('menu.findJobsDesc')}
                isRTL={isRTL}
                onPress={() => { (onFixerHomePress ?? (() => {}))(); onClose(); }}
              />

              <MenuRow
                icon="format-list-bulleted"
                label={t('menu.myBids')}
                description={t('menu.myBidsDesc')}
                isRTL={isRTL}
                onPress={() => { (onFixerBidsPress ?? (() => {}))(); onClose(); }}
              />

              <MenuRow
                icon="account-hard-hat"
                label={t('menu.fixerProfile')}
                description={t('menu.fixerProfileDesc')}
                isRTL={isRTL}
                onPress={() => { (onFixerProfilePress ?? (() => {}))(); onClose(); }}
              />
            </>
          ) : (
            <>
              <Text style={[typography.eyebrow, styles.sectionLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('menu.requesterSection')}
              </Text>

              <MenuRow
                icon="view-dashboard-outline"
                label={t('menu.requesterHome')}
                description={t('menu.requesterHomeDesc')}
                isRTL={isRTL}
                onPress={() => { (onRequesterHomePress ?? (() => {}))(); onClose(); }}
              />

              <MenuRow
                icon="clipboard-list-outline"
                label={t('menu.requesterTasks')}
                description={t('menu.requesterTasksDesc')}
                isRTL={isRTL}
                onPress={() => { (onRequesterTasksPress ?? (() => {}))(); onClose(); }}
              />

              {onPostTaskPress && (
                <MenuRow
                  icon="plus-circle-outline"
                  label={t('menu.postTask')}
                  description={t('menu.postTaskDesc')}
                  isRTL={isRTL}
                  onPress={() => { onPostTaskPress(); onClose(); }}
                />
              )}
            </>
          )}

          {onNotificationsPress && (
            <MenuRow
              icon="bell-outline"
              label={t('nav.notifications', 'Notifications')}
              description={notificationCount > 0 ? `${notificationCount} unread` : ''}
              badge={notificationCount > 0 ? (notificationCount > 9 ? '9+' : String(notificationCount)) : undefined}
              isRTL={isRTL}
              onPress={() => { onNotificationsPress(); onClose(); }}
            />
          )}

          <MenuRow
            icon="cog-outline"
            label={t('nav.settings', 'Settings')}
            description={t('settings.subtitle', '')}
            isRTL={isRTL}
            onPress={() => { onSettingsPress(); onClose(); }}
          />

          {currentMode === 'requester' && (
            <>
              <View style={styles.divider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={fixerActivated ? t('menu.openFixerWorkspace') : t('menu.becomeFixer')}
                style={({ pressed }) => [
                  styles.fixerWorkspaceEntry,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  !fixerActivated && styles.fixerWorkspaceEntryPrimary,
                  pressed && styles.fixerWorkspaceEntryPressed,
                ]}
                onPress={() => { (onFixerWorkspacePress ?? (() => { onModeChange('fixer'); (onFixerHomePress ?? (() => {}))(); }))(); onClose(); }}
              >
                <View style={[styles.fixerWorkspaceEntryIcon, !fixerActivated && styles.fixerWorkspaceEntryIconPrimary]}>
                  <MaterialCommunityIcons name="wrench-outline" size={20} color="#fff" />
                </View>
                <View style={[styles.modeText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
                    {fixerActivated ? t('menu.openFixerWorkspace') : t('menu.becomeFixer')}
                  </Text>
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                    {fixerActivated ? t('menu.fixerWorkspaceDesc') : t('menu.becomeFixerDesc')}
                  </Text>
                </View>
                {otherModeBadge > 0 ? (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{otherModeBadge}</Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={brandColors.textMuted} />
                )}
              </Pressable>
            </>
          )}

          <View style={[styles.footerNote, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={brandColors.success} />
            <Text style={[typography.caption, styles.footerText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('menu.footer')}
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
  isRTL = false,
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  badge?: string;
  isRTL?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge}. ${description}` : `${label}. ${description}`}
      style={({ pressed }) => [styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, pressed && styles.menuRowPressed]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <MaterialCommunityIcons name={icon as never} size={21} color={brandColors.primaryMuted} />
      </View>
      <View style={[styles.menuText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>{label}</Text>
        {description ? <Text style={[typography.caption, { color: brandColors.textMuted }]}>{description}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      ) : (
        <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={brandColors.textMuted} />
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
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: brandColors.surface,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'column',
    ...shadows.lg,
  },
  drawerLTR: {
    left: 0,
  },
  drawerRTL: {
    right: 0,
  },
  drawerContent: {
    paddingBottom: spacing.xl,
  },
  closeBtn: {
    position: 'absolute',
    padding: spacing.xs,
    zIndex: 1,
  },
  closeBtnLTR: {
    right: spacing.lg,
  },
  closeBtnRTL: {
    left: spacing.lg,
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
