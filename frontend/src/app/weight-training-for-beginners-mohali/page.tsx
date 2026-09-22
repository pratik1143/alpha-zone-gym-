import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs, getBlogPostingSchema, getFaqSchema } from '../../lib/blogs';
import { 
  Dumbbell, Target, Flame, Zap, Award, Activity, Heart, 
  MapPin, Phone, ArrowRight, ArrowUpRight, CheckCircle2, ChevronRight, AlertTriangle, ShieldCheck, Sparkles 
} from 'lucide-react';
import '../../components/blog.css';

const article = blogs[1]; // weight-training-for-beginners-mohali

export const metadata = getSEO({
  title: article.seoTitle,
  description: article.metaDescription,
  path: article.url,
  keywords: [article.primaryKeyword, ...article.secondaryKeywords],
  image: article.image,
  type: 'article'
});

export default function WeightTrainingForBeginnersPage() {
  const articleSchema = getBlogPostingSchema(article);
  const faqSchema = getFaqSchema(article.faqs);

  return (
    <PageLayout>
      {/* Structured Data Scripts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <article className="az-article-wrap az-container">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="az-breadcrumbs">
          <Link href="/">Home</Link>
          <ChevronRight size={12} />
          <Link href="/blog">Blog</Link>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Weight Training for Beginners</span>
        </nav>

        {/* Article Header */}
        <header className="az-article-header">
          <span className="az-blog-badge">{article.category}</span>
          <h1 className="az-article-title">
            Weight Training for Beginners in Mohali: Complete Guide to Getting Started
          </h1>
          <div className="az-article-meta-bar">
            <span>By <strong>{article.author}</strong></span>
            <span>•</span>
            <span>Published {article.publishedDate}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Strength Coach Verified</span>
          </div>
        </header>

        {/* Featured Banner Image */}
        <div className="az-article-hero-image">
          <Image
            src={article.image}
            alt="Weight Training for Beginners at Alpha Zone Gym Mohali"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className="object-cover"
          />
        </div>

        {/* Main Article Body */}
        <div className="az-article-content">
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.75, fontWeight: 500 }}>
            Starting weight training can feel intimidating when you walk into a gym for the first time. With the right foundation and structure, <strong>weight training in Mohali</strong> can become an empowering, transformative part of your weekly routine to build real-world strength, increase muscle definition, and improve your metabolic health.
          </p>

          <h2>What Is Weight Training?</h2>
          <p>
            Weight training is a systematic form of resistance exercise where your muscles work against external resistance. That resistance comes from diverse equipment including dumbbells, Olympic barbells, plate-loaded weight machines, cable pulley systems, kettlebells, and targeted bodyweight movements.
          </p>

          <h2>Key Benefits of Weight Training</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '24px 0 32px' }}>
            <div style={{ background: '#0e1315', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <div style={{ color: 'var(--az-lime, #e5fa19)', fontWeight: 800, fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dumbbell size={18} /> Functional Strength
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                Progressive resistance strengthens skeletal muscles, connective tendons, and joints for daily physical durability.
              </p>
            </div>
            <div style={{ background: '#0e1315', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <div style={{ color: 'var(--az-lime, #e5fa19)', fontWeight: 800, fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} /> Muscle Development
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                Coupled with adequate protein intake, resistance training triggers hypertrophy to tone and shape your physique.
              </p>
            </div>
            <div style={{ background: '#0e1315', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <div style={{ color: 'var(--az-lime, #e5fa19)', fontWeight: 800, fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Heart size={18} /> Metabolic Health
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                Higher lean muscle mass increases basal metabolic rate, promoting efficient fat oxidation and glucose sensitivity.
              </p>
            </div>
            <div style={{ background: '#0e1315', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <div style={{ color: 'var(--az-lime, #e5fa19)', fontWeight: 800, fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} /> Mental Confidence
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                Tracking progressive milestones and hitting personal bests builds mental resilience and self-efficacy.
              </p>
            </div>
          </div>

          <h2>How Should Beginners Start Weight Training?</h2>
          <p>
            The single most common mistake beginners make is trying to lift heavy weights immediately with compromised form. Instead, expert strength coaches recommend mastering the <strong>5 fundamental human movement patterns</strong>:
          </p>

          <ol>
            <li>
              <strong>1. Squat (Knee-Dominant Lower Body):</strong>
              <p>Squatting recruits the quadriceps, hamstrings, glutes, and core. Beginners should start with bodyweight squats, goblet squats with a light kettlebell, or machine leg presses before loading a barbell on their back.</p>
            </li>
            <li>
              <strong>2. Push (Upper Body Horizontal & Vertical Press):</strong>
              <p>Pushing movements build the pectorals, anterior deltoids, and triceps. Recommended beginner exercises include flat dumbbell bench presses, push-ups, and machine overhead shoulder presses.</p>
            </li>
            <li>
              <strong>3. Pull (Upper Body Horizontal & Vertical Pull):</strong>
              <p>Pulling develops back width, spinal erectors, rhomboids, and biceps. Key movements include wide-grip lat pulldowns, seated cable rows, and supported single-arm dumbbell rows.</p>
            </li>
            <li>
              <strong>4. Hinge (Hip-Dominant Posterior Chain):</strong>
              <p>The hip hinge is crucial for lower back health and hamstring development. Master the Romanian Deadlift (RDL) with dumbbells before attempting barbell conventional deadlifts.</p>
            </li>
            <li>
              <strong>5. Carry (Core & Functional Stability):</strong>
              <p>Loaded farmer carries with dumbbells or trap bars build grip strength, shoulder stability, and a resilient, anti-rotational core.</p>
            </li>
          </ol>

          <h2>Sample Beginner Weight Training Routine</h2>
          <p>
            A 3-day alternating full-body split ensures balanced muscular development while allowing sufficient rest between sessions:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, margin: '24px 0 36px' }}>
            <div style={{ background: '#0c1113', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--az-lime, #e5fa19)', textTransform: 'uppercase', marginBottom: 12 }}>
                Workout A (Monday & Friday)
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
                <li>Goblet Squat (3 sets × 8–10 reps)</li>
                <li>Flat Dumbbell Bench Press (3 sets × 8–10 reps)</li>
                <li>Lat Pulldown (3 sets × 10–12 reps)</li>
                <li>Dumbbell Overhead Shoulder Press (3 sets × 10 reps)</li>
                <li>Seated Cable Row (3 sets × 10–12 reps)</li>
                <li>Plank Hold (3 sets × 30–45 seconds)</li>
              </ul>
            </div>

            <div style={{ background: '#0c1113', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--az-lime, #e5fa19)', textTransform: 'uppercase', marginBottom: 12 }}>
                Workout B (Wednesday)
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
                <li>Leg Press (3 sets × 10–12 reps)</li>
                <li>Incline Dumbbell Press (3 sets × 8–10 reps)</li>
                <li>Dumbbell Romanian Deadlift (3 sets × 8–10 reps)</li>
                <li>Cable Face Pulls (3 sets × 12–15 reps)</li>
                <li>Dumbbell Lateral Raises (3 sets × 12–15 reps)</li>
                <li>Farmer Walk Carry (3 sets × 30 meters)</li>
              </ul>
            </div>
          </div>

          <h2>How Many Days Should Beginners Train?</h2>
          <p>
            You do not need to train seven days a week. For beginners, <strong>3 non-consecutive days per week</strong> (e.g., Monday, Wednesday, Friday) allows muscles 48 hours to recover and repair. Recovery is the phase where muscles actually adapt and grow stronger.
          </p>

          <h2>What Is Progressive Overload?</h2>
          <p>
            Progressive overload is the golden rule of resistance training. It means systematically increasing the demands placed on the musculoskeletal system over time so your body continues to adapt. Progress can be achieved by:
          </p>
          <ul>
            <li>Adding a small increment of weight to the bar or dumbbell (e.g., 1–2.5 kg)</li>
            <li>Performing 1 to 2 additional repetitions with the same weight</li>
            <li>Improving movement tempo, control, and range of motion</li>
            <li>Reducing rest times between sets while maintaining exercise execution</li>
          </ul>

          <div className="az-callout-box" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <h3 className="az-callout-title" style={{ color: '#f87171' }}>
              <AlertTriangle size={18} /> Common Weight Training Mistakes to Avoid
            </h3>
            <ul style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 14 }}>
              <li><strong>Lifting with Ego:</strong> Using excessive weight that forces momentum and breaks joint alignment.</li>
              <li><strong>Ignoring Proper Warm-Ups:</strong> Skipping 5–10 minutes of dynamic mobility and warm-up sets.</li>
              <li><strong>Random Workout Hopping:</strong> Changing exercises every workout instead of sticking to a proven routine for 6–8 weeks.</li>
              <li><strong>Neglecting Protein & Hydration:</strong> Failing to fuel muscle repair with adequate daily protein and water.</li>
              <li><strong>Expecting Overnight Miracles:</strong> Meaningful body composition transformation requires consistent adherence for 3–6 months.</li>
            </ul>
          </div>

          <h2>Weight Training vs Cardio: Do You Need Both?</h2>
          <p>
            You do not need to choose between weight training and cardio. Strength training builds skeletal muscle and dense bones, while cardiovascular training enhances heart health and stamina. At <strong>Alpha Zone Gym in Mohali</strong>, we encourage members to pair 3 days of resistance training with 2 days of cardio or functional conditioning for optimal total-body fitness.
          </p>

          <h2>Weight Training in Mohali at Alpha Zone Gym</h2>
          <p>
            Located on Landran Road in Sohana, <Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)' }}>Alpha Zone Gym</Link> is engineered specifically for serious fitness enthusiasts and beginners seeking structured guidance. The strength zone features:
          </p>
          <ul>
            <li>Heavy-duty power cages, squat stations, and Olympic lifting platforms</li>
            <li>Commercial dumbbell rack ranging from light beginner weights to 40+ kg</li>
            <li>Biomechanically calibrated pin-loaded and plate-loaded resistance machines</li>
            <li>On-floor certified personal trainers available to check posture and mechanics</li>
          </ul>

          <h2>Frequently Asked Questions</h2>
          <div className="az-faq-list">
            {article.faqs.map((faq, idx) => (
              <div key={idx} className="az-faq-card">
                <h3 className="az-faq-q">{faq.question}</h3>
                <p className="az-faq-a">{faq.answer}</p>
              </div>
            ))}
          </div>

          <h2>Explore Related Training Disciplines</h2>
          <p>Elevate your fitness journey across our specialized disciplines:</p>
          <div className="az-internal-pills">
            <Link href="/weight-training-mohali" className="az-pill-link">
              <Dumbbell size={14} /> Weight Training
            </Link>
            <Link href="/personal-training-mohali" className="az-pill-link">
              <Target size={14} /> Personal Training
            </Link>
            <Link href="/gym-services" className="az-pill-link">
              <Activity size={14} /> Gym Services
            </Link>
            <Link href="/crossfit-mohali" className="az-pill-link">
              <Flame size={14} /> CrossFit
            </Link>
            <Link href="/hiit-training-mohali" className="az-pill-link">
              <Award size={14} /> HIIT Training
            </Link>
            <Link href="/functional-training-mohali" className="az-pill-link">
              <Zap size={14} /> Functional Training
            </Link>
            <Link href="/weight-loss-gym-mohali" className="az-pill-link">
              <Heart size={14} /> Weight Loss
            </Link>
            <Link href="/gym-membership-mohali" className="az-pill-link">
              <Sparkles size={14} /> Gym Membership
            </Link>
            <Link href="/contact-us" className="az-pill-link">
              <Phone size={14} /> Contact Us
            </Link>
          </div>

          {/* Bottom CTA Banner */}
          <div className="az-cta-banner">
            <p className="az-eyebrow" style={{ justifyContent: 'center' }}>START YOUR STRENGTH JOURNEY</p>
            <h3>Begin Weight Training at Alpha Zone Gym Mohali</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 580, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Book a personal fitness consultation and tour our strength facility on Landran Road, Sohana, Mohali. Start building real strength today.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919779333155?text=Hello%20Alpha%20Zone!%20I%20want%20to%20start%20weight%20training."
                target="_blank"
                rel="noreferrer"
                className="az-button"
              >
                Join Alpha Zone Now <ArrowUpRight size={18} />
              </a>
              <Link
                href="/personal-training-mohali"
                className="az-button az-button-dark"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Personal Training Info
              </Link>
            </div>
          </div>
        </div>
      </article>
    </PageLayout>
  );
}
