import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs, getBlogPostingSchema, getFaqSchema } from '../../lib/blogs';
import { 
  Dumbbell, Target, Flame, Zap, Award, Activity, 
  MapPin, Phone, ArrowUpRight, CheckCircle2, ChevronRight, Sparkles, HelpCircle, UserCheck 
} from 'lucide-react';
import '../../components/blog.css';

const article = blogs[4]; // personal-trainer-in-mohali

export const metadata = getSEO({
  title: article.seoTitle,
  description: article.metaDescription,
  path: article.url,
  keywords: [article.primaryKeyword, ...article.secondaryKeywords],
  image: article.image,
  type: 'article'
});

export default function PersonalTrainerInMohaliPage() {
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
          <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Personal Trainer in Mohali</span>
        </nav>

        {/* Article Header */}
        <header className="az-article-header">
          <span className="az-blog-badge">{article.category}</span>
          <h1 className="az-article-title">
            Personal Trainer in Mohali: Is Personal Training Worth It?
          </h1>
          <div className="az-article-meta-bar">
            <span>By <strong>{article.author}</strong></span>
            <span>•</span>
            <span>Published {article.publishedDate}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span style={{ color: 'var(--az-lime, #e5fa19)' }}>1-on-1 Coaching & Fitness Guide</span>
          </div>
        </header>

        {/* Featured Banner Image */}
        <div className="az-article-hero-image">
          <Image
            src={article.image}
            alt="Personal Trainer in Mohali - Alpha Zone Gym 1-on-1 Coaching"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className="object-cover"
          />
        </div>

        {/* Main Article Body */}
        <div className="az-article-content">
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.75, fontWeight: 500 }}>
            Finding the right <strong>personal trainer in Mohali</strong> can make your workouts more structured, focused and easier to follow.
          </p>

          <p>
            Whether you are a beginner stepping into a gym for the first time, returning after a long hiatus, or working toward a specific fitness milestone, one-to-one coaching provides the expert guidance and daily accountability needed to achieve real, lasting results.
          </p>

          <p>
            Many gym-goers struggle with direction—spending months doing random exercises without seeing measurable changes. Working with a dedicated coach ensures every repetition, exercise selection, and recovery cycle aligns with your body&apos;s unique physiology.
          </p>

          <div className="az-callout-box">
            <h3 className="az-callout-title">
              <Sparkles size={18} /> The Coaching Advantage
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1' }}>
              A personal trainer does not simply count your reps—they assess your movement mechanics, eliminate injury risks, personalize your training volume, and keep you disciplined when motivation wanes.
            </p>
          </div>

          <h2>What Does a Personal Trainer Do?</h2>
          <p>
            A personal trainer helps you structure workouts around your specific goals, demonstrates correct exercise execution, guides biomechanical technique, and systematically adjusts your training as you progress.
          </p>
          <p>
            Rather than handing out generic workout templates, a qualified coach understands your current physical conditioning, identifies mobility restrictions or muscular imbalances, and builds a practical, progressive routine that fits your lifestyle and schedule.
          </p>

          <h2>Benefits of Personal Training</h2>
          <p>
            Investing in <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>personal training in Mohali</Link> provides numerous advantages over exercising on your own:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, margin: '20px 0 28px' }}>
            {[
              'Correct Exercise Form & Safety',
              'Consistent Workout Accountability',
              'Systematic Progressive Overload',
              'Goal-Specific Exercise Selection',
              'Faster, Measurable Results',
              'Injury Prevention & Mobility Care'
            ].map((item, idx) => (
              <div key={idx} style={{ background: '#0c1113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="var(--az-lime, #e5fa19)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{item}</span>
              </div>
            ))}
          </div>

          <p>
            Personal training can help improve exercise technique, workout consistency, progression and accountability. It is particularly valuable when you are unsure how to use commercial gym equipment or how to structure <Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>weight training</Link>, cardio and conditioning sessions effectively.
          </p>

          <h2>Personal Training for Beginners</h2>
          <p>
            Walking onto a gym floor with dozens of machines, cables, and free weights can feel overwhelming. Beginners benefit greatly from learning foundational movement patterns—such as the hip hinge, squat, push, pull, and core bracing—under professional supervision.
          </p>
          <p>
            By starting with manageable resistance and gradually progressing, beginner personal training builds self-confidence, prevents early injuries, and transforms fitness into a sustainable long-term lifestyle.
          </p>

          <h2>Personal Training for Weight Loss</h2>
          <p>
            For weight-management goals, a trainer can combine strength training, cardio and conditioning into a structured routine. Resistance training preserves lean muscle tissue while burning calories, keeping your metabolic rate elevated.
          </p>
          <p>
            A comprehensive weight loss program combines resistance work, <Link href="/hiit-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>HIIT training</Link>, and <Link href="/functional-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>functional training</Link> backed by supportive daily nutrition, restful recovery, and realistic behavioral habits.
          </p>

          <h2>Personal Training for Strength and Muscle Building</h2>
          <p>
            If your primary objective is strength or muscle development (hypertrophy), a coach organizes your exercise sequence, sets, repetitions, and rest periods.
          </p>
          <p>
            Applying gradual increases in training demand—known as progressive overload—while executing flawless barbell, dumbbell, and machine technique is vital for muscle growth without joint strain.
          </p>

          <h2>How to Choose a Personal Trainer in Mohali</h2>
          <p>
            When searching for the <strong>best personal trainer in Mohali</strong>, consider these key evaluation points:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '24px 0 32px' }}>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={18} color="var(--az-lime, #e5fa19)" /> Certification & Experience
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                Ensure your trainer holds verified fitness certifications and has proven experience coaching individuals with goals similar to yours.
              </p>
            </div>

            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={18} color="var(--az-lime, #e5fa19)" /> Clear Communication Style
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                A great trainer explains why an exercise is chosen, communicates cues clearly, listens to your physical feedback, and adjusts the workout on the fly.
              </p>
            </div>

            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={18} color="var(--az-lime, #e5fa19)" /> Structured Programming Approach
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                Avoid trainers who make up workouts on the spot. Look for coaches who document your progress, manage training volume, and track strength gains week by week.
              </p>
            </div>

            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} color="var(--az-lime, #e5fa19)" /> Proximity & Accessibility
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                Consistency is key. Choosing a trainer at an accessible gym near Sohana and Landran Road makes it easy to attend scheduled sessions regularly.
              </p>
            </div>
          </div>

          <h2>Personal Trainer Near Sohana and Landran Road</h2>
          <p>
            If you are searching for a <strong>personal trainer near me</strong> in the Mohali area, <Link href="/" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Alpha Zone Gym</Link> is conveniently located at MNB Group, SCO 16-17, Landran Road, Sohana, Mohali.
          </p>
          <p>
            The gym offers individualized personal training alongside world-class strength training equipment, imported cardio decks, <Link href="/crossfit-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>CrossFit</Link>, functional training, and high-intensity interval conditioning.
          </p>

          <div className="az-callout-box" style={{ borderColor: 'rgba(229,250,25,0.25)' }}>
            <h3 className="az-callout-title" style={{ color: 'var(--az-lime, #e5fa19)' }}>
              <MapPin size={18} /> Training Facility Location
            </h3>
            <p style={{ margin: '8px 0 4px', fontSize: 15, color: '#f1f5f9' }}>
              <strong>Alpha Zone Gym: 2nd Floor, MNB Group, SCO 16–17, Landran Road, Sohana, Mohali, Punjab 140308</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Easily accessible for residents and commuters across Sohana, Sector 77, Sector 78, Sector 79, Landran, and Kharar.
            </p>
          </div>

          <h2>Conclusion: Is Personal Training Worth It?</h2>
          <p>
            If you are searching for a personal trainer in Mohali, choose someone who can provide structured training, clear guidance and a program that fits your specific goals. Personal training saves you months of trial-and-error, prevents preventable injuries, and instills lifelong fitness discipline.
          </p>
          <p>
            Alpha Zone Gym offers dedicated one-to-one personal training at its modern Sohana, Mohali facility.
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
          <p>Discover our training disciplines and coaching programs at Alpha Zone Gym:</p>
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
            <p className="az-eyebrow" style={{ justifyContent: 'center' }}>START 1-ON-1 COACHING</p>
            <h3>Ready to Train With an Expert Coach?</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 620, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Whether your goal is rapid fat loss, lean muscle development, or learning safe lifting technique, our certified trainers are ready to guide you step-by-step.
            </p>
            <p style={{ fontSize: 14, color: 'var(--az-lime, #e5fa19)', fontWeight: 700, margin: '0 0 24px' }}>
              Book your personal training consultation and experience the Alpha Zone difference.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919779333155?text=Hi%20Alpha%20Zone!%20I%20am%20interested%20in%20Personal%20Training%20in%20Mohali."
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
