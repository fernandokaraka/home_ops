// Mock ThemeContext before importing Card
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
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('should render with children', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render children when no onPress prop', () => {
      const { getByTestId } = render(
        <Card>
          <Text testID="card-child">Content</Text>
        </Card>
      );
      expect(getByTestId('card-child')).toBeTruthy();
    });

    it('should render children when onPress prop is provided', () => {
      const { getByTestId } = render(
        <Card onPress={jest.fn()}>
          <Text testID="card-child">Content</Text>
        </Card>
      );
      expect(getByTestId('card-child')).toBeTruthy();
    });
  });

  describe('onPress Behavior', () => {
    it('should call onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Card onPress={onPressMock}>
          <Text>Press Me</Text>
        </Card>
      );

      const textElement = getByText('Press Me');
      const cardElement = textElement.parent;
      if (cardElement) {
        fireEvent.press(cardElement);
      }

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should be pressable when onPress is provided', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Card onPress={onPressMock}>
          <Text>Pressable Card</Text>
        </Card>
      );

      // Verify onPress handler is set up correctly by checking it can be called
      expect(onPressMock).not.toHaveBeenCalled();

      const textElement = getByText('Pressable Card');
      const cardElement = textElement.parent;
      if (cardElement) {
        fireEvent.press(cardElement);
      }

      expect(onPressMock).toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { getByText } = render(
        <Card variant="default">
          <Text>Default Card</Text>
        </Card>
      );
      expect(getByText('Default Card')).toBeTruthy();
    });

    it('should render outlined variant', () => {
      const { getByText } = render(
        <Card variant="outlined">
          <Text>Outlined Card</Text>
        </Card>
      );
      expect(getByText('Outlined Card')).toBeTruthy();
    });

    it('should render elevated variant', () => {
      const { getByText } = render(
        <Card variant="elevated">
          <Text>Elevated Card</Text>
        </Card>
      );
      expect(getByText('Elevated Card')).toBeTruthy();
    });
  });

  describe('Custom Styles', () => {
    it('should render with custom style prop', () => {
      const customStyle = { marginTop: 20, marginBottom: 10 };
      const { getByText } = render(
        <Card style={customStyle}>
          <Text>Styled Card</Text>
        </Card>
      );
      expect(getByText('Styled Card')).toBeTruthy();
    });

    it('should accept style prop without errors', () => {
      const { getByText } = render(
        <Card style={{ padding: 24 }}>
          <Text>Padded Card</Text>
        </Card>
      );
      expect(getByText('Padded Card')).toBeTruthy();
    });
  });

  describe('Theme Integration', () => {
    it('should render with theme context', () => {
      const { getByText } = render(
        <Card>
          <Text>Themed Card</Text>
        </Card>
      );
      expect(getByText('Themed Card')).toBeTruthy();
    });

    it('should render outlined variant with theme', () => {
      const { getByText } = render(
        <Card variant="outlined">
          <Text>Themed Outlined Card</Text>
        </Card>
      );
      expect(getByText('Themed Outlined Card')).toBeTruthy();
    });
  });

  describe('Combined Props', () => {
    it('should work with variant and custom style', () => {
      const { getByText } = render(
        <Card variant="outlined" style={{ padding: 20 }}>
          <Text>Combined Props</Text>
        </Card>
      );
      expect(getByText('Combined Props')).toBeTruthy();
    });

    it('should work with all props together', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Card
          variant="elevated"
          style={{ margin: 10 }}
          onPress={onPressMock}
        >
          <Text>All Props</Text>
        </Card>
      );

      expect(getByText('All Props')).toBeTruthy();

      const textElement = getByText('All Props');
      const cardElement = textElement.parent;
      if (cardElement) {
        fireEvent.press(cardElement);
      }

      expect(onPressMock).toHaveBeenCalled();
    });
  });

  describe('Base Styles', () => {
    it('should render with default styles', () => {
      const { getByText } = render(
        <Card>
          <Text>Default Styled Card</Text>
        </Card>
      );
      expect(getByText('Default Styled Card')).toBeTruthy();
    });

    it('should maintain structure with styling', () => {
      const { getByText } = render(
        <Card>
          <Text>Structured Card</Text>
        </Card>
      );
      const textElement = getByText('Structured Card');
      expect(textElement.parent).toBeTruthy();
    });
  });

  describe('Multiple Children', () => {
    it('should render multiple children', () => {
      const { getByText, getByTestId } = render(
        <Card>
          <Text>First Child</Text>
          <Text>Second Child</Text>
          <View testID="third-child" />
        </Card>
      );

      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
      expect(getByTestId('third-child')).toBeTruthy();
    });
  });
});
