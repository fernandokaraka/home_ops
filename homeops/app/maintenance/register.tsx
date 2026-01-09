import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Card } from "@/components/ui";
import { useMaintenanceStore } from "@/stores/maintenanceStore";
import { useTheme } from "@/contexts/ThemeContext";

export default function RegisterMaintenanceScreen() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { items, registerMaintenance, isLoading } = useMaintenanceStore();
  const { theme } = useTheme();

  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");

  const item = items.find((i) => i.id === itemId);

  useEffect(() => {
    if (item?.preferred_provider) setProvider(item.preferred_provider);
  }, [item]);

  const parseDate = (dateStr: string): string => {
    if (!dateStr || !dateStr.trim()) return new Date().toISOString().split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year && year.length === 4) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return new Date().toISOString().split("T")[0];
  };

  const handleSubmit = async () => {
    if (!itemId) { Alert.alert("Erro", "Item nao encontrado"); return; }
    const data = {
      item_id: itemId,
      maintenance_date: parseDate(maintenanceDate),
      description: description.trim() || null,
      cost: cost ? parseFloat(cost.replace(",", ".")) : null,
      provider: provider.trim() || null,
      notes: notes.trim() || null,
    };
    const { error } = await registerMaintenance(data);
    if (error) { Alert.alert("Erro", error); return; }
    Alert.alert("Sucesso", "Manutencao registrada com sucesso!", [{ text: "OK", onPress: () => router.back() }]);
  };

  const quickDates = [
    { label: "Hoje", getValue: () => new Date().toISOString().split("T")[0] },
    { label: "Ontem", getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; } },
    { label: "Semana passada", getValue: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; } },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.gray[700]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Registrar Manutencao</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {item && (
            <Card style={[styles.itemCard, { backgroundColor: theme.primaryLight }]}>
              <View style={styles.itemRow}>
                <View style={[styles.itemIcon, { backgroundColor: (item.category?.color || theme.primary) + "30" }]}>
                  <Ionicons name={(item.category?.icon || "construct-outline") as keyof typeof Ionicons.glyphMap} size={24} color={item.category?.color || theme.primary} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.primary }]}>{item.name}</Text>
                  {item.brand && <Text style={[styles.itemBrand, { color: theme.textSecondary }]}>{item.brand}</Text>}
                </View>
              </View>
            </Card>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Data da manutencao</Text>
            <View style={styles.quickDatesRow}>
              {quickDates.map((qd) => (
                <TouchableOpacity key={qd.label} onPress={() => setMaintenanceDate(qd.getValue())} style={[styles.quickDateButton, { backgroundColor: theme.gray[200] }, maintenanceDate === qd.getValue() && { backgroundColor: theme.primary }]}>
                  <Text style={[styles.quickDateText, { color: theme.gray[700] }, maintenanceDate === qd.getValue() && styles.quickDateTextSelected]}>{qd.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input placeholder="AAAA-MM-DD" value={maintenanceDate} onChangeText={setMaintenanceDate} icon="calendar-outline" />
          </View>

          <Input label="O que foi feito?" placeholder="Descreva o servico realizado..." value={description} onChangeText={setDescription} multiline numberOfLines={3} autoCapitalize="sentences" />
          <Input label="Custo (R$)" placeholder="0,00" value={cost} onChangeText={setCost} keyboardType="numeric" icon="cash-outline" />
          <Input label="Fornecedor/Tecnico" placeholder="Quem realizou o servico?" value={provider} onChangeText={setProvider} icon="person-outline" />
          <Input label="Observacoes (opcional)" placeholder="Anotacoes adicionais..." value={notes} onChangeText={setNotes} multiline numberOfLines={2} autoCapitalize="sentences" />

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} fullWidth size="lg">Registrar Manutencao</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  itemCard: { marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { marginLeft: 12 },
  itemName: { fontWeight: '600', fontSize: 18 },
  itemBrand: { fontSize: 14 },
  section: { marginBottom: 16 },
  sectionLabel: { fontWeight: '500', marginBottom: 8 },
  quickDatesRow: { flexDirection: 'row', marginBottom: 8 },
  quickDateButton: { marginRight: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  quickDateText: {},
  quickDateTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  submitContainer: { marginTop: 16, marginBottom: 32 },
});
