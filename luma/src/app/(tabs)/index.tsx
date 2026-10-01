import { Disclaimer } from '@/components/disclaimer';
import { Placeholder } from '@/components/placeholder';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';

export default function FeedScreen() {
  return (
    <Screen scroll>
      <Text variant="title">For you</Text>
      <Placeholder
        title="Let's get to know you first"
        body="Soon you'll chat with luma about your money and what you're into. Then ideas that fit you will show up here as cards you can swipe."
      />
      <Disclaimer />
    </Screen>
  );
}
