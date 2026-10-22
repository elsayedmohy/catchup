import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { isAuthenticated } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await isAuthenticated()) redirect('/inbox');
  return <AuthForm mode="login" />;
}
