import { ItemsScreen } from '@/src/components/ItemsScreen';
import { Screen } from '@/src/components/ui';

export default function InboxScreen() {
  return (
    <Screen>
      <ItemsScreen archived={false} />
    </Screen>
  );
}
