import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Colors } from '../constants/colors';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return ctx;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({ title: '' });

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const handlePress = useCallback(
    (button?: AlertButton) => {
      setVisible(false);
      // Small delay so the modal closes before callback runs
      if (button?.onPress) {
        setTimeout(button.onPress, 150);
      }
    },
    []
  );

  // If no buttons provided, show a single OK button
  const buttons: AlertButton[] =
    options.buttons && options.buttons.length > 0
      ? options.buttons
      : [{ text: 'OK', style: 'default' }];

  const isError =
    options.title.toLowerCase().includes('error') ||
    options.title.toLowerCase().includes('failed');
  const isSuccess = options.title.toLowerCase().includes('success');

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.container}>
                {/* Accent bar */}
                <View
                  style={[
                    styles.accentBar,
                    isError && styles.accentBarError,
                    isSuccess && styles.accentBarSuccess,
                  ]}
                />

                <View style={styles.body}>
                  <Text style={styles.title}>{options.title.toUpperCase()}</Text>
                  {options.message ? (
                    <Text style={styles.message}>{options.message}</Text>
                  ) : null}

                  <View
                    style={[
                      styles.buttonRow,
                      buttons.length === 1 && styles.buttonRowSingle,
                    ]}
                  >
                    {buttons.map((btn, i) => {
                      const isCancel = btn.style === 'cancel';
                      const isDestructive = btn.style === 'destructive';
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.button,
                            isCancel && styles.buttonCancel,
                            isDestructive && styles.buttonDestructive,
                            !isCancel && !isDestructive && styles.buttonDefault,
                            buttons.length === 1 && styles.buttonFull,
                          ]}
                          onPress={() => handlePress(btn)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.buttonText,
                              isCancel && styles.buttonTextCancel,
                            ]}
                          >
                            {btn.text.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  accentBar: {
    height: 3,
    backgroundColor: Colors.primary,
  },
  accentBarError: {
    backgroundColor: Colors.danger,
  },
  accentBarSuccess: {
    backgroundColor: Colors.success,
  },
  body: {
    padding: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  buttonRowSingle: {
    justifyContent: 'flex-end',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    flex: 0,
    paddingHorizontal: 32,
  },
  buttonDefault: {
    backgroundColor: Colors.primary,
  },
  buttonCancel: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonDestructive: {
    backgroundColor: Colors.danger,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  buttonTextCancel: {
    color: Colors.textSecondary,
  },
});
