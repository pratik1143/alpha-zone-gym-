import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';

export const metadata = getSEO({
  title: 'Weight Loss Gym in Mohali | Fat Loss Training | Alpha Zone',
  description: 'Work towards your weight loss goals with strength training, cardio and structured workouts at Alpha Zone Gym in Mohali.',
  path: '/weight-loss-gym-mohali'
});

export default function Page() {
  return (
    <ServiceLandingTemplate
      h1="Weight Loss Gym in Mohali"
      badge="SUSTAINABLE FAT LOSS • STRUCTURED PROGRAMMING"
      heroTagline="Your Goal. Your Training. Your Progress."
      heroDescription="Losing weight isn't about doing one type of workout. A sustainable fitness routine can combine strength training, cardiovascular exercise, appropriate nutrition and consistency. At Alpha Zone Gym, you can build your training routine around your individual fitness goals."
      imageBg="/gym_images/Weight Loss Gym Mohali.jpg"
      primaryCtaText="Start Training Today"
      primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20start%20weight%20loss%20training."
      highlightsTitle="Multi-Pillar Weight Loss Approach"
      highlights={[
        "Strength Training: Preserve lean muscle tissue while ramping metabolic rate.",
        "Targeted Cardio: Rowers, treadmills, assault bikes & StairMasters for optimal energy burn.",
        "HIIT Circuits: Short, high-intensity intervals for maximum fat-burning output.",
        "Personalized Guidance: One-on-one coaching for structure, motivation & accountability.",
        "Progress Measurements: Body composition metrics tracking to measure real changes."
      ]}
      sections={[
        {
          title: "Comprehensive Training Modules",
          description: "Combine different styles of exercise for balanced, sustainable results.",
          items: [
            {
              title: "Resistance & Hypertrophy",
              description: "Maintain lean muscle mass so your metabolism remains elevated even at rest."
            },
            {
              title: "Cardio Zone",
              description: "Endurance-building sessions tailored to your target heart rate zones."
            },
            {
              title: "1-on-1 Coaching",
              description: "Work directly with a coach to adjust exercise volume, recovery, and consistency habits."
            }
          ]
        },
        {
          title: "Build Sustainable Fitness Habits",
          description: "The goal isn't simply to work hard for a few days. Consistency matters. A structured workout routine, appropriate nutrition, recovery and regular training can help you stay on track long term."
        }
      ]}
    />
  );
}
