import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';

export const metadata = getSEO({
  title: 'Personal Trainer in Mohali | Personal Training | Alpha Zone Gym',
  description: 'Get personal training in Mohali with customized workouts, coaching, goal tracking and one-on-one guidance at Alpha Zone Gym.',
  path: '/personal-training'
});

export default function Page() {
  return (
    <ServiceLandingTemplate
      h1="Personal Training in Mohali"
      badge="1-ON-1 COACHING • CUSTOMIZED PROGRAMMING"
      heroTagline="Train With a Plan. Train With a Coach."
      heroDescription="Personal training at Alpha Zone Gym is designed for people who want more individual attention and structured guidance during their workouts. Instead of following a generic routine, work with a coach who can help you understand your training, improve your technique and stay accountable."
      imageBg="/gym_images/Best Gym Near Landran Road.jpeg"
      primaryCtaText="Book a Personal Training Consultation"
      primaryCtaHref="/contact"
      highlightsTitle="What Personal Training Includes"
      highlights={[
        "One-on-One Coaching: Get direct coaching and guidance during your sessions.",
        "Customized Training: Structured around your goals, current fitness level, and experience.",
        "Form & Technique: Learn how to perform exercises correctly and safely.",
        "Progress Tracking: Track your strength & body metric progress continuously.",
        "Goal-Based Programming: Targeted routines for muscle, strength, fat loss, or conditioning."
      ]}
      sections={[
        {
          title: "Personal Training for Different Goals",
          description: "No matter where you are starting from, our coaches customize your path to success.",
          items: [
            {
              title: "Weight Loss",
              description: "Build a structured routine combining resistance training, targeted cardio, and metabolic conditioning."
            },
            {
              title: "Muscle Building",
              description: "Focus on hypertrophy-focused resistance training, progressive overload, and exercise selection."
            },
            {
              title: "Strength Development",
              description: "Develop maximal power and strength safely through compound movements and structured lifting protocols."
            },
            {
              title: "General Fitness & Mobility",
              description: "Improve overall stamina, joint mobility, physical stamina, and functional day-to-day movement."
            }
          ]
        }
      ]}
    />
  );
}
