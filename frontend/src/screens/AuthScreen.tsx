import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
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

type Mode = 'welcome' | 'login' | 'register' | 'forgot';

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
  const [mode, setMode] = useState<Mode>('welcome');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Shared
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    setFullName((current) => current || suggestedFullName);
  }, [suggestedFullName]);

  const clearErrors = () => setLocalError(null);

  const goTo = (m: Mode) => {
    clearErrors();
    setMode(m);
  };

  const submitSignIn = async () => {
    if (!email.trim() || !password) return;
    clearErrors();
    try {
      await onSignIn(email.trim(), password);
    } catch {
      // error is surfaced via the `error` prop from parent
    }
  };

  const submitRegister = async () => {
    clearErrors();
    if (!registerFullName.trim()) { setLocalError('Full name is required'); return; }
    if (!registerEmail.trim()) { setLocalError('Email is required'); return; }
    if (registerPassword.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
    if (registerPassword !== confirmPassword) { setLocalError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, registerEmail.trim(), registerPassword);
      await onSyncLocalAccount(registerFullName.trim(), registerPhone.trim());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitForgot = async () => {
    clearErrors();
    if (!forgotEmail.trim()) { setLocalError('Please enter your email address'); return; }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSent(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLocalAccountSync = () => {
    if (!fullName.trim()) return;
    void onSyncLocalAccount(fullName.trim(), phoneNumber.trim());
  };

  const renderShell = (content: React.ReactNode) => (
    <LinearGradient
      colors={['#050D18', '#0C1E33', '#2A5478', brandColors.background]}
      locations={[0, 0.2, 0.55, 1]}
      style={styles.gradient}
    >
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'checking') {
    return <LoadingScreen label="Checking your session..." />;
  }

  // ── Needs sync (Firebase account exists, no local DB user) ─────────────────
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

        <FButton onPress={submitLocalAccountSync} disabled={!fullName.trim()} fullWidth>
          Create Local Account
        </FButton>
        <FButton variant="ghost" onPress={onLogOut} fullWidth>
          Sign Out
        </FButton>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
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

  // ── Welcome ────────────────────────────────────────────────────────────────
  if (mode === 'welcome') {
    return renderShell(
      <View style={styles.content}>
        <AppLogo showTagline />
        <Text style={[typography.body, styles.body]}>
          Find trusted fixers for any home task — or earn money as one.
        </Text>
        <FButton onPress={() => goTo('login')} fullWidth icon="login">
          Sign In
        </FButton>
        <FButton variant="secondary" onPress={() => goTo('register')} fullWidth icon="account-plus">
          Create Account
        </FButton>
      </View>
    );
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  if (mode === 'login') {
    return renderShell(
      <View style={styles.content}>
        <AppLogo compact showTagline />
        <Text style={[typography.h1, styles.title]}>Sign in to Fixlt</Text>

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
          onSubmitEditing={() => void submitSignIn()}
        />

        {(error || localError) && (
          <Text style={[typography.bodySm, { color: brandColors.danger }]}>{localError ?? error}</Text>
        )}

        <FButton onPress={() => void submitSignIn()} disabled={!email.trim() || !password} fullWidth icon="login">
          Sign In
        </FButton>

        <FButton variant="ghost" onPress={() => goTo('forgot')} fullWidth>
          Forgot Password?
        </FButton>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={[typography.caption, { color: brandColors.textMuted, marginHorizontal: spacing.sm }]}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <FButton variant="ghost" onPress={() => goTo('register')} fullWidth>
          Don't have an account? Create one
        </FButton>

        <FButton variant="ghost" onPress={() => goTo('welcome')} fullWidth>
          ← Back
        </FButton>
      </View>
    );
  }

  // ── Register ───────────────────────────────────────────────────────────────
  if (mode === 'register') {
    return renderShell(
      <View style={styles.content}>
        <AppLogo compact showTagline />
        <Text style={[typography.h1, styles.title]}>Create your account</Text>

        <FInput
          label="Full Name"
          value={registerFullName}
          onChangeText={setRegisterFullName}
          returnKeyType="next"
        />
        <FInput
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={registerEmail}
          onChangeText={setRegisterEmail}
          returnKeyType="next"
        />
        <FInput
          label="Password"
          secureTextEntry
          value={registerPassword}
          onChangeText={setRegisterPassword}
          returnKeyType="next"
        />
        <FInput
          label="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          returnKeyType="next"
        />
        <FInput
          label="Phone Number (optional)"
          value={registerPhone}
          onChangeText={setRegisterPhone}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={() => void submitRegister()}
        />

        {localError && (
          <Text style={[typography.bodySm, { color: brandColors.danger }]}>{localError}</Text>
        )}

        <FButton onPress={() => void submitRegister()} loading={submitting} disabled={submitting} fullWidth icon="account-plus">
          Create Account
        </FButton>

        <FButton variant="ghost" onPress={() => goTo('login')} fullWidth>
          Already have an account? Sign In
        </FButton>
      </View>
    );
  }

  // ── Forgot Password ────────────────────────────────────────────────────────
  return renderShell(
    <View style={styles.content}>
      <AppLogo compact showTagline />
      <Text style={[typography.h1, styles.title]}>Reset your password</Text>

      {forgotSent ? (
        <>
          <View style={styles.successIconCircle}>
            <MaterialCommunityIcons name="email-check-outline" size={36} color={brandColors.success} />
          </View>
          <Text style={[typography.body, styles.body]}>
            Check your inbox — we sent a reset link to {forgotEmail}.
          </Text>
          <FButton onPress={() => goTo('login')} fullWidth icon="login">
            Back to Sign In
          </FButton>
        </>
      ) : (
        <>
          <Text style={[typography.body, styles.body]}>
            Enter your email and we'll send you a link to reset your password.
          </Text>
          <FInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={forgotEmail}
            onChangeText={setForgotEmail}
            returnKeyType="done"
            onSubmitEditing={() => void submitForgot()}
          />
          {localError && (
            <Text style={[typography.bodySm, { color: brandColors.danger }]}>{localError}</Text>
          )}
          <FButton onPress={() => void submitForgot()} loading={submitting} disabled={submitting} fullWidth icon="email-send">
            Send Reset Link
          </FButton>
          <FButton variant="ghost" onPress={() => goTo('login')} fullWidth>
            ← Back to Sign In
          </FButton>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
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
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: brandColors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: brandColors.outlineLight,
  },
});
