import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "@/components/ui";
import { StatusBadge } from "@/components/shared";
import { useTaskStore } from "@/stores/taskStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { Task } from "@/types";

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { tasks, completeTask, skipTask, deleteTask, isLoading } = useTaskStore();
  const { theme } = useTheme();

  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    const found = tasks.find((t) => t.id === id);
    setTask(found || null);
  }, [id, tasks]);

  const handleComplete = async () => {
    if (!task || !user?.id) return;

    const { error } = await completeTask(task.id, user.id);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }

    if (!task.is_recurring) {
      router.back();
    }
  };

  const handleSkip = async () => {
    if (!task) return;

    Alert.alert(
      "Pular tarefa",
      task.is_recurring
        ? "A tarefa sera reagendada para a proxima ocorrencia"
        : "A tarefa sera marcada como pulada",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Pular",
          onPress: async () => {
            const { error } = await skipTask(task.id);
            if (error) Alert.alert("Erro", error);
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir tarefa",
      "Tem certeza que deseja excluir esta tarefa?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!task) return;
            const { error } = await deleteTask(task.id);
            if (error) {
              Alert.alert("Erro", error);
              return;
            }
            router.back();
          },
        },
      ]
    );
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Sem data";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    return timeStr.substring(0, 5);
  };

  const getRecurrenceLabel = (type?: string | null) => {
    switch (type) {
      case "daily":
        return "Diariamente";
      case "weekly":
        return "Semanalmente";
      case "monthly":
        return "Mensalmente";
      default:
        return "";
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return { label: "Baixa", variant: "neutral" as const };
      case 2:
        return { label: "Media", variant: "warning" as const };
      case 3:
        return { label: "Alta", variant: "danger" as const };
      default:
        return { label: "Media", variant: "neutral" as const };
    }
  };

  if (!task) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const isCompleted = task.status === "completed";
  const isOverdue =
    task.status === "pending" &&
    task.due_date &&
    task.due_date < new Date().toISOString().split("T")[0];
  const priorityInfo = getPriorityLabel(task.priority);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.gray[700]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Detalhes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/task/edit?id=${id}`)}
            style={styles.headerButton}
          >
            <Ionicons name="pencil-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerButton}
          >
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Card */}
        <Card style={styles.mainCard}>
          {/* Status & Category */}
          <View style={styles.statusRow}>
            {task.category && (
              <View
                style={[styles.categoryBadge, { backgroundColor: task.category.color + "20" }]}
              >
                <Ionicons
                  name={task.category.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={task.category.color}
                />
                <Text style={[styles.categoryText, { color: task.category.color }]}>
                  {task.category.name}
                </Text>
              </View>
            )}
            <StatusBadge
              label={isCompleted ? "Concluida" : isOverdue ? "Atrasada" : "Pendente"}
              variant={isCompleted ? "success" : isOverdue ? "danger" : "info"}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>{task.title}</Text>

          {/* Description */}
          {task.description && (
            <Text style={[styles.description, { color: theme.gray[600] }]}>{task.description}</Text>
          )}

          {/* Priority */}
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={18} color={theme.gray[500]} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Prioridade:</Text>
            <StatusBadge label={priorityInfo.label} variant={priorityInfo.variant} />
          </View>

          {/* Date & Time */}
          <View style={styles.infoRowSimple}>
            <Ionicons name="calendar-outline" size={18} color={theme.gray[500]} />
            <Text style={[styles.infoText, { color: theme.gray[700] }]}>{formatDate(task.due_date)}</Text>
          </View>

          {task.due_time && (
            <View style={styles.infoRowSimple}>
              <Ionicons name="time-outline" size={18} color={theme.gray[500]} />
              <Text style={[styles.infoText, { color: theme.gray[700] }]}>{formatTime(task.due_time)}</Text>
            </View>
          )}

          {/* Recurrence */}
          {task.is_recurring && (
            <View style={styles.infoRowSimple}>
              <Ionicons name="repeat" size={18} color={theme.primary} />
              <Text style={[styles.recurrenceText, { color: theme.primary }]}>
                {getRecurrenceLabel(task.recurrence_type)}
              </Text>
            </View>
          )}

          {/* Estimated Time */}
          {task.estimated_minutes && (
            <View style={styles.infoRowSimple}>
              <Ionicons name="hourglass-outline" size={18} color={theme.gray[500]} />
              <Text style={[styles.infoText, { color: theme.gray[700] }]}>
                Tempo estimado: {task.estimated_minutes} min
              </Text>
            </View>
          )}
        </Card>

        {/* Completion Info */}
        {isCompleted && task.completed_at && (
          <Card style={[styles.completedCard, { backgroundColor: theme.successLight }]}>
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={24} color={theme.success} />
              <View style={styles.completedTextContainer}>
                <Text style={[styles.completedTitle, { color: theme.success }]}>Tarefa concluida</Text>
                <Text style={[styles.completedDate, { color: theme.success }]}>
                  {new Date(task.completed_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Actions */}
        {!isCompleted && (
          <View style={styles.actionsContainer}>
            <Button
              onPress={handleComplete}
              loading={isLoading}
              fullWidth
              size="lg"
              icon={<Ionicons name="checkmark" size={20} color={theme.surface} />}
            >
              Marcar como Concluida
            </Button>

            {task.is_recurring && (
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipButton}
              >
                <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>Pular esta vez</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoLabel: {
    marginLeft: 8,
    marginRight: 8,
  },
  infoRowSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  recurrenceText: {
    marginLeft: 8,
  },
  completedCard: {
    marginBottom: 16,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedTextContainer: {
    marginLeft: 12,
  },
  completedTitle: {
    fontWeight: '500',
  },
  completedDate: {
    fontSize: 14,
  },
  actionsContainer: {
    marginTop: 16,
  },
  skipButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontWeight: '500',
  },
});
