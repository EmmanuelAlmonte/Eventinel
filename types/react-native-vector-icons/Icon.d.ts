declare module 'react-native-vector-icons/Icon' {
  import type * as React from 'react';
  import type {
    TextProps,
    TextStyle,
    ViewProps,
    TouchableHighlightProps,
  } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: TextStyle['color'];
  }

  export interface IconButtonProps
    extends IconProps,
      ViewProps,
      TouchableHighlightProps {
    iconStyle?: TextStyle;
    backgroundColor?: string;
    borderRadius?: number;
    style?: ViewProps['style'] | TextStyle;
  }

  const Icon: React.ComponentType<IconProps>;
  export default Icon;
}
