import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { Loading } from "@/components/shared";
import {
  useTaskStore,
  getTasksForToday,
  getTasksForWeek,
  getPendingTasks,
  getOverdueTasks,
} from "@/stores/taskStore";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { Task } from "@/types";

type TabFilter = "today" | "week" | "all";

export default function TasksScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const {
    tasks,
    fetchTasks,
    fetchCategories,
    completeTask,
    isLoading,
  } = useTaskStore();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabFilter>("today");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (household?.id) {
      fetchTasks(household.id);
      fetchCategories();
    }
  }, [household?.id]);

  const onRefresh = useCallback(async () => {
    if (!household?.id) return;
    setRefreshing(true);
    await fetchTasks(household.id);
    setRefreshing(false);
  }, [household?.id]);

  const handleComplete = async (taskId: string) => {
    if (!user?.id) return;
    await completeTask(taskId, user.id);
  };

  const handleTaskPress = (task: Task) => {
    router.push(`/task/${task.id}`);
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "week", label: "Esta Semana" },
    { key: "all", label: "Todas" },
  ];

  const getFilteredTasks = () => {
    switch (activeTab) {
      case "today":
        return getTasksForToday(tasks);
      case "week":
        return getTasksForWeek(tasks);
      case "all":
        return getPendingTasks(tasks);
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();
  const overdueTasks = getOverdueTasks(tasks);
  const todayCount = getTasksForToday(tasks).length;
  const weekCount = getTasksForWeek(tasks).length;
  const allCount = getPendingTasks(tasks).length;

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "today":
        return {
          title: "Nenhuma tarefa para hoje",
          description: "Aproveite o dia livre ou adicione uma nova tarefa",
        };
      case "week":
        return {
          title: "Nenhuma tarefa esta semana",
          description: "Sua semana esta livre!",
        };
      default:
        return {
          title: "Nenhuma tarefa pendente",
          description: "Comece adicionando suas tarefas domesticas",
        };
    }
  };

  const emptyMessage = getEmptyMessage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Tarefas</Text>
            {allCount > 0 && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {allCount} pendente{allCount !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => router.push("/task/new")}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={28} color={theme.surface} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: theme.surfaceVariant }]}>
          {tabs.map((tab) => {
            const count =
              tab.key === "today"
                ? todayCount
                : tab.key === "week"
                ? weekCount
                : allCount;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  activeTab === tab.key && [styles.tabActive, { backgroundColor: theme.surface }]
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: theme.textSecondary },
                    activeTab === tab.key && { color: theme.primary }
                  ]}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      activeTab === tab.key
                        ? [styles.tabBadgeActive, { backgroundColor: theme.primary }]
                        : [styles.tabBadgeInactive, { backgroundColor: theme.textMuted }]
                    ]}
                  >
                    <Text style={[styles.tabBadgeText, { color: theme.surface }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading && tasks.length === 0 ? (
        <Loading message="Carregando tarefas..." />
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {/* Overdue Warning */}
          {overdueTasks.length > 0 && activeTab !== "all" && (
            <TouchableOpacity
              onPress={() => setActiveTab("all")}
              style={[styles.warningCard, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}
            >
              <View style={[styles.warningIcon, { backgroundColor: theme.danger + '20' }]}>
                <Ionicons name="alert-circle" size={24} color={theme.danger} />
              </View>
              <View style={styles.warningContent}>
                <Text style={[styles.warningTitle, { color: theme.danger }]}>
                  {overdueTasks.length} tarefa{overdueTasks.length !== 1 ? "s" : ""} atrasada{overdueTasks.length !== 1 ? "s" : ""}
                </Text>
                <Text style={[styles.warningText, { color: theme.danger }]}>Toque para ver todas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.danger} />
            </TouchableOpacity>
          )}

          {/* Task List */}
          <View style={styles.listContainer}>
            {filteredTasks.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons
                      name="checkbox-outline"
                      size={40}
                      color={theme.textMuted}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>{emptyMessage.title}</Text>
                  <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>{emptyMessage.description}</Text>
                  <TouchableOpacity
                    onPress={() => router.push("/task/new")}
                    style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  >
                    <Ionicons name="add" size={20} color={theme.surface} />
                    <Text style={[styles.primaryButtonText, { color: theme.surface }]}>Adicionar Tarefa</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : (
              filteredTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => handleTaskPress(task)}
                  activeOpacity={0.7}
                  style={[
                    styles.taskItem,
                    { backgroundColor: theme.surface, borderLeftColor: task.category?.color || theme.textMuted },
                    task.status === "completed" && styles.taskItemCompleted
                  ]}
                >
                  <View style={styles.taskRow}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => handleComplete(task.id)}
                      style={[
                        styles.checkbox,
                        { borderColor: theme.border },
                        task.status === "completed" && { backgroundColor: theme.success, borderColor: theme.success }
                      ]}
                    >
                      {task.status === "completed" && (
                        <Ionicons name="checkmark" size={14} color={theme.surface} />
                      )}
                    </TouchableOpacity>

                    {/* Content */}
                    <View style={styles.taskContent}>
                      <View style={styles.taskTitleRow}>
                        <Text
                          style={[
                            styles.taskTitle,
                            { color: theme.text },
                            task.status === "completed" && [styles.taskTitleCompleted, { color: theme.textMuted }]
                          ]}
                          numberOfLines={2}
                        >
                          {task.title}
                        </Text>
                        {task.priority === 3 && (
                          <Ionicons
                            name="flag"
                            size={16}
                            color={theme.danger}
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </View>

                      {/* Meta Info */}
                      <View style={styles.taskMeta}>
                        {task.category && (
                          <View
                            style={[styles.categoryBadge, { backgroundColor: task.category.color + "20" }]}
                          >
                            <Ionicons
                              name={task.category.icon as keyof typeof Ionicons.glyphMap}
                              size={12}
                              color={task.category.color}
                            />
                            <Text
                              style={[styles.categoryBadgeText, { color: task.category.color }]}
                            >
                              {task.category.name}
                            </Text>
                          </View>
                        )}

                        {task.due_date && (
                          <View style={styles.dueDateContainer}>
                            <Ionicons
                              name="calendar-outline"
                              size={12}
                              color={
                                task.due_date < new Date().toISOString().split("T")[0]
                                  ? theme.danger
                                  : theme.textMuted
                              }
                            />
                            <Text
                              style={[
                                styles.dueDateText,
                                { color: theme.textSecondary },
                                task.due_date < new Date().toISOString().split("T")[0] && { color: theme.danger, fontWeight: '500' }
                              ]}
                            >
                              {task.due_date === new Date().toISOString().split("T")[0]
                                ? "Hoje"
                                : new Date(task.due_date + "T00:00:00").toLocaleDateString(
                                    "pt-BR",
                                    { day: "2-digit", month: "short" }
                                  )}
                            </Text>
                          </View>
                        )}

                        {task.is_recurring && (
                          <View style={styles.recurringIcon}>
                            <Ionicons name="repeat" size={12} color={theme.primary} />
                          </View>
                        )}
                      </View>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.textMuted}
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Quick Suggestions - only show when empty */}
          {filteredTasks.length === 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={[styles.suggestionsTitle, { color: theme.text }]}>Sugestoes rapidas</Text>
              <View style={styles.suggestionsGrid}>
                {[
                  { name: "Limpar banheiro", icon: "water-outline", color: theme.primary },
                  { name: "Lavar roupas", icon: "shirt-outline", color: "#8B5CF6" },
                  { name: "Fazer compras", icon: "cart-outline", color: "#EC4899" },
                  { name: "Organizar quarto", icon: "bed-outline", color: theme.success },
                  { name: "Lavar louca", icon: "restaurant-outline", color: theme.warning },
                  { name: "Varrer casa", icon: "home-outline", color: "#6366F1" },
                ].map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => router.push("/task/new")}
                    style={[styles.suggestionItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={item.color}
                    />
                    <Text style={[styles.suggestionText, { color: theme.text }]}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontWeight: '500',
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
  },
  tabBadgeInactive: {
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  warningCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyCard: {
    marginTop: 8,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  taskItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  taskRow: {
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
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
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
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  dueDateText: {
    fontSize: 12,
    marginLeft: 4,
  },
  recurringIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionItem: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 80,
  },
});
