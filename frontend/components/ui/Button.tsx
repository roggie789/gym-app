import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { cn } from '../../utils/cn';
import { Colors } from '../../constants/colors';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  className?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const buttonStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
  },
  default: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  destructive: {
    backgroundColor: Colors.danger,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondary: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  sizeDefault: {
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sizeSm: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sizeLg: {
    minHeight: 40,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sizeIcon: {
    height: 36,
    width: 36,
    padding: 0,
  },
  textBase: {
    fontSize: 14,
    fontWeight: '500',
  },
  textDefault: {
    color: Colors.textPrimary,
  },
  textDestructive: {
    color: Colors.textPrimary,
  },
  textOutline: {
    color: Colors.textPrimary,
  },
  textSecondary: {
    color: Colors.textPrimary,
  },
  textGhost: {
    color: Colors.textPrimary,
  },
  textLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  textSizeSm: {
    fontSize: 12,
  },
  disabled: {
    opacity: 0.5,
  },
});

export const Button = ({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  style,
  className,
  textStyle,
  testID,
  ...props
}: ButtonProps) => {
    const buttonStyle = [
      buttonStyles.base,
      buttonStyles[variant],
      buttonStyles[`size${size.charAt(0).toUpperCase() + size.slice(1)}` as 'sizeDefault' | 'sizeSm' | 'sizeLg' | 'sizeIcon'],
      disabled && buttonStyles.disabled,
      className,
      style,
    ];

    const textStyles = [
      buttonStyles.textBase,
      buttonStyles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as 'textDefault' | 'textDestructive' | 'textOutline' | 'textSecondary' | 'textGhost' | 'textLink'],
      size === 'sm' && buttonStyles.textSizeSm,
      textStyle,
    ];

  if (variant === 'link') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={buttonStyle}
        testID={testID}
        {...props}
      >
        <Text style={textStyles}>{children}</Text>
      </TouchableOpacity>
    );
  }

  const wrappedChildren =
    typeof children === 'string' || typeof children === 'number' ? (
      <Text style={textStyles}>{children}</Text>
    ) : (
      React.Children.map(children, (child, index) =>
        typeof child === 'string' || typeof child === 'number' ? (
          <Text style={textStyles} key={`btn-txt-${index}`}>
            {child}
          </Text>
        ) : (
          child
        )
      )
    );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={buttonStyle}
      activeOpacity={0.7}
      testID={testID}
      {...props}
    >
      {wrappedChildren}
    </TouchableOpacity>
  );
};
Button.displayName = 'Button';
