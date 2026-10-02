import { Colors, type ColorScheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useColorSchemeName(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useColorSchemeName()];
}
