import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';
import { gymSector77Schema } from '../../lib/schema';

export const metadata = getSEO({
  title: 'Best Gym in Sector 77, Mohali | Alpha Zone Gym',
  description: 'Looking for a gym near Sector 77, Mohali? Train at Alpha Zone Gym in nearby Sohana with weight training, cardio, CrossFit and personal training.',
  path: '/gym-sector-77-mohali'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gymSector77Schema) }}
      />
      <ServiceLandingTemplate
        h1="Best Gym Near Sector 77, Mohali"
        badge="LOCATION HIGHLIGHT • SECTOR 77 & SOHANA"
        heroTagline="Looking for a Gym Near Sector 77, Mohali?"
        heroDescription="Alpha Zone Gym is located on Landran Road, Sohana, Mohali, providing fitness and training facilities for members from Sohana and surrounding areas. If you're searching for a gym near Sector 77 with strength equipment, cardio, CrossFit, functional training and personal training options, Alpha Zone offers multiple ways to train."
        imageBg="/gym_images/Best Gym near airport.jpg"
        primaryCtaText="Visit Alpha Zone Gym"
        primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20am%20from%20Sector%2077%20and%20want%20to%20visit."
        highlightsTitle="Why Choose Alpha Zone?"
        highlights={[
          "Professional training equipment",
          "Expert coaches",
          "Multiple training options",
          "Personalised programming",
          "Fitness assessment",
          "Locker room access",
          "Flexible membership plans"
        ]}
        sections={[
          {
            title: "Training Options",
            items: [
              {
                title: "Weight Training",
                description: "Train with barbells, dumbbells, power cages and specialized resistance equipment."
              },
              {
                title: "Cardio",
                description: "Use dedicated cardio equipment for endurance and conditioning."
              },
              {
                title: "Personal Training",
                description: "Get one-on-one coaching and structured training."
              },
              {
                title: "CrossFit",
                description: "Take on high-intensity functional workouts."
              },
              {
                title: "Functional Training",
                description: "Work on strength, movement, stability and conditioning."
              },
              {
                title: "HIIT",
                description: "Join high-intensity group fitness sessions."
              }
            ]
          }
        ]}
      />
    </>
  );
}
