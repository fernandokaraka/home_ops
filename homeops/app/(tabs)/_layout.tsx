import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/shared";
import { ComponentType } from "react";

// Higher-order component to wrap individual screens with ErrorBoundary
// Can be used in screen files to isolate errors per screen
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default function TabsLayout() {
  const { session } = useAuthStore();
  const { theme } = useTheme();

  // Redirect to login if not authenticated
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Wrap tabs with ErrorBoundary to catch navigation-level errors
  // Note: For screen-level error isolation, each screen file should use withErrorBoundary HOC
  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 24 : 12,
            height: Platform.OS === "ios" ? 88 : 68,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: "Tarefas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkbox-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: "Estoque",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="maintenance"
          options={{
            title: "Manutencao",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="build-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="finances"
          options={{
            title: "Financas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
