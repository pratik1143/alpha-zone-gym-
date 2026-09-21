import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';
import { functionalTrainingSchema } from '../../lib/schema';

export const metadata = getSEO({
  title: 'Functional Training in Mohali | Alpha Zone Gym',
  description: 'Improve strength, mobility, stability and movement with functional training at Alpha Zone Gym in Mohali.',
  path: '/functional-training-mohali'
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(functionalTrainingSchema) }}
      />
      <ServiceLandingTemplate
        h1="Functional Training in Mohali"
        badge="MOVEMENT • MOBILITY & STABILITY"
        heroTagline="Train Your Body to Move Better."
        heroDescription="Functional training focuses on movement patterns that can help develop strength, coordination, stability and overall physical performance. At Alpha Zone, functional training can include kettlebell movements, medicine ball exercises, core work and other movement-based exercises."
        imageBg="/gym_images/Best Gym nearby.jpg"
        primaryCtaText="Explore Functional Training"
        primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20explore%20functional%20training."
        highlightsTitle="Benefits of Functional Training"
        highlights={[
          "Better Movement: Develop control and coordination through different movement patterns.",
          "Core Strength: Strengthen your core and improve stability.",
          "Balance & Coordination: Challenge your body through dynamic movements.",
          "Athletic Conditioning: Develop physical qualities useful for sports and everyday activity."
        ]}
        sections={[
          {
            title: "Functional Training for Different Fitness Levels",
            description: "Training can be adjusted based on your current fitness level and goals. Our coaches can help you understand the appropriate exercises and progression."
          }
        ]}
      />
    </>
  );
}
