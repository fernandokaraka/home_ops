import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { useTheme, ThemeMode } from "@/contexts/ThemeContext";

interface ThemeOptionProps {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
  previewColors: {
    bg: string;
    surface: string;
    text: string;
  };
}

function ThemeOption({ mode, label, icon, description, isSelected, onSelect, previewColors }: ThemeOptionProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[
        styles.themeOption,
        {
          backgroundColor: theme.surface,
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
        }
      ]}
    >
      <View style={styles.themeOptionContent}>
        {/* Preview */}
        <View style={[styles.previewContainer, { backgroundColor: previewColors.bg }]}>
          <View style={[styles.previewCard, { backgroundColor: previewColors.surface }]}>
            <View style={[styles.previewLine, { backgroundColor: previewColors.text, width: 40 }]} />
            <View style={[styles.previewLine, { backgroundColor: previewColors.text, opacity: 0.5, width: 60 }]} />
          </View>
          <View style={[styles.previewCard, { backgroundColor: previewColors.surface, height: 24 }]}>
            <View style={[styles.previewLine, { backgroundColor: previewColors.text, width: 50 }]} />
          </View>
        </View>

        {/* Info */}
        <View style={styles.themeOptionInfo}>
          <View style={styles.themeOptionHeader}>
            <Ionicons name={icon} size={20} color={isSelected ? theme.primary : theme.textSecondary} />
            <Text style={[styles.themeOptionLabel, { color: theme.text }]}>{label}</Text>
            {isSelected && (
              <View style={[styles.selectedBadge, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="checkmark" size={14} color={theme.primary} />
              </View>
            )}
          </View>
          <Text style={[styles.themeOptionDescription, { color: theme.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AppearanceScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  const themeOptions: Array<{
    mode: ThemeMode;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
    previewColors: { bg: string; surface: string; text: string };
  }> = [
    {
      mode: 'light',
      label: 'Claro',
      icon: 'sunny-outline',
      description: 'Tema claro com fundo bege suave',
      previewColors: { bg: '#FDF6F0', surface: '#FFFFFF', text: '#000000' },
    },
    {
      mode: 'dark',
      label: 'Escuro',
      icon: 'moon-outline',
      description: 'Tema escuro para ambientes com pouca luz',
      previewColors: { bg: '#1C1917', surface: '#292524', text: '#FFFFFF' },
    },
    {
      mode: 'system',
      label: 'Sistema',
      icon: 'phone-portrait-outline',
      description: 'Segue a configuracao do dispositivo',
      previewColors: isDark
        ? { bg: '#1C1917', surface: '#292524', text: '#FFFFFF' }
        : { bg: '#FDF6F0', surface: '#FFFFFF', text: '#000000' },
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Aparencia</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>TEMA</Text>

          {themeOptions.map((option) => (
            <ThemeOption
              key={option.mode}
              mode={option.mode}
              label={option.label}
              icon={option.icon}
              description={option.description}
              isSelected={themeMode === option.mode}
              onSelect={() => setThemeMode(option.mode)}
              previewColors={option.previewColors}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INFO</Text>
          <Card style={{ backgroundColor: theme.surface }}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                O tema sera aplicado em todas as telas do aplicativo. A opcao "Sistema" acompanha automaticamente a configuracao do seu dispositivo.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  themeOption: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  themeOptionContent: {
    padding: 16,
  },
  previewContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  previewCard: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  previewLine: {
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  themeOptionInfo: {},
  themeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  themeOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionDescription: {
    fontSize: 14,
    marginLeft: 28,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});
