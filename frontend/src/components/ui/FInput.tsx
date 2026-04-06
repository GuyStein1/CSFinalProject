import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';
import { brandColors, radii } from '../../theme';

interface FInputProps extends Omit<TextInputProps, 'mode' | 'theme'> {
  containerStyle?: ViewStyle;
}

function FInputComponent({ containerStyle: _containerStyle, style, ...props }: FInputProps) {
  return (
    <TextInput
      mode="outlined"
      outlineColor={brandColors.outlineLight}
      activeOutlineColor={brandColors.primary}
      textColor={brandColors.textPrimary}
      placeholderTextColor={brandColors.textMuted}
      outlineStyle={styles.outline}
      style={[styles.input, style]}
      contentStyle={styles.content}
      {...props}
    />
  );
}

const FInput = Object.assign(FInputComponent, {
  Affix: TextInput.Affix,
  Icon: TextInput.Icon,
});

export default FInput;

const styles = StyleSheet.create({
  input: {
    backgroundColor: brandColors.surface,
    fontSize: 15,
  },
  outline: {
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  content: {
    paddingVertical: 2,
  },
});
