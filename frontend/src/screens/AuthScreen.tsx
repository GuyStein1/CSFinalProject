import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppLogo from '../components/AppLogo';
import LoadingScreen from '../components/LoadingScreen';
import { FButton, FCard, FInput } from '../components/ui';
import { brandColors, spacing, radii, typography } from '../theme';
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

const MASCOT_TINT = Platform.OS === 'web'
  ? ({ filter: 'brightness(0) invert(1)' } as object)
  : { tintColor: '#FFFFFF' };

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
    <LinearGradient
      colors={['#050D18', '#0C1E33', '#2A5478', brandColors.background]}
      locations={[0, 0.2, 0.55, 1]}
      style={styles.gradient}
    >
      {/* Mascot watermark — visible in the dark upper area */}
      <Image
        source={require('../../assets/logo-without-text.png')}
        style={[styles.watermark, MASCOT_TINT]}
        resizeMode="contain"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kavContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FCard style={styles.card} shadow="lg">
            {content}
          </FCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );

  if (status === 'checking') {
    return <LoadingScreen label="Checking your session..." />;
  }

  if (status === 'needs_sync') {
    return renderShell(
      <View style={styles.content}>
        <AppLogo compact showTagline />
        <Text style={[typography.h1, styles.title]}>Finish your account setup</Text>
        <Text style={[typography.body, styles.body]}>
          You are signed in with Firebase, but this account does not exist in the Fixlt
          database yet.
        </Text>

        {userEmail && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={18} color={brandColors.primaryMuted} />
            <View>
              <Text style={[typography.caption, { color: brandColors.textMuted }]}>Signed in as</Text>
              <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>{userEmail}</Text>
            </View>
          </View>
        )}

        <FInput label="Full Name" value={fullName} onChangeText={setFullName} returnKeyType="next" />
        <FInput
          label="Phone Number (optional)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={submitLocalAccountSync}
        />

        {error && (
          <Text style={[typography.bodySm, { color: brandColors.danger }]}>{error}</Text>
        )}

        <FButton onPress={submitLocalAccountSync} disabled={!canSyncLocalAccount} fullWidth>
          Create Local Account
        </FButton>
        <FButton variant="ghost" onPress={onLogOut} fullWidth>
          Sign Out
        </FButton>
      </View>
    );
  }

  if (status === 'error' && userEmail) {
    return renderShell(
      <View style={styles.content}>
        <AppLogo compact showTagline />
        <View style={styles.errorIconCircle}>
          <MaterialCommunityIcons name="alert-circle-outline" size={36} color={brandColors.danger} />
        </View>
        <Text style={[typography.h1, styles.title]}>Session verification failed</Text>
        <Text style={[typography.body, styles.body]}>
          {error ?? 'We could not verify your session with the backend.'}
        </Text>
        <FButton onPress={() => void onRetry()} fullWidth icon="refresh">
          Try Again
        </FButton>
        <FButton variant="ghost" onPress={onLogOut} fullWidth>
          Sign Out
        </FButton>
      </View>
    );
  }

  return renderShell(
    <View style={styles.content}>
      <AppLogo compact showTagline />
      <Text style={[typography.h1, styles.title]}>Sign in to Fixlt</Text>
      <Text style={[typography.body, styles.body]}>
        Use your Firebase test user so the app can send authenticated API requests locally.
      </Text>

      <FInput
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        returnKeyType="next"
      />
      <FInput
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        returnKeyType="done"
        onSubmitEditing={submitSignIn}
      />

      {error && (
        <Text style={[typography.bodySm, { color: brandColors.danger }]}>{error}</Text>
      )}

      <FButton onPress={submitSignIn} disabled={!canSignIn} fullWidth icon="login">
        Sign In
      </FButton>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  watermark: {
    position: 'absolute',
    top: -50,
    right: -60,
    width: 300,
    height: 300,
    opacity: 0.08,
  },
  kavContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xxxl,
  },
  content: {
    gap: spacing.md,
  },
  title: {
    color: brandColors.textPrimary,
    textAlign: 'center',
  },
  body: {
    color: brandColors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surfaceAlt,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: brandColors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
