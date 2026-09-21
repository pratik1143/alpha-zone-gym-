import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';
import { weightTrainingSchema } from '../../lib/schema';

export const metadata = getSEO({
  title: 'Weight Training Gym in Mohali | Alpha Zone Gym',
  description: 'Build strength and muscle at Alpha Zone Gym with professional weight training equipment, structured workouts and expert coaching in Mohali.',
  path: '/weight-training-mohali'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(weightTrainingSchema) }}
      />
      <ServiceLandingTemplate
        h1="Weight Training Gym in Mohali"
        badge="HEAVY RESISTANCE • POWERLIFTING & HYPERTROPHY"
        heroTagline="Build Strength. Build Muscle. Build Confidence."
        heroDescription="Weight training is at the heart of strength and muscle development. At Alpha Zone Gym, members can train with barbells, dumbbells, power cages and specialized resistance machines designed for different training requirements."
        imageBg="/gym_images/Strength Training Gym in Mohali.jpg"
        primaryCtaText="Start Weight Training"
        primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20start%20weight%20training."
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
            title: "Structured Strength & Muscle Development",
            items: [
              {
                title: "Strength Training",
                description: "Progressive resistance training can help you develop strength and improve your physical performance over time."
              },
              {
                title: "Muscle Building",
                description: "Structured resistance workouts combined with appropriate nutrition can support muscle-development goals."
              },
              {
                title: "Powerlifting",
                description: "For members interested in strength-focused training, Alpha Zone provides equipment suitable for heavy compound lifts."
              }
            ]
          },
          {
            title: "Whether You're a Beginner or Experienced",
            description: "You don't need to be an experienced lifter to start weight training. Our coaches can help you understand exercise technique, equipment and appropriate training progressions."
          }
        ]}
      />
    </>
  );
}
