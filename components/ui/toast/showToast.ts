import ToastLib, { type ToastShowParams } from 'react-native-toast-message';

export const showToast = {
  success: (title: string, message?: string) => {
    ToastLib.show({
      type: 'success',
      text1: title,
      text2: message,
    });
  },

  error: (title: string, message?: string) => {
    ToastLib.show({
      type: 'error',
      text1: title,
      text2: message,
      visibilityTime: 4000,
    });
  },

  info: (title: string, message?: string) => {
    ToastLib.show({
      type: 'info',
      text1: title,
      text2: message,
    });
  },

  warning: (title: string, message?: string) => {
    ToastLib.show({
      type: 'warning',
      text1: title,
      text2: message,
      visibilityTime: 4000,
    });
  },

  network: (title: string, message?: string) => {
    ToastLib.show({
      type: 'network',
      text1: title,
      text2: message,
    });
  },

  show: (params: ToastShowParams) => {
    ToastLib.show(params);
  },

  hide: () => {
    ToastLib.hide();
  },
};
