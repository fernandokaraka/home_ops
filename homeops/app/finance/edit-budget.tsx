import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { useFinanceStore } from "@/stores/financeStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { FinanceCategory, Budget } from "@/types";

export default function EditBudgetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { budgets, categories, fetchCategories, updateBudget, deleteBudget, isLoading } = useFinanceStore();
  const { theme } = useTheme();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FinanceCategory | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const found = budgets.find((b) => b.id === id);
    if (found) {
      setBudget(found);
      setAmount(found.amount?.toString() || "");
      setSelectedCategory(found.category || null);
      setNotes(found.notes || "");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [id, budgets]);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const handleSubmit = async () => {
    if (!amount.trim()) {
      Alert.alert("Erro", "Digite o valor do orcamento");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Erro", "Selecione uma categoria");
      return;
    }
    if (!budget) {
      Alert.alert("Erro", "Orcamento nao encontrado");
      return;
    }

    const budgetData: Partial<Budget> = {
      amount: parseFloat(amount.replace(",", ".")),
      category_id: selectedCategory.id,
      notes: notes.trim() || null,
    };

    const { error } = await updateBudget(budget.id, budgetData);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir Orcamento",
      "Tem certeza que deseja excluir este orcamento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!budget) return;
            const { error } = await deleteBudget(budget.id);
            if (error) {
              Alert.alert("Erro", error);
              return;
            }
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!budget) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Orcamento nao encontrado</Text>
        <Button onPress={() => router.back()} variant="outline">
          Voltar
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.gray[700]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Editar Orcamento</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

          <Input label="Observacoes (opcional)" placeholder="Anotacoes sobre este orcamento..." value={notes} onChangeText={setNotes} multiline numberOfLines={2} autoCapitalize="sentences" />

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} disabled={!amount.trim() || !selectedCategory} fullWidth size="lg">Salvar Alteracoes</Button>
          </View>

          <View style={styles.deleteContainer}>
            <Button onPress={handleDelete} variant="outline" fullWidth size="lg" style={[styles.deleteButton, { borderColor: theme.danger }]}>
              <Text style={[styles.deleteButtonText, { color: theme.danger }]}>Excluir Orcamento</Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { fontSize: 16, marginBottom: 16 },
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
  submitContainer: { marginTop: 16, marginBottom: 16 },
  deleteContainer: { marginBottom: 32 },
  deleteButton: { borderWidth: 2 },
  deleteButtonText: { fontWeight: '600' },
});
