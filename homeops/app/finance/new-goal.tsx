import { useState } from "react";
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

export default function NewGoalScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const { createFinancialGoal, isLoading } = useFinanceStore();
  const { theme } = useTheme();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("trophy");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");

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

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert("Erro", "Digite um nome para a meta"); return; }
    if (!targetAmount.trim()) { Alert.alert("Erro", "Digite o valor da meta"); return; }
    if (!targetDate.trim()) { Alert.alert("Erro", "Digite a data alvo"); return; }
    if (!household?.id) { Alert.alert("Erro", "Household nao encontrado"); return; }

    const goalData = {
      household_id: household.id,
      name: name.trim(),
      description: description.trim() || null,
      target_amount: parseFloat(targetAmount.replace(",", ".")),
      current_amount: currentAmount.trim() ? parseFloat(currentAmount.replace(",", ".")) : 0,
      target_date: targetDate,
      status: "in_progress" as const,
      icon: selectedIcon,
      color: selectedColor,
      created_by: user?.id,
    };

    const { error } = await createFinancialGoal(goalData);
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Nova Meta Financeira</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Input label="Nome da meta" placeholder="Ex: Fundo de emergencia, Viagem, Carro novo" value={name} onChangeText={setName} autoCapitalize="sentences" icon="trophy-outline" />
          <Input label="Valor da meta (R$)" placeholder="0,00" value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" icon="cash-outline" />
          <Input label="Data alvo" placeholder="AAAA-MM-DD" value={targetDate} onChangeText={setTargetDate} icon="calendar-outline" />
          <Input label="Contribuicao inicial (R$)" placeholder="0,00 (opcional)" value={currentAmount} onChangeText={setCurrentAmount} keyboardType="numeric" icon="wallet-outline" />

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

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} disabled={!name.trim() || !targetAmount.trim() || !targetDate.trim()} fullWidth size="lg">Criar Meta</Button>
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
  iconsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  iconButton: { marginRight: 8, marginBottom: 8, width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  colorButton: { marginRight: 8, marginBottom: 8, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  colorButtonSelected: { borderWidth: 3, borderColor: '#FFFFFF' },
  submitContainer: { marginTop: 16, marginBottom: 32 },
});
