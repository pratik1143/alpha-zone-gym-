import { getSEO } from '../../lib/seo';
import { aboutSchema } from '../../lib/schema';
import AboutClient from '../about/AboutClient';

export const metadata = getSEO({
  title: 'About Alpha Zone Gym | Gym in Sohana, Mohali',
  description: 'Learn about Alpha Zone Gym in Sohana, Mohali, our training environment, equipment, coaches and approach to strength and fitness.',
  path: '/about-us'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <AboutClient />
    </>
  );
}
