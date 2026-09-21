import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';
import { crossfitSchema } from '../../lib/schema';

export const metadata = getSEO({
  title: 'CrossFit Gym in Mohali | CrossFit Training | Alpha Zone',
  description: 'Train at Alpha Zone, a CrossFit gym in Mohali offering high-intensity functional workouts focused on strength, conditioning and performance.',
  path: '/crossfit-mohali'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crossfitSchema) }}
      />
      <ServiceLandingTemplate
        h1="CrossFit Gym in Mohali"
        badge="HIGH-INTENSITY • ATHLETIC CONDITIONING"
        heroTagline="Train Hard. Move Better. Get Stronger."
        heroDescription="CrossFit combines strength, conditioning and functional movements into challenging workouts designed to improve overall physical performance. At Alpha Zone, CrossFit training can include movements such as Olympic lifts, plyometrics, gymnastic movements and conditioning exercises."
        imageBg="/gym_images/Weight Loss Gym Mohali.jpg"
        primaryCtaText="Start CrossFit Training"
        primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20start%20CrossFit%20training."
        highlightsTitle="What CrossFit Can Help Improve"
        highlights={[
          "Strength",
          "Conditioning",
          "Endurance",
          "Power",
          "Coordination",
          "Mobility",
          "Work capacity"
        ]}
        sections={[
          {
            title: "CrossFit Training",
            description: "Our CrossFit environment is designed to challenge you while helping you develop better movement and physical capacity. Workouts can combine different movement patterns and conditioning methods to create varied and challenging training sessions."
          },
          {
            title: "Who Can Train?",
            description: "CrossFit can be adapted to different experience levels when exercises and intensity are appropriately scaled. Whether you're starting your fitness journey or looking for a new training challenge, speak with our coaches about the right approach for you."
          }
        ]}
      />
    </>
  );
}
