import { Redirect } from 'expo-router';
import { AuthForm } from '@/src/components/AuthForm';
import { useAuth } from '@/src/auth';

export default function LoginScreen() {
  const { token, loading } = useAuth();
  if (!loading && token) return <Redirect href="/(tabs)/inbox" />;
  return <AuthForm mode="login" />;
}
