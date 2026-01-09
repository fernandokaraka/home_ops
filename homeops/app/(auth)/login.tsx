import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const { theme, isDark } = useTheme();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    await signIn(email, password);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
                <Ionicons name="home" size={40} color={theme.surface} />
              </View>
              <Text style={[styles.appName, { color: theme.text }]}>HomeOps</Text>
              <Text style={[styles.tagline, { color: theme.textSecondary }]}>
                Gerencie sua casa com facilidade
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Text style={[styles.title, { color: theme.text }]}>Entrar</Text>

              {error && (
                <View style={[styles.errorContainer, isDark && { backgroundColor: '#3D1C1C', borderColor: '#7F1D1D' }]}>
                  <Ionicons name="alert-circle" size={20} color={isDark ? '#FCA5A5' : '#EF4444'} />
                  <Text style={[styles.errorText, isDark && { color: '#FCA5A5' }]}>{error}</Text>
                  <TouchableOpacity onPress={clearError}>
                    <Ionicons name="close" size={20} color={isDark ? '#FCA5A5' : '#EF4444'} />
                  </TouchableOpacity>
                </View>
              )}

              <Input
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                icon="mail-outline"
              />

              <Input
                label="Senha"
                placeholder="Sua senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                icon="lock-closed-outline"
              />

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>
                  Esqueceu a senha?
                </Text>
              </TouchableOpacity>

              <Button
                onPress={handleLogin}
                loading={isLoading}
                disabled={!email.trim() || !password.trim()}
                fullWidth
                size="lg"
              >
                Entrar
              </Button>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>Ainda nao tem conta? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={[styles.footerLink, { color: theme.primary }]}>Criar conta</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  tagline: {
    marginTop: 8,
  },
  form: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
  },
  footerLink: {
    fontWeight: '600',
  },
});
