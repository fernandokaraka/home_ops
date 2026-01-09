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

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const { theme, isDark } = useTheme();

  const passwordsMatch = password === confirmPassword;
  const isFormValid =
    name.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    passwordsMatch;

  const handleRegister = async () => {
    if (!isFormValid) return;
    await signUp(email, password, name, inviteCode.trim() || undefined);
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
            {/* Back Button */}
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
                <Text style={[styles.backText, { color: theme.text }]}>Voltar</Text>
              </TouchableOpacity>
            </Link>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Criar conta</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Preencha os dados abaixo para comecar
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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
                label="Nome"
                placeholder="Seu nome completo"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                icon="person-outline"
              />

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
                placeholder="Minimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                icon="lock-closed-outline"
              />

              <Input
                label="Confirmar senha"
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                icon="lock-closed-outline"
                error={
                  confirmPassword && !passwordsMatch
                    ? "As senhas nao coincidem"
                    : undefined
                }
              />

              {/* Invite Code Section */}
              <View style={[styles.inviteSection, { borderTopColor: theme.border }]}>
                <View style={styles.inviteHeader}>
                  <Ionicons name="people-outline" size={18} color={theme.textSecondary} />
                  <Text style={[styles.inviteTitle, { color: theme.textSecondary }]}>
                    Tem um codigo de convite?
                  </Text>
                </View>
                <Text style={[styles.inviteDescription, { color: theme.textMuted }]}>
                  Se alguem compartilhou um codigo com voce, insira abaixo para juntar-se a casa dela.
                </Text>
                <Input
                  placeholder="Ex: ABC123"
                  value={inviteCode}
                  onChangeText={(text) => setInviteCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  icon="ticket-outline"
                />
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  onPress={handleRegister}
                  loading={isLoading}
                  disabled={!isFormValid}
                  fullWidth
                  size="lg"
                >
                  Criar conta
                </Button>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>Ja tem uma conta? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={[styles.footerLink, { color: theme.primary }]}>Entrar</Text>
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
    paddingTop: 32,
    paddingBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 8,
  },
  form: {
    flex: 1,
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
  buttonContainer: {
    marginTop: 8,
  },
  inviteSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  inviteDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
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
