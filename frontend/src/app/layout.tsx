import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALPHA ZONE OS — Beyond Strength. Beyond Limits.',
  description: 'Enterprise Gym Operating System powered by AI. Real-time ESSL biometric turnstiles, workout builders, diet planners, client metrics, and gamified progress tracking.',
  icons: {
    icon: '/logo.png'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased min-h-screen">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0F172A',
              color: '#F8FAFC',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              fontSize: '0.875rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
