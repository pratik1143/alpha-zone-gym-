import { getSEO } from '../../lib/seo';
import PlansClient from '../plans/PlansClient';

export const metadata = getSEO({
  title: 'Gym Membership in Mohali | Gym Fees & Plans | Alpha Zone',
  description: 'Explore Alpha Zone Gym membership plans and fees in Mohali, including monthly, 3-month, 6-month and annual membership options.',
  path: '/gym-membership'
});

export default function Page() {
  return <PlansClient />;
}
