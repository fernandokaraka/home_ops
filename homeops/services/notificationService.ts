import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Task, MaintenanceItem, Bill } from "@/types";

// Check if running in Expo Go (notifications limited since SDK 53)
const isExpoGo = Constants.appOwnership === "expo";

// Configure notification behavior (only if not in Expo Go)
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Notification preferences storage key
const NOTIFICATION_PREFS_KEY = "@homeops_notification_prefs";

export interface NotificationPreferences {
  enabled: boolean;
  taskReminders: boolean;
  billReminders: boolean;
  maintenanceReminders: boolean;
  reminderTime: string; // HH:mm format
  billReminderDaysBefore: number;
  maintenanceReminderDaysBefore: number;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  taskReminders: true,
  billReminders: true,
  maintenanceReminders: true,
  reminderTime: "09:00",
  billReminderDaysBefore: 3,
  maintenanceReminderDaysBefore: 7,
};

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  // Skip if running in Expo Go
  if (isExpoGo) {
    console.log("Notifications limited in Expo Go - use development build for full support");
    return false;
  }

  if (!Device.isDevice) {
    console.log("Notifications require a physical device");
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permission denied");
      return false;
    }

    // Configure Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "HomeOps",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3B82F6",
      });

      await Notifications.setNotificationChannelAsync("bills", {
        name: "Contas a Pagar",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EF4444",
      });

      await Notifications.setNotificationChannelAsync("maintenance", {
        name: "Manutencoes",
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: "#F59E0B",
      });

      await Notifications.setNotificationChannelAsync("tasks", {
        name: "Tarefas",
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: "#3B82F6",
      });
    }

    return true;
  } catch (error) {
    console.log("Error requesting notification permissions:", error);
    return false;
  }
}

// Get notification preferences
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading notification preferences:", error);
  }
  return DEFAULT_PREFERENCES;
}

// Save notification preferences
export async function saveNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const current = await getNotificationPreferences();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving notification preferences:", error);
  }
}

// Schedule a local notification
export async function scheduleNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, unknown>,
  channelId?: string
): Promise<string> {
  // Skip if running in Expo Go
  if (isExpoGo) return "";

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        ...(Platform.OS === "android" && channelId ? { channelId } : {}),
      },
      trigger,
    });

    return identifier;
  } catch (error) {
    console.log("Error scheduling notification:", error);
    return "";
  }
}

// Cancel a scheduled notification
export async function cancelNotification(identifier: string): Promise<void> {
  if (isExpoGo || !identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.log("Error canceling notification:", error);
  }
}

// Cancel all notifications with a specific tag
export async function cancelNotificationsByTag(tag: string): Promise<void> {
  if (isExpoGo) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.tag === tag) {
        await cancelNotification(notification.identifier);
      }
    }
  } catch (error) {
    console.log("Error canceling notifications by tag:", error);
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  if (isExpoGo) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log("Error canceling all notifications:", error);
  }
}

// Get all scheduled notifications
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  if (isExpoGo) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.log("Error getting scheduled notifications:", error);
    return [];
  }
}

// Helper to create date trigger at specific time
function createDateTrigger(date: Date): Notifications.DateTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
  };
}

// Schedule task reminder
export async function scheduleTaskReminder(
  task: Task,
  reminderTime: string = "09:00"
): Promise<string | null> {
  const prefs = await getNotificationPreferences();
  if (!prefs.enabled || !prefs.taskReminders) return null;

  if (!task.due_date) return null;

  const [hours, minutes] = reminderTime.split(":").map(Number);
  const dueDate = new Date(task.due_date);
  dueDate.setHours(hours, minutes, 0, 0);

  // Don't schedule if due date is in the past
  if (dueDate <= new Date()) return null;

  // Cancel existing reminder for this task
  await cancelNotificationsByTag(`task_${task.id}`);

  return scheduleNotification(
    "Tarefa pendente",
    `${task.title} vence hoje!`,
    createDateTrigger(dueDate),
    { type: "task", taskId: task.id, tag: `task_${task.id}` },
    "tasks"
  );
}

