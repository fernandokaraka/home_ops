import { Stack } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

export default function FinanceLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: theme.background },
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
      }}
    >
      <Stack.Screen name="new-bill" />
      <Stack.Screen name="new-transaction" />
      <Stack.Screen name="edit-bill" />
      <Stack.Screen name="edit-transaction" />
    </Stack>
  );
}
