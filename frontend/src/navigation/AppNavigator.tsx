import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BottomTabHeaderProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native-paper';
import RequesterTabs from './RequesterTabs';
import FixerTabs from './FixerTabs';
import CreateTask from '../screens/CreateTask';
import TaskDetails from '../screens/TaskDetails';
import TaskDetailsFixer from '../screens/TaskDetailsFixer';
import SettingsScreen from '../screens/SettingsScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
import LandingScreen from '../screens/LandingScreen';
import AppLogo from '../components/AppLogo';
import HamburgerMenu from '../components/HamburgerMenu';
import { useNotificationContext, FIXER_NOTIF_TYPES, REQUESTER_NOTIF_TYPES } from '../context/NotificationContext';
import { brandColors, spacing, radii, shadows, typography } from '../theme';
import type { Category } from '../constants/categories';
import {
  asLandingScreenWithNavigationProps,
  type RootStackParamList,
} from './landingIntent';

type Mode = 'requester' | 'fixer';

const DESKTOP_BREAKPOINT = 768;

const Stack = createNativeStackNavigator<RootStackParamList>();
const ModeTabs = createBottomTabNavigator();
const LandingScreenWithNavigationProps = asLandingScreenWithNavigationProps(LandingScreen);

// ─── Shared notification badge ───────────────────────────────────────────────
function NotifBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : String(count)}</Text>
    </View>
  );
}

// ─── Desktop header (wide screens / web) ─────────────────────────────────────
function DesktopHeader({ navigation, route }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const mode: Mode = route.name === 'FixerMode' ? 'fixer' : 'requester';
  const typeFilter = mode === 'fixer' ? FIXER_NOTIF_TYPES : REQUESTER_NOTIF_TYPES;
  const { unreadCount } = useNotificationContext();
  const notificationCount = unreadCount(typeFilter);

  const handleModeChange = (value: Mode) => {
    const nextRoute = value === 'fixer' ? 'FixerMode' : 'RequesterMode';
    if (route.name !== nextRoute) navigation.navigate(nextRoute);
  };

  const openStackScreen = (screen: keyof RootStackParamList) => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.navigate(screen as never);
      return;
    }
    navigation.navigate(screen as never);
  };

  const openLanding = () => {
    openStackScreen('Landing');
  };

  const openNotifications = () => {
    openStackScreen('NotificationCenter');
  };

  const openSettings = () => {
    openStackScreen('Settings');
  };

  const openCreateTask = () => {
    openStackScreen('CreateTask');
  };

  const openRequesterDashboard = () => {
    navigation.navigate('RequesterMode', { screen: 'Dashboard' });
  };

  const openFixerWorkspace = () => {
    navigation.navigate('FixerMode', { screen: 'FindJobs' });
  };

  const openAccount = () => {
    if (mode === 'fixer') {
      navigation.navigate('FixerMode', { screen: 'FixerProfile' });
      return;
    }
    navigation.navigate('RequesterMode', { screen: 'Profile' });
  };

  return (
    <View
      style={[
        styles.desktopBar,
        { paddingTop: insets.top > 0 ? insets.top : spacing.md },
      ]}
    >
      {/* Logo */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to FixIt home"
        onPress={openLanding}
        style={({ pressed }) => [styles.logoPressable, { opacity: pressed ? 0.78 : 1 }]}
      >
        <AppLogo compact />
      </Pressable>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      <View style={styles.desktopQuickLinks}>
        <Pressable style={styles.desktopQuickLink} onPress={openRequesterDashboard}>
          <Text style={styles.desktopQuickLinkText}>Requester Space</Text>
        </Pressable>
        <Pressable style={styles.desktopQuickLink} onPress={openFixerWorkspace}>
          <Text style={styles.desktopQuickLinkText}>Find Jobs</Text>
        </Pressable>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggleWrap}>
        <Pressable
          style={[styles.modeToggleBtn, mode === 'requester' && styles.modeToggleBtnActive]}
          onPress={() => handleModeChange('requester')}
        >
          <MaterialCommunityIcons
            name="home-outline"
            size={16}
            color={mode === 'requester' ? brandColors.textOnDark : brandColors.primaryMuted}
          />
          <Text
            style={[
              typography.label,
              styles.modeToggleLabel,
              mode === 'requester' && styles.modeToggleLabelActive,
            ]}
          >
            Requester
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeToggleBtn, mode === 'fixer' && styles.modeToggleBtnActive]}
          onPress={() => handleModeChange('fixer')}
        >
          <MaterialCommunityIcons
            name="wrench-outline"
            size={16}
            color={mode === 'fixer' ? brandColors.textOnDark : brandColors.primaryMuted}
          />
          <Text
            style={[
              typography.label,
              styles.modeToggleLabel,
              mode === 'fixer' && styles.modeToggleLabelActive,
            ]}
          >
            Fixer
          </Text>
        </Pressable>
      </View>

      {/* Bell */}
      <Pressable
        style={styles.desktopIconBtn}
        hitSlop={8}
        onPress={openNotifications}
      >
        <MaterialCommunityIcons name="bell-outline" size={22} color={brandColors.primary} />
        <NotifBadge count={notificationCount} />
      </Pressable>

      <Pressable
        style={[styles.desktopIconBtn, styles.desktopPostTaskBtn]}
        hitSlop={8}
        onPress={openCreateTask}
      >
        <MaterialCommunityIcons name="plus" size={22} color={brandColors.primaryDark} />
      </Pressable>

      <Pressable
        style={styles.desktopIconBtn}
        hitSlop={8}
        onPress={openSettings}
      >
        <MaterialCommunityIcons name="cog-outline" size={22} color={brandColors.primary} />
      </Pressable>

      {/* Account */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mode === 'fixer' ? 'Open fixer profile' : 'Open account'}
        style={({ pressed }) => [styles.accountButton, pressed && styles.accountButtonPressed]}
        onPress={openAccount}
      >
        <View style={styles.accountIcon}>
          <MaterialCommunityIcons
            name={mode === 'fixer' ? 'account-hard-hat' : 'account-circle-outline'}
            size={20}
            color={brandColors.primary}
          />
        </View>
        <View style={styles.accountTextBlock}>
          <Text style={styles.accountLabel}>{mode === 'fixer' ? 'Fixer profile' : 'Account'}</Text>
          <Text style={styles.accountSub}>Workspace</Text>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Mobile header (narrow screens / native) ──────────────────────────────────
