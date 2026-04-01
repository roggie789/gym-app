import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import { Colors } from '../../constants/colors';

interface AvatarProps {
  children: React.ReactNode;
  className?: ViewStyle;
  style?: ViewStyle;
}

interface AvatarImageProps {
  src?: ImageSourcePropType;
  alt?: string;
  className?: ViewStyle;
  style?: ViewStyle;
}

interface AvatarFallbackProps {
  children: React.ReactNode;
  className?: ViewStyle;
  style?: ViewStyle;
}

export const Avatar = ({ children, className, style }: AvatarProps) => {
  return (
    <View style={[styles.avatar, className, style]}>
      {children}
    </View>
  );
};

export const AvatarImage = ({ src, alt, className, style }: AvatarImageProps) => {
  if (!src) return null;
  return (
    <Image
      source={src}
      style={[styles.image, className, style]}
      accessibilityLabel={alt}
    />
  );
};

export const AvatarFallback = ({ children, className, style }: AvatarFallbackProps) => {
  return (
    <View style={[styles.fallback, className, style]}>
      {typeof children === 'string' ? (
        <Text style={styles.fallbackText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    position: 'relative',
    height: 40,
    width: 40,
    borderRadius: 9999,
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    aspectRatio: 1,
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: Colors.secondaryLight,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
});
