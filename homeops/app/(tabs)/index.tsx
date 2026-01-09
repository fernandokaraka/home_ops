import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useTaskStore, getTasksForToday, getOverdueTasks } from "@/stores/taskStore";
import {
  useMaintenanceStore,
  getUpcomingMaintenance,
  getOverdueMaintenance,
  getDaysUntilMaintenance,
} from "@/stores/maintenanceStore";
import {
  useFinanceStore,
  formatCurrency,
  getPendingBills,
  getOverdueBills,
} from "@/stores/financeStore";
import { Card } from "@/components/ui";
import { useTheme } from "@/contexts/ThemeContext";

interface QuickStatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}

function QuickStatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  onPress,
}: QuickStatCardProps) {
  const { theme } = useTheme();
  return (
    <Card variant="elevated" onPress={onPress} style={styles.quickStatCard}>
      <View style={styles.quickStatHeader}>
        <View style={[styles.quickStatIcon, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.quickStatTitle, { color: theme.textSecondary }]}>{title}</Text>
      </View>
      <Text style={[styles.quickStatValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.quickStatSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
    </Card>
  );
}

export default function DashboardScreen() {
  const { user, household, signOut } = useAuthStore();
  const { tasks, fetchTasks, completeTask } = useTaskStore();
  const { items: maintenanceItems, fetchItems: fetchMaintenanceItems } = useMaintenanceStore();
  const {
    bills,
    transactions,
    monthlySummary,
    fetchBills,
    fetchTransactions,
    calculateMonthlySummary,
  } = useFinanceStore();
  const router = useRouter();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (household?.id) {
      fetchTasks(household.id);
      fetchMaintenanceItems(household.id);
      fetchBills(household.id);
      fetchTransactions(household.id);
      calculateMonthlySummary(household.id);
    }
  }, [household?.id]);

  const onRefresh = useCallback(async () => {
    if (!household?.id) return;
    setRefreshing(true);
    await Promise.all([
      fetchTasks(household.id),
      fetchMaintenanceItems(household.id),
      fetchBills(household.id),
      fetchTransactions(household.id),
      calculateMonthlySummary(household.id),
    ]);
    setRefreshing(false);
  }, [household?.id]);

  const handleCompleteTask = async (taskId: string) => {
    if (!user?.id) return;
    await completeTask(taskId, user.id);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getFirstName = () => {
    return user?.name?.split(" ")[0] || "Usuario";
  };

  const todayTasks = getTasksForToday(tasks);
  const overdueTasksCount = getOverdueTasks(tasks).length;
  const upcomingMaintenance = getUpcomingMaintenance(maintenanceItems, 30);
  const overdueMaintenance = getOverdueMaintenance(maintenanceItems);
  const pendingBills = getPendingBills(bills);
  const overdueBillsCount = getOverdueBills(bills).length;
  const pendingBillsTotal = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
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
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <View style={styles.headerRow}>
            <View style={styles.flex1}>
              <Text style={[styles.greetingText, { color: theme.textSecondary }]}>{getGreeting()},</Text>
              <Text style={[styles.nameText, { color: theme.text }]}>
                {getFirstName()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={[styles.settingsButton, { backgroundColor: theme.surfaceVariant }]}
            >
              <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Household Card */}
          <View style={[styles.householdCard, { backgroundColor: theme.primaryLight }]}>
            <View style={[styles.householdIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="home" size={24} color={theme.surface} />
            </View>
            <View style={styles.householdInfo}>
              <Text style={[styles.householdName, { color: theme.text }]}>
                {household?.name || "Minha Casa"}
              </Text>
              <Text style={[styles.householdCode, { color: theme.textSecondary }]}>
                Codigo: {household?.invite_code || "---"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </View>
        </View>

        <View style={styles.content}>
          {/* Quick Stats */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Resumo
          </Text>
          <View style={styles.statsGrid}>
            <QuickStatCard
              title="Tarefas Hoje"
              value={todayTasks.length}
              subtitle="pendentes"
              icon="checkbox-outline"
              color={theme.primary}
              onPress={() => router.push("/(tabs)/tasks")}
            />
            <QuickStatCard
              title="Manutencoes"
              value={upcomingMaintenance.length}
              subtitle="proximas"
              icon="build-outline"
              color={upcomingMaintenance.length > 0 ? theme.warning : theme.gray[400]}
              onPress={() => router.push("/(tabs)/maintenance")}
            />
            <QuickStatCard
              title="Contas"
              value={formatCurrency(pendingBillsTotal)}
              subtitle={`${pendingBills.length} pendente${pendingBills.length !== 1 ? "s" : ""}`}
              icon="wallet-outline"
              color={overdueBillsCount > 0 ? theme.danger : pendingBills.length > 0 ? theme.warning : theme.success}
              onPress={() => router.push("/(tabs)/finances")}
            />
            <QuickStatCard
              title="Atencao"
              value={overdueTasksCount + overdueMaintenance.length + overdueBillsCount}
              subtitle="atrasados"
              icon="alert-circle-outline"
              color={overdueTasksCount + overdueMaintenance.length + overdueBillsCount > 0 ? theme.danger : theme.gray[400]}
            />
          </View>

          {/* Today's Tasks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleSmall, { color: theme.text }]}>
                Tarefas de Hoje
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/tasks")}>
                <Text style={[styles.linkText, { color: theme.primary }]}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {todayTasks.length === 0 ? (
              <Card>
                <View style={styles.emptyState}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={48}
                    color={theme.textMuted}
                  />
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    Nenhuma tarefa para hoje
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/task/new")}
                    style={styles.addButton}
                  >
                    <Text style={[styles.linkText, { color: theme.primary }]}>
                      + Adicionar tarefa
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : (
              <View>
                {todayTasks.slice(0, 5).map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => router.push(`/task/${task.id}`)}
                    style={[styles.taskItem, { backgroundColor: theme.surface }]}
                  >
                    <TouchableOpacity
                      onPress={() => handleCompleteTask(task.id)}
                      style={[styles.taskCheckbox, { borderColor: theme.border }]}
                    />
                    <View style={styles.flex1}>
                      <Text style={[styles.taskTitle, { color: theme.text }]}>
                        {task.title}
                      </Text>
                      {task.category && (
                        <Text
                          style={[styles.taskCategory, { color: task.category.color }]}
                        >
                          {task.category.name}
                        </Text>
                      )}
                    </View>
                    {task.priority === 3 && (
                      <Ionicons name="flag" size={16} color={theme.danger} />
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.textMuted}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                ))}
                {todayTasks.length > 5 && (
                  <TouchableOpacity
                    onPress={() => router.push("/(tabs)/tasks")}
                    style={styles.viewMoreButton}
                  >
                    <Text style={[styles.linkText, { color: theme.primary }]}>
                      Ver mais {todayTasks.length - 5} tarefas
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Upcoming Maintenance */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleSmall, { color: theme.text }]}>
                Proximas Manutencoes
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/maintenance")}>
                <Text style={[styles.linkText, { color: theme.primary }]}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {upcomingMaintenance.length === 0 && overdueMaintenance.length === 0 ? (
              <Card>
                <View style={styles.emptyState}>
                  <Ionicons
                    name="construct-outline"
                    size={48}
                    color={theme.textMuted}
                  />
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    Nenhuma manutencao agendada
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/maintenance/new")}
                    style={styles.addButton}
                  >
                    <Text style={[styles.linkText, { color: theme.primary }]}>
                      + Cadastrar item
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : (
              <View>
                {/* Overdue items first */}
                {overdueMaintenance.slice(0, 2).map((item) => {
                  const days = getDaysUntilMaintenance(item.next_maintenance_date);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => router.push(`/maintenance/${item.id}`)}
                      style={[styles.overdueItem, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}
                    >
                      <View
                        style={[styles.itemIcon, { backgroundColor: (item.category?.color || theme.danger) + "30" }]}
                      >
                        <Ionicons
                          name={(item.category?.icon || "construct-outline") as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={item.category?.color || theme.danger}
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>{item.name}</Text>
                        <Text style={[styles.overdueText, { color: theme.danger }]}>
                          {days ? `${Math.abs(days)} dias atrasado` : "Atrasado"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                  );
                })}

                {/* Upcoming items */}
                {upcomingMaintenance.slice(0, 3 - overdueMaintenance.length).map((item) => {
                  const days = getDaysUntilMaintenance(item.next_maintenance_date);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => router.push(`/maintenance/${item.id}`)}
                      style={[styles.listItem, { backgroundColor: theme.surface }]}
                    >
                      <View
                        style={[styles.itemIcon, { backgroundColor: (item.category?.color || theme.primary) + "20" }]}
                      >
                        <Ionicons
                          name={(item.category?.icon || "construct-outline") as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={item.category?.color || theme.primary}
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>{item.name}</Text>
                        <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                          {days === 0 ? "Hoje" : days === 1 ? "Amanha" : `Em ${days} dias`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Financial Summary */}
          <View style={styles.lastSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleSmall, { color: theme.text }]}>
                Financeiro do Mes
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/finances")}>
                <Text style={[styles.linkText, { color: theme.primary }]}>Ver detalhes</Text>
              </TouchableOpacity>
            </View>

            <Card>
              <View style={styles.financeRow}>
                <View>
                  <Text style={[styles.financeLabel, { color: theme.textSecondary }]}>Receitas</Text>
                  <Text style={[styles.incomeValue, { color: theme.success }]}>
                    {formatCurrency(monthlySummary?.total_income || 0)}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.financeLabel, { color: theme.textSecondary }]}>Despesas</Text>
                  <Text style={[styles.expenseValue, { color: theme.danger }]}>
                    {formatCurrency(monthlySummary?.total_expenses || 0)}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.financeLabel, { color: theme.textSecondary }]}>Saldo</Text>
                  <Text
                    style={[
                      styles.balanceValue,
                      { color: (monthlySummary?.balance || 0) < 0 ? theme.danger : theme.text }
                    ]}
                  >
                    {formatCurrency(monthlySummary?.balance || 0)}
                  </Text>
                </View>
              </View>
              {/* Progress bar showing expense ratio */}
              <View style={[styles.progressBar, { backgroundColor: theme.surfaceVariant }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        monthlySummary?.total_income
                          ? Math.min(
                              100,
                              ((monthlySummary?.total_expenses || 0) / monthlySummary.total_income) * 100
                            )
                          : 0
                      }%`,
                      backgroundColor: (monthlySummary?.total_income || 0) > 0 &&
                        (monthlySummary?.total_expenses || 0) / (monthlySummary?.total_income || 1) > 0.8
                          ? theme.danger
                          : theme.primary
                    }
                  ]}
                />
              </View>
              <Text style={[styles.transactionText, { color: theme.textMuted }]}>
                {transactions.length === 0
                  ? "Nenhuma transacao registrada"
                  : `${transactions.length} transaco${transactions.length !== 1 ? "es" : ""} este mes`}
              </Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  householdIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdInfo: {
    marginLeft: 16,
    flex: 1,
  },
  householdName: {
    fontWeight: '600',
    fontSize: 18,
  },
  householdCode: {
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickStatCard: {
    flex: 1,
    minWidth: '45%',
    margin: 4,
  },
  quickStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatTitle: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickStatSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginTop: 32,
  },
  lastSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleSmall: {
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 16,
  },
  taskItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskTitle: {
    fontWeight: '500',
  },
  taskCategory: {
    fontSize: 14,
    marginTop: 4,
  },
  viewMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  listItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 14,
  },
  overdueText: {
    fontSize: 14,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  financeLabel: {
    fontSize: 14,
  },
  incomeValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  expenseValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  transactionText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
