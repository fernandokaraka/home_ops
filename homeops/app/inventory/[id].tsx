import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "@/components/ui";
import { StatusBadge } from "@/components/shared";
import {
  useInventoryStore,
  formatQuantityWithUnit,
  getStockStatus,
  getExpirationStatus,
  getDaysUntilExpiration,
} from "@/stores/inventoryStore";
import { useTheme } from "@/contexts/ThemeContext";
import { LOCATION_LABELS } from "@/types";
import type { InventoryItem } from "@/types";

export default function InventoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, consumeItem, restockItem, deleteItem, isLoading } = useInventoryStore();
  const { theme } = useTheme();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [quantityInput, setQuantityInput] = useState("");

  useEffect(() => {
    const found = items.find((i) => i.id === id);
    setItem(found || null);
  }, [id, items]);

  const handleConsume = async () => {
    if (!item) return;

    const quantity = parseFloat(quantityInput);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert("Erro", "Digite uma quantidade valida");
      return;
    }

    if (quantity > item.quantity) {
      Alert.alert("Erro", "Quantidade maior que o estoque disponivel");
      return;
    }

    const { error } = await consumeItem(item.id, quantity);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }

    setConsumeModalVisible(false);
    setQuantityInput("");
  };

  const handleRestock = async () => {
    if (!item) return;

    const quantity = parseFloat(quantityInput);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert("Erro", "Digite uma quantidade valida");
      return;
    }

    const { error } = await restockItem(item.id, quantity);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }

    setRestockModalVisible(false);
    setQuantityInput("");
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir item",
      "Tem certeza que deseja excluir este item do estoque?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!item) return;
            const { error } = await deleteItem(item.id);
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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Nao informado";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getStockStatusInfo = (status: "ok" | "low" | "out") => {
    switch (status) {
      case "ok":
        return { label: "Em estoque", variant: "success" as const };
      case "low":
        return { label: "Estoque baixo", variant: "warning" as const };
      case "out":
        return { label: "Sem estoque", variant: "danger" as const };
    }
  };

  const getExpirationStatusInfo = (status: "ok" | "warning" | "expired" | "none") => {
    switch (status) {
      case "ok":
        return { label: "Valido", variant: "success" as const };
      case "warning":
        return { label: "Vencendo", variant: "warning" as const };
      case "expired":
        return { label: "Vencido", variant: "danger" as const };
      default:
        return null;
    }
  };

  if (!item) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const stockStatus = getStockStatus(item.quantity, item.min_quantity);
  const stockStatusInfo = getStockStatusInfo(stockStatus);
  const expirationStatus = getExpirationStatus(item.expiration_date);
  const expirationStatusInfo = getExpirationStatusInfo(expirationStatus);
  const daysUntilExpiration = getDaysUntilExpiration(item.expiration_date);
  const categoryColor = item.category?.color || theme.gray[400];

  const renderQuantityModal = (
    visible: boolean,
    onClose: () => void,
    onConfirm: () => void,
    title: string,
    confirmText: string,
    confirmColor: string
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
            Estoque atual: {formatQuantityWithUnit(item.quantity, item.unit)}
          </Text>

          <View style={[styles.inputContainer, { backgroundColor: theme.surfaceVariant }]}>
            <TextInput
              style={[styles.quantityInput, { color: theme.text }]}
              placeholder="Digite a quantidade"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              value={quantityInput}
              onChangeText={setQuantityInput}
              autoFocus
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.modalButton, { backgroundColor: theme.surfaceVariant }]}
            >
              <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.modalButton, { backgroundColor: confirmColor }]}
            >
              <Text style={[styles.modalButtonText, { color: theme.surface }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.gray[700]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Detalhes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/inventory/edit?id=${id}`)}
            style={styles.headerButton}
          >
            <Ionicons name="pencil-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerButton}
          >
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Card - Header with Name, Category, Location */}
        <Card style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
              <Ionicons
                name={(item.category?.icon || "cube-outline") as keyof typeof Ionicons.glyphMap}
                size={28}
                color={categoryColor}
              />
            </View>
            <View style={styles.cardHeaderContent}>
              <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
              {item.category && (
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {item.category.name}
                </Text>
              )}
              <View style={styles.badgeRow}>
                <View style={[styles.locationBadge, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons
                    name={
                      item.location === "fridge" || item.location === "freezer"
                        ? "snow-outline"
                        : "home-outline"
                    }
                    size={14}
                    color={theme.primary}
                  />
                  <Text style={[styles.locationBadgeText, { color: theme.primary }]}>
                    {LOCATION_LABELS[item.location]}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Quantity Section */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quantidade</Text>
          <View style={[styles.quantityBox, { backgroundColor: theme.surfaceVariant }]}>
            <View style={styles.quantityMainRow}>
              <Text style={[styles.quantityValue, { color: theme.text }]}>
                {formatQuantityWithUnit(item.quantity, item.unit)}
              </Text>
              <StatusBadge label={stockStatusInfo.label} variant={stockStatusInfo.variant} />
            </View>
            {item.min_quantity !== null && (
              <Text style={[styles.minQuantityInfo, { color: theme.textSecondary }]}>
                Quantidade minima: {item.min_quantity} {item.unit}
              </Text>
            )}
          </View>
        </Card>

        {/* Expiration Section */}
        {item.expiration_date && (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Validade</Text>
            <View style={[styles.expirationBox, { backgroundColor: theme.surfaceVariant }]}>
              <View style={styles.expirationRow}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={
                    expirationStatus === "expired"
                      ? theme.danger
                      : expirationStatus === "warning"
                      ? theme.warning
                      : theme.success
                  }
                />
                <Text style={[styles.expirationDate, { color: theme.text }]}>
                  {formatDate(item.expiration_date)}
                </Text>
              </View>
              <View style={styles.expirationStatusRow}>
                {expirationStatusInfo && (
                  <StatusBadge
                    label={expirationStatusInfo.label}
                    variant={expirationStatusInfo.variant}
                  />
                )}
                {daysUntilExpiration !== null && (
                  <Text
                    style={[
                      styles.daysUntilText,
                      daysUntilExpiration < 0
                        ? { color: theme.danger }
                        : daysUntilExpiration <= 7
                        ? { color: theme.warning }
                        : { color: theme.success },
                    ]}
                  >
                    {daysUntilExpiration < 0
                      ? `Vencido ha ${Math.abs(daysUntilExpiration)} dias`
                      : daysUntilExpiration === 0
                      ? "Vence hoje"
                      : `Vence em ${daysUntilExpiration} dias`}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Recurring Purchase Info */}
        {item.is_recurring && item.purchase_interval_days && (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Compra Recorrente</Text>
            <View style={styles.recurringRow}>
              <Ionicons name="repeat" size={20} color={theme.primary} />
              <Text style={[styles.recurringText, { color: theme.text }]}>
                Intervalo de compra: {item.purchase_interval_days} dias
              </Text>
            </View>
            {item.last_purchase_date && (
              <Text style={[styles.lastPurchaseText, { color: theme.textSecondary }]}>
                Ultima compra: {formatDate(item.last_purchase_date)}
              </Text>
            )}
          </Card>
        )}

        {/* Notes Section */}
        {item.notes && (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Observacoes</Text>
            <Text style={[styles.notesText, { color: theme.textSecondary }]}>{item.notes}</Text>
          </Card>
        )}

        {/* Dates Section */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Informacoes</Text>
          <View style={styles.infoGrid}>
            {item.last_purchase_date && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  Ultima compra
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {formatDate(item.last_purchase_date)}
                </Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Adicionado em
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatDate(item.created_at?.split("T")[0])}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={() => {
                setQuantityInput("");
                setConsumeModalVisible(true);
              }}
              style={[styles.actionButton, { backgroundColor: theme.warning }]}
            >
              <Ionicons name="remove-circle-outline" size={24} color={theme.surface} />
              <Text style={[styles.actionButtonText, { color: theme.surface }]}>
                Consumir
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setQuantityInput("");
                setRestockModalVisible(true);
              }}
              style={[styles.actionButton, { backgroundColor: theme.success }]}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.surface} />
              <Text style={[styles.actionButtonText, { color: theme.surface }]}>
                Repor
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            onPress={() => router.push(`/inventory/edit?id=${id}`)}
            variant="outline"
            fullWidth
            size="lg"
            icon={<Ionicons name="pencil" size={20} color={theme.primary} />}
          >
            Editar Item
          </Button>

          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
            <Text style={[styles.deleteButtonText, { color: theme.danger }]}>
              Excluir Item
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Consume Modal */}
      {renderQuantityModal(
        consumeModalVisible,
        () => {
          setConsumeModalVisible(false);
          setQuantityInput("");
        },
        handleConsume,
        "Consumir Item",
        "Consumir",
        theme.warning
      )}

      {/* Restock Modal */}
      {renderQuantityModal(
        restockModalVisible,
        () => {
          setRestockModalVisible(false);
          setQuantityInput("");
        },
        handleRestock,
        "Repor Estoque",
        "Repor",
        theme.success
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardHeaderContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  categoryText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  locationBadgeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  quantityBox: {
    borderRadius: 12,
    padding: 16,
  },
  quantityMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  minQuantityInfo: {
    marginTop: 8,
    fontSize: 14,
  },
  expirationBox: {
    borderRadius: 12,
    padding: 16,
  },
  expirationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expirationDate: {
    fontSize: 18,
    fontWeight: "600",
  },
  expirationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  daysUntilText: {
    fontSize: 14,
    fontWeight: "500",
  },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recurringText: {
    fontSize: 16,
  },
  lastPurchaseText: {
    marginTop: 8,
    fontSize: 14,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 32,
    gap: 12,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
  },
  quantityInput: {
    fontSize: 18,
    paddingVertical: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
