import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  title: string;
}

export default function PlaceholderScreen({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">{title}</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
  },
  subtitle: {
    marginTop: 8,
    color: '#757575',
  },
});
