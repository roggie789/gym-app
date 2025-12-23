import React, { useState, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title?: string;
  message: string;
  buttons?: AlertButton[];
  type?: 'success' | 'error' | 'warning' | 'info';
}

// Global alert state
let alertState: {
  show: (options: AlertOptions) => void;
  hide: () => void;
} | null = null;

export function setAlertRef(ref: typeof alertState) {
  alertState = ref;
}

export function alert(titleOrOptions: string | AlertOptions, message?: string, buttons?: AlertButton[]) {
  if (alertState) {
    if (typeof titleOrOptions === 'string') {
      alertState.show({
        title: titleOrOptions,
        message: message || '',
        buttons,
      });
    } else {
      alertState.show(titleOrOptions);
    }
  }
}

// Hook to use custom alert in components
export function useCustomAlert() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertOptions>({
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertConfig({
      title: options.title || 'Alert',
      message: options.message,
      type: options.type || 'info',
      buttons: options.buttons,
    });
    setAlertVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertVisible(false);
  }, []);

  const AlertComponent = (
    <CustomAlert
      visible={alertVisible}
      title={alertConfig.title || 'Alert'}
      message={alertConfig.message}
      type={alertConfig.type}
      buttons={alertConfig.buttons?.map((btn) => ({
        text: btn.text,
        onPress: btn.onPress || (() => {}),
        style: btn.style,
      }))}
      onClose={hideAlert}
    />
  );

  return { showAlert, hideAlert, AlertComponent };
}

