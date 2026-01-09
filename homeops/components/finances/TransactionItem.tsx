import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Transaction } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCurrency } from "@/stores/financeStore";

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const { theme } = useTheme();
  const isExpense = transaction.type === "expense";
  const categoryColor = transaction.category?.color || (isExpense ? theme.danger : theme.success);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(transaction)}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: theme.surface }]}
    >
      {/* Category Icon */}
      <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
        <Ionicons
          name={(transaction.category?.icon || (isExpense ? "arrow-down" : "arrow-up")) as keyof typeof Ionicons.glyphMap}
          size={20}
          color={categoryColor}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.description, { color: theme.text }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: theme.textMuted }]}>{formatDate(transaction.date)}</Text>
          {transaction.category && (
            <Text style={[styles.metaText, { color: theme.textMuted }]}> • {transaction.category.name}</Text>
          )}
        </View>
      </View>

      {/* Amount */}
      <Text style={[styles.amount, { color: isExpense ? theme.danger : theme.success }]}>
        {isExpense ? "-" : "+"} {formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  description: {
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
