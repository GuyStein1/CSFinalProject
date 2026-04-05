import React from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { brandColors, radii, shadows, spacing, typography } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface FButtonProps {
  children: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const sizeConfig: Record<ButtonSize, { paddingH: number; paddingV: number; typo: TextStyle; iconSize: number }> = {
  sm: { paddingH: spacing.lg, paddingV: spacing.sm, typo: typography.buttonSm, iconSize: 16 },
  md: { paddingH: spacing.xxl, paddingV: spacing.md + 2, typo: typography.button, iconSize: 18 },
  lg: { paddingH: spacing.xxxl, paddingV: spacing.lg, typo: typography.button, iconSize: 20 },
};

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: brandColors.primary, text: brandColors.textOnDark },
  secondary: { bg: brandColors.secondary, text: brandColors.textPrimary },
  outline: { bg: 'transparent', text: brandColors.primary, border: brandColors.outline },
  ghost: { bg: 'transparent', text: brandColors.primary },
  danger: { bg: brandColors.danger, text: brandColors.white },
};

export default function FButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: FButtonProps) {
  const sConf = sizeConfig[size];
  const vConf = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: vConf.bg,
          paddingHorizontal: sConf.paddingH,
          paddingVertical: sConf.paddingV,
          borderWidth: vConf.border ? 1.5 : 0,
          borderColor: vConf.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
        },
        variant === 'primary' && shadows.md,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vConf.text} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <MaterialCommunityIcons
              name={icon as never}
              size={sConf.iconSize}
              color={vConf.text}
              style={styles.iconLeft}
            />
          )}
          <Text style={[sConf.typo, { color: vConf.text }]}>{children}</Text>
          {iconRight && (
            <MaterialCommunityIcons
              name={iconRight as never}
              size={sConf.iconSize}
              color={vConf.text}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
