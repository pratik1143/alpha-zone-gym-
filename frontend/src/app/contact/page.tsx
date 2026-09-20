import { getSEO } from '../../lib/seo';
import { contactSchema } from '../../lib/schema';
import ContactClient from './ContactClient';

export const metadata = getSEO({
  title: 'Contact Alpha Zone Gym | Gym Near Landran Road, Sohana',
  description: 'Contact Alpha Zone Gym in Sohana, Mohali. Get directions, opening hours, membership information and training details.',
  path: '/contact'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <ContactClient />
    </>
  );
}
