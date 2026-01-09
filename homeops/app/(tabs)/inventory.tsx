import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { Loading } from "@/components/shared";
import {
  useInventoryStore,
  getItemsByLocation,
  getLowStockItems,
  getExpiringItems,
  getExpiredItems,
  searchItems,
  formatQuantityWithUnit,
  getStockStatus,
  getExpirationStatus,
} from "@/stores/inventoryStore";
import { useShoppingStore, getItemsSummary } from "@/stores/shoppingStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { InventoryItem, InventoryLocation } from "@/types";
import { LOCATION_LABELS } from "@/types";

type TabFilter = "all" | InventoryLocation;

export default function InventoryScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const {
    items,
    categories,
    fetchItems,
    fetchCategories,
    isLoading,
  } = useInventoryStore();
  const { items: shoppingItems, fetchItems: fetchShoppingItems } = useShoppingStore();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (household?.id) {
      fetchItems(household.id);
      fetchCategories();
      fetchShoppingItems(household.id);
    }
  }, [household?.id]);

  const onRefresh = useCallback(async () => {
    if (!household?.id) return;
    setRefreshing(true);
    await Promise.all([
      fetchItems(household.id),
      fetchShoppingItems(household.id),
    ]);
    setRefreshing(false);
  }, [household?.id]);

  const handleItemPress = (item: InventoryItem) => {
    router.push(`/inventory/${item.id}`);
  };

  const tabs: { key: TabFilter; label: string; icon: string }[] = [
    { key: "all", label: "Todos", icon: "grid-outline" },
    { key: "pantry", label: "Despensa", icon: "home-outline" },
    { key: "fridge", label: "Geladeira", icon: "snow-outline" },
    { key: "freezer", label: "Freezer", icon: "snow-outline" },
  ];

  const getFilteredItems = () => {
    let filtered = activeTab === "all" ? items : getItemsByLocation(items, activeTab);
    if (searchQuery) {
      filtered = searchItems(filtered, searchQuery);
    }
    return filtered;
  };

  const filteredItems = getFilteredItems();
  const lowStockItems = getLowStockItems(items);
  const expiringItems = getExpiringItems(items, 7);
  const expiredItems = getExpiredItems(items);
  const shoppingSummary = getItemsSummary(shoppingItems);

  const getItemCounts = () => {
    return {
      all: items.length,
      pantry: getItemsByLocation(items, "pantry").length,
      fridge: getItemsByLocation(items, "fridge").length,
      freezer: getItemsByLocation(items, "freezer").length,
    };
  };

  const counts = getItemCounts();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Estoque</Text>
            {items.length > 0 && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {items.length} ite{items.length !== 1 ? "ns" : "m"}
              </Text>
            )}
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => router.push("/shopping")}
              style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
            >
              <Ionicons name="cart-outline" size={24} color={theme.primary} />
              {shoppingSummary.unchecked > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <Text style={[styles.badgeText, { color: theme.surface }]}>
                    {shoppingSummary.unchecked}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/inventory/new")}
              style={[styles.addButton, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="add" size={28} color={theme.surface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar item..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsContainer}
        >
          {tabs.map((tab) => {
            const count = counts[tab.key as keyof typeof counts] || 0;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  { backgroundColor: theme.surfaceVariant },
                  activeTab === tab.key && { backgroundColor: theme.primary }
                ]}
              >
                <Ionicons
                  name={tab.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={activeTab === tab.key ? theme.surface : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: theme.textSecondary },
                    activeTab === tab.key && { color: theme.surface }
                  ]}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      activeTab === tab.key
                        ? { backgroundColor: theme.surface + "40" }
                        : { backgroundColor: theme.textMuted + "30" }
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        { color: activeTab === tab.key ? theme.surface : theme.textSecondary }
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && items.length === 0 ? (
        <Loading message="Carregando estoque..." />
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {/* Alerts Section */}
          {(lowStockItems.length > 0 || expiredItems.length > 0 || expiringItems.length > 0) && (
            <View style={styles.alertsSection}>
              {/* Low Stock Alert */}
              {lowStockItems.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push("/shopping")}
                  style={[styles.alertCard, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }]}
                >
                  <View style={[styles.alertIcon, { backgroundColor: theme.warning + '20' }]}>
                    <Ionicons name="alert-circle" size={24} color={theme.warning} />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={[styles.alertTitle, { color: theme.warning }]}>
                      {lowStockItems.length} ite{lowStockItems.length !== 1 ? "ns" : "m"} em baixa
                    </Text>
                    <Text style={[styles.alertText, { color: theme.warning }]}>
                      Toque para adicionar a lista de compras
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.warning} />
                </TouchableOpacity>
              )}

              {/* Expired Alert */}
              {expiredItems.length > 0 && (
                <View style={[styles.alertCard, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}>
                  <View style={[styles.alertIcon, { backgroundColor: theme.danger + '20' }]}>
                    <Ionicons name="close-circle" size={24} color={theme.danger} />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={[styles.alertTitle, { color: theme.danger }]}>
                      {expiredItems.length} ite{expiredItems.length !== 1 ? "ns" : "m"} vencido{expiredItems.length !== 1 ? "s" : ""}
                    </Text>
                    <Text style={[styles.alertText, { color: theme.danger }]}>
                      Verifique e descarte se necessario
                    </Text>
                  </View>
                </View>
              )}

              {/* Expiring Soon Alert */}
              {expiringItems.length > 0 && expiredItems.length === 0 && (
                <View style={[styles.alertCard, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }]}>
                  <View style={[styles.alertIcon, { backgroundColor: theme.warning + '20' }]}>
                    <Ionicons name="time-outline" size={24} color={theme.warning} />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={[styles.alertTitle, { color: theme.warning }]}>
                      {expiringItems.length} ite{expiringItems.length !== 1 ? "ns" : "m"} vencendo
                    </Text>
                    <Text style={[styles.alertText, { color: theme.warning }]}>
                      Nos proximos 7 dias
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Items List */}
          <View style={styles.listContainer}>
            {filteredItems.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons
                      name="cube-outline"
                      size={40}
                      color={theme.textMuted}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    {searchQuery ? "Nenhum item encontrado" : "Estoque vazio"}
                  </Text>
                  <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                    {searchQuery
                      ? "Tente buscar por outro termo"
                      : "Comece adicionando itens ao seu estoque"}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity
                      onPress={() => router.push("/inventory/new")}
                      style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                    >
                      <Ionicons name="add" size={20} color={theme.surface} />
                      <Text style={[styles.primaryButtonText, { color: theme.surface }]}>
                        Adicionar Item
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ) : (
              filteredItems.map((item) => {
                const stockStatus = getStockStatus(item.quantity, item.min_quantity);
                const expirationStatus = getExpirationStatus(item.expiration_date);
                const categoryColor = item.category?.color || theme.textMuted;

                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                    style={[
                      styles.itemCard,
                      { backgroundColor: theme.surface, borderLeftColor: categoryColor }
                    ]}
                  >
                    <View style={styles.itemRow}>
                      {/* Category Icon */}
                      <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
                        <Ionicons
                          name={(item.category?.icon || "cube-outline") as keyof typeof Ionicons.glyphMap}
                          size={24}
                          color={categoryColor}
                        />
                      </View>

                      {/* Content */}
                      <View style={styles.itemContent}>
                        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>

                        {/* Quantity */}
                        <View style={styles.quantityRow}>
                          <Text style={[styles.quantityText, { color: theme.textSecondary }]}>
                            {formatQuantityWithUnit(item.quantity, item.unit)}
                          </Text>
                          {item.min_quantity && (
                            <Text style={[styles.minQuantityText, { color: theme.textMuted }]}>
                              {" "}(min: {item.min_quantity})
                            </Text>
                          )}
                        </View>

                        {/* Status Badges */}
                        <View style={styles.statusRow}>
                          {/* Stock Status */}
                          {stockStatus !== "ok" && (
                            <View
                              style={[
                                styles.statusBadge,
                                stockStatus === "low"
                                  ? { backgroundColor: theme.warningLight }
                                  : { backgroundColor: theme.dangerLight }
                              ]}
                            >
                              <Ionicons
                                name={stockStatus === "low" ? "alert-circle" : "close-circle"}
                                size={12}
                                color={stockStatus === "low" ? theme.warning : theme.danger}
                              />
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: stockStatus === "low" ? theme.warning : theme.danger }
                                ]}
                              >
                                {stockStatus === "low" ? "Baixo" : "Acabou"}
                              </Text>
                            </View>
                          )}

                          {/* Expiration Status */}
                          {expirationStatus !== "none" && expirationStatus !== "ok" && (
                            <View
                              style={[
                                styles.statusBadge,
                                expirationStatus === "warning"
                                  ? { backgroundColor: theme.warningLight }
                                  : { backgroundColor: theme.dangerLight },
                                stockStatus !== "ok" && { marginLeft: 8 }
                              ]}
                            >
                              <Ionicons
                                name={expirationStatus === "warning" ? "time-outline" : "close-circle"}
                                size={12}
                                color={expirationStatus === "warning" ? theme.warning : theme.danger}
                              />
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: expirationStatus === "warning" ? theme.warning : theme.danger }
                                ]}
                              >
                                {expirationStatus === "warning" ? "Vencendo" : "Vencido"}
                              </Text>
                            </View>
                          )}

                          {/* Location Badge */}
                          <View
                            style={[
                              styles.locationBadge,
                              { backgroundColor: theme.primaryLight },
                              (stockStatus !== "ok" || (expirationStatus !== "none" && expirationStatus !== "ok")) && { marginLeft: 8 }
                            ]}
                          >
                            <Ionicons
                              name={
                                item.location === "fridge" || item.location === "freezer"
                                  ? "snow-outline"
                                  : "home-outline"
                              }
                              size={12}
                              color={theme.primary}
                            />
                            <Text style={[styles.locationBadgeText, { color: theme.primary }]}>
                              {LOCATION_LABELS[item.location]}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.textMuted}
                        style={{ marginLeft: 8 }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  tabsScrollView: {
    marginHorizontal: -20,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  alertsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontWeight: '600',
  },
  alertText: {
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyCard: {
    marginTop: 8,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  itemCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  quantityText: {
    fontSize: 14,
  },
  minQuantityText: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 80,
  },
});
