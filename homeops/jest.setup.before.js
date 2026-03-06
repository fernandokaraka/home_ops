// This file runs BEFORE setupFilesAfterEnv
// Critical mocks for React Native to work in tests

// Define global mocks that will be used by react-native
global.Dimensions = {
  get: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

global.PixelRatio = {
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 2,
  roundToNearestPixel: (size) => Math.round(size),
};

// Mock React Native modules
jest.mock('react-native/Libraries/Utilities/Dimensions', () => global.Dimensions);
jest.mock('react-native/Libraries/Utilities/PixelRatio', () => global.PixelRatio);

// Ensure PixelRatio is available globally before StyleSheet tries to use it
if (typeof require !== 'undefined') {
  try {
    // Mock the PixelRatio module with default export
    jest.doMock('react-native/Libraries/Utilities/PixelRatio', () => ({
      __esModule: true,
      default: global.PixelRatio,
      ...global.PixelRatio,
    }));
  } catch (e) {
    // Ignore if already mocked
  }
}
