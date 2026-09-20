import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/about',
    '/services',
    '/personal-training',
    '/crossfit',
    '/weight-training',
    '/functional-training',
    '/hiit-training',
    '/weight-loss',
    '/gym-membership',
    '/gym-near-sector-77-mohali',
    '/contact',
    '/privacy-policy',
    '/terms'
  ];

  return routes.map(route => ({
    url: `https://alphazonegym.in${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1.0 : route === '/privacy-policy' || route === '/terms' ? 0.5 : 0.8,
  }));
}
