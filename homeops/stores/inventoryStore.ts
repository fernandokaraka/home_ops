import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  InventoryItem,
  InventoryCategory,
  InventoryLocation,
  InventoryUnit,
} from "@/types";

interface InventoryState {
  items: InventoryItem[];
  categories: InventoryCategory[];
  isLoading: boolean;
  error: string | null;
}

interface InventoryActions {
  fetchItems: (householdId: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  createItem: (item: Partial<InventoryItem>) => Promise<{ error: string | null; data?: InventoryItem }>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<{ error: string | null }>;
  deleteItem: (id: string) => Promise<{ error: string | null }>;
  consumeItem: (id: string, quantity: number) => Promise<{ error: string | null }>;
  restockItem: (id: string, quantity: number) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState & InventoryActions>((set, get) => ({
  items: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    const { data, error } = await supabase
      .from("inventory_categories")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching inventory categories:", error);
      return;
    }

    set({ categories: data || [] });
  },

  fetchItems: async (householdId: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("inventory_items")
      .select(`
        *,
        category:inventory_categories(*)
      `)
      .eq("household_id", householdId)
      .order("name");

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ items: data || [], isLoading: false });
  },

  createItem: async (item: Partial<InventoryItem>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("inventory_items")
      .insert(item)
      .select(`
        *,
        category:inventory_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      items: [...state.items, data].sort((a, b) => a.name.localeCompare(b.name)),
      isLoading: false,
    }));

    return { error: null, data };
  },

  updateItem: async (id: string, updates: Partial<InventoryItem>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("inventory_items")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        category:inventory_categories(*)
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

    return { error: null };
  },

  deleteItem: async (id: string) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase
      .from("inventory_items")
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

    return { error: null };
  },

  consumeItem: async (id: string, quantity: number) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return { error: "Item not found" };

    const newQuantity = Math.max(0, item.quantity - quantity);

    return get().updateItem(id, { quantity: newQuantity });
  },

  restockItem: async (id: string, quantity: number) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return { error: "Item not found" };

    const newQuantity = item.quantity + quantity;
    const today = new Date().toISOString().split("T")[0];

    return get().updateItem(id, {
      quantity: newQuantity,
      last_purchase_date: today,
    });
  },

  clearError: () => set({ error: null }),
}));

// Helpers - Filter by location
export const getItemsByLocation = (items: InventoryItem[], location: InventoryLocation | "all") => {
  if (location === "all") return items;
  return items.filter((item) => item.location === location);
};

// Helpers - Filter by category
export const getItemsByCategory = (items: InventoryItem[], categoryId: string | "all") => {
  if (categoryId === "all") return items;
  return items.filter((item) => item.category_id === categoryId);
};

// Helpers - Get low stock items (quantity <= min_quantity)
export const getLowStockItems = (items: InventoryItem[]) => {
  return items.filter(
    (item) => item.min_quantity !== null && item.quantity <= item.min_quantity
  );
};

// Helpers - Get expiring items within X days
export const getExpiringItems = (items: InventoryItem[], days: number = 7) => {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);

  const todayStr = today.toISOString().split("T")[0];
  const futureDateStr = futureDate.toISOString().split("T")[0];

  return items.filter(
    (item) =>
      item.expiration_date &&
      item.expiration_date >= todayStr &&
      item.expiration_date <= futureDateStr
  );
};

// Helpers - Get expired items
export const getExpiredItems = (items: InventoryItem[]) => {
  const today = new Date().toISOString().split("T")[0];
  return items.filter((item) => item.expiration_date && item.expiration_date < today);
};

// Helpers - Get items due for repurchase
export const getRepurchaseItems = (items: InventoryItem[]) => {
  const today = new Date();

  return items.filter((item) => {
    if (!item.is_recurring || !item.purchase_interval_days || !item.last_purchase_date) {
      return false;
    }

    const lastPurchase = new Date(item.last_purchase_date + "T00:00:00");
    const nextPurchase = new Date(lastPurchase);
    nextPurchase.setDate(lastPurchase.getDate() + item.purchase_interval_days);

    return nextPurchase <= today;
  });
};

// Helpers - Get days until expiration
export const getDaysUntilExpiration = (expirationDate?: string | null): number | null => {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate + "T00:00:00");
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helpers - Get expiration status
export const getExpirationStatus = (
  expirationDate?: string | null
): "ok" | "warning" | "expired" | "none" => {
  const days = getDaysUntilExpiration(expirationDate);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 7) return "warning";
  return "ok";
};

// Helpers - Get stock status
export const getStockStatus = (
  quantity: number,
  minQuantity?: number | null
): "ok" | "low" | "out" => {
  if (quantity <= 0) return "out";
  if (minQuantity !== null && quantity <= minQuantity) return "low";
  return "ok";
};

// Helpers - Format quantity with unit
export const formatQuantityWithUnit = (quantity: number, unit: InventoryUnit): string => {
  const unitLabels: Record<InventoryUnit, string> = {
    un: quantity === 1 ? "unidade" : "unidades",
    kg: "kg",
    g: "g",
    l: "L",
    ml: "ml",
    pack: quantity === 1 ? "pacote" : "pacotes",
  };

  // Format number to remove trailing zeros
  const formattedQty = Number.isInteger(quantity) ? quantity : quantity.toFixed(1);

  return `${formattedQty} ${unitLabels[unit]}`;
};

// Helpers - Search items by name
export const searchItems = (items: InventoryItem[], query: string) => {
  if (!query.trim()) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
};
