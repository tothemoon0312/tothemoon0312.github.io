import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PlaceholderProps = {
  title: string;
  body: string;
};

/** Empty-state card for screens whose milestone hasn't been built yet. */
export function Placeholder({ title, body }: PlaceholderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text variant="heading">{title}</Text>
      <Text color="textSecondary">{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
});
