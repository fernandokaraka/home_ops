import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MemberBalance } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCurrency } from "@/stores/financeStore";

interface MemberBalanceSummaryProps {
  balances: MemberBalance[];
  onMemberPress?: (balance: MemberBalance) => void;
}

export function MemberBalanceSummary({ balances, onMemberPress }: MemberBalanceSummaryProps) {
  const { theme } = useTheme();

  if (balances.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="people-outline" size={48} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Nenhum membro encontrado
        </Text>
      </View>
    );
  }

  const getInitials = (name: string) => {
    if (!name || name.trim() === "") return "??";

    return name
      .split(" ")
      .filter(n => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  return (
    <View style={styles.container}>
      {balances.map((balance) => {
        const balanceColor = balance.balance >= 0 ? theme.success : theme.danger;
        const balanceIcon = balance.balance >= 0 ? "trending-up" : "trending-down";

        return (
          <TouchableOpacity
            key={balance.member.id}
            onPress={() => onMemberPress?.(balance)}
            activeOpacity={onMemberPress ? 0.7 : 1}
            style={[styles.memberCard, { backgroundColor: theme.surface }]}
          >
            <View style={styles.memberHeader}>
              {/* Avatar with Initials */}
              <View style={[styles.avatar, { backgroundColor: theme.primary + "20" }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>
                  {getInitials(balance.member.name)}
                </Text>
              </View>

              {/* Member Name */}
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: theme.text }]}>
                  {balance.member.name}
                </Text>
                {balance.member.email && (
                  <Text style={[styles.memberEmail, { color: theme.textMuted }]} numberOfLines={1}>
                    {balance.member.email}
                  </Text>
                )}
              </View>

              {/* Balance Indicator */}
              <View style={[styles.balanceIndicator, { backgroundColor: balanceColor + "15" }]}>
                <Ionicons name={balanceIcon} size={20} color={balanceColor} />
              </View>
            </View>

            {/* Financial Details */}
            <View style={styles.detailsContainer}>
              {/* Total Paid */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <Ionicons name="cash-outline" size={16} color={theme.success} />
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>Pagou</Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.success }]}>
                  {formatCurrency(balance.total_paid)}
                </Text>
              </View>

              {/* Total Owed */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <Ionicons name="card-outline" size={16} color={theme.warning} />
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>Deve</Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.warning }]}>
                  {formatCurrency(balance.total_owed)}
                </Text>
              </View>

              {/* Net Balance */}
              <View style={[styles.balanceRow, { backgroundColor: balanceColor + "10", borderColor: balanceColor + "30" }]}>
                <View style={styles.detailLabel}>
                  <Ionicons name="wallet-outline" size={16} color={balanceColor} />
                  <Text style={[styles.balanceLabel, { color: balanceColor }]}>Saldo</Text>
                </View>
                <Text style={[styles.balanceValue, { color: balanceColor }]}>
                  {formatCurrency(Math.abs(balance.balance))}
                </Text>
              </View>
            </View>

            {/* Tap indicator */}
            {onMemberPress && (
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  memberCard: {
    borderRadius: 16,
    padding: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  balanceIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  chevronContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
});
