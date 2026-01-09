import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { InventoryItem } from "@/types";
import { LOCATION_LABELS } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import {
  formatQuantityWithUnit,
  getStockStatus,
  getExpirationStatus,
  getDaysUntilExpiration,
} from "@/stores/inventoryStore";

interface InventoryItemCardProps {
  item: InventoryItem;
  onPress?: (item: InventoryItem) => void;
}

export function InventoryItemCard({ item, onPress }: InventoryItemCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const categoryColor = item.category?.color || theme.textMuted;
  const stockStatus = getStockStatus(item.quantity, item.min_quantity);
  const expirationStatus = getExpirationStatus(item.expiration_date);
  const daysUntilExpiration = getDaysUntilExpiration(item.expiration_date);

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    } else {
      router.push(`/inventory/${item.id}`);
    }
  };

  const getStockStatusConfig = () => {
    switch (stockStatus) {
      case "out":
        return {
          bg: theme.dangerLight,
          text: theme.danger,
          label: "Acabou",
          icon: "close-circle",
        };
      case "low":
        return {
          bg: theme.warningLight,
          text: theme.warning,
          label: "Baixo",
          icon: "alert-circle",
        };
      default:
        return null;
    }
  };

  const getExpirationStatusConfig = () => {
    switch (expirationStatus) {
      case "expired":
        return {
          bg: theme.dangerLight,
          text: theme.danger,
          label: "Vencido",
          icon: "close-circle",
        };
      case "warning":
        return {
          bg: theme.warningLight,
          text: theme.warning,
          label: `Vence em ${daysUntilExpiration}d`,
          icon: "time-outline",
        };
      default:
        return null;
    }
  };

  const stockConfig = getStockStatusConfig();
  const expirationConfig = getExpirationStatusConfig();

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderLeftColor: categoryColor },
      ]}
    >
      <View style={styles.row}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
          <Ionicons
            name={(item.category?.icon || "cube-outline") as keyof typeof Ionicons.glyphMap}
            size={24}
            color={categoryColor}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Quantity */}
          <View style={styles.quantityRow}>
            <Text style={[styles.quantityText, { color: theme.textSecondary }]}>
              {formatQuantityWithUnit(item.quantity, item.unit)}
            </Text>
            {item.min_quantity !== null && (
              <Text style={[styles.minQuantityText, { color: theme.textMuted }]}>
                {" "}(min: {item.min_quantity})
              </Text>
            )}
          </View>

          {/* Status Badges */}
          <View style={styles.badgeRow}>
            {/* Stock Status Badge */}
            {stockConfig && (
              <View style={[styles.badge, { backgroundColor: stockConfig.bg }]}>
                <Ionicons
                  name={stockConfig.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={stockConfig.text}
                />
                <Text style={[styles.badgeText, { color: stockConfig.text }]}>
                  {stockConfig.label}
                </Text>
              </View>
            )}

            {/* Expiration Status Badge */}
            {expirationConfig && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: expirationConfig.bg },
                  stockConfig && { marginLeft: 8 },
                ]}
              >
                <Ionicons
                  name={expirationConfig.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={expirationConfig.text}
                />
                <Text style={[styles.badgeText, { color: expirationConfig.text }]}>
                  {expirationConfig.label}
                </Text>
              </View>
            )}

            {/* Location Badge */}
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.primaryLight },
                (stockConfig || expirationConfig) && { marginLeft: 8 },
              ]}
            >
              <Ionicons
                name={
                  item.location === "fridge" || item.location === "freezer"
                    ? "snow-outline"
                    : "home-outline"
                }
                size={12}
                color={theme.primary}
              />
              <Text style={[styles.badgeText, { color: theme.primary }]}>
                {LOCATION_LABELS[item.location]}
              </Text>
            </View>
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
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  quantityText: {
    fontSize: 14,
  },
  minQuantityText: {
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
});
