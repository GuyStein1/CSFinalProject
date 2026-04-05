import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppLogo from './AppLogo';
import { brandColors, radii, shadows, spacing, typography } from '../theme';

const DRAWER_WIDTH = 300;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Mode = 'requester' | 'fixer';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  onSettingsPress: () => void;
}

export default function HamburgerMenu({
  visible,
  onClose,
  currentMode,
  onModeChange,
  onSettingsPress,
}: HamburgerMenuProps) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible && (slideAnim as any)._value === -DRAWER_WIDTH) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      {/* backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* close button */}
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={22} color={brandColors.textMuted} />
        </Pressable>

        {/* logo */}
        <View style={styles.logoArea}>
          <AppLogo compact={false} />
        </View>

        {/* mode section */}
        <Text style={[typography.eyebrow, styles.sectionLabel]}>Switch mode</Text>

        <Pressable
          style={[styles.modeCard, currentMode === 'requester' && styles.modeCardActive]}
          onPress={() => { onModeChange('requester'); onClose(); }}
        >
          <View style={[styles.modeIcon, currentMode === 'requester' && styles.modeIconActive]}>
            <MaterialCommunityIcons
              name="home-outline"
              size={22}
              color={currentMode === 'requester' ? brandColors.textPrimary : brandColors.primaryMuted}
            />
          </View>
          <View style={styles.modeText}>
            <Text style={[typography.h3, { color: currentMode === 'requester' ? brandColors.textPrimary : brandColors.textMuted }]}>
              Requester
            </Text>
            <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>Post tasks, get help</Text>
          </View>
          {currentMode === 'requester' && (
            <MaterialCommunityIcons name="check-circle" size={20} color={brandColors.secondary} />
          )}
        </Pressable>

        <Pressable
          style={[styles.modeCard, currentMode === 'fixer' && styles.modeCardActive]}
          onPress={() => { onModeChange('fixer'); onClose(); }}
        >
          <View style={[styles.modeIcon, currentMode === 'fixer' && styles.modeIconActive]}>
            <MaterialCommunityIcons
              name="wrench-outline"
              size={22}
              color={currentMode === 'fixer' ? brandColors.textPrimary : brandColors.primaryMuted}
            />
          </View>
          <View style={styles.modeText}>
            <Text style={[typography.h3, { color: currentMode === 'fixer' ? brandColors.textPrimary : brandColors.textMuted }]}>
              Fixer
            </Text>
            <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>Find jobs, earn money</Text>
          </View>
          {currentMode === 'fixer' && (
            <MaterialCommunityIcons name="check-circle" size={20} color={brandColors.secondary} />
          )}
        </Pressable>

        {/* divider */}
        <View style={styles.divider} />

        {/* settings */}
        <Pressable
          style={styles.settingsRow}
          onPress={() => { onSettingsPress(); onClose(); }}
        >
          <MaterialCommunityIcons name="cog-outline" size={22} color={brandColors.primaryMuted} />
          <Text style={[typography.body, { color: brandColors.textPrimary }]}>Settings</Text>
        </Pressable>
      </Animated.View>
    </Modal>
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
    paddingTop: spacing.huge,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
    ...shadows.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.lg,
    padding: spacing.xs,
  },
  logoArea: {
    marginBottom: spacing.xxxl,
    alignItems: 'flex-start',
  },
  sectionLabel: {
    color: brandColors.textMuted,
    marginBottom: spacing.md,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    backgroundColor: brandColors.background,
  },
  modeCardActive: {
    borderColor: brandColors.secondary,
    backgroundColor: brandColors.warningSoft,
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconActive: {
    backgroundColor: brandColors.secondary,
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
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
