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
import { BudgetProgressCard, BudgetAlerts } from "@/components/finances";
import { Loading } from "@/components/shared";
import {
  useFinanceStore,
  formatCurrency,
  getBudgetAlerts,
  getCriticalBudgetAlerts,
} from "@/stores/financeStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";

export default function BudgetsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { household } = useAuthStore();
  const {
    budgets,
    transactions,
    fetchBudgets,
    fetchTransactions,
    fetchCategories,
    isLoading,
  } = useFinanceStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (household?.id) {
      loadData();
    }
  }, [household?.id]);

  const loadData = async () => {
    if (!household?.id) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    await Promise.all([
      fetchBudgets(household.id, currentMonth),
      fetchTransactions(household.id, currentMonth),
      fetchCategories(),
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [household?.id]);

  const currentMonth = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const budgetAlerts = getBudgetAlerts(budgets, transactions);
  const criticalAlerts = getCriticalBudgetAlerts(budgets, transactions);

  // Calculate total budget summary
  const totalBudget = budgetAlerts.reduce((sum, alert) => sum + alert.limit, 0);
  const totalSpent = budgetAlerts.reduce((sum, alert) => sum + alert.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (isLoading && budgets.length === 0) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Orçamentos</Text>
        <TouchableOpacity
          onPress={() => router.push("/finance/new-budget")}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <View style={styles.section}>
            <BudgetAlerts alerts={criticalAlerts} />
          </View>
        )}

        {/* Monthly Summary */}
        {budgets.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Resumo de {currentMonth}
            </Text>
            <Card style={{ backgroundColor: theme.primary }}>
              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.surface + 'B0' }]}>
                      Orçamento Total
                    </Text>
                    <Text style={[styles.summaryValue, { color: theme.surface }]}>
                      {formatCurrency(totalBudget)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.surface + 'B0' }]}>
                      Total Gasto
                    </Text>
                    <Text style={[styles.summaryValue, { color: theme.surface }]}>
                      {formatCurrency(totalSpent)}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.summaryProgress}>
                  <View style={[styles.progressBackground, { backgroundColor: theme.surface + '40' }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: theme.surface,
                          width: `${Math.min(overallPercentage, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: theme.surface }]}>
                    {overallPercentage.toFixed(0)}% utilizado
                  </Text>
                </View>

                {/* Remaining Amount */}
                <View style={styles.remainingContainer}>
                  <Ionicons
                    name={totalRemaining >= 0 ? "checkmark-circle" : "alert-circle"}
                    size={20}
                    color={theme.surface}
                  />
                  <Text style={[styles.remainingText, { color: theme.surface }]}>
                    {totalRemaining >= 0 ? "Disponível: " : "Excedido em: "}
                    {formatCurrency(Math.abs(totalRemaining))}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Budgets List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Orçamentos por Categoria
          </Text>

          {budgets.length === 0 ? (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={64} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Nenhum orçamento criado
                </Text>
                <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                  Defina limites de gastos por categoria para controlar suas despesas
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/finance/new-budget")}
                  style={[styles.emptyButton, { backgroundColor: theme.primary }]}
                >
                  <Ionicons name="add" size={20} color={theme.surface} />
                  <Text style={[styles.emptyButtonText, { color: theme.surface }]}>
                    Criar Orçamento
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            budgetAlerts.map((alert) => (
              <BudgetProgressCard
                key={alert.budget.id}
                alert={alert}
                onPress={(alert) => {
                  router.push({
                    pathname: "/finance/edit-budget",
                    params: { id: alert.budget.id },
                  });
                }}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  addButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  summaryContent: {
    padding: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#ffffff40",
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  summaryProgress: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  remainingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  remainingText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
