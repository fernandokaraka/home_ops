import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BudgetAlert } from "@/stores/financeStore";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCurrency } from "@/stores/financeStore";

interface BudgetProgressCardProps {
  alert: BudgetAlert;
  onPress?: (alert: BudgetAlert) => void;
}

export function BudgetProgressCard({ alert, onPress }: BudgetProgressCardProps) {
  const { theme } = useTheme();
  const { budget, spent, limit, percentageUsed, remaining, status } = alert;

  const categoryColor = budget.category?.color || theme.textMuted;
  const categoryName = budget.category?.name || "Outros";
  const categoryIcon = budget.category?.icon || "receipt-outline";

  const getStatusConfig = () => {
    switch (status) {
      case "ok":
        return {
          bg: theme.successLight,
          text: theme.success,
          label: "No limite",
          icon: "checkmark-circle" as const,
          iconColor: theme.success,
          progressColor: theme.success,
        };
      case "warning":
        return {
          bg: theme.warningLight,
          text: theme.warning,
          label: "Atenção",
          icon: "alert-circle" as const,
          iconColor: theme.warning,
          progressColor: theme.warning,
        };
      case "danger":
        return {
          bg: theme.dangerLight,
          text: theme.danger,
          label: "Excedido",
          icon: "close-circle" as const,
          iconColor: theme.danger,
          progressColor: theme.danger,
        };
      default:
        return {
          bg: theme.gray[100],
          text: theme.textMuted,
          label: "Desconhecido",
          icon: "help-circle-outline" as const,
          iconColor: theme.textMuted,
          progressColor: theme.textMuted,
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Clamp percentage between 0 and 100 for display
  const displayPercentage = Math.min(Math.max(percentageUsed, 0), 100);

  // Show over 100% if exceeded
  const percentageLabel = percentageUsed > 100 ? `${Math.round(percentageUsed)}%` : `${Math.round(displayPercentage)}%`;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(alert)}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: theme.surface }]}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
          <Ionicons
            name={categoryIcon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={categoryColor}
          />
        </View>

        {/* Category Name and Status */}
        <View style={styles.headerContent}>
          <Text style={[styles.categoryName, { color: theme.text }]}>{categoryName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.iconColor} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Percentage */}
        <Text style={[styles.percentage, { color: statusConfig.text }]}>{percentageLabel}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBackground, { backgroundColor: theme.gray[200] }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: statusConfig.progressColor,
                width: `${displayPercentage}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Amounts */}
      <View style={styles.amountsRow}>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Gasto</Text>
          <Text style={[styles.amountValue, { color: theme.text }]}>{formatCurrency(spent)}</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Limite</Text>
          <Text style={[styles.amountValue, { color: theme.text }]}>{formatCurrency(limit)}</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: theme.textMuted }]}>
            {remaining >= 0 ? "Restante" : "Excedente"}
          </Text>
          <Text
            style={[
              styles.amountValue,
              { color: remaining >= 0 ? theme.success : theme.danger },
            ]}
          >
            {formatCurrency(Math.abs(remaining))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountItem: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
