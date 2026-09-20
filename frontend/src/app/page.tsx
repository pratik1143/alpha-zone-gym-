import { getSEO } from '../lib/seo';
import { homeSchemas } from '../lib/schema';
import HomeClient from './HomeClient';

export const metadata = getSEO({
  title: 'Gym in Sohana, Mohali | Alpha Zone Gym',
  description: 'Looking for a gym in Sohana, Mohali? Alpha Zone Gym offers weight training, cardio, CrossFit, personal training, functional fitness and more.',
  path: '/'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchemas) }}
      />
      <HomeClient />
    </>
  );
}
