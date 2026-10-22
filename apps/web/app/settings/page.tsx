import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiClientError, api } from '@/lib/api';
import { clearSessionToken, requireSessionToken } from '@/lib/session';
import { deleteAccountAction } from '@/app/actions';
import { ConfirmSubmit } from '@/components/confirm-submit';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'long' });

export default async function SettingsPage() {
  const token = await requireSessionToken();

  let user;
  try {
    user = await api.me(token);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      await clearSessionToken();
      redirect('/login');
    }
    throw error;
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <div className="stack-sm">
        <h1>Settings</h1>
        <p className="muted">Your account and data.</p>
      </div>

      <section className="panel stack-sm">
        <h2>Account</h2>
        <div className="spread">
          <span className="muted">Email</span>
          <span>{user.email}</span>
        </div>
        <div className="spread">
          <span className="muted">Member since</span>
          <span>{dateFormatter.format(new Date(user.createdAt))}</span>
        </div>
      </section>

      <section className="panel stack-sm">
        <h2>Delete account</h2>
        <p className="muted">
          This permanently removes your account and every saved item. It cannot be undone.
        </p>
        <form action={deleteAccountAction}>
          <ConfirmSubmit
            message="Deletes your account and all items."
            confirmLabel="Delete account"
            className="button button-danger"
          >
            Delete my account
          </ConfirmSubmit>
        </form>
      </section>

      <p className="muted">
        Read the <Link href="/privacy">privacy policy</Link> and{' '}
        <Link href="/terms">terms of use</Link>.
      </p>
    </div>
  );
}
