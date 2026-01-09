import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  primaryLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  // Escala de cinza dinamica
  gray: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

export const lightTheme: ThemeColors = {
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

export const darkTheme: ThemeColors = {
  background: '#1C1917',
  surface: '#292524',
  surfaceVariant: '#3D3836',
  primary: '#D4806A',
  primaryLight: '#E8A090',
  text: '#FFFFFF',
  textSecondary: '#A8A29E',
  textMuted: '#78716C',
  border: '#44403C',
  borderLight: '#3D3836',
  success: '#10B981',
  successLight: '#1A3D2E',
  warning: '#F59E0B',
  warningLight: '#3D3014',
  danger: '#EF4444',
  dangerLight: '#3D1F1F',
  gray: {
    50: '#292524',
    100: '#3D3836',
    200: '#44403C',
    300: '#57534E',
    400: '#78716C',
    500: '#A8A29E',
    600: '#D6D3D1',
    700: '#E7E5E4',
    800: '#F5F5F4',
    900: '#FAFAF9',
  },
};

interface ThemeContextType {
  theme: ThemeColors;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@homeops_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega tema salvo do AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
          setThemeModeState(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Salva tema no AsyncStorage quando muda
  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Determina se deve usar dark mode
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  // Seleciona o tema apropriado
  const theme = isDark ? darkTheme : lightTheme;

  // Espera carregar o tema antes de renderizar
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper para obter cores baseadas no tema atual (para uso fora de componentes React)
export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkTheme : lightTheme;
}
