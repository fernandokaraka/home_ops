// Extend Jest with custom matchers from @testing-library/jest-native
try {
  require('@testing-library/jest-native/extend-expect');
} catch (error) {
  // Ignore if not in Jest environment
}

// Mock react-native globally before any other imports
global.Platform = {
  OS: 'ios',
  Version: '16.0',
  select: (obj) => obj.ios || obj.default,
};

// Only apply mocks if running in Jest environment
if (typeof jest !== 'undefined') {
  // Mock react-native-url-polyfill
  jest.mock('react-native-url-polyfill/auto', () => ({}));

  // Mock React Native Platform
  jest.mock('react-native/Libraries/Utilities/Platform', () => {
    const Platform = {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
      Version: '16.0',
    };
    return Platform;
  });

  // Mock React Native Dimensions
  jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
    get: jest.fn(() => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));


  // Mock AsyncStorage
  jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  }));

  // Mock Expo Router
  jest.mock('expo-router', () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
    })),
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    usePathname: jest.fn(() => '/'),
    Link: jest.fn(({ children }) => children),
    Redirect: jest.fn(() => null),
    Stack: {
      Screen: jest.fn(() => null),
    },
    Tabs: {
      Screen: jest.fn(() => null),
    },
  }));

  // Mock Expo Constants
  jest.mock('expo-constants', () => ({
    default: {
      appOwnership: 'standalone',
      expoConfig: {
        name: 'HomeOps',
        slug: 'homeops',
      },
    },
    ExecutionEnvironment: {
      Standalone: 'standalone',
      StoreClient: 'storeClient',
    },
  }));

  // Mock Expo Device
  jest.mock('expo-device', () => ({
    isDevice: true,
    brand: 'Apple',
    manufacturer: 'Apple',
    modelName: 'iPhone 13',
    osName: 'iOS',
    osVersion: '16.0',
    deviceType: 2,
    DeviceType: {
      PHONE: 1,
      TABLET: 2,
      DESKTOP: 3,
      TV: 4,
    },
  }));

  // Mock Expo Notifications (basic mock, detailed mock in __mocks__)
  jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
    cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
    cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
    setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    AndroidImportance: {
      MIN: 1,
      LOW: 2,
      DEFAULT: 3,
      HIGH: 4,
      MAX: 5,
    },
    SchedulableTriggerInputTypes: {
      DATE: 'date',
      TIME_INTERVAL: 'timeInterval',
      DAILY: 'daily',
      WEEKLY: 'weekly',
      YEARLY: 'yearly',
      CALENDAR: 'calendar',
    },
  }));

  // Mock NativeWind
  jest.mock('nativewind', () => ({
    styled: (Component) => Component,
  }));

  // Mock React Native Reanimated
  jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
  });

  // Mock React Native Gesture Handler
  jest.mock('react-native-gesture-handler', () => {
    const View = require('react-native').View;
    return {
      Swipeable: View,
      DrawerLayout: View,
      State: {},
      ScrollView: View,
      Slider: View,
      Switch: View,
      TextInput: View,
      ToolbarAndroid: View,
      ViewPagerAndroid: View,
      DrawerLayoutAndroid: View,
      WebView: View,
      NativeViewGestureHandler: View,
      TapGestureHandler: View,
      FlingGestureHandler: View,
      ForceTouchGestureHandler: View,
      LongPressGestureHandler: View,
      PanGestureHandler: View,
      PinchGestureHandler: View,
      RotationGestureHandler: View,
      RawButton: View,
      BaseButton: View,
      RectButton: View,
      BorderlessButton: View,
      FlatList: View,
      gestureHandlerRootHOC: jest.fn((c) => c),
      Directions: {},
    };
  });

  // Global test utilities
  global.console = {
    ...console,
    // Silence console.error and console.warn in tests unless DEBUG is set
    error: process.env.DEBUG ? console.error : jest.fn(),
    warn: process.env.DEBUG ? console.warn : jest.fn(),
    log: console.log,
    info: console.info,
    debug: console.debug,
  };

  // Reset all mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });
}
