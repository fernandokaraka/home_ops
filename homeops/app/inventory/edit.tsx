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
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { InventoryItem, InventoryCategory, InventoryLocation, InventoryUnit } from "@/types";
import { LOCATION_LABELS, UNIT_LABELS } from "@/types";

export default function EditInventoryItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, household } = useAuthStore();
  const { items, categories, fetchCategories, updateItem, isLoading } = useInventoryStore();
  const { theme } = useTheme();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);
  const [quantity, setQuantity] = useState<string>("1");
  const [unit, setUnit] = useState<InventoryUnit>("un");
  const [minQuantity, setMinQuantity] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [location, setLocation] = useState<InventoryLocation>("pantry");
  const [isRecurring, setIsRecurring] = useState(false);
  const [purchaseIntervalDays, setPurchaseIntervalDays] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const found = items.find((i) => i.id === id);
    if (found) {
      setItem(found);
      setName(found.name || "");
      setSelectedCategory(found.category || null);
      setQuantity(found.quantity?.toString() || "1");
      setUnit(found.unit || "un");
      setMinQuantity(found.min_quantity?.toString() || "");
      setExpirationDate(found.expiration_date || "");
      setLocation(found.location || "pantry");
      setIsRecurring(found.is_recurring || false);
      setPurchaseIntervalDays(found.purchase_interval_days?.toString() || "");
      setNotes(found.notes || "");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [id, items]);

  const unitOptions: { value: InventoryUnit; label: string }[] = [
    { value: "un", label: UNIT_LABELS.un },
    { value: "kg", label: UNIT_LABELS.kg },
    { value: "g", label: UNIT_LABELS.g },
    { value: "l", label: UNIT_LABELS.l },
    { value: "ml", label: UNIT_LABELS.ml },
    { value: "pack", label: UNIT_LABELS.pack },
  ];

  const locationOptions: { value: InventoryLocation; label: string; icon: string }[] = [
    { value: "pantry", label: LOCATION_LABELS.pantry, icon: "file-tray-stacked-outline" },
    { value: "fridge", label: LOCATION_LABELS.fridge, icon: "snow-outline" },
    { value: "freezer", label: LOCATION_LABELS.freezer, icon: "cube-outline" },
    { value: "bathroom", label: LOCATION_LABELS.bathroom, icon: "water-outline" },
    { value: "cleaning", label: LOCATION_LABELS.cleaning, icon: "sparkles-outline" },
    { value: "other", label: LOCATION_LABELS.other, icon: "ellipsis-horizontal-outline" },
  ];

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || !dateStr.trim()) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year && year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    return null;
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

    const itemData: Partial<InventoryItem> = {
      name: name.trim(),
      category_id: selectedCategory?.id || null,
      quantity: parseFloat(quantity) || 1,
      unit,
      min_quantity: minQuantity ? parseFloat(minQuantity) : null,
      expiration_date: parseDate(expirationDate),
      location,
      is_recurring: isRecurring,
      purchase_interval_days: isRecurring && purchaseIntervalDays ? parseInt(purchaseIntervalDays) : null,
      notes: notes.trim() || null,
    };

    const { error } = await updateItem(item.id, itemData);

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={theme.gray[700]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Editar Item</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Input
            label="Nome"
            placeholder="Nome do item"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
          />

          {/* Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Categoria</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryButton,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                    selectedCategory?.id === cat.id && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={cat.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={selectedCategory?.id === cat.id ? theme.primary : cat.color}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: theme.gray[700] },
                      selectedCategory?.id === cat.id && { color: theme.primary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Quantity and Unit */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Quantidade"
                placeholder="1"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Unidade</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.unitScrollContent}
              >
                {unitOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setUnit(opt.value)}
                    style={[
                      styles.unitButton,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      unit === opt.value && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitButtonText,
                        { color: theme.gray[600] },
                        unit === opt.value && { color: theme.primary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Min Quantity */}
          <Input
            label="Quantidade minima (opcional)"
            placeholder="Alerta quando estoque baixo"
            value={minQuantity}
            onChangeText={setMinQuantity}
            keyboardType="decimal-pad"
            icon="alert-circle-outline"
          />

          {/* Expiration Date */}
          <Input
            label="Data de validade (opcional)"
            placeholder="DD/MM/AAAA"
            value={expirationDate}
            onChangeText={setExpirationDate}
            keyboardType="numeric"
            icon="calendar-outline"
          />

          {/* Location */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Local</Text>
            <View style={styles.locationGrid}>
              {locationOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setLocation(opt.value)}
                  style={[
                    styles.locationButton,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                    location === opt.value && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={location === opt.value ? theme.primary : theme.gray[400]}
                  />
                  <Text
                    style={[
                      styles.locationButtonText,
                      { color: theme.gray[600] },
                      location === opt.value && { color: theme.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recurring Purchase */}
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => setIsRecurring(!isRecurring)}
              style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name="repeat"
                  size={20}
                  color={isRecurring ? theme.primary : theme.gray[400]}
                />
                <Text
                  style={[
                    styles.toggleText,
                    { color: theme.gray[700] },
                    isRecurring && { color: theme.primary },
                  ]}
                >
                  Compra recorrente
                </Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: theme.gray[300] }, isRecurring && { backgroundColor: theme.primary }]}>
                <View
                  style={[
                    styles.toggleThumb,
                    isRecurring && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            {isRecurring && (
              <View style={styles.recurringInput}>
                <Input
                  label="Intervalo de compra (dias)"
                  placeholder="Ex: 30"
                  value={purchaseIntervalDays}
                  onChangeText={setPurchaseIntervalDays}
                  keyboardType="numeric"
                  icon="time-outline"
                />
              </View>
            )}
          </View>

          {/* Notes */}
          <Input
            label="Observacoes (opcional)"
            placeholder="Adicione notas sobre o item..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            autoCapitalize="sentences"
          />

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!name.trim()}
              fullWidth
              size="lg"
            >
              Salvar Alteracoes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontWeight: '500',
    marginBottom: 8,
  },
  horizontalScroll: {
    marginHorizontal: -16,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
  },
  categoryButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  halfInput: {
    flex: 1,
  },
  unitScrollContent: {
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationButton: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  locationButtonText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    marginLeft: 12,
    fontWeight: '500',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  recurringInput: {
    marginTop: 12,
  },
  submitContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
});
