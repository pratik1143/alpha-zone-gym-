import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs, getBlogPostingSchema, getFaqSchema } from '../../lib/blogs';
import { 
  Dumbbell, Target, Flame, Zap, Award, Activity, 
  MapPin, Phone, ArrowUpRight, CheckCircle2, ChevronRight, Sparkles, HelpCircle, Heart, Timer, RefreshCw 
} from 'lucide-react';
import '../../components/blog.css';

const article = blogs[7]; // hiit-training-in-mohali

export const metadata = getSEO({
  title: article.seoTitle,
  description: article.metaDescription,
  path: article.url,
  keywords: [article.primaryKeyword, ...article.secondaryKeywords],
  image: article.image,
  type: 'article'
});

export default function HiitTrainingInMohaliPage() {
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
          <span style={{ color: 'var(--az-lime, #e5fa19)' }}>HIIT Training in Mohali</span>
        </nav>

        {/* Article Header */}
        <header className="az-article-header">
          <span className="az-blog-badge">{article.category}</span>
          <h1 className="az-article-title">
            HIIT Training in Mohali: Benefits, Beginner Workouts and Fitness Tips
          </h1>
          <div className="az-article-meta-bar">
            <span>By <strong>{article.author}</strong></span>
            <span>•</span>
            <span>Published {article.publishedDate}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Cardio & Conditioning Guide</span>
          </div>
        </header>

        {/* Featured Banner Image */}
        <div className="az-article-hero-image">
          <Image
            src={article.image}
            alt="HIIT Training in Mohali - Alpha Zone High Intensity Interval Training"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className="object-cover"
          />
        </div>

        {/* Main Article Body */}
        <div className="az-article-content">
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.75, fontWeight: 500 }}>
            <strong>HIIT training in Mohali</strong> has become one of the most popular training modalities for people who want maximum cardiovascular conditioning in minimum time.
          </p>

          <p>
            High-Intensity Interval Training (HIIT) alternates short bursts of challenging, near-maximal effort with defined periods of lower-intensity recovery or complete rest. It provides an exceptionally efficient way to elevate stamina, accelerate calorie burn, and push personal fitness boundaries when programmed appropriately for your body.
          </p>

          <div className="az-callout-box">
            <h3 className="az-callout-title">
              <Sparkles size={18} /> The Power of Intervals
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1' }}>
              Unlike steady-state cardio, interval training triggers the EPOC effect (Excess Post-Exercise Oxygen Consumption), continuing to burn elevated calories for hours post-session while preserving lean muscle mass.
            </p>
          </div>

          <h2>What Is HIIT?</h2>
          <p>
            A typical HIIT session revolves around work-to-rest ratios—for example, 30 seconds of high-output exertion followed by 30 to 45 seconds of active recovery.
          </p>
          <p>
            Depending on your fitness level, session durations usually range between 20 and 45 minutes. The interval ratios, exercise selections, and resistance levels are customized according to your current conditioning and targets.
          </p>

          <h2>Benefits of HIIT Training</h2>
          <p>
            Integrating <Link href="/hiit-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>HIIT training</Link> into your weekly workout split delivers substantial cardiovascular and metabolic benefits:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, margin: '20px 0 28px' }}>
            {[
              'Time-Efficient 30-Minute Workouts',
              'Enhanced Aerobic & Anaerobic Stamina',
              'Accelerated Metabolic Caloric Burn',
              'Improved Insulin Sensitivity',
              'Variety That Banishes Workout Boredom',
              'Preserves Lean Muscle Mass'
            ].map((item, idx) => (
              <div key={idx} style={{ background: '#0c1113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="var(--az-lime, #e5fa19)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{item}</span>
              </div>
            ))}
          </div>

          <p>
            HIIT complements traditional <Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>weight training</Link> and <Link href="/functional-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>functional training</Link> by developing high-speed energy systems that translate into better performance across all athletic movements.
          </p>

          <h2>HIIT for Beginners: How to Start Safely</h2>
          <p>
            Beginners should not rush into all-out sprinting or complex plyometric jumps. Pushing straight to maximum heart rates without foundational conditioning increases joint soreness and fatigue.
          </p>
          <p>
            Instead, start with generous recovery periods (such as a 1:2 or 1:3 work-to-rest ratio—e.g., 20 seconds work, 40 to 60 seconds rest). Master low-impact bodyweight patterns first, ensuring joint alignment before increasing movement speed or resistance. A trainer can help calibrate the interval timer and supervise your technique.
          </p>

          <h2>Examples of HIIT Exercises</h2>
          <p>
            Depending on your fitness level and physical preferences, HIIT routines utilize a wide variety of tools and movement patterns:
          </p>
          <ul>
            <li><strong>Cardio Ergometers:</strong> Upright spin cycle sprints, air bikes (assault bikes), and Concept2 rowing machine intervals.</li>
            <li><strong>Functional Tools:</strong> Alternating battle rope waves, kettlebell swings, and medicine ball slams.</li>
            <li><strong>Bodyweight Drills:</strong> Controlled air squats, mountain climbers, step-ups, and bear crawls.</li>
            <li><strong>Agility & Plyometrics:</strong> Skater jumps, jumping lunges, and low-impact lateral shuffles.</li>
          </ul>

          <h2>Sample Beginner HIIT Workout Routine</h2>
          <p>
            Here is a safe, introductory 20-minute interval circuit you can try on the functional turf:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, margin: '20px 0 28px' }}>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 800, color: 'var(--az-lime, #e5fa19)', fontSize: 13, marginBottom: 4 }}>INTERVAL 1</div>
              <h4 style={{ margin: '0 0 6px', color: '#fff', fontSize: 16 }}>Bodyweight Squats</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>30s work • 30s rest. Focus on smooth depth and posture.</p>
            </div>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 800, color: 'var(--az-lime, #e5fa19)', fontSize: 13, marginBottom: 4 }}>INTERVAL 2</div>
              <h4 style={{ margin: '0 0 6px', color: '#fff', fontSize: 16 }}>Battle Rope Waves</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>30s work • 30s rest. Maintain athletic stance and braced core.</p>
            </div>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 800, color: 'var(--az-lime, #e5fa19)', fontSize: 13, marginBottom: 4 }}>INTERVAL 3</div>
              <h4 style={{ margin: '0 0 6px', color: '#fff', fontSize: 16 }}>Air Bike / Spin Sprint</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>30s work • 30s rest. Drive through pedals with steady cadence.</p>
            </div>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 800, color: 'var(--az-lime, #e5fa19)', fontSize: 13, marginBottom: 4 }}>INTERVAL 4</div>
              <h4 style={{ margin: '0 0 6px', color: '#fff', fontSize: 16 }}>Mountain Climbers</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>30s work • 60s full rest. Complete 3 to 4 rounds total.</p>
            </div>
          </div>

          <h2>HIIT for Weight Management</h2>
          <p>
            While a <strong>HIIT workout in Mohali</strong> offers an incredible calorie burn, interval training is not a magic standalone bullet for weight loss. Sustainable body transformation requires a cohesive lifestyle:
          </p>
          <p>
            Pair your HIIT sessions with consistent resistance training, protein-rich whole food nutrition, adequate daily hydration, and 7 to 8 hours of restorative sleep.
          </p>

          <h2>HIIT vs Traditional Cardio: Which Is Better?</h2>
          <p>
            Traditional steady-state cardio (such as jogging or cycling at an even pace for 45 minutes) builds aerobic endurance and is gentle on the central nervous system. HIIT, conversely, challenges anaerobic capacity and produces rapid conditioning spikes in shorter periods.
          </p>
          <p>
            Neither is universally superior; a balanced fitness plan often combines 1 to 2 HIIT sessions with steady cardio and structured strength training.
          </p>

          <h2>How Often Should You Do HIIT?</h2>
          <p>
            Because true HIIT is intensely demanding on the nervous and muscular systems, more is not necessarily better. For most individuals:
          </p>
          <ul>
            <li><strong>Beginners:</strong> 1 to 2 sessions per week with at least 48 hours of recovery between workouts.</li>
            <li><strong>Intermediate / Advanced:</strong> 2 to 3 sessions per week integrated alongside regular strength training splits.</li>
          </ul>

          <h2>HIIT Near Sohana and Landran Road</h2>
          <p>
            If you are searching for <strong>HIIT near me</strong> or a <strong>HIIT gym near me</strong> in Mohali, <Link href="/" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Alpha Zone Gym</Link> is conveniently located on Landran Road in Sohana.
          </p>
          <p>
            The gym provides open turf, cardio decks, rowing machines, and assault bikes, as well as coach-led interval training alongside <Link href="/crossfit-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>CrossFit</Link>, weight lifting, and one-on-one <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>personal training</Link>.
          </p>

          <div className="az-callout-box" style={{ borderColor: 'rgba(229,250,25,0.25)' }}>
            <h3 className="az-callout-title" style={{ color: 'var(--az-lime, #e5fa19)' }}>
              <MapPin size={18} /> Alpha Zone Gym Location
            </h3>
            <p style={{ margin: '8px 0 4px', fontSize: 15, color: '#f1f5f9' }}>
              <strong>2nd Floor, MNB Group, SCO 16–17, Landran Road, Sohana, Mohali, Punjab 140308</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Directly accessible for commuters across Sohana, Sector 77, Sector 78, Sector 79, Landran, and Kharar with convenient dedicated parking.
            </p>
          </div>

          <h2>Conclusion</h2>
          <p>
            If you are looking for high-intensity interval training in Mohali, choose a gym with imported conditioning equipment, certified coaching oversight, and a supportive environment where intensity can always be tailored to your current fitness level.
          </p>

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
          <h2>Explore Gym Services & Training Programs</h2>
          <p>Browse our diverse fitness programs and membership rates:</p>
          <div className="az-internal-pills">
            <Link href="/gym-services" className="az-pill-link">
              <Dumbbell size={14} /> Gym Services
            </Link>
            <Link href="/personal-training-mohali" className="az-pill-link">
              <Target size={14} /> Personal Training
            </Link>
            <Link href="/crossfit-mohali" className="az-pill-link">
              <Flame size={14} /> CrossFit
            </Link>
            <Link href="/weight-training-mohali" className="az-pill-link">
              <Activity size={14} /> Weight Training
            </Link>
            <Link href="/functional-training-mohali" className="az-pill-link">
              <Zap size={14} /> Functional Training
            </Link>
            <Link href="/hiit-training-mohali" className="az-pill-link">
              <Award size={14} /> HIIT Training
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
            <p className="az-eyebrow" style={{ justifyContent: 'center' }}>IGNITE YOUR METABOLISM</p>
            <h3>Ready to Experience HIIT at Alpha Zone Gym?</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 620, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Push your endurance, build metabolic conditioning, and burn calories in our energetic group sessions on Landran Road, Sohana.
            </p>
            <p style={{ fontSize: 14, color: 'var(--az-lime, #e5fa19)', fontWeight: 700, margin: '0 0 24px' }}>
              Connect with our coaches on WhatsApp and book your introductory HIIT session today.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919779333155?text=Hi%20Alpha%20Zone!%20I%20am%20interested%20in%20HIIT%20training%20in%20Mohali."
                target="_blank"
                rel="noreferrer"
                className="az-button"
              >
                Inquire on WhatsApp <ArrowUpRight size={18} />
              </a>
              <Link
                href="/gym-membership-mohali"
                className="az-button az-button-dark"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              >
                View Memberships
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
