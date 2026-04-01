import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
  className?: ViewStyle;
  testID?: string;
}

export const Checkbox = ({ checked = false, onCheckedChange, disabled = false, style, className, testID }: CheckboxProps) => {
  const handlePress = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.checkbox,
        checked && styles.checkboxChecked,
        disabled && styles.checkboxDisabled,
        className,
        style,
      ]}
      testID={testID}
    >
      {checked && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );
};
Checkbox.displayName = 'Checkbox';

const styles = StyleSheet.create({
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
