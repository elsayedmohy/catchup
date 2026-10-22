import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ItemsListResponse } from '@catchup/contracts';
import { ApiClientError, api } from '@/lib/api';
import { clearSessionToken, requireSessionToken } from '@/lib/session';
import { SaveForm } from '@/components/save-form';
import { SearchFilters } from '@/components/search-filters';
import { ItemRow } from '@/components/item-row';

export const metadata: Metadata = { title: 'Inbox' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 30;

function readParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

async function loadItems(
  token: string,
  params: { q?: string; source?: string; sort: 'asc' | 'desc'; archived: boolean; cursor?: string },
): Promise<ItemsListResponse> {
  return api.listItems(token, { ...params, limit: PAGE_SIZE });
}

export default async function InboxPage({ searchParams }: { searchParams: SearchParams }) {
  const token = await requireSessionToken();
  const sp = await searchParams;

  const q = readParam(sp.q);
  const source = readParam(sp.source);
  const cursor = readParam(sp.cursor);
  const sort = sp.sort === 'asc' ? 'asc' : 'desc';

  let data: ItemsListResponse | null = null;
  let loadError: string | null = null;

  try {
    data = await loadItems(token, { q, source, sort, archived: false, cursor });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      await clearSessionToken();
      redirect('/login');
    }
    loadError =
      error instanceof Error ? error.message : 'Could not load your library right now.';
  }

  const hasFilters = Boolean(q || source);
  const items = data?.items ?? [];

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <div className="stack-sm">
        <h1>Inbox</h1>
        <p className="muted">Everything you saved, newest first.</p>
      </div>

      <SaveForm />

      <Suspense fallback={<div className="skeleton" style={{ height: 48 }} />}>
        <SearchFilters />
      </Suspense>

      {loadError ? (
        <div className="panel stack-sm" role="alert">
          <h2>Couldn’t load your library</h2>
          <p className="muted">{loadError}</p>
          <div>
            <Link href="/inbox" className="button button-secondary">
              Try again
            </Link>
          </div>
        </div>
      ) : null}

      {!loadError && items.length === 0 ? (
        <div className="panel empty-state">
          {hasFilters ? (
            <>
              <h2>No matches</h2>
              <p>Nothing here matches those filters. Try a different search or source.</p>
              <Link href="/inbox" className="button button-secondary">
                Clear filters
              </Link>
            </>
          ) : cursor ? (
            <>
              <h2>You’ve reached the end</h2>
              <p>No more items on this page.</p>
              <Link href="/inbox" className="button button-secondary">
                Back to newest
              </Link>
            </>
          ) : (
            <>
              <h2>Your library is empty</h2>
              <p>Paste a link above, or use the share sheet on your phone to save something.</p>
            </>
          )}
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
                  pathname: '/inbox',
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
                  pathname: '/inbox',
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
