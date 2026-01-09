import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { MaintenanceItem as MaintenanceItemType } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { getDaysUntilMaintenance, getMaintenanceStatus } from "@/stores/maintenanceStore";

interface MaintenanceItemProps {
  item: MaintenanceItemType;
  onPress?: (item: MaintenanceItemType) => void;
}

export function MaintenanceItemCard({ item, onPress }: MaintenanceItemProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const categoryColor = item.category?.color || theme.textMuted;
  const status = getMaintenanceStatus(item.next_maintenance_date);
  const daysUntil = getDaysUntilMaintenance(item.next_maintenance_date);

  const statusConfig = {
    ok: {
      bg: theme.successLight,
      text: theme.success,
      icon: "checkmark-circle",
      iconColor: theme.success,
    },
    warning: {
      bg: theme.warningLight,
      text: theme.warning,
      icon: "alert-circle",
      iconColor: theme.warning,
    },
    overdue: {
      bg: theme.dangerLight,
      text: theme.danger,
      icon: "close-circle",
      iconColor: theme.danger,
    },
    none: {
      bg: theme.gray[100],
      text: theme.gray[500],
      icon: "help-circle",
      iconColor: theme.gray[400],
    },
  };

  const config = statusConfig[status];

  const getStatusText = () => {
    if (daysUntil === null) return "Sem agendamento";
    if (daysUntil < 0) return `${Math.abs(daysUntil)} dias atrasado`;
    if (daysUntil === 0) return "Hoje";
    if (daysUntil === 1) return "Amanha";
    return `Em ${daysUntil} dias`;
  };

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    } else {
      router.push(`/maintenance/${item.id}`);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.container, { borderLeftColor: categoryColor, backgroundColor: theme.surface }]}
    >
      <View style={styles.row}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
          <Ionicons
            name={(item.category?.icon || "construct-outline") as keyof typeof Ionicons.glyphMap}
            size={24}
            color={categoryColor}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Brand & Model */}
          {(item.brand || item.model) && (
            <Text style={[styles.brandModel, { color: theme.textSecondary }]} numberOfLines={1}>
              {[item.brand, item.model].filter(Boolean).join(" - ")}
            </Text>
          )}

          {/* Status Badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: config.bg }]}>
              <Ionicons
                name={config.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={config.iconColor}
              />
              <Text style={[styles.badgeText, { color: config.text }]}>
                {getStatusText()}
              </Text>
            </View>

            {/* Warranty */}
            {item.warranty_until && new Date(item.warranty_until) > new Date() && (
              <View style={[styles.badge, { backgroundColor: theme.primaryLight, marginLeft: 8 }]}>
                <Ionicons name="shield-checkmark" size={14} color={theme.primary} />
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  Garantia
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.border}
          style={{ marginLeft: 8 }}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
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
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  brandModel: {
    fontSize: 14,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});