// Schedule bill reminder
export async function scheduleBillReminder(
  bill: Bill,
  reminderTime: string = "09:00",
  daysBefore: number = 3
): Promise<string | null> {
  const prefs = await getNotificationPreferences();
  if (!prefs.enabled || !prefs.billReminders) return null;

  if (!bill.due_day || bill.current_month_status === "paid") return null;

  // Calculate due date for current month
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), bill.due_day);

  // If due day already passed this month, schedule for next month
  if (dueDate < now) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  // Calculate reminder date
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);

  const [hours, minutes] = reminderTime.split(":").map(Number);
  reminderDate.setHours(hours, minutes, 0, 0);

  // Don't schedule if reminder date is in the past
  if (reminderDate <= new Date()) {
    // If reminder date passed but due date hasn't, schedule for today
    if (dueDate > new Date()) {
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);
      if (today > new Date()) {
        reminderDate.setTime(today.getTime());
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  // Cancel existing reminder for this bill
  await cancelNotificationsByTag(`bill_${bill.id}`);

  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return scheduleNotification(
    "Conta a vencer",
    `${bill.name} (R$ ${bill.amount.toFixed(2)}) vence em ${daysUntilDue} dia${daysUntilDue !== 1 ? "s" : ""}`,
    createDateTrigger(reminderDate),
    { type: "bill", billId: bill.id, tag: `bill_${bill.id}` },
    "bills"
  );
}

// Schedule maintenance reminder
export async function scheduleMaintenanceReminder(
  item: MaintenanceItem,
  reminderTime: string = "09:00",
  daysBefore: number = 7
): Promise<string | null> {
  const prefs = await getNotificationPreferences();
  if (!prefs.enabled || !prefs.maintenanceReminders) return null;

  if (!item.next_maintenance_date) return null;

  const maintenanceDate = new Date(item.next_maintenance_date);
  const reminderDate = new Date(maintenanceDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);

  const [hours, minutes] = reminderTime.split(":").map(Number);
  reminderDate.setHours(hours, minutes, 0, 0);

  // Don't schedule if reminder date is in the past
  if (reminderDate <= new Date()) {
    // If reminder date passed but maintenance date hasn't, schedule for today
    if (maintenanceDate > new Date()) {
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);
      if (today > new Date()) {
        reminderDate.setTime(today.getTime());
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  // Cancel existing reminder for this item
  await cancelNotificationsByTag(`maintenance_${item.id}`);

  const daysUntil = Math.ceil(
    (maintenanceDate.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return scheduleNotification(
    "Manutencao programada",
    `${item.name} precisa de manutencao em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`,
    createDateTrigger(reminderDate),
    { type: "maintenance", itemId: item.id, tag: `maintenance_${item.id}` },
    "maintenance"
  );
}

// Schedule all reminders for tasks
export async function scheduleAllTaskReminders(tasks: Task[]): Promise<void> {
  const prefs = await getNotificationPreferences();
  if (!prefs.enabled || !prefs.taskReminders) return;

  for (const task of tasks) {
    if (task.status !== "completed") {
      await scheduleTaskReminder(task, prefs.reminderTime);
    }
  }
}

// Schedule all reminders for bills
export async function scheduleAllBillReminders(bills: Bill[]): Promise<void> {
  const prefs = await getNotificationPreferences();
  if (!prefs.enabled || !prefs.billReminders) return;

  for (const bill of bills) {
    await scheduleBillReminder(
      bill,
      prefs.reminderTime,
      prefs.billReminderDaysBefore
    );
  }
}

// Schedule all reminders for maintenance items
export async function scheduleAllMaintenanceReminders(
  items: MaintenanceItem[]
): Promise<void> {
  const prefs = await getNotificationPreferences();
  if (!prefs.enabled || !prefs.maintenanceReminders) return;

  for (const item of items) {
    await scheduleMaintenanceReminder(
      item,
      prefs.reminderTime,
      prefs.maintenanceReminderDaysBefore
    );
  }
}

// Send immediate notification (for testing)
export async function sendTestNotification(): Promise<void> {
  if (isExpoGo) {
    console.log("Test notification skipped - running in Expo Go");
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "HomeOps",
        body: "Notificacoes configuradas com sucesso!",
        sound: true,
      },
      trigger: null, // Immediate
    });
  } catch (error) {
    console.log("Error sending test notification:", error);
  }
}

// Add notification response listener
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): { remove: () => void } {
  if (isExpoGo) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (error) {
    console.log("Error adding notification response listener:", error);
    return { remove: () => {} };
  }
}

// Add notification received listener
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): { remove: () => void } {
  if (isExpoGo) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationReceivedListener(callback);
  } catch (error) {
    console.log("Error adding notification received listener:", error);
    return { remove: () => {} };
  }
}

// Check if notifications are available
export function areNotificationsAvailable(): boolean {
  return !isExpoGo;
}
