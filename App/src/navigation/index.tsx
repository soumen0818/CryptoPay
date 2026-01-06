import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { CreatePINScreen } from '../screens/CreatePINScreen';
import { ConfirmPINScreen } from '../screens/ConfirmPINScreen';
import { BiometricSetupScreen } from '../screens/BiometricSetupScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { PaymentConfirmScreen } from '../screens/PaymentConfirmScreen';
import { QRGeneratorScreen } from '../screens/QRGeneratorScreen';
import { PaymentQRData } from '../utils/qrCode';

type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  CreatePIN: undefined;
  ConfirmPIN: { pin: string };
  BiometricSetup: undefined;
  Login: undefined;
  MainTabs: undefined;
  Scan: undefined;
  PaymentConfirm: { paymentData: PaymentQRData };
  QRGenerator: undefined;
};

type MainTabsParamList = {
  Home: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: true,
      tabBarActiveTintColor: '#6366f1',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>🏠</span>,
        headerTitle: 'CryptoPay',
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarLabel: 'Settings',
        tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>⚙️</span>,
      }}
    />
  </Tab.Navigator>
);

export const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Splash"
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="CreatePIN" component={CreatePINScreen} />
        <Stack.Screen name="ConfirmPIN" component={ConfirmPINScreen} />
        <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen 
          name="PaymentConfirm" 
          component={PaymentConfirmScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="QRGenerator" 
          component={QRGeneratorScreen}
          options={{
            headerShown: true,
            headerTitle: 'QR Generator (Testing)',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
