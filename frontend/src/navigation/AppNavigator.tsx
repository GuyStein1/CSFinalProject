import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BottomTabHeaderProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
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
import BecomeFixerScreen from '../screens/BecomeFixerScreen';
import ChatScreen from '../screens/ChatScreen';
import PastConversationsScreen from '../screens/PastConversationsScreen';
import AppLogo from '../components/AppLogo';
import HamburgerMenu from '../components/HamburgerMenu';
import { useNotificationContext, FIXER_NOTIF_TYPES, REQUESTER_NOTIF_TYPES } from '../context/NotificationContext';
import { useActiveMode } from '../context/ActiveModeContext';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useLanguage } from '../context/LanguageContext';
import { brandColors, headerTint, heroGradientRequester, heroGradientFixer, spacing, radii, shadows, typography } from '../theme';
import {
  type RootStackParamList,
} from './landingIntent';

type Mode = 'requester' | 'fixer';

const DESKTOP_BREAKPOINT = 900;

const Stack = createNativeStackNavigator<RootStackParamList>();
const ModeTabs = createBottomTabNavigator();
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
const getFixerOnboardingKey = () => `fixerOnboardingSeen_${auth.currentUser?.uid ?? 'anon'}`;

function DesktopHeader({ navigation, route }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : spacing.sm;
  const [navStateVersion, setNavStateVersion] = useState(0);
  const [activeScreenOverride, setActiveScreenOverride] = useState<string | null>(null);
  const [fixerActivated, setFixerActivated] = useState(true); // default true avoids flicker
  const mode: Mode = route.name === 'FixerMode' ? 'fixer' : 'requester';
  const otherMode: Mode = mode === 'fixer' ? 'requester' : 'fixer';
  const typeFilter = mode === 'fixer' ? FIXER_NOTIF_TYPES : REQUESTER_NOTIF_TYPES;
  const otherTypeFilter = mode === 'fixer' ? REQUESTER_NOTIF_TYPES : FIXER_NOTIF_TYPES;
  const { unreadCount } = useNotificationContext();
  const notificationCount = unreadCount(typeFilter, mode);
  const otherModeNotifCount = unreadCount(otherTypeFilter, otherMode);
  const { unreadCount: unreadMsgCount } = useUnreadMessages(mode);
  const { unreadCount: otherMsgCount } = useUnreadMessages(otherMode);
  const otherModeBadge = otherModeNotifCount + otherMsgCount;
  const { language, changeLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    return navigation.addListener('state', () => {
      setNavStateVersion((version) => version + 1);
    });
  }, [navigation]);

  useEffect(() => {
    setActiveScreenOverride(null);
  }, [route.name]);

  const checkFixerActivated = () => {
    AsyncStorage.getItem(getFixerOnboardingKey()).then((v) => setFixerActivated(v === 'true'));
  };

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    checkFixerActivated();
    return () => { isMountedRef.current = false; };
  }, []); // intentionally empty — run once on mount

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

  const openDashboard = () => {
    if (mode === 'fixer') {
      navigation.navigate('FixerMode', { screen: 'FindJobs' });
    } else {
      navigation.navigate('RequesterMode', { screen: 'Dashboard' });
    }
  };

  const openNotifications = () => {
    openStackScreen('NotificationCenter');
  };

  const openSettings = () => {
    openStackScreen('Settings');
  };

  const openFixerOnboarding = () => {
    openStackScreen('BecomeFixerOnboarding');
    // Re-check after returning (onboarding screen sets the flag)
    const unsubscribe = navigation.addListener('focus' as never, () => {
      checkFixerActivated();
      unsubscribe();
    });
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
        { label: t('nav.findJobs'), screen: 'FindJobs', icon: 'map-search-outline' },
        { label: t('nav.myBids'),   screen: 'MyBids',   icon: 'format-list-checks' },
        { label: t('nav.messages'), screen: 'Messages', icon: 'chat-outline' },
        { label: t('nav.profile'),  screen: 'FixerProfile', icon: 'account-hard-hat-outline' },
      ]
    : [
        { label: t('nav.home'),     screen: 'Dashboard', icon: 'home-outline' },
        { label: t('nav.myTasks'),  screen: 'MyTasks',   icon: 'clipboard-list-outline' },
        { label: t('nav.messages'), screen: 'Messages',  icon: 'chat-outline' },
      ];

  return (
    <View
      style={[
        styles.desktopBar,
        mode === 'fixer' ? styles.desktopBarFixer : styles.desktopBarRequester,
        {
          height: topInset + 64,
          paddingTop: topInset,
        },
      ]}
    >
      <View
        ref={(el: unknown) => { if (el && Platform.OS === 'web') { (el as HTMLElement).dir = 'ltr'; } }}
        style={styles.desktopBarInner}
      >
        <View style={styles.desktopLeft}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to FixIt home"
            onPress={openDashboard}
            style={({ pressed }) => [styles.logoPressable, { opacity: pressed ? 0.78 : 1 }]}
          >
            <AppLogo compact />
          </Pressable>

          {mode === 'fixer' ? (
            <View style={styles.modeLabel}>
              <MaterialCommunityIcons name="wrench-outline" size={13} color="#fff" />
              <Text style={styles.modeLabelText}>{t('nav.workspace.fixerBadge')}</Text>
            </View>
          ) : (
            <View style={[styles.modeLabel, styles.modeLabelRequester]}>
              <MaterialCommunityIcons name="home-outline" size={13} color="#fff" />
              <Text style={styles.modeLabelText}>{t('nav.workspace.requesterBadge')}</Text>
            </View>
          )}
        </View>

        <View style={styles.desktopPageTabs}>
          {workspaceTabs.map((item) => {
            const selected = activeScreen === item.screen;
            const showMsgBadge = item.screen === 'Messages' && unreadMsgCount > 0;
            return (
              <Pressable
                key={item.screen}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.label}`}
                accessibilityState={{ selected }}
                onPress={() => openWorkspaceScreen(item.screen)}
                style={({ pressed }) => [
                  styles.desktopPageTab,
                  selected && (mode === 'fixer' ? styles.desktopPageTabActiveFixer : styles.desktopPageTabActive),
                  pressed && styles.desktopActionPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as never}
                  size={16}
                  color={selected ? (mode === 'fixer' ? brandColors.secondaryDark : brandColors.primary) : brandColors.textMuted}
                />
                <Text style={[
                  styles.desktopPageTabText,
                  selected && (mode === 'fixer' ? styles.desktopPageTabTextActiveFixer : styles.desktopPageTabTextActive),
                ]}>
                  {item.label}
                </Text>
                {showMsgBadge && <NotifBadge count={unreadMsgCount} />}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.desktopActions}>
          {/* Shared: globe lang toggle, notifications, settings */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Switch to Hebrew' : 'Switch to English'}
            style={({ pressed }) => [
              styles.desktopIconBtn,
              mode === 'fixer' && styles.desktopIconBtnFixer,
              pressed && styles.desktopActionPressed,
            ]}
            onPress={() => void changeLanguage(language === 'en' ? 'he' : 'en')}
          >
            <MaterialCommunityIcons name="web" size={20} color={brandColors.textSecondary} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: brandColors.textSecondary, marginLeft: 2 }}>
              {language === 'en' ? 'EN' : 'עב'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notificationCount > 0 ? `Open notifications, ${notificationCount} unread` : 'Open notifications'}
            style={({ pressed }) => [
              styles.desktopIconBtn,
              mode === 'fixer' && styles.desktopIconBtnFixer,
              pressed && styles.desktopActionPressed,
            ]}
            hitSlop={8}
            onPress={openNotifications}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color={mode === 'fixer' ? brandColors.secondaryDark : brandColors.primary} />
            <NotifBadge count={notificationCount} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={({ pressed }) => [
              styles.desktopIconBtn,
              mode === 'fixer' && styles.desktopIconBtnFixer,
              pressed && styles.desktopActionPressed,
            ]}
            hitSlop={8}
            onPress={openSettings}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={mode === 'fixer' ? brandColors.secondaryDark : brandColors.primary} />
          </Pressable>

          {/* Workspace switcher */}
          {mode === 'requester' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fixerActivated ? t('nav.workspace.openFixer') : t('nav.workspace.becomeFixer')}
              style={({ pressed }) => [
                styles.desktopFixerWorkspaceBtn,
                !fixerActivated && styles.desktopBecomeFixerBtn,
                pressed && styles.desktopActionPressed,
              ]}
              hitSlop={8}
              onPress={openFixerOnboarding}
            >
              {isRTL && fixerActivated && <MaterialCommunityIcons name="chevron-left" size={13} color={brandColors.secondaryDark} />}
              <MaterialCommunityIcons name="wrench-outline" size={14} color={fixerActivated ? brandColors.secondaryDark : '#fff'} />
              <Text style={[styles.desktopFixerWorkspaceBtnText, !fixerActivated && styles.desktopBecomeFixerBtnText]}>
                {fixerActivated ? t('nav.workspace.openFixer') : t('nav.workspace.becomeFixer')}
              </Text>
              {!isRTL && fixerActivated && <MaterialCommunityIcons name="chevron-right" size={13} color={brandColors.secondaryDark} />}
              {otherModeBadge > 0 && (
                <View style={styles.inlineBadge}>
                  <Text style={styles.inlineBadgeText}>{otherModeBadge > 9 ? '9+' : otherModeBadge}</Text>
                </View>
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('nav.workspace.openRequester')}
              style={({ pressed }) => [styles.desktopBackHomeBtn, pressed && styles.desktopActionPressed]}
              hitSlop={8}
              onPress={() => handleModeChange('requester')}
            >
              <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={14} color={brandColors.primary} />
              <Text style={styles.desktopBackHomeBtnText}>{t('nav.workspace.openRequester')}</Text>
              {otherModeBadge > 0 && (
                <View style={styles.inlineBadge}>
                  <Text style={styles.inlineBadgeText}>{otherModeBadge > 9 ? '9+' : otherModeBadge}</Text>
                </View>
              )}
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
  const [fixerActivated, setFixerActivated] = useState(true);
  const mode: Mode = route.name === 'FixerMode' ? 'fixer' : 'requester';
  const otherMode: Mode = mode === 'fixer' ? 'requester' : 'fixer';
  const typeFilter = mode === 'fixer' ? FIXER_NOTIF_TYPES : REQUESTER_NOTIF_TYPES;
  const otherTypeFilter = mode === 'fixer' ? REQUESTER_NOTIF_TYPES : FIXER_NOTIF_TYPES;
  const { unreadCount } = useNotificationContext();
  const notificationCount = unreadCount(typeFilter, mode);
  const otherModeNotifCount = unreadCount(otherTypeFilter, otherMode);
  const { unreadCount: otherMsgCount } = useUnreadMessages(otherMode);
  const otherModeBadge = otherModeNotifCount + otherMsgCount;
  const { language, changeLanguage } = useLanguage();

  useEffect(() => {
    AsyncStorage.getItem(getFixerOnboardingKey()).then((v) => setFixerActivated(v === 'true'));
  }, []);

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

  const openHome = () => {
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

  const openFixerOnboarding = () => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.navigate('BecomeFixerOnboarding' as never);
    } else {
      navigation.navigate('BecomeFixerOnboarding' as never);
    }
    const unsubscribe = navigation.addListener('focus' as never, () => {
      AsyncStorage.getItem(getFixerOnboardingKey()).then((v) => setFixerActivated(v === 'true'));
      unsubscribe();
    });
  };

  const openFixerBids = () => {
    navigation.navigate('FixerMode', { screen: 'MyBids' });
  };

  const openFixerProfile = () => {
    navigation.navigate('FixerMode', { screen: 'FixerProfile' });
  };

  const headerGradient = mode === 'fixer' ? heroGradientFixer : heroGradientRequester;

  return (
    <>
      <LinearGradient
        colors={headerGradient.colors}
        locations={headerGradient.locations}
        start={headerGradient.start}
        end={headerGradient.end}
        style={[
          styles.topBar,
          mode === 'fixer' && styles.topBarFixer,
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
          <MaterialCommunityIcons name="menu" size={24} color={brandColors.primary} />
        </Pressable>

        {/* logo — absolutely centered */}
        <View style={styles.logoCenter} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to workspace home"
            onPress={openHome}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
          >
            <AppLogo compact />
          </Pressable>
        </View>

        {/* globe + bell — right */}
        <View style={styles.mobileRightActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Switch to Hebrew' : 'Switch to English'}
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => void changeLanguage(language === 'en' ? 'he' : 'en')}
          >
            <MaterialCommunityIcons name="web" size={22} color={brandColors.primary} />
            <View style={styles.globeLangBadge}>
              <Text style={styles.globeLangText}>{language === 'en' ? 'EN' : 'עב'}</Text>
            </View>
          </Pressable>
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
            <MaterialCommunityIcons name="bell-outline" size={22} color={brandColors.primary} />
            <NotifBadge count={notificationCount} />
          </Pressable>
        </View>
      </LinearGradient>

      <HamburgerMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentMode={mode}
        onModeChange={handleModeChange}
        onRequesterHomePress={openRequesterHome}
        onRequesterTasksPress={openRequesterTasks}
        onPostTaskPress={openCreateTask}
        fixerActivated={fixerActivated}
        onFixerWorkspacePress={openFixerOnboarding}
        onFixerHomePress={openFixerHome}
        onFixerBidsPress={openFixerBids}
        onFixerProfilePress={openFixerProfile}
        onNotificationsPress={openNotifications}
        onSettingsPress={openSettings}
        notificationCount={notificationCount}
        otherModeBadge={otherModeBadge}
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
  const { setActiveMode } = useActiveMode();

  return (
    <ModeTabs.Navigator
      initialRouteName="RequesterMode"
      screenOptions={{
        header: (props: BottomTabHeaderProps) => <MainHeader {...props} />,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
      screenListeners={{
        state: (e) => {
          const navState = e.data.state;
          const activeRoute = navState?.routes[navState.index ?? 0];
          setActiveMode(activeRoute?.name === 'FixerMode' ? 'fixer' : 'requester');
        },
      }}
    >
      <ModeTabs.Screen name="RequesterMode" component={RequesterTabs} options={{ title: 'Requester' }} />
      <ModeTabs.Screen name="FixerMode" component={FixerTabs} options={{ title: 'Fixer' }} />
    </ModeTabs.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  const { t } = useTranslation();

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
      <Stack.Screen name="Main" component={MainNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTask" component={CreateTask} options={{ title: t('nav.screenTitle.createTask') }} />
      <Stack.Screen name="TaskDetails" component={TaskDetails} options={{ title: t('nav.screenTitle.taskDetails') }} />
      <Stack.Screen name="TaskDetailsFixer" component={TaskDetailsFixer} options={{ title: t('nav.screenTitle.jobDetails') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.screenTitle.settings') }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ title: t('nav.screenTitle.profile') }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ title: t('nav.screenTitle.notifications') }} />
      <Stack.Screen name="BecomeFixerOnboarding" component={BecomeFixerScreen} options={{ title: 'Become a Fixer', headerShown: false }} />
      <Stack.Screen name="PastConversations" component={PastConversationsScreen} options={{ title: t('nav.screenTitle.pastConversations') }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.screenTitle.chat') }} />
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
    borderBottomWidth: 1,
    borderBottomColor: headerTint.requesterBorder,
  },
  topBarFixer: {
    borderBottomColor: headerTint.fixerBorder,
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
    backgroundColor: 'rgba(28,60,86,0.05)',
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  // Logo + workspace badge on the left; flex: 1 so it occupies an equal side to actions.
  desktopLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  desktopActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  desktopIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,60,86,0.05)',
  },
  desktopActionPressed: {
    opacity: 0.6,
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
  // "You are here" badge — next to logo, shared base style
  modeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.secondaryDark,
    borderWidth: 1,
    borderColor: brandColors.secondaryDark,
  },
  modeLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // Requester badge mirrors the fixer one but in the requester's navy/blue.
  modeLabelRequester: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
  // "Become a Fixer" CTA variant (first-time, filled amber)
  desktopBecomeFixerBtn: {
    backgroundColor: brandColors.secondaryDark,
    borderColor: brandColors.secondaryDark,
  },
  desktopBecomeFixerBtnText: {
    color: '#fff',
  },
  // Fixer workspace entry button (requester mode, right actions)
  desktopFixerWorkspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(241,181,69,0.16)',
  },
  desktopFixerWorkspaceBtnText: {
    color: brandColors.secondaryDark,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  // Back to requester button (fixer mode, right actions) — uses requester blue
  // so the colour signals where it leads.
  desktopBackHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: headerTint.requester,
    borderWidth: 1,
    borderColor: headerTint.requesterBorder,
  },
  desktopBackHomeBtnText: {
    color: brandColors.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  desktopPageTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  desktopPageTab: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  desktopPageTabActive: {
    borderBottomColor: brandColors.primary,
  },
  desktopPageTabText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: brandColors.textMuted,
  },
  desktopPageTabTextActive: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  // Per-mode header tints so the bar colour signals which workspace you're in.
  desktopBarRequester: {
    backgroundColor: headerTint.requester,
    borderBottomColor: headerTint.requesterBorder,
  },
  // Fixer-mode tab variants
  desktopBarFixer: {
    backgroundColor: headerTint.fixer,
    borderBottomColor: headerTint.fixerBorder,
  },
  desktopPageTabActiveFixer: {
    borderBottomColor: brandColors.secondaryDark,
  },
  desktopPageTabTextActiveFixer: {
    color: brandColors.secondaryDark,
    fontWeight: '700',
  },
  desktopIconBtnFixer: {
    backgroundColor: 'rgba(212,154,42,0.14)',
  },

  // Language switcher chips
  mobileRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  langSwitcher: {
    flexDirection: 'row',
    gap: 4,
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: brandColors.outline,
  },
  langChipActive: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
  langChipDark: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.30)',
  },
  langChipDarkActive: {
    backgroundColor: 'rgba(255,252,246,0.20)',
    borderColor: 'rgba(255,252,246,0.60)',
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: brandColors.textMuted,
  },
  langChipTextActive: {
    color: brandColors.white,
  },
  globeLangBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: brandColors.primary,
    borderRadius: 6,
    paddingHorizontal: 3,
    minWidth: 16,
    alignItems: 'center',
  },
  globeLangText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: brandColors.white,
    lineHeight: 12,
  },

  // Inline badge (for workspace switcher buttons)
  inlineBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: brandColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: spacing.xs,
  },
  inlineBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
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
