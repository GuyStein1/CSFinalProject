import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CommonActions } from '@react-navigation/native';
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

const DESKTOP_BREAKPOINT = 900;

const Stack = createNativeStackNavigator<RootStackParamList>();
const ModeTabs = createBottomTabNavigator();
const LandingScreenWithNavigationProps = asLandingScreenWithNavigationProps(LandingScreen);

type NestedRouteSnapshot = {
  name?: string;
  params?: { screen?: unknown };
  state?: {
    index?: number;
    routes?: NestedRouteSnapshot[];
  };
};

function getActiveWorkspaceScreen(route: NestedRouteSnapshot): string | undefined {
  const state = route.state;
  const activeRoute = state?.routes?.[state.index ?? 0];
  if (activeRoute) {
    return getActiveWorkspaceScreen(activeRoute) ?? activeRoute.name;
  }

  return typeof route.params?.screen === 'string' ? route.params.screen : undefined;
}

function resetToLanding(navigation: BottomTabHeaderProps['navigation']) {
  const parentNavigation = navigation.getParent();
  if (parentNavigation) {
    parentNavigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      }),
    );
    return;
  }

  navigation.navigate('Landing' as never);
}

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
  const topInset = insets.top > 0 ? insets.top : spacing.sm;
  const [navStateVersion, setNavStateVersion] = useState(0);
  const [activeScreenOverride, setActiveScreenOverride] = useState<string | null>(null);
  const mode: Mode = route.name === 'FixerMode' ? 'fixer' : 'requester';
  const typeFilter = mode === 'fixer' ? FIXER_NOTIF_TYPES : REQUESTER_NOTIF_TYPES;
  const { unreadCount } = useNotificationContext();
  const notificationCount = unreadCount(typeFilter);

  useEffect(() => {
    return navigation.addListener('state', () => {
      setNavStateVersion((version) => version + 1);
    });
  }, [navigation]);

  useEffect(() => {
    setActiveScreenOverride(null);
  }, [route.name]);

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
    resetToLanding(navigation);
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

  const openWorkspaceScreen = (screen: string) => {
    setActiveScreenOverride(screen);
    navigation.navigate(mode === 'fixer' ? 'FixerMode' : 'RequesterMode', { screen });
  };
  const navigatorState = React.useMemo(() => navigation.getState(), [navigation, navStateVersion]);
  const activeModeRoute =
    navigatorState.routes.find((item) => item.name === route.name) as NestedRouteSnapshot | undefined;
  const activeScreenFromState =
    getActiveWorkspaceScreen((activeModeRoute ?? route) as NestedRouteSnapshot) ??
    (mode === 'fixer' ? 'FindJobs' : 'Dashboard');
  const activeScreen = activeScreenOverride ?? activeScreenFromState;

  useEffect(() => {
    if (activeScreenOverride && activeScreenFromState === activeScreenOverride) {
      setActiveScreenOverride(null);
    }
  }, [activeScreenFromState, activeScreenOverride]);

  const workspaceTabs = mode === 'fixer'
    ? [
        { label: 'Find Jobs', screen: 'FindJobs', icon: 'map-search-outline' },
        { label: 'My Bids', screen: 'MyBids', icon: 'format-list-checks' },
        { label: 'Profile', screen: 'FixerProfile', icon: 'account-hard-hat-outline' },
      ]
    : [
        { label: 'Home', screen: 'Dashboard', icon: 'home-outline' },
        { label: 'My Tasks', screen: 'MyTasks', icon: 'clipboard-list-outline' },
        { label: 'Account', screen: 'Profile', icon: 'account-circle-outline' },
      ];

  return (
    <View
      style={[
        styles.desktopBar,
        {
          height: topInset + 64,
          paddingTop: topInset,
        },
      ]}
    >
      <View style={styles.desktopBarInner}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to FixIt home"
          onPress={openLanding}
          style={({ pressed }) => [styles.logoPressable, { opacity: pressed ? 0.78 : 1 }]}
        >
          <AppLogo compact />
        </Pressable>

        <View style={styles.desktopCenter}>
          <View style={styles.modeToggleWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to requester workspace"
              accessibilityState={{ selected: mode === 'requester' }}
              style={[styles.modeToggleBtn, mode === 'requester' && styles.modeToggleBtnActive]}
              onPress={() => handleModeChange('requester')}
            >
              <MaterialCommunityIcons
                name="home-outline"
                size={15}
                color={mode === 'requester' ? brandColors.textOnDark : brandColors.primaryMuted}
              />
              <Text
                style={[
                  styles.modeToggleLabel,
                  mode === 'requester' && styles.modeToggleLabelActive,
                ]}
              >
                Requester
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to fixer workspace"
              accessibilityState={{ selected: mode === 'fixer' }}
              style={[styles.modeToggleBtn, mode === 'fixer' && styles.modeToggleBtnActive]}
              onPress={() => handleModeChange('fixer')}
            >
              <MaterialCommunityIcons
                name="wrench-outline"
                size={15}
                color={mode === 'fixer' ? brandColors.textOnDark : brandColors.primaryMuted}
              />
              <Text
                style={[
                  styles.modeToggleLabel,
                  mode === 'fixer' && styles.modeToggleLabelActive,
                ]}
              >
                Fixer
              </Text>
            </Pressable>
          </View>

          <View style={styles.desktopPageTabs}>
            {workspaceTabs.map((item) => {
              const selected = activeScreen === item.screen;
              return (
                <Pressable
                  key={item.screen}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.label}`}
                  accessibilityState={{ selected }}
                  onPress={() => openWorkspaceScreen(item.screen)}
                  style={({ pressed }) => [
                    styles.desktopPageTab,
                    selected && styles.desktopPageTabActive,
                    pressed && styles.desktopActionPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as never}
                    size={16}
                    color={selected ? brandColors.primary : brandColors.textMuted}
                  />
                  <Text style={[styles.desktopPageTabText, selected && styles.desktopPageTabTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.desktopActions}>
          {mode === 'requester' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post a task"
              style={({ pressed }) => [styles.desktopPrimaryAction, pressed && styles.desktopActionPressed]}
              onPress={openCreateTask}
            >
              <MaterialCommunityIcons name="plus" size={17} color={brandColors.primaryDark} />
              <Text style={styles.desktopPrimaryActionText}>Post task</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              notificationCount > 0
                ? `Open notifications, ${notificationCount} unread`
                : 'Open notifications'
            }
            style={({ pressed }) => [styles.desktopIconBtn, pressed && styles.desktopActionPressed]}
            hitSlop={8}
            onPress={openNotifications}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color={brandColors.primary} />
            <NotifBadge count={notificationCount} />
          </Pressable>

          {mode === 'fixer' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              style={({ pressed }) => [styles.desktopIconBtn, pressed && styles.desktopActionPressed]}
              hitSlop={8}
              onPress={openSettings}
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color={brandColors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Mobile header (narrow screens / native) ──────────────────────────────────
function MobileHeader({ navigation, route }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset = insets.top + spacing.sm;
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
    navigation.navigate(mode === 'fixer' ? 'FixerMode' : 'RequesterMode', {
      screen: mode === 'fixer' ? 'FindJobs' : 'Dashboard',
    });
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

  return (
    <>
      <LinearGradient
        colors={['#050D18', '#0C1E33']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.topBar,
          {
            height: topInset + 56,
            paddingTop: topInset,
          },
        ]}
      >
        {/* hamburger — left */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          accessibilityState={{ expanded: menuOpen }}
          style={styles.iconBtn}
          onPress={() => setMenuOpen(true)}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="menu" size={24} color={brandColors.textOnDark} />
        </Pressable>

        {/* logo — absolutely centered */}
        <View style={styles.logoCenter} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to workspace home"
            onPress={openLanding}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
          >
            <AppLogo compact onDark />
          </Pressable>
        </View>

        {/* bell — right */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            notificationCount > 0
              ? `Open notifications, ${notificationCount} unread`
              : 'Open notifications'
          }
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
        onNotificationsPress={openNotifications}
        onSettingsPress={openSettings}
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
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (Platform.OS !== 'web' || width < DESKTOP_BREAKPOINT) {
      navigation.replace('Main');
    }
  }, [navigation, width]);

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

  if (Platform.OS !== 'web' || width < DESKTOP_BREAKPOINT) {
    return null;
  }

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
      initialRouteName={Platform.OS === 'web' ? 'Landing' : 'Main'}
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
    flexGrow: 0,
    flexShrink: 0,
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
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: brandColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.outlineLight,
    ...shadows.sm,
  },
  desktopBarInner: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  desktopCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  desktopActions: {
    minWidth: 168,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  desktopIconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.surfaceAlt,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  desktopActionPressed: {
    opacity: 0.82,
  },
  desktopPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: brandColors.secondary,
    borderWidth: 1,
    borderColor: brandColors.secondaryDark,
  },
  desktopPrimaryActionText: {
    color: brandColors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  // Mode toggle (desktop)
  modeToggleWrap: {
    flexDirection: 'row',
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: radii.pill,
    padding: 3,
    gap: 2,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  modeToggleBtnActive: {
    backgroundColor: brandColors.primary,
  },
  modeToggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    color: brandColors.textMuted,
  },
  modeToggleLabelActive: {
    color: brandColors.textOnDark,
  },
  desktopPageTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  desktopPageTab: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  desktopPageTabActive: {
    backgroundColor: brandColors.infoSoft,
    borderColor: brandColors.outlineLight,
  },
  desktopPageTabText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
    color: brandColors.textMuted,
  },
  desktopPageTabTextActive: {
    color: brandColors.primary,
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
