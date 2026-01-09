import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { MaintenanceItemCard } from "@/components/maintenance";
import { Loading } from "@/components/shared";
import {
  useMaintenanceStore,
  getUpcomingMaintenance,
  getOverdueMaintenance,
  getItemsByCategory,
} from "@/stores/maintenanceStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";

export default function MaintenanceScreen() {
  const router = useRouter();
  const { household } = useAuthStore();
  const { items, categories, fetchItems, fetchCategories, isLoading } = useMaintenanceStore();
  const { theme } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (household?.id) {
      fetchItems(household.id);
      fetchCategories();
    }
  }, [household?.id]);

  const onRefresh = useCallback(async () => {
    if (!household?.id) return;
    setRefreshing(true);
    await fetchItems(household.id);
    setRefreshing(false);
  }, [household?.id]);

  const filteredItems = getItemsByCategory(items, selectedCategory);
  const upcomingItems = getUpcomingMaintenance(items, 30);
  const overdueItems = getOverdueMaintenance(items);

  const allCategories = [
    { id: "all", name: "Todos", icon: "apps-outline", color: theme.textSecondary },
    ...categories,
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.surfaceVariant }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Manutencoes</Text>
            {items.length > 0 && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {items.length} ite{items.length !== 1 ? "ns" : "m"} cadastrado{items.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => router.push("/maintenance/new")}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={28} color={theme.surface} />
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {allCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={[
                styles.categoryButton,
                selectedCategory === category.id
                  ? [styles.categoryActive, { backgroundColor: theme.primary }]
                  : [styles.categoryInactive, { backgroundColor: theme.surfaceVariant }]
              ]}
            >
              <Ionicons
                name={category.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={selectedCategory === category.id ? theme.surface : category.color}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id
                    ? [styles.categoryTextActive, { color: theme.surface }]
                    : [styles.categoryTextInactive, { color: theme.text }]
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading && items.length === 0 ? (
        <Loading message="Carregando itens..." />
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
          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <Card style={styles.statCardLeft}>
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: theme.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {items.length - overdueItems.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Em dia</Text>
              </View>
            </Card>
            <Card style={styles.statCardRight}>
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: theme.danger + '20' }]}>
                  <Ionicons name="alert-circle" size={24} color={theme.danger} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {overdueItems.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Atrasadas</Text>
              </View>
            </Card>
          </View>

          {/* Overdue Warning */}
          {overdueItems.length > 0 && (
            <View style={[styles.warningCard, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}>
              <View style={styles.warningRow}>
                <Ionicons name="alert-circle" size={24} color={theme.danger} />
                <View style={styles.warningContent}>
                  <Text style={[styles.warningTitle, { color: theme.danger }]}>
                    {overdueItems.length} manutenca{overdueItems.length !== 1 ? "s" : "o"} atrasada{overdueItems.length !== 1 ? "s" : ""}
                  </Text>
                  <Text style={[styles.warningText, { color: theme.danger }]}>
                    Verifique os itens que precisam de atencao
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Items List */}
          <View style={styles.listContainer}>
            {filteredItems.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons
                      name="construct-outline"
                      size={40}
                      color={theme.textMuted}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    {selectedCategory === "all"
                      ? "Nenhum item cadastrado"
                      : "Nenhum item nesta categoria"}
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Cadastre seus equipamentos para receber alertas de manutencao preventiva
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/maintenance/new")}
                    style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  >
                    <Ionicons name="add" size={20} color={theme.surface} />
                    <Text style={[styles.primaryButtonText, { color: theme.surface }]}>
                      Cadastrar Item
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : (
              filteredItems.map((item) => (
                <MaintenanceItemCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/maintenance/${item.id}`)}
                />
              ))
            )}
          </View>

          {/* Suggested Items */}
          {items.length === 0 && (
            <View style={styles.suggestedSection}>
              <Text style={[styles.suggestedTitle, { color: theme.text }]}>
                Itens comuns para cadastrar
              </Text>
              <View style={styles.suggestedGrid}>
                {[
                  { name: "Ar Condicionado", icon: "snow-outline", color: "#0EA5E9" },
                  { name: "Filtro de Agua", icon: "water-outline", color: theme.primary },
                  { name: "Geladeira", icon: "cube-outline", color: "#8B5CF6" },
                  { name: "Maquina de Lavar", icon: "refresh-outline", color: theme.success },
                  { name: "Carro", icon: "car-outline", color: theme.danger },
                  { name: "Dedetizacao", icon: "bug-outline", color: "#84CC16" },
                ].map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => router.push("/maintenance/new")}
                    style={[styles.suggestedItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={item.color}
                    />
                    <Text style={[styles.suggestedText, { color: theme.text }]}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScroll: {
    marginHorizontal: -20,
  },
  categoryContent: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryActive: {
  },
  categoryInactive: {
  },
  categoryText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  categoryTextActive: {
  },
  categoryTextInactive: {
  },
  scrollView: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  statCardRight: {
    flex: 1,
    marginLeft: 8,
  },
  statContent: {
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
  },
  warningCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontWeight: '600',
  },
  warningText: {
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
  emptyText: {
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
  suggestedSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  suggestedTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestedItem: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestedText: {
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 80,
  },
});
