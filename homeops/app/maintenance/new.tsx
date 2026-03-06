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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { AttachmentPicker, type AttachmentFile } from "@/components/shared/AttachmentPicker";
import { useMaintenanceStore } from "@/stores/maintenanceStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { MaintenanceCategory } from "@/types";

export default function NewMaintenanceScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const { categories, fetchCategories, createItem, addAttachment, isLoading } = useMaintenanceStore();
  const { theme } = useTheme();

  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory | null>(null);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyUntil, setWarrantyUntil] = useState("");
  const [intervalMonths, setIntervalMonths] = useState("");
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState("");
  const [provider, setProvider] = useState("");
  const [providerPhone, setProviderPhone] = useState("");
  const [alertDays, setAlertDays] = useState("7");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const intervalOptions = [
    { value: "3", label: "3 meses" },
    { value: "6", label: "6 meses" },
    { value: "12", label: "1 ano" },
    { value: "24", label: "2 anos" },
  ];

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || !dateStr.trim()) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year && year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return null;
  };

  const handleAttachmentAdded = (file: AttachmentFile) => {
    setAttachments((prev) => [...prev, file]);
  };

  const handleAttachmentDelete = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Digite um nome para o item");
      return;
    }
    if (!household?.id) {
      Alert.alert("Erro", "Household nao encontrado");
      return;
    }

    const itemData = {
      household_id: household.id,
      name: name.trim(),
      category_id: selectedCategory?.id || null,
      brand: brand.trim() || null,
      model: model.trim() || null,
      purchase_date: parseDate(purchaseDate),
      warranty_until: parseDate(warrantyUntil),
      maintenance_interval_months: intervalMonths ? parseInt(intervalMonths) : null,
      last_maintenance_date: parseDate(lastMaintenanceDate),
      preferred_provider: provider.trim() || null,
      provider_phone: providerPhone.trim() || null,
      alert_days_before: parseInt(alertDays) || 7,
      created_by: user?.id,
    };

    const { error, data } = await createItem(itemData);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }

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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Novo Item</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Input label="Nome do item" placeholder="Ex: Ar condicionado do quarto" value={name} onChangeText={setName} autoCapitalize="sentences" />

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat)} style={[styles.categoryButton, { borderColor: theme.border, backgroundColor: theme.surface }, selectedCategory?.id === cat.id && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}>
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={18} color={selectedCategory?.id === cat.id ? theme.primary : cat.color} />
                  <Text style={[styles.categoryButtonText, { color: theme.gray[700] }, selectedCategory?.id === cat.id && { color: theme.primary }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={styles.halfLeft}><Input label="Marca" placeholder="Ex: Samsung" value={brand} onChangeText={setBrand} /></View>
            <View style={styles.halfRight}><Input label="Modelo" placeholder="Ex: AR12" value={model} onChangeText={setModel} /></View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfLeft}><Input label="Data de compra" placeholder="DD/MM/AAAA" value={purchaseDate} onChangeText={setPurchaseDate} keyboardType="numeric" icon="calendar-outline" /></View>
            <View style={styles.halfRight}><Input label="Garantia ate" placeholder="DD/MM/AAAA" value={warrantyUntil} onChangeText={setWarrantyUntil} keyboardType="numeric" icon="shield-checkmark-outline" /></View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Intervalo de manutencao</Text>
            <View style={styles.optionsRow}>
              {intervalOptions.map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => setIntervalMonths(opt.value)} style={[styles.optionButton, { backgroundColor: theme.gray[200] }, intervalMonths === opt.value && { backgroundColor: theme.primary }]}>
                  <Text style={[styles.optionButtonText, { color: theme.gray[700] }, intervalMonths === opt.value && styles.optionButtonTextSelected]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setIntervalMonths("")} style={[styles.optionButton, { backgroundColor: theme.gray[200] }, intervalMonths === "" && { backgroundColor: theme.primary }]}>
                <Text style={[styles.optionButtonText, { color: theme.gray[700] }, intervalMonths === "" && styles.optionButtonTextSelected]}>Nenhum</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Input label="Ultima manutencao" placeholder="DD/MM/AAAA" value={lastMaintenanceDate} onChangeText={setLastMaintenanceDate} keyboardType="numeric" icon="construct-outline" />

          <View style={[styles.providerBox, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.providerTitle, { color: theme.gray[700] }]}>Fornecedor preferido (opcional)</Text>
            <Input placeholder="Nome do fornecedor/tecnico" value={provider} onChangeText={setProvider} icon="person-outline" />
            <Input placeholder="Telefone" value={providerPhone} onChangeText={setProviderPhone} keyboardType="phone-pad" icon="call-outline" />
          </View>

          <Input label="Alertar quantos dias antes?" placeholder="7" value={alertDays} onChangeText={setAlertDays} keyboardType="numeric" icon="notifications-outline" />

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
                        <Image
                          source={{ uri: file.uri }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="document-text"
                          size={32}
                          color={theme.primary}
                        />
                      )}
                    </View>

                    {/* File Info */}
                    <View style={styles.fileInfo}>
                      <Text
                        style={[styles.fileName, { color: theme.text }]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {file.name}
                      </Text>
                      {file.size && (
                        <Text style={[styles.fileSize, { color: theme.textMuted }]}>
                          {file.size < 1024
                            ? `${file.size} B`
                            : file.size < 1024 * 1024
                            ? `${(file.size / 1024).toFixed(1)} KB`
                            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                        </Text>
                      )}
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity
                      onPress={() => handleAttachmentDelete(index)}
                      style={styles.deleteButton}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} disabled={!name.trim()} fullWidth size="lg">Cadastrar Item</Button>
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
  row: { flexDirection: 'row' },
  halfLeft: { flex: 1, marginRight: 8 },
  halfRight: { flex: 1, marginLeft: 8 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  optionButton: { marginRight: 8, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  optionButtonText: {},
  optionButtonTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  providerBox: { borderRadius: 12, padding: 16, marginBottom: 16 },
  providerTitle: { fontWeight: '600', marginBottom: 12 },
  attachmentsContainer: { marginBottom: 16 },
  attachmentsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  thumbnailContainer: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbnail: { width: '100%', height: '100%' },
  fileInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  fileName: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  fileSize: { fontSize: 12 },
  deleteButton: { padding: 8 },
  submitContainer: { marginTop: 16, marginBottom: 32 },
});
