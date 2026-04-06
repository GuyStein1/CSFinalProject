import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, View, Pressable, Platform } from 'react-native';
import { Text, Switch, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { FButton, FCard, FInput } from '../components/ui';
import { brandColors, spacing, typography } from '../theme';

export default function SettingsScreen() {
  const user = auth.currentUser;
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  const handleChangePassword = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert('Success', 'Check your inbox for a password reset link.');
    } catch {
      Alert.alert('Error', 'Failed to send password reset email.');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Are you sure you want to log out?')) {
        await signOut(auth);
      }
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut(auth);
          },
        },
      ]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <FCard style={styles.heroCard} shadow="sm">
        <Text style={[typography.h3, { color: brandColors.textPrimary }]}>Settings</Text>
      </FCard>

      {/* Account Section */}
      <FCard style={styles.sectionCard} shadow="sm">
        <Text style={[typography.eyebrow, { color: brandColors.textMuted, marginBottom: spacing.lg }]}>
          Account
        </Text>

        <SettingRow icon="email-outline" label="Email" value={user?.email || 'Not signed in'} />

        <Divider style={styles.divider} />

        <View style={styles.phoneSection}>
          <SettingRow icon="phone-outline" label="Phone Number" />
          <FInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
          <FButton
            onPress={() => {
              setSaving(true);
              setTimeout(() => {
                setSaving(false);
                Alert.alert('Saved', 'Phone number updated.');
              }, 500);
            }}
            loading={saving}
            disabled={saving || phone.trim().length === 0}
            size="sm"
            style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}
          >
            Save
          </FButton>
        </View>
      </FCard>

      {/* Preferences Section */}
      <FCard style={styles.sectionCard} shadow="sm">
        <Text style={[typography.eyebrow, { color: brandColors.textMuted, marginBottom: spacing.lg }]}>
          Preferences
        </Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="bell-outline" size={18} color={brandColors.primaryMuted} />
            </View>
            <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
              Push Notifications
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ true: brandColors.primary, false: brandColors.outlineLight }}
            thumbColor={brandColors.white}
          />
        </View>

        <Divider style={styles.divider} />

        <Pressable onPress={handleChangePassword} style={styles.actionRow}>
          <View style={styles.settingIcon}>
            <MaterialCommunityIcons name="lock-reset" size={18} color={brandColors.primaryMuted} />
          </View>
          <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, flex: 1 }]}>
            Change Password
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={brandColors.textMuted} />
        </Pressable>
      </FCard>

      {/* Danger Zone */}
      <FButton
        variant="danger"
        icon="logout"
        onPress={handleLogout}
        fullWidth
        style={styles.logoutButton}
      >
        Log Out
      </FButton>
    </ScrollView>
  );
}

function SettingRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <MaterialCommunityIcons name={icon as never} size={18} color={brandColors.primaryMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: brandColors.textMuted }]}>{label}</Text>
        {value && (
          <Text style={[typography.body, { color: brandColors.textPrimary, marginTop: 2 }]}>{value}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    backgroundColor: brandColors.background,
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    maxWidth: 500,
    marginBottom: spacing.lg,
  },
  sectionCard: {
    width: '100%',
    maxWidth: 500,
    marginBottom: spacing.lg,
  },
  divider: {
    marginVertical: spacing.lg,
    backgroundColor: brandColors.outlineLight,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneSection: {
    gap: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  logoutButton: {
    maxWidth: 500,
    marginTop: spacing.sm,
  },
});