function MobileHeader({ navigation, route }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const mode: Mode = route.name === 'FixerMode' ? 'fixer' : 'requester';
  const typeFilter = mode === 'fixer' ? FIXER_NOTIF_TYPES : REQUESTER_NOTIF_TYPES;
  const { unreadCount } = useNotificationContext();
  const notificationCount = unreadCount(typeFilter);

  const handleModeChange = (value: Mode) => {
    const nextRoute = value === 'fixer' ? 'FixerMode' : 'RequesterMode';
    if (route.name !== nextRoute) navigation.navigate(nextRoute);
  };

  const openStackScreen = (screen: keyof RootStackParamList) => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.navigate(screen as never);
      return;
    }
    navigation.navigate(screen as never);
  };

  const openLanding = () => {
    openStackScreen('Landing');
  };

  const openNotifications = () => {
    openStackScreen('NotificationCenter');
  };

  const openSettings = () => {
    openStackScreen('Settings');
  };

  const openRequesterHome = () => {
    navigation.navigate('RequesterMode', { screen: 'Dashboard' });
  };

  const openRequesterTasks = () => {
    navigation.navigate('RequesterMode', { screen: 'MyTasks' });
  };

  const openCreateTask = () => {
    openStackScreen('CreateTask');
  };

  const openFixerHome = () => {
    navigation.navigate('FixerMode', { screen: 'FindJobs' });
  };

  const openFixerBids = () => {
    navigation.navigate('FixerMode', { screen: 'MyBids' });
  };

  const openFixerProfile = () => {
    navigation.navigate('FixerMode', { screen: 'FixerProfile' });
  };

  const openAccount = () => {
    if (mode === 'fixer') {
      navigation.navigate('FixerMode', { screen: 'FixerProfile' });
      return;
    }
    navigation.navigate('RequesterMode', { screen: 'Profile' });
  };

  return (
    <>
      <LinearGradient
        colors={['#050D18', '#0C1E33']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}
      >
        {/* hamburger — left */}
        <Pressable style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
          <MaterialCommunityIcons name="menu" size={24} color={brandColors.textOnDark} />
        </Pressable>

        {/* logo — absolutely centered */}
        <View style={styles.logoCenter} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to FixIt home"
            onPress={openLanding}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
          >
            <AppLogo compact onDark />
          </Pressable>
        </View>

        {/* bell — right */}
        <Pressable
          style={styles.iconBtn}
          hitSlop={8}
          onPress={openNotifications}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color={brandColors.textOnDark} />
          <NotifBadge count={notificationCount} />
        </Pressable>
      </LinearGradient>

      <HamburgerMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentMode={mode}
        onModeChange={handleModeChange}
        onRequesterHomePress={openRequesterHome}
        onRequesterTasksPress={openRequesterTasks}
        onPostTaskPress={openCreateTask}
        onFixerHomePress={openFixerHome}
        onFixerBidsPress={openFixerBids}
        onFixerProfilePress={openFixerProfile}
        onAccountPress={openAccount}
        onNotificationsPress={openNotifications}
        onSettingsPress={openSettings}
        onLandingPress={openLanding}
        notificationCount={notificationCount}
      />
    </>
  );
}

