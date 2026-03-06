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
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { AttachmentPicker, type AttachmentFile } from "@/components/shared/AttachmentPicker";
import { useMaintenanceStore } from "@/stores/maintenanceStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { MaintenanceCategory, MaintenanceItem, Attachment } from "@/types";

export default function EditMaintenanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, household } = useAuthStore();
  const { items, categories, attachments, fetchCategories, updateItem, fetchAttachments, addAttachment, deleteAttachment, isLoading } = useMaintenanceStore();
  const { theme } = useTheme();

  const [item, setItem] = useState<MaintenanceItem | null>(null);
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
  const [loading, setLoading] = useState(true);
  const [newAttachments, setNewAttachments] = useState<AttachmentFile[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const found = items.find((i) => i.id === id);
    if (found) {
      setItem(found);
      setName(found.name || "");
      setSelectedCategory(found.category || null);
      setBrand(found.brand || "");
      setModel(found.model || "");
      setPurchaseDate(found.purchase_date || "");
      setWarrantyUntil(found.warranty_until || "");
      setIntervalMonths(found.maintenance_interval_months?.toString() || "");
      setLastMaintenanceDate(found.last_maintenance_date || "");
      setProvider(found.preferred_provider || "");
      setProviderPhone(found.provider_phone || "");
      setAlertDays(found.alert_days_before?.toString() || "7");

      // Fetch existing attachments
      fetchAttachments(found.id);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [id, items]);

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
    setNewAttachments((prev) => [...prev, file]);
  };

  const handleNewAttachmentDelete = (index: number) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExistingAttachmentDelete = async (attachmentId: string) => {
    Alert.alert(
      "Confirmar exclusao",
      "Deseja realmente excluir este anexo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteAttachment(attachmentId);
            if (error) {
              Alert.alert("Erro", error);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Digite um nome para o item");
      return;
    }
    if (!item) {
      Alert.alert("Erro", "Item nao encontrado");
      return;
    }
    if (!household?.id) {
      Alert.alert("Erro", "Household nao encontrado");
      return;
    }

    const itemData: Partial<MaintenanceItem> = {
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
    };

    const { error } = await updateItem(item.id, itemData);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }

    // Upload new attachments if any
    if (newAttachments.length > 0) {
      for (const file of newAttachments) {
        await addAttachment(item.id, household.id, file, user?.id);
      }
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

  if (!item) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Item nao encontrado</Text>
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Editar Item</Text>
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
            currentFilesCount={attachments.length + newAttachments.length}
            maxFiles={10}
          />

          {/* Display existing attachments */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              <Text style={[styles.attachmentsTitle, { color: theme.text }]}>
                Anexos existentes ({attachments.length})
              </Text>
              {attachments.map((attachment) => {
                const isImage = attachment.file_type.startsWith("image/");
                return (
                  <View
                    key={attachment.id}
                    style={[
                      styles.attachmentItem,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    {/* Thumbnail or Icon */}
                    <View style={[styles.thumbnailContainer, { backgroundColor: theme.surfaceVariant }]}>
                      {isImage ? (
                        <Image
                          source={{ uri: attachment.file_url }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="document-outline" size={24} color={theme.gray[500]} />
                      )}
                    </View>

                    {/* File Info */}
                    <View style={styles.fileInfo}>
                      <Text
                        style={[styles.fileName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {attachment.file_name}
                      </Text>
                      {attachment.file_size && (
                        <Text style={[styles.fileSize, { color: theme.textSecondary }]}>
                          {(attachment.file_size / 1024).toFixed(1)} KB
                        </Text>
                      )}
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity
                      onPress={() => handleExistingAttachmentDelete(attachment.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Display new attachments to be uploaded */}
          {newAttachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              <Text style={[styles.attachmentsTitle, { color: theme.text }]}>
                Novos anexos ({newAttachments.length})
              </Text>
              {newAttachments.map((file, index) => {
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
                        <Ionicons name="document-outline" size={24} color={theme.gray[500]} />
                      )}
                    </View>

                    {/* File Info */}
                    <View style={styles.fileInfo}>
                      <Text
                        style={[styles.fileName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {file.name}
                      </Text>
                      {file.size && (
                        <Text style={[styles.fileSize, { color: theme.textSecondary }]}>
                          {(file.size / 1024).toFixed(1)} KB
                        </Text>
                      )}
                      <View style={[styles.newBadge, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.newBadgeText, { color: theme.primary }]}>Novo</Text>
                      </View>
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity
                      onPress={() => handleNewAttachmentDelete(index)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.submitContainer}>
            <Button onPress={handleSubmit} loading={isLoading} disabled={!name.trim()} fullWidth size="lg">Salvar Alteracoes</Button>
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
  row: { flexDirection: 'row' },
  halfLeft: { flex: 1, marginRight: 8 },
  halfRight: { flex: 1, marginLeft: 8 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  optionButton: { marginRight: 8, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  optionButtonText: {},
  optionButtonTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  providerBox: { borderRadius: 12, padding: 16, marginBottom: 16 },
  providerTitle: { fontWeight: '600', marginBottom: 12 },
  attachmentsContainer: { marginTop: 16, marginBottom: 16 },
  attachmentsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  thumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  newBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  submitContainer: { marginTop: 16, marginBottom: 32 },
});
