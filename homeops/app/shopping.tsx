import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button } from "@/components/ui";
import { Loading } from "@/components/shared";
import {
  useShoppingStore,
  getItemsSummary,
  getUncheckedItems,
  getCheckedItems,
} from "@/stores/shoppingStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { ShoppingListItem, InventoryUnit, ShoppingPriority } from "@/types";
import { UNIT_LABELS, PRIORITY_LABELS } from "@/types";

export default function ShoppingScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const { theme } = useTheme();
  const {
    items,
    fetchItems,
    addItem,
    toggleItem,
    deleteItem,
    clearCheckedItems,
    addFromLowStock,
    completeShoppingAndUpdateStock,
    isLoading,
  } = useShoppingStore();
  const { fetchItems: fetchInventoryItems } = useInventoryStore();

  const [refreshing, setRefreshing] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState<InventoryUnit>("un");
  const [newItemPriority, setNewItemPriority] = useState<ShoppingPriority>("normal");
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  useEffect(() => {
    if (household?.id) {
      fetchItems(household.id);
    }
  }, [household?.id]);

  const onRefresh = useCallback(async () => {
    if (!household?.id) return;
    setRefreshing(true);
    await fetchItems(household.id);
    setRefreshing(false);
  }, [household?.id]);

  const summary = getItemsSummary(items);
  const uncheckedItems = getUncheckedItems(items);
  const checkedItems = getCheckedItems(items);

  const getPriorityColor = (priority: ShoppingPriority) => {
    switch (priority) {
      case "high":
        return theme.danger;
      case "normal":
        return theme.textSecondary;
      case "low":
        return theme.textMuted;
      default:
        return theme.textSecondary;
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert("Erro", "Digite o nome do item");
      return;
    }

    if (!household?.id || !user?.id) {
      Alert.alert("Erro", "Sessao invalida");
      return;
    }

    const quantity = parseFloat(newItemQuantity) || 1;

    const { error } = await addItem({
      household_id: household.id,
      name: newItemName.trim(),
      quantity,
      unit: newItemUnit,
      priority: newItemPriority,
      added_by: user.id,
      is_checked: false,
    });

    if (error) {
      Alert.alert("Erro", error);
      return;
    }

    // Reset form
    setNewItemName("");
    setNewItemQuantity("1");
    setNewItemUnit("un");
    setNewItemPriority("normal");
  };

  const handleToggleItem = async (id: string) => {
    const { error } = await toggleItem(id);
    if (error) {
      Alert.alert("Erro", error);
    }
  };

  const handleDeleteItem = (item: ShoppingListItem) => {
    Alert.alert(
      "Remover item",
      `Deseja remover "${item.name}" da lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteItem(item.id);
            if (error) {
              Alert.alert("Erro", error);
            }
          },
        },
      ]
    );
  };

  const handleAddFromLowStock = async () => {
    if (!household?.id || !user?.id) return;

    // First refresh inventory to get latest data
    await fetchInventoryItems(household.id);

    const { error, added } = await addFromLowStock(household.id, user.id);

    if (error) {
      Alert.alert("Erro", error);
      return;
    }

    if (added === 0) {
      Alert.alert("Info", "Nenhum item em estoque baixo para adicionar, ou todos ja estao na lista.");
    } else {
      Alert.alert("Sucesso", `${added} ite${added !== 1 ? "ns" : "m"} adicionado${added !== 1 ? "s" : ""} do estoque baixo.`);
    }
  };

  const handleClearChecked = () => {
    if (!household?.id) return;

    Alert.alert(
      "Limpar marcados",
      `Deseja remover ${summary.checked} ite${summary.checked !== 1 ? "ns" : "m"} marcado${summary.checked !== 1 ? "s" : ""}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: async () => {
            const { error } = await clearCheckedItems(household.id);
            if (error) {
              Alert.alert("Erro", error);
            }
          },
        },
      ]
    );
  };

  const handleCompleteShopping = () => {
    if (!household?.id) return;

    const linkedItems = checkedItems.filter((i) => i.inventory_item_id);

    Alert.alert(
      "Finalizar compras",
      linkedItems.length > 0
        ? `Isso ira atualizar o estoque de ${linkedItems.length} ite${linkedItems.length !== 1 ? "ns" : "m"} vinculado${linkedItems.length !== 1 ? "s" : ""} e limpar os itens marcados.`
        : "Isso ira limpar todos os itens marcados da lista.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          onPress: async () => {
            const { error } = await completeShoppingAndUpdateStock(household.id);
            if (error) {
              Alert.alert("Erro", error);
              return;
            }
            // Refresh inventory after completing
            await fetchInventoryItems(household.id);
            Alert.alert("Sucesso", "Compras finalizadas e estoque atualizado!");
          },
        },
      ]
    );
  };

  const renderItem = (item: ShoppingListItem, isChecked: boolean) => {
    const priorityColor = getPriorityColor(item.priority);

    return (
      <View
        key={item.id}
        style={[
          styles.itemCard,
          { backgroundColor: theme.surface },
          isChecked && { opacity: 0.6 },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleToggleItem(item.id)}
          style={styles.checkboxContainer}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: isChecked ? theme.success : theme.border },
              isChecked && { backgroundColor: theme.success },
            ]}
          >
            {isChecked && (
              <Ionicons name="checkmark" size={16} color={theme.surface} />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.itemContent}>
          <View style={styles.itemNameRow}>
            <Text
              style={[
                styles.itemName,
                { color: theme.text },
                isChecked && styles.itemNameChecked,
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.priority === "high" && !isChecked && (
              <View style={[styles.priorityBadge, { backgroundColor: theme.dangerLight }]}>
                <Ionicons name="flag" size={12} color={theme.danger} />
                <Text style={[styles.priorityBadgeText, { color: theme.danger }]}>
                  Alta
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.itemQuantity, { color: theme.textSecondary }]}>
            {item.quantity} {UNIT_LABELS[item.unit]}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleDeleteItem(item)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color={theme.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  const unitOptions: InventoryUnit[] = ["un", "kg", "g", "l", "ml", "pack"];
  const priorityOptions: ShoppingPriority[] = ["low", "normal", "high"];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Lista de Compras
            </Text>
            {items.length > 0 && (
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                {items.length} ite{items.length !== 1 ? "ns" : "m"}
              </Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading && items.length === 0 ? (
          <Loading message="Carregando lista..." />
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
            }
          >
            {/* Summary Card */}
            {items.length > 0 && (
              <View style={styles.section}>
                <Card>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: theme.text }]}>
                        {summary.total}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                        Total
                      </Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: theme.success }]}>
                        {summary.checked}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                        Marcados
                      </Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: theme.warning }]}>
                        {summary.unchecked}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                        Pendentes
                      </Text>
                    </View>
                  </View>
                </Card>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.section}>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  onPress={handleAddFromLowStock}
                  style={[styles.actionButton, { backgroundColor: theme.primaryLight }]}
                  disabled={isLoading}
                >
                  <Ionicons name="cube-outline" size={20} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                    Adicionar do Estoque Baixo
                  </Text>
                </TouchableOpacity>
              </View>

              {summary.checked > 0 && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    onPress={handleClearChecked}
                    style={[
                      styles.actionButton,
                      styles.actionButtonHalf,
                      { backgroundColor: theme.dangerLight },
                    ]}
                    disabled={isLoading}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    <Text style={[styles.actionButtonText, { color: theme.danger }]}>
                      Limpar Marcados
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCompleteShopping}
                    style={[
                      styles.actionButton,
                      styles.actionButtonHalf,
                      { backgroundColor: theme.successLight },
                    ]}
                    disabled={isLoading}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color={theme.success} />
                    <Text style={[styles.actionButtonText, { color: theme.success }]}>
                      Finalizar Compras
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Add New Item Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                ADICIONAR ITEM
              </Text>
              <Card>
                {/* Item Name Input */}
                <View style={[styles.inputContainer, { borderColor: theme.border }]}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Nome do item..."
                    placeholderTextColor={theme.textMuted}
                    value={newItemName}
                    onChangeText={setNewItemName}
                    autoCapitalize="sentences"
                  />
                </View>

                {/* Quantity and Unit Row */}
                <View style={styles.quantityUnitRow}>
                  <View style={[styles.quantityInput, { borderColor: theme.border }]}>
                    <Ionicons name="apps-outline" size={18} color={theme.textMuted} />
                    <TextInput
                      style={[styles.quantityTextInput, { color: theme.text }]}
                      placeholder="Qtd"
                      placeholderTextColor={theme.textMuted}
                      value={newItemQuantity}
                      onChangeText={setNewItemQuantity}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Unit Selector */}
                  <TouchableOpacity
                    onPress={() => setShowUnitPicker(!showUnitPicker)}
                    style={[styles.selectorButton, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                  >
                    <Text style={[styles.selectorText, { color: theme.text }]}>
                      {UNIT_LABELS[newItemUnit]}
                    </Text>
                    <Ionicons
                      name={showUnitPicker ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Priority Selector */}
                  <TouchableOpacity
                    onPress={() => setShowPriorityPicker(!showPriorityPicker)}
                    style={[
                      styles.selectorButton,
                      { borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                    ]}
                  >
                    <Ionicons
                      name="flag"
                      size={16}
                      color={getPriorityColor(newItemPriority)}
                    />
                    <Text style={[styles.selectorText, { color: theme.text }]}>
                      {PRIORITY_LABELS[newItemPriority]}
                    </Text>
                    <Ionicons
                      name={showPriorityPicker ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Unit Picker Dropdown */}
                {showUnitPicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {unitOptions.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => {
                          setNewItemUnit(unit);
                          setShowUnitPicker(false);
                        }}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: theme.borderLight },
                          newItemUnit === unit && { backgroundColor: theme.primaryLight },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: theme.text },
                            newItemUnit === unit && { color: theme.primary, fontWeight: "600" },
                          ]}
                        >
                          {UNIT_LABELS[unit]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Priority Picker Dropdown */}
                {showPriorityPicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {priorityOptions.map((priority) => (
                      <TouchableOpacity
                        key={priority}
                        onPress={() => {
                          setNewItemPriority(priority);
                          setShowPriorityPicker(false);
                        }}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: theme.borderLight },
                          newItemPriority === priority && { backgroundColor: theme.primaryLight },
                        ]}
                      >
                        <View style={styles.pickerOptionContent}>
                          <Ionicons
                            name="flag"
                            size={16}
                            color={getPriorityColor(priority)}
                            style={styles.pickerOptionIcon}
                          />
                          <Text
                            style={[
                              styles.pickerOptionText,
                              { color: theme.text },
                              newItemPriority === priority && { color: theme.primary, fontWeight: "600" },
                            ]}
                          >
                            {PRIORITY_LABELS[priority]}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Add Button */}
                <View style={styles.addButtonContainer}>
                  <Button
                    onPress={handleAddItem}
                    loading={isLoading}
                    disabled={!newItemName.trim()}
                    fullWidth
                  >
                    Adicionar Item
                  </Button>
                </View>
              </Card>
            </View>

            {/* Shopping List Items */}
            <View style={styles.section}>
              {items.length === 0 ? (
                <Card>
                  <View style={styles.emptyContent}>
                    <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
                      <Ionicons name="cart-outline" size={40} color={theme.textMuted} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                      Lista vazia
                    </Text>
                    <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                      Adicione itens a sua lista de compras ou importe do estoque baixo.
                    </Text>
                  </View>
                </Card>
              ) : (
                <>
                  {/* Unchecked Items */}
                  {uncheckedItems.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                        PENDENTES ({uncheckedItems.length})
                      </Text>
                      {uncheckedItems.map((item) => renderItem(item, false))}
                    </>
                  )}

                  {/* Checked Items */}
                  {checkedItems.length > 0 && (
                    <>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: theme.textSecondary, marginTop: uncheckedItems.length > 0 ? 24 : 0 },
                        ]}
                      >
                        MARCADOS ({checkedItems.length})
                      </Text>
                      {checkedItems.map((item) => renderItem(item, true))}
                    </>
                  )}
                </>
              )}
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    gap: 8,
  },
  actionButtonHalf: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  quantityUnitRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quantityInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flex: 1,
  },
  quantityTextInput: {
    flex: 1,
    fontSize: 16,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  pickerDropdown: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerOptionIcon: {
    marginRight: 8,
  },
  pickerOptionText: {
    fontSize: 14,
  },
  addButtonContainer: {
    marginTop: 4,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  itemQuantity: {
    fontSize: 14,
    marginTop: 4,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: "center",
    paddingHorizontal: 32,
  },
  bottomSpacer: {
    height: 40,
  },
});
