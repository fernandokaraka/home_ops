import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, ThemeColors } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  theme: ThemeColors;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging (can be sent to error reporting service)
    if (__DEV__) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, theme, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.resetError);
      }

      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: theme.dangerLight }]}>
              <Ionicons name="alert-circle" size={48} color={theme.danger} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              Algo deu errado
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Ocorreu um erro inesperado. Por favor, tente novamente.
            </Text>
            {__DEV__ && error.message && (
              <View style={[styles.errorBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.errorTitle, { color: theme.textSecondary }]}>
                  Detalhes do erro:
                </Text>
                <Text style={[styles.errorMessage, { color: theme.textMuted }]}>
                  {error.message}
                </Text>
              </View>
            )}
            <Button
              onPress={this.resetError}
              variant="primary"
              fullWidth
              icon={<Ionicons name="refresh" size={20} color={theme.surface} />}
            >
              Tentar novamente
            </Button>
          </View>
        </View>
      );
    }

    return children;
  }
}

// Wrapper component to inject theme from context
export function ErrorBoundary({
  children,
  fallback,
}: Omit<ErrorBoundaryProps, "theme">) {
  const { theme } = useTheme();

  return (
    <ErrorBoundaryClass theme={theme} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
