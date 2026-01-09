import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui";
import { useTheme } from "@/contexts/ThemeContext";

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  iconColor?: string;
  danger?: boolean;
}

function SettingsItem({ icon, label, sublabel, onPress, iconColor, danger }: SettingsItemProps) {
  const { theme } = useTheme();
  const effectiveIconColor = iconColor || theme.primary;

  return (
    <TouchableOpacity onPress={onPress} style={[styles.settingsItem, { borderBottomColor: theme.surfaceVariant }]}>
      <View style={[styles.settingsItemIcon, { backgroundColor: effectiveIconColor + "20" }]}>
        <Ionicons name={icon} size={20} color={danger ? theme.danger : effectiveIconColor} />
      </View>
      <View style={styles.settingsItemContent}>
        <Text style={[styles.settingsItemLabel, { color: danger ? theme.danger : theme.text }]}>{label}</Text>
        {sublabel && <Text style={[styles.settingsItemSublabel, { color: theme.textSecondary }]}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, household, signOut } = useAuthStore();
  const { theme } = useTheme();

  const handleSignOut = () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.surfaceVariant }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Configuracoes</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Card>
            <View style={styles.profileRow}>
              <View style={[styles.profileAvatar, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.profileInitial, { color: theme.primary }]}>{user?.name?.charAt(0).toUpperCase() || "U"}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>{user?.name || "Usuario"}</Text>
                <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>RESIDENCIA</Text>
          <Card>
            <View style={styles.householdRow}>
              <View style={[styles.householdIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="home" size={24} color={theme.surface} />
              </View>
              <View style={styles.householdInfo}>
                <Text style={[styles.householdName, { color: theme.text }]}>{household?.name || "Minha Casa"}</Text>
                <Text style={[styles.householdCode, { color: theme.textSecondary }]}>Codigo: {household?.invite_code || "---"}</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CONFIGURACOES</Text>
          <Card>
            <SettingsItem icon="notifications-outline" label="Notificacoes" sublabel="Lembretes e alertas" iconColor={theme.primary} onPress={() => router.push("/settings/notifications")} />
            <SettingsItem icon="people-outline" label="Membros" sublabel="Gerenciar membros da casa" iconColor={theme.success} onPress={() => router.push("/settings/members")} />
            <SettingsItem icon="color-palette-outline" label="Aparencia" sublabel="Tema e cores" iconColor={theme.warning} onPress={() => router.push("/settings/appearance")} />
            <View style={styles.lastItem}>
              <SettingsItem icon="shield-checkmark-outline" label="Privacidade" sublabel="Dados e seguranca" iconColor="#8B5CF6" onPress={() => Alert.alert("Em breve", "Funcionalidade em desenvolvimento")} />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPORTE</Text>
          <Card>
            <SettingsItem icon="help-circle-outline" label="Ajuda" sublabel="Duvidas frequentes" iconColor={theme.primary} onPress={() => Alert.alert("Em breve", "Funcionalidade em desenvolvimento")} />
            <SettingsItem icon="chatbubble-outline" label="Feedback" sublabel="Envie sugestoes" iconColor={theme.success} onPress={() => Alert.alert("Em breve", "Funcionalidade em desenvolvimento")} />
            <View style={styles.lastItem}>
              <SettingsItem icon="information-circle-outline" label="Sobre" sublabel="Versao 1.0.0" iconColor={theme.textMuted} onPress={() => Alert.alert("HomeOps", "Versao 1.0.0\nGerenciamento domestico inteligente")} />
            </View>
          </Card>
        </View>

        <View style={styles.sectionLogout}>
          <Card>
            <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={20} color={theme.danger} />
              <Text style={[styles.logoutText, { color: theme.danger }]}>Sair da conta</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '500', marginBottom: 8, paddingHorizontal: 4 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { fontSize: 24, fontWeight: 'bold' },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600' },
  profileEmail: {},
  householdRow: { flexDirection: 'row', alignItems: 'center' },
  householdIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  householdInfo: { marginLeft: 16, flex: 1 },
  householdName: { fontWeight: '600' },
  householdCode: { fontSize: 14 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  settingsItemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  settingsItemContent: { flex: 1 },
  settingsItemLabel: { fontWeight: '500' },
  settingsItemSublabel: { fontSize: 14 },
  lastItem: { borderBottomWidth: 0 },
  sectionLogout: { paddingHorizontal: 16, marginTop: 24, marginBottom: 32 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  logoutText: { fontWeight: '600', marginLeft: 8 },
});
