import ToastLib, { type ToastShowParams } from 'react-native-toast-message';

type ToastOptions = {
  visibilityTime?: number;
};

export const showToast = {
  success: (title: string, message?: string, options?: ToastOptions) => {
    ToastLib.show({
      type: 'success',
      text1: title,
      text2: message,
      visibilityTime: options?.visibilityTime,
    });
  },

  error: (title: string, message?: string, options?: ToastOptions) => {
    ToastLib.show({
      type: 'error',
      text1: title,
      text2: message,
      visibilityTime: options?.visibilityTime ?? 4000,
    });
  },

  info: (title: string, message?: string, options?: ToastOptions) => {
    ToastLib.show({
      type: 'info',
      text1: title,
      text2: message,
      visibilityTime: options?.visibilityTime,
    });
  },

  warning: (title: string, message?: string, options?: ToastOptions) => {
    ToastLib.show({
      type: 'warning',
      text1: title,
      text2: message,
      visibilityTime: options?.visibilityTime ?? 4000,
    });
  },

  network: (title: string, message?: string, options?: ToastOptions) => {
    ToastLib.show({
      type: 'network',
      text1: title,
      text2: message,
      visibilityTime: options?.visibilityTime,
    });
  },

  show: (params: ToastShowParams) => {
    ToastLib.show(params);
  },

  hide: () => {
    ToastLib.hide();
  },
};
