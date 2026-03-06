import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { Loading } from "@/components/shared";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/stores/financeStore";
import type { Transaction, User } from "@/types";

interface TransactionWithSplit extends Transaction {
  split_amount?: number;
}

export default function MemberHistoryScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const { theme } = useTheme();
  const { household } = useAuthStore();

  const [member, setMember] = useState<User | null>(null);
  const [transactionsPaid, setTransactionsPaid] = useState<Transaction[]>([]);
  const [transactionsOwed, setTransactionsOwed] = useState<TransactionWithSplit[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (household?.id && memberId) {
      loadData();
    }
  }, [household?.id, memberId]);

  const loadData = async () => {
    if (!household?.id || !memberId) return;

    setIsLoading(true);

    try {
      // Fetch member details
      const { data: memberData, error: memberError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", memberId)
        .single();

      if (memberError) {
        console.error("Error fetching member:", memberError);
      } else {
        setMember(memberData);
      }

      // Get current month range
      const currentMonth = new Date().toISOString().slice(0, 7);
      const startDate = `${currentMonth}-01`;
      const endDate = `${currentMonth}-31`;

      // Fetch transactions paid by this member
      const { data: paidData, error: paidError } = await supabase
        .from("transactions")
        .select(`
          *,
          category:finance_categories(*)
        `)
        .eq("household_id", household.id)
        .eq("paid_by", memberId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (paidError) {
        console.error("Error fetching paid transactions:", paidError);
      } else {
        setTransactionsPaid(paidData || []);
        const total = (paidData || []).reduce(
          (sum, t) => sum + Number(t.amount),
          0
        );
        setTotalPaid(total);
      }

      // Fetch transactions this member owes (through splits)
      const { data: splitsData, error: splitsError } = await supabase
        .from("transaction_splits")
        .select(`
          *,
          transaction:transactions(
            *,
            category:finance_categories(*)
          )
        `)
        .eq("member_id", memberId);

      if (splitsError) {
        console.error("Error fetching transaction splits:", splitsError);
      } else {
        // Filter splits for current month and transform to TransactionWithSplit
        const owedTransactions = (splitsData || [])
          .filter((split: any) => {
            const txDate = split.transaction?.date;
            return txDate && txDate >= startDate && txDate <= endDate;
          })
          .map((split: any) => ({
            ...split.transaction,
            split_amount: split.share_amount,
          }));

        setTransactionsOwed(owedTransactions);
        const total = owedTransactions.reduce(
          (sum, t) => sum + Number(t.split_amount || 0),
          0
        );
        setTotalOwed(total);
      }
    } catch (error) {
      console.error("Error loading member history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [household?.id, memberId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const renderTransactionItem = (
    transaction: TransactionWithSplit,
    isPaid: boolean
  ) => {
    const isExpense = transaction.type === "expense";
    const categoryColor =
      transaction.category?.color ||
      (isExpense ? theme.danger : theme.success);
    const displayAmount = isPaid
      ? transaction.amount
      : transaction.split_amount || transaction.amount;

    return (
      <View
        key={transaction.id}
        style={[styles.transactionItem, { backgroundColor: theme.surface }]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: categoryColor + "20" },
          ]}
        >
          <Ionicons
            name={
              (transaction.category?.icon ||
                (isExpense
                  ? "arrow-down"
                  : "arrow-up")) as keyof typeof Ionicons.glyphMap
            }
            size={20}
            color={categoryColor}
          />
        </View>

        <View style={styles.transactionContent}>
          <Text
            style={[styles.transactionDescription, { color: theme.text }]}
            numberOfLines={1}
          >
            {transaction.description}
          </Text>
          <View style={styles.transactionMeta}>
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              {formatDate(transaction.date)}
            </Text>
            {transaction.category && (
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {" "}
                • {transaction.category.name}
              </Text>
            )}
          </View>
        </View>

        <Text
          style={[
            styles.transactionAmount,
            { color: isPaid ? theme.danger : theme.warning },
          ]}
        >
          {formatCurrency(Number(displayAmount))}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Carregando...
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <Loading />
      </SafeAreaView>
    );
  }

  const balance = totalPaid - totalOwed;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {member?.name || "Membro"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceContainer}>
          <Card
            style={{
              ...styles.balanceCard,
              backgroundColor:
                balance > 0
                  ? theme.success
                  : balance < 0
                  ? theme.danger
                  : theme.primary,
            }}
          >
            <Text
              style={[styles.balanceLabel, { color: theme.surface + "B0" }]}
            >
              Saldo
            </Text>
            <Text style={[styles.balanceValue, { color: theme.surface }]}>
              {formatCurrency(balance)}
            </Text>
            <View style={styles.balanceDetails}>
              <View style={styles.balanceDetailRow}>
                <Ionicons
                  name="arrow-up-circle"
                  size={16}
                  color={theme.surface}
                />
                <Text
                  style={[styles.balanceDetailText, { color: theme.surface }]}
                >
                  Pagou: {formatCurrency(totalPaid)}
                </Text>
              </View>
              <View style={styles.balanceDetailRow}>
                <Ionicons
                  name="arrow-down-circle"
                  size={16}
                  color={theme.surface}
                />
                <Text
                  style={[styles.balanceDetailText, { color: theme.surface }]}
                >
                  Deve: {formatCurrency(totalOwed)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Transactions Paid Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Transacoes Pagas
            </Text>
            <View
              style={[styles.badge, { backgroundColor: theme.danger + "20" }]}
            >
              <Text style={[styles.badgeText, { color: theme.danger }]}>
                {transactionsPaid.length}
              </Text>
            </View>
          </View>

          {transactionsPaid.length === 0 ? (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons
                  name="wallet-outline"
                  size={48}
                  color={theme.textMuted}
                />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Nenhuma transacao paga neste mes
                </Text>
              </View>
            </Card>
          ) : (
            <View>
              {transactionsPaid.map((transaction) =>
                renderTransactionItem(transaction, true)
              )}
            </View>
          )}
        </View>

        {/* Transactions Owed Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Transacoes Devidas
            </Text>
            <View
              style={[styles.badge, { backgroundColor: theme.warning + "20" }]}
            >
              <Text style={[styles.badgeText, { color: theme.warning }]}>
                {transactionsOwed.length}
              </Text>
            </View>
          </View>

          {transactionsOwed.length === 0 ? (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={48}
                  color={theme.textMuted}
                />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Nenhuma transacao devida neste mes
                </Text>
              </View>
            </Card>
          ) : (
            <View>
              {transactionsOwed.map((transaction) =>
                renderTransactionItem(transaction, false)
              )}
            </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  balanceContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  balanceCard: {
    padding: 24,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
  },
  balanceDetails: {
    flexDirection: "row",
    gap: 16,
  },
  balanceDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceDetailText: {
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  transactionItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontWeight: "500",
  },
  transactionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
});
