import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GoalProjection } from "@/stores/financeStore";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCurrency } from "@/stores/financeStore";

interface GoalProgressCardProps {
  projection: GoalProjection;
  onPress?: (projection: GoalProjection) => void;
}

export function GoalProgressCard({ projection, onPress }: GoalProgressCardProps) {
  const { theme } = useTheme();
  const { goal, progressPercentage, remainingAmount, daysUntilTarget, isOnTrack, projectedCompletionDate, requiredMonthlySavings } = projection;

  const goalColor = goal.color || theme.primary;
  const goalIcon = goal.icon || "flag-outline";

  const getStatusConfig = () => {
    if (goal.status === "completed") {
      return {
        bg: theme.successLight,
        text: theme.success,
        label: "Concluído",
        icon: "checkmark-circle" as const,
        iconColor: theme.success,
        progressColor: theme.success,
      };
    }

    if (goal.status === "cancelled") {
      return {
        bg: theme.gray[200],
        text: theme.textMuted,
        label: "Cancelado",
        icon: "close-circle" as const,
        iconColor: theme.textMuted,
        progressColor: theme.textMuted,
      };
    }

    // In progress - check if on track
    if (isOnTrack) {
      return {
        bg: theme.successLight,
        text: theme.success,
        label: "No prazo",
        icon: "trending-up" as const,
        iconColor: theme.success,
        progressColor: theme.success,
      };
    } else {
      return {
        bg: theme.warningLight,
        text: theme.warning,
        label: "Atrasado",
        icon: "alert-circle" as const,
        iconColor: theme.warning,
        progressColor: theme.warning,
      };
    }
  };

  const statusConfig = getStatusConfig();

  // Clamp percentage between 0 and 100 for display
  const displayPercentage = Math.min(Math.max(progressPercentage, 0), 100);

  // Format target date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format days remaining
  const formatDaysRemaining = (days: number) => {
    if (days < 0) {
      return `${Math.abs(days)} dias atrasado`;
    } else if (days === 0) {
      return "Hoje";
    } else if (days === 1) {
      return "1 dia restante";
    } else if (days < 30) {
      return `${days} dias restantes`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} ${months === 1 ? 'mês' : 'meses'} restantes`;
    } else {
      const years = Math.floor(days / 365);
      return `${years} ${years === 1 ? 'ano' : 'anos'} restantes`;
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(projection)}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: theme.surface }]}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Goal Icon */}
        <View style={[styles.iconContainer, { backgroundColor: goalColor + "20" }]}>
          <Ionicons
            name={goalIcon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={goalColor}
          />
        </View>

        {/* Goal Name and Status */}
        <View style={styles.headerContent}>
          <Text style={[styles.goalName, { color: theme.text }]}>{goal.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.iconColor} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Percentage */}
        <Text style={[styles.percentage, { color: statusConfig.text }]}>
          {Math.round(progressPercentage)}%
        </Text>
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
          <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Atual</Text>
          <Text style={[styles.amountValue, { color: theme.text }]}>
            {formatCurrency(goal.current_amount)}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Meta</Text>
          <Text style={[styles.amountValue, { color: theme.text }]}>
            {formatCurrency(goal.target_amount)}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Faltam</Text>
          <Text style={[styles.amountValue, { color: goalColor }]}>
            {formatCurrency(remainingAmount)}
          </Text>
        </View>
      </View>

      {/* Target Date and Projection */}
      {goal.status === "in_progress" && (
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              Meta: {formatDate(goal.target_date)}
            </Text>
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              • {formatDaysRemaining(daysUntilTarget)}
            </Text>
          </View>

          {projectedCompletionDate && (
            <View style={styles.metaRow}>
              <Ionicons name="trending-up" size={14} color={theme.textMuted} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                Projeção: {formatDate(projectedCompletionDate)}
              </Text>
            </View>
          )}

          {requiredMonthlySavings > 0 && (
            <View style={styles.metaRow}>
              <Ionicons name="wallet-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                Necessário: {formatCurrency(requiredMonthlySavings)}/mês
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Completed Date */}
      {goal.status === "completed" && goal.completed_at && (
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Ionicons name="checkmark-circle" size={14} color={theme.success} />
            <Text style={[styles.metaText, { color: theme.success }]}>
              Concluído em {formatDate(goal.completed_at)}
            </Text>
          </View>
        </View>
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
  goalName: {
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
    marginBottom: 12,
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
  metaContainer: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 13,
    marginLeft: 6,
  },
});
