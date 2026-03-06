import {
  useShoppingStore,
  getUncheckedItems,
  getCheckedItems,
  getItemsByPriority,
  getItemsSummary,
  searchShoppingItems,
  sortShoppingItems
} from "@/stores/shoppingStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { supabase } from "@/lib/supabase";
import { mockData, resetMockData } from "@supabase/supabase-js";
import type { ShoppingListItem, InventoryItem, InventoryCategory } from "@/types";

describe("shoppingStore", () => {
  const mockInventoryCategory: InventoryCategory = {
    id: "cat-1",
    name: "Alimentos",
    icon: "🍎",
    is_default: true,
  };

  const mockInventoryItem: InventoryItem = {
    id: "inv-1",
    household_id: "household-1",
    category_id: "cat-1",
    category: mockInventoryCategory,
    name: "Arroz",
    quantity: 1,
    unit: "kg",
    location: "pantry",
    min_quantity: 5,
    expiration_date: null,
    is_recurring: false,
    purchase_interval_days: null,
    last_purchase_date: null,
    notes: null,
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  };

  const mockShoppingItem: ShoppingListItem = {
    id: "shop-1",
    household_id: "household-1",
    inventory_item_id: "inv-1",
    inventory_item: mockInventoryItem,
    name: "Arroz",
    quantity: 2,
    unit: "kg",
    priority: "normal",
    is_checked: false,
    added_by: "user-1",
    added_at: "2024-01-10T10:00:00Z",
    checked_at: null,
    notes: null,
  };

  beforeEach(() => {
    resetMockData();
    jest.clearAllMocks();
    useShoppingStore.setState({
      items: [],
      isLoading: false,
      error: null,
    });
    useInventoryStore.setState({
      items: [],
      categories: [],
      isLoading: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useShoppingStore.getState();
      expect(state.items).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchItems", () => {
    it("should fetch items successfully", async () => {
      const mockItems: ShoppingListItem[] = [mockShoppingItem];
      mockData.shopping_list = mockItems;

      await useShoppingStore.getState().fetchItems("household-1");

      const state = useShoppingStore.getState();
      expect(state.items).toEqual(mockItems);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during fetch", async () => {
      mockData.shopping_list = [mockShoppingItem];

      await useShoppingStore.getState().fetchItems("household-1");

      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.items).toEqual([mockShoppingItem]);
    });

    it("should handle empty item list", async () => {
      mockData.shopping_list = [];

      await useShoppingStore.getState().fetchItems("household-1");

      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.items).toEqual([]);
    });

    it("should handle fetch error", async () => {
      mockData.shopping_list = null;

      await useShoppingStore.getState().fetchItems("household-1");

      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("addItem", () => {
    it("should add item successfully", async () => {
      const newItem: Partial<ShoppingListItem> = {
        household_id: "household-1",
        name: "Feijão",
        quantity: 1,
        unit: "kg",
        priority: "normal",
        added_by: "user-1",
      };

      const createdItem: ShoppingListItem = {
        ...mockShoppingItem,
        ...newItem,
        id: "shop-new",
        name: "Feijão",
      };

      mockData.shopping_list = [createdItem];

      const result = await useShoppingStore.getState().addItem(newItem);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      const state = useShoppingStore.getState();
      expect(state.items[0]).toMatchObject({
        name: "Feijão",
        household_id: "household-1",
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should add item to beginning of list", async () => {
      useShoppingStore.setState({ items: [mockShoppingItem] });

      const createdItem: ShoppingListItem = {
        ...mockShoppingItem,
        id: "shop-new",
        name: "Feijão",
      };

      mockData.shopping_list = [createdItem];

      await useShoppingStore.getState().addItem({
        household_id: "household-1",
        name: "Feijão",
        quantity: 1,
        unit: "kg",
        priority: "normal",
        added_by: "user-1",
      });

      const state = useShoppingStore.getState();
      expect(state.items.length).toBe(2);
      expect(state.items[0].name).toBe("Feijão");
    });

    it("should handle add error", async () => {
      mockData.shopping_list = null;

      const result = await useShoppingStore.getState().addItem({
        household_id: "household-1",
        name: "Test",
        quantity: 1,
        unit: "un",
        priority: "normal",
        added_by: "user-1",
      });

      expect(result.error).toBeTruthy();
      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("updateItem", () => {
    beforeEach(() => {
      useShoppingStore.setState({
        items: [mockShoppingItem],
      });
    });

    it("should update item successfully", async () => {
      const updates = { name: "Arroz Integral" };
      const updatedItem = { ...mockShoppingItem, ...updates };

      mockData.shopping_list = [updatedItem];

      const result = await useShoppingStore.getState().updateItem("shop-1", updates);

      expect(result.error).toBeNull();
      const state = useShoppingStore.getState();
      expect(state.items[0].name).toBe("Arroz Integral");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should preserve item state when update succeeds", async () => {
      const updates = { quantity: 5 };
      const updatedItem = { ...mockShoppingItem, ...updates };

      mockData.shopping_list = [updatedItem];

      await useShoppingStore.getState().updateItem("shop-1", updates);

      const state = useShoppingStore.getState();
      expect(state.items[0]).toMatchObject({
        id: "shop-1",
        name: "Arroz",
        quantity: 5,
      });
    });

    it("should handle update error", async () => {
      mockData.shopping_list = null;

      const result = await useShoppingStore.getState().updateItem("shop-1", { quantity: 5 });

      expect(result.error).toBeTruthy();
      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("deleteItem", () => {
    beforeEach(() => {
      useShoppingStore.setState({
        items: [mockShoppingItem],
      });
    });

    it("should delete item successfully", async () => {
      mockData.shopping_list = [];

      const result = await useShoppingStore.getState().deleteItem("shop-1");

      expect(result.error).toBeNull();
      const state = useShoppingStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should handle delete of already deleted item", async () => {
      await useShoppingStore.getState().deleteItem("shop-1");

      const result = await useShoppingStore.getState().deleteItem("shop-1");

      expect(result.error).toBeNull();
      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.items).toHaveLength(0);
    });

    it("should handle delete error", async () => {
      mockData.shopping_list = null;

      const result = await useShoppingStore.getState().deleteItem("shop-1");

      expect(result.error).toBeTruthy();
      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("toggleItem", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
      useShoppingStore.setState({
        items: [mockShoppingItem],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return error if item not found", async () => {
      const result = await useShoppingStore.getState().toggleItem("nonexistent");

      expect(result.error).toBe("Item not found");
    });

    it("should toggle item from unchecked to checked", async () => {
      const updatedItem = {
        ...mockShoppingItem,
        is_checked: true,
        checked_at: "2024-01-15T12:00:00.000Z",
      };
      mockData.shopping_list = [updatedItem];

      const result = await useShoppingStore.getState().toggleItem("shop-1");

      expect(result.error).toBeNull();
    });

    it("should toggle item from checked to unchecked", async () => {
      useShoppingStore.setState({
        items: [{ ...mockShoppingItem, is_checked: true, checked_at: "2024-01-15T12:00:00.000Z" }],
      });

      const updatedItem = {
        ...mockShoppingItem,
        is_checked: false,
        checked_at: null,
      };
      mockData.shopping_list = [updatedItem];

      const result = await useShoppingStore.getState().toggleItem("shop-1");

      expect(result.error).toBeNull();
    });
  });

  describe("clearCheckedItems", () => {
    beforeEach(() => {
      useShoppingStore.setState({
        items: [
          { ...mockShoppingItem, id: "shop-1", is_checked: true },
          { ...mockShoppingItem, id: "shop-2", is_checked: false },
          { ...mockShoppingItem, id: "shop-3", is_checked: true },
        ],
      });
    });

    it("should clear all checked items successfully", async () => {
      mockData.shopping_list = [];

      const result = await useShoppingStore.getState().clearCheckedItems("household-1");

      expect(result.error).toBeNull();
      const state = useShoppingStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe("shop-2");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should handle error when clearing checked items", async () => {
      mockData.shopping_list = null;

      const result = await useShoppingStore.getState().clearCheckedItems("household-1");

      expect(result.error).toBeTruthy();
      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });

    it("should handle case with no checked items", async () => {
      useShoppingStore.setState({
        items: [{ ...mockShoppingItem, id: "shop-1", is_checked: false }],
      });

      mockData.shopping_list = [];

      const result = await useShoppingStore.getState().clearCheckedItems("household-1");

      expect(result.error).toBeNull();
      const state = useShoppingStore.getState();
      expect(state.items).toHaveLength(1);
    });
  });

  describe("addFromLowStock", () => {
    beforeEach(() => {
      useInventoryStore.setState({
        items: [
          { ...mockInventoryItem, id: "inv-1", name: "Arroz", quantity: 1, min_quantity: 5 },
          { ...mockInventoryItem, id: "inv-2", name: "Feijão", quantity: 2, min_quantity: 5 },
          { ...mockInventoryItem, id: "inv-3", name: "Macarrão", quantity: 10, min_quantity: 5 },
        ],
      });
    });

    it("should add low stock items successfully", async () => {
      useShoppingStore.setState({ items: [] });

      const addedItems: ShoppingListItem[] = [
        { ...mockShoppingItem, id: "shop-new-1", name: "Arroz", inventory_item_id: "inv-1" },
        { ...mockShoppingItem, id: "shop-new-2", name: "Feijão", inventory_item_id: "inv-2" },
      ];

      // Mock will return the inserted items as an array
      mockData.shopping_list = [...addedItems];

      const result = await useShoppingStore.getState().addFromLowStock("household-1", "user-1");

      expect(result.error).toBeNull();
      expect(result.added).toBe(2);
      const state = useShoppingStore.getState();
      expect(state.items.length).toBe(2);
    });

    it("should not add items already in shopping list", async () => {
      useShoppingStore.setState({
        items: [{ ...mockShoppingItem, name: "Arroz" }],
      });

      const addedItems: ShoppingListItem[] = [
        { ...mockShoppingItem, id: "shop-new-2", name: "Feijão", inventory_item_id: "inv-2" }
      ];
      mockData.shopping_list = [...addedItems];

      const result = await useShoppingStore.getState().addFromLowStock("household-1", "user-1");

      expect(result.error).toBeNull();
      expect(result.added).toBe(1);
    });

    it("should handle case with no low stock items", async () => {
      useInventoryStore.setState({
        items: [{ ...mockInventoryItem, quantity: 10, min_quantity: 5 }],
      });

      const result = await useShoppingStore.getState().addFromLowStock("household-1", "user-1");

      expect(result.error).toBeNull();
      expect(result.added).toBe(0);
      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should handle case where all low stock items are already in list", async () => {
      useShoppingStore.setState({
        items: [
          { ...mockShoppingItem, name: "Arroz" },
          { ...mockShoppingItem, name: "Feijão" },
        ],
      });

      const result = await useShoppingStore.getState().addFromLowStock("household-1", "user-1");

      expect(result.error).toBeNull();
      expect(result.added).toBe(0);
    });

    it("should handle error when adding from low stock", async () => {
      mockData.shopping_list = null;

      const result = await useShoppingStore.getState().addFromLowStock("household-1", "user-1");

      expect(result.error).toBeTruthy();
      expect(result.added).toBe(0);
      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("completeShoppingAndUpdateStock", () => {
    beforeEach(() => {
      const invItems = [
        { ...mockInventoryItem, id: "inv-1", quantity: 5 },
        { ...mockInventoryItem, id: "inv-2", quantity: 3 },
      ];

      useInventoryStore.setState({
        items: invItems,
      });

      // Set up mock data so updates can find the items
      mockData.inventory_items = [...invItems];

      useShoppingStore.setState({
        items: [
          {
            ...mockShoppingItem,
            id: "shop-1",
            inventory_item_id: "inv-1",
            quantity: 2,
            is_checked: true,
          },
          {
            ...mockShoppingItem,
            id: "shop-2",
            inventory_item_id: "inv-2",
            quantity: 3,
            is_checked: true,
          },
          {
            ...mockShoppingItem,
            id: "shop-3",
            inventory_item_id: null,
            is_checked: false,
          },
        ],
      });
    });

    it("should update inventory and clear checked items", async () => {
      mockData.shopping_list = [];
      mockData.inventory_items = [
        { ...mockInventoryItem, id: "inv-1", quantity: 7 },
        { ...mockInventoryItem, id: "inv-2", quantity: 6 },
      ];

      const result = await useShoppingStore.getState().completeShoppingAndUpdateStock("household-1");

      expect(result.error).toBeNull();
      const state = useShoppingStore.getState();
      expect(state.items.some((i) => i.is_checked)).toBe(false);
    });

    it("should only update items with inventory_item_id", async () => {
      mockData.shopping_list = [];
      mockData.inventory_items = [
        { ...mockInventoryItem, id: "inv-1", quantity: 7 },
        { ...mockInventoryItem, id: "inv-2", quantity: 6 },
      ];

      await useShoppingStore.getState().completeShoppingAndUpdateStock("household-1");

      const state = useShoppingStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should handle case with no checked items", async () => {
      useShoppingStore.setState({
        items: [
          {
            ...mockShoppingItem,
            id: "shop-1",
            is_checked: false,
          },
        ],
      });

      mockData.shopping_list = [];
      mockData.inventory_items = [];

      const result = await useShoppingStore.getState().completeShoppingAndUpdateStock("household-1");

      expect(result.error).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useShoppingStore.setState({ error: "Some error" });

      useShoppingStore.getState().clearError();

      const state = useShoppingStore.getState();
      expect(state.error).toBeNull();
    });

    it("should only clear error without affecting other state", () => {
      useShoppingStore.setState({
        error: "Some error",
        items: [mockShoppingItem],
        isLoading: true,
      });

      useShoppingStore.getState().clearError();

      const state = useShoppingStore.getState();
      expect(state.error).toBeNull();
      expect(state.items).toHaveLength(1);
      expect(state.isLoading).toBe(true);
    });
  });

  describe("Helper Functions", () => {
    const testItems: ShoppingListItem[] = [
      { ...mockShoppingItem, id: "shop-1", name: "Arroz", is_checked: false, priority: "high" },
      { ...mockShoppingItem, id: "shop-2", name: "Feijão", is_checked: true, priority: "normal" },
      { ...mockShoppingItem, id: "shop-3", name: "Macarrão", is_checked: false, priority: "low" },
      { ...mockShoppingItem, id: "shop-4", name: "Café", is_checked: true, priority: "high" },
    ];

    describe("getUncheckedItems", () => {
      it("should return only unchecked items", () => {
        const result = getUncheckedItems(testItems);
        expect(result).toHaveLength(2);
        expect(result.every((item) => !item.is_checked)).toBe(true);
      });

      it("should return empty array when all items are checked", () => {
        const allChecked = testItems.map((item) => ({ ...item, is_checked: true }));
        const result = getUncheckedItems(allChecked);
        expect(result).toEqual([]);
      });

      it("should return all items when none are checked", () => {
        const allUnchecked = testItems.map((item) => ({ ...item, is_checked: false }));
        const result = getUncheckedItems(allUnchecked);
        expect(result).toHaveLength(4);
      });
    });

    describe("getCheckedItems", () => {
      it("should return only checked items", () => {
        const result = getCheckedItems(testItems);
        expect(result).toHaveLength(2);
        expect(result.every((item) => item.is_checked)).toBe(true);
      });

      it("should return empty array when no items are checked", () => {
        const allUnchecked = testItems.map((item) => ({ ...item, is_checked: false }));
        const result = getCheckedItems(allUnchecked);
        expect(result).toEqual([]);
      });

      it("should return all items when all are checked", () => {
        const allChecked = testItems.map((item) => ({ ...item, is_checked: true }));
        const result = getCheckedItems(allChecked);
        expect(result).toHaveLength(4);
      });
    });

    describe("getItemsByPriority", () => {
      it("should return all items when priority is 'all'", () => {
        const result = getItemsByPriority(testItems, "all");
        expect(result).toEqual(testItems);
      });

      it("should filter items by high priority", () => {
        const result = getItemsByPriority(testItems, "high");
        expect(result).toHaveLength(2);
        expect(result.every((item) => item.priority === "high")).toBe(true);
      });

      it("should filter items by normal priority", () => {
        const result = getItemsByPriority(testItems, "normal");
        expect(result).toHaveLength(1);
        expect(result[0].priority).toBe("normal");
      });

      it("should filter items by low priority", () => {
        const result = getItemsByPriority(testItems, "low");
        expect(result).toHaveLength(1);
        expect(result[0].priority).toBe("low");
      });

      it("should return empty array when no items match priority", () => {
        const items: ShoppingListItem[] = [
          { ...mockShoppingItem, id: "shop-1", priority: "high" },
        ];
        const result = getItemsByPriority(items, "low");
        expect(result).toEqual([]);
      });
    });

    describe("getItemsSummary", () => {
      it("should return correct summary counts", () => {
        const result = getItemsSummary(testItems);
        expect(result.total).toBe(4);
        expect(result.checked).toBe(2);
        expect(result.unchecked).toBe(2);
        expect(result.highPriority).toBe(1);
      });

      it("should handle empty list", () => {
        const result = getItemsSummary([]);
        expect(result.total).toBe(0);
        expect(result.checked).toBe(0);
        expect(result.unchecked).toBe(0);
        expect(result.highPriority).toBe(0);
      });

      it("should count only unchecked high priority items", () => {
        const items: ShoppingListItem[] = [
          { ...mockShoppingItem, id: "shop-1", priority: "high", is_checked: true },
          { ...mockShoppingItem, id: "shop-2", priority: "high", is_checked: false },
          { ...mockShoppingItem, id: "shop-3", priority: "high", is_checked: false },
        ];
        const result = getItemsSummary(items);
        expect(result.highPriority).toBe(2);
      });
    });

    describe("searchShoppingItems", () => {
      it("should return all items for empty query", () => {
        const result = searchShoppingItems(testItems, "");
        expect(result).toEqual(testItems);
      });

      it("should return all items for whitespace query", () => {
        const result = searchShoppingItems(testItems, "   ");
        expect(result).toEqual(testItems);
      });

      it("should search case-insensitively", () => {
        const result = searchShoppingItems(testItems, "arroz");
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Arroz");
      });

      it("should find partial matches", () => {
        const result = searchShoppingItems(testItems, "feij");
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Feijão");
      });

      it("should return empty array for no matches", () => {
        const result = searchShoppingItems(testItems, "xyz123");
        expect(result).toEqual([]);
      });

      it("should find multiple matches", () => {
        const items: ShoppingListItem[] = [
          { ...mockShoppingItem, id: "shop-1", name: "Arroz Branco" },
          { ...mockShoppingItem, id: "shop-2", name: "Arroz Integral" },
          { ...mockShoppingItem, id: "shop-3", name: "Feijão" },
        ];
        const result = searchShoppingItems(items, "arroz");
        expect(result).toHaveLength(2);
      });
    });

    describe("sortShoppingItems", () => {
      const sortTestItems: ShoppingListItem[] = [
        {
          ...mockShoppingItem,
          id: "shop-1",
          name: "Zebra",
          is_checked: false,
          priority: "low",
          added_at: "2024-01-10T10:00:00Z",
        },
        {
          ...mockShoppingItem,
          id: "shop-2",
          name: "Arroz",
          is_checked: false,
          priority: "high",
          added_at: "2024-01-11T10:00:00Z",
        },
        {
          ...mockShoppingItem,
          id: "shop-3",
          name: "Macarrão",
          is_checked: true,
          priority: "normal",
          added_at: "2024-01-12T10:00:00Z",
        },
      ];

      it("should sort by priority with checked items last", () => {
        const result = sortShoppingItems(sortTestItems, "priority");
        expect(result[0].priority).toBe("high");
        expect(result[1].priority).toBe("low");
        expect(result[2].is_checked).toBe(true);
      });

      it("should sort by name alphabetically with checked items last", () => {
        const result = sortShoppingItems(sortTestItems, "name");
        expect(result[0].name).toBe("Arroz");
        expect(result[1].name).toBe("Zebra");
        expect(result[2].is_checked).toBe(true);
      });

      it("should sort by added date (newest first) with checked items last", () => {
        const result = sortShoppingItems(sortTestItems, "added");
        expect(result[0].added_at).toBe("2024-01-11T10:00:00Z");
        expect(result[1].added_at).toBe("2024-01-10T10:00:00Z");
        expect(result[2].is_checked).toBe(true);
      });

      it("should keep checked items together at the end", () => {
        const items: ShoppingListItem[] = [
          { ...mockShoppingItem, id: "shop-1", name: "A", is_checked: true },
          { ...mockShoppingItem, id: "shop-2", name: "B", is_checked: false },
          { ...mockShoppingItem, id: "shop-3", name: "C", is_checked: true },
        ];
        const result = sortShoppingItems(items, "name");
        expect(result[0].is_checked).toBe(false);
        expect(result[1].is_checked).toBe(true);
        expect(result[2].is_checked).toBe(true);
      });

      it("should not mutate original array", () => {
        const original = [...sortTestItems];
        sortShoppingItems(sortTestItems, "name");
        expect(sortTestItems).toEqual(original);
      });
    });
  });
});
