import { useEffect } from "react";
import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function RootLayoutContent() {
  const { isLoading, isInitialized, initialize, session } = useAuthStore();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    initialize();
  }, []);

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task" options={{ presentation: "modal" }} />
        <Stack.Screen name="maintenance" options={{ presentation: "modal" }} />
        <Stack.Screen name="finance" options={{ presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="shopping" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}
