import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { View } from 'react-native';
import { Text, TextInput, Button, Card, Divider, Switch } from 'react-native-paper';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

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
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.heading}>Settings</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge">Email</Text>
          <Text variant="bodyMedium" style={styles.value}>{user?.email || 'Not signed in'}</Text>

          <Divider style={styles.divider} />

          <Text variant="labelLarge">Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={() => {
              setSaving(true);
              setTimeout(() => {
                setSaving(false);
                Alert.alert('Saved', 'Phone number updated.');
              }, 500);
            }}
            loading={saving}
            disabled={saving || phone.trim().length === 0}
            compact
          >
            Save
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.pushRow}>
            <Text variant="labelLarge">Push Notifications</Text>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} />
          </View>

          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            onPress={handleChangePassword}
            style={styles.settingsButton}
            icon="lock-reset"
          >
            Change Password
          </Button>

          <Button
            mode="outlined"
            onPress={handleLogout}
            textColor="#C62828"
            style={styles.settingsButton}
            icon="logout"
          >
            Log Out
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 90,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
  },
  heading: {
    marginBottom: 16,
    width: '100%',
    maxWidth: 500,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 16,
  },
  value: {
    marginTop: 4,
    marginBottom: 8,
    color: '#616161',
  },
  divider: {
    marginVertical: 12,
  },
  input: {
    marginTop: 4,
    marginBottom: 12,
  },
  pushRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsButton: {
    marginBottom: 8,
  },
});
