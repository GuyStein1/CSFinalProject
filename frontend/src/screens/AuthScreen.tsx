import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../config/firebase';
import AppLogo from '../components/AppLogo';
import LoadingScreen from '../components/LoadingScreen';
import { FButton, FCard, FInput } from '../components/ui';
import { brandColors, heroGradient, spacing, radii, typography } from '../theme';
import type { AuthBootstrapStatus } from '../hooks/useAuthBootstrap';
import useGoogleAuth from '../hooks/useGoogleAuth';
import { friendlyAuthError } from '../utils/authErrors';

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
  const { isRTL } = useLanguage();

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

  // Social auth
  const googleAuth = useGoogleAuth();
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);

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

  const handleGoogleSignIn = async () => {
    clearErrors();
    setSocialLoading('google');
    try {
      await googleAuth.signIn();
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) return;
      setLocalError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setSocialLoading(null);
    }
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
      const cred = await createUserWithEmailAndPassword(auth, registerEmail.trim(), registerPassword);
      await updateProfile(cred.user, { displayName: registerFullName.trim() });
      await sendEmailVerification(cred.user);
      await onSyncLocalAccount(registerFullName.trim(), registerPhone.trim());
    } catch (err) {
      setLocalError(friendlyAuthError(err, t('auth.register.errors.registrationFailed')));
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
      setLocalError(friendlyAuthError(err, t('auth.forgot.failed')));
    } finally {
      setSubmitting(false);
    }
  };

  const submitLocalAccountSync = () => {
    if (!fullName.trim()) return;
    void onSyncLocalAccount(fullName.trim(), phoneNumber.trim());
  };

  const renderSocialButtons = (variant: 'dark' | 'light' = 'light') => {
    const isDark = variant === 'dark';
    const dividerColor = isDark ? 'rgba(255,252,246,0.25)' : brandColors.outlineLight;
    const dividerTextColor = isDark ? 'rgba(255,252,246,0.55)' : brandColors.textMuted;

    return (
      <>
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
          <Text style={[typography.caption, { color: dividerTextColor, marginHorizontal: spacing.sm }, rtlText]}>
            {t('auth.orContinueWith')}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
        </View>

        <Pressable
          onPress={() => void handleGoogleSignIn()}
          disabled={socialLoading !== null}
          style={({ pressed }) => [
            styles.socialButton,
            { opacity: pressed || socialLoading === 'google' ? 0.7 : 1 },
          ]}
        >
          <Image
            source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cGF0aCBmaWxsPSIjRkZDMTA3IiBkPSJNNDMuNjExIDIwLjA4M0g0MlYyMEgyNHY4aDExLjMwM2MtMS42NDkgNC42NTctNi4wOCA4LTExLjMwMyA4LTYuNjI3IDAtMTItNS4zNzMtMTItMTJzNS4zNzMtMTIgMTItMTJjMy4wNTkgMCA1Ljg0MiAxLjE1NCA3Ljk2MSAzLjAzOWw1LjY1Ny01LjY1N0MzNC4wNDYgNi4wNTMgMjkuMjY4IDQgMjQgNCA5LjI1NCA0LTMuOTYgMjAuMTI2IDcuMzggMzVjMy4wODkgNC4wNTUgNy44NCA2LjcxNCAxMy4xNjQgNi43NTdDMzMuNjQyIDQxLjk3IDQ0LjU1MiAzNC4yODIgNDQuNTUyIDI0YzAtMS4zMjQtLjEzOC0yLjYxNi0uNDAyLTMuODM2Ii8+PHBhdGggZmlsbD0iI0ZGM0QwMCIgZD0iTTYuMzA2IDE0LjY5MWw2LjU3MSA0LjgxOUMxNC42NTUgMTUuMTA4IDE4Ljk2MSAxMiAyNCAxMmMzLjA1OSAwIDUuODQyIDEuMTU0IDcuOTYxIDMuMDM5bDUuNjU3LTUuNjU3QzM0LjA0NiA2LjA1MyAyOS4yNjggNCAyNCA0IDEyLjk1NSA0IDMuMiAxMS40MjcgNi4zMDYgMTQuNjkxIi8+PHBhdGggZmlsbD0iIzRDQUY1MCIgZD0iTTI0IDQ0YzUuMTY2IDAgOS44Ni0xLjk3NyAxMy40MDktNS4xOTJsLTYuMTktNS4yMzhBMTEuOTEgMTEuOTEgMCAwIDEgMjQgMzZjLTUuMjAyIDAtOS42MTktMy4zMTctMTEuMjgzLTcuOTQ2bC02LjUyMiA1LjAyNUM5LjUwNSAzOS41NTYgMTYuMjI3IDQ0IDI0IDQ0Ii8+PHBhdGggZmlsbD0iIzE5NzZEMiIgZD0iTTQzLjYxMSAyMC4wODNINDJWMjBIMjR2OGgxMS4zMDNhMTIuMDQgMTIuMDQgMCAwIDEtNC4wODcgNS41NzFsLjAwMy0uMDAyIDYuMTkgNS4yMzhDMzYuOTcxIDM5LjIwNSA0NCAzNCA0NCAyNGMwLTEuMzI0LS4xMzgtMi42MTYtLjQwMi0zLjkxNyIvPjwvc3ZnPg==' }}
            style={{ width: 20, height: 20 }}
          />
          <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }, rtlText]}>
            {socialLoading === 'google' ? t('auth.signingIn') : t('auth.continueGoogle')}
          </Text>
        </Pressable>
      </>
    );
  };

  const rtlText = isRTL ? { writingDirection: 'rtl' as const } : {};

  const renderShell = (content: React.ReactNode) => (
    <LinearGradient
      colors={heroGradient.colors}
      locations={heroGradient.locations}
      start={heroGradient.start}
      end={heroGradient.end}
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
          <FCard style={{ ...styles.card, ...(isRTL ? { direction: 'rtl' as const } : {}) }} shadow="lg">
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
        <Text style={[typography.h1, styles.title, rtlText]}>{t('auth.needsSync.title')}</Text>
        <Text style={[typography.body, styles.body, rtlText]}>
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
        <Text style={[typography.h1, styles.title, rtlText]}>{t('auth.error.title')}</Text>
        <Text style={[typography.body, styles.body, rtlText]}>
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
        colors={heroGradient.colors}
        locations={heroGradient.locations}
        start={heroGradient.start}
        end={heroGradient.end}
        style={styles.welcomeScreen}
      >
        <View style={styles.welcomeCenter}>
          <AppLogo iconOnly />
          <Text style={styles.welcomeWordmark}>FixIt</Text>
          <Text style={[styles.welcomeTagline, rtlText]}>{t('auth.welcome.tagline')}</Text>
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
            <Text style={[styles.welcomeGhostText, rtlText]}>{t('auth.welcome.createAccount')}</Text>
          </Pressable>

          {renderSocialButtons('light')}

          <Text style={[styles.welcomeFootnote, rtlText]}>
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
        <Text style={[typography.h1, styles.title, rtlText]}>{t('auth.login.title')}</Text>

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
          <Text style={[typography.caption, { color: brandColors.textMuted, marginHorizontal: spacing.sm }, rtlText]}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>
        {renderSocialButtons()}

        <FButton variant="outline" onPress={() => goTo('register')} fullWidth>
          {t('auth.login.noAccount')}
        </FButton>

        <FButton variant="outline" onPress={() => goTo('welcome')} fullWidth icon="arrow-left">
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
        <Text style={[typography.h1, styles.title, rtlText]}>{t('auth.register.title')}</Text>

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

        {renderSocialButtons()}

        <FButton variant="outline" onPress={() => goTo('login')} fullWidth>
          {t('auth.register.alreadyHave')}
        </FButton>
      </View>
    );
  }

  // ── Forgot Password ────────────────────────────────────────────────────────
  return renderShell(
    <View style={styles.content}>
      <AppLogo compact showTagline />
      <Text style={[typography.h1, styles.title, rtlText]}>{t('auth.forgot.title')}</Text>

      {forgotSent ? (
        <>
          <View style={styles.successIconCircle}>
            <MaterialCommunityIcons name="email-check-outline" size={36} color={brandColors.success} />
          </View>
          <Text style={[typography.body, styles.body, rtlText]}>
            {t('auth.forgot.sentDescription', { email: forgotEmail })}
          </Text>
          <FButton onPress={() => goTo('login')} fullWidth icon="login">
            {t('auth.forgot.backToSignIn')}
          </FButton>
        </>
      ) : (
        <>
          <Text style={[typography.body, styles.body, rtlText]}>
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
  // Welcome screen — full-screen light hero gradient, no card
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
    color: brandColors.textPrimary,
    marginTop: spacing.md,
  },
  welcomeTagline: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.secondaryDark,
    textAlign: 'center',
  },
  welcomeActions: {
    gap: spacing.md,
  },
  welcomeGhostBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(28, 60, 86, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: radii.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeGhostText: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  welcomeFootnote: {
    textAlign: 'center',
    fontSize: 11,
    color: brandColors.textMuted,
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
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: brandColors.outline,
    backgroundColor: brandColors.surface,
  },
});
