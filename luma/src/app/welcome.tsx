import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Spacing } from '@/constants/theme';

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="display" color="accentText">
          luma
        </Text>
        <Text variant="title">Tell me about you and your money.</Text>
        <Text color="textSecondary">
          No finance words needed. Just say it the way you’d say it to a friend, and we’ll find
          ideas that fit you.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Get started"
          onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'sign-up' } })}
        />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'sign-in' } })}
        />
        <Disclaimer />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  actions: {
    gap: Spacing.sm,
  },
});
