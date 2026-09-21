import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';
import { weightLossSchema } from '../../lib/schema';

export const metadata = getSEO({
  title: 'Weight Loss Gym in Mohali | Fat Loss Training | Alpha Zone',
  description: 'Work towards your weight loss goals with strength training, cardio and structured workouts at Alpha Zone Gym in Mohali.',
  path: '/weight-loss-gym-mohali'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(weightLossSchema) }}
      />
      <ServiceLandingTemplate
        h1="Weight Loss Gym in Mohali"
        badge="SUSTAINABLE FAT LOSS • STRUCTURED PROGRAMMING"
        heroTagline="Your Goal. Your Training. Your Progress."
        heroDescription="Losing weight isn't about doing one type of workout. A sustainable fitness routine can combine strength training, cardiovascular exercise, appropriate nutrition and consistency. At Alpha Zone Gym, you can build your training routine around your individual fitness goals."
        imageBg="/gym_images/Weight Loss Gym Mohali.jpg"
        primaryCtaText="Start Training Today"
        primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20start%20weight%20loss%20training."
        highlightsTitle="Training for Weight Loss"
        highlights={[
          "Strength Training: Resistance training can help you build and maintain muscle while improving strength.",
          "Cardio: Cardiovascular exercise can help improve endurance and increase energy expenditure.",
          "HIIT: High-intensity workouts can provide a challenging conditioning component to your routine.",
          "Personal Training: One-on-one coaching can provide additional structure and accountability."
        ]}
        sections={[
          {
            title: "Build Sustainable Fitness Habits",
            description: "The goal isn't simply to work hard for a few days. Consistency matters. A structured workout routine, appropriate nutrition, recovery and regular training can help you stay on track."
          },
          {
            title: "Start Your Fitness Journey",
            description: "Talk to Alpha Zone's team about creating a training routine around your goals."
          }
        ]}
      />
    </>
  );
}
