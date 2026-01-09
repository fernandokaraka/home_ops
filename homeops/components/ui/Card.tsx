import { View, TouchableOpacity, ViewStyle, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "default" | "outlined" | "elevated";
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});

export function Card({
  children,
  style,
  onPress,
  variant = "default",
}: CardProps) {
  const { theme } = useTheme();

  const baseStyle: ViewStyle = {
    ...styles.base,
    backgroundColor: theme.surface,
  };

  const variantStyle: ViewStyle = variant === "outlined"
    ? { borderWidth: 1, borderColor: theme.border }
    : variant === "elevated"
    ? styles.elevated
    : {};

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[baseStyle, variantStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[baseStyle, variantStyle, style]}>{children}</View>;
}
