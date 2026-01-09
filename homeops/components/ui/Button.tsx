import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { forwardRef } from "react";
import { useTheme, ThemeColors } from "@/contexts/ThemeContext";

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const getVariantStyles = (theme: ThemeColors): Record<string, { button: ViewStyle; text: TextStyle; loader: string }> => ({
  primary: {
    button: { backgroundColor: theme.primary },
    text: { color: theme.surface },
    loader: theme.surface,
  },
  secondary: {
    button: { backgroundColor: theme.surfaceVariant },
    text: { color: theme.text },
    loader: theme.primary,
  },
  outline: {
    button: { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.primary },
    text: { color: theme.primary },
    loader: theme.primary,
  },
  ghost: {
    button: { backgroundColor: 'transparent' },
    text: { color: theme.textSecondary },
    loader: theme.primary,
  },
  danger: {
    button: { backgroundColor: theme.danger },
    text: { color: theme.surface },
    loader: theme.surface,
  },
});

const sizeStyles: Record<string, { button: ViewStyle; text: TextStyle }> = {
  sm: {
    button: { paddingHorizontal: 16, paddingVertical: 8 },
    text: { fontSize: 14 },
  },
  md: {
    button: { paddingHorizontal: 24, paddingVertical: 12 },
    text: { fontSize: 16 },
  },
  lg: {
    button: { paddingHorizontal: 32, paddingVertical: 16 },
    text: { fontSize: 18 },
  },
};

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      onPress,
      children,
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      fullWidth = false,
      icon,
    },
    ref
  ) => {
    const { theme } = useTheme();
    const variantStyles = getVariantStyles(theme);
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[
          styles.base,
          variantStyle.button,
          sizeStyle.button,
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variantStyle.loader}
            size="small"
          />
        ) : (
          <>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.text, variantStyle.text, sizeStyle.text]}>
              {children}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = "Button";

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
  },
});
