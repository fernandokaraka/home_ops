import { useMaintenanceStore, getUpcomingMaintenance, getOverdueMaintenance, getItemsByCategory, getDaysUntilMaintenance, getMaintenanceStatus } from "@/stores/maintenanceStore";
import { supabase } from "@/lib/supabase";
import { mockData, resetMockData } from "@supabase/supabase-js";
import * as notificationService from "@/services/notificationService";
import type { MaintenanceItem, MaintenanceCategory, MaintenanceHistory } from "@/types";

// Mock notification service
jest.mock("@/services/notificationService", () => ({
  scheduleMaintenanceReminder: jest.fn(),
  cancelNotificationsByTag: jest.fn(),
  scheduleAllMaintenanceReminders: jest.fn(),
}));

describe("maintenanceStore", () => {
  const mockCategory: MaintenanceCategory = {
    id: "cat-1",
    name: "Elétrica",
    icon: "⚡",
    color: "#F59E0B",
    is_default: true,
  };

  const mockItem: MaintenanceItem = {
    id: "item-1",
    household_id: "household-1",
    category_id: "cat-1",
    category: mockCategory,
    name: "Trocar filtro do ar-condicionado",
    description: "Substituir filtros do sistema de ar",
    location: "Sala",
    maintenance_interval_months: 3,
    last_maintenance_date: "2024-01-15",
    next_maintenance_date: "2024-04-15",
    cost_estimate: 150.00,
    notes: "Comprar filtros novos",
    created_by: "user-1",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  };

  const mockHistory: MaintenanceHistory = {
    id: "history-1",
    item_id: "item-1",
    maintenance_date: "2024-01-15",
    performed_by: "user-1",
    cost: 150.00,
    notes: "Trocado com sucesso",
    created_at: "2024-01-15T10:00:00Z",
  };

  beforeEach(() => {
    resetMockData();
    jest.clearAllMocks();
    useMaintenanceStore.setState({
      items: [],
      categories: [],
      history: [],
      isLoading: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useMaintenanceStore.getState();
      expect(state.items).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.history).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchCategories", () => {
    it("should fetch categories successfully", async () => {
      const mockCategories: MaintenanceCategory[] = [
        mockCategory,
        {
          id: "cat-2",
          name: "Hidráulica",
          icon: "💧",
          color: "#3B82F6",
          is_default: true,
        },
      ];

      mockData.maintenance_categories = mockCategories;

      await useMaintenanceStore.getState().fetchCategories();

      const state = useMaintenanceStore.getState();
      expect(state.categories).toHaveLength(2);
      expect(state.categories).toContainEqual(mockCategory);
      expect(state.categories).toContainEqual({
        id: "cat-2",
        name: "Hidráulica",
        icon: "💧",
        color: "#3B82F6",
        is_default: true,
      });
    });

    it("should handle fetch categories error", async () => {
      mockData.maintenance_categories = null;

      await useMaintenanceStore.getState().fetchCategories();

      const state = useMaintenanceStore.getState();
      expect(state.categories).toEqual([]);
    });
  });

  describe("fetchItems", () => {
    it("should fetch items successfully", async () => {
      const mockItems: MaintenanceItem[] = [mockItem];
      mockData.maintenance_items = mockItems;

      await useMaintenanceStore.getState().fetchItems("household-1");

      const state = useMaintenanceStore.getState();
      expect(state.items).toEqual(mockItems);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during fetch", async () => {
      mockData.maintenance_items = [mockItem];

      await useMaintenanceStore.getState().fetchItems("household-1");

      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.items).toEqual([mockItem]);
    });

    it("should schedule notifications for all maintenance items", async () => {
      const mockItems: MaintenanceItem[] = [mockItem];
      mockData.maintenance_items = mockItems;

      await useMaintenanceStore.getState().fetchItems("household-1");

      expect(notificationService.scheduleAllMaintenanceReminders).toHaveBeenCalledWith(mockItems);
    });

    it("should handle empty item list", async () => {
      mockData.maintenance_items = [];

      await useMaintenanceStore.getState().fetchItems("household-1");

      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.items).toEqual([]);
    });

    it("should handle fetch error", async () => {
      mockData.maintenance_items = null;
      mockData.__simulateError = true;

      await useMaintenanceStore.getState().fetchItems("household-1");

      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("fetchHistory", () => {
    it("should fetch history successfully", async () => {
      const mockHistoryList: MaintenanceHistory[] = [mockHistory];
      mockData.maintenance_history = mockHistoryList;

      await useMaintenanceStore.getState().fetchHistory("item-1");

      const state = useMaintenanceStore.getState();
      expect(state.history).toEqual(mockHistoryList);
    });

    it("should handle fetch history error", async () => {
      mockData.maintenance_history = null;

      await useMaintenanceStore.getState().fetchHistory("item-1");

      const state = useMaintenanceStore.getState();
      expect(state.history).toEqual([]);
    });
  });

  describe("createItem", () => {
    it("should create item successfully", async () => {
      const newItem: Partial<MaintenanceItem> = {
        household_id: "household-1",
        category_id: "cat-1",
        name: "Novo item",
        maintenance_interval_months: 6,
      };

      const result = await useMaintenanceStore.getState().createItem(newItem);

      expect(result.error).toBeNull();
      const state = useMaintenanceStore.getState();
      expect(state.items[0]).toMatchObject({
        name: "Novo item",
        household_id: "household-1",
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should calculate next maintenance date from last date and interval", async () => {
      const newItem: Partial<MaintenanceItem> = {
        household_id: "household-1",
        name: "Item com cálculo de data",
        last_maintenance_date: "2024-01-15",
        maintenance_interval_months: 3,
      };

      await useMaintenanceStore.getState().createItem(newItem);

      const state = useMaintenanceStore.getState();
      expect(state.items[0].next_maintenance_date).toBe("2024-04-15");
    });

    it("should schedule notification for new item", async () => {
      const newItem: Partial<MaintenanceItem> = {
        household_id: "household-1",
        name: "Novo item",
        maintenance_interval_months: 6,
      };

      await useMaintenanceStore.getState().createItem(newItem);

      expect(notificationService.scheduleMaintenanceReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Novo item",
        })
      );
    });

    it("should add item to store after creation", async () => {
      const initialCount = useMaintenanceStore.getState().items.length;

      await useMaintenanceStore.getState().createItem({
        household_id: "household-1",
        name: "Test Item",
        maintenance_interval_months: 3,
      });

      const state = useMaintenanceStore.getState();
      expect(state.items.length).toBe(initialCount + 1);
      expect(state.items[0].name).toBe("Test Item");
    });

    it("should handle create error", async () => {
      mockData.maintenance_items = null;

      const result = await useMaintenanceStore.getState().createItem({
        household_id: "household-1",
        name: "Test Item",
      });

      expect(result.error).toBeTruthy();
      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("updateItem", () => {
    beforeEach(() => {
      useMaintenanceStore.setState({
        items: [mockItem],
      });
    });

    it("should update item successfully", async () => {
      const updates = { name: "Nome atualizado" };
      const updatedItem = { ...mockItem, ...updates };

      mockData.maintenance_items = [updatedItem];

      const result = await useMaintenanceStore.getState().updateItem("item-1", updates);

      expect(result.error).toBeNull();
      const state = useMaintenanceStore.getState();
      expect(state.items[0].name).toBe("Nome atualizado");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should recalculate next maintenance date on update", async () => {
      const updates = {
        last_maintenance_date: "2024-02-01",
        maintenance_interval_months: 6,
      };
      const updatedItem = {
        ...mockItem,
        ...updates,
        next_maintenance_date: "2024-08-01",
      };

      mockData.maintenance_items = [updatedItem];

      await useMaintenanceStore.getState().updateItem("item-1", updates);

      const state = useMaintenanceStore.getState();
      expect(state.items[0].next_maintenance_date).toBe("2024-08-01");
    });

    it("should schedule notification when updating item", async () => {
      const updates = { next_maintenance_date: "2024-05-15" };
      const updatedItem = { ...mockItem, ...updates };

      mockData.maintenance_items = [updatedItem];

      await useMaintenanceStore.getState().updateItem("item-1", updates);

      expect(notificationService.scheduleMaintenanceReminder).toHaveBeenCalledWith(updatedItem);
    });

    it("should preserve item state when update succeeds", async () => {
      const updates = { name: "Updated Name", cost_estimate: 200.00 };
      const updatedItem = { ...mockItem, ...updates };

      mockData.maintenance_items = [updatedItem];

      await useMaintenanceStore.getState().updateItem("item-1", updates);

      const state = useMaintenanceStore.getState();
      expect(state.items[0]).toMatchObject({
        id: "item-1",
        name: "Updated Name",
        cost_estimate: 200.00,
      });
    });

    it("should handle update error", async () => {
      mockData.maintenance_items = null;

      const result = await useMaintenanceStore.getState().updateItem("item-1", { name: "Test" });

      expect(result.error).toBeTruthy();
      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("deleteItem", () => {
    beforeEach(() => {
      useMaintenanceStore.setState({
        items: [mockItem],
      });
    });

    it("should delete item successfully", async () => {
      mockData.maintenance_items = [];

      const result = await useMaintenanceStore.getState().deleteItem("item-1");

      expect(result.error).toBeNull();
      const state = useMaintenanceStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should cancel notification when deleting item", async () => {
      mockData.maintenance_items = [];

      await useMaintenanceStore.getState().deleteItem("item-1");

      expect(notificationService.cancelNotificationsByTag).toHaveBeenCalledWith("maintenance_item-1");
    });

    it("should handle delete of already deleted item", async () => {
      // Delete the item first
      await useMaintenanceStore.getState().deleteItem("item-1");

      // Try to delete again - should succeed but not affect state
      const result = await useMaintenanceStore.getState().deleteItem("item-1");

      expect(result.error).toBeNull();
      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.items).toHaveLength(0);
    });

    it("should handle delete error", async () => {
      mockData.maintenance_items = null;

      const result = await useMaintenanceStore.getState().deleteItem("item-1");

      expect(result.error).toBeTruthy();
      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("registerMaintenance", () => {
    beforeEach(() => {
      useMaintenanceStore.setState({
        items: [mockItem],
      });
    });

    it("should register maintenance successfully", async () => {
      const maintenanceData: Partial<MaintenanceHistory> = {
        item_id: "item-1",
        maintenance_date: "2024-04-15",
        performed_by: "user-1",
        cost: 150.00,
      };

      mockData.maintenance_history = [];
      mockData.maintenance_items = [{
        ...mockItem,
        last_maintenance_date: "2024-04-15",
        next_maintenance_date: "2024-07-15",
      }];

      const result = await useMaintenanceStore.getState().registerMaintenance(maintenanceData);

      expect(result.error).toBeNull();
      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should update item with new dates after registering maintenance", async () => {
      const maintenanceData: Partial<MaintenanceHistory> = {
        item_id: "item-1",
        maintenance_date: "2024-04-15",
        performed_by: "user-1",
      };

      mockData.maintenance_history = [];
      mockData.maintenance_items = [{
        ...mockItem,
        last_maintenance_date: "2024-04-15",
        next_maintenance_date: "2024-07-15",
      }];

      await useMaintenanceStore.getState().registerMaintenance(maintenanceData);

      const state = useMaintenanceStore.getState();
      expect(state.items[0].last_maintenance_date).toBe("2024-04-15");
      expect(state.items[0].next_maintenance_date).toBe("2024-07-15");
    });

    it("should handle item without maintenance interval", async () => {
      const itemNoInterval = { ...mockItem, maintenance_interval_months: null };
      useMaintenanceStore.setState({ items: [itemNoInterval] });

      const maintenanceData: Partial<MaintenanceHistory> = {
        item_id: "item-1",
        maintenance_date: "2024-04-15",
        performed_by: "user-1",
      };

      mockData.maintenance_history = [];

      const result = await useMaintenanceStore.getState().registerMaintenance(maintenanceData);

      expect(result.error).toBeNull();
    });

    it("should handle register error", async () => {
      mockData.maintenance_history = null;

      const result = await useMaintenanceStore.getState().registerMaintenance({
        item_id: "item-1",
        maintenance_date: "2024-04-15",
      });

      expect(result.error).toBeTruthy();
      const state = useMaintenanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useMaintenanceStore.setState({ error: "Some error" });

      useMaintenanceStore.getState().clearError();

      const state = useMaintenanceStore.getState();
      expect(state.error).toBeNull();
    });

    it("should only clear error without affecting other state", () => {
      useMaintenanceStore.setState({
        error: "Some error",
        items: [mockItem],
        isLoading: true,
      });

      useMaintenanceStore.getState().clearError();

      const state = useMaintenanceStore.getState();
      expect(state.error).toBeNull();
      expect(state.items).toHaveLength(1);
      expect(state.isLoading).toBe(true);
    });
  });

  describe("Helper Functions", () => {
    const today = "2024-01-15";
    const tomorrow = "2024-01-16";
    const nextWeek = "2024-01-22";
    const nextMonth = "2024-02-15";
    const yesterday = "2024-01-14";
    const lastWeek = "2024-01-08";

    const testItems: MaintenanceItem[] = [
      { ...mockItem, id: "item-today", next_maintenance_date: today },
      { ...mockItem, id: "item-tomorrow", next_maintenance_date: tomorrow },
      { ...mockItem, id: "item-next-week", next_maintenance_date: nextWeek },
      { ...mockItem, id: "item-next-month", next_maintenance_date: nextMonth },
      { ...mockItem, id: "item-yesterday", next_maintenance_date: yesterday },
      { ...mockItem, id: "item-last-week", next_maintenance_date: lastWeek },
      { ...mockItem, id: "item-no-date", next_maintenance_date: null },
    ];

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(`${today}T12:00:00Z`));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe("getUpcomingMaintenance", () => {
      it("should return items due within next 30 days by default", () => {
        const result = getUpcomingMaintenance(testItems);

        expect(result.length).toBeGreaterThan(0);
        const ids = result.map((i) => i.id);
        expect(ids).toContain("item-today");
        expect(ids).toContain("item-tomorrow");
        expect(ids).toContain("item-next-week");
      });

      it("should return items due within custom days range", () => {
        const result = getUpcomingMaintenance(testItems, 7);

        const ids = result.map((i) => i.id);
        expect(ids).toContain("item-today");
        expect(ids).toContain("item-tomorrow");
        expect(ids).toContain("item-next-week");
        expect(ids).not.toContain("item-next-month");
      });

      it("should not include overdue items", () => {
        const result = getUpcomingMaintenance(testItems);
        const ids = result.map((i) => i.id);

        expect(ids).not.toContain("item-yesterday");
        expect(ids).not.toContain("item-last-week");
      });

      it("should not include items without dates", () => {
        const result = getUpcomingMaintenance(testItems);
        const ids = result.map((i) => i.id);

        expect(ids).not.toContain("item-no-date");
      });

      it("should return empty array when no upcoming maintenance", () => {
        const noUpcoming = [{ ...mockItem, next_maintenance_date: "2025-01-01" }];
        const result = getUpcomingMaintenance(noUpcoming, 30);

        expect(result).toEqual([]);
      });
    });

    describe("getOverdueMaintenance", () => {
      it("should return items with past due dates", () => {
        const result = getOverdueMaintenance(testItems);

        expect(result).toHaveLength(2);
        const ids = result.map((i) => i.id);
        expect(ids).toContain("item-yesterday");
        expect(ids).toContain("item-last-week");
      });

      it("should not include today's items as overdue", () => {
        const result = getOverdueMaintenance(testItems);
        const ids = result.map((i) => i.id);

        expect(ids).not.toContain("item-today");
      });

      it("should not include future items", () => {
        const result = getOverdueMaintenance(testItems);
        const ids = result.map((i) => i.id);

        expect(ids).not.toContain("item-tomorrow");
        expect(ids).not.toContain("item-next-week");
      });

      it("should return empty array when no overdue maintenance", () => {
        const noOverdue = testItems.filter((i) =>
          !i.next_maintenance_date || i.next_maintenance_date >= today
        );
        const result = getOverdueMaintenance(noOverdue);

        expect(result).toEqual([]);
      });
    });

    describe("getItemsByCategory", () => {
      it("should return all items when category is 'all'", () => {
        const result = getItemsByCategory(testItems, "all");

        expect(result).toEqual(testItems);
      });

      it("should filter items by specific category", () => {
        const mixedItems = [
          { ...mockItem, id: "item-1", category_id: "cat-1" },
          { ...mockItem, id: "item-2", category_id: "cat-2" },
          { ...mockItem, id: "item-3", category_id: "cat-1" },
        ];

        const result = getItemsByCategory(mixedItems, "cat-1");

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("item-1");
        expect(result[1].id).toBe("item-3");
      });

      it("should return empty array when no items match category", () => {
        const result = getItemsByCategory(testItems, "nonexistent-category");

        expect(result).toEqual([]);
      });
    });

    describe("getDaysUntilMaintenance", () => {
      it("should return null for null date", () => {
        const result = getDaysUntilMaintenance(null);

        expect(result).toBeNull();
      });

      it("should return null for undefined date", () => {
        const result = getDaysUntilMaintenance(undefined);

        expect(result).toBeNull();
      });

      it("should return 0 for today's date", () => {
        const result = getDaysUntilMaintenance(today);

        expect(result).toBe(0);
      });

      it("should return positive days for future date", () => {
        const result = getDaysUntilMaintenance(tomorrow);

        expect(result).toBe(1);
      });

      it("should return negative days for past date", () => {
        const result = getDaysUntilMaintenance(yesterday);

        expect(result).toBe(-1);
      });

      it("should calculate correct days for week ahead", () => {
        const result = getDaysUntilMaintenance(nextWeek);

        expect(result).toBe(7);
      });
    });

    describe("getMaintenanceStatus", () => {
      it("should return 'none' for null date", () => {
        const result = getMaintenanceStatus(null);

        expect(result).toBe("none");
      });

      it("should return 'none' for undefined date", () => {
        const result = getMaintenanceStatus(undefined);

        expect(result).toBe("none");
      });

      it("should return 'overdue' for past dates", () => {
        const result = getMaintenanceStatus(yesterday);

        expect(result).toBe("overdue");
      });

      it("should return 'warning' for dates within 7 days", () => {
        const result = getMaintenanceStatus(tomorrow);

        expect(result).toBe("warning");
      });

      it("should return 'warning' for date exactly 7 days away", () => {
        const result = getMaintenanceStatus(nextWeek);

        expect(result).toBe("warning");
      });

      it("should return 'ok' for dates more than 7 days away", () => {
        const result = getMaintenanceStatus(nextMonth);

        expect(result).toBe("ok");
      });

      it("should return 'warning' for today's date", () => {
        const result = getMaintenanceStatus(today);

        expect(result).toBe("warning");
      });
    });
  });
});
