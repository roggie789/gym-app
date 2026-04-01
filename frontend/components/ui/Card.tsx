import React from 'react';
import { View, Text, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { cn } from '../../utils/cn';
import { Colors } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: ViewStyle;
}

const Card = ({ children, style, className, ...props }: CardProps) => {
  return (
    <View
      style={[styles.card, className, style]}
      {...props}
    >
      {children}
    </View>
  );
};
Card.displayName = 'Card';

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: ViewStyle;
}

export const CardHeader = ({ children, style, className, ...props }: CardHeaderProps) => {
  return (
    <View
      style={[styles.cardHeader, className, style]}
      {...props}
    >
      {children}
    </View>
  );
};
CardHeader.displayName = 'CardHeader';

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
  className?: TextStyle;
}

export const CardTitle = ({ children, style, className, ...props }: CardTitleProps) => {
  return (
    <Text
      style={[styles.cardTitle, className, style]}
      {...props}
    >
      {children}
    </Text>
  );
};
CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
  className?: TextStyle;
}

export const CardDescription = ({ children, style, className, ...props }: CardDescriptionProps) => {
  return (
    <Text
      style={[styles.cardDescription, className, style]}
      {...props}
    >
      {children}
    </Text>
  );
};
CardDescription.displayName = 'CardDescription';

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: ViewStyle;
}

export const CardContent = ({ children, style, className, ...props }: CardContentProps) => {
  return (
    <View
      style={[styles.cardContent, className, style]}
      {...props}
    >
      {children}
    </View>
  );
};
CardContent.displayName = 'CardContent';

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: ViewStyle;
}

export const CardFooter = ({ children, style, className, ...props }: CardFooterProps) => {
  return (
    <View
      style={[styles.cardFooter, className, style]}
      {...props}
    >
      {children}
    </View>
  );
};
CardFooter.displayName = 'CardFooter';

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
  },
  cardHeader: {
    flexDirection: 'column',
    padding: 24,
    gap: 6,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  cardContent: {
    padding: 24,
    paddingTop: 0,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 0,
  },
});

export { Card };
