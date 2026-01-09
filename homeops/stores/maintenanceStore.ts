import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { MaintenanceItem, MaintenanceCategory, MaintenanceHistory } from "@/types";
import {
  scheduleMaintenanceReminder,
  cancelNotificationsByTag,
  scheduleAllMaintenanceReminders,
} from "@/services/notificationService";

interface MaintenanceState {
  items: MaintenanceItem[];
  categories: MaintenanceCategory[];
  history: MaintenanceHistory[];
  isLoading: boolean;
  error: string | null;
}

interface MaintenanceActions {
  fetchItems: (householdId: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchHistory: (itemId: string) => Promise<void>;
  createItem: (item: Partial<MaintenanceItem>) => Promise<{ error: string | null }>;
  updateItem: (id: string, updates: Partial<MaintenanceItem>) => Promise<{ error: string | null }>;
  deleteItem: (id: string) => Promise<{ error: string | null }>;
  registerMaintenance: (data: Partial<MaintenanceHistory>) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useMaintenanceStore = create<MaintenanceState & MaintenanceActions>((set, get) => ({
  items: [],
  categories: [],
  history: [],
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

    return { error: null };
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
