import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { isAuthenticated } from '@/lib/session';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage() {
  if (await isAuthenticated()) redirect('/inbox');
  return <AuthForm mode="register" />;
}
