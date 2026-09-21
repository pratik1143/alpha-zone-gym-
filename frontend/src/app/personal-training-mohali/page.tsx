import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';
import { personalTrainingSchema } from '../../lib/schema';

export const metadata = getSEO({
  title: 'Personal Trainer in Mohali | Personal Training | Alpha Zone Gym',
  description: 'Get personal training in Mohali with customized workouts, coaching, goal tracking and one-on-one guidance at Alpha Zone Gym.',
  path: '/personal-training-mohali'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personalTrainingSchema) }}
      />
      <ServiceLandingTemplate
        h1="Personal Training in Mohali"
        badge="1-ON-1 COACHING • CUSTOMIZED PROGRAMMING"
        heroTagline="Train With a Plan. Train With a Coach."
        heroDescription="Personal training at Alpha Zone Gym is designed for people who want more individual attention and structured guidance during their workouts. Instead of following a generic routine, work with a coach who can help you understand your training, improve your technique and stay accountable."
        imageBg="/gym_images/Best Gym Near Landran Road.jpeg"
        primaryCtaText="Book a Personal Training Consultation"
        primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20book%20a%20Personal%20Training%20consultation."
        highlightsTitle="What Personal Training Includes"
        highlights={[
          "One-on-One Coaching: Get direct coaching and guidance during your sessions.",
          "Customized Training: Training can be structured around your goals, current fitness level and training experience.",
          "Form & Technique: Learn how to perform exercises correctly and safely.",
          "Progress Tracking: Track your training progress and adjust your approach as you improve.",
          "Goal-Based Programming: Whether your goal is strength, muscle development, weight loss or general fitness, your training can be structured accordingly."
        ]}
        sections={[
          {
            title: "Personal Training for Different Goals",
            items: [
              {
                title: "Weight Loss",
                description: "Build a structured routine combining strength and conditioning."
              },
              {
                title: "Muscle Building",
                description: "Focus on resistance training and progressive strength development."
              },
              {
                title: "Strength",
                description: "Develop your strength through structured resistance training."
              },
              {
                title: "General Fitness",
                description: "Improve your overall fitness, conditioning and movement."
              }
            ]
          },
          {
            title: "Ready for More Personal Attention?",
            description: "Speak with the Alpha Zone team about personal training in Mohali."
          }
        ]}
      />
    </>
  );
}
