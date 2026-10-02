import { useState } from 'react';

import { Button } from '@/components/button';
import { Disclaimer } from '@/components/disclaimer';
import { Placeholder } from '@/components/placeholder';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }

  return (
    <Screen scroll>
      <Text variant="title">You</Text>
      <Text color="textSecondary">{session?.user.email}</Text>
      <Placeholder
        title="Your investor profile"
        body="After your first chat, this is where you'll see what luma heard: your amount, timeline, comfort with risk, and interests."
      />
      <Button label="Sign out" variant="secondary" loading={signingOut} onPress={handleSignOut} />
      <Disclaimer />
    </Screen>
  );
}
