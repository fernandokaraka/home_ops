import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { MaintenanceItem, MaintenanceCategory, MaintenanceHistory, Attachment } from "@/types";
import {
  scheduleMaintenanceReminder,
  cancelNotificationsByTag,
  scheduleAllMaintenanceReminders,
} from "@/services/notificationService";
import {
  uploadFile,
  deleteFile,
  generateStoragePath,
} from "@/services/storageService";

interface MaintenanceState {
  items: MaintenanceItem[];
  categories: MaintenanceCategory[];
  history: MaintenanceHistory[];
  attachments: Attachment[];
  isLoading: boolean;
  error: string | null;
}

interface MaintenanceActions {
  fetchItems: (householdId: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchHistory: (itemId: string) => Promise<void>;
  createItem: (item: Partial<MaintenanceItem>) => Promise<{ error: string | null; data?: MaintenanceItem }>;
  updateItem: (id: string, updates: Partial<MaintenanceItem>) => Promise<{ error: string | null }>;
  deleteItem: (id: string) => Promise<{ error: string | null }>;
  registerMaintenance: (data: Partial<MaintenanceHistory>) => Promise<{ error: string | null }>;
  fetchAttachments: (itemId: string) => Promise<void>;
  addAttachment: (
    itemId: string,
    householdId: string,
    file: { uri: string; name: string; type: string; size?: number },
    userId?: string
  ) => Promise<{ error: string | null }>;
  deleteAttachment: (attachmentId: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useMaintenanceStore = create<MaintenanceState & MaintenanceActions>((set, get) => ({
  items: [],
  categories: [],
  history: [],
  attachments: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    const { data, error } = await supabase
      .from("maintenance_categories")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching maintenance categories:", error);
      return;
    }

    set({ categories: data || [] });
  },

  fetchItems: async (householdId: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("maintenance_items")
      .select(`
        *,
        category:maintenance_categories(*)
      `)
      .eq("household_id", householdId)
      .order("next_maintenance_date", { ascending: true, nullsFirst: false });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ items: data || [], isLoading: false });

    // Schedule notifications for all maintenance items
    scheduleAllMaintenanceReminders(data || []);
  },

  fetchHistory: async (itemId: string) => {
    const { data, error } = await supabase
      .from("maintenance_history")
      .select("*")
      .eq("item_id", itemId)
      .order("maintenance_date", { ascending: false });

    if (error) {
      console.error("Error fetching maintenance history:", error);
      return;
    }

    set({ history: data || [] });
  },

  createItem: async (item: Partial<MaintenanceItem>) => {
    set({ isLoading: true, error: null });

    // Calcular próxima manutenção se tiver intervalo e última data
    let nextMaintenanceDate = item.next_maintenance_date;
    if (item.maintenance_interval_months && item.last_maintenance_date) {
      const lastDate = new Date(item.last_maintenance_date + "T00:00:00");
      if (!isNaN(lastDate.getTime())) {
        lastDate.setMonth(lastDate.getMonth() + item.maintenance_interval_months);
        nextMaintenanceDate = lastDate.toISOString().split("T")[0];
      }
    }

    const { data, error } = await supabase
      .from("maintenance_items")
      .insert({ ...item, next_maintenance_date: nextMaintenanceDate })
      .select(`
        *,
        category:maintenance_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      items: [data, ...state.items],
      isLoading: false,
    }));

    // Schedule notification for new maintenance item
    scheduleMaintenanceReminder(data);

    return { error: null, data };
  },

  updateItem: async (id: string, updates: Partial<MaintenanceItem>) => {
    set({ isLoading: true, error: null });

    // Recalcular próxima manutenção se necessário
    let nextMaintenanceDate = updates.next_maintenance_date;
    if (updates.maintenance_interval_months && updates.last_maintenance_date) {
      const lastDate = new Date(updates.last_maintenance_date + "T00:00:00");
      if (!isNaN(lastDate.getTime())) {
        lastDate.setMonth(lastDate.getMonth() + updates.maintenance_interval_months);
        nextMaintenanceDate = lastDate.toISOString().split("T")[0];
      }
    }

    const { data, error } = await supabase
      .from("maintenance_items")
      .update({ ...updates, next_maintenance_date: nextMaintenanceDate })
      .eq("id", id)
      .select(`
        *,
        category:maintenance_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      items: state.items.map((i) => (i.id === id ? data : i)),
      isLoading: false,
    }));

    // Update notification for maintenance item
    scheduleMaintenanceReminder(data);

    return { error: null };
  },

  deleteItem: async (id: string) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase
      .from("maintenance_items")
      .delete()
      .eq("id", id);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      isLoading: false,
    }));

    // Cancel notification for deleted item
    cancelNotificationsByTag(`maintenance_${id}`);

    return { error: null };
  },

  registerMaintenance: async (data: Partial<MaintenanceHistory>) => {
    set({ isLoading: true, error: null });

    // Inserir no histórico
    const { error: historyError } = await supabase
      .from("maintenance_history")
      .insert(data);

    if (historyError) {
      set({ isLoading: false, error: historyError.message });
      return { error: historyError.message };
    }

    // Atualizar item com nova data de última manutenção
    const item = get().items.find((i) => i.id === data.item_id);
    if (item && item.maintenance_interval_months && data.maintenance_date) {
      const nextDate = new Date(data.maintenance_date + "T00:00:00");
      if (!isNaN(nextDate.getTime())) {
        nextDate.setMonth(nextDate.getMonth() + item.maintenance_interval_months);

        await get().updateItem(item.id, {
          last_maintenance_date: data.maintenance_date,
          next_maintenance_date: nextDate.toISOString().split("T")[0],
        });
      }
    }

    set({ isLoading: false });
    return { error: null };
  },

  fetchAttachments: async (itemId: string) => {
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("item_id", itemId)
      .eq("item_type", "maintenance_item")
      .order("created_at", { ascending: false });

    if (error) {
      return;
    }

    set({ attachments: data || [] });
  },

  addAttachment: async (
    itemId: string,
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
        item_id: itemId,
        item_type: "maintenance_item",
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

// Helpers
export const getUpcomingMaintenance = (items: MaintenanceItem[], days: number = 30) => {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);

  const todayStr = today.toISOString().split("T")[0];
  const futureDateStr = futureDate.toISOString().split("T")[0];

  return items.filter(
    (item) =>
      item.next_maintenance_date &&
      item.next_maintenance_date >= todayStr &&
      item.next_maintenance_date <= futureDateStr
  );
};

export const getOverdueMaintenance = (items: MaintenanceItem[]) => {
  const today = new Date().toISOString().split("T")[0];
  return items.filter(
    (item) => item.next_maintenance_date && item.next_maintenance_date < today
  );
};

export const getItemsByCategory = (items: MaintenanceItem[], categoryId: string) => {
  if (categoryId === "all") return items;
  return items.filter((item) => item.category_id === categoryId);
};

export const getDaysUntilMaintenance = (nextDate?: string | null): number | null => {
  if (!nextDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(nextDate + "T00:00:00");
  const diffTime = next.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getMaintenanceStatus = (nextDate?: string | null): "ok" | "warning" | "overdue" | "none" => {
  const days = getDaysUntilMaintenance(nextDate);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 7) return "warning";
  return "ok";
};
