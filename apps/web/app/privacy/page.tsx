import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <article className="stack" style={{ gap: 'var(--space-4)', maxWidth: '68ch' }}>
      <div className="stack-sm">
        <Link href="/inbox" className="muted">
          ← Back
        </Link>
        <h1>Privacy policy</h1>
        <p className="muted">Last updated 22 October 2026.</p>
      </div>

      <section className="panel stack-sm">
        <h2>What Catchup stores</h2>
        <ul>
          <li>Your email address and a BCrypt hash of your password (never the password itself).</li>
          <li>The URLs you save, their normalised form, and timestamps for saving and archiving.</li>
          <li>
            Preview metadata fetched from the page you saved: title, description, preview image URL
            and source name.
          </li>
        </ul>
      </section>

      <section className="panel stack-sm">
        <h2>What Catchup does not do</h2>
        <ul>
          <li>No third-party analytics, advertising, or tracking scripts.</li>
          <li>No selling or sharing of your data with advertisers.</li>
          <li>No access to the private content of accounts you share links from.</li>
        </ul>
      </section>

      <section className="panel stack-sm">
        <h2>How saving works</h2>
        <p>
          When you save a link, the server fetches that page once to read its public preview
          metadata. The request is limited to public web addresses, has a short timeout, and a
          size cap. If the page cannot be read, the link is still saved.
        </p>
      </section>

      <section className="panel stack-sm">
        <h2>Cookies and sessions</h2>
        <p>
          The web app sets one HttpOnly session cookie holding a short-lived access token. It keeps
          you signed in and is removed when you sign out or after it expires. The mobile app stores
          its token in the device&apos;s secure storage.
        </p>
      </section>

      <section className="panel stack-sm">
        <h2>Retention and deletion</h2>
        <p>
          Your data is kept until you delete it. Deleting an individual item removes it immediately.
          Deleting your account removes the account and every saved item, and invalidates all
          signed-in sessions. Deletion cannot be undone.
        </p>
      </section>

      <section className="panel stack-sm">
        <h2>Contact</h2>
        <p className="muted">
          This is a self-hosted demonstration deployment. For privacy questions, contact the person
          operating the instance you are using.
        </p>
      </section>
    </article>
  );
}
