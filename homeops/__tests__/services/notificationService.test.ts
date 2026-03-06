import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Task, MaintenanceItem, Bill } from "@/types";

// Mock all external dependencies
jest.mock("expo-notifications");
jest.mock("expo-device");
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    appOwnership: "standalone",
  },
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock Platform
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

// Import after mocks are set up
import * as notificationService from "@/services/notificationService";

describe("notificationService", () => {
  const mockTask: Task = {
    id: "task-1",
    household_id: "household-1",
    category_id: "cat-1",
    title: "Limpar cozinha",
    description: "Limpar bancadas e pia",
    is_recurring: false,
    recurrence_type: null,
    recurrence_days: null,
    recurrence_interval: 1,
    due_date: "2024-02-01",
    due_time: "10:00",
    next_occurrence: null,
    status: "pending",
    completed_at: null,
    completed_by: null,
    assigned_to: null,
    priority: 2,
    estimated_minutes: 30,
    created_by: "user-1",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  };

  const mockBill: Bill = {
    id: "bill-1",
    household_id: "household-1",
    category_id: "cat-1",
    name: "Conta de luz",
    amount: 150.50,
    is_recurring: true,
    due_day: 15,
    current_month_status: "pending",
    current_month_paid_at: null,
    current_month_paid_amount: null,
    alert_days_before: 3,
    payment_method: "Boleto",
    auto_debit: false,
    notes: null,
    created_by: "user-1",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  };

  const mockMaintenanceItem: MaintenanceItem = {
    id: "maint-1",
    household_id: "household-1",
    category_id: "cat-1",
    name: "Ar condicionado",
    brand: "LG",
    model: "S4-W12JA3AA",
    purchase_date: "2023-01-15",
    warranty_until: "2025-01-15",
    maintenance_interval_months: 6,
    last_maintenance_date: "2024-01-15",
    next_maintenance_date: "2024-07-15",
    preferred_provider: "Acme Service",
    provider_phone: "(11) 1234-5678",
    manual_url: null,
    receipt_url: null,
    alert_days_before: 7,
    created_by: "user-1",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Device.isDevice as any) = true;
  });

  describe("requestNotificationPermissions", () => {
    it("should return false when not on a physical device", async () => {
      (Device.isDevice as any) = false;

      const result = await notificationService.requestNotificationPermissions();

      expect(result).toBe(false);
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    });

    it("should return true when permission already granted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });

      const result = await notificationService.requestNotificationPermissions();

      expect(result).toBe(true);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it("should request permission and return true when granted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "undetermined",
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });

      const result = await notificationService.requestNotificationPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it("should return false when permission denied", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "undetermined",
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "denied",
      });

      const result = await notificationService.requestNotificationPermissions();

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error("Permission error")
      );

      const result = await notificationService.requestNotificationPermissions();

      expect(result).toBe(false);
    });
  });

  describe("getNotificationPreferences", () => {
    it("should return default preferences when nothing stored", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const prefs = await notificationService.getNotificationPreferences();

      expect(prefs).toEqual({
        enabled: true,
        taskReminders: true,
        billReminders: true,
        maintenanceReminders: true,
        reminderTime: "09:00",
        billReminderDaysBefore: 3,
        maintenanceReminderDaysBefore: 7,
      });
    });

    it("should return stored preferences", async () => {
      const storedPrefs = {
        enabled: false,
        taskReminders: false,
        reminderTime: "08:00",
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedPrefs));

      const prefs = await notificationService.getNotificationPreferences();

      expect(prefs).toMatchObject(storedPrefs);
      expect(prefs.billReminders).toBe(true); // Should merge with defaults
    });

    it("should return default preferences on error", async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("Storage error"));

      const prefs = await notificationService.getNotificationPreferences();

      expect(prefs).toEqual({
        enabled: true,
        taskReminders: true,
        billReminders: true,
        maintenanceReminders: true,
        reminderTime: "09:00",
        billReminderDaysBefore: 3,
        maintenanceReminderDaysBefore: 7,
      });
    });
  });

  describe("saveNotificationPreferences", () => {
    it("should save preferences to storage", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newPrefs = { enabled: false, reminderTime: "08:00" };
      await notificationService.saveNotificationPreferences(newPrefs);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@homeops_notification_prefs",
        expect.stringContaining("false")
      );
    });

    it("should merge with existing preferences", async () => {
      const existingPrefs = { enabled: true, taskReminders: false };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingPrefs));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await notificationService.saveNotificationPreferences({ reminderTime: "08:00" });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@homeops_notification_prefs",
        expect.stringContaining("08:00")
      );
    });

    it("should handle save errors gracefully", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error("Storage error"));

      await expect(
        notificationService.saveNotificationPreferences({ enabled: false })
      ).resolves.not.toThrow();
    });
  });

  describe("scheduleNotification", () => {
    it("should schedule notification successfully", async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("notif-123");
      const trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date() };

      const result = await notificationService.scheduleNotification(
        "Test Title",
        "Test Body",
        trigger,
        { foo: "bar" },
        "default"
      );

      expect(result).toBe("notif-123");
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Test Title",
          body: "Test Body",
          data: { foo: "bar" },
          sound: true,
        },
        trigger,
      });
    });

    it("should handle scheduling errors gracefully", async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error("Schedule error")
      );
      const trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date() };

      const result = await notificationService.scheduleNotification("Test", "Body", trigger);

      expect(result).toBe("");
    });
  });

  describe("cancelNotification", () => {
    it("should not cancel when identifier is empty", async () => {
      await notificationService.cancelNotification("");

      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });

    it("should cancel notification successfully", async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);

      await notificationService.cancelNotification("notif-123");

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("notif-123");
    });

    it("should handle cancel errors gracefully", async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(
        new Error("Cancel error")
      );

      await expect(notificationService.cancelNotification("notif-123")).resolves.not.toThrow();
    });
  });

  describe("cancelNotificationsByTag", () => {
    it("should cancel all notifications with matching tag", async () => {
      const mockNotifications = [
        {
          identifier: "notif-1",
          content: { data: { tag: "task_1" } },
        },
        {
          identifier: "notif-2",
          content: { data: { tag: "task_2" } },
        },
        {
          identifier: "notif-3",
          content: { data: { tag: "task_1" } },
        },
      ];
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(
        mockNotifications
      );
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);

      await notificationService.cancelNotificationsByTag("task_1");

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("notif-1");
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("notif-3");
    });

    it("should handle errors gracefully", async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(
        new Error("Get error")
      );

      await expect(notificationService.cancelNotificationsByTag("task_1")).resolves.not.toThrow();
    });
  });

  describe("cancelAllNotifications", () => {
    it("should cancel all notifications successfully", async () => {
      (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(
        undefined
      );

      await notificationService.cancelAllNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(
        new Error("Cancel error")
      );

      await expect(notificationService.cancelAllNotifications()).resolves.not.toThrow();
    });
  });

  describe("getScheduledNotifications", () => {
    it("should return scheduled notifications", async () => {
      const mockNotifications = [
        { identifier: "notif-1", content: {} },
        { identifier: "notif-2", content: {} },
      ];
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(
        mockNotifications
      );

      const result = await notificationService.getScheduledNotifications();

      expect(result).toEqual(mockNotifications);
    });

    it("should return empty array on error", async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(
        new Error("Get error")
      );

      const result = await notificationService.getScheduledNotifications();

      expect(result).toEqual([]);
    });
  });

  describe("scheduleTaskReminder", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-20T10:00:00Z"));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("notif-123");
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return null when notifications disabled in preferences", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: false })
      );

      const result = await notificationService.scheduleTaskReminder(mockTask);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when task reminders disabled in preferences", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: true, taskReminders: false })
      );

      const result = await notificationService.scheduleTaskReminder(mockTask);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when task has no due date", async () => {
      const taskWithoutDueDate = { ...mockTask, due_date: null };

      const result = await notificationService.scheduleTaskReminder(taskWithoutDueDate);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when due date is in the past", async () => {
      const pastTask = { ...mockTask, due_date: "2024-01-10" };

      const result = await notificationService.scheduleTaskReminder(pastTask);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should schedule reminder successfully for future task", async () => {
      const futureTask = { ...mockTask, due_date: "2024-02-01" };

      const result = await notificationService.scheduleTaskReminder(futureTask, "09:00");

      expect(result).toBe("notif-123");
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Tarefa pendente",
          body: "Limpar cozinha vence hoje!",
          data: { type: "task", taskId: "task-1", tag: "task_task-1" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: expect.any(Date),
        },
      });
    });

    it("should cancel existing reminder before scheduling new one", async () => {
      const futureTask = { ...mockTask, due_date: "2024-02-01" };
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
        {
          identifier: "old-notif",
          content: { data: { tag: "task_task-1" } },
        },
      ]);

      await notificationService.scheduleTaskReminder(futureTask, "09:00");

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("old-notif");
    });
  });

  describe("scheduleBillReminder", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-10T10:00:00Z"));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("notif-123");
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return null when notifications disabled in preferences", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: false })
      );

      const result = await notificationService.scheduleBillReminder(mockBill);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when bill reminders disabled in preferences", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: true, billReminders: false })
      );

      const result = await notificationService.scheduleBillReminder(mockBill);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when bill has no due day", async () => {
      const billWithoutDueDay = { ...mockBill, due_day: null };

      const result = await notificationService.scheduleBillReminder(billWithoutDueDay);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when bill is already paid", async () => {
      const paidBill = { ...mockBill, current_month_status: "paid" as const };

      const result = await notificationService.scheduleBillReminder(paidBill);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should schedule reminder for upcoming bill in current month", async () => {
      const bill = { ...mockBill, due_day: 20 }; // Due on Jan 20, current date is Jan 10

      const result = await notificationService.scheduleBillReminder(bill, "09:00", 3);

      expect(result).toBe("notif-123");
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Conta a vencer",
          body: expect.stringContaining("Conta de luz"),
          data: { type: "bill", billId: "bill-1", tag: "bill_bill-1" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: expect.any(Date),
        },
      });
    });

    it("should schedule for next month if due day passed", async () => {
      jest.setSystemTime(new Date("2024-01-20T10:00:00Z"));
      const bill = { ...mockBill, due_day: 10 }; // Due day already passed

      const result = await notificationService.scheduleBillReminder(bill, "09:00", 3);

      expect(result).toBe("notif-123");
    });

    it("should cancel existing reminder before scheduling new one", async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
        {
          identifier: "old-notif",
          content: { data: { tag: "bill_bill-1" } },
        },
      ]);

      await notificationService.scheduleBillReminder(mockBill, "09:00", 3);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("old-notif");
    });
  });

  describe("scheduleMaintenanceReminder", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-20T10:00:00Z"));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("notif-123");
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return null when notifications disabled in preferences", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: false })
      );

      const result = await notificationService.scheduleMaintenanceReminder(mockMaintenanceItem);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when maintenance reminders disabled in preferences", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: true, maintenanceReminders: false })
      );

      const result = await notificationService.scheduleMaintenanceReminder(mockMaintenanceItem);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when item has no next maintenance date", async () => {
      const itemWithoutDate = { ...mockMaintenanceItem, next_maintenance_date: null };

      const result = await notificationService.scheduleMaintenanceReminder(itemWithoutDate);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should return null when reminder date is in the past and maintenance date is past", async () => {
      const pastItem = { ...mockMaintenanceItem, next_maintenance_date: "2024-01-10" };

      const result = await notificationService.scheduleMaintenanceReminder(pastItem, "09:00", 7);

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should schedule reminder successfully for future maintenance", async () => {
      const futureItem = { ...mockMaintenanceItem, next_maintenance_date: "2024-02-15" };

      const result = await notificationService.scheduleMaintenanceReminder(
        futureItem,
        "09:00",
        7
      );

      expect(result).toBe("notif-123");
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Manutencao programada",
          body: expect.stringContaining("Ar condicionado"),
          data: { type: "maintenance", itemId: "maint-1", tag: "maintenance_maint-1" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: expect.any(Date),
        },
      });
    });

    it("should cancel existing reminder before scheduling new one", async () => {
      const futureItem = { ...mockMaintenanceItem, next_maintenance_date: "2024-02-15" };
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
        {
          identifier: "old-notif",
          content: { data: { tag: "maintenance_maint-1" } },
        },
      ]);

      await notificationService.scheduleMaintenanceReminder(futureItem, "09:00", 7);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("old-notif");
    });
  });

  describe("scheduleAllTaskReminders", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-20T10:00:00Z"));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("notif-123");
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should not schedule when notifications disabled", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: false })
      );

      await notificationService.scheduleAllTaskReminders([mockTask]);

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should schedule reminders for all pending tasks", async () => {
      const tasks = [
        { ...mockTask, id: "task-1", due_date: "2024-02-01", status: "pending" as const },
        { ...mockTask, id: "task-2", due_date: "2024-02-02", status: "pending" as const },
        { ...mockTask, id: "task-3", due_date: "2024-02-03", status: "completed" as const },
      ];

      await notificationService.scheduleAllTaskReminders(tasks);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe("scheduleAllBillReminders", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-10T10:00:00Z"));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("notif-123");
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should not schedule when notifications disabled", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: false })
      );

      await notificationService.scheduleAllBillReminders([mockBill]);

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should schedule reminders for all bills", async () => {
      const bills = [
        { ...mockBill, id: "bill-1", due_day: 15, current_month_status: "pending" as const },
        { ...mockBill, id: "bill-2", due_day: 20, current_month_status: "pending" as const },
      ];

      await notificationService.scheduleAllBillReminders(bills);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe("scheduleAllMaintenanceReminders", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-20T10:00:00Z"));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("notif-123");
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should not schedule when notifications disabled", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ enabled: false })
      );

      await notificationService.scheduleAllMaintenanceReminders([mockMaintenanceItem]);

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should schedule reminders for all maintenance items", async () => {
      const items = [
        { ...mockMaintenanceItem, id: "maint-1", next_maintenance_date: "2024-02-15" },
        { ...mockMaintenanceItem, id: "maint-2", next_maintenance_date: "2024-02-20" },
      ];

      await notificationService.scheduleAllMaintenanceReminders(items);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe("sendTestNotification", () => {
    it("should send immediate notification", async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(undefined);

      await notificationService.sendTestNotification();

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "HomeOps",
          body: "Notificacoes configuradas com sucesso!",
          sound: true,
        },
        trigger: null,
      });
    });

    it("should handle send errors gracefully", async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error("Send error")
      );

      await expect(notificationService.sendTestNotification()).resolves.not.toThrow();
    });
  });

  describe("addNotificationResponseListener", () => {
    it("should add listener successfully", () => {
      const mockRemove = jest.fn();
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      const callback = jest.fn();
      const listener = notificationService.addNotificationResponseListener(callback);

      expect(listener.remove).toBe(mockRemove);
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(callback);
    });

    it("should handle listener errors gracefully", () => {
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(
        () => {
          throw new Error("Listener error");
        }
      );

      const listener = notificationService.addNotificationResponseListener(() => {});

      expect(listener).toEqual({ remove: expect.any(Function) });
    });
  });

  describe("addNotificationReceivedListener", () => {
    it("should add listener successfully", () => {
      const mockRemove = jest.fn();
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      const callback = jest.fn();
      const listener = notificationService.addNotificationReceivedListener(callback);

      expect(listener.remove).toBe(mockRemove);
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledWith(callback);
    });

    it("should handle listener errors gracefully", () => {
      (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation(() => {
        throw new Error("Listener error");
      });

      const listener = notificationService.addNotificationReceivedListener(() => {});

      expect(listener).toEqual({ remove: expect.any(Function) });
    });
  });

  describe("areNotificationsAvailable", () => {
    it("should return true when not running in Expo Go", () => {
      const result = notificationService.areNotificationsAvailable();

      expect(result).toBe(true);
    });
  });
});
