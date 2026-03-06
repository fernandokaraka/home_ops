// Mock data store for notifications
export const mockNotifications = {
  scheduled: [] as any[],
  handler: null as any,
  permissions: { status: "granted" as const },
  channels: {} as Record<string, any>,
};

// Mock enums
export enum AndroidImportance {
  MIN = 1,
  LOW = 2,
  DEFAULT = 3,
  HIGH = 4,
  MAX = 5,
}

export enum SchedulableTriggerInputTypes {
  DATE = "date",
  TIME_INTERVAL = "timeInterval",
  DAILY = "daily",
  WEEKLY = "weekly",
  YEARLY = "yearly",
  CALENDAR = "calendar",
}

// Mock types
export interface NotificationTriggerInput {
  type?: string;
  [key: string]: any;
}

export interface DateTriggerInput extends NotificationTriggerInput {
  type: SchedulableTriggerInputTypes.DATE;
  date: Date | number;
}

export interface NotificationRequest {
  identifier: string;
  content: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: boolean | string;
    channelId?: string;
  };
  trigger: NotificationTriggerInput | null;
}

export interface Notification {
  request: NotificationRequest;
  date: number;
}

export interface NotificationResponse {
  notification: Notification;
  actionIdentifier: string;
  userText?: string;
}

// Mock notification handler
export const setNotificationHandler = jest.fn((handler: any) => {
  mockNotifications.handler = handler;
});

// Mock permission functions
export const getPermissionsAsync = jest.fn(async () => ({
  status: mockNotifications.permissions.status,
  expires: "never",
  allowsAlert: true,
  allowsBadge: true,
  allowsSound: true,
  canAskAgain: true,
  granted: mockNotifications.permissions.status === "granted",
}));

export const requestPermissionsAsync = jest.fn(async () => {
  mockNotifications.permissions.status = "granted";
  return {
    status: "granted" as const,
    expires: "never",
    allowsAlert: true,
    allowsBadge: true,
    allowsSound: true,
    canAskAgain: true,
    granted: true,
  };
});

// Mock channel functions
export const setNotificationChannelAsync = jest.fn(async (channelId: string, config: any) => {
  mockNotifications.channels[channelId] = config;
  return config;
});

export const getNotificationChannelAsync = jest.fn(async (channelId: string) => {
  return mockNotifications.channels[channelId] || null;
});

export const deleteNotificationChannelAsync = jest.fn(async (channelId: string) => {
  delete mockNotifications.channels[channelId];
});

// Mock scheduling functions
export const scheduleNotificationAsync = jest.fn(async (request: {
  content: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: boolean | string;
    channelId?: string;
  };
  trigger: NotificationTriggerInput | null;
}) => {
  const identifier = `mock-notification-${Date.now()}-${Math.random()}`;
  const notification: NotificationRequest = {
    identifier,
    content: request.content,
    trigger: request.trigger,
  };
  mockNotifications.scheduled.push(notification);
  return identifier;
});

export const getAllScheduledNotificationsAsync = jest.fn(async () => {
  return [...mockNotifications.scheduled];
});

export const cancelScheduledNotificationAsync = jest.fn(async (identifier: string) => {
  mockNotifications.scheduled = mockNotifications.scheduled.filter(
    (n) => n.identifier !== identifier
  );
});

export const cancelAllScheduledNotificationsAsync = jest.fn(async () => {
  mockNotifications.scheduled = [];
});

// Mock listener functions
export const addNotificationResponseReceivedListener = jest.fn((callback: (response: NotificationResponse) => void) => {
  return {
    remove: jest.fn(),
  };
});

export const addNotificationReceivedListener = jest.fn((callback: (notification: Notification) => void) => {
  return {
    remove: jest.fn(),
  };
});

// Mock presentation functions
export const getPresentedNotificationsAsync = jest.fn(async () => {
  return [];
});

export const dismissNotificationAsync = jest.fn(async (identifier: string) => {
  // No-op in mock
});

export const dismissAllNotificationsAsync = jest.fn(async () => {
  // No-op in mock
});

// Mock badge functions
export const setBadgeCountAsync = jest.fn(async (count: number) => {
  return true;
});

export const getBadgeCountAsync = jest.fn(async () => {
  return 0;
});

// Helper functions for tests
export const resetMockNotifications = () => {
  mockNotifications.scheduled = [];
  mockNotifications.handler = null;
  mockNotifications.permissions = { status: "granted" };
  mockNotifications.channels = {};

  // Clear all mock call histories
  setNotificationHandler.mockClear();
  getPermissionsAsync.mockClear();
  requestPermissionsAsync.mockClear();
  setNotificationChannelAsync.mockClear();
  getNotificationChannelAsync.mockClear();
  deleteNotificationChannelAsync.mockClear();
  scheduleNotificationAsync.mockClear();
  getAllScheduledNotificationsAsync.mockClear();
  cancelScheduledNotificationAsync.mockClear();
  cancelAllScheduledNotificationsAsync.mockClear();
  addNotificationResponseReceivedListener.mockClear();
  addNotificationReceivedListener.mockClear();
  getPresentedNotificationsAsync.mockClear();
  dismissNotificationAsync.mockClear();
  dismissAllNotificationsAsync.mockClear();
  setBadgeCountAsync.mockClear();
  getBadgeCountAsync.mockClear();
};

export const setMockPermissionStatus = (status: "granted" | "denied" | "undetermined") => {
  mockNotifications.permissions.status = status;
};

// Default export for compatibility
export default {
  AndroidImportance,
  SchedulableTriggerInputTypes,
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  getNotificationChannelAsync,
  deleteNotificationChannelAsync,
  scheduleNotificationAsync,
  getAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  addNotificationResponseReceivedListener,
  addNotificationReceivedListener,
  getPresentedNotificationsAsync,
  dismissNotificationAsync,
  dismissAllNotificationsAsync,
  setBadgeCountAsync,
  getBadgeCountAsync,
  mockNotifications,
  resetMockNotifications,
  setMockPermissionStatus,
};
