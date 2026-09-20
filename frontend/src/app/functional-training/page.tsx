import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';

export const metadata = getSEO({
  title: 'Functional Training in Mohali | Alpha Zone Gym',
  description: 'Improve strength, mobility, stability and movement with functional training at Alpha Zone Gym in Mohali.',
  path: '/functional-training'
});

export default function Page() {
  return (
    <ServiceLandingTemplate
      h1="Functional Training in Mohali"
      badge="MOVEMENT • MOBILITY & STABILITY"
      heroTagline="Train Your Body to Move Better."
      heroDescription="Functional training focuses on movement patterns that can help develop strength, coordination, stability and overall physical performance. At Alpha Zone, functional training can include kettlebell movements, medicine ball exercises, core work and other movement-based exercises."
      imageBg="/gym_images/Best Gym nearby.jpg"
      primaryCtaText="Explore Functional Training"
      primaryCtaHref="/contact"
      highlightsTitle="Benefits of Functional Training"
      highlights={[
        "Better Movement: Develop control and coordination through multi-directional movement patterns.",
        "Core Strength: Strengthen deep abdominal, lower back, and pelvic stabilizer muscles.",
        "Balance & Coordination: Challenge joint position sense and motor recruitment.",
        "Athletic Conditioning: Develop physical stamina useful for both recreational sports and daily activities.",
        "Joint Longevity: Protect shoulders, knees, and hips through functional alignment training."
      ]}
      sections={[
        {
          title: "Functional Equipment & Tools",
          description: "Our dedicated functional zone is packed with versatile tools to challenge your movement.",
          items: [
            {
              title: "Kettlebells & Dumbbells",
              description: "Swings, Turkish get-ups, and asymmetric carries for total body stability."
            },
            {
              title: "Slam Balls & Medicine Balls",
              description: "Rotational power, wall balls, and core rotational strength."
            },
            {
              title: "Suspension & TRX Systems",
              description: "Bodyweight resistance training that scales dynamically for all skill levels."
            }
          ]
        },
        {
          title: "Functional Training for Different Fitness Levels",
          description: "Training can be adjusted based on your current fitness level and goals. Our coaches can help you understand the appropriate exercises, progressions, and movement adaptations."
        }
      ]}
    />
  );
}
