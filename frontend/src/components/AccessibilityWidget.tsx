import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { brandColors, spacing, radii, shadows, typography } from '../theme';
import { useAccessibility, AccessibilityState } from '../context/AccessibilityContext';

/* ------------------------------------------------------------------ */
/*  Menu item definition                                              */
/* ------------------------------------------------------------------ */
interface MenuItem {
  key: string;
  label: string;
  labelHe: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  type: 'toggle' | 'action';
  stateKey?: keyof Omit<AccessibilityState, 'fontScale'>;
  action?: 'increase' | 'decrease' | 'reset';
  webOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'increase',         label: 'Increase Font',      labelHe: 'הגדלת גופן',          icon: 'format-font-size-increase',  type: 'action', action: 'increase' },
  { key: 'decrease',         label: 'Decrease Font',      labelHe: 'הקטנת גופן',          icon: 'format-font-size-decrease',  type: 'action', action: 'decrease' },
  { key: 'highContrast',     label: 'High Contrast',      labelHe: 'ניגודיות גבוהה',       icon: 'contrast-circle',            type: 'toggle', stateKey: 'highContrast' },
  { key: 'monochrome',       label: 'Monochrome',         labelHe: 'מונוכרום',             icon: 'palette-outline',            type: 'toggle', stateKey: 'monochrome' },
  { key: 'readableFont',     label: 'Readable Font',      labelHe: 'גופן קריא',            icon: 'format-letter-case',         type: 'toggle', stateKey: 'readableFont' },
  { key: 'highlightLinks',   label: 'Highlight Links',    labelHe: 'הדגשת קישורים',        icon: 'link-variant',               type: 'toggle', stateKey: 'highlightLinks' },
  { key: 'highlightHeadings',label: 'Highlight Headings', labelHe: 'הדגשת כותרות',         icon: 'format-header-pound',        type: 'toggle', stateKey: 'highlightHeadings' },
  { key: 'textSpacing',      label: 'Text Spacing',       labelHe: 'מרווח טקסט',           icon: 'format-line-spacing',        type: 'toggle', stateKey: 'textSpacing' },
  { key: 'largeCursor',      label: 'Large Cursor',       labelHe: 'סמן גדול',             icon: 'cursor-default-outline',     type: 'toggle', stateKey: 'largeCursor', webOnly: true },
  { key: 'stopAnimations',   label: 'Stop Animations',    labelHe: 'עצירת אנימציות',       icon: 'motion-pause-outline',       type: 'toggle', stateKey: 'stopAnimations' },
  { key: 'keyboardNav',      label: 'Keyboard Navigation',labelHe: 'ניווט מקלדת',          icon: 'keyboard-outline',           type: 'toggle', stateKey: 'keyboardNav' },
  { key: 'reset',            label: 'Reset All',          labelHe: 'איפוס הכל',            icon: 'restart',                    type: 'action', action: 'reset' },
];

