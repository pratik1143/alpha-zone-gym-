import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs, getBlogPostingSchema, getFaqSchema } from '../../lib/blogs';
import { 
  Dumbbell, Target, Flame, Zap, Award, Activity, Heart, 
  MapPin, Phone, ArrowUpRight, CheckCircle2, ChevronRight, Sparkles, HelpCircle 
} from 'lucide-react';
import '../../components/blog.css';

const article = blogs[3]; // affordable-gym-in-mohali

export const metadata = getSEO({
  title: article.seoTitle,
  description: article.metaDescription,
  path: article.url,
  keywords: [article.primaryKeyword, ...article.secondaryKeywords],
  image: article.image,
  type: 'article'
});

export default function AffordableGymInMohaliPage() {
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
          <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Affordable Gym in Mohali</span>
        </nav>

        {/* Article Header */}
        <header className="az-article-header">
          <span className="az-blog-badge">{article.category}</span>
          <h1 className="az-article-title">
            Affordable Gym in Mohali: How to Find a Low-Cost Gym Without Compromising Your Workout
          </h1>
          <div className="az-article-meta-bar">
            <span>By <strong>{article.author}</strong></span>
            <span>•</span>
            <span>Published {article.publishedDate}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Value & Facilities Guide</span>
          </div>
        </header>

        {/* Featured Banner Image */}
        <div className="az-article-hero-image">
          <Image
            src={article.image}
            alt="Affordable Gym in Mohali - Alpha Zone Gym Quality Fitness"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className="object-cover"
          />
        </div>

        {/* Main Article Body */}
        <div className="az-article-content">
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.75, fontWeight: 500 }}>
            Searching for an <strong>affordable gym in Mohali</strong> does not mean you have to compromise on your fitness routine.
          </p>

          <p>
            For many people, gym membership cost is an important consideration. Students, working professionals, beginners, and people starting their fitness journey often look for a low-cost gym in Mohali that provides the equipment and training environment they need without making fitness unnecessarily expensive.
          </p>

          <p>
            The important thing is to compare what is included in a membership rather than looking at price alone. A truly affordable gym offers exceptional equipment, hygienic facilities, and knowledgeable trainer support at an accessible, transparent fee structure.
          </p>

          <div className="az-callout-box">
            <h3 className="az-callout-title">
              <Sparkles size={18} /> The Value Formula: Price vs Quality
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1' }}>
              Fitness shouldn&apos;t be expensive; it should be accessible to everyone. Look for gyms with modern imported machinery, full cardio decks, clean lockers, flexible monthly/quarterly plans, and zero hidden registration fees.
            </p>
          </div>

          <h2>What Makes a Gym Affordable?</h2>
          <p>
            An affordable gym should provide a reasonable balance between membership cost, facilities, equipment, location, and training options. Here are key factors to consider before joining:
          </p>

          <h3>1. Flexible Membership Options</h3>
          <p>
            Look for gyms that offer different membership durations and packages. Depending on your goals, a monthly membership may be suitable when you want flexibility, while longer memberships (3 months, 6 months, or 1 year) offer substantial discounts for individuals committed to a long-term fitness journey.
          </p>

          <h3>2. Equipment and Facilities</h3>
          <p>
            A low-cost gym should still provide the comprehensive equipment required for a proper workout. Look for facilities covering:
          </p>
          <ul>
            <li><Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Weight training</Link> and free weights (dumbbells up to 40+ kg, Olympic bars, bumper plates)</li>
            <li>Strength training (squat racks, power cages, cable crossovers, chest and leg presses)</li>
            <li>Cardio deck (treadmills, spin cycles, cross trainers, rowers)</li>
            <li><Link href="/functional-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Functional training</Link> turf (kettlebells, battle ropes, plyometric boxes, medicine balls)</li>
            <li><Link href="/hiit-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>HIIT</Link> conditioning and group workout areas</li>
            <li>Resistance machines targeting all major muscle groups</li>
          </ul>

          <h3>3. Convenient Location</h3>
          <p>
            An affordable gym that is too far from your home or workplace may not be practical. When factoring in travel time and fuel costs, a gym that is inconveniently located quickly loses its cost advantage.
          </p>
          <p>
            For people searching for an <strong>affordable gym near me in Mohali</strong>, location should be one of the first things to consider. <Link href="/" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Alpha Zone Gym</Link> is located on Landran Road in Sohana, Mohali, making it easily accessible for people living and working around Sohana, Sector 77, Sector 78, Sector 79, Landran, and Kharar.
          </p>

          <h2>Affordable Gym in Sohana, Mohali</h2>
          <p>
            If you are searching for a budget-friendly gym in Sohana, Alpha Zone Gym provides an extensive range of fitness and training options. The gym is designed for people with different fitness goals, whether you are beginning your workout journey or already have experience with weight training.
          </p>
          <p>At Alpha Zone Gym, you can focus on:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, margin: '20px 0 28px' }}>
            {['Muscle building', 'Strength development', 'Fat-loss training', 'General fitness', 'Cardiovascular fitness', 'Functional fitness', 'Conditioning', 'Personal training'].map((item, idx) => (
              <div key={idx} style={{ background: '#0c1113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="var(--az-lime, #e5fa19)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{item}</span>
              </div>
            ))}
          </div>

          <h2>Low-Cost Gym in Mohali for Beginners</h2>
          <p>
            Beginners often don&apos;t need complicated workout programs. A good, sustainable starting routine can focus on:
          </p>
          <ol>
            <li><strong>Learning correct exercise form:</strong> Mastering biomechanics before adding heavy resistance prevents injury.</li>
            <li><strong>Building basic strength:</strong> Establishing a foundation with squats, push-ups, rows, and core holds.</li>
            <li><strong>Developing workout consistency:</strong> Aiming for 3 to 4 days of workouts each week without missing sessions.</li>
            <li><strong>Adding cardio gradually:</strong> Incorporating 15–20 minutes of steady-state cardio to build stamina.</li>
            <li><strong>Improving mobility and conditioning:</strong> Dynamic stretching and functional bodyweight drills.</li>
            <li><strong>Increasing training intensity over time:</strong> Applying gradual progressive overload as fitness improves.</li>
          </ol>
          <p>
            If you are new to the gym, personal guidance from our on-floor coaches will help you understand how different equipment and exercises should be safely used.
          </p>

          <h2>Affordable Personal Training in Mohali</h2>
          <p>
            Some people prefer individual guidance rather than following a workout routine independently. <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Personal training in Mohali</Link> can be useful if you have a specific goal (e.g., rapid fat loss, wedding prep, muscle hypertrophy) or need help maintaining a structured training plan.
          </p>
          <p>
            At Alpha Zone Gym, affordable personal training packages can be combined with strength, conditioning, cardio, and functional workouts tailored directly to your fitness requirements.
          </p>

          <h2>Gym Programs at Alpha Zone Gym</h2>
          <p>
            Alpha Zone Gym offers several training options so members can choose workouts according to their individual goals:
          </p>
          <ul>
            <li><strong>Strength Training:</strong> Improve your strength through structured resistance and weight training.</li>
            <li><strong>Cardio:</strong> Include cardiovascular workouts as part of your overall fitness routine.</li>
            <li><strong>HIIT & Conditioning:</strong> High-intensity workouts designed to make training more dynamic and challenging.</li>
            <li><strong>Functional Fitness:</strong> Exercises focused on practical movement patterns, strength, balance, and conditioning.</li>
            <li><strong>Personal Training:</strong> Get individual guidance and a more structured approach to your fitness goals.</li>
            <li><strong>CrossFit Training:</strong> Functional, high-intensity workouts that combine different movements and training methods.</li>
          </ul>

          <h2>How to Choose an Affordable Gym in Mohali</h2>
          <p>
            Before joining any gym, evaluate these 5 essential questions:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '24px 0 32px' }}>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={18} color="var(--az-lime, #e5fa19)" /> Does the gym have the equipment I need?
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>Check whether the gym supports your preferred training style, from free weights and barbells to cardio machines and functional turf.</p>
            </div>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={18} color="var(--az-lime, #e5fa19)" /> Is the gym conveniently located?
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>A nearby gym on Landran Road makes regular morning or evening workouts far easier to maintain consistently.</p>
            </div>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={18} color="var(--az-lime, #e5fa19)" /> Are there suitable membership options?
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>Compare monthly and longer-term options according to your budget and commitment timeline without lock-in surprises.</p>
            </div>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={18} color="var(--az-lime, #e5fa19)" /> Does the gym offer training support?
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>If you are a beginner, trainer guidance on the floor is essential to correct form and build confidence.</p>
            </div>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={18} color="var(--az-lime, #e5fa19)" /> Is the workout environment comfortable?
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>The gym should be clean, well-ventilated, energized, and a space where you feel motivated to train every single day.</p>
            </div>
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
          <h2>Explore Alpha Zone Gym Services & Packages</h2>
          <p>Browse our affordable training programs and membership rates:</p>
          <div className="az-internal-pills">
            <Link href="/gym-membership-mohali" className="az-pill-link">
              <Sparkles size={14} /> Gym Membership
            </Link>
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
            <Link href="/contact-us" className="az-pill-link">
              <Phone size={14} /> Contact Us
            </Link>
          </div>

          {/* CTA Banner */}
          <div className="az-cta-banner">
            <p className="az-eyebrow" style={{ justifyContent: 'center' }}>START YOUR FITNESS JOURNEY</p>
            <h3>Start Your Fitness Journey at Alpha Zone Gym</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 620, margin: '0 auto 16px', lineHeight: 1.6 }}>
              If you are searching for an affordable gym in Mohali, low-cost gym in Mohali, or a gym near Sohana and Landran Road, Alpha Zone Gym offers multiple training options for different fitness goals.
            </p>
            <p style={{ fontSize: 14, color: 'var(--az-lime, #e5fa19)', fontWeight: 700, margin: '0 0 24px' }}>
              Your fitness journey starts with consistency — choose a gym that makes it easier to keep showing up.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919779333155?text=Hi%20Alpha%20Zone!%20I%20want%20details%20on%20affordable%20gym%20memberships."
                target="_blank"
                rel="noreferrer"
                className="az-button"
              >
                Inquire via WhatsApp <ArrowUpRight size={18} />
              </a>
              <Link
                href="/gym-membership-mohali"
                className="az-button az-button-dark"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Check Membership Rates
              </Link>
            </div>
            <p style={{ marginTop: 22, fontSize: 13, color: '#64748b' }}>
              Alpha Zone Gym: 2nd Floor, MNB Group, SCO 16–17, Landran Road, Sohana, Mohali • Phone: 097793 33155
            </p>
          </div>
        </div>
      </article>
    </PageLayout>
  );
}
