import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { brandColors, radii, shadows, spacing } from '../../theme';

type ShadowLevel = 'sm' | 'md' | 'lg' | 'none';

interface FCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  shadow?: ShadowLevel;
  accentColor?: string;
  style?: ViewStyle;
  padded?: boolean;
  bg?: string;
}

export default function FCard({
  children,
  onPress,
  shadow = 'sm',
  accentColor,
  style,
  padded = true,
  bg = brandColors.surface,
}: FCardProps) {
  const cardStyle: ViewStyle[] = [
    styles.base,
    { backgroundColor: bg },
    shadow !== 'none' && shadows[shadow],
    padded && styles.padded,
    style,
  ].filter(Boolean) as ViewStyle[];

  const inner = (
    <>
      {accentColor && (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      )}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          {
            opacity: pressed ? 0.94 : 1,
            transform: [{ scale: pressed ? 0.975 : 1 }],
            backgroundColor: pressed
              ? (bg === brandColors.surface ? brandColors.surfaceAlt : bg)
              : bg,
          },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radii.lg,
    borderBottomLeftRadius: radii.lg,
  },
});
