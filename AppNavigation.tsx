import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@hooks';

import MapScreen from './screens/MapScreen';
import IncidentFeedScreen from './screens/IncidentFeedScreen';
import IncidentDetailScreen from './screens/IncidentDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import ReportIncidentAdjustLocationScreen from './screens/ReportIncidentAdjustLocationScreen';
import ReportIncidentScreen from './screens/ReportIncidentScreen';
import ReportIncidentReviewScreen from './screens/ReportIncidentReviewScreen';
import ReportIncidentSubmittedScreen from './screens/ReportIncidentSubmittedScreen';
import RelayConnectScreen from './screens/RelayConnectScreen';
import WalletScreen from './screens/WalletScreen';
import { navigationRef } from './lib/navigation';
import type { MainTabParamList, RootStackParamList } from './lib/navigation';
import IncidentNotificationBridge from './components/notifications/IncidentNotificationBridge';
import { StatusBar } from 'expo-status-bar';
import { useReportDraft, useStartupNavigationInteraction } from '@contexts';
import { automationTestID } from '@lib/utils';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function renderTabIcon(
  focused: boolean,
  color: string,
  activeName: ComponentProps<typeof MaterialCommunityIcons>['name'],
  inactiveName: ComponentProps<typeof MaterialCommunityIcons>['name']
) {
  return <MaterialCommunityIcons name={focused ? activeName : inactiveName} size={22} color={color} />;
}

function ReportTriggerScreen() {
  return null;
}

function TabNavigator() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { startDraft } = useReportDraft();
  const { markStartupTabInteraction } = useStartupNavigationInteraction();
  const TAB_BAR_BASE_HEIGHT = 58;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;

  return (
    <Tab.Navigator
      initialRouteName="Map"
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarButtonTestID: automationTestID('tab-map'),
          tabBarIcon: ({ color, focused }) => renderTabIcon(focused, color, 'map', 'map-outline'),
        }}
        listeners={{
          tabPress: () => {
            markStartupTabInteraction('Map');
          },
        }}
      />
      <Tab.Screen
        name="Incidents"
        component={IncidentFeedScreen}
        options={{
          tabBarLabel: 'Incidents',
          tabBarButtonTestID: automationTestID('tab-incidents'),
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, color, 'format-list-bulleted', 'format-list-bulleted-type'),
        }}
        listeners={{
          tabPress: () => {
            markStartupTabInteraction('Incidents');
          },
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportTriggerScreen}
        options={{
          tabBarLabel: ({ color }) => <Text style={[styles.reportTabLabel, { color }]}>Report</Text>,
          tabBarButtonTestID: automationTestID('tab-report'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="map-marker-plus" size={22} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            markStartupTabInteraction('Report');

            const state = navigation.getState();
            const activeRouteName = state.routes[state.index]?.name;
            const sourceTab = activeRouteName === 'Map' || activeRouteName === 'Incidents' ? activeRouteName : undefined;

            if (!navigationRef.isReady()) {
              return;
            }

            const sessionKey = `report-${Date.now()}`;
            startDraft(sessionKey, {
              sourceTab,
            });
            navigationRef.navigate('ReportIncidentAdjustLocation', {
              origin: 'initial_required',
              sessionKey,
            });
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarButtonTestID: automationTestID('tab-profile'),
          tabBarIcon: ({ color, focused }) => renderTabIcon(focused, color, 'account', 'account-outline'),
        }}
        listeners={{
          tabPress: () => {
            markStartupTabInteraction('Profile');
          },
        }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigation() {
  const { isDark, colors } = useAppTheme();
  const { resetDraft } = useReportDraft();

  function renderCloseButton(onPress: () => void) {
    return (
      <Pressable
        onPress={onPress}
        style={{ paddingHorizontal: 16 }}
        hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
      >
        <Text style={{ fontSize: 22, color: colors.text }}>✕</Text>
      </Pressable>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <IncidentNotificationBridge />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen
          name="IncidentDetail"
          component={IncidentDetailScreen}
        />
        <Stack.Screen
          name="Wallet"
          component={WalletScreen}
          options={({ navigation }) => ({
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Wallet',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () => renderCloseButton(() => navigation.goBack()),
          })}
        />
        <Stack.Screen
          name="Relays"
          component={RelayConnectScreen}
          options={({ navigation }) => ({
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Relay Settings',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () => renderCloseButton(() => navigation.goBack()),
          })}
        />
        <Stack.Screen
          name="ReportIncident"
          component={ReportIncidentScreen}
          options={({ navigation }) => ({
            presentation: 'fullScreenModal',
            headerShown: true,
            headerTitle: 'Report incident',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () =>
              renderCloseButton(() => {
                resetDraft();
                navigation.popToTop();
              }),
          })}
        />
        <Stack.Screen
          name="ReportIncidentAdjustLocation"
          component={ReportIncidentAdjustLocationScreen}
          options={({ navigation }) => ({
            presentation: 'fullScreenModal',
            headerShown: true,
            headerTitle: 'Adjust on map',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () => renderCloseButton(() => navigation.goBack()),
          })}
        />
        <Stack.Screen
          name="ReportIncidentReview"
          component={ReportIncidentReviewScreen}
          options={({ navigation }) => ({
            presentation: 'fullScreenModal',
            headerShown: true,
            headerTitle: 'Review report',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () =>
              renderCloseButton(() => {
                resetDraft();
                navigation.popToTop();
              }),
          })}
        />
        <Stack.Screen
          name="ReportIncidentSubmitted"
          component={ReportIncidentSubmittedScreen}
          options={({ navigation }) => ({
            presentation: 'fullScreenModal',
            headerShown: true,
            headerTitle: 'Report sent',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () => renderCloseButton(() => navigation.popToTop()),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  reportTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
