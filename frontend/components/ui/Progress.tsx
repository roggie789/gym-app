import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface ProgressProps {
  value?: number;
  className?: ViewStyle;
  style?: ViewStyle;
  testID?: string;
}

export const Progress = ({ value = 0, className, style, testID }: ProgressProps) => {
  const percentage = Math.min(Math.max(value || 0, 0), 100);

  return (
    <View
      testID={testID}
      style={[styles.track, className, style]}
    >
      <View
        style={[
          styles.fill,
          { width: `${percentage}%` },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 12,
    width: '100%',
    borderRadius: 9999,
    backgroundColor: `${Colors.primary}33`, // primary with 20% opacity
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 9999,
  },
});
