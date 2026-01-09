import { View, Text, FlatList, RefreshControl, StyleSheet } from "react-native";
import { TaskItem } from "./TaskItem";
import { EmptyState } from "@/components/shared";
import { useTheme } from "@/contexts/ThemeContext";
import type { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onTaskPress?: (task: Task) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  ListHeaderComponent?: React.ReactElement;
}

export function TaskList({
  tasks,
  onComplete,
  onTaskPress,
  onRefresh,
  refreshing = false,
  emptyTitle = "Nenhuma tarefa",
  emptyDescription = "Adicione sua primeira tarefa",
  emptyActionLabel,
  onEmptyAction,
  ListHeaderComponent,
}: TaskListProps) {
  const { theme } = useTheme();
  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {ListHeaderComponent}
        <EmptyState
          icon="checkbox-outline"
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskItem
          task={item}
          onComplete={onComplete}
          onPress={onTaskPress}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        ) : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
