import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SavedItem } from '@catchup/contracts';
import { radius, spacing, useTheme } from '../theme';
import { Chip } from './ui';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function ItemCard({
  item,
  onPress,
  right,
}: {
  item: SavedItem;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const host = hostOf(item.originalUrl);
  const title = item.title?.trim() || host;
  const source = item.source ?? host;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Saved ${dateFormatter.format(new Date(item.savedAt))}.`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[styles.thumb, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumbImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 12 }}>
            {source.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>

      <View style={styles.main}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.host, { color: colors.textMuted }]}>
          {host}
        </Text>
        <View style={styles.meta}>
          <Chip label={source} />
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {dateFormatter.format(new Date(item.savedAt))}
          </Text>
        </View>
      </View>

      {right ? <View>{right}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  host: {
    fontSize: 13,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
});
