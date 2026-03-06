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

export default function NewBudgetScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const { categories, fetchCategories, createBudget, isLoading } = useFinanceStore();
  const { theme } = useTheme();

  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FinanceCategory | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchCategories();
    // Set current month as default
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    setSelectedMonth(currentMonth);
  }, []);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Generate quick month options (current + next 5 months)
  const generateQuickMonths = () => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      months.push({ value: monthStr, label: monthName });
    }
    return months;
  };

  const quickMonths = generateQuickMonths();

  const handleSubmit = async () => {
    if (!amount.trim()) {
      Alert.alert("Erro", "Digite o valor do orcamento");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Erro", "Selecione uma categoria");
      return;
    }
    if (!selectedMonth) {
      Alert.alert("Erro", "Selecione o mes");
      return;
    }
    if (!household?.id) {
      Alert.alert("Erro", "Household nao encontrado");
      return;
    }

    const budgetData = {
      household_id: household.id,
      category_id: selectedCategory.id,
      month: `${selectedMonth}-01`,
      amount: parseFloat(amount.replace(",", ".")),
      notes: notes.trim() || null,
      created_by: user?.id,
    };

    const { error } = await createBudget(budgetData);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.gray[700]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Novo Orcamento</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Mes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
              {quickMonths.map((month) => (
                <TouchableOpacity key={month.value} onPress={() => setSelectedMonth(month.value)} style={[styles.monthButton, { borderColor: theme.border, backgroundColor: theme.surface }, selectedMonth === month.value && { borderColor: theme.primary, backgroundColor: theme.primary }]}>
                  <Text style={[styles.monthButtonText, { color: theme.gray[700] }, selectedMonth === month.value && styles.monthButtonTextSelected]}>{month.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Input label="Valor (R$)" placeholder="0,00" value={amount} onChangeText={setAmount} keyboardType="numeric" icon="cash-outline" />

          <Input label="Observacoes (opcional)" placeholder="Anotacoes sobre este orcamento..." value={notes} onChangeText={setNotes} multiline numberOfLines={2} autoCapitalize="sentences" />

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} disabled={!amount.trim() || !selectedCategory || !selectedMonth} fullWidth size="lg">Criar Orcamento</Button>
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
  monthButton: { marginRight: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 2, minWidth: 100, alignItems: 'center' },
  monthButtonText: { fontWeight: '500', fontSize: 14 },
  monthButtonTextSelected: { color: '#FFFFFF' },
  submitContainer: { marginTop: 16, marginBottom: 32 },
});
