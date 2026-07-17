import { getSEO } from '../../lib/seo';
import { appSchema } from '../../lib/schema';
import AppClient from './AppClient';

export const metadata = getSEO({
  title: 'Alpha Zone Gym App | Workout & Membership Tracking',
  description: 'Download the Alpha Zone Gym App to manage memberships, track workouts, monitor your progress, and stay connected with your fitness journey.',
  path: '/app'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <AppClient />
    </>
  );
}
