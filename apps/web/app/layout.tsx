import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Nav } from '@/components/nav';
import { isAuthenticated } from '@/lib/session';

export const metadata: Metadata = {
  title: {
    default: 'Catchup',
    template: '%s · Catchup',
  },
  description: 'Your personal library for everything you meant to come back to.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#121211' },
  ],
};

// Applies a stored theme before first paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('catchup-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authenticated = await isAuthenticated();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="app-shell">
          {authenticated ? <Nav /> : null}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
