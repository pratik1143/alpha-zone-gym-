import { getSEO } from '../../lib/seo';
import ServiceLandingTemplate from '../../components/ServiceLandingTemplate';

export const metadata = getSEO({
  title: 'HIIT Training in Mohali | HIIT Classes | Alpha Zone Gym',
  description: 'Join HIIT training in Mohali at Alpha Zone Gym. Improve conditioning, endurance and fitness with high-intensity workouts.',
  path: '/hiit-training-mohali'
});

export default function Page() {
  return (
    <ServiceLandingTemplate
      h1="HIIT Training in Mohali"
      badge="CARDIO CONDITIONING • METABOLIC BURN"
      heroTagline="High Intensity. Focused Training. Real Effort."
      heroDescription="HIIT—High-Intensity Interval Training—uses periods of challenging exercise combined with recovery periods. At Alpha Zone, HIIT forms part of the gym's group-class and conditioning options."
      imageBg="/gym_images/gym near airport.jpg"
      primaryCtaText="Join a HIIT Session"
      primaryCtaHref="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20join%20a%20HIIT%20session."
      highlightsTitle="Why Choose HIIT Training?"
      highlights={[
        "Cardiovascular Fitness: Rapidly elevate heart rate & VO2 max capacity.",
        "Conditioning & Stamina: Build high work output under fatigue.",
        "Calorie Expenditure: Maximize post-exercise oxygen consumption (EPOC burn).",
        "Efficient Workouts: Achieve maximum fitness gains in concentrated 30-45 minute blocks.",
        "Group Energy: Train in a supportive, high-vibe team atmosphere."
      ]}
      sections={[
        {
          title: "Group HIIT Sessions & Atmosphere",
          description: "Train alongside other members in an energetic environment while following structured workouts. Our coaches guide participants through movements, technique, timing intervals, and intensity control.",
          items: [
            {
              title: "Cardio Intervals",
              description: "Sprints, rowers, assault bikes, and treadmills combined with recovery windows."
            },
            {
              title: "Plyometric Explosiveness",
              description: "Box jumps, kettlebell swings, burpees, and bodyweight agility drills."
            },
            {
              title: "Coach-Led Pacing",
              description: "Personalized modifications so everyone works at their optimal safe threshold."
            }
          ]
        },
        {
          title: "Is HIIT Right for You?",
          description: "HIIT can be challenging, so beginners should start at an appropriate intensity and focus on proper exercise technique. Speak with our coaches before starting if you're unsure where to begin."
        }
      ]}
    />
  );
}
