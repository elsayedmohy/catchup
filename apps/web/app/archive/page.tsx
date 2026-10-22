import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ItemsListResponse } from '@catchup/contracts';
import { ApiClientError, api } from '@/lib/api';
import { clearSessionToken, requireSessionToken } from '@/lib/session';
import { ItemRow } from '@/components/item-row';

export const metadata: Metadata = { title: 'Archive' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 30;

function readParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

export default async function ArchivePage({ searchParams }: { searchParams: SearchParams }) {
  const token = await requireSessionToken();
  const sp = await searchParams;

  const q = readParam(sp.q);
  const source = readParam(sp.source);
  const cursor = readParam(sp.cursor);
  const sort = sp.sort === 'asc' ? 'asc' : 'desc';

  let data: ItemsListResponse | null = null;
  let loadError: string | null = null;

  try {
    data = await api.listItems(token, {
      q,
      source,
      sort,
      archived: true,
      cursor,
      limit: PAGE_SIZE,
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      await clearSessionToken();
      redirect('/login');
    }
    loadError =
      error instanceof Error ? error.message : 'Could not load your archive right now.';
  }

  const items = data?.items ?? [];

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <div className="stack-sm">
        <h1>Archive</h1>
        <p className="muted">Items you’ve set aside. Restore any of them to your inbox.</p>
      </div>

      {loadError ? (
        <div className="panel stack-sm" role="alert">
          <h2>Couldn’t load your archive</h2>
          <p className="muted">{loadError}</p>
          <div>
            <Link href="/archive" className="button button-secondary">
              Try again
            </Link>
          </div>
        </div>
      ) : null}

      {!loadError && items.length === 0 ? (
        <div className="panel empty-state">
          <h2>Nothing archived</h2>
          <p>Items you archive from your inbox will appear here.</p>
          <Link href="/inbox" className="button button-secondary">
            Go to inbox
          </Link>
        </div>
      ) : null}

      {items.length > 0 ? (
        <section className="panel" style={{ padding: 'var(--space-2) var(--space-3)' }}>
          <ul className="item-list">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ) : null}

      {data ? (
        <nav className="spread" aria-label="Pagination">
          <span className="muted">
            {items.length} {items.length === 1 ? 'item' : 'items'} on this page
          </span>
          <div className="row">
            {cursor ? (
              <Link
                href={{
                  pathname: '/archive',
                  query: { ...(q ? { q } : {}), ...(source ? { source } : {}), ...(sort !== 'desc' ? { sort } : {}) },
                }}
                className="button button-secondary"
              >
                ← Newest
              </Link>
            ) : null}
            {data.hasMore && data.nextCursor ? (
              <Link
                href={{
                  pathname: '/archive',
                  query: {
                    ...(q ? { q } : {}),
                    ...(source ? { source } : {}),
                    ...(sort !== 'desc' ? { sort } : {}),
                    cursor: data.nextCursor,
                  },
                }}
                className="button button-secondary"
              >
                Older →
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