// ─── Responsive header dispatcher ─────────────────────────────────────────────
function MainHeader(props: BottomTabHeaderProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT && Platform.OS === 'web';
  return isDesktop ? <DesktopHeader {...props} /> : <MobileHeader {...props} />;
}

function MainNavigator() {
  const theme = useTheme();

  return (
    <ModeTabs.Navigator
      initialRouteName="RequesterMode"
      screenOptions={{
        header: (props: BottomTabHeaderProps) => <MainHeader {...props} />,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <ModeTabs.Screen name="RequesterMode" component={RequesterTabs} options={{ title: 'Requester' }} />
      <ModeTabs.Screen name="FixerMode" component={FixerTabs} options={{ title: 'Fixer' }} />
    </ModeTabs.Navigator>
  );
}

function SignedInLanding({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Landing'>) {
  const openRequesterDashboard = () => {
    navigation.navigate('Main', {
      screen: 'RequesterMode',
      params: { screen: 'Dashboard' },
    });
  };

  const openRequesterTasks = () => {
    navigation.navigate('Main', {
      screen: 'RequesterMode',
      params: { screen: 'MyTasks' },
    });
  };

  const openFixerWorkspace = () => {
    navigation.navigate('Main', {
      screen: 'FixerMode',
      params: { screen: 'FindJobs' },
    });
  };

  const openFixerBids = () => {
    navigation.navigate('Main', {
      screen: 'FixerMode',
      params: { screen: 'MyBids' },
    });
  };

  const openFixerProfile = () => {
    navigation.navigate('Main', {
      screen: 'FixerMode',
      params: { screen: 'FixerProfile' },
    });
  };

  const openPostTask = (category?: Category) => {
    navigation.navigate('CreateTask', category ? { category } : undefined);
  };

  const openSettings = () => {
    navigation.navigate('Settings');
  };

  const openNotifications = () => {
    navigation.navigate('NotificationCenter');
  };

  return (
    <LandingScreenWithNavigationProps
      isSignedIn
      onLogin={openRequesterDashboard}
      onDashboard={openRequesterDashboard}
      onRequesterHome={openRequesterDashboard}
      onRequesterTasks={openRequesterTasks}
      onPostTask={openPostTask}
      onCategoryPress={openPostTask}
      onCategorySelect={openPostTask}
      onBecomeFixer={openFixerWorkspace}
      onFixerHome={openFixerWorkspace}
      onFixerBids={openFixerBids}
      onFixerProfile={openFixerProfile}
      onNotifications={openNotifications}
      onProfile={openSettings}
      onSettings={openSettings}
    />
  );
}

export default function AppNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerTintColor: theme.colors.primary,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { ...typography.h3, color: brandColors.textPrimary },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Landing" component={SignedInLanding} options={{ headerShown: false }} />
      <Stack.Screen name="Main" component={MainNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTask" component={CreateTask} options={{ title: 'Create Task' }} />
      <Stack.Screen name="TaskDetails" component={TaskDetails} options={{ title: 'Task Details' }} />
      <Stack.Screen name="TaskDetailsFixer" component={TaskDetailsFixer} options={{ title: 'Job Details' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  // ── Mobile header ────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  logoCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,252,246,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPressable: {
    borderRadius: radii.md,
  },

  // ── Desktop header ────────────────────────────────────────────
  desktopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.huge,
    paddingBottom: spacing.md,
    backgroundColor: brandColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.outlineLight,
    ...shadows.sm,
  },
  desktopIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  desktopPostTaskBtn: {
    backgroundColor: brandColors.secondary,
    ...shadows.sm,
  },
  desktopQuickLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.md,
  },
  desktopQuickLink: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  desktopQuickLinkText: {
    color: brandColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: brandColors.surfaceAlt,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  accountButtonPressed: {
    opacity: 0.82,
  },
  accountIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brandColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTextBlock: {
    gap: 1,
  },
  accountLabel: {
    color: brandColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  accountSub: {
    color: brandColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },

  // Mode toggle (desktop)
  modeToggleWrap: {
    flexDirection: 'row',
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: radii.pill,
    padding: 3,
    gap: 2,
    marginRight: spacing.md,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  modeToggleBtnActive: {
    backgroundColor: brandColors.primary,
    ...shadows.sm,
  },
  modeToggleLabel: {
    color: brandColors.textMuted,
  },
  modeToggleLabelActive: {
    color: brandColors.textOnDark,
  },

  // Notification badge
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: brandColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});
