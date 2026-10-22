import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '@/src/api';
import { useAuth } from '@/src/auth';
import { Screen } from '@/src/components/ui';
import { radius, spacing, useTheme, type ThemePreference } from '@/src/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? null;

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Match system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const { user, signOut, removeAccount } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const createdAt = user?.createdAt ? dateFormatter.format(new Date(user.createdAt)) : null;

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account and every saved item. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await removeAccount();
              router.replace('/login');
            } catch (error) {
              Alert.alert(
                'Could not delete account',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: colors.text }]}>Settings</Text>

        <View
          style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.panelTitle, { color: colors.text }]}>Account</Text>
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Member since" value={createdAt ?? '—'} />
        </View>

        <View
          style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.panelTitle, { color: colors.text }]}>Appearance</Text>
          {THEME_OPTIONS.map((option) => {
            const active = preference === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setPreference(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Theme: ${option.label}`}
                style={styles.row}
              >
                <Text style={{ color: colors.text, fontSize: 15 }}>{option.label}</Text>
                {active ? <Text style={{ color: colors.accent, fontWeight: '700' }}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={confirmSignOut}
          accessibilityRole="button"
          style={[
            styles.actionRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Sign out</Text>
        </Pressable>

        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityState={{ disabled: deleting, busy: deleting }}
          style={[
            styles.actionRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.danger,
              opacity: deleting ? 0.5 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '600' }}>
            {deleting ? 'Deleting…' : 'Delete account'}
          </Text>
        </Pressable>

        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          Items you save stay private to your account. Deleting the account removes them
          permanently.
        </Text>

        {WEB_URL ? (
          <Text style={[styles.footnote, { color: colors.textMuted }]}>
            <Text
              accessibilityRole="link"
              style={{ color: colors.accent }}
              onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}
            >
              Privacy policy
            </Text>
            {'  ·  '}
            <Text
              accessibilityRole="link"
              style={{ color: colors.accent }}
              onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
            >
              Terms of use
            </Text>
          </Text>
        ) : null}

        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          Catchup 1.0.0{'\n'}
          Server: {API_BASE_URL}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.textMuted, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  panel: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 32,
  },
  actionRow: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 52,
    justifyContent: 'center',
  },
  footnote: {
    fontSize: 13,
    lineHeight: 19,
  },
});
