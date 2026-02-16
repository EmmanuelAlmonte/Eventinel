/**
 * Toast provider + helper exports.
 */

import React from 'react';
import ToastLib from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastConfig } from './toast/toastConfig';
import { showToast } from './toast/showToast';

export { useToastConfig } from './toast/toastConfig';
export { showToast } from './toast/showToast';

export function ToastProvider() {
  const config = useToastConfig();
  const insets = useSafeAreaInsets();
  const topOffset = insets.top + 16;

  return (
    <ToastLib
      config={config}
      position="top"
      topOffset={topOffset}
      visibilityTime={3000}
    />
  );
}

export default ToastProvider;
