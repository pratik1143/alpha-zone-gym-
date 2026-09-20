import { getSEO } from '../../lib/seo';
import { termsSchema } from '../../lib/schema';
import TermsClient from '../terms/TermsClient';

export const metadata = getSEO({
  title: 'Terms & Conditions | Alpha Zone Gym',
  description: 'Terms & Conditions for membership and facilities at Alpha Zone Gym, Sohana, Mohali.',
  path: '/terms-and-conditions'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsSchema) }}
      />
      <TermsClient />
    </>
  );
}
