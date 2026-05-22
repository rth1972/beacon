import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from './components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Beacon',
  description: 'Self-hosted push notifications',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#5a5a50',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#5a5a50" id="tc" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t=JSON.parse(localStorage.getItem('ntfy_theme')||'{}');
            document.getElementById('tc').content=t.light!==false?'#5a5a50':'#f3ba40';
          }catch(e){}
        `}} />
      </head>
      <body>
        <ThemeProvider>
          <SWRegistration />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

function SWRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `,
      }}
    />
  )
}
