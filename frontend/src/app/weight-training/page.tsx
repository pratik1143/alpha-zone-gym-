import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';

export const metadata = getSEO({
  title: 'Weight Training Gym in Mohali | Alpha Zone Gym',
  description: 'Build strength and muscle at Alpha Zone Gym with professional weight training equipment, structured workouts and expert coaching in Mohali.',
  path: '/weight-training'
});

export default function Page() {
  return (
    <ServiceLandingTemplate
      h1="Weight Training Gym in Mohali"
      badge="HEAVY RESISTANCE • POWERLIFTING & HYPERTROPHY"
      heroTagline="Build Strength. Build Muscle. Build Confidence."
      heroDescription="Weight training is at the heart of strength and muscle development. At Alpha Zone Gym, members can train with barbells, dumbbells, power cages and specialized resistance machines designed for different training requirements."
      imageBg="/gym_images/Strength Training Gym in Mohali.jpg"
      primaryCtaText="Start Weight Training"
      primaryCtaHref="/contact"
      highlightsTitle="Train Every Major Muscle Group"
      highlights={[
        "Chest: Flat, incline & decline bench press stations, cables & heavy dumbbells.",
        "Back: Lat pulldowns, T-bar rows, deadlift platforms & pull-up stations.",
        "Shoulders: Overhead press stations, lateral raise machines & rear deltoid equipment.",
        "Arms: Specialized EZ bars, preacher curl benches & tricep cable stations.",
        "Legs: Power cages, hack squats, leg press machines & calf extension units.",
        "Core: Roman chairs, weighted ab machines & stability training gear."
      ]}
      sections={[
        {
          title: "Structured Weight Training Pillars",
          description: "Our facility supports a complete range of strength discipline goals.",
          items: [
            {
              title: "Strength Training",
              description: "Progressive resistance training designed to systematically build maximal force output and tendon strength."
            },
            {
              title: "Muscle Building (Hypertrophy)",
              description: "Structured resistance workouts focused on optimal hypertrophy angles, mechanical tension, and volume."
            },
            {
              title: "Powerlifting",
              description: "Suitable equipment for heavy compound lifts: Rogue barbells, calibrated plates, and heavy-duty power racks."
            }
          ]
        },
        {
          title: "Whether You're a Beginner or Experienced",
          description: "You don't need to be an experienced lifter to start weight training. Our coaches can help you understand exercise technique, equipment setup, safety procedures, and appropriate progressive overload routines."
        }
      ]}
    />
  );
}
