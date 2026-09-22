import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs, getBlogPostingSchema, getFaqSchema } from '../../lib/blogs';
import { 
  Dumbbell, Target, Flame, Zap, Award, Activity, Heart, 
  MapPin, Phone, ArrowRight, ArrowUpRight, CheckCircle2, ChevronRight, Sparkles 
} from 'lucide-react';
import '../../components/blog.css';

const article = blogs[0]; // best-gym-in-sohana-mohali

export const metadata = getSEO({
  title: article.seoTitle,
  description: article.metaDescription,
  path: article.url,
  keywords: [article.primaryKeyword, ...article.secondaryKeywords],
  image: article.image,
  type: 'article'
});

export default function BestGymInSohanaPage() {
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
          <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Best Gym in Sohana, Mohali</span>
        </nav>

        {/* Article Header */}
        <header className="az-article-header">
          <span className="az-blog-badge">{article.category}</span>
          <h1 className="az-article-title">
            Best Gym in Sohana, Mohali: Complete Guide to Choosing the Right Gym
          </h1>
          <div className="az-article-meta-bar">
            <span>By <strong>{article.author}</strong></span>
            <span>•</span>
            <span>Published {article.publishedDate}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Verified by Certified Coaches</span>
          </div>
        </header>

        {/* Featured Banner Image */}
        <div className="az-article-hero-image">
          <Image
            src={article.image}
            alt="Best Gym in Sohana Mohali - Alpha Zone Gym Facility"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className="object-cover"
          />
        </div>

        {/* Main Article Body */}
        <div className="az-article-content">
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.75, fontWeight: 500 }}>
            Finding the right <strong>gym in Sohana, Mohali</strong> is about more than simply finding a place with weights and treadmills. The right fitness centre should provide the equipment, training options, coaching support and motivating environment that match your individual fitness goals.
          </p>

          <p>
            Whether your goal is weight loss, muscle building, strength development, athletic conditioning or overall health, choosing a gym with multiple training options makes it significantly easier to stay consistent and break through plateaus.
          </p>

          <p>
            For people living around <strong>Sohana, Landran Road, Sector 77, Landran</strong> and nearby areas of Mohali, <Link href="/" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Alpha Zone Gym</Link> provides a comprehensive range of training options including <Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)' }}>weight training</Link>, cardio, <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)' }}>personal training</Link>, <Link href="/crossfit-mohali" style={{ color: 'var(--az-lime, #e5fa19)' }}>CrossFit</Link>, <Link href="/functional-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)' }}>functional training</Link> and <Link href="/hiit-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)' }}>HIIT</Link>.
          </p>

          <div className="az-callout-box">
            <h3 className="az-callout-title">
              <Sparkles size={18} /> Quick Summary: What Makes a Top Gym in Sohana?
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1' }}>
              Look for certified coaches, multi-discipline zones (free weights, functional turf, cardio deck), hygienic locker facilities, flexible timings (open 7 days), and transparent membership pricing without hidden fees.
            </p>
          </div>

          <h2>What Should You Look for in a Gym in Sohana?</h2>
          <p>
            Before purchasing a gym membership, take time to evaluate the following key parameters to ensure the facility meets your long-term training expectations:
          </p>
          <ul>
            <li><strong>Equipment Quality & Variety:</strong> Modern resistance machines, Olympic barbells, power racks, dumbbells up to heavy increments, and specialized functional turf.</li>
            <li><strong>Structured Training Disciplines:</strong> Facilities that support strength training, cardio conditioning, CrossFit, functional movement, and high-intensity classes under one roof.</li>
            <li><strong>Expert Coaching:</strong> Coaches who prioritize proper lifting mechanics, injury prevention, and tailored workout progressions.</li>
            <li><strong>Cleanliness & Hygiene:</strong> Regularly sanitized equipment, pristine locker rooms, air conditioning, and clean shower amenities.</li>
            <li><strong>Location & Accessibility:</strong> A conveniently accessible location on Landran Road with ample parking and easy connectivity from Sector 77, Landran, and Sohana.</li>
            <li><strong>Flexible Membership Options:</strong> Transparent 1-month, 3-month, 6-month, and annual plans that provide full gym access without lock-in penalties.</li>
          </ul>

          <h2>Comprehensive Training Disciplines</h2>
          <p>
            Not everyone shares the same fitness aspirations. A balanced fitness center caters to diverse training methodologies:
          </p>

          <h3>1. Weight Training</h3>
          <p>
            Weight training stimulates muscle hypertrophy and bone density through progressive resistance. A well-equipped gym features dumbbells, Olympic barbells, plate-loaded machines, cable crossover towers, and adjustable benches.
          </p>

          <h3>2. Strength Training</h3>
          <p>
            Strength-focused workouts emphasize multi-joint compound lifts such as squats, bench presses, overhead presses, and deadlifts. Beginners benefit greatly from certified coach supervision to master correct form before adding heavier resistance.
          </p>

          <h3>3. Cardio Training Deck</h3>
          <p>
            Cardiovascular exercise boosts stamina, endurance, lung capacity, and heart health. Essential cardio equipment includes commercial treadmills, assault bikes, rowing machines, StairMasters, and elliptical cross-trainers.
          </p>

          <h3>4. Functional Training</h3>
          <p>
            Functional workouts train movement patterns that improve real-world mobility, balance, coordination, and rotational core stability using kettlebells, battle ropes, medicine balls, plyometric boxes, and suspension trainers.
          </p>

          <h3>5. HIIT (High-Intensity Interval Training)</h3>
          <p>
            HIIT alternates bursts of maximal effort with short recovery intervals, maximizing metabolic caloric burn in time-efficient 30-to-45-minute training sessions.
          </p>

          <h3>6. CrossFit Conditioning</h3>
          <p>
            CrossFit merges Olympic weightlifting, gymnastics, and high-intensity conditioning. Under structured coaching, beginners learn scaled movements and progressive pacing.
          </p>

          <h2>Personal Training in Sohana, Mohali</h2>
          <p>
            If you are new to working out or preparing for a specific physical goal, enrolling in <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)' }}>personal training in Sohana</Link> accelerates your progress dramatically. A personal coach provides:
          </p>
          <ul>
            <li>Personalized workout splits tailored to your baseline movement assessment</li>
            <li>Direct form correction on every repetition to prevent injury</li>
            <li>Progressive overload tracking and systematic weekly progression</li>
            <li>Accountability, consistency coaching, and lifestyle habit tracking</li>
          </ul>

          <h2>Gym for Weight Loss in Sohana</h2>
          <p>
            A sustainable weight loss routine combines resistance training, cardio conditioning, caloric balance, and consistent habits. Resistance training ensures that weight lost comes from fat stores rather than metabolically active lean muscle tissue.
          </p>

          <h2>Gym for Muscle Building & Hypertrophy</h2>
          <p>
            Building muscle requires progressive overload across proven movement patterns—squats, presses, rows, pull-downs, and hinges—coupled with sufficient protein intake and proper recovery sleep.
          </p>

          <h2>Why Location Matters When Choosing a Gym</h2>
          <p>
            Proximity is one of the highest predictors of long-term gym consistency. When your fitness center is located within a 5-to-10 minute commute, it seamlessly integrates into your morning or post-work schedule.
          </p>
          <p>
            <strong>Alpha Zone Gym</strong> is strategically situated at <strong>2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Mohali</strong>, making it exceptionally convenient for members coming from Sohana, Landran Road, Sector 77, and surrounding sectors of Mohali.
          </p>

          <h2>What Makes a Gym Suitable for Beginners?</h2>
          <p>
            Beginners thrive in an environment that is encouraging rather than intimidating. Alpha Zone Gym prioritizes beginner onboarding through free fitness assessments, equipment orientation, and coaches always available on the gym floor to demonstrate safe lifting technique.
          </p>

          <h2>How Often Should You Train?</h2>
          <p>
            For most individuals starting out, <strong>3 to 4 training days per week</strong> provides the ideal balance between training stimulus and muscular recovery. Quality of movement and consistency over months always outperforms sporadic over-training.
          </p>

          <div className="az-callout-box" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
            <h3 className="az-callout-title" style={{ color: '#fff' }}>
              <MapPin size={18} color="var(--az-lime, #e5fa19)" /> Alpha Zone Gym Mohali Facility Details
            </h3>
            <ul style={{ margin: '12px 0 0', paddingLeft: 20 }}>
              <li><strong>Address:</strong> 2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Mohali, Punjab 140308</li>
              <li><strong>Disciplines:</strong> Weight Training, Strength, Cardio, Personal Training, CrossFit, Functional, HIIT</li>
              <li><strong>Timings:</strong> Open 7 Days (Mon–Sat: 5:00 AM – 11:00 PM | Sun: 6:00 AM – 12:00 PM)</li>
              <li><strong>Contact:</strong> +91 97793 33155</li>
            </ul>
          </div>

          {/* FAQ Section */}
          <h2>Frequently Asked Questions</h2>
          <div className="az-faq-list">
            {article.faqs.map((faq, idx) => (
              <div key={idx} className="az-faq-card">
                <h3 className="az-faq-q">{faq.question}</h3>
                <p className="az-faq-a">{faq.answer}</p>
              </div>
            ))}
          </div>

          {/* Internal Links Hub */}
          <h2>Explore Alpha Zone Gym Services & Programs</h2>
          <p>Discover our specialized fitness disciplines and membership packages:</p>
          <div className="az-internal-pills">
            <Link href="/gym-services" className="az-pill-link">
              <Dumbbell size={14} /> Gym Services
            </Link>
            <Link href="/personal-training-mohali" className="az-pill-link">
              <Target size={14} /> Personal Training
            </Link>
            <Link href="/weight-training-mohali" className="az-pill-link">
              <Activity size={14} /> Weight Training
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

          {/* CTA Banner */}
          <div className="az-cta-banner">
            <p className="az-eyebrow" style={{ justifyContent: 'center' }}>READY TO START TRAINING?</p>
            <h3>Join the Best Gym in Sohana, Mohali Today</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 580, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Whether you are taking your first steps into fitness or pushing for peak athletic performance, Alpha Zone Gym gives you the facility and coaching to reach your potential.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919779333155?text=Hi%20Alpha%20Zone!%20I%20want%20to%20visit%20the%20gym%20in%20Sohana."
                target="_blank"
                rel="noreferrer"
                className="az-button"
              >
                Book a Free Gym Visit <ArrowUpRight size={18} />
              </a>
              <Link
                href="/gym-membership-mohali"
                className="az-button az-button-dark"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              >
                View Memberships
              </Link>
            </div>
          </div>
        </div>
      </article>
    </PageLayout>
  );
}
