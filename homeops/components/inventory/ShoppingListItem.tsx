import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ShoppingListItem as ShoppingListItemType } from "@/types";
import { UNIT_LABELS } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ShoppingListItem({ item, onToggle, onDelete }: ShoppingListItemProps) {
  const { theme } = useTheme();
  const isChecked = item.is_checked;

  const getPriorityConfig = () => {
    switch (item.priority) {
      case "high":
        return {
          color: theme.danger,
          bg: theme.dangerLight,
          label: "Alta",
        };
      case "low":
        return {
          color: theme.textMuted,
          bg: theme.gray[100],
          label: "Baixa",
        };
      default:
        return null;
    }
  };

  const priorityConfig = getPriorityConfig();

  const formatQuantity = () => {
    const qty = Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(1);
    const unitLabel = UNIT_LABELS[item.unit] || item.unit;
    return `${qty} ${unitLabel}`;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface },
        isChecked && styles.containerChecked,
      ]}
    >
      <View style={styles.row}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => onToggle(item.id)}
          style={[
            styles.checkbox,
            { borderColor: theme.border },
            isChecked && { backgroundColor: theme.success, borderColor: theme.success },
          ]}
        >
          {isChecked && (
            <Ionicons name="checkmark" size={16} color={theme.surface} />
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.name,
                { color: theme.text },
                isChecked && { textDecorationLine: "line-through", color: theme.textMuted },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.priority === "high" && !isChecked && (
              <Ionicons name="flag" size={16} color={theme.danger} style={{ marginLeft: 8 }} />
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.quantity, { color: theme.textSecondary }]}>
              {formatQuantity()}
            </Text>

            {priorityConfig && !isChecked && (
              <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bg }]}>
                <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                  {priorityConfig.label}
                </Text>
              </View>
            )}

            {item.inventory_item && (
              <View style={[styles.linkedBadge, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="link-outline" size={12} color={theme.primary} />
                <Text style={[styles.linkedText, { color: theme.primary }]}>Estoque</Text>
              </View>
            )}
          </View>

          {item.notes && !isChecked && (
            <Text style={[styles.notes, { color: theme.textMuted }]} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={[styles.deleteButton, { backgroundColor: theme.dangerLight }]}
        >
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  containerChecked: {
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
    gap: 8,
  },
  quantity: {
    fontSize: 14,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "500",
  },
  linkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  linkedText: {
    fontSize: 12,
    fontWeight: "500",
  },
  notes: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
