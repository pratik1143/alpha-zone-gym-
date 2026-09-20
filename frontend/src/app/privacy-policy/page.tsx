import { getSEO } from '../../lib/seo';
import { privacySchema } from '../../lib/schema';
import PrivacyClient from './PrivacyClient';

export const metadata = getSEO({
  title: 'Privacy Policy | Alpha Zone Gym',
  description: 'Privacy Policy for Alpha Zone Gym in Sohana, Mohali.',
  path: '/privacy-policy'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacySchema) }}
      />
      <PrivacyClient />
    </>
  );
}
