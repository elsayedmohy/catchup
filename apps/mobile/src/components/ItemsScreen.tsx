import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError, api } from '../api';
import { useAuth } from '../auth';
import { spacing, radius, useTheme } from '../theme';
import { useItems } from '../useItems';
import { ItemCard } from './ItemCard';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { Button } from './ui';

const KNOWN_SOURCES = [
  'Instagram',
  'TikTok',
  'Facebook',
  'YouTube',
  'X',
  'Reddit',
  'LinkedIn',
  'Pinterest',
  'Medium',
  'Substack',
  'Hacker News',
  'Threads',
  'Telegram',
  'WhatsApp',
  'Spotify',
  'GitHub',
  'Stack Overflow',
];

export function ItemsScreen({ archived }: { archived: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { token } = useAuth();
  const list = useItems({ archived });

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveUrl, setSaveUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function quickSave() {
    if (!token) return;
    const url = saveUrl.trim();

    if (!/^https?:\/\/\S+$/i.test(url)) {
      setSaveError('Enter a link starting with http:// or https://');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await api.createItem(token, url);
      setSaveUrl('');
      setSaveOpen(false);
      Keyboard.dismiss();
      await list.refresh();
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError ? caught.message : 'Could not save that link. Try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (list.loading) {
    return <LoadingState label={archived ? 'Loading archive…' : 'Loading your library…'} />;
  }

  if (list.error && list.items.length === 0) {
    return <ErrorState message={list.error} onRetry={list.retry} />;
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: colors.text }]}>
            {archived ? 'Archive' : 'Inbox'}
          </Text>
          {!archived ? (
            <Button
              title={saveOpen ? 'Close' : '+ Link'}
              variant="secondary"
              onPress={() => {
                setSaveOpen((open) => !open);
                setSaveError(null);
              }}
              accessibilityLabel={saveOpen ? 'Close quick save' : 'Save a link manually'}
            />
          ) : null}
        </View>

        <Text style={{ color: colors.textMuted }}>
          {archived
            ? 'Items you set aside. Restore them to your inbox anytime.'
            : list.sort === 'desc'
              ? 'Everything you saved, newest first.'
              : 'Everything you saved, oldest first.'}
        </Text>

        {saveOpen ? (
          <View style={styles.saveBox}>
            <TextInput
              value={saveUrl}
              onChangeText={setSaveUrl}
              placeholder="Paste a link to save…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel="Link to save"
              style={[
                styles.search,
                {
                  backgroundColor: colors.surface,
                  borderColor: saveError ? colors.danger : colors.border,
                  color: colors.text,
                },
              ]}
            />
            {saveError ? (
              <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>
                {saveError}
              </Text>
            ) : null}
            <Button
              title="Save link"
              onPress={quickSave}
              loading={saving}
              disabled={saving || !saveUrl.trim()}
            />
          </View>
        ) : null}

        <View style={styles.searchRow}>
          <TextInput
            value={list.query}
            onChangeText={list.setQuery}
            placeholder="Search title or URL…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search saved items"
            style={[
              styles.search,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
                flex: 1,
              },
            ]}
          />
          {list.busy ? <ActivityIndicator color={colors.accent} /> : null}
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => list.setSort(list.sort === 'desc' ? 'asc' : 'desc')}
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${list.sort === 'desc' ? 'newest first' : 'oldest first'}`}
            style={[
              styles.chip,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
              {list.sort === 'desc' ? 'Newest first' : 'Oldest first'}
            </Text>
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
            keyboardShouldPersistTaps="handled"
          >
            <SourceChip
              label="All sources"
              active={list.source === null}
              onPress={() => list.setSource(null)}
            />
            {KNOWN_SOURCES.map((source) => (
              <SourceChip
                key={source}
                label={source}
                active={list.source === source}
                onPress={() => list.setSource(list.source === source ? null : source)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {list.error ? (
        <View style={styles.inlineError}>
          <Text style={{ color: colors.danger, flex: 1 }}>{list.error}</Text>
          <Pressable onPress={list.retry} accessibilityRole="button">
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={list.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={list.refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            title={archived ? 'Nothing archived' : 'Your library is empty'}
            body={
              archived
                ? 'Items you archive from your inbox will appear here.'
                : 'Share a link from any app using the share sheet, or paste one with “+ Link”.'
            }
          />
        }
        ListFooterComponent={
          list.loadingMore ? (
            <View style={{ paddingVertical: spacing.lg }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function SourceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}`}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.accent : colors.surfaceMuted,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.accentText : colors.textMuted,
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  filterRow: {
    gap: spacing.sm,
  },
  chipScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  saveBox: {
    gap: spacing.sm,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
});
