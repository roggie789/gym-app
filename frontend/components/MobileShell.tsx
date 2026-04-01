import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MobileShellProps {
  children: React.ReactNode;
  noTabBar?: boolean;
  noTopPadding?: boolean;
}

export function MobileShell({ children, noTabBar, noTopPadding }: MobileShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      { paddingTop: noTopPadding ? 0 : insets.top + 8 },
      noTabBar && { paddingBottom: 16 },
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
});
