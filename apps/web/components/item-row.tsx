import Link from 'next/link';
import type { SavedItem } from '@catchup/contracts';
import { archiveItemAction, restoreItemAction } from '@/app/actions';
import { ConfirmSubmit } from './confirm-submit';
import { deleteItemAction } from '@/app/actions';

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function ItemRow({ item }: { item: SavedItem }) {
  const archived = item.archivedAt !== null;
  const displayTitle = item.title?.trim() || hostOf(item.originalUrl);
  const source = item.source ?? hostOf(item.originalUrl);

  return (
    <li className="item-row">
      <div className="item-thumb" aria-hidden="true">
        {item.imageUrl ? (
          // Plain <img>: previews come from arbitrary remote hosts, so the
          // Next image optimiser would need wildcard remote patterns.
          <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          source.slice(0, 2).toUpperCase()
        )}
      </div>

      <div className="item-main">
        <Link href={`/items/${item.id}`} className="item-title">
          {displayTitle}
        </Link>
        <span className="item-url" title={item.originalUrl}>
          {hostOf(item.originalUrl)}
        </span>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <span className="chip">{source}</span>
          <span className="muted">{dateFormatter.format(new Date(item.savedAt))}</span>
          {item.metadataStatus === 'Pending' ? (
            <span className="chip">Fetching details…</span>
          ) : null}
        </div>
      </div>

      <div className="row" style={{ gap: 'var(--space-1)' }}>
        <a
          className="button button-ghost"
          href={item.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${displayTitle} in a new tab`}
        >
          Open
        </a>

        <form action={archived ? restoreItemAction.bind(null, item.id) : archiveItemAction.bind(null, item.id)}>
          <button type="submit" className="button button-ghost">
            {archived ? 'Restore' : 'Archive'}
          </button>
        </form>

        <form action={deleteItemAction.bind(null, item.id)}>
          <ConfirmSubmit
            message="Delete permanently?"
            confirmLabel="Delete"
            className="button button-ghost"
            aria-label={`Delete ${displayTitle}`}
          >
            Delete
          </ConfirmSubmit>
        </form>
      </div>
    </li>
  );
}
