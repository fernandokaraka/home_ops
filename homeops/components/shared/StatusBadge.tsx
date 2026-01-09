import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const lightVariants: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "#DCFCE7", text: "#15803D" },
  warning: { bg: "#FEF9C3", text: "#A16207" },
  danger: { bg: "#FEE2E2", text: "#B91C1C" },
  info: { bg: "#F5D6C8", text: "#A04D3A" },
  neutral: { bg: "#E8D4C8", text: "#5C4035" },
};

const darkVariants: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "#14532D", text: "#86EFAC" },
  warning: { bg: "#713F12", text: "#FDE047" },
  danger: { bg: "#7F1D1D", text: "#FCA5A5" },
  info: { bg: "#1E3A8A", text: "#93C5FD" },
  neutral: { bg: "#3D3836", text: "#A8A29E" },
};

export function StatusBadge({ label, variant = "neutral" }: StatusBadgeProps) {
  const { isDark } = useTheme();
  const variants = isDark ? darkVariants : lightVariants;
  const colors = variants[variant];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
