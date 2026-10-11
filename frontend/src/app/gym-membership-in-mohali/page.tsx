import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs, getBlogPostingSchema, getFaqSchema } from '../../lib/blogs';
import { 
  Dumbbell, Target, Flame, Zap, Award, Activity, 
  MapPin, Phone, ArrowUpRight, CheckCircle2, ChevronRight, Sparkles, HelpCircle, Calendar, ShieldCheck, Clock 
} from 'lucide-react';
import '../../components/blog.css';

const article = blogs[6]; // gym-membership-in-mohali

export const metadata = getSEO({
  title: article.seoTitle,
  description: article.metaDescription,
  path: article.url,
  keywords: [article.primaryKeyword, ...article.secondaryKeywords],
  image: article.image,
  type: 'article'
});

export default function GymMembershipInMohaliPage() {
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
          <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Gym Membership in Mohali</span>
        </nav>

        {/* Article Header */}
        <header className="az-article-header">
          <span className="az-blog-badge">{article.category}</span>
          <h1 className="az-article-title">
            Gym Membership in Mohali: How to Choose the Right Membership Plan
          </h1>
          <div className="az-article-meta-bar">
            <span>By <strong>{article.author}</strong></span>
            <span>•</span>
            <span>Published {article.publishedDate}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Membership & Fees Guide</span>
          </div>
        </header>

        {/* Featured Banner Image */}
        <div className="az-article-hero-image">
          <Image
            src={article.image}
            alt="Gym Membership in Mohali - Alpha Zone Gym Flexible Plans"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className="object-cover"
          />
        </div>

        {/* Main Article Body */}
        <div className="az-article-content">
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.75, fontWeight: 500 }}>
            Choosing a <strong>gym membership in Mohali</strong> is about much more than simply chasing the lowest price tag.
          </p>

          <p>
            The right plan should seamlessly fit your daily schedule, accommodate your training objectives, align with your commitment timeline, and grant full access to the equipment and recovery amenities you truly need to stay consistent.
          </p>

          <div className="az-callout-box">
            <h3 className="az-callout-title">
              <Sparkles size={18} /> The Membership Value Equation
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1' }}>
              The cheapest gym membership is not necessarily the best value if the facility is overcrowded, broken down, or inconveniently located. True value means state-of-the-art machinery, spotless hygiene, certified coaching guidance, and motivating energy every day.
            </p>
          </div>

          <h2>Monthly vs Long-Term Memberships</h2>
          <p>
            One of the first decisions you will face is deciding between month-to-month flexibility and the cost savings of longer-term packages:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, margin: '24px 0 32px' }}>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Clock size={20} color="var(--az-lime, #e5fa19)" />
                <h3 style={{ margin: 0, fontSize: 17, color: '#fff' }}>Monthly Memberships</h3>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                Ideal for beginners exploring the gym environment for the first time, temporary residents, or individuals with unpredictable schedules who value maximum flexibility without lock-in commitments.
              </p>
            </div>

            <div style={{ background: '#0e1416', border: '1px solid rgba(229,250,25,0.2)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Calendar size={20} color="var(--az-lime, #e5fa19)" />
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--az-lime, #e5fa19)' }}>Multi-Month & Annual Plans</h3>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                Perfect for committed fitness enthusiasts who already have an established routine. 3-month, 6-month, and 12-month packages offer significant per-month discounts and foster long-term accountability.
              </p>
            </div>
          </div>

          <h2>What Should a Comprehensive Gym Membership Include?</h2>
          <p>
            Before signing up, always verify exactly what privileges are bundled with your fee:
          </p>
          <ul>
            <li><strong>Full Floor Access:</strong> Unlimited entry to free weights, plate-loaded machinery, and selectorized resistance equipment.</li>
            <li><strong>Cardio Decks:</strong> Modern motorized treadmills, upright and recumbent cycles, cross-trainers, and rowers.</li>
            <li><strong>Functional Fitness Zones:</strong> Open turf, kettlebells, medicine balls, battle ropes, and plyometric boxes.</li>
            <li><strong>Clean Amenities:</strong> Secure locker facilities, hygienic changing areas, and purified water stations.</li>
            <li><strong>Initial Fitness Assessment:</strong> Body composition analysis and baseline goal-setting with on-floor trainers.</li>
            <li><strong>Clarify Add-Ons:</strong> Confirm whether one-on-one <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>personal training</Link> or specialized classes require separate packages.</li>
          </ul>

          <h2>Consider Your Training Goals</h2>
          <p>
            Different fitness ambitions demand different training environments:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, margin: '20px 0 28px' }}>
            {[
              'Heavy Strength Training: Power racks, Olympic bars & bumper plates',
              'Fat Loss & Conditioning: HIIT equipment, turf drills & rowers',
              'Functional Athleticism: Kettlebells, battle ropes & sleds',
              'Muscle Hypertrophy: Pin-loaded machines & full dumbbell racks',
              'CrossFit Conditioning: High-intensity multi-joint athletic circuits',
              'Personal Guidance: Dedicated 1-on-1 coaching consultations'
            ].map((item, idx) => (
              <div key={idx} style={{ background: '#0c1113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="var(--az-lime, #e5fa19)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{item}</span>
              </div>
            ))}
          </div>

          <p>
            If you plan to focus on <Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>weight training</Link>, ensure there is adequate barbell and bench capacity. If you love variety, look for access to cardio, <Link href="/functional-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>functional training</Link>, <Link href="/hiit-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>HIIT</Link>, or <Link href="/crossfit-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>CrossFit</Link>.
          </p>

          <h2>Why Location Matters for Consistency</h2>
          <p>
            When searching for a <strong>gym membership near me</strong> in Mohali, geographical proximity is one of the highest predictors of workout adherence. A club located far away often leads to skipped workouts due to evening rush hour traffic.
          </p>
          <p>
            For those seeking a <strong>gym membership in Sohana</strong> or along Landran Road, finding a centre right along your daily transit makes stopping by for a 60-minute session convenient and stress-free.
          </p>

          <div className="az-callout-box" style={{ borderColor: 'rgba(229,250,25,0.25)' }}>
            <h3 className="az-callout-title" style={{ color: 'var(--az-lime, #e5fa19)' }}>
              <MapPin size={18} /> Alpha Zone Gym Location
            </h3>
            <p style={{ margin: '8px 0 4px', fontSize: 15, color: '#f1f5f9' }}>
              <strong>2nd Floor, MNB Group, SCO 16–17, Landran Road, Sohana, Mohali, Punjab 140308</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Directly accessible from Sohana, Sector 77, Sector 78, Sector 79, Landran, and Kharar with ample reserved member parking.
            </p>
          </div>

          <h2>Compare Overall Membership Value</h2>
          <p>
            An <strong>affordable gym membership in Mohali</strong> should never compromise on sanitation, equipment safety, or air conditioning. Evaluate:
          </p>
          <ol>
            <li><strong>Equipment Quality & Maintenance:</strong> Are cables smooth, pulleys inspected, and weights systematically racked?</li>
            <li><strong>Facility Cleanliness:</strong> Are gym surfaces and locker rooms sanitized around the clock?</li>
            <li><strong>Floor Coaching Support:</strong> Are friendly trainers available on the gym floor to advise on safe biomechanics?</li>
            <li><strong>Opening Hours:</strong> Does the gym open early morning and stay open late evening 7 days a week?</li>
          </ol>

          <h2>Alpha Zone Gym Membership Plans</h2>
          <p>
            Alpha Zone Gym currently lists monthly, three-month, six-month, and twelve-month membership options on its website to accommodate different budgets and fitness timelines:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, margin: '24px 0 32px' }}>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22, textAlign: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>1 Month</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: 20, color: '#fff' }}>Monthly Plan</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Try the Zone with zero long-term commitment.</p>
            </div>

            <div style={{ background: '#0e1416', border: '1px solid var(--az-lime, #e5fa19)', borderRadius: 16, padding: 22, textAlign: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--az-lime, #e5fa19)', textTransform: 'uppercase', letterSpacing: 1 }}>3 Months • Popular</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: 20, color: '#fff' }}>Quarterly Plan</h3>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>Best value for achieving real physical transformation.</p>
            </div>

            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22, textAlign: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>6 Months</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: 20, color: '#fff' }}>Semi-Annual Plan</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Serious consistency for noticeable muscle and stamina gains.</p>
            </div>

            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22, textAlign: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>12 Months</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: 20, color: '#fff' }}>Annual Plan</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Maximum overall savings for dedicated athletes.</p>
            </div>
          </div>

          <p>
            All listed plans include unlimited gym access, complete cardio and weight equipment, locker room privileges, and an initial fitness assessment. Be sure to confirm current pricing, seasonal discounts, and terms directly with the reception desk before joining.
          </p>

          <h2>Who Should Choose a Longer Membership?</h2>
          <p>
            A multi-month or annual membership makes tremendous sense if you have an established daily routine and intend to train year-round. It locks in the lowest per-month rate and psychologically cements your commitment.
          </p>
          <p>
            However, if you anticipate relocations, seasonal travel, or want to test your consistency first, starting with a 1-month or 3-month package is the most sensible approach.
          </p>

          <h2>Conclusion</h2>
          <p>
            The best gym membership in Mohali is the one that fits your goals, budget, schedule, and preferred training style. By evaluating equipment variety, coaching support, and location along Landran Road in Sohana, you can invest in a fitness routine that lasts.
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
          <p>Discover our specialized training programs and membership rates:</p>
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
            <Link href="/contact-us" className="az-pill-link">
              <Phone size={14} /> Contact Us
            </Link>
          </div>

          {/* CTA Banner */}
          <div className="az-cta-banner">
            <p className="az-eyebrow" style={{ justifyContent: 'center' }}>START YOUR MEMBERSHIP TODAY</p>
            <h3>Ready to Join Alpha Zone Gym in Mohali?</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 620, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Whether you want a flexible 1-month plan or our cost-saving quarterly and annual memberships, start your fitness journey in our world-class Sohana facility today.
            </p>
            <p style={{ fontSize: 14, color: 'var(--az-lime, #e5fa19)', fontWeight: 700, margin: '0 0 24px' }}>
              Connect with our front desk team on WhatsApp for current offers and membership enrollment.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919779333155?text=Hi%20Alpha%20Zone!%20I%20want%20to%20know%20more%20about%20gym%20membership%20plans."
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
                View Membership Plans
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
