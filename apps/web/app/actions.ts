'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiClientError, api } from '@/lib/api';
import { clearSessionToken, getSessionToken, setSessionToken } from '@/lib/session';

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

function toState(error: unknown): ActionState {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR' && error.details) {
      return {
        error: 'Please fix the highlighted fields.',
        fieldErrors: error.details,
      };
    }
    if (error.status === 409) {
      return { error: 'An account with that email already exists.' };
    }
    if (error.status === 401) {
      return { error: 'Invalid email or password.' };
    }
    if (error.status === 400) {
      return { error: error.message };
    }
    return { error: error.message };
  }

  return { error: 'Something went wrong. Please try again.' };
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  try {
    const result = await api.register(email, password);
    await setSessionToken(result.accessToken);
  } catch (error) {
    return toState(error);
  }

  redirect('/inbox');
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  try {
    const result = await api.login(email, password);
    await setSessionToken(result.accessToken);
  } catch (error) {
    return toState(error);
  }

  redirect('/inbox');
}

export async function logoutAction(): Promise<void> {
  await clearSessionToken();
  redirect('/login');
}

export async function createItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  const url = String(formData.get('url') ?? '').trim();
  if (!url) {
    return { error: 'Paste a link to save it.' };
  }

  try {
    await api.createItem(token, url);
  } catch (error) {
    return toState(error);
  }

  revalidatePath('/inbox');
  return { success: true };
}

export async function archiveItemAction(id: string): Promise<void> {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  try {
    await api.archiveItem(token, id);
  } finally {
    revalidatePath('/inbox');
    revalidatePath('/archive');
    revalidatePath(`/items/${id}`);
  }
}

export async function restoreItemAction(id: string): Promise<void> {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  try {
    await api.restoreItem(token, id);
  } finally {
    revalidatePath('/inbox');
    revalidatePath('/archive');
    revalidatePath(`/items/${id}`);
  }
}

export async function deleteItemAction(id: string): Promise<void> {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  try {
    await api.deleteItem(token, id);
  } finally {
    revalidatePath('/inbox');
    revalidatePath('/archive');
  }

  redirect('/inbox');
}

export async function deleteAccountAction(): Promise<void> {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  try {
    await api.deleteAccount(token);
  } finally {
    await clearSessionToken();
  }

  redirect('/login');
}
