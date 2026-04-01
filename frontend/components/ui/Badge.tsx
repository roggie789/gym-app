import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { cn } from '../../utils/cn';
import { Colors } from '../../constants/colors';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: ViewStyle | TextStyle;
  style?: ViewStyle | TextStyle;
  testID?: string;
}

const badgeStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  default: {
    backgroundColor: Colors.primary,
    borderColor: 'transparent',
  },
  secondary: {
    backgroundColor: Colors.secondary,
    borderColor: 'transparent',
  },
  destructive: {
    backgroundColor: Colors.danger,
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  textDefault: {
    color: Colors.textPrimary,
  },
  textSecondary: {
    color: Colors.textPrimary,
  },
  textDestructive: {
    color: Colors.textPrimary,
  },
  textOutline: {
    color: Colors.textPrimary,
  },
});

export const Badge = ({ children, variant = 'default', className, style, testID }: BadgeProps) => {
  const containerStyle = [
    badgeStyles.base,
    badgeStyles[variant],
    className,
  ];

  const textStyle = [
    badgeStyles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as 'textDefault' | 'textSecondary' | 'textDestructive' | 'textOutline'],
  ];

  return (
    <View testID={testID} style={[containerStyle, style]}>
      <Text style={textStyle}>{children}</Text>
    </View>
  );
};
