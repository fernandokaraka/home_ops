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
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { AttachmentPicker, type AttachmentFile } from "@/components/shared/AttachmentPicker";
import { useFinanceStore } from "@/stores/financeStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { FinanceCategory } from "@/types";

export default function NewTransactionScreen() {
  const router = useRouter();
  const { type: initialType } = useLocalSearchParams<{ type?: string }>();
  const { user, household } = useAuthStore();
  const { categories, fetchCategories, createTransaction, addAttachment, isLoading } = useFinanceStore();
  const { theme } = useTheme();

  const [type, setType] = useState<"expense" | "income">(initialType === "income" ? "income" : "expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FinanceCategory | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  useEffect(() => { fetchCategories(); }, []);

  const filteredCategories = categories.filter((c) => c.type === type);

  const quickDates = [
    { label: "Hoje", getValue: () => new Date().toISOString().split("T")[0] },
    { label: "Ontem", getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; } },
  ];

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

  const handleAttachmentAdded = (file: AttachmentFile) => {
    setAttachments((prev) => [...prev, file]);
  };

  const handleAttachmentDelete = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) { Alert.alert("Erro", "Digite uma descricao"); return; }
    if (!amount.trim()) { Alert.alert("Erro", "Digite o valor"); return; }
    if (!household?.id) { Alert.alert("Erro", "Household nao encontrado"); return; }

    const transactionData = {
      household_id: household.id,
      description: description.trim(),
      amount: parseFloat(amount.replace(",", ".")),
      type,
      category_id: selectedCategory?.id || null,
      date: parseDate(date),
      notes: notes.trim() || null,
      created_by: user?.id,
    };

    const { error, data } = await createTransaction(transactionData);
    if (error) { Alert.alert("Erro", error); return; }

    // Upload attachments if any
    if (data && attachments.length > 0) {
      for (const file of attachments) {
        await addAttachment(data.id, household.id, file, user?.id);
      }
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>{type === "expense" ? "Nova Despesa" : "Nova Receita"}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.typeToggle, { backgroundColor: theme.surfaceVariant }]}>
            <TouchableOpacity onPress={() => { setType("expense"); setSelectedCategory(null); }} style={[styles.typeButton, type === "expense" && [styles.typeButtonActive, { backgroundColor: theme.surface }]]}>
              <Ionicons name="arrow-down-circle" size={20} color={type === "expense" ? theme.danger : theme.gray[400]} />
              <Text style={[styles.typeButtonText, { color: theme.textSecondary }, type === "expense" && { color: theme.danger }]}>Despesa</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setType("income"); setSelectedCategory(null); }} style={[styles.typeButton, type === "income" && [styles.typeButtonActive, { backgroundColor: theme.surface }]]}>
              <Ionicons name="arrow-up-circle" size={20} color={type === "income" ? theme.success : theme.gray[400]} />
              <Text style={[styles.typeButtonText, { color: theme.textSecondary }, type === "income" && { color: theme.success }]}>Receita</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.amountBox, { backgroundColor: theme.surface }]}>
            <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Valor</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currencyText, { color: theme.textMuted }]}>R$</Text>
              <View style={styles.amountInputWrapper}>
                <Input placeholder="0,00" value={amount} onChangeText={setAmount} keyboardType="numeric" />
              </View>
            </View>
          </View>

          <Input label="Descricao" placeholder={type === "expense" ? "O que voce comprou?" : "De onde veio?"} value={description} onChangeText={setDescription} autoCapitalize="sentences" />

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Categoria</Text>
            <View style={styles.categoriesRow}>
              {filteredCategories.map((cat) => (
                <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat)} style={[styles.categoryButton, { borderColor: theme.border, backgroundColor: theme.surface }, selectedCategory?.id === cat.id && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}>
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={16} color={selectedCategory?.id === cat.id ? theme.primary : cat.color} />
                  <Text style={[styles.categoryButtonText, { color: theme.gray[700] }, selectedCategory?.id === cat.id && { color: theme.primary }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Data</Text>
            <View style={styles.quickDatesRow}>
              {quickDates.map((qd) => (
                <TouchableOpacity key={qd.label} onPress={() => setDate(qd.getValue())} style={[styles.quickDateButton, { backgroundColor: theme.border }, date === qd.getValue() && { backgroundColor: theme.primary }]}>
                  <Text style={[styles.quickDateText, { color: theme.gray[700] }, date === qd.getValue() && styles.quickDateTextSelected]}>{qd.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input placeholder="AAAA-MM-DD" value={date} onChangeText={setDate} icon="calendar-outline" />
          </View>

          <Input label="Observacoes (opcional)" placeholder="Detalhes adicionais..." value={notes} onChangeText={setNotes} multiline numberOfLines={2} autoCapitalize="sentences" />

          {/* Attachments */}
          <AttachmentPicker
            onAttachmentAdded={handleAttachmentAdded}
            currentFilesCount={attachments.length}
            maxFiles={10}
          />

          {/* Display selected attachments */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              <Text style={[styles.attachmentsTitle, { color: theme.text }]}>
                Anexos selecionados ({attachments.length})
              </Text>
              {attachments.map((file, index) => {
                const isImage = file.type.startsWith("image/");
                return (
                  <View
                    key={index}
                    style={[
                      styles.attachmentItem,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    {/* Thumbnail or Icon */}
                    <View style={[styles.thumbnailContainer, { backgroundColor: theme.surfaceVariant }]}>
                      {isImage ? (
                        <Image source={{ uri: file.uri }} style={styles.thumbnail} />
                      ) : (
                        <Ionicons name="document-outline" size={24} color={theme.gray[500]} />
                      )}
                    </View>

                    {/* File Info */}
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={[styles.fileSize, { color: theme.textSecondary }]}>
                        {file.size ? ((file.size / 1024).toFixed(1) + ' KB') : 'Tamanho desconhecido'}
                      </Text>
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity
                      onPress={() => handleAttachmentDelete(index)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="close-circle" size={24} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} disabled={!description.trim() || !amount.trim()} fullWidth size="lg" variant={type === "income" ? "primary" : "danger"}>
              {type === "expense" ? "Registrar Despesa" : "Registrar Receita"}
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
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  typeToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16 },
  typeButton: { flex: 1, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  typeButtonActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  typeButtonText: { marginLeft: 8, fontWeight: '500' },
  amountBox: { borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center' },
  amountLabel: { marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start' },
  currencyText: { fontSize: 24, marginRight: 8, marginTop: 10 },
  amountInputWrapper: { flex: 1 },
  section: { marginBottom: 16 },
  sectionLabel: { fontWeight: '500', marginBottom: 8 },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  categoryButton: { marginRight: 8, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  categoryButtonText: { marginLeft: 6, fontSize: 14, fontWeight: '500' },
  quickDatesRow: { flexDirection: 'row', marginBottom: 8 },
  quickDateButton: { marginRight: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  quickDateText: {},
  quickDateTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  attachmentsContainer: { marginTop: 16, marginBottom: 16 },
  attachmentsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  thumbnailContainer: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  thumbnail: { width: 48, height: 48, borderRadius: 8 },
  fileInfo: { flex: 1, marginRight: 8 },
  fileName: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  fileSize: { fontSize: 12 },
  deleteButton: { padding: 4 },
  submitContainer: { marginTop: 16, marginBottom: 32 },
});
