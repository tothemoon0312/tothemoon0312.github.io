import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'sign-in' ? 'sign-in' : 'sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';
  const canSubmit = email.trim().length > 0 && password.length >= 8;

  async function handleSubmit() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const credentials = { email: email.trim(), password };
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp(credentials);
        if (error) throw error;
        // With email confirmation on, Supabase returns a user but no session yet.
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setError(
        /fetch|network/i.test(message)
          ? 'We couldn’t reach luma. Check your connection and try again.'
          : message || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <Button label="Back" variant="ghost" style={styles.back} onPress={() => router.back()} />

        <View style={styles.header}>
          <Text variant="title">{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
          <Text color="textSecondary">
            {isSignUp
              ? 'Your profile and saved ideas stay private to you.'
              : 'Sign in to pick up where you left off.'}
          </Text>
        </View>

        {!isSupabaseConfigured && (
          <Text color="danger">
            Supabase isn’t configured. Copy .env.example to .env and add your project’s URL and
            anon key.
          </Text>
        )}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@school.edu"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          textContentType={isSignUp ? 'newPassword' : 'password'}
          placeholder="At least 8 characters"
        />

        {error && <Text color="danger">{error}</Text>}
        {notice && <Text color="success">{notice}</Text>}

        <Button
          label={isSignUp ? 'Create account' : 'Sign in'}
          loading={loading}
          disabled={!canSubmit}
          onPress={handleSubmit}
        />
        <Button
          label={isSignUp ? 'I already have an account' : "I'm new here"}
          variant="ghost"
          onPress={() => {
            setMode(isSignUp ? 'sign-in' : 'sign-up');
            setError(null);
            setNotice(null);
          }}
        />

        <Disclaimer />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  back: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
  },
  header: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
});
