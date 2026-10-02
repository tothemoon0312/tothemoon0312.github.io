import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Typography, type ThemeColor, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ThemeColor;
};

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText style={[Typography[variant], { color: theme[color] }, style]} {...rest} />;
}
