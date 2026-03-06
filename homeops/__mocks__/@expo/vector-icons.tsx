import React from 'react';
import { Text } from 'react-native';

// Mock for @expo/vector-icons
const MockIcon = (props: any) => {
  return <Text {...props}>{props.name || 'icon'}</Text>;
};

export const Ionicons = MockIcon;
export const FontAwesome = MockIcon;
export const MaterialIcons = MockIcon;
export const MaterialCommunityIcons = MockIcon;
export const Feather = MockIcon;
export const Entypo = MockIcon;
export const AntDesign = MockIcon;
export const EvilIcons = MockIcon;
export const Foundation = MockIcon;
export const Octicons = MockIcon;
export const SimpleLineIcons = MockIcon;
export const Zocial = MockIcon;
export const FontAwesome5 = MockIcon;

export default {
  Ionicons,
  FontAwesome,
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
  Entypo,
  AntDesign,
  EvilIcons,
  Foundation,
  Octicons,
  SimpleLineIcons,
  Zocial,
  FontAwesome5,
};
