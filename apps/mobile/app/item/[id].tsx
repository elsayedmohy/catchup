import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SavedItem } from '@catchup/contracts';
import { ApiError, api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { ErrorState, LoadingState } from '@/src/components/StateViews';
import { Button, Chip, Divider, Screen } from '@/src/components/ui';
import { radius, spacing, useTheme } from '@/src/theme';
import { hostOf } from '@/src/components/ItemCard';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'long',
  timeStyle: 'short',
});

const metadataLabels: Record<string, string> = {
  Pending: 'Fetching details…',
  Success: 'Details loaded',
  Skipped: 'No preview available',
  Failed: 'Preview unavailable',
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, clearSession } = useAuth();
  const { colors } = useTheme();

  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setError(null);
    setNotFound(false);

    try {
      const result = await api.getItem(token, id);
      setItem(result);
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 401) {
          await clearSession();
          router.replace('/login');
          return;
        }
        if (caught.status === 404) {
          setNotFound(true);
          return;
        }
        setError(caught.message);
        return;
      }
      setError(caught instanceof Error ? caught.message : 'Could not load this item.');
    } finally {
      setLoading(false);
    }
  }, [token, id, clearSession, router]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  async function toggleArchive() {
    if (!token || !item) return;
    setWorking(true);
    try {
      const updated = item.archivedAt
        ? await api.restoreItem(token, item.id)
        : await api.archiveItem(token, item.id);
      setItem(updated);
    } catch (caught) {
      Alert.alert(
        'Could not update',
        caught instanceof Error ? caught.message : 'Please try again.',
      );
    } finally {
      setWorking(false);
    }
  }

  function confirmDelete() {
    if (!token || !item) return;

    Alert.alert('Delete this item?', 'It will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try {
            await api.deleteItem(token, item.id);
            router.back();
          } catch (caught) {
            Alert.alert(
              'Could not delete',
              caught instanceof Error ? caught.message : 'Please try again.',
            );
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingState label="Loading item…" />;

  if (notFound) {
    return (
      <ErrorState
        message="That saved item doesn’t exist, or it isn’t yours."
        onRetry={() => router.back()}
      />
    );
  }

  if (error || !item) {
    return <ErrorState message={error ?? 'Could not load this item.'} onRetry={load} />;
  }

  const archived = item.archivedAt !== null;
  const title = item.title?.trim() || hostOf(item.originalUrl);

  return (
    <Screen style={{ paddingTop: 0 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <View style={styles.chips}>
            {item.source ? <Chip label={item.source} /> : null}
            <Chip label={hostOf(item.originalUrl)} />
            {archived ? <Chip label="Archived" /> : null}
          </View>
        </View>

        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.image, { backgroundColor: colors.surfaceMuted }]}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        {item.description ? (
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
            {item.description}
          </Text>
        ) : null}

        <View
          style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.row}>
            <Text style={{ color: colors.textMuted }}>Original link</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(item.originalUrl).catch(() => {})}
              style={{ flexShrink: 1 }}
            >
              <Text style={{ color: colors.accent, textAlign: 'right' }} numberOfLines={2}>
                {item.originalUrl}
              </Text>
            </Pressable>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={{ color: colors.textMuted }}>Saved</Text>
            <Text style={{ color: colors.text }}>
              {dateFormatter.format(new Date(item.savedAt))}
            </Text>
          </View>
          {item.archivedAt ? (
            <>
              <Divider />
              <View style={styles.row}>
                <Text style={{ color: colors.textMuted }}>Archived</Text>
                <Text style={{ color: colors.text }}>
                  {dateFormatter.format(new Date(item.archivedAt))}
                </Text>
              </View>
            </>
          ) : null}
          <Divider />
          <View style={styles.row}>
            <Text style={{ color: colors.textMuted }}>Preview</Text>
            <Text style={{ color: colors.text }}>
              {metadataLabels[item.metadataStatus] ?? item.metadataStatus}
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            title="Open original"
            onPress={() => Linking.openURL(item.originalUrl).catch(() => {})}
          />
          <Button
            title={archived ? 'Restore to inbox' : 'Archive'}
            variant="secondary"
            onPress={toggleArchive}
            loading={working}
            disabled={working}
          />
          <Button title="Delete" variant="danger" onPress={confirmDelete} disabled={working} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
  },
  panel: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
