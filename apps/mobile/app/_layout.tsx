import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useDb } from '../src/hooks/useDb';
import { AnimatedSplash } from '../src/components/AnimatedSplash';

export default function RootLayout() {
  useDb();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" />
        <AnimatedSplash onFinish={() => setSplashDone(true)} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="lock" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="stock/index" options={{ title: 'Buy Stock', headerShown: true }} />
        <Stack.Screen name="give/index" options={{ title: 'Give Cards', headerShown: true }} />
        <Stack.Screen name="payment/index" options={{ title: 'Receive Payment', headerShown: true }} />
        <Stack.Screen name="sellers/index" options={{ title: 'Sellers', headerShown: true }} />
        <Stack.Screen name="sellers/[id]" options={{ title: 'Seller Detail', headerShown: true }} />
        <Stack.Screen name="wallets/index" options={{ title: 'Wallets', headerShown: true }} />
        <Stack.Screen name="expenses/index" options={{ title: 'Expenses', headerShown: true }} />
        <Stack.Screen name="bonus/index" options={{ title: 'Bonus', headerShown: true }} />
        <Stack.Screen name="history/index" options={{ title: 'History', headerShown: true }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings', headerShown: true }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
