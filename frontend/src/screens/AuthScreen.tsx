import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import AppLogo from '../components/AppLogo';
import LoadingScreen from '../components/LoadingScreen';
import { brandColors } from '../theme';
import type { AuthBootstrapStatus } from '../hooks/useAuthBootstrap';

interface AuthScreenProps {
  status: AuthBootstrapStatus;
  error: string | null;
  userEmail: string | null;
  suggestedFullName: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSyncLocalAccount: (fullName: string, phoneNumber: string) => Promise<void>;
  onRetry: () => Promise<void>;
  onLogOut: () => Promise<void>;
}

export default function AuthScreen({
  status,
  error,
  userEmail,
  suggestedFullName,
  onSignIn,
  onSyncLocalAccount,
  onRetry,
  onLogOut,
}: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const canSignIn = email.trim().length > 0 && password.length > 0;
  const canSyncLocalAccount = fullName.trim().length > 0;

  useEffect(() => {
    setFullName((current) => current || suggestedFullName);
  }, [suggestedFullName]);

  const submitSignIn = () => {
    if (!canSignIn) return;
    void onSignIn(email, password);
  };

  const submitLocalAccountSync = () => {
    if (!canSyncLocalAccount) return;
    void onSyncLocalAccount(fullName, phoneNumber);
  };

  const renderShell = (content: React.ReactNode) => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.content}>{content}</Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (status === 'checking') {
    return <LoadingScreen label="Checking your session..." />;
  }

  if (status === 'needs_sync') {
    return renderShell(
      <>
        <AppLogo compact showTagline />
        <Text variant="headlineSmall" style={styles.title}>
          Finish your account setup
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          You are signed in with Firebase, but this account does not exist in the Fixlt
          database yet.
        </Text>

        {userEmail && (
          <View style={styles.infoRow}>
            <Text variant="labelLarge" style={styles.infoLabel}>
              Signed in as
            </Text>
            <Text variant="bodyMedium" style={styles.infoValue}>
              {userEmail}
            </Text>
          </View>
        )}

        <TextInput
          mode="outlined"
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          returnKeyType="next"
        />
        <TextInput
          mode="outlined"
          label="Phone Number (optional)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={submitLocalAccountSync}
        />

        {error && (
          <Text variant="bodySmall" style={styles.errorText}>
            {error}
          </Text>
        )}

        <Button
          mode="contained"
          onPress={submitLocalAccountSync}
          disabled={!canSyncLocalAccount}
          style={styles.primaryButton}
        >
          Create Local Account
        </Button>
        <Button mode="text" onPress={onLogOut}>
          Sign Out
        </Button>
      </>
    );
  }

  if (status === 'error' && userEmail) {
    return renderShell(
      <>
        <AppLogo compact showTagline />
        <Text variant="headlineSmall" style={styles.title}>
          Session verification failed
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          {error ?? 'We could not verify your session with the backend.'}
        </Text>
        <Button mode="contained" onPress={() => void onRetry()} style={styles.primaryButton}>
          Try Again
        </Button>
        <Button mode="text" onPress={onLogOut}>
          Sign Out
        </Button>
      </>
    );
  }

  return renderShell(
    <>
      <AppLogo compact showTagline />
      <Text variant="headlineSmall" style={styles.title}>
        Sign in to Fixlt
      </Text>
      <Text variant="bodyMedium" style={styles.body}>
        Use your Firebase test user so the app can send authenticated API requests locally.
      </Text>

      <TextInput
        mode="outlined"
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        returnKeyType="next"
      />
      <TextInput
        mode="outlined"
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={submitSignIn}
      />

      {error && (
        <Text variant="bodySmall" style={styles.errorText}>
          {error}
        </Text>
      )}

      <Button
        mode="contained"
        onPress={submitSignIn}
        disabled={!canSignIn}
        style={styles.primaryButton}
      >
        Sign In
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: brandColors.surface,
  },
  content: {
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
    marginBottom: 8,
  },
  input: {
    backgroundColor: brandColors.surface,
  },
  primaryButton: {
    borderRadius: 999,
    marginTop: 8,
  },
  errorText: {
    color: brandColors.danger,
  },
  infoRow: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: brandColors.surfaceAlt,
    gap: 4,
  },
  infoLabel: {
    color: brandColors.textMuted,
  },
  infoValue: {
    color: brandColors.textPrimary,
    fontWeight: '600',
  },
});
