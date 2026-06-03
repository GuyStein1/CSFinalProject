import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
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
  initialMode?: Mode;
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
  initialMode = 'welcome',
}: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const { t } = useTranslation();

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
    if (!registerFullName.trim()) { setLocalError(t('auth.register.errors.fullNameRequired')); return; }
    if (!registerEmail.trim()) { setLocalError(t('auth.register.errors.emailRequired')); return; }
    if (registerPassword.length < 6) { setLocalError(t('auth.register.errors.passwordLength')); return; }
    if (registerPassword !== confirmPassword) { setLocalError(t('auth.register.errors.passwordMismatch')); return; }

    setSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, registerEmail.trim(), registerPassword);
      await onSyncLocalAccount(registerFullName.trim(), registerPhone.trim());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('auth.register.errors.registrationFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitForgot = async () => {
    clearErrors();
    if (!forgotEmail.trim()) { setLocalError(t('auth.forgot.emailPlaceholder')); return; }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSent(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('auth.forgot.failed'));
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
      colors={[brandColors.primary, brandColors.primaryDark, '#0A1D30', brandColors.background]}
      locations={[0, 0.3, 0.6, 1]}
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
    return <LoadingScreen label={t('auth.loading.checkingSession')} />;
  }

  // ── Needs sync (Firebase account exists, no local DB user) ─────────────────
  if (status === 'needs_sync') {
    return renderShell(
      <View style={styles.content}>
        <AppLogo compact showTagline />
        <Text style={[typography.h1, styles.title]}>{t('auth.needsSync.title')}</Text>
        <Text style={[typography.body, styles.body]}>
          {t('auth.needsSync.description')}
        </Text>

        {userEmail && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={18} color={brandColors.primaryMuted} />
            <View>
              <Text style={[typography.caption, { color: brandColors.textMuted }]}>{t('auth.needsSync.signedInAs')}</Text>
              <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>{userEmail}</Text>
            </View>
          </View>
        )}

        <FInput label={t('auth.needsSync.fullName')} value={fullName} onChangeText={setFullName} returnKeyType="next" />
        <FInput
          label={t('auth.needsSync.phoneNumber')}
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
          {t('auth.needsSync.createAccount')}
        </FButton>
        <FButton variant="ghost" onPress={onLogOut} fullWidth>
          {t('auth.needsSync.signOut')}
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
        <Text style={[typography.h1, styles.title]}>{t('auth.error.title')}</Text>
        <Text style={[typography.body, styles.body]}>
          {error ?? 'We could not verify your session with the backend.'}
        </Text>
        <FButton onPress={() => void onRetry()} fullWidth icon="refresh">
          {t('auth.error.retry')}
        </FButton>
        <FButton variant="ghost" onPress={onLogOut} fullWidth>
          {t('auth.error.signOut')}
        </FButton>
      </View>
    );
  }

  // ── Welcome ────────────────────────────────────────────────────────────────
  if (mode === 'welcome') {
    return (
      <LinearGradient
        colors={[brandColors.primary, brandColors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.welcomeScreen}
      >
        <View style={styles.welcomeCenter}>
          <AppLogo iconOnly />
          <Text style={styles.welcomeWordmark}>FixIt</Text>
          <Text style={styles.welcomeTagline}>{t('auth.welcome.tagline')}</Text>
        </View>
        <View style={styles.welcomeActions}>
          <FButton onPress={() => goTo('login')} variant="secondary" fullWidth>
            {t('auth.welcome.logIn')}
          </FButton>
          <Pressable
            onPress={() => goTo('register')}
            style={({ pressed }) => [
              styles.welcomeGhostBtn,
              { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <Text style={styles.welcomeGhostText}>{t('auth.welcome.createAccount')}</Text>
          </Pressable>
          <Text style={styles.welcomeFootnote}>
            {t('auth.welcome.footnote')}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  if (mode === 'login') {
    return renderShell(
      <View style={styles.content}>
        <AppLogo compact showTagline />
        <Text style={[typography.h1, styles.title]}>{t('auth.login.title')}</Text>

        <FInput
          label={t('auth.login.email')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />
        <FInput
          label={t('auth.login.password')}
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
          {t('auth.login.signIn')}
        </FButton>

        <FButton variant="ghost" onPress={() => goTo('forgot')} fullWidth>
          {t('auth.login.forgotPassword')}
        </FButton>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={[typography.caption, { color: brandColors.textMuted, marginHorizontal: spacing.sm }]}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <FButton variant="ghost" onPress={() => goTo('register')} fullWidth>
          {t('auth.login.noAccount')}
        </FButton>

        <FButton variant="ghost" onPress={() => goTo('welcome')} fullWidth>
          {t('common.back')}
        </FButton>
      </View>
    );
  }

  // ── Register ───────────────────────────────────────────────────────────────
  if (mode === 'register') {
    return renderShell(
      <View style={styles.content}>
        <AppLogo compact showTagline />
        <Text style={[typography.h1, styles.title]}>{t('auth.register.title')}</Text>

        <FInput
          label={t('auth.register.fullName')}
          value={registerFullName}
          onChangeText={setRegisterFullName}
          returnKeyType="next"
        />
        <FInput
          label={t('auth.register.email')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={registerEmail}
          onChangeText={setRegisterEmail}
          returnKeyType="next"
        />
        <FInput
          label={t('auth.register.password')}
          secureTextEntry
          value={registerPassword}
          onChangeText={setRegisterPassword}
          returnKeyType="next"
        />
        <FInput
          label={t('auth.register.confirmPassword')}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          returnKeyType="next"
        />
        <FInput
          label={t('auth.register.phoneNumber')}
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
          {t('auth.register.submit')}
        </FButton>

        <FButton variant="ghost" onPress={() => goTo('login')} fullWidth>
          {t('auth.register.alreadyHave')}
        </FButton>
      </View>
    );
  }

  // ── Forgot Password ────────────────────────────────────────────────────────
  return renderShell(
    <View style={styles.content}>
      <AppLogo compact showTagline />
      <Text style={[typography.h1, styles.title]}>{t('auth.forgot.title')}</Text>

      {forgotSent ? (
        <>
          <View style={styles.successIconCircle}>
            <MaterialCommunityIcons name="email-check-outline" size={36} color={brandColors.success} />
          </View>
          <Text style={[typography.body, styles.body]}>
            {t('auth.forgot.sentDescription', { email: forgotEmail })}
          </Text>
          <FButton onPress={() => goTo('login')} fullWidth icon="login">
            {t('auth.forgot.backToSignIn')}
          </FButton>
        </>
      ) : (
        <>
          <Text style={[typography.body, styles.body]}>
            {t('auth.forgot.description')}
          </Text>
          <FInput
            label={t('auth.forgot.email')}
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
            {t('auth.forgot.submit')}
          </FButton>
          <FButton variant="ghost" onPress={() => goTo('login')} fullWidth>
            {t('auth.forgot.backToSignIn')}
          </FButton>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Welcome screen — full-screen navy, no card
  welcomeScreen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.huge + spacing.xxxl,
    paddingBottom: spacing.huge,
  },
  welcomeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  welcomeWordmark: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    color: brandColors.textOnDark,
    marginTop: spacing.md,
  },
  welcomeTagline: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.secondary,
    textAlign: 'center',
  },
  welcomeActions: {
    gap: spacing.md,
  },
  welcomeGhostBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 252, 246, 0.4)',
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeGhostText: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textOnDark,
  },
  welcomeFootnote: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255, 252, 246, 0.55)',
    marginTop: spacing.sm,
    letterSpacing: 0.3,
  },

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
