import { Placeholder } from '@/components/placeholder';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';

export default function SavesScreen() {
  return (
    <Screen scroll>
      <Text variant="title">Saves</Text>
      <Placeholder
        title="Nothing saved yet"
        body="Swipe right on an idea to save it. Your saves become your practice portfolio, with no real money involved."
      />
    </Screen>
  );
}
