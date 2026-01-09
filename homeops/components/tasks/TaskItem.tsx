import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Task } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onPress?: (task: Task) => void;
}

export function TaskItem({ task, onComplete, onPress }: TaskItemProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isCompleted = task.status === "completed";
  const isOverdue =
    task.status === "pending" &&
    task.due_date &&
    task.due_date < new Date().toISOString().split("T")[0];

  const categoryColor = task.category?.color || theme.textMuted;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Hoje";
    if (date.getTime() === tomorrow.getTime()) return "Amanha";

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return null;
    return timeStr.substring(0, 5);
  };

  const handlePress = () => {
    if (onPress) {
      onPress(task);
    } else {
      router.push(`/task/${task.id}`);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.container,
        { borderLeftColor: categoryColor, backgroundColor: theme.surface },
        isCompleted && styles.completedContainer,
      ]}
    >
      <View style={styles.row}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => onComplete(task.id)}
          style={[
            styles.checkbox,
            { borderColor: theme.border },
            isCompleted && { backgroundColor: theme.success, borderColor: theme.success },
          ]}
        >
          {isCompleted && (
            <Ionicons name="checkmark" size={14} color={theme.surface} />
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: theme.text },
                isCompleted && { textDecorationLine: 'line-through', color: theme.textMuted },
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            {task.priority === 3 && (
              <View style={styles.flagContainer}>
                <Ionicons name="flag" size={16} color={theme.danger} />
              </View>
            )}
          </View>

          {/* Meta Info */}
          <View style={styles.metaRow}>
            {/* Category */}
            {task.category && (
              <View
                style={[styles.categoryBadge, { backgroundColor: categoryColor + "20" }]}
              >
                <Ionicons
                  name={task.category.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={categoryColor}
                />
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {task.category.name}
                </Text>
              </View>
            )}

            {/* Date */}
            {task.due_date && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={isOverdue ? theme.danger : theme.textMuted}
                />
                <Text
                  style={[
                    styles.metaText,
                    { color: theme.textSecondary },
                    isOverdue && { color: theme.danger, fontWeight: '500' },
                  ]}
                >
                  {formatDate(task.due_date)}
                </Text>
              </View>
            )}

            {/* Time */}
            {task.due_time && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={theme.textMuted}
                />
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  {formatTime(task.due_time)}
                </Text>
              </View>
            )}

            {/* Recurring */}
            {task.is_recurring && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="repeat"
                  size={12}
                  color={theme.primary}
                />
                <Text style={[styles.recurringText, { color: theme.primary }]}>Recorrente</Text>
              </View>
            )}
          </View>

          {/* Estimated time */}
          {task.estimated_minutes && (
            <View style={styles.estimatedRow}>
              <Ionicons
                name="hourglass-outline"
                size={12}
                color={theme.textMuted}
              />
              <Text style={[styles.estimatedText, { color: theme.textMuted }]}>
                ~{task.estimated_minutes} min
              </Text>
            </View>
          )}
        </View>

        {/* Arrow */}
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.border}
          style={styles.arrow}
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
  completedContainer: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCompleted: {
    // Moved to inline style to use theme colors
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  flagContainer: {
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  recurringText: {
    fontSize: 12,
    marginLeft: 4,
  },
  estimatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  estimatedText: {
    fontSize: 12,
    marginLeft: 4,
  },
  arrow: {
    marginLeft: 8,
  },
});
