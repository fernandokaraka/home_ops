import {
  useInventoryStore,
  getItemsByLocation,
  getItemsByCategory,
  getLowStockItems,
  getExpiringItems,
  getExpiredItems,
  getRepurchaseItems,
  getDaysUntilExpiration,
  getExpirationStatus,
  getStockStatus,
  formatQuantityWithUnit,
  searchItems
} from "@/stores/inventoryStore";
import { supabase } from "@/lib/supabase";
import { mockData, resetMockData } from "@supabase/supabase-js";
import type { InventoryItem, InventoryCategory } from "@/types";

describe("inventoryStore", () => {
  const mockCategory: InventoryCategory = {
    id: "cat-1",
    name: "Alimentos",
    icon: "🍎",
    is_default: true,
  };

  const mockItem: InventoryItem = {
    id: "item-1",
    household_id: "household-1",
    category_id: "cat-1",
    category: mockCategory,
    name: "Arroz",
    quantity: 5,
    unit: "kg",
    location: "pantry",
    min_quantity: 2,
    expiration_date: null,
    is_recurring: false,
    purchase_interval_days: null,
    last_purchase_date: null,
    notes: null,
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  };

  beforeEach(() => {
    resetMockData();
    jest.clearAllMocks();
    useInventoryStore.setState({
      items: [],
      categories: [],
      isLoading: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useInventoryStore.getState();
      expect(state.items).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchCategories", () => {
    it("should fetch categories successfully", async () => {
      const mockCategories: InventoryCategory[] = [
        mockCategory,
        {
          id: "cat-2",
          name: "Bebidas",
          icon: "🥤",
          is_default: true,
        },
      ];

      mockData.inventory_categories = mockCategories;

      await useInventoryStore.getState().fetchCategories();

      const state = useInventoryStore.getState();
      expect(state.categories).toHaveLength(2);
      expect(state.categories).toContainEqual(mockCategory);
      expect(state.categories).toContainEqual({
        id: "cat-2",
        name: "Bebidas",
        icon: "🥤",
        is_default: true,
      });
    });

    it("should handle fetch categories error", async () => {
      mockData.inventory_categories = null;

      await useInventoryStore.getState().fetchCategories();

      const state = useInventoryStore.getState();
      expect(state.categories).toEqual([]);
    });
  });

  describe("fetchItems", () => {
    it("should fetch items successfully", async () => {
      const mockItems: InventoryItem[] = [mockItem];
      mockData.inventory_items = mockItems;

      await useInventoryStore.getState().fetchItems("household-1");

      const state = useInventoryStore.getState();
      expect(state.items).toEqual(mockItems);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during fetch", async () => {
      mockData.inventory_items = [mockItem];

      await useInventoryStore.getState().fetchItems("household-1");

      const state = useInventoryStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.items).toEqual([mockItem]);
    });

    it("should handle empty item list", async () => {
      mockData.inventory_items = [];

      await useInventoryStore.getState().fetchItems("household-1");

      const state = useInventoryStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.items).toEqual([]);
    });

    it("should handle fetch error", async () => {
      mockData.inventory_items = null;

      await useInventoryStore.getState().fetchItems("household-1");

      const state = useInventoryStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("createItem", () => {
    it("should create item successfully", async () => {
      const newItem: Partial<InventoryItem> = {
        household_id: "household-1",
        name: "Feijão",
        quantity: 3,
        unit: "kg",
        location: "pantry",
        category_id: "cat-1",
      };

      const createdItem: InventoryItem = {
        ...mockItem,
        ...newItem,
        id: "item-new",
        name: "Feijão",
      };

      mockData.inventory_items = [createdItem];

      const result = await useInventoryStore.getState().createItem(newItem);

      expect(result.error).toBeNull();
      const state = useInventoryStore.getState();
      expect(state.items[0]).toMatchObject({
        name: "Feijão",
        household_id: "household-1",
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should add item to store after creation", async () => {
      const initialCount = useInventoryStore.getState().items.length;

      const createdItem: InventoryItem = {
        ...mockItem,
        id: "item-test",
        name: "Test Item",
        quantity: 1,
        unit: "un",
      };

      mockData.inventory_items = [createdItem];

      await useInventoryStore.getState().createItem({
        household_id: "household-1",
        name: "Test Item",
        quantity: 1,
        unit: "un",
        location: "pantry",
        category_id: "cat-1",
      });

      const state = useInventoryStore.getState();
      expect(state.items.length).toBe(initialCount + 1);
      expect(state.items[0].name).toBe("Test Item");
    });

    it("should sort items by name after creation", async () => {
      useInventoryStore.setState({ items: [{ ...mockItem, name: "Zebra" }] });

      const createdItem: InventoryItem = {
        ...mockItem,
        id: "item-new",
        name: "Abacaxi",
        quantity: 1,
        unit: "un",
        location: "fridge",
      };

      mockData.inventory_items = [createdItem];

      await useInventoryStore.getState().createItem({
        household_id: "household-1",
        name: "Abacaxi",
        quantity: 1,
        unit: "un",
        location: "fridge",
        category_id: "cat-1",
      });

      const state = useInventoryStore.getState();
      expect(state.items[0].name).toBe("Abacaxi");
      expect(state.items[1].name).toBe("Zebra");
    });

    it("should handle create error", async () => {
      mockData.inventory_items = null;

      const result = await useInventoryStore.getState().createItem({
        household_id: "household-1",
        name: "Test",
        quantity: 1,
        unit: "un",
        location: "pantry",
        category_id: "cat-1",
      });

      expect(result.error).toBeTruthy();
      const state = useInventoryStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("updateItem", () => {
    beforeEach(() => {
      useInventoryStore.setState({
        items: [mockItem],
      });
    });

    it("should update item successfully", async () => {
      const updates = { name: "Arroz Integral" };
      const updatedItem = { ...mockItem, ...updates };

      mockData.inventory_items = [updatedItem];

      const result = await useInventoryStore.getState().updateItem("item-1", updates);

      expect(result.error).toBeNull();
      const state = useInventoryStore.getState();
      expect(state.items[0].name).toBe("Arroz Integral");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should preserve item state when update succeeds", async () => {
      const updates = { quantity: 10 };
      const updatedItem = { ...mockItem, ...updates };

      mockData.inventory_items = [updatedItem];

      await useInventoryStore.getState().updateItem("item-1", updates);

      const state = useInventoryStore.getState();
      expect(state.items[0]).toMatchObject({
        id: "item-1",
        name: "Arroz",
        quantity: 10,
      });
    });

    it("should handle update error", async () => {
      mockData.inventory_items = null;

      const result = await useInventoryStore.getState().updateItem("item-1", { quantity: 10 });

      expect(result.error).toBeTruthy();
      const state = useInventoryStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("deleteItem", () => {
    beforeEach(() => {
      useInventoryStore.setState({
        items: [mockItem],
      });
    });

    it("should delete item successfully", async () => {
      mockData.inventory_items = [];

      const result = await useInventoryStore.getState().deleteItem("item-1");

      expect(result.error).toBeNull();
      const state = useInventoryStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should handle delete of already deleted item", async () => {
      await useInventoryStore.getState().deleteItem("item-1");

      const result = await useInventoryStore.getState().deleteItem("item-1");

      expect(result.error).toBeNull();
      const state = useInventoryStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.items).toHaveLength(0);
    });

    it("should handle delete error", async () => {
      mockData.inventory_items = null;

      const result = await useInventoryStore.getState().deleteItem("item-1");

      expect(result.error).toBeTruthy();
      const state = useInventoryStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("consumeItem", () => {
    beforeEach(() => {
      useInventoryStore.setState({
        items: [mockItem],
      });
    });

    it("should return error if item not found", async () => {
      const result = await useInventoryStore.getState().consumeItem("nonexistent", 1);

      expect(result.error).toBe("Item not found");
    });

    it("should reduce item quantity", async () => {
      const updatedItem = { ...mockItem, quantity: 3 };
      mockData.inventory_items = [updatedItem];

      const result = await useInventoryStore.getState().consumeItem("item-1", 2);

      expect(result.error).toBeNull();
    });

    it("should not go below zero quantity", async () => {
      const updatedItem = { ...mockItem, quantity: 0 };
      mockData.inventory_items = [updatedItem];

      const result = await useInventoryStore.getState().consumeItem("item-1", 10);

      expect(result.error).toBeNull();
    });
  });

  describe("restockItem", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
      useInventoryStore.setState({
        items: [mockItem],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return error if item not found", async () => {
      const result = await useInventoryStore.getState().restockItem("nonexistent", 5);

      expect(result.error).toBe("Item not found");
    });

    it("should increase item quantity", async () => {
      const updatedItem = { ...mockItem, quantity: 10, last_purchase_date: "2024-01-15" };
      mockData.inventory_items = [updatedItem];

      const result = await useInventoryStore.getState().restockItem("item-1", 5);

      expect(result.error).toBeNull();
    });

    it("should update last purchase date", async () => {
      const today = "2024-01-15";
      const updatedItem = { ...mockItem, quantity: 10, last_purchase_date: today };
      mockData.inventory_items = [updatedItem];

      await useInventoryStore.getState().restockItem("item-1", 5);

      const state = useInventoryStore.getState();
      expect(state.items[0].last_purchase_date).toBe(today);
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useInventoryStore.setState({ error: "Some error" });

      useInventoryStore.getState().clearError();

      const state = useInventoryStore.getState();
      expect(state.error).toBeNull();
    });

    it("should only clear error without affecting other state", () => {
      useInventoryStore.setState({
        error: "Some error",
        items: [mockItem],
        isLoading: true,
      });

      useInventoryStore.getState().clearError();

      const state = useInventoryStore.getState();
      expect(state.error).toBeNull();
      expect(state.items).toHaveLength(1);
      expect(state.isLoading).toBe(true);
    });
  });

  describe("Helper Functions", () => {
    const testItems: InventoryItem[] = [
      { ...mockItem, id: "item-pantry", location: "pantry", category_id: "cat-1" },
      { ...mockItem, id: "item-fridge", location: "fridge", category_id: "cat-1" },
      { ...mockItem, id: "item-freezer", location: "freezer", category_id: "cat-1" },
      { ...mockItem, id: "item-cat1", location: "storage", category_id: "cat-1" },
      { ...mockItem, id: "item-cat2", location: "other", category_id: "cat-2" },
    ];

    describe("getItemsByLocation", () => {
      it("should return all items when location is 'all'", () => {
        const result = getItemsByLocation(testItems, "all");
        expect(result).toEqual(testItems);
      });

      it("should filter items by pantry location", () => {
        const result = getItemsByLocation(testItems, "pantry");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-pantry");
      });

      it("should filter items by fridge location", () => {
        const result = getItemsByLocation(testItems, "fridge");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-fridge");
      });

      it("should filter items by freezer location", () => {
        const result = getItemsByLocation(testItems, "freezer");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-freezer");
      });

      it("should return empty array when no items match location", () => {
        const result = getItemsByLocation(testItems, "bathroom");
        expect(result).toEqual([]);
      });
    });

    describe("getItemsByCategory", () => {
      it("should return all items when category is 'all'", () => {
        const result = getItemsByCategory(testItems, "all");
        expect(result).toEqual(testItems);
      });

      it("should filter items by category", () => {
        const result = getItemsByCategory(testItems, "cat-1");
        expect(result.length).toBeGreaterThan(0);
        result.forEach((item) => {
          expect(item.category_id).toBe("cat-1");
        });
      });

      it("should return empty array when no items match category", () => {
        const result = getItemsByCategory(testItems, "cat-999");
        expect(result).toEqual([]);
      });
    });

    describe("getLowStockItems", () => {
      it("should return items with quantity at or below min_quantity", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-low", quantity: 2, min_quantity: 5 },
          { ...mockItem, id: "item-ok", quantity: 10, min_quantity: 5 },
          { ...mockItem, id: "item-at-min", quantity: 5, min_quantity: 5 },
        ];

        const result = getLowStockItems(items);

        expect(result).toHaveLength(2);
        const ids = result.map((i) => i.id);
        expect(ids).toContain("item-low");
        expect(ids).toContain("item-at-min");
      });

      it("should not include items with null min_quantity", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-no-min", quantity: 1, min_quantity: null },
          { ...mockItem, id: "item-low", quantity: 1, min_quantity: 5 },
        ];

        const result = getLowStockItems(items);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-low");
      });

      it("should return empty array when no low stock items", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-ok", quantity: 10, min_quantity: 5 },
        ];

        const result = getLowStockItems(items);

        expect(result).toEqual([]);
      });
    });

    describe("getExpiringItems", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("should return items expiring within default 7 days", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-expiring-soon", expiration_date: "2024-01-20" },
          { ...mockItem, id: "item-expiring-later", expiration_date: "2024-02-01" },
        ];

        const result = getExpiringItems(items);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-expiring-soon");
      });

      it("should return items expiring within custom days", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-expiring-soon", expiration_date: "2024-01-17" },
          { ...mockItem, id: "item-expiring-later", expiration_date: "2024-01-20" },
        ];

        const result = getExpiringItems(items, 3);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-expiring-soon");
      });

      it("should not include items without expiration date", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-no-expiry", expiration_date: null },
          { ...mockItem, id: "item-expiring", expiration_date: "2024-01-20" },
        ];

        const result = getExpiringItems(items);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-expiring");
      });

      it("should not include already expired items", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-expired", expiration_date: "2024-01-10" },
          { ...mockItem, id: "item-expiring", expiration_date: "2024-01-20" },
        ];

        const result = getExpiringItems(items);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-expiring");
      });
    });

    describe("getExpiredItems", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("should return items with expiration date before today", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-expired", expiration_date: "2024-01-10" },
          { ...mockItem, id: "item-ok", expiration_date: "2024-01-20" },
        ];

        const result = getExpiredItems(items);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-expired");
      });

      it("should not include items without expiration date", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-no-expiry", expiration_date: null },
        ];

        const result = getExpiredItems(items);

        expect(result).toEqual([]);
      });

      it("should not include items expiring today or later", () => {
        const items: InventoryItem[] = [
          { ...mockItem, id: "item-today", expiration_date: "2024-01-15" },
          { ...mockItem, id: "item-future", expiration_date: "2024-01-20" },
        ];

        const result = getExpiredItems(items);

        expect(result).toEqual([]);
      });
    });

    describe("getRepurchaseItems", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("should return items due for repurchase", () => {
        const items: InventoryItem[] = [
          {
            ...mockItem,
            id: "item-due",
            is_recurring: true,
            purchase_interval_days: 7,
            last_purchase_date: "2024-01-01",
          },
        ];

        const result = getRepurchaseItems(items);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-due");
      });

      it("should not include non-recurring items", () => {
        const items: InventoryItem[] = [
          {
            ...mockItem,
            id: "item-not-recurring",
            is_recurring: false,
            purchase_interval_days: 7,
            last_purchase_date: "2024-01-01",
          },
        ];

        const result = getRepurchaseItems(items);

        expect(result).toEqual([]);
      });

      it("should not include items without purchase interval", () => {
        const items: InventoryItem[] = [
          {
            ...mockItem,
            id: "item-no-interval",
            is_recurring: true,
            purchase_interval_days: null,
            last_purchase_date: "2024-01-01",
          },
        ];

        const result = getRepurchaseItems(items);

        expect(result).toEqual([]);
      });

      it("should not include items without last purchase date", () => {
        const items: InventoryItem[] = [
          {
            ...mockItem,
            id: "item-no-last-purchase",
            is_recurring: true,
            purchase_interval_days: 7,
            last_purchase_date: null,
          },
        ];

        const result = getRepurchaseItems(items);

        expect(result).toEqual([]);
      });

      it("should not include items not yet due", () => {
        const items: InventoryItem[] = [
          {
            ...mockItem,
            id: "item-not-due",
            is_recurring: true,
            purchase_interval_days: 30,
            last_purchase_date: "2024-01-14",
          },
        ];

        const result = getRepurchaseItems(items);

        expect(result).toEqual([]);
      });
    });

    describe("getDaysUntilExpiration", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("should return null for null expiration date", () => {
        const result = getDaysUntilExpiration(null);
        expect(result).toBeNull();
      });

      it("should return null for undefined expiration date", () => {
        const result = getDaysUntilExpiration(undefined);
        expect(result).toBeNull();
      });

      it("should return positive days for future expiration", () => {
        const result = getDaysUntilExpiration("2024-01-20");
        expect(result).toBe(5);
      });

      it("should return negative days for past expiration", () => {
        const result = getDaysUntilExpiration("2024-01-10");
        expect(result).toBe(-5);
      });

      it("should return 0 for today's expiration", () => {
        const result = getDaysUntilExpiration("2024-01-15");
        expect(result).toBe(0);
      });
    });

    describe("getExpirationStatus", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("should return 'none' for null expiration date", () => {
        const result = getExpirationStatus(null);
        expect(result).toBe("none");
      });

      it("should return 'none' for undefined expiration date", () => {
        const result = getExpirationStatus(undefined);
        expect(result).toBe("none");
      });

      it("should return 'expired' for past expiration", () => {
        const result = getExpirationStatus("2024-01-10");
        expect(result).toBe("expired");
      });

      it("should return 'warning' for expiration within 7 days", () => {
        const result = getExpirationStatus("2024-01-20");
        expect(result).toBe("warning");
      });

      it("should return 'ok' for expiration after 7 days", () => {
        const result = getExpirationStatus("2024-02-01");
        expect(result).toBe("ok");
      });

      it("should return 'warning' for expiration on day 7", () => {
        const result = getExpirationStatus("2024-01-22");
        expect(result).toBe("warning");
      });
    });

    describe("getStockStatus", () => {
      it("should return 'out' for zero quantity", () => {
        const result = getStockStatus(0, 5);
        expect(result).toBe("out");
      });

      it("should return 'out' for negative quantity", () => {
        const result = getStockStatus(-1, 5);
        expect(result).toBe("out");
      });

      it("should return 'low' when quantity is at min_quantity", () => {
        const result = getStockStatus(5, 5);
        expect(result).toBe("low");
      });

      it("should return 'low' when quantity is below min_quantity", () => {
        const result = getStockStatus(3, 5);
        expect(result).toBe("low");
      });

      it("should return 'ok' when quantity is above min_quantity", () => {
        const result = getStockStatus(10, 5);
        expect(result).toBe("ok");
      });

      it("should return 'ok' when min_quantity is null and quantity is positive", () => {
        const result = getStockStatus(5, null);
        expect(result).toBe("ok");
      });
    });

    describe("formatQuantityWithUnit", () => {
      it("should format integer quantities", () => {
        expect(formatQuantityWithUnit(5, "kg")).toBe("5 kg");
        expect(formatQuantityWithUnit(1, "un")).toBe("1 unidade");
        expect(formatQuantityWithUnit(3, "un")).toBe("3 unidades");
      });

      it("should format decimal quantities", () => {
        expect(formatQuantityWithUnit(2.5, "kg")).toBe("2.5 kg");
        expect(formatQuantityWithUnit(1.5, "l")).toBe("1.5 L");
      });

      it("should handle all unit types", () => {
        expect(formatQuantityWithUnit(1, "un")).toBe("1 unidade");
        expect(formatQuantityWithUnit(2, "un")).toBe("2 unidades");
        expect(formatQuantityWithUnit(5, "kg")).toBe("5 kg");
        expect(formatQuantityWithUnit(100, "g")).toBe("100 g");
        expect(formatQuantityWithUnit(2, "l")).toBe("2 L");
        expect(formatQuantityWithUnit(500, "ml")).toBe("500 ml");
        expect(formatQuantityWithUnit(1, "pack")).toBe("1 pacote");
        expect(formatQuantityWithUnit(3, "pack")).toBe("3 pacotes");
      });

      it("should format decimal with one decimal place", () => {
        expect(formatQuantityWithUnit(2.567, "kg")).toBe("2.6 kg");
      });
    });

    describe("searchItems", () => {
      const items: InventoryItem[] = [
        { ...mockItem, id: "item-1", name: "Arroz" },
        { ...mockItem, id: "item-2", name: "Feijão" },
        { ...mockItem, id: "item-3", name: "Macarrão" },
        { ...mockItem, id: "item-4", name: "Arroz Integral" },
      ];

      it("should return all items for empty query", () => {
        const result = searchItems(items, "");
        expect(result).toEqual(items);
      });

      it("should return all items for whitespace query", () => {
        const result = searchItems(items, "   ");
        expect(result).toEqual(items);
      });

      it("should search case-insensitively", () => {
        const result = searchItems(items, "arroz");
        expect(result).toHaveLength(2);
        const ids = result.map((i) => i.id);
        expect(ids).toContain("item-1");
        expect(ids).toContain("item-4");
      });

      it("should find partial matches", () => {
        const result = searchItems(items, "feij");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("item-2");
      });

      it("should return empty array for no matches", () => {
        const result = searchItems(items, "xyz123");
        expect(result).toEqual([]);
      });

      it("should handle special characters in search", () => {
        const itemsWithSpecialChars: InventoryItem[] = [
          { ...mockItem, id: "item-1", name: "Café (torrado)" },
        ];

        const result = searchItems(itemsWithSpecialChars, "café");
        expect(result).toHaveLength(1);
      });
    });
  });
});
