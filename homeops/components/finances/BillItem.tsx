import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Bill } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCurrency } from "@/stores/financeStore";

interface BillItemProps {
  bill: Bill;
  onPress?: (bill: Bill) => void;
  onMarkPaid?: (bill: Bill) => void;
}

export function BillItem({ bill, onPress, onMarkPaid }: BillItemProps) {
  const { theme } = useTheme();
  const categoryColor = bill.category?.color || theme.textMuted;

  const getStatusConfig = () => {
    switch (bill.current_month_status) {
      case "pending":
        return {
          bg: theme.warningLight,
          text: theme.warning,
          label: "Pendente",
          icon: "time-outline" as const,
          iconColor: theme.warning,
        };
      case "paid":
        return {
          bg: theme.successLight,
          text: theme.success,
          label: "Pago",
          icon: "checkmark-circle" as const,
          iconColor: theme.success,
        };
      case "overdue":
        return {
          bg: theme.dangerLight,
          text: theme.danger,
          label: "Vencido",
          icon: "alert-circle" as const,
          iconColor: theme.danger,
        };
      default:
        return {
          bg: theme.gray[100],
          text: theme.textMuted,
          label: "Desconhecido",
          icon: "help-circle-outline" as const,
          iconColor: theme.textMuted,
        };
    }
  };

  const status = getStatusConfig();

  return (
    <TouchableOpacity
      onPress={() => onPress?.(bill)}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: theme.surface }]}
    >
      <View style={styles.row}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
          <Ionicons
            name={(bill.category?.icon || "receipt-outline") as keyof typeof Ionicons.glyphMap}
            size={24}
            color={categoryColor}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.name, { color: theme.text }]}>{bill.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>Dia {bill.due_day}</Text>
            {bill.auto_debit && (
              <View style={styles.autoDebit}>
                <Ionicons name="repeat" size={14} color={theme.primary} />
                <Text style={[styles.autoDebitText, { color: theme.primary }]}>Auto</Text>
              </View>
            )}
          </View>
        </View>

        {/* Amount & Status */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: theme.text }]}>{formatCurrency(bill.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.iconColor} />
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>
      </View>

      {/* Quick Pay Button */}
      {bill.current_month_status !== "paid" && onMarkPaid && (
        <TouchableOpacity
          onPress={() => onMarkPaid(bill)}
          style={[styles.payButton, { backgroundColor: theme.successLight, borderColor: theme.success + "40" }]}
        >
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <Text style={[styles.payButtonText, { color: theme.success }]}>Marcar como pago</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  row: {
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
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 4,
  },
  autoDebit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  autoDebitText: {
    fontSize: 14,
    marginLeft: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  payButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontWeight: '500',
    marginLeft: 8,
  },
});
