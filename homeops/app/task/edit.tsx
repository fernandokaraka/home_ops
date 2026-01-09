import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { useTaskStore } from "@/stores/taskStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { TaskCategory, Task } from "@/types";

type RecurrenceType = "daily" | "weekly" | "monthly" | null;

export default function EditTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, categories, fetchCategories, updateTask, isLoading } = useTaskStore();
  const { theme } = useTheme();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [dueDate, setDueDate] = useState<string>("");
  const [dueTime, setDueTime] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const found = tasks.find((t) => t.id === id);
    if (found) {
      setTask(found);
      setTitle(found.title || "");
      setDescription(found.description || "");
      setSelectedCategory(found.category || null);
      setPriority((found.priority as 1 | 2 | 3) || 2);
      setDueDate(found.due_date || "");
      setDueTime(found.due_time || "");
      setIsRecurring(found.is_recurring || false);
      setRecurrenceType((found.recurrence_type as RecurrenceType) || null);
      setEstimatedMinutes(found.estimated_minutes?.toString() || "");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [id, tasks]);

  const priorityOptions = [
    { value: 1, label: "Baixa", color: theme.gray[400] },
    { value: 2, label: "Media", color: theme.warning },
    { value: 3, label: "Alta", color: theme.danger },
  ];

  const recurrenceOptions = [
    { value: "daily", label: "Diaria", icon: "today-outline" },
    { value: "weekly", label: "Semanal", icon: "calendar-outline" },
    { value: "monthly", label: "Mensal", icon: "calendar-number-outline" },
  ];

  const quickDates = [
    { label: "Hoje", getValue: () => new Date().toISOString().split("T")[0] },
    {
      label: "Amanha",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      },
    },
    {
      label: "Proxima semana",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split("T")[0];
      },
    },
  ];

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || !dateStr.trim()) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year && year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Erro", "Digite um titulo para a tarefa");
      return;
    }

    if (!task) {
      Alert.alert("Erro", "Tarefa nao encontrada");
      return;
    }

    const taskData: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: selectedCategory?.id || null,
      priority,
      due_date: parseDate(dueDate),
      due_time: dueTime || null,
      is_recurring: isRecurring,
      recurrence_type: isRecurring ? recurrenceType : null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
    };

    const { error } = await updateTask(task.id, taskData);

    if (error) {
      Alert.alert("Erro", error);
      return;
    }

    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Tarefa nao encontrada</Text>
        <Button onPress={() => router.back()} variant="outline">
          Voltar
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={theme.gray[700]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Editar Tarefa</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Input
            label="Titulo"
            placeholder="O que precisa ser feito?"
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
          />

          {/* Description */}
          <Input
            label="Descricao (opcional)"
            placeholder="Adicione mais detalhes..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            autoCapitalize="sentences"
          />

          {/* Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Categoria</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryButton,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                    selectedCategory?.id === cat.id && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={cat.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={selectedCategory?.id === cat.id ? theme.primary : cat.color}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: theme.gray[700] },
                      selectedCategory?.id === cat.id && { color: theme.primary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Prioridade</Text>
            <View style={styles.priorityRow}>
              {priorityOptions.map((opt, index) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPriority(opt.value as 1 | 2 | 3)}
                  style={[
                    styles.priorityButton,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                    priority === opt.value && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                    index < priorityOptions.length - 1 && styles.priorityButtonMargin,
                  ]}
                >
                  <Ionicons
                    name="flag"
                    size={18}
                    color={priority === opt.value ? theme.primary : opt.color}
                  />
                  <Text
                    style={[
                      styles.priorityButtonText,
                      { color: theme.gray[600] },
                      priority === opt.value && { color: theme.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due Date */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.gray[700] }]}>Data</Text>
            <View style={styles.quickDatesRow}>
              {quickDates.map((qd) => (
                <TouchableOpacity
                  key={qd.label}
                  onPress={() => setDueDate(qd.getValue())}
                  style={[
                    styles.quickDateButton,
                    { backgroundColor: theme.gray[200] },
                    dueDate === qd.getValue() && { backgroundColor: theme.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickDateText,
                      { color: theme.gray[700] },
                      dueDate === qd.getValue() && styles.quickDateTextSelected,
                    ]}
                  >
                    {qd.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              placeholder="DD/MM/AAAA"
              value={dueDate}
              onChangeText={setDueDate}
              keyboardType="numeric"
              icon="calendar-outline"
            />
          </View>

          {/* Due Time */}
          <Input
            label="Horario (opcional)"
            placeholder="HH:MM"
            value={dueTime}
            onChangeText={setDueTime}
            keyboardType="numeric"
            icon="time-outline"
          />

          {/* Recurrence */}
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => setIsRecurring(!isRecurring)}
              style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name="repeat"
                  size={20}
                  color={isRecurring ? theme.primary : theme.gray[400]}
                />
                <Text
                  style={[
                    styles.toggleText,
                    { color: theme.gray[700] },
                    isRecurring && { color: theme.primary },
                  ]}
                >
                  Tarefa recorrente
                </Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: theme.gray[300] }, isRecurring && { backgroundColor: theme.primary }]}>
                <View
                  style={[
                    styles.toggleThumb,
                    isRecurring && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            {isRecurring && (
              <View style={styles.recurrenceRow}>
                {recurrenceOptions.map((opt, index) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setRecurrenceType(opt.value as RecurrenceType)}
                    style={[
                      styles.recurrenceButton,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      recurrenceType === opt.value && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                      index < recurrenceOptions.length - 1 && styles.recurrenceButtonMargin,
                    ]}
                  >
                    <Ionicons
                      name={opt.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={recurrenceType === opt.value ? theme.primary : theme.gray[400]}
                    />
                    <Text
                      style={[
                        styles.recurrenceButtonText,
                        { color: theme.gray[600] },
                        recurrenceType === opt.value && { color: theme.primary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Estimated Time */}
          <Input
            label="Tempo estimado (minutos)"
            placeholder="Ex: 30"
            value={estimatedMinutes}
            onChangeText={setEstimatedMinutes}
            keyboardType="numeric"
            icon="hourglass-outline"
          />

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!title.trim()}
              fullWidth
              size="lg"
            >
              Salvar Alteracoes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontWeight: '500',
    marginBottom: 8,
  },
  horizontalScroll: {
    marginHorizontal: -16,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
  },
  categoryButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  priorityRow: {
    flexDirection: 'row',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  priorityButtonMargin: {
    marginRight: 8,
  },
  priorityButtonText: {
    marginTop: 4,
    fontWeight: '500',
  },
  quickDatesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  quickDateButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickDateText: {
  },
  quickDateTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    marginLeft: 12,
    fontWeight: '500',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  recurrenceRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  recurrenceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  recurrenceButtonMargin: {
    marginRight: 8,
  },
  recurrenceButtonText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  submitContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
});
