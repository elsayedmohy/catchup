import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { radius, spacing, useTheme } from '../theme';
import { Button, TextField } from './ui';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? null;

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isLogin = mode === 'login';

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.replace('/(tabs)/inbox');
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        if (submitError.status === 401) setError('Invalid email or password.');
        else if (submitError.status === 409) setError('An account with that email already exists.');
        else setError(submitError.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={[styles.mark, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.accentText, fontWeight: '800' }}>C</Text>
          </View>
          <Text style={[styles.brand, { color: colors.text }]}>Catchup</Text>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.heading, { color: colors.text }]}>
            {isLogin ? 'Welcome back' : 'Create your library'}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>
            {isLogin
              ? 'Sign in to reach everything you saved.'
              : 'One place for every link you meant to come back to.'}
          </Text>
        </View>

        <View style={{ gap: spacing.lg }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="you@example.com"
            editable={!pending}
          />

          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType={isLogin ? 'password' : 'newPassword'}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            placeholder={isLogin ? '••••••••' : 'At least 8 characters'}
            editable={!pending}
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          {error ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 14 }}>
              {error}
            </Text>
          ) : null}

          <Button
            title={pending ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            onPress={submit}
            loading={pending}
            disabled={pending}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={{ color: colors.textMuted }}>
            {isLogin ? 'No account yet?' : 'Already have an account?'}
          </Text>
          <Text
            accessibilityRole="link"
            style={{ color: colors.accent, fontWeight: '600' }}
            onPress={() => router.replace(isLogin ? '/register' : '/login')}
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </Text>
        </View>

        {WEB_URL ? (
          <Text style={[styles.legal, { color: colors.textMuted }]}>
            By continuing you agree to the{' '}
            <Text
              accessibilityRole="link"
              style={{ color: colors.accent }}
              onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
            >
              terms
            </Text>{' '}
            and{' '}
            <Text
              accessibilityRole="link"
              style={{ color: colors.accent }}
              onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}
            >
              privacy policy
            </Text>
            .
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legal: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
