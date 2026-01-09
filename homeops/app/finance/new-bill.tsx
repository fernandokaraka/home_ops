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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { useFinanceStore } from "@/stores/financeStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { FinanceCategory } from "@/types";

export default function NewBillScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const { categories, fetchCategories, createBill, isLoading } = useFinanceStore();
  const { theme } = useTheme();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FinanceCategory | null>(null);
  const [dueDay, setDueDay] = useState("");
  const [autoDebit, setAutoDebit] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => { fetchCategories(); }, []);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const quickDays = [5, 10, 15, 20, 25];

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert("Erro", "Digite um nome para a conta"); return; }
    if (!amount.trim()) { Alert.alert("Erro", "Digite o valor da conta"); return; }
    if (!household?.id) { Alert.alert("Erro", "Household nao encontrado"); return; }

    const billData = {
      household_id: household.id,
      name: name.trim(),
      amount: parseFloat(amount.replace(",", ".")),
      category_id: selectedCategory?.id || null,
      is_recurring: true,
      due_day: dueDay ? parseInt(dueDay) : null,
      auto_debit: autoDebit,
      current_month_status: "pending" as const,
      alert_days_before: 3,
      notes: notes.trim() || null,
      created_by: user?.id,
    };

    const { error } = await createBill(billData);
    if (error) { Alert.alert("Erro", error); return; }
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.gray[700]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Nova Conta Fixa</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Input label="Nome da conta" placeholder="Ex: Aluguel, Internet, Luz" value={name} onChangeText={setName} autoCapitalize="sentences" icon="receipt-outline" />
          <Input label="Valor (R$)" placeholder="0,00" value={amount} onChangeText={setAmount} keyboardType="numeric" icon="cash-outline" />

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
              {expenseCategories.map((cat) => (
                <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat)} style={[styles.categoryButton, { borderColor: theme.border, backgroundColor: theme.surface }, selectedCategory?.id === cat.id && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}>
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={18} color={selectedCategory?.id === cat.id ? theme.primary : cat.color} />
                  <Text style={[styles.categoryButtonText, { color: theme.gray[700] }, selectedCategory?.id === cat.id && { color: theme.primary }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Dia do vencimento</Text>
            <View style={styles.daysRow}>
              {quickDays.map((day) => (
                <TouchableOpacity key={day} onPress={() => setDueDay(day.toString())} style={[styles.dayButton, { backgroundColor: theme.border }, dueDay === day.toString() && { backgroundColor: theme.primary }]}>
                  <Text style={[styles.dayButtonText, { color: theme.gray[700] }, dueDay === day.toString() && styles.dayButtonTextSelected]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input placeholder="Dia (1-31)" value={dueDay} onChangeText={setDueDay} keyboardType="numeric" icon="calendar-outline" />
          </View>

          <TouchableOpacity onPress={() => setAutoDebit(!autoDebit)} style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.toggleLeft}>
              <Ionicons name="repeat" size={20} color={autoDebit ? theme.primary : theme.gray[400]} />
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleLabel, { color: theme.gray[700] }, autoDebit && { color: theme.primary }]}>Debito automatico</Text>
                <Text style={[styles.toggleSublabel, { color: theme.textSecondary }]}>Conta paga automaticamente</Text>
              </View>
            </View>
            <View style={[styles.toggle, { backgroundColor: theme.gray[300] }, autoDebit && { backgroundColor: theme.primary }]}>
              <View style={[styles.toggleThumb, autoDebit && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>

          <Input label="Observacoes (opcional)" placeholder="Anotacoes sobre esta conta..." value={notes} onChangeText={setNotes} multiline numberOfLines={2} autoCapitalize="sentences" />

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} disabled={!name.trim() || !amount.trim()} fullWidth size="lg">Cadastrar Conta</Button>
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
  section: { marginBottom: 16 },
  sectionLabel: { fontWeight: '500', marginBottom: 8 },
  horizontalScroll: { marginHorizontal: -16 },
  horizontalScrollContent: { paddingHorizontal: 16 },
  categoryButton: { marginRight: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  categoryButtonText: { marginLeft: 8, fontWeight: '500' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  dayButton: { marginRight: 8, marginBottom: 8, width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayButtonText: { fontWeight: 'bold' },
  dayButtonTextSelected: { color: '#FFFFFF', fontWeight: '500' as const },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleTextContainer: { marginLeft: 12 },
  toggleLabel: { fontWeight: '500' },
  toggleSublabel: { fontSize: 14 },
  toggle: { width: 48, height: 28, borderRadius: 14, padding: 4 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  submitContainer: { marginTop: 16, marginBottom: 32 },
});
