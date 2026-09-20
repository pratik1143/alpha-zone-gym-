import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';

export const metadata = getSEO({
  title: 'CrossFit Gym in Mohali | CrossFit Training | Alpha Zone',
  description: 'Train at Alpha Zone, a CrossFit gym in Mohali offering high-intensity functional workouts focused on strength, conditioning and performance.',
  path: '/crossfit'
});

export default function Page() {
  return (
    <ServiceLandingTemplate
      h1="CrossFit Gym in Mohali"
      badge="HIGH-INTENSITY • ATHLETIC CONDITIONING"
      heroTagline="Train Hard. Move Better. Get Stronger."
      heroDescription="CrossFit combines strength, conditioning and functional movements into challenging workouts designed to improve overall physical performance. At Alpha Zone, CrossFit training can include movements such as Olympic lifts, plyometrics, gymnastic movements and conditioning exercises."
      imageBg="/gym_images/Weight Loss Gym Mohali.jpg"
      primaryCtaText="Start CrossFit Training"
      primaryCtaHref="/contact"
      highlightsTitle="What CrossFit Can Help Improve"
      highlights={[
        "Strength: Heavy barbell & functional movement work.",
        "Conditioning: High-output metabolic workouts.",
        "Endurance: Increased aerobic capacity & stamina.",
        "Power & Speed: Explosive movements, plyometrics & Olympic lifts.",
        "Coordination & Agility: Dynamic bodyweight & gymnastic skill development.",
        "Mobility & Flexibility: Better range of motion & injury resistance."
      ]}
      sections={[
        {
          title: "CrossFit Training Environment",
          description: "Our CrossFit environment is designed to challenge you while helping you develop better movement and physical capacity. Workouts combine different movement patterns and conditioning methods to create varied, exciting training sessions.",
          items: [
            {
              title: "Olympic Lifting",
              description: "Master snatches, clean and jerks with bumper plates, platform space, and expert technical guidance."
            },
            {
              title: "Gymnastics & Bodyweight",
              description: "Pull-ups, muscle-ups, ring dips, push-ups, and core stabilization routines."
            },
            {
              title: "Metabolic Conditioning (MetCons)",
              description: "High-intensity circuits with assault bikes, rowers, kettlebells, and battle ropes for maximum calorie burn."
            }
          ]
        },
        {
          title: "Who Can Train?",
          description: "CrossFit can be adapted to different experience levels when exercises and intensity are appropriately scaled. Whether you're starting your fitness journey or looking for a new training challenge, speak with our coaches about the right approach for you."
        }
      ]}
    />
  );
}
