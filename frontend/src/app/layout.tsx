import type { Metadata } from 'next';
import { GlobalToaster } from '@/lib/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALPHA ZONE OS — Beyond Strength. Beyond Limits.',
  description: 'Enterprise Gym Operating System powered by AI. Real-time ESSL biometric turnstiles, workout builders, diet planners, client metrics, and gamified progress tracking.',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/gymlogo.png', type: 'image/png' },
    ],
    apple: '/gymlogo.png',
    shortcut: '/gymlogo.png',
  },
  other: {
    'theme-color': '#08080a',
  }
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
      </head>
      <body className="bg-white text-slate-900 antialiased min-h-screen font-sans">
        <GlobalToaster />
        {children}
      </body>
    </html>
  );
}
