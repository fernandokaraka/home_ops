import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { ShoppingListItem, ShoppingPriority, InventoryUnit } from "@/types";
import { useInventoryStore, getLowStockItems } from "./inventoryStore";

interface ShoppingState {
  items: ShoppingListItem[];
  isLoading: boolean;
  error: string | null;
}

interface ShoppingActions {
  fetchItems: (householdId: string) => Promise<void>;
  addItem: (item: Partial<ShoppingListItem>) => Promise<{ error: string | null; data?: ShoppingListItem }>;
  updateItem: (id: string, updates: Partial<ShoppingListItem>) => Promise<{ error: string | null }>;
  deleteItem: (id: string) => Promise<{ error: string | null }>;
  toggleItem: (id: string) => Promise<{ error: string | null }>;
  clearCheckedItems: (householdId: string) => Promise<{ error: string | null }>;
  addFromLowStock: (householdId: string, userId: string) => Promise<{ error: string | null; added: number }>;
  completeShoppingAndUpdateStock: (householdId: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useShoppingStore = create<ShoppingState & ShoppingActions>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async (householdId: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("shopping_list")
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .eq("household_id", householdId)
      .order("is_checked", { ascending: true })
      .order("priority", { ascending: false })
      .order("added_at", { ascending: false });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ items: data || [], isLoading: false });
  },

  addItem: async (item: Partial<ShoppingListItem>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("shopping_list")
      .insert(item)
      .select(`
        *,
        inventory_item:inventory_items(*)
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

    return { error: null, data };
  },

  updateItem: async (id: string, updates: Partial<ShoppingListItem>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("shopping_list")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        inventory_item:inventory_items(*)
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
      .from("shopping_list")
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

  toggleItem: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return { error: "Item not found" };

    const now = new Date().toISOString();
    const updates = {
      is_checked: !item.is_checked,
      checked_at: !item.is_checked ? now : null,
    };

    return get().updateItem(id, updates);
  },

  clearCheckedItems: async (householdId: string) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase
      .from("shopping_list")
      .delete()
      .eq("household_id", householdId)
      .eq("is_checked", true);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      items: state.items.filter((i) => !i.is_checked),
      isLoading: false,
    }));

    return { error: null };
  },

  addFromLowStock: async (householdId: string, userId: string) => {
    set({ isLoading: true, error: null });

    // Get low stock items from inventory
    const inventoryItems = useInventoryStore.getState().items;
    const lowStockItems = getLowStockItems(inventoryItems);

    if (lowStockItems.length === 0) {
      set({ isLoading: false });
      return { error: null, added: 0 };
    }

    // Check which items are already in shopping list
    const existingNames = get().items.map((i) => i.name.toLowerCase());
    const itemsToAdd = lowStockItems.filter(
      (item) => !existingNames.includes(item.name.toLowerCase())
    );

    if (itemsToAdd.length === 0) {
      set({ isLoading: false });
      return { error: null, added: 0 };
    }

    // Create shopping list items
    const shoppingItems = itemsToAdd.map((item) => ({
      household_id: householdId,
      inventory_item_id: item.id,
      name: item.name,
      quantity: item.min_quantity ? item.min_quantity - item.quantity : 1,
      unit: item.unit,
      added_by: userId,
      priority: "normal" as ShoppingPriority,
    }));

    const { data, error } = await supabase
      .from("shopping_list")
      .insert(shoppingItems)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message, added: 0 };
    }

    set((state) => ({
      items: [...(data || []), ...state.items],
      isLoading: false,
    }));

    return { error: null, added: data?.length || 0 };
  },

  completeShoppingAndUpdateStock: async (householdId: string) => {
    set({ isLoading: true, error: null });

    const checkedItems = get().items.filter((i) => i.is_checked);

    // Update inventory for checked items that have linked inventory items
    const inventoryStore = useInventoryStore.getState();
    const updatePromises = checkedItems
      .filter((item) => item.inventory_item_id)
      .map((item) => inventoryStore.restockItem(item.inventory_item_id!, item.quantity));

    await Promise.all(updatePromises);

    // Clear checked items from shopping list
    const result = await get().clearCheckedItems(householdId);

    set({ isLoading: false });
    return result;
  },

  clearError: () => set({ error: null }),
}));

// Helpers - Get unchecked items
export const getUncheckedItems = (items: ShoppingListItem[]) => {
  return items.filter((item) => !item.is_checked);
};

// Helpers - Get checked items
export const getCheckedItems = (items: ShoppingListItem[]) => {
  return items.filter((item) => item.is_checked);
};

// Helpers - Get items by priority
export const getItemsByPriority = (items: ShoppingListItem[], priority: ShoppingPriority | "all") => {
  if (priority === "all") return items;
  return items.filter((item) => item.priority === priority);
};

// Helpers - Get items count summary
export const getItemsSummary = (items: ShoppingListItem[]) => {
  const total = items.length;
  const checked = items.filter((i) => i.is_checked).length;
  const unchecked = total - checked;
  const highPriority = items.filter((i) => i.priority === "high" && !i.is_checked).length;

  return { total, checked, unchecked, highPriority };
};

// Helpers - Search items by name
export const searchShoppingItems = (items: ShoppingListItem[], query: string) => {
  if (!query.trim()) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
};

// Helpers - Sort items
export const sortShoppingItems = (
  items: ShoppingListItem[],
  sortBy: "priority" | "name" | "added"
): ShoppingListItem[] => {
  const sorted = [...items];

  switch (sortBy) {
    case "priority":
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return sorted.sort((a, b) => {
        if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    case "name":
      return sorted.sort((a, b) => {
        if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    case "added":
      return sorted.sort((a, b) => {
        if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      });
    default:
      return sorted;
  }
};
