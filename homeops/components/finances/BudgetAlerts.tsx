import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BudgetAlert } from "@/stores/financeStore";
import { formatCurrency } from "@/stores/financeStore";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";

interface BudgetAlertsProps {
  alerts: BudgetAlert[];
}

export function BudgetAlerts({ alerts }: BudgetAlertsProps) {
  const { theme } = useTheme();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(
    (alert) => !dismissedAlerts.has(alert.budget.id)
  );

  if (visibleAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  const getAlertConfig = (status: 'ok' | 'warning' | 'danger') => {
    switch (status) {
      case 'warning':
        return {
          bg: theme.warningLight,
          border: theme.warning + "40",
          text: theme.warning,
          icon: "alert-circle" as const,
          iconBg: theme.warning + "20",
          title: "Atenção ao Orçamento",
        };
      case 'danger':
        return {
          bg: theme.dangerLight,
          border: theme.danger + "40",
          text: theme.danger,
          icon: "warning" as const,
          iconBg: theme.danger + "20",
          title: "Orçamento Excedido",
        };
      default:
        return {
          bg: theme.successLight,
          border: theme.success + "40",
          text: theme.success,
          icon: "checkmark-circle" as const,
          iconBg: theme.success + "20",
          title: "No Limite",
        };
    }
  };

  return (
    <View style={styles.container}>
      {visibleAlerts.map((alert) => {
        const config = getAlertConfig(alert.status);
        const categoryName = alert.budget.category?.name || "Categoria";
        const categoryColor = alert.budget.category?.color || theme.textMuted;

        return (
          <View
            key={alert.budget.id}
            style={[
              styles.alertCard,
              { backgroundColor: config.bg, borderColor: config.border },
            ]}
          >
            <View style={styles.row}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
                <Ionicons name={config.icon} size={24} color={config.text} />
              </View>

              {/* Content */}
              <View style={styles.content}>
                <Text style={[styles.title, { color: config.text }]}>
                  {config.title}
                </Text>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                  <Text style={[styles.categoryText, { color: theme.text }]}>
                    {categoryName}
                  </Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={[styles.amountText, { color: theme.textSecondary }]}>
                    Gasto: <Text style={[styles.amountBold, { color: theme.text }]}>
                      {formatCurrency(alert.spent)}
                    </Text>
                  </Text>
                  <Text style={[styles.amountText, { color: theme.textSecondary }]}>
                    {" • "}
                  </Text>
                  <Text style={[styles.amountText, { color: theme.textSecondary }]}>
                    Limite: <Text style={[styles.amountBold, { color: theme.text }]}>
                      {formatCurrency(alert.limit)}
                    </Text>
                  </Text>
                </View>
                <Text style={[styles.percentageText, { color: config.text }]}>
                  {alert.percentageUsed.toFixed(0)}% do orçamento
                </Text>
              </View>

              {/* Dismiss Button */}
              <TouchableOpacity
                onPress={() => handleDismiss(alert.budget.id)}
                style={styles.dismissButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  alertCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  amountText: {
    fontSize: 14,
  },
  amountBold: {
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});
