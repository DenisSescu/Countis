import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ThemeProvider } from '../context/ThemeContext';
import { initDatabase } from '../db/database';
import { generateRecurringForCurrentMonth, getSetting, processMonthlyGoalContributions } from '../db/queries';
import { detectAndSaveRecurringTransactions } from '../db/recurringDetector';
import { initNotifications } from '../services/notifications';

function AppContent() {
  const router = useRouter();
  const [dbReady, setDbReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => {
        detectAndSaveRecurringTransactions();
        generateRecurringForCurrentMonth();
        processMonthlyGoalContributions();
        initNotifications();
        const done = getSetting('onboarding_done');
        if (done !== 'true') setShowOnboarding(true);
        setDbReady(true);
      })
      .catch((err) => console.error('DB init error:', err));
  }, []);

  useEffect(() => {
    if (dbReady && showOnboarding) {
      router.replace('/onboarding');
    }
  }, [dbReady, showOnboarding]);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Se încarcă...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="recurring" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="budgets" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}