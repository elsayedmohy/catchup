import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <article className="stack" style={{ gap: 'var(--space-4)', maxWidth: '68ch' }}>
      <div className="stack-sm">
        <Link href="/inbox" className="muted">
          ← Back
        </Link>
        <h1>Terms of use</h1>
        <p className="muted">Last updated 22 October 2026.</p>
      </div>

      <section className="panel stack-sm">
        <h2>Using Catchup</h2>
        <p>
          Catchup is a personal library for links you choose to save. You need an account to use it.
          Keep your credentials safe; you are responsible for activity under your account.
        </p>
      </section>

      <section className="panel stack-sm">
        <h2>Acceptable use</h2>
        <ul>
          <li>Do not use Catchup to store or distribute unlawful content.</li>
          <li>Do not attempt to access other people&apos;s accounts or saved items.</li>
          <li>Do not use the service to attack, scan, or overload other websites.</li>
        </ul>
      </section>

      <section className="panel stack-sm">
        <h2>Your content</h2>
        <p>
          You keep ownership of the links and notes you save. You grant the service only the
          permission needed to store them and show them back to you across your devices.
        </p>
      </section>

      <section className="panel stack-sm">
        <h2>Availability</h2>
        <p className="muted">
          This is a demonstration deployment provided as-is, without warranties. Features may change
          or be interrupted. Export or delete your data at any time from Settings.
        </p>
      </section>

      <section className="panel stack-sm">
        <h2>Ending use</h2>
        <p>
          You can stop using Catchup and delete your account at any time from Settings. Deletion
          removes your account and all saved items permanently.
        </p>
      </section>
    </article>
  );
}
