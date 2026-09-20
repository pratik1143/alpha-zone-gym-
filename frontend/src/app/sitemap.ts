import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/about-us',
    '/gym-services',
    '/personal-training-mohali',
    '/crossfit-mohali',
    '/weight-training-mohali',
    '/functional-training-mohali',
    '/hiit-training-mohali',
    '/weight-loss-gym-mohali',
    '/gym-membership-mohali',
    '/gym-sector-77-mohali',
    '/contact-us',
    '/privacy-policy',
    '/terms-and-conditions'
  ];

  return routes.map(route => ({
    url: `https://www.alphazonegym.in${route === '' ? '' : route}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1.0 : route === '/privacy-policy' || route === '/terms-and-conditions' ? 0.5 : 0.8,
  }));
}
