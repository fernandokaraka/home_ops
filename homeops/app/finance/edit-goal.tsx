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
import type { FinancialGoal } from "@/types";

export default function EditGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { financialGoals, updateFinancialGoal, deleteFinancialGoal, isLoading } = useFinanceStore();
  const { theme } = useTheme();

  const [goal, setGoal] = useState<FinancialGoal | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("trophy");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [loading, setLoading] = useState(true);

  const goalIcons = [
    { icon: "trophy", label: "Meta" },
    { icon: "home", label: "Casa" },
    { icon: "car", label: "Carro" },
    { icon: "airplane", label: "Viagem" },
    { icon: "school", label: "Educacao" },
    { icon: "medical", label: "Saude" },
    { icon: "gift", label: "Presente" },
    { icon: "flash", label: "Urgente" },
  ];

  const goalColors = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
  ];

  useEffect(() => {
    const found = financialGoals.find((g) => g.id === id);
    if (found) {
      setGoal(found);
      setName(found.name || "");
      setTargetAmount(found.target_amount?.toString() || "");
      setTargetDate(found.target_date || "");
      setCurrentAmount(found.current_amount?.toString() || "0");
      setDescription(found.description || "");
      setSelectedIcon(found.icon || "trophy");
      setSelectedColor(found.color || "#3B82F6");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [id, financialGoals]);

  const handleAddContribution = () => {
    if (!contributionAmount.trim()) {
      Alert.alert("Erro", "Digite o valor da contribuicao");
      return;
    }

    const contribution = parseFloat(contributionAmount.replace(",", "."));
    if (isNaN(contribution) || contribution <= 0) {
      Alert.alert("Erro", "Digite um valor valido");
      return;
    }

    const newCurrentAmount = parseFloat(currentAmount || "0") + contribution;
    setCurrentAmount(newCurrentAmount.toString());
    setContributionAmount("");
    Alert.alert("Sucesso", `R$ ${contribution.toFixed(2)} adicionado à meta`);
  };

  const handleMarkAsCompleted = () => {
    Alert.alert(
      "Concluir Meta",
      "Tem certeza que deseja marcar esta meta como concluida?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Concluir",
          onPress: async () => {
            if (!goal) return;

            const updates: Partial<FinancialGoal> = {
              status: "completed",
              completed_at: new Date().toISOString(),
              current_amount: goal.target_amount, // Set to target amount
            };

            const { error } = await updateFinancialGoal(goal.id, updates);
            if (error) {
              Alert.alert("Erro", error);
              return;
            }
            Alert.alert("Sucesso", "Meta concluida!");
            router.back();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir Meta",
      "Tem certeza que deseja excluir esta meta? Esta acao nao pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!goal) return;

            const { error } = await deleteFinancialGoal(goal.id);
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Digite um nome para a meta");
      return;
    }
    if (!targetAmount.trim()) {
      Alert.alert("Erro", "Digite o valor da meta");
      return;
    }
    if (!targetDate.trim()) {
      Alert.alert("Erro", "Digite a data alvo");
      return;
    }
    if (!goal) {
      Alert.alert("Erro", "Meta nao encontrada");
      return;
    }

    const goalData: Partial<FinancialGoal> = {
      name: name.trim(),
      description: description.trim() || null,
      target_amount: parseFloat(targetAmount.replace(",", ".")),
      current_amount: parseFloat(currentAmount.replace(",", ".")) || 0,
      target_date: targetDate,
      icon: selectedIcon,
      color: selectedColor,
    };

    const { error } = await updateFinancialGoal(goal.id, goalData);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Meta nao encontrada</Text>
        <Button onPress={() => router.back()} variant="outline">
          Voltar
        </Button>
      </SafeAreaView>
    );
  }

  const progressPercentage = (parseFloat(currentAmount || "0") / parseFloat(targetAmount || "1")) * 100;
  const isCompleted = goal.status === "completed";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.gray[700]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Editar Meta</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {isCompleted && (
            <View style={[styles.completedBanner, { backgroundColor: theme.success + "20", borderColor: theme.success }]}>
              <Ionicons name="checkmark-circle" size={24} color={theme.success} />
              <Text style={[styles.completedText, { color: theme.success }]}>Meta Concluida!</Text>
            </View>
          )}

          <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Progresso</Text>
              <Text style={[styles.progressPercentage, { color: selectedColor }]}>{progressPercentage.toFixed(1)}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.gray[200] }]}>
              <View style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%`, backgroundColor: selectedColor }]} />
            </View>
            <View style={styles.progressAmounts}>
              <Text style={[styles.progressAmount, { color: theme.text }]}>R$ {parseFloat(currentAmount || "0").toFixed(2)}</Text>
              <Text style={[styles.progressTarget, { color: theme.textSecondary }]}>de R$ {parseFloat(targetAmount || "0").toFixed(2)}</Text>
            </View>
          </View>

          <Input label="Nome da meta" placeholder="Ex: Fundo de emergencia, Viagem, Carro novo" value={name} onChangeText={setName} autoCapitalize="sentences" icon="trophy-outline" />
          <Input label="Valor da meta (R$)" placeholder="0,00" value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" icon="cash-outline" />
          <Input label="Data alvo" placeholder="AAAA-MM-DD" value={targetDate} onChangeText={setTargetDate} icon="calendar-outline" />
          <Input label="Valor atual (R$)" placeholder="0,00" value={currentAmount} onChangeText={setCurrentAmount} keyboardType="numeric" icon="wallet-outline" />

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Adicionar Contribuicao</Text>
            <View style={styles.contributionRow}>
              <View style={styles.contributionInput}>
                <Input placeholder="Valor (R$)" value={contributionAmount} onChangeText={setContributionAmount} keyboardType="numeric" icon="add-circle-outline" />
              </View>
              <Button onPress={handleAddContribution} variant="outline" size="md" style={styles.contributionButton}>
                Adicionar
              </Button>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Icone</Text>
            <View style={styles.iconsRow}>
              {goalIcons.map((item) => (
                <TouchableOpacity key={item.icon} onPress={() => setSelectedIcon(item.icon)} style={[styles.iconButton, { borderColor: theme.border, backgroundColor: theme.surface }, selectedIcon === item.icon && { borderColor: selectedColor, backgroundColor: selectedColor + "20" }]}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color={selectedIcon === item.icon ? selectedColor : theme.gray[400]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Cor</Text>
            <View style={styles.colorsRow}>
              {goalColors.map((color) => (
                <TouchableOpacity key={color} onPress={() => setSelectedColor(color)} style={[styles.colorButton, { backgroundColor: color }, selectedColor === color && styles.colorButtonSelected]}>
                  {selectedColor === color && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input label="Descricao (opcional)" placeholder="Detalhes sobre esta meta..." value={description} onChangeText={setDescription} multiline numberOfLines={2} autoCapitalize="sentences" />

          {!isCompleted && (
            <View style={styles.actionButton}>
              <Button onPress={handleMarkAsCompleted} variant="outline" fullWidth size="lg" style={[styles.completeButton, { borderColor: theme.success }]}>
                <Text style={[styles.completeButtonText, { color: theme.success }]}>Marcar como Concluida</Text>
              </Button>
            </View>
          )}

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} disabled={!name.trim() || !targetAmount.trim() || !targetDate.trim()} fullWidth size="lg">
              Salvar Alteracoes
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
  deleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  completedBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 16 },
  completedText: { marginLeft: 12, fontSize: 16, fontWeight: '600' },
  progressCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '500' },
  progressPercentage: { fontSize: 18, fontWeight: 'bold' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%' },
  progressAmounts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressAmount: { fontSize: 18, fontWeight: 'bold' },
  progressTarget: { fontSize: 14 },
  section: { marginBottom: 16 },
  sectionLabel: { fontWeight: '500', marginBottom: 8 },
  contributionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  contributionInput: { flex: 1 },
  contributionButton: { marginBottom: 16 },
  iconsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  iconButton: { marginRight: 8, marginBottom: 8, width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  colorButton: { marginRight: 8, marginBottom: 8, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  colorButtonSelected: { borderWidth: 3, borderColor: '#FFFFFF' },
  actionButton: { marginTop: 8, marginBottom: 16 },
  completeButton: { borderWidth: 2 },
  completeButtonText: { fontWeight: '600' },
  submitContainer: { marginTop: 8, marginBottom: 32 },
});
