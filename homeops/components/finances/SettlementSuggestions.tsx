import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SettlementSuggestion } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCurrency } from "@/stores/financeStore";

interface SettlementSuggestionsProps {
  suggestions: SettlementSuggestion[];
}

export function SettlementSuggestions({ suggestions }: SettlementSuggestionsProps) {
  const { theme } = useTheme();

  if (suggestions.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="checkmark-circle" size={48} color={theme.success} />
        <Text style={[styles.emptyText, { color: theme.success }]}>
          Tudo acertado!
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
          Não há pendências entre os membros
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
      {suggestions.map((suggestion, index) => (
        <View
          key={`${suggestion.from.id}-${suggestion.to.id}-${index}`}
          style={[styles.suggestionCard, { backgroundColor: theme.surface }]}
        >
          {/* From Member */}
          <View style={styles.memberSection}>
            <View style={[styles.avatar, { backgroundColor: theme.danger + "20" }]}>
              <Text style={[styles.avatarText, { color: theme.danger }]}>
                {getInitials(suggestion.from.name)}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                {suggestion.from.name}
              </Text>
              <Text style={[styles.memberRole, { color: theme.textMuted }]}>Devedor</Text>
            </View>
          </View>

          {/* Arrow with Amount */}
          <View style={styles.arrowSection}>
            <View style={[styles.amountBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.amountText, { color: theme.primary }]}>
                {formatCurrency(suggestion.amount)}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={theme.primary} />
          </View>

          {/* To Member */}
          <View style={styles.memberSection}>
            <View style={[styles.avatar, { backgroundColor: theme.success + "20" }]}>
              <Text style={[styles.avatarText, { color: theme.success }]}>
                {getInitials(suggestion.to.name)}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                {suggestion.to.name}
              </Text>
              <Text style={[styles.memberRole, { color: theme.textMuted }]}>Credor</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + "30" }]}>
        <Ionicons name="information-circle" size={20} color={theme.primary} />
        <Text style={[styles.summaryText, { color: theme.primary }]}>
          {suggestions.length === 1
            ? "1 transferência para acertar as contas"
            : `${suggestions.length} transferências para acertar as contas`}
        </Text>
      </View>
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
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  suggestionCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 12,
    marginTop: 2,
  },
  arrowSection: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  amountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
