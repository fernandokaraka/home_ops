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
import { GoalProgressCard } from "@/components/finances";
import { Loading } from "@/components/shared";
import {
  useFinanceStore,
  formatCurrency,
  getGoalProjections,
  getGoalsBehindSchedule,
  getOverdueGoals,
} from "@/stores/financeStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";

export default function GoalsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { household } = useAuthStore();
  const {
    financialGoals,
    fetchFinancialGoals,
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
    await fetchFinancialGoals(household.id);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [household?.id]);

  // Separate goals by status
  const activeGoals = financialGoals.filter((g) => g.status === "in_progress");
  const completedGoals = financialGoals.filter((g) => g.status === "completed");
  const cancelledGoals = financialGoals.filter((g) => g.status === "cancelled");

  // Get projections for active goals
  const activeProjections = getGoalProjections(activeGoals);
  const behindSchedule = getGoalsBehindSchedule(activeGoals);
  const overdueGoals = getOverdueGoals(activeGoals);

  // Calculate total progress
  const totalTargetAmount = activeGoals.reduce((sum, goal) => sum + Number(goal.target_amount), 0);
  const totalCurrentAmount = activeGoals.reduce((sum, goal) => sum + Number(goal.current_amount), 0);
  const overallPercentage = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  if (isLoading && financialGoals.length === 0) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Metas Financeiras</Text>
        <TouchableOpacity
          onPress={() => router.push("/finance/new-goal")}
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
        {/* Summary Card */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Resumo das Metas
            </Text>
            <Card style={{ backgroundColor: theme.primary }}>
              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.surface + 'B0' }]}>
                      Total Economizado
                    </Text>
                    <Text style={[styles.summaryValue, { color: theme.surface }]}>
                      {formatCurrency(totalCurrentAmount)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.surface + 'B0' }]}>
                      Meta Total
                    </Text>
                    <Text style={[styles.summaryValue, { color: theme.surface }]}>
                      {formatCurrency(totalTargetAmount)}
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
                    {overallPercentage.toFixed(0)}% alcançado
                  </Text>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.surface }]}>
                      {activeGoals.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.surface + 'B0' }]}>
                      Ativas
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.surface }]}>
                      {behindSchedule.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.surface + 'B0' }]}>
                      Atrasadas
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.surface }]}>
                      {completedGoals.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.surface + 'B0' }]}>
                      Concluídas
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Active Goals */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Metas Ativas
          </Text>

          {activeGoals.length === 0 ? (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={64} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Nenhuma meta criada
                </Text>
                <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                  Defina metas financeiras para economizar e alcançar seus objetivos
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/finance/new-goal")}
                  style={[styles.emptyButton, { backgroundColor: theme.primary }]}
                >
                  <Ionicons name="add" size={20} color={theme.surface} />
                  <Text style={[styles.emptyButtonText, { color: theme.surface }]}>
                    Criar Meta
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            activeProjections.map((projection) => (
              <GoalProgressCard
                key={projection.goal.id}
                projection={projection}
                onPress={(projection) => {
                  router.push({
                    pathname: "/finance/edit-goal",
                    params: { id: projection.goal.id },
                  });
                }}
              />
            ))
          )}
        </View>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Metas Concluídas
            </Text>
            {completedGoals.map((goal) => {
              const projection = {
                goal,
                progressPercentage: 100,
                remainingAmount: 0,
                daysUntilTarget: 0,
                isOnTrack: true,
                projectedCompletionDate: goal.completed_at || null,
                requiredMonthlySavings: 0,
              };
              return (
                <GoalProgressCard
                  key={goal.id}
                  projection={projection}
                  onPress={(projection) => {
                    router.push({
                      pathname: "/finance/edit-goal",
                      params: { id: projection.goal.id },
                    });
                  }}
                />
              );
            })}
          </View>
        )}

        {/* Cancelled Goals */}
        {cancelledGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Metas Canceladas
            </Text>
            {cancelledGoals.map((goal) => {
              const projection = {
                goal,
                progressPercentage: (Number(goal.current_amount) / Number(goal.target_amount)) * 100,
                remainingAmount: Number(goal.target_amount) - Number(goal.current_amount),
                daysUntilTarget: 0,
                isOnTrack: false,
                projectedCompletionDate: null,
                requiredMonthlySavings: 0,
              };
              return (
                <GoalProgressCard
                  key={goal.id}
                  projection={projection}
                  onPress={(projection) => {
                    router.push({
                      pathname: "/finance/edit-goal",
                      params: { id: projection.goal.id },
                    });
                  }}
                />
              );
            })}
          </View>
        )}
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
