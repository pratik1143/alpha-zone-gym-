import { getSEO } from '../../lib/seo';
import { servicesSchema } from '../../lib/schema';
import ServicesClient from '../services/ServicesClient';

export const metadata = getSEO({
  title: 'Gym Services in Mohali | Alpha Zone Gym',
  description: 'Explore gym services in Mohali at Alpha Zone Gym including weight training, cardio, personal training, CrossFit, functional training and HIIT.',
  path: '/gym-services'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }}
      />
      <ServicesClient />
    </>
  );
}
