import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="panel empty-state" style={{ marginTop: 'var(--space-6)' }}>
      <h1>Not found</h1>
      <p>That page or saved item doesn’t exist, or it isn’t yours.</p>
      <Link href="/inbox" className="button button-secondary">
        Back to inbox
      </Link>
    </div>
  );
}
