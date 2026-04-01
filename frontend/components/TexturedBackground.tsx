import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

interface TexturedBackgroundProps {
  children: React.ReactNode;
}

export default function TexturedBackground({ children }: TexturedBackgroundProps) {
  // Matches the .roggie-grid CSS background:
  // radial-gradient(1000px 600px at 10% 0%, hsl(22 92% 54% / 0.20), transparent 60%)
  // radial-gradient(900px 700px at 90% 10%, hsl(35 92% 55% / 0.14), transparent 55%)
  // radial-gradient(800px 700px at 20% 100%, hsl(196 88% 47% / 0.09), transparent 50%)
  // linear-gradient(to bottom, hsl(240 10% 6%), hsl(240 10% 6%))

  return (
    <View style={styles.container}>
      {/* Base solid background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />

      {/* Top-left orange glow - hsl(22 92% 54% / 0.20) */}
      <LinearGradient
        colors={['rgba(249, 115, 22, 0.20)', 'rgba(249, 115, 22, 0.08)', 'transparent']}
        locations={[0, 0.35, 0.6]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.6, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top-right amber glow - hsl(35 92% 55% / 0.14) */}
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.14)', 'rgba(245, 158, 11, 0.05)', 'transparent']}
        locations={[0, 0.3, 0.55]}
        start={{ x: 0.9, y: 0.1 }}
        end={{ x: 0.4, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Bottom-left cyan glow - hsl(196 88% 47% / 0.09) */}
      <LinearGradient
        colors={['transparent', 'rgba(14, 165, 233, 0.09)', 'rgba(14, 165, 233, 0.04)', 'transparent']}
        locations={[0.3, 0.6, 0.8, 1]}
        start={{ x: 0.2, y: 0.5 }}
        end={{ x: 0.2, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
