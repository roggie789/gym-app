import React from 'react';
import { TextInput, TextInputProps, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { cn } from '../../utils/cn';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  className?: ViewStyle | TextStyle;
  style?: ViewStyle | TextStyle;
}

const Input = ({ className, style, ...props }: InputProps) => {
  return (
    <TextInput
      style={[styles.input, className, style]}
      placeholderTextColor={Colors.textMuted}
      {...props}
    />
  );
};
Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    height: 36,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '400',
  },
});

export { Input };
