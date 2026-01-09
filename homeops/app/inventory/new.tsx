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
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { InventoryCategory, InventoryLocation, InventoryUnit } from "@/types";
import { LOCATION_LABELS, UNIT_LABELS } from "@/types";

export default function NewInventoryItemScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const { categories, fetchCategories, createItem, isLoading } = useInventoryStore();
  const { theme } = useTheme();

  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<InventoryUnit>("un");
  const [minQuantity, setMinQuantity] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [location, setLocation] = useState<InventoryLocation>("pantry");
  const [isRecurring, setIsRecurring] = useState(false);
  const [purchaseIntervalDays, setPurchaseIntervalDays] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const unitOptions: { value: InventoryUnit; label: string }[] = [
    { value: "un", label: UNIT_LABELS.un },
    { value: "kg", label: UNIT_LABELS.kg },
    { value: "g", label: UNIT_LABELS.g },
    { value: "l", label: UNIT_LABELS.l },
    { value: "ml", label: UNIT_LABELS.ml },
    { value: "pack", label: UNIT_LABELS.pack },
  ];

  const locationOptions: { value: InventoryLocation; label: string }[] = [
    { value: "pantry", label: LOCATION_LABELS.pantry },
    { value: "fridge", label: LOCATION_LABELS.fridge },
    { value: "freezer", label: LOCATION_LABELS.freezer },
    { value: "bathroom", label: LOCATION_LABELS.bathroom },
    { value: "cleaning", label: LOCATION_LABELS.cleaning },
    { value: "other", label: LOCATION_LABELS.other },
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

    if (!household?.id) {
      Alert.alert("Erro", "Household nao encontrado");
      return;
    }

    const itemData = {
      household_id: household.id,
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
      created_by: user?.id,
    };

    const { error } = await createItem(itemData);

    if (error) {
      Alert.alert("Erro", error);
      return;
    }

    router.back();
  };

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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Novo Item</Text>
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

          {/* Quantity */}
          <Input
            label="Quantidade"
            placeholder="1"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            icon="cube-outline"
          />

          {/* Unit */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Unidade</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {unitOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setUnit(opt.value)}
                  style={[
                    styles.optionButton,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                    unit === opt.value && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: theme.gray[700] },
                      unit === opt.value && { color: theme.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Min Quantity */}
          <Input
            label="Quantidade minima (opcional)"
            placeholder="Alerta de estoque baixo"
            value={minQuantity}
            onChangeText={setMinQuantity}
            keyboardType="numeric"
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
                  <Text
                    style={[
                      styles.locationButtonText,
                      { color: theme.gray[700] },
                      location === opt.value && { color: theme.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recurrence */}
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
              <View style={styles.recurrenceInput}>
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
            placeholder="Adicione mais detalhes..."
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
              Criar Item
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
  optionButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionButtonText: {
    fontWeight: '500',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  locationButton: {
    width: '31%',
    marginHorizontal: '1.16%',
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  locationButtonText: {
    fontWeight: '500',
    fontSize: 13,
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
  recurrenceInput: {
    marginTop: 12,
  },
  submitContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
});
