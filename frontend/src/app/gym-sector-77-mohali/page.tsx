import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';

export const metadata = getSEO({
  title: 'Best Gym in Sector 77, Mohali | Alpha Zone Gym',
  description: 'Looking for a gym near Sector 77, Mohali? Train at Alpha Zone Gym in nearby Sohana with weight training, cardio, CrossFit and personal training.',
  path: '/gym-sector-77-mohali'
});

export default function Page() {
  return (
    <ServiceLandingTemplate
      h1="Best Gym Near Sector 77, Mohali"
      badge="LOCATION HIGHLIGHT • SECTOR 77 & SOHANA"
      heroTagline="Looking for a Gym Near Sector 77, Mohali?"
      heroDescription="Alpha Zone Gym is located on Landran Road, Sohana, Mohali, providing fitness and training facilities for members from Sohana and surrounding areas. If you're searching for a gym near Sector 77 with strength equipment, cardio, CrossFit, functional training and personal training options, Alpha Zone offers multiple ways to train."
      imageBg="/gym_images/Best Gym near airport.jpg"
      primaryCtaText="Visit Alpha Zone Gym"
      primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20am%20from%20Sector%2077%20and%20want%20to%20visit."
      highlightsTitle="Why Sector 77 Residents Choose Alpha Zone"
      highlights={[
        "Convenient Location: Just minutes away on Landran Road, Sohana.",
        "Professional Training Equipment: Imported strength machines & power cages.",
        "Expert Certified Coaches: Hands-on guidance & structured workout plans.",
        "Multiple Training Modalities: Weight training, CrossFit, HIIT & PT under one roof.",
        "Clean & Comfortable Facility: Well-ventilated, hygienic, with locker room facilities.",
        "Flexible Membership Plans: Options for monthly, quarterly, semi-annual, and annual."
      ]}
      sections={[
        {
          title: "Complete Training Options Available",
          description: "Explore our versatile fitness zones built for all fitness levels.",
          items: [
            {
              title: "Weight Training",
              description: "Train with barbells, dumbbells, power cages and specialized resistance equipment."
            },
            {
              title: "Cardio Zone",
              description: "Use dedicated cardio equipment including rowers, treadmills, and assault bikes."
            },
            {
              title: "Personal Training",
              description: "Get one-on-one coaching, customized workout routines, and progress tracking."
            },
            {
              title: "CrossFit Area",
              description: "Take on high-intensity functional workouts designed for strength & power."
            },
            {
              title: "Functional Training",
              description: "Work on movement, core stability, balance, and athletic conditioning."
            },
            {
              title: "HIIT & Group Classes",
              description: "Join energetic high-intensity group fitness sessions guided by coaches."
            }
          ]
        }
      ]}
    />
  );
}
