export default function Loading() {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>
      <div className="skeleton" style={{ height: 36, width: '40%', maxWidth: 220 }} />
      <div className="skeleton" style={{ height: 48 }} />
      <div className="skeleton" style={{ height: 220 }} />
    </div>
  );
}
