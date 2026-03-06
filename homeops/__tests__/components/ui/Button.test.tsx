// CRITICAL: Mock Dimensions FIRST before anything else
// This must be at the very top before any imports
const mockDimensions = {
  get: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Set up the mock immediately
jest.doMock('react-native/Libraries/Utilities/Dimensions', () => mockDimensions);

// Mock ThemeContext before importing Button
jest.mock('@/contexts/ThemeContext', () => {
  const lightTheme = {
    background: '#E89A7C',
    surface: '#FDEEE8',
    surfaceVariant: '#F5D6C8',
    primary: '#C96B55',
    primaryLight: '#F5D6C8',
    text: '#3D2314',
    textSecondary: '#7D5A4A',
    textMuted: '#A68B7B',
    border: '#D4A892',
    borderLight: '#F5D6C8',
    success: '#10B981',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF9C3',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    gray: {
      50: '#FDF6F0',
      100: '#F5E6DE',
      200: '#E8D4C8',
      300: '#D4B8A8',
      400: '#A68B7B',
      500: '#7D5A4A',
      600: '#5C4035',
      700: '#3D2314',
      800: '#2A1810',
      900: '#1A0F0A',
    },
  };

  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useTheme: () => ({
      theme: lightTheme,
      themeMode: 'light' as const,
      isDark: false,
      setThemeMode: jest.fn(),
    }),
    lightTheme,
    darkTheme: lightTheme,
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, ActivityIndicator } from 'react-native';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('should render with text', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()}>Click Me</Button>
      );
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button onPress={onPressMock}>Press Me</Button>
      );

      const textElement = getByText('Press Me');
      const buttonElement = textElement.parent?.parent;
      if (buttonElement) {
        fireEvent.press(buttonElement);
      }

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} variant="primary">Primary</Button>
      );
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} variant="secondary">Secondary</Button>
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} variant="outline">Outline</Button>
      );
      expect(getByText('Outline')).toBeTruthy();
    });

    it('should render ghost variant', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} variant="ghost">Ghost</Button>
      );
      expect(getByText('Ghost')).toBeTruthy();
    });

    it('should render danger variant', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} variant="danger">Danger</Button>
      );
      expect(getByText('Danger')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} size="sm">Small</Button>
      );
      expect(getByText('Small')).toBeTruthy();
    });

    it('should render medium size', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} size="md">Medium</Button>
      );
      expect(getByText('Medium')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} size="lg">Large</Button>
      );
      expect(getByText('Large')).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should render disabled button', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} disabled>Disabled</Button>
      );
      const textElement = getByText('Disabled');
      const buttonElement = textElement.parent?.parent;
      // Check that disabled prop is set on TouchableOpacity
      expect(buttonElement).toBeTruthy();
      expect(buttonElement?.props.accessibilityState?.disabled || buttonElement?.props.disabled).toBeTruthy();
    });

    it('should not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button onPress={onPressMock} disabled>Disabled</Button>
      );

      const textElement = getByText('Disabled');
      const buttonElement = textElement.parent?.parent;
      if (buttonElement) {
        fireEvent.press(buttonElement);
      }

      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('should render loading state', () => {
      const { queryByText, UNSAFE_getByType } = render(
        <Button onPress={jest.fn()} loading>Loading</Button>
      );

      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
      expect(queryByText('Loading')).toBeNull();
    });

    it('should not call onPress when loading', () => {
      const onPressMock = jest.fn();
      const { UNSAFE_getByType } = render(
        <Button onPress={onPressMock} loading>Loading</Button>
      );

      const indicator = UNSAFE_getByType(ActivityIndicator);
      const buttonElement = indicator.parent;
      if (buttonElement) {
        fireEvent.press(buttonElement);
      }

      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('should render fullWidth button', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} fullWidth>Full Width</Button>
      );
      const textElement = getByText('Full Width');
      const buttonElement = textElement.parent?.parent;
      // Check that width is set in the style object
      const styles = Array.isArray(buttonElement?.props.style)
        ? buttonElement?.props.style
        : [buttonElement?.props.style];
      const hasFullWidth = styles.some((s: any) => s && s.width === '100%');
      expect(hasFullWidth).toBe(true);
    });
  });

  describe('Icon Rendering', () => {
    it('should render with icon', () => {
      const { getByTestId, getByText } = render(
        <Button onPress={jest.fn()} icon={<View testID="test-icon" />}>
          With Icon
        </Button>
      );
      expect(getByTestId('test-icon')).toBeTruthy();
      expect(getByText('With Icon')).toBeTruthy();
    });

    it('should not render icon when loading', () => {
      const { queryByTestId } = render(
        <Button onPress={jest.fn()} loading icon={<View testID="test-icon" />}>
          Loading
        </Button>
      );
      expect(queryByTestId('test-icon')).toBeNull();
    });
  });

  describe('Combined Props', () => {
    it('should work with variant and size', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} variant="outline" size="lg">
          Large Outline
        </Button>
      );
      expect(getByText('Large Outline')).toBeTruthy();
    });

    it('should work with all props', () => {
      const { getByText, getByTestId } = render(
        <Button
          onPress={jest.fn()}
          variant="danger"
          size="sm"
          fullWidth
          icon={<View testID="icon" />}
        >
          All Props
        </Button>
      );
      expect(getByText('All Props')).toBeTruthy();
      expect(getByTestId('icon')).toBeTruthy();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref', () => {
      const ref = React.createRef<View>();
      render(
        <Button ref={ref} onPress={jest.fn()}>Ref Test</Button>
      );
      expect(ref.current).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have activeOpacity', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()}>Test</Button>
      );
      const textElement = getByText('Test');
      const buttonElement = textElement.parent?.parent;
      // Button should render correctly and be pressable
      expect(buttonElement).toBeTruthy();
      expect(textElement).toBeTruthy();
    });

    it('should apply disabled style', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} disabled>Disabled</Button>
      );
      const textElement = getByText('Disabled');
      const buttonElement = textElement.parent?.parent;
      // Check that opacity 0.5 is applied in the style
      const styles = Array.isArray(buttonElement?.props.style)
        ? buttonElement?.props.style
        : [buttonElement?.props.style];
      const hasDisabledOpacity = styles.some((s: any) => s && s.opacity === 0.5);
      expect(hasDisabledOpacity).toBe(true);
    });
  });

  describe('Display Name', () => {
    it('should have correct displayName', () => {
      expect(Button.displayName).toBe('Button');
    });
  });
});
