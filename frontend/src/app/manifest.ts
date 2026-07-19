import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Alpha Zone Gym',
    short_name: 'Alpha Zone',
    description: 'Premium Fitness Center & Strength Destination in Sohana, Mohali',
    start_url: '/',
    display: 'standalone',
    background_color: '#08080a',
    theme_color: '#08080a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/gymlogo.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };
}
