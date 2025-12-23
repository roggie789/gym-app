import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onClose?: () => void;
}

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  buttons,
  onClose,
}: CustomAlertProps) {
  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return Colors.success;
      case 'error':
        return Colors.danger;
      case 'warning':
        return Colors.warning;
      default:
        return Colors.primary;
    }
  };

  const defaultButtons = buttons || [
    {
      text: 'OK',
      onPress: () => onClose?.(),
      style: 'default' as const,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={[styles.header, { borderColor: getTypeColor() }]}>
            <Text style={styles.title}>{title.toUpperCase()}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>
          </View>
          <View style={styles.buttons}>
            {defaultButtons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isDestructive && styles.buttonDestructive,
                    isCancel && styles.buttonCancel,
                    !isDestructive && !isCancel && styles.buttonDefault,
                    index > 0 && styles.buttonSpacing,
                  ]}
                  onPress={() => {
                    button.onPress();
                    if (!button.onPress.toString().includes('onClose')) {
                      onClose?.();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isDestructive && styles.buttonTextDestructive,
                      isCancel && styles.buttonTextCancel,
                    ]}
                  >
                    {button.text.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.backgroundSecondary,
    padding: 20,
    borderBottomWidth: 3,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  content: {
    padding: 24,
    minHeight: 60,
  },
  message: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 48,
  },
  buttonDefault: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  buttonDestructive: {
    backgroundColor: Colors.danger,
    borderColor: Colors.textPrimary,
  },
  buttonCancel: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
  },
  buttonSpacing: {
    marginLeft: 0,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  buttonTextDestructive: {
    color: Colors.textPrimary,
  },
  buttonTextCancel: {
    color: Colors.textSecondary,
  },
});

