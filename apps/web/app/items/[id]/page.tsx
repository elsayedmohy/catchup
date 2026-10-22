import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiClientError, api } from '@/lib/api';
import { clearSessionToken, requireSessionToken } from '@/lib/session';
import { archiveItemAction, deleteItemAction, restoreItemAction } from '@/app/actions';
import { ConfirmSubmit } from '@/components/confirm-submit';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const dateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'long',
  timeStyle: 'short',
});

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const metadataLabels: Record<string, string> = {
  Pending: 'Fetching details…',
  Success: 'Details loaded',
  Skipped: 'No preview available',
  Failed: 'Preview unavailable',
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const token = await requireSessionToken();
  const { id } = await params;

  try {
    const item = await api.getItem(token, id);
    return { title: item.title ?? hostOf(item.originalUrl) };
  } catch {
    return { title: 'Saved item' };
  }
}

export default async function ItemDetailPage({ params }: { params: Params }) {
  const token = await requireSessionToken();
  const { id } = await params;

  let item;
  try {
    item = await api.getItem(token, id);
  } catch (error) {
    if (error instanceof ApiClientError) {
      if (error.status === 401) {
        await clearSessionToken();
        redirect('/login');
      }
      if (error.status === 404) {
        notFound();
      }
    }
    throw error;
  }

  const archived = item.archivedAt !== null;
  const displayTitle = item.title?.trim() || hostOf(item.originalUrl);

  return (
    <article className="stack" style={{ gap: 'var(--space-5)' }}>
      <div className="stack-sm">
        <Link href="/inbox" className="muted">
          ← Back to inbox
        </Link>
        <h1>{displayTitle}</h1>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          {item.source ? <span className="chip">{item.source}</span> : null}
          <span className="chip">{hostOf(item.originalUrl)}</span>
          {archived ? <span className="chip">Archived</span> : null}
        </div>
      </div>

      {item.imageUrl ? (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Plain <img>: arbitrary remote hosts, so no Next image domain config. */}
          <img
            src={item.imageUrl}
            alt=""
            style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 360, objectFit: 'cover' }}
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      {item.description ? <p style={{ margin: 0 }}>{item.description}</p> : null}

      <div className="panel stack-sm">
        <div className="spread">
          <span className="muted">Original link</span>
          <a
            href={item.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ overflowWrap: 'anywhere' }}
          >
            {item.originalUrl}
          </a>
        </div>
        <div className="spread">
          <span className="muted">Saved</span>
          <span>{dateFormatter.format(new Date(item.savedAt))}</span>
        </div>
        {item.archivedAt ? (
          <div className="spread">
            <span className="muted">Archived</span>
            <span>{dateFormatter.format(new Date(item.archivedAt))}</span>
          </div>
        ) : null}
        <div className="spread">
          <span className="muted">Preview</span>
          <span>{metadataLabels[item.metadataStatus] ?? item.metadataStatus}</span>
        </div>
      </div>

      <div className="row">
        <a
          href={item.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-primary"
        >
          Open original
        </a>

        <form action={archived ? restoreItemAction.bind(null, item.id) : archiveItemAction.bind(null, item.id)}>
          <button type="submit" className="button button-secondary">
            {archived ? 'Restore to inbox' : 'Archive'}
          </button>
        </form>

        <form action={deleteItemAction.bind(null, item.id)}>
          <ConfirmSubmit
            message="Delete permanently?"
            confirmLabel="Delete"
            className="button button-danger"
          >
            Delete
          </ConfirmSubmit>
        </form>
      </div>
    </article>
  );
}
