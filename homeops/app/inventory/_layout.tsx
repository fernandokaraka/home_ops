import { Stack } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

export default function InventoryLayout() {
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
      <Stack.Screen name="new" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
