'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log without exposing tokens or user data.
    console.error('Page error:', error.message);
  }, [error]);

  return (
    <div className="panel empty-state" style={{ marginTop: 'var(--space-6)' }}>
      <h1>Something went wrong</h1>
      <p>We couldn’t load this page. Your saved items are safe.</p>
      <button type="button" className="button button-secondary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
