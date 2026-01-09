import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { BillItem, TransactionItem } from "@/components/finances";
import { Loading } from "@/components/shared";
import {
  useFinanceStore,
  formatCurrency,
  getPendingBills,
  getPaidBills,
  getOverdueBills,
  getTotalBillsAmount,
  getExpensesByCategory,
} from "@/stores/financeStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";

type TabFilter = "overview" | "bills" | "transactions";

export default function FinancesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { household } = useAuthStore();
  const {
    bills,
    transactions,
    monthlySummary,
    fetchBills,
    fetchTransactions,
    fetchCategories,
    calculateMonthlySummary,
    markBillAsPaid,
    isLoading,
  } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<TabFilter>("overview");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (household?.id) {
      loadData();
    }
  }, [household?.id]);

  const loadData = async () => {
    if (!household?.id) return;
    await Promise.all([
      fetchBills(household.id),
      fetchTransactions(household.id),
      fetchCategories(),
      calculateMonthlySummary(household.id),
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [household?.id]);

  const handleMarkPaid = async (bill: typeof bills[0]) => {
    Alert.alert(
      "Marcar como pago",
      `Confirma o pagamento de ${formatCurrency(bill.amount)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            const { error } = await markBillAsPaid(bill.id);
            if (error) Alert.alert("Erro", error);
          },
        },
      ]
    );
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "overview", label: "Resumo" },
    { key: "bills", label: "Contas" },
    { key: "transactions", label: "Lancamentos" },
  ];

  const currentMonth = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const pendingBills = getPendingBills(bills);
  const paidBills = getPaidBills(bills);
  const overdueBills = getOverdueBills(bills);
  const totalBills = getTotalBillsAmount(bills);
  const expensesByCategory = getExpensesByCategory(transactions);

  const renderOverview = () => (
    <>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Card style={[styles.summaryCard, styles.summaryCardLeft, { backgroundColor: theme.success + '15' }]}>
          <View style={styles.summaryContent}>
            <Ionicons name="trending-up" size={28} color={theme.success} />
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Receitas</Text>
            <Text style={[styles.summaryValue, { color: theme.success }]}>
              {formatCurrency(monthlySummary?.total_income || 0)}
            </Text>
          </View>
        </Card>
        <Card style={[styles.summaryCard, styles.summaryCardRight, { backgroundColor: theme.danger + '15' }]}>
          <View style={styles.summaryContent}>
            <Ionicons name="trending-down" size={28} color={theme.danger} />
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Despesas</Text>
            <Text style={[styles.summaryValue, { color: theme.danger }]}>
              {formatCurrency(monthlySummary?.total_expenses || 0)}
            </Text>
          </View>
        </Card>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceContainer}>
        <Card style={{ backgroundColor: theme.primary }}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={[styles.balanceLabel, { color: theme.surface + 'B0' }]}>Saldo do Mes</Text>
              <Text style={[styles.balanceValue, { color: theme.surface }]}>
                {formatCurrency(monthlySummary?.balance || 0)}
              </Text>
            </View>
            <View style={styles.balanceIcon}>
              <Ionicons name="wallet" size={32} color={theme.surface} />
            </View>
          </View>
        </Card>
      </View>

      {/* Bills Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contas do Mes</Text>
          <TouchableOpacity onPress={() => setActiveTab("bills")}>
            <Text style={[styles.linkText, { color: theme.primary }]}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <View style={styles.billsStatsRow}>
            <View style={styles.billsStat}>
              <Text style={[styles.billsStatValue, { color: theme.text }]}>{bills.length}</Text>
              <Text style={[styles.billsStatLabel, { color: theme.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.billsStat}>
              <Text style={[styles.billsStatValue, { color: theme.success }]}>{paidBills.length}</Text>
              <Text style={[styles.billsStatLabel, { color: theme.textSecondary }]}>Pagas</Text>
            </View>
            <View style={styles.billsStat}>
              <Text style={[styles.billsStatValue, { color: theme.warning }]}>{pendingBills.length}</Text>
              <Text style={[styles.billsStatLabel, { color: theme.textSecondary }]}>Pendentes</Text>
            </View>
            <View style={styles.billsStat}>
              <Text style={[styles.billsStatValue, { color: theme.danger }]}>{overdueBills.length}</Text>
              <Text style={[styles.billsStatLabel, { color: theme.textSecondary }]}>Vencidas</Text>
            </View>
          </View>

          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View
              style={[styles.progressSegment, { backgroundColor: theme.success, width: `${bills.length > 0 ? (paidBills.length / bills.length) * 100 : 0}%` }]}
            />
            <View
              style={[styles.progressSegment, { backgroundColor: theme.warning, width: `${bills.length > 0 ? (pendingBills.length / bills.length) * 100 : 0}%` }]}
            />
            <View
              style={[styles.progressSegment, { backgroundColor: theme.danger, width: `${bills.length > 0 ? (overdueBills.length / bills.length) * 100 : 0}%` }]}
            />
          </View>

          <Text style={[styles.totalText, { color: theme.textSecondary }]}>
            Total em contas: {formatCurrency(totalBills)}
          </Text>
        </Card>
      </View>

      {/* Expenses by Category */}
      {expensesByCategory.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Despesas por Categoria</Text>
          <Card>
            {expensesByCategory.slice(0, 5).map((item, index) => (
              <View
                key={item.name}
                style={[
                  styles.categoryRow,
                  index < expensesByCategory.length - 1 && [styles.categoryRowBorder, { borderBottomColor: theme.surfaceVariant }]
                ]}
              >
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.categoryName, { color: theme.text }]}>{item.name}</Text>
                </View>
                <Text style={[styles.categoryTotal, { color: theme.text }]}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.lastSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ultimos Lancamentos</Text>
          <TouchableOpacity onPress={() => setActiveTab("transactions")}>
            <Text style={[styles.linkText, { color: theme.primary }]}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum lancamento este mes</Text>
            </View>
          </Card>
        ) : (
          transactions.slice(0, 5).map((t) => (
            <TransactionItem key={t.id} transaction={t} onPress={(tr) => router.push(`/finance/edit-transaction?id=${tr.id}`)} />
          ))
        )}
      </View>
    </>
  );

  const renderBills = () => (
    <View style={styles.listContainer}>
      {/* Overdue Warning */}
      {overdueBills.length > 0 && (
        <View style={[styles.warningCard, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}>
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle" size={24} color={theme.danger} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: theme.danger }]}>
                {overdueBills.length} conta{overdueBills.length !== 1 ? "s" : ""} vencida{overdueBills.length !== 1 ? "s" : ""}
              </Text>
              <Text style={[styles.warningText, { color: theme.danger }]}>Regularize para evitar juros</Text>
            </View>
          </View>
        </View>
      )}

      {bills.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="receipt-outline" size={40} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhuma conta cadastrada</Text>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
              Cadastre suas contas fixas para acompanhar vencimentos
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/finance/new-bill")}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="add" size={20} color={theme.surface} />
              <Text style={[styles.primaryButtonText, { color: theme.surface }]}>Adicionar Conta</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        bills.map((bill) => (
          <BillItem key={bill.id} bill={bill} onPress={(b) => router.push(`/finance/edit-bill?id=${b.id}`)} onMarkPaid={handleMarkPaid} />
        ))
      )}

      <View style={styles.bottomSpacer} />
    </View>
  );

  const renderTransactions = () => (
    <View style={styles.listContainer}>
      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          onPress={() => router.push("/finance/new-transaction?type=income")}
          style={[styles.quickAction, styles.quickActionIncome, { backgroundColor: theme.success + '15', borderColor: theme.success + '40' }]}
        >
          <Ionicons name="add-circle" size={28} color={theme.success} />
          <Text style={[styles.quickActionIncomeText, { color: theme.success }]}>Receita</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/finance/new-transaction?type=expense")}
          style={[styles.quickAction, styles.quickActionExpense, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}
        >
          <Ionicons name="remove-circle" size={28} color={theme.danger} />
          <Text style={[styles.quickActionExpenseText, { color: theme.danger }]}>Despesa</Text>
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="swap-vertical-outline" size={40} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhum lancamento</Text>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
              Registre suas receitas e despesas
            </Text>
          </View>
        </Card>
      ) : (
        transactions.map((t) => <TransactionItem key={t.id} transaction={t} onPress={(tr) => router.push(`/finance/edit-transaction?id=${tr.id}`)} />)
      )}

      <View style={styles.bottomSpacer} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.surfaceVariant }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Financas</Text>
          <TouchableOpacity
            onPress={() => router.push("/finance/new-bill")}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={28} color={theme.surface} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.monthText, { color: theme.textSecondary }]}>{currentMonth}</Text>

        {/* Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: theme.surfaceVariant }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, activeTab === tab.key && [styles.tabActive, { backgroundColor: theme.surface }]]}
            >
              <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === tab.key && { color: theme.primary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading && bills.length === 0 && transactions.length === 0 ? (
        <Loading message="Carregando dados..." />
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
          {activeTab === "overview" && renderOverview()}
          {activeTab === "bills" && renderBills()}
          {activeTab === "transactions" && renderTransactions()}
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
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    textTransform: 'capitalize',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    flex: 1,
  },
  summaryCardLeft: {
    marginRight: 8,
  },
  summaryCardRight: {
    marginLeft: 8,
  },
  summaryContent: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 4,
  },
  balanceIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  lastSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    fontWeight: '500',
  },
  billsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  billsStat: {
    alignItems: 'center',
    flex: 1,
  },
  billsStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  billsStatLabel: {
    fontSize: 14,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressSegment: {
    height: '100%',
  },
  totalText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
  },
  categoryTotal: {
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 12,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  warningCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  quickActionsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIncome: {
    borderWidth: 1,
    marginRight: 8,
  },
  quickActionExpense: {
    borderWidth: 1,
    marginLeft: 8,
  },
  quickActionIncomeText: {
    fontWeight: '500',
    marginTop: 8,
  },
  quickActionExpenseText: {
    fontWeight: '500',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 80,
  },
});
