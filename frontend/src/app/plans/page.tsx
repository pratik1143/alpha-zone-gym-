import { getSEO } from '../../lib/seo';
import PlansClient from './PlansClient';

export const metadata = getSEO({
  title: 'Affordable Gym Membership Plans in Mohali | Alpha Zone Gym',
  description: 'Choose affordable gym membership plans at Alpha Zone Gym near Landran Road. Monthly, quarterly, half-yearly, and yearly fitness packages available.',
  path: '/packages' // Canonical points to /packages as requested
});

export default function Page() {
  return <PlansClient />;
}
