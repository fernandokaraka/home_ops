import { useTaskStore, getTasksForToday, getTasksForWeek, getPendingTasks, getCompletedTasks, getOverdueTasks } from "@/stores/taskStore";
import { supabase } from "@/lib/supabase";
import { mockData, resetMockData } from "@supabase/supabase-js";
import * as notificationService from "@/services/notificationService";
import type { Task, TaskCategory } from "@/types";

// Mock notification service
jest.mock("@/services/notificationService", () => ({
  scheduleTaskReminder: jest.fn(),
  cancelNotificationsByTag: jest.fn(),
  scheduleAllTaskReminders: jest.fn(),
}));

describe("taskStore", () => {
  const mockCategory: TaskCategory = {
    id: "cat-1",
    name: "Limpeza",
    icon: "🧹",
    color: "#3B82F6",
    is_default: true,
  };

  const mockTask: Task = {
    id: "task-1",
    household_id: "household-1",
    category_id: "cat-1",
    category: mockCategory,
    title: "Limpar cozinha",
    description: "Limpar bancadas e pia",
    is_recurring: false,
    recurrence_type: null,
    recurrence_days: null,
    recurrence_interval: 1,
    due_date: "2024-01-15",
    due_time: "10:00",
    next_occurrence: null,
    status: "pending",
    completed_at: null,
    completed_by: null,
    assigned_to: null,
    priority: 2,
    estimated_minutes: 30,
    created_by: "user-1",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  };

  beforeEach(() => {
    resetMockData();
    jest.clearAllMocks();
    useTaskStore.setState({
      tasks: [],
      categories: [],
      isLoading: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useTaskStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchCategories", () => {
    it("should fetch categories successfully", async () => {
      const mockCategories: TaskCategory[] = [
        mockCategory,
        {
          id: "cat-2",
          name: "Compras",
          icon: "🛒",
          color: "#10B981",
          is_default: true,
        },
      ];

      mockData.task_categories = mockCategories;

      await useTaskStore.getState().fetchCategories();

      const state = useTaskStore.getState();
      expect(state.categories).toHaveLength(2);
      expect(state.categories).toContainEqual(mockCategory);
      expect(state.categories).toContainEqual({
        id: "cat-2",
        name: "Compras",
        icon: "🛒",
        color: "#10B981",
        is_default: true,
      });
    });

    it("should handle fetch categories error", async () => {
      mockData.task_categories = null;

      await useTaskStore.getState().fetchCategories();

      const state = useTaskStore.getState();
      expect(state.categories).toEqual([]);
    });
  });

  describe("fetchTasks", () => {
    it("should fetch tasks successfully", async () => {
      const mockTasks: Task[] = [mockTask];
      mockData.tasks = mockTasks;

      await useTaskStore.getState().fetchTasks("household-1");

      const state = useTaskStore.getState();
      expect(state.tasks).toEqual(mockTasks);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during fetch", async () => {
      mockData.tasks = [mockTask];

      await useTaskStore.getState().fetchTasks("household-1");

      const state = useTaskStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.tasks).toEqual([mockTask]);
    });

    it("should schedule notifications for pending tasks", async () => {
      const mockTasks: Task[] = [
        mockTask,
        { ...mockTask, id: "task-2", status: "completed" },
      ];
      mockData.tasks = mockTasks;

      await useTaskStore.getState().fetchTasks("household-1");

      expect(notificationService.scheduleAllTaskReminders).toHaveBeenCalledWith([mockTask]);
    });

    it("should handle empty task list", async () => {
      mockData.tasks = [];

      await useTaskStore.getState().fetchTasks("household-1");

      const state = useTaskStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.tasks).toEqual([]);
    });
  });

  describe("createTask", () => {
    it("should create task successfully", async () => {
      const newTask: Partial<Task> = {
        household_id: "household-1",
        title: "Nova tarefa",
        status: "pending",
        priority: 2,
        is_recurring: false,
        recurrence_interval: 1,
      };

      const result = await useTaskStore.getState().createTask(newTask);

      expect(result.error).toBeNull();
      const state = useTaskStore.getState();
      expect(state.tasks[0]).toMatchObject({
        title: "Nova tarefa",
        household_id: "household-1",
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should schedule notification for new pending task", async () => {
      const newTask: Partial<Task> = {
        household_id: "household-1",
        title: "Nova tarefa",
        status: "pending",
        priority: 2,
        is_recurring: false,
        recurrence_interval: 1,
      };

      await useTaskStore.getState().createTask(newTask);

      expect(notificationService.scheduleTaskReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Nova tarefa",
          status: "pending",
        })
      );
    });

    it("should not schedule notification for completed task", async () => {
      const newTask: Partial<Task> = {
        household_id: "household-1",
        title: "Nova tarefa",
        status: "completed",
        priority: 2,
        is_recurring: false,
        recurrence_interval: 1,
      };

      const createdTask: Task = {
        ...mockTask,
        ...newTask,
        id: "task-new",
        status: "completed",
      };

      mockData.tasks = [createdTask];

      await useTaskStore.getState().createTask(newTask);

      expect(notificationService.scheduleTaskReminder).not.toHaveBeenCalled();
    });

    it("should add task to store after creation", async () => {
      const initialCount = useTaskStore.getState().tasks.length;

      await useTaskStore.getState().createTask({
        household_id: "household-1",
        title: "Test Task",
        priority: 2,
        is_recurring: false,
        recurrence_interval: 1,
      });

      const state = useTaskStore.getState();
      expect(state.tasks.length).toBe(initialCount + 1);
      expect(state.tasks[0].title).toBe("Test Task");
    });
  });

  describe("updateTask", () => {
    beforeEach(() => {
      useTaskStore.setState({
        tasks: [mockTask],
      });
    });

    it("should update task successfully", async () => {
      const updates = { title: "Título atualizado" };
      const updatedTask = { ...mockTask, ...updates };

      mockData.tasks = [updatedTask];

      const result = await useTaskStore.getState().updateTask("task-1", updates);

      expect(result.error).toBeNull();
      const state = useTaskStore.getState();
      expect(state.tasks[0].title).toBe("Título atualizado");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should reschedule notification when updating pending task", async () => {
      const updates = { due_date: "2024-01-20" };
      const updatedTask = { ...mockTask, ...updates, status: "pending" };

      mockData.tasks = [updatedTask];

      await useTaskStore.getState().updateTask("task-1", updates);

      expect(notificationService.scheduleTaskReminder).toHaveBeenCalledWith(updatedTask);
    });

    it("should cancel notification when task is no longer pending", async () => {
      const updates = { status: "completed" as const };
      const updatedTask = { ...mockTask, ...updates };

      mockData.tasks = [updatedTask];

      await useTaskStore.getState().updateTask("task-1", updates);

      expect(notificationService.cancelNotificationsByTag).toHaveBeenCalledWith("task_task-1");
    });

    it("should preserve task state when update succeeds", async () => {
      const updates = { title: "Updated Title", priority: 3 as const };
      const updatedTask = { ...mockTask, ...updates };

      mockData.tasks = [updatedTask];

      await useTaskStore.getState().updateTask("task-1", updates);

      const state = useTaskStore.getState();
      expect(state.tasks[0]).toMatchObject({
        id: "task-1",
        title: "Updated Title",
        priority: 3,
      });
    });
  });

  describe("deleteTask", () => {
    beforeEach(() => {
      useTaskStore.setState({
        tasks: [mockTask],
      });
    });

    it("should delete task successfully", async () => {
      mockData.tasks = [];

      const result = await useTaskStore.getState().deleteTask("task-1");

      expect(result.error).toBeNull();
      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should cancel notification when deleting task", async () => {
      mockData.tasks = [];

      await useTaskStore.getState().deleteTask("task-1");

      expect(notificationService.cancelNotificationsByTag).toHaveBeenCalledWith("task_task-1");
    });

    it("should handle delete of already deleted task", async () => {
      // Delete the task first
      await useTaskStore.getState().deleteTask("task-1");

      // Try to delete again - should succeed but not affect state
      const result = await useTaskStore.getState().deleteTask("task-1");

      expect(result.error).toBeNull();
      const state = useTaskStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.tasks).toHaveLength(0);
    });
  });

  describe("completeTask", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return error if task not found", async () => {
      useTaskStore.setState({ tasks: [] });

      const result = await useTaskStore.getState().completeTask("task-1", "user-1");

      expect(result.error).toBe("Task not found");
    });

    it("should complete non-recurring task", async () => {
      useTaskStore.setState({ tasks: [mockTask] });

      const completedTask = {
        ...mockTask,
        status: "completed" as const,
        completed_at: "2024-01-15T12:00:00.000Z",
        completed_by: "user-1",
      };

      mockData.tasks = [completedTask];

      const result = await useTaskStore.getState().completeTask("task-1", "user-1");

      expect(result.error).toBeNull();
    });

    it("should handle daily recurring task", async () => {
      const recurringTask = {
        ...mockTask,
        is_recurring: true,
        recurrence_type: "daily" as const,
        recurrence_interval: 1,
      };

      useTaskStore.setState({ tasks: [recurringTask] });

      const updatedTask = {
        ...recurringTask,
        status: "pending" as const,
        next_occurrence: "2024-01-16",
        due_date: "2024-01-16",
      };

      mockData.tasks = [updatedTask];
      mockData.task_completions = [];

      await useTaskStore.getState().completeTask("task-1", "user-1");

      expect(mockData.task_completions).toHaveLength(1);
      expect(mockData.task_completions[0].task_id).toBe("task-1");
      expect(mockData.task_completions[0].completed_by).toBe("user-1");
    });

    it("should handle weekly recurring task", async () => {
      const recurringTask = {
        ...mockTask,
        is_recurring: true,
        recurrence_type: "weekly" as const,
        recurrence_interval: 2,
      };

      useTaskStore.setState({ tasks: [recurringTask] });

      const updatedTask = {
        ...recurringTask,
        status: "pending" as const,
        next_occurrence: "2024-01-29",
        due_date: "2024-01-29",
      };

      mockData.tasks = [updatedTask];
      mockData.task_completions = [];

      await useTaskStore.getState().completeTask("task-1", "user-1");

      expect(mockData.task_completions).toHaveLength(1);
    });

    it("should handle monthly recurring task", async () => {
      const recurringTask = {
        ...mockTask,
        is_recurring: true,
        recurrence_type: "monthly" as const,
        recurrence_interval: 1,
      };

      useTaskStore.setState({ tasks: [recurringTask] });

      const updatedTask = {
        ...recurringTask,
        status: "pending" as const,
        next_occurrence: "2024-02-15",
        due_date: "2024-02-15",
      };

      mockData.tasks = [updatedTask];
      mockData.task_completions = [];

      await useTaskStore.getState().completeTask("task-1", "user-1");

      expect(mockData.task_completions).toHaveLength(1);
    });
  });

  describe("skipTask", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return error if task not found", async () => {
      useTaskStore.setState({ tasks: [] });

      const result = await useTaskStore.getState().skipTask("task-1");

      expect(result.error).toBe("Task not found");
    });

    it("should skip non-recurring task by setting status to skipped", async () => {
      useTaskStore.setState({ tasks: [mockTask] });

      const skippedTask = {
        ...mockTask,
        status: "skipped" as const,
      };

      mockData.tasks = [skippedTask];

      const result = await useTaskStore.getState().skipTask("task-1");

      expect(result.error).toBeNull();
    });

    it("should skip recurring task by updating next occurrence", async () => {
      const recurringTask = {
        ...mockTask,
        is_recurring: true,
        recurrence_type: "daily" as const,
        recurrence_interval: 1,
      };

      useTaskStore.setState({ tasks: [recurringTask] });

      const updatedTask = {
        ...recurringTask,
        next_occurrence: "2024-01-16",
        due_date: "2024-01-16",
      };

      mockData.tasks = [updatedTask];

      const result = await useTaskStore.getState().skipTask("task-1");

      expect(result.error).toBeNull();
    });

    it("should skip weekly recurring task correctly", async () => {
      const recurringTask = {
        ...mockTask,
        is_recurring: true,
        recurrence_type: "weekly" as const,
        recurrence_interval: 1,
      };

      useTaskStore.setState({ tasks: [recurringTask] });

      const updatedTask = {
        ...recurringTask,
        next_occurrence: "2024-01-22",
        due_date: "2024-01-22",
      };

      mockData.tasks = [updatedTask];

      const result = await useTaskStore.getState().skipTask("task-1");

      expect(result.error).toBeNull();
    });

    it("should skip monthly recurring task correctly", async () => {
      const recurringTask = {
        ...mockTask,
        is_recurring: true,
        recurrence_type: "monthly" as const,
        recurrence_interval: 1,
      };

      useTaskStore.setState({ tasks: [recurringTask] });

      const updatedTask = {
        ...recurringTask,
        next_occurrence: "2024-02-15",
        due_date: "2024-02-15",
      };

      mockData.tasks = [updatedTask];

      const result = await useTaskStore.getState().skipTask("task-1");

      expect(result.error).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useTaskStore.setState({ error: "Some error" });

      useTaskStore.getState().clearError();

      const state = useTaskStore.getState();
      expect(state.error).toBeNull();
    });

    it("should only clear error without affecting other state", () => {
      useTaskStore.setState({
        error: "Some error",
        tasks: [mockTask],
        isLoading: true,
      });

      useTaskStore.getState().clearError();

      const state = useTaskStore.getState();
      expect(state.error).toBeNull();
      expect(state.tasks).toHaveLength(1);
      expect(state.isLoading).toBe(true);
    });
  });

  describe("Helper Functions", () => {
    const today = "2024-01-15";
    const yesterday = "2024-01-14";
    const tomorrow = "2024-01-16";
    const nextWeek = "2024-01-22";
    const farFuture = "2024-02-01";

    const testTasks: Task[] = [
      { ...mockTask, id: "task-today", due_date: today, status: "pending" },
      { ...mockTask, id: "task-yesterday", due_date: yesterday, status: "pending" },
      { ...mockTask, id: "task-tomorrow", due_date: tomorrow, status: "pending" },
      { ...mockTask, id: "task-next-week", due_date: nextWeek, status: "pending" },
      { ...mockTask, id: "task-far", due_date: farFuture, status: "pending" },
      { ...mockTask, id: "task-completed", due_date: today, status: "completed" },
      { ...mockTask, id: "task-skipped", due_date: today, status: "skipped" },
    ];

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(`${today}T12:00:00Z`));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe("getTasksForToday", () => {
      it("should return only pending tasks for today", () => {
        const result = getTasksForToday(testTasks);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("task-today");
      });

      it("should return empty array when no tasks for today", () => {
        const tasks = testTasks.filter((t) => t.due_date !== today);
        const result = getTasksForToday(tasks);

        expect(result).toEqual([]);
      });
    });

    describe("getTasksForWeek", () => {
      it("should return pending tasks for the next 7 days", () => {
        const result = getTasksForWeek(testTasks);

        expect(result.length).toBeGreaterThan(0);
        const ids = result.map((t) => t.id);
        expect(ids).toContain("task-today");
        expect(ids).toContain("task-tomorrow");
        expect(ids).toContain("task-next-week");
      });

      it("should not include overdue tasks", () => {
        const result = getTasksForWeek(testTasks);
        const ids = result.map((t) => t.id);

        expect(ids).not.toContain("task-yesterday");
      });

      it("should not include completed or skipped tasks", () => {
        const result = getTasksForWeek(testTasks);
        const ids = result.map((t) => t.id);

        expect(ids).not.toContain("task-completed");
        expect(ids).not.toContain("task-skipped");
      });
    });

    describe("getPendingTasks", () => {
      it("should return all pending tasks", () => {
        const result = getPendingTasks(testTasks);

        expect(result).toHaveLength(5);
        result.forEach((task) => {
          expect(task.status).toBe("pending");
        });
      });
    });

    describe("getCompletedTasks", () => {
      it("should return all completed tasks", () => {
        const result = getCompletedTasks(testTasks);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("task-completed");
      });
    });

    describe("getOverdueTasks", () => {
      it("should return pending tasks with due date before today", () => {
        const result = getOverdueTasks(testTasks);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("task-yesterday");
      });

      it("should not include today's tasks as overdue", () => {
        const result = getOverdueTasks(testTasks);
        const ids = result.map((t) => t.id);

        expect(ids).not.toContain("task-today");
      });

      it("should not include completed or skipped tasks", () => {
        const tasksWithOverdue = [
          ...testTasks,
          { ...mockTask, id: "task-old-completed", due_date: "2024-01-01", status: "completed" as const },
          { ...mockTask, id: "task-old-skipped", due_date: "2024-01-02", status: "skipped" as const },
        ];

        const result = getOverdueTasks(tasksWithOverdue);
        const ids = result.map((t) => t.id);

        expect(ids).not.toContain("task-old-completed");
        expect(ids).not.toContain("task-old-skipped");
      });
    });
  });
});
