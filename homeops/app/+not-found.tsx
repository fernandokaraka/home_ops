import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

export default function NotFoundScreen() {
  const { theme } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Pagina nao encontrada</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          A pagina que voce esta procurando nao existe
        </Text>
        <Link href="/" asChild>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]}>
            <Ionicons name="home" size={20} color={theme.surface} />
            <Text style={[styles.buttonText, { color: theme.surface }]}>Voltar ao inicio</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
    marginLeft: 8,
  },
});
