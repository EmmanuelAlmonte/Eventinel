import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@hooks';

import MapScreen from './screens/MapScreen';
import IncidentFeedScreen from './screens/IncidentFeedScreen';
import IncidentDetailScreen from './screens/IncidentDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import RelayConnectScreen from './screens/RelayConnectScreen';
import WalletScreen from './screens/WalletScreen';
import { navigationRef } from './lib/navigation';
import IncidentNotificationBridge from './components/notifications/IncidentNotificationBridge';
import { StatusBar } from 'expo-status-bar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function renderTabIcon(
  focused: boolean,
  color: string,
  activeName: React.ComponentProps<typeof MaterialCommunityIcons>['name'],
  inactiveName: React.ComponentProps<typeof MaterialCommunityIcons>['name']
) {
  return <MaterialCommunityIcons name={focused ? activeName : inactiveName} size={22} color={color} />;
}

function TabNavigator() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_BASE_HEIGHT = 58;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;

  return (
    <Tab.Navigator
      initialRouteName="Map"
      screenOptions={{
        headerShown: false,
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
          tabBarIcon: ({ color, focused }) => renderTabIcon(focused, color, 'map', 'map-outline'),
        }}
      />
      <Tab.Screen
        name="Incidents"
        component={IncidentFeedScreen}
        options={{
          tabBarLabel: 'Incidents',
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, color, 'format-list-bulleted', 'format-list-bulleted-type'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => renderTabIcon(focused, color, 'account', 'account-outline'),
        }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigation() {
  const { isDark, colors } = useAppTheme();

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
            headerLeft: () => (
              <Pressable
                onPress={() => navigation.goBack()}
                style={{ paddingHorizontal: 16 }}
                hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 22, color: colors.text }}>✕</Text>
              </Pressable>
            ),
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
            headerLeft: () => (
              <Pressable
                onPress={() => navigation.goBack()}
                style={{ paddingHorizontal: 16 }}
                hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 22, color: colors.text }}>✕</Text>
              </Pressable>
            ),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
