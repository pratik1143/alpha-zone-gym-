import type { Metadata, Viewport } from 'next';
import { GlobalToaster } from '@/lib/toast';
import PwaRegistrar from '@/components/PwaRegistrar';
import ChunkErrorRecovery from '@/components/ChunkErrorRecovery';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALPHA ZONE OS — Beyond Strength. Beyond Limits.',
  description: 'Enterprise Gym Operating System powered by AI. Real-time ESSL biometric turnstiles, workout builders, diet planners, client metrics, and gamified progress tracking.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/gymlogo.png', type: 'image/png' },
    ],
    apple: '/gymlogo.png',
    shortcut: '/gymlogo.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'theme-color': '#08080a',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#08080a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/sf-pro-display" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/gymlogo.png" />
      </head>
      <body className="bg-white text-slate-900 antialiased min-h-screen font-sans">
        <PwaRegistrar />
        <ChunkErrorRecovery />
        <GlobalToaster />
        {children}
      </body>
    </html>
  );
}

