import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Task, TaskCategory, Attachment } from "@/types";
import {
  scheduleTaskReminder,
  cancelNotificationsByTag,
  scheduleAllTaskReminders,
} from "@/services/notificationService";
import {
  uploadFile,
  deleteFile,
  generateStoragePath,
} from "@/services/storageService";

interface TaskState {
  tasks: Task[];
  categories: TaskCategory[];
  attachments: Attachment[];
  isLoading: boolean;
  error: string | null;
}

interface TaskActions {
  fetchTasks: (householdId: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<{ error: string | null; data?: Task }>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<{ error: string | null }>;
  deleteTask: (id: string) => Promise<{ error: string | null }>;
  completeTask: (id: string, userId: string) => Promise<{ error: string | null }>;
  skipTask: (id: string) => Promise<{ error: string | null }>;
  fetchAttachments: (taskId: string) => Promise<void>;
  addAttachment: (
    taskId: string,
    householdId: string,
    file: { uri: string; name: string; type: string; size?: number },
    userId?: string
  ) => Promise<{ error: string | null }>;
  deleteAttachment: (attachmentId: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useTaskStore = create<TaskState & TaskActions>((set, get) => ({
  tasks: [],
  categories: [],
  attachments: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    const { data, error } = await supabase
      .from("task_categories")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }

    set({ categories: data || [] });
  },

  fetchTasks: async (householdId: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        category:task_categories(*)
      `)
      .eq("household_id", householdId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ tasks: data || [], isLoading: false });

    // Schedule notifications for all pending tasks
    const pendingTasks = (data || []).filter((t) => t.status === "pending");
    scheduleAllTaskReminders(pendingTasks);
  },

  createTask: async (task: Partial<Task>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("tasks")
      .insert(task)
      .select(`
        *,
        category:task_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      tasks: [data, ...state.tasks],
      isLoading: false,
    }));

    // Schedule notification for new task
    if (data.status === "pending") {
      scheduleTaskReminder(data);
    }

    return { error: null, data };
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        category:task_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? data : t)),
      isLoading: false,
    }));

    // Update notification for updated task
    if (data.status === "pending") {
      scheduleTaskReminder(data);
    } else {
      // Cancel notification if task is no longer pending
      cancelNotificationsByTag(`task_${id}`);
    }

    return { error: null };
  },

  deleteTask: async (id: string) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      isLoading: false,
    }));

    // Cancel notification for deleted task
    cancelNotificationsByTag(`task_${id}`);

    return { error: null };
  },

  completeTask: async (id: string, userId: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return { error: "Task not found" };

    // Se for recorrente, calcula próxima ocorrência
    let updates: Partial<Task> = {
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: userId,
    };

    if (task.is_recurring && task.recurrence_type) {
      const today = new Date();
      let nextDate = new Date(today);

      switch (task.recurrence_type) {
        case "daily":
          nextDate.setDate(today.getDate() + (task.recurrence_interval || 1));
          break;
        case "weekly":
          nextDate.setDate(today.getDate() + 7 * (task.recurrence_interval || 1));
          break;
        case "monthly":
          nextDate.setMonth(today.getMonth() + (task.recurrence_interval || 1));
          break;
      }

      updates = {
        ...updates,
        status: "pending", // Reseta para pendente
        next_occurrence: nextDate.toISOString().split("T")[0],
        due_date: nextDate.toISOString().split("T")[0],
        completed_at: undefined,
        completed_by: undefined,
      };

      // Registra no histórico
      await supabase.from("task_completions").insert({
        task_id: id,
        completed_by: userId,
        completed_at: new Date().toISOString(),
      });
    }

    return get().updateTask(id, updates);
  },

  skipTask: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return { error: "Task not found" };

    if (task.is_recurring && task.recurrence_type) {
      const today = new Date();
      let nextDate = new Date(today);

      switch (task.recurrence_type) {
        case "daily":
          nextDate.setDate(today.getDate() + (task.recurrence_interval || 1));
          break;
        case "weekly":
          nextDate.setDate(today.getDate() + 7 * (task.recurrence_interval || 1));
          break;
        case "monthly":
          nextDate.setMonth(today.getMonth() + (task.recurrence_interval || 1));
          break;
      }

      return get().updateTask(id, {
        next_occurrence: nextDate.toISOString().split("T")[0],
        due_date: nextDate.toISOString().split("T")[0],
      });
    }

    return get().updateTask(id, { status: "skipped" });
  },

  fetchAttachments: async (taskId: string) => {
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("item_id", taskId)
      .eq("item_type", "task")
      .order("created_at", { ascending: false });

    if (error) {
      return;
    }

    set({ attachments: data || [] });
  },

  addAttachment: async (
    taskId: string,
    householdId: string,
    file: { uri: string; name: string; type: string; size?: number },
    userId?: string
  ) => {
    set({ isLoading: true, error: null });

    // Generate unique storage path
    const storagePath = generateStoragePath(householdId, file.name);

    // Upload file to Supabase Storage
    const fileUrl = await uploadFile(file.uri, "attachments", storagePath);

    if (!fileUrl) {
      set({ isLoading: false, error: "Erro ao fazer upload do arquivo" });
      return { error: "Erro ao fazer upload do arquivo" };
    }

    // Create attachment record in database
    const { data, error } = await supabase
      .from("attachments")
      .insert({
        household_id: householdId,
        item_id: taskId,
        item_type: "task",
        file_name: file.name,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size || null,
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await deleteFile("attachments", storagePath);
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      attachments: [data, ...state.attachments],
      isLoading: false,
    }));

    return { error: null };
  },

  deleteAttachment: async (attachmentId: string) => {
    set({ isLoading: true, error: null });

    // Get attachment details to extract storage path
    const attachment = get().attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      set({ isLoading: false, error: "Anexo não encontrado" });
      return { error: "Anexo não encontrado" };
    }

    // Extract storage path from file URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/attachments/[path]
    const urlParts = attachment.file_url.split("/attachments/");
    const storagePath = urlParts.length > 1 ? urlParts[1] : null;

    // Delete from database first
    const { error: dbError } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachmentId);

    if (dbError) {
      set({ isLoading: false, error: dbError.message });
      return { error: dbError.message };
    }

    // Delete file from storage
    if (storagePath) {
      await deleteFile("attachments", storagePath);
    }

    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== attachmentId),
      isLoading: false,
    }));

    return { error: null };
  },

  clearError: () => set({ error: null }),
}));

// Helpers para filtrar tarefas
export const getTasksForToday = (tasks: Task[]) => {
  const today = new Date().toISOString().split("T")[0];
  return tasks.filter(
    (t) => t.status === "pending" && t.due_date === today
  );
};

export const getTasksForWeek = (tasks: Task[]) => {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  return tasks.filter(
    (t) =>
      t.status === "pending" &&
      t.due_date &&
      t.due_date >= todayStr &&
      t.due_date <= weekEndStr
  );
};

export const getPendingTasks = (tasks: Task[]) => {
  return tasks.filter((t) => t.status === "pending");
};

export const getCompletedTasks = (tasks: Task[]) => {
  return tasks.filter((t) => t.status === "completed");
};

export const getOverdueTasks = (tasks: Task[]) => {
  const today = new Date().toISOString().split("T")[0];
  return tasks.filter(
    (t) => t.status === "pending" && t.due_date && t.due_date < today
  );
};
