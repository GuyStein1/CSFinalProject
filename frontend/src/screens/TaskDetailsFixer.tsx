import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import AppLogo from '../components/AppLogo';
import { brandColors } from '../theme';

interface Props {
  route: {
    params?: {
      taskId?: string;
    };
  };
}

export default function TaskDetailsFixer({ route }: Props) {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <AppLogo />
          <Text variant="headlineSmall" style={styles.title}>
            Fixer task details are next
          </Text>
          <Text variant="bodyMedium" style={styles.body}>
            A3.2 routes here correctly. A3.4 will replace this placeholder with the real Fixer task
            details and bid submission flow.
          </Text>
          {route.params?.taskId && (
            <Text variant="bodySmall" style={styles.taskId}>
              Task ID: {route.params.taskId}
            </Text>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 28,
    backgroundColor: brandColors.surface,
  },
  content: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  title: {
    color: brandColors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: brandColors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  taskId: {
    marginTop: 8,
    color: brandColors.primary,
    fontWeight: '600',
  },
});
