import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PhoneVerificationScreen } from '../screens/PhoneVerificationScreen';
import { CreatePINScreen } from '../screens/CreatePINScreen';
import { ConfirmPINScreen } from '../screens/ConfirmPINScreen';
import { BiometricSetupScreen } from '../screens/BiometricSetupScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { PaymentConfirmScreen } from '../screens/PaymentConfirmScreen';
import { QRGeneratorScreen } from '../screens/QRGeneratorScreen';
import { TransactionHistoryScreen } from '../screens/TransactionHistoryScreen';
import { MerchantRegistrationScreen } from '../screens/MerchantRegistrationScreen';
import { MerchantDashboardScreen } from '../screens/MerchantDashboardScreen';
import { MerchantQRGeneratorScreen } from '../screens/MerchantQRGeneratorScreen';
import { PaymentQRData } from '../utils/qrCode';

type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  PhoneVerification: undefined;
  CreatePIN: undefined;
  ConfirmPIN: { pin: string };
  BiometricSetup: undefined;
  Login: undefined;
  MainTabs: undefined;
  Scan: undefined;
  PaymentConfirm: { paymentData: PaymentQRData };
  QRGenerator: undefined;
  TransactionHistory: undefined;
  MerchantRegistration: undefined;
  MerchantDashboard: undefined;
  MerchantQRGenerator: undefined;
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
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        headerTitle: 'CryptoPay',
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarLabel: 'Settings',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
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
        <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
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
        <Stack.Screen 
          name="TransactionHistory" 
          component={TransactionHistoryScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="MerchantRegistration" 
          component={MerchantRegistrationScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="MerchantDashboard" 
          component={MerchantDashboardScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="MerchantQRGenerator" 
          component={MerchantQRGeneratorScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
