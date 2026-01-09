import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, Linking, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { Card, Button } from "@/components/ui";
import { useTheme } from "@/contexts/ThemeContext";
import { requestNotificationPermissions, getNotificationPreferences, saveNotificationPreferences, sendTestNotification, type NotificationPreferences } from "@/services/notificationService";

interface ToggleItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: () => void;
  iconColor?: string;
  disabled?: boolean;
}

function ToggleItem({ icon, label, sublabel, value, onToggle, iconColor, disabled }: ToggleItemProps) {
  const { theme } = useTheme();
  const effectiveIconColor = iconColor || theme.primary;

  return (
    <TouchableOpacity onPress={disabled ? undefined : onToggle} disabled={disabled} style={[styles.toggleItem, { borderBottomColor: theme.surfaceVariant }, disabled && styles.toggleItemDisabled]}>
      <View style={[styles.toggleIcon, { backgroundColor: effectiveIconColor + "20" }]}>
        <Ionicons name={icon} size={20} color={effectiveIconColor} />
      </View>
      <View style={styles.toggleContent}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
        {sublabel && <Text style={[styles.toggleSublabel, { color: theme.textSecondary }]}>{sublabel}</Text>}
      </View>
      <View style={[styles.toggle, { backgroundColor: theme.border }, value && { backgroundColor: theme.primary }]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

interface SelectItemProps {
  label: string;
  value: string | number;
  options: { label: string; value: string | number }[];
  onSelect: (value: string | number) => void;
  disabled?: boolean;
}

function SelectItem({ label, value, options, onSelect, disabled }: SelectItemProps) {
  const [showOptions, setShowOptions] = useState(false);
  const { theme } = useTheme();
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View style={[styles.selectItem, { borderBottomColor: theme.surfaceVariant }]}>
      <TouchableOpacity onPress={() => !disabled && setShowOptions(!showOptions)} disabled={disabled} style={[styles.selectTrigger, disabled && styles.selectTriggerDisabled]}>
        <Text style={[styles.selectLabel, { color: theme.text }]}>{label}</Text>
        <View style={styles.selectValueRow}>
          <Text style={[styles.selectValue, { color: theme.primary }]}>{selectedOption?.label || value}</Text>
          <Ionicons name={showOptions ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
        </View>
      </TouchableOpacity>
      {showOptions && (
        <View style={[styles.selectOptions, { backgroundColor: theme.surfaceVariant }]}>
          {options.map((option) => (
            <TouchableOpacity key={option.value} onPress={() => { onSelect(option.value); setShowOptions(false); }} style={[styles.selectOption, option.value === value && { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.selectOptionText, { color: theme.text }, option.value === value && { color: theme.primary, fontWeight: '500' }]}>{option.label}</Text>
              {option.value === value && <Ionicons name="checkmark" size={18} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === "granted");
    const prefs = await getNotificationPreferences();
    setPreferences(prefs);
    setLoading(false);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
    if (!granted) {
      Alert.alert("Permissao negada", "Para receber notificacoes, habilite nas configuracoes do dispositivo.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Abrir Configuracoes", onPress: () => { Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings(); } },
      ]);
    }
  };

  const updatePreference = async <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    if (!preferences) return;
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    await saveNotificationPreferences({ [key]: value });
  };

  const handleTestNotification = async () => {
    if (!permissionGranted) { Alert.alert("Permissao necessaria", "Habilite as notificacoes primeiro."); return; }
    await sendTestNotification();
    Alert.alert("Sucesso", "Notificacao de teste enviada!");
  };

  const timeOptions = [
    { label: "06:00", value: "06:00" }, { label: "07:00", value: "07:00" }, { label: "08:00", value: "08:00" },
    { label: "09:00", value: "09:00" }, { label: "10:00", value: "10:00" }, { label: "12:00", value: "12:00" },
    { label: "18:00", value: "18:00" }, { label: "20:00", value: "20:00" },
  ];
  const billDaysOptions = [{ label: "1 dia antes", value: 1 }, { label: "2 dias antes", value: 2 }, { label: "3 dias antes", value: 3 }, { label: "5 dias antes", value: 5 }, { label: "7 dias antes", value: 7 }];
  const maintenanceDaysOptions = [{ label: "3 dias antes", value: 3 }, { label: "5 dias antes", value: 5 }, { label: "7 dias antes", value: 7 }, { label: "14 dias antes", value: 14 }, { label: "30 dias antes", value: 30 }];

  if (loading || !preferences) {
    return <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}><Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando...</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.surfaceVariant }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notificacoes</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!permissionGranted && (
          <View style={styles.section}>
            <Card style={[styles.warningCard, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '30' }]}>
              <View style={styles.warningRow}>
                <Ionicons name="warning" size={24} color={theme.warning} />
                <View style={styles.warningContent}>
                  <Text style={[styles.warningTitle, { color: theme.warning }]}>Permissao necessaria</Text>
                  <Text style={[styles.warningText, { color: theme.warning }]}>Habilite as notificacoes para receber lembretes de tarefas, contas e manutencoes.</Text>
                  <TouchableOpacity onPress={handleRequestPermission} style={[styles.warningButton, { backgroundColor: theme.warning }]}>
                    <Text style={styles.warningButtonText}>Habilitar Notificacoes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>GERAL</Text>
          <Card>
            <ToggleItem icon="notifications" label="Notificacoes" sublabel="Ativar todas as notificacoes" value={preferences.enabled} onToggle={() => updatePreference("enabled", !preferences.enabled)} iconColor={theme.primary} disabled={!permissionGranted} />
            <View style={styles.lastItem}>
              <SelectItem label="Horario dos lembretes" value={preferences.reminderTime} options={timeOptions} onSelect={(v) => updatePreference("reminderTime", v as string)} disabled={!preferences.enabled || !permissionGranted} />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CATEGORIAS</Text>
          <Card>
            <ToggleItem icon="checkbox-outline" label="Tarefas" sublabel="Lembretes de tarefas pendentes" value={preferences.taskReminders} onToggle={() => updatePreference("taskReminders", !preferences.taskReminders)} iconColor={theme.primary} disabled={!preferences.enabled || !permissionGranted} />
            <ToggleItem icon="wallet-outline" label="Contas a pagar" sublabel="Alertas de vencimento" value={preferences.billReminders} onToggle={() => updatePreference("billReminders", !preferences.billReminders)} iconColor={theme.danger} disabled={!preferences.enabled || !permissionGranted} />
            <View style={styles.lastItem}>
              <ToggleItem icon="construct-outline" label="Manutencoes" sublabel="Lembretes de manutencao" value={preferences.maintenanceReminders} onToggle={() => updatePreference("maintenanceReminders", !preferences.maintenanceReminders)} iconColor={theme.warning} disabled={!preferences.enabled || !permissionGranted} />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ANTECEDENCIA</Text>
          <Card>
            <SelectItem label="Contas a pagar" value={preferences.billReminderDaysBefore} options={billDaysOptions} onSelect={(v) => updatePreference("billReminderDaysBefore", v as number)} disabled={!preferences.enabled || !preferences.billReminders || !permissionGranted} />
            <View style={styles.lastItem}>
              <SelectItem label="Manutencoes" value={preferences.maintenanceReminderDaysBefore} options={maintenanceDaysOptions} onSelect={(v) => updatePreference("maintenanceReminderDaysBefore", v as number)} disabled={!preferences.enabled || !preferences.maintenanceReminders || !permissionGranted} />
            </View>
          </Card>
        </View>

        <View style={styles.testSection}>
          <Button onPress={handleTestNotification} variant="outline" fullWidth disabled={!permissionGranted}>Enviar notificacao de teste</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: {},
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '500', marginBottom: 8, paddingHorizontal: 4 },
  warningCard: { borderWidth: 1 },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start' },
  warningContent: { flex: 1, marginLeft: 12 },
  warningTitle: { fontWeight: '600' },
  warningText: { fontSize: 14, marginTop: 4 },
  warningButton: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginTop: 12, alignSelf: 'flex-start' },
  warningButtonText: { color: '#FFFFFF', fontWeight: '500' },
  toggleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  toggleItemDisabled: { opacity: 0.5 },
  toggleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  toggleContent: { flex: 1 },
  toggleLabel: { fontWeight: '500' },
  toggleSublabel: { fontSize: 14 },
  toggle: { width: 48, height: 28, borderRadius: 14, padding: 4 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  selectItem: { paddingVertical: 16, borderBottomWidth: 1 },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectTriggerDisabled: { opacity: 0.5 },
  selectLabel: { fontWeight: '500' },
  selectValueRow: { flexDirection: 'row', alignItems: 'center' },
  selectValue: { marginRight: 8 },
  selectOptions: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  selectOption: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectOptionText: {},
  lastItem: { borderBottomWidth: 0 },
  testSection: { paddingHorizontal: 16, marginTop: 24, marginBottom: 32 },
});
