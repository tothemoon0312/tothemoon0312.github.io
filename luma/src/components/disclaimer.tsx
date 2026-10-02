import { Text } from '@/components/text';

export const DISCLAIMER =
  'luma is an educational tool, not personalized investment advice. Investing involves risk, including losing money.';

export function Disclaimer() {
  return (
    <Text variant="caption" color="textSecondary" accessibilityRole="text">
      {DISCLAIMER}
    </Text>
  );
}
