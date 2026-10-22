'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { KNOWN_SOURCES } from '@/lib/api';

export function SearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const q = searchParams.get('q') ?? '';
  const source = searchParams.get('source') ?? '';
  const sort = searchParams.get('sort') ?? 'desc';

  function submit() {
    const data = new FormData(formRef.current!);
    const params = new URLSearchParams();

    const query = String(data.get('q') ?? '').trim();
    const sourceValue = String(data.get('source') ?? '');
    const sortValue = String(data.get('sort') ?? 'desc');

    if (query) params.set('q', query);
    if (sourceValue) params.set('source', sourceValue);
    if (sortValue !== 'desc') params.set('sort', sortValue);

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function reset() {
    router.push(pathname);
  }

  const hasFilters = Boolean(q || source || sort !== 'desc');

  return (
    <form
      ref={formRef}
      className="row"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="field" style={{ flex: '1 1 220px' }}>
        <label htmlFor="q" className="visually-hidden">
          Search by title or URL
        </label>
        <input
          id="q"
          name="q"
          type="search"
          className="input"
          placeholder="Search title or URL…"
          defaultValue={q}
        />
      </div>

      <div className="field" style={{ flex: '0 0 auto' }}>
        <label htmlFor="source" className="visually-hidden">
          Filter by source
        </label>
        <select
          id="source"
          name="source"
          className="select"
          defaultValue={source}
          onChange={submit}
          style={{ width: 'auto' }}
        >
          <option value="">All sources</option>
          {KNOWN_SOURCES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="field" style={{ flex: '0 0 auto' }}>
        <label htmlFor="sort" className="visually-hidden">
          Sort order
        </label>
        <select
          id="sort"
          name="sort"
          className="select"
          defaultValue={sort}
          onChange={submit}
          style={{ width: 'auto' }}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      <button type="submit" className="button button-secondary">
        Search
      </button>

      {hasFilters ? (
        <button type="button" className="button button-ghost" onClick={reset}>
          Clear
        </button>
      ) : null}
    </form>
  );
}