/* ------------------------------------------------------------------ */
/*  Widget                                                            */
/* ------------------------------------------------------------------ */
export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const { state, increaseFontSize, decreaseFontSize, toggle, resetAll } = useAccessibility();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Filter web-only items on native
  const items = Platform.OS === 'web'
    ? MENU_ITEMS
    : MENU_ITEMS.filter(i => !i.webOnly);

  const handlePress = (item: MenuItem) => {
    if (item.type === 'toggle' && item.stateKey) {
      toggle(item.stateKey);
    } else if (item.action === 'increase') {
      increaseFontSize();
    } else if (item.action === 'decrease') {
      decreaseFontSize();
    } else if (item.action === 'reset') {
      resetAll();
    }
  };

  const isActive = (item: MenuItem): boolean => {
    if (item.stateKey) return !!state[item.stateKey];
    return false;
  };

  // The widget itself must not be affected by a11y CSS overrides,
  // so we tag its root with data-a11y-widget.
  const widgetProps = Platform.OS === 'web'
    ? { 'data-a11y-widget': 'true' } as Record<string, string>
    : {};

  return (
    <View style={styles.container} pointerEvents="box-none" {...widgetProps}>
      {/* Overlay to close when tapping outside */}
      {open && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close accessibility menu"
        />
      )}

      {/* Panel */}
      {open && (
        <View style={[styles.panel, isDesktop && styles.panelDesktop]}>
          <View style={styles.panelHeader}>
            <MaterialCommunityIcons name="human" size={22} color={brandColors.white} />
            <Text style={styles.panelTitle}>נגישות / Accessibility</Text>
            {state.fontScale !== 1 && (
              <Text style={styles.fontScaleBadge}>{Math.round(state.fontScale * 100)}%</Text>
            )}
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map(item => {
              const active = isActive(item);
              const isReset = item.action === 'reset';
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuItem,
                    active && styles.menuItemActive,
                    isReset && styles.menuItemReset,
                  ]}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={item.type === 'toggle' ? { selected: active } : undefined}
                >
                  <View style={[
                    styles.iconCircle,
                    active && styles.iconCircleActive,
                    isReset && styles.iconCircleReset,
                  ]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={isReset ? brandColors.white : active ? brandColors.white : brandColors.primary}
                    />
                  </View>
                  <View style={styles.labelColumn}>
                    <Text style={[
                      styles.menuLabel,
                      active && styles.menuLabelActive,
                      isReset && styles.menuLabelReset,
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={[
                      styles.menuLabelHe,
                      active && styles.menuLabelActive,
                    ]}>
                      {item.labelHe}
                    </Text>
                  </View>
                  {item.type === 'toggle' && (
                    <View style={[styles.toggleDot, active && styles.toggleDotActive]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Accessibility statement — required by Israeli law */}
          <View style={styles.statementBar}>
            <MaterialCommunityIcons name="shield-check" size={14} color={brandColors.textMuted} />
            <Text style={styles.statementText}>WCAG 2.0 AA · ת"י 5568</Text>
          </View>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, open && styles.fabOpen]}
        onPress={() => setOpen(prev => !prev)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close accessibility menu' : 'Open accessibility menu'}
      >
        <MaterialCommunityIcons
          name={open ? 'close' : 'human'}
          size={28}
          color={brandColors.white}
        />
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */
const FAB_SIZE = 56;
const PANEL_MAX_HEIGHT = 480;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 9999,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 1,
  },

  /* -- FAB -- */
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 24 : 90,
    left: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: brandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    zIndex: 3,
  },
  fabOpen: {
    backgroundColor: brandColors.primaryDark,
  },

  /* -- Panel -- */
  panel: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 90 : 156,
    left: 20,
    width: 310,
    maxHeight: PANEL_MAX_HEIGHT,
    backgroundColor: brandColors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.lg,
    zIndex: 2,
  },
  panelDesktop: {
    width: 350,
    maxHeight: 540,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  panelTitle: {
    ...typography.h3,
    color: brandColors.white,
    flex: 1,
  },
  fontScaleBadge: {
    ...typography.caption,
    color: brandColors.secondary,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
    overflow: 'hidden',
  },

  /* -- Scroll -- */
  scrollArea: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },

  /* -- Menu Item -- */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: spacing.md,
  },
  menuItemActive: {
    backgroundColor: brandColors.infoSoft,
  },
  menuItemReset: {
    borderTopWidth: 1,
    borderTopColor: brandColors.outlineLight,
    marginTop: spacing.xs,
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: brandColors.primary,
  },
  iconCircleReset: {
    backgroundColor: brandColors.danger,
  },

  labelColumn: {
    flex: 1,
  },
  menuLabel: {
    ...typography.bodySm,
    color: brandColors.textPrimary,
  },
  menuLabelHe: {
    ...typography.caption,
    color: brandColors.textMuted,
  },
  menuLabelActive: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  menuLabelReset: {
    color: brandColors.danger,
  },

  toggleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: brandColors.outline,
    backgroundColor: 'transparent',
  },
  toggleDotActive: {
    borderColor: brandColors.success,
    backgroundColor: brandColors.success,
  },

  /* -- Statement -- */
  statementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: brandColors.outlineLight,
    backgroundColor: brandColors.surfaceAlt,
  },
  statementText: {
    ...typography.caption,
    color: brandColors.textMuted,
  },
});
