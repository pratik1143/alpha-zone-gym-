import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs, getBlogPostingSchema, getFaqSchema } from '../../lib/blogs';
import { 
  Dumbbell, Target, Flame, Zap, Award, Activity, 
  MapPin, Phone, ArrowUpRight, CheckCircle2, ChevronRight, Sparkles, HelpCircle, Layers, ShieldCheck 
} from 'lucide-react';
import '../../components/blog.css';

const article = blogs[5]; // crossfit-gym-in-mohali

export const metadata = getSEO({
  title: article.seoTitle,
  description: article.metaDescription,
  path: article.url,
  keywords: [article.primaryKeyword, ...article.secondaryKeywords],
  image: article.image,
  type: 'article'
});

export default function CrossFitGymInMohaliPage() {
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
          <span style={{ color: 'var(--az-lime, #e5fa19)' }}>CrossFit Gym in Mohali</span>
        </nav>

        {/* Article Header */}
        <header className="az-article-header">
          <span className="az-blog-badge">{article.category}</span>
          <h1 className="az-article-title">
            CrossFit Gym in Mohali: Benefits, Workouts and How to Get Started
          </h1>
          <div className="az-article-meta-bar">
            <span>By <strong>{article.author}</strong></span>
            <span>•</span>
            <span>Published {article.publishedDate}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Functional Fitness & Conditioning Guide</span>
          </div>
        </header>

        {/* Featured Banner Image */}
        <div className="az-article-hero-image">
          <Image
            src={article.image}
            alt="CrossFit Gym in Mohali - Alpha Zone High Intensity Functional Training"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className="object-cover"
          />
        </div>

        {/* Main Article Body */}
        <div className="az-article-content">
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.75, fontWeight: 500 }}>
            CrossFit-style training combines strength, conditioning and varied functional movements into high-energy workouts that prepare you for any physical challenge.
          </p>

          <p>
            If you are looking for a <strong>CrossFit gym in Mohali</strong>, you are likely looking for workouts that go beyond monotonous treadmill sessions or standard machine circuits. CrossFit delivers an engaging, athletically demanding experience tailored to developing multiple aspects of physical fitness under one roof.
          </p>

          <div className="az-callout-box">
            <h3 className="az-callout-title">
              <Sparkles size={18} /> The Core Philosophy of CrossFit
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1' }}>
              Constantly varied, functional movements performed at relatively high intensity. Every workout tests your endurance, strength, agility, and mental tenacity within an encouraging community setting.
            </p>
          </div>

          <h2>What Is CrossFit Training?</h2>
          <p>
            CrossFit uses a strategic mixture of multi-joint functional movements such as weightlifting, squatting, pressing, pulling, sprinting, rowing, and bodyweight gymnastics.
          </p>
          <p>
            The hallmark of CrossFit is scalability: whether you are an experienced lifter or stepping into a fitness centre for the first time, workouts can be scaled in weight, volume, and movement complexity to match your current experience and fitness level.
          </p>

          <h2>Benefits of CrossFit Training</h2>
          <p>
            Regular <Link href="/crossfit-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>CrossFit training in Mohali</Link> creates comprehensive athletic adaptations rather than isolating muscles in isolation:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, margin: '20px 0 28px' }}>
            {[
              'Full-Body Functional Strength',
              'Enhanced Cardiovascular Stamina',
              'Agility, Speed & Coordination',
              'High Caloric Expenditure',
              'Increased Work Capacity & Grit',
              'Dynamic & Non-Repetitive Sessions'
            ].map((item, idx) => (
              <div key={idx} style={{ background: '#0c1113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="var(--az-lime, #e5fa19)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{item}</span>
              </div>
            ))}
          </div>

          <p>
            CrossFit helps develop cardiovascular fitness, coordination, stamina, and movement efficiency. The sheer variety of workouts (Workouts of the Day / WODs) keeps motivation high and banishes workout boredom.
          </p>

          <h2>CrossFit for Beginners</h2>
          <p>
            A common misconception is that you must already be fit to start CrossFit. In reality, beginners should prioritize movement mechanics and form mastery before adding heavy loads or chasing higher intensity.
          </p>
          <p>
            At Alpha Zone Gym, certified coaches break down technical lifts into progressive drills. Exercises are readily modified—for example, substituting box step-ups for box jumps, or using resistance bands for pull-ups—ensuring every beginner trains safely and progressively.
          </p>

          <h2>Common CrossFit Movements</h2>
          <p>
            A well-rounded CrossFit program integrates diverse exercises across gymnastics, metabolic conditioning, and weightlifting:
          </p>
          <ul>
            <li><strong>Olympic Lifting & Free Weights:</strong> Clean and jerks, snatches, power cleans, push presses, and deadlifts using Olympic barbells and bumper plates.</li>
            <li><strong>Functional Strength:</strong> Goblet squats, kettlebell swings, wall balls, and dumbbell snatches.</li>
            <li><strong>Gymnastics & Bodyweight:</strong> Pull-ups, push-ups, dips, burpees, box jumps, and core hollow holds.</li>
            <li><strong>Conditioning Drills:</strong> Concept2 rowing, ski ergometers, air bikes, and short high-intensity sprints.</li>
          </ul>

          <h2>CrossFit vs Traditional Gym Training</h2>
          <p>
            Understanding the distinction between traditional gym workouts and CrossFit helps you pick the right training methodology for your personal targets:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, margin: '24px 0 32px' }}>
            <div style={{ background: '#0e1416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Dumbbell size={20} color="var(--az-lime, #e5fa19)" />
                <h3 style={{ margin: 0, fontSize: 17, color: '#fff' }}>Traditional Gym Training</h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
                <li>Focuses on isolated muscle groups (e.g. chest day, leg day).</li>
                <li>Ideal for targeted muscle hypertrophy or powerlifting.</li>
                <li>Longer rests between sets for maximum mechanical tension.</li>
                <li>Follows consistent, predictable workout splits.</li>
              </ul>
            </div>

            <div style={{ background: '#0e1416', border: '1px solid rgba(229,250,25,0.2)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Flame size={20} color="var(--az-lime, #e5fa19)" />
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--az-lime, #e5fa19)' }}>CrossFit Training</h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
                <li>Blends multiple physical qualities in a single high-octane session.</li>
                <li>Builds athletic stamina, agility, and overall work capacity.</li>
                <li>Higher cardiovascular demand and metabolic conditioning.</li>
                <li>Daily variation prevents training plateaus.</li>
              </ul>
            </div>
          </div>

          <p>
            Neither methodology is inherently superior; the best option depends on your specific lifestyle and goals. At Alpha Zone Gym, you don&apos;t have to choose just one—you can combine <Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>weight training</Link> and CrossFit in your weekly routine.
          </p>

          <h2>CrossFit and Weight Loss</h2>
          <p>
            CrossFit-style conditioning is one of the most effective tools for burning calories and stimulating metabolic rate through excess post-exercise oxygen consumption (EPOC).
          </p>
          <p>
            For sustainable fat loss, high-intensity workouts should always be paired with adequate protein intake, mindful nutrition, hydration, and quality sleep to allow muscle tissue to recover and rebuild.
          </p>

          <h2>CrossFit Near Sohana and Landran Road</h2>
          <p>
            For fitness enthusiasts searching for a <strong>CrossFit gym near me</strong> or <strong>CrossFit near Sohana and Landran Road</strong>, Alpha Zone Gym provides a specialized training floor featuring functional rigs, bumper plates, Olympic barbells, kettlebells, and conditioning turf.
          </p>
          <p>
            Alongside CrossFit, members have full access to heavy strength equipment, cardio machines, <Link href="/functional-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>functional training</Link>, <Link href="/hiit-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>HIIT</Link>, and one-on-one <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>personal training</Link>.
          </p>

          <div className="az-callout-box" style={{ borderColor: 'rgba(229,250,25,0.25)' }}>
            <h3 className="az-callout-title" style={{ color: 'var(--az-lime, #e5fa19)' }}>
              <MapPin size={18} /> Alpha Zone Gym Location
            </h3>
            <p style={{ margin: '8px 0 4px', fontSize: 15, color: '#f1f5f9' }}>
              <strong>2nd Floor, MNB Group, SCO 16–17, Landran Road, Sohana, Mohali, Punjab 140308</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Conveniently located for athletes and fitness enthusiasts from Sohana, Sector 77, Sector 78, Sector 79, Landran, and Kharar with dedicated on-site parking.
            </p>
          </div>

          <h2>How to Get Started with CrossFit</h2>
          <p>
            Ready to test your limits? Follow these simple steps to begin your CrossFit journey:
          </p>
          <ol>
            <li><strong>Attend a Consultation:</strong> Discuss your current fitness history, past injuries, and goals with our coaching team.</li>
            <li><strong>Master the Fundamentals:</strong> Learn proper biomechanics on fundamental lifts before loading heavy weights on the bar.</li>
            <li><strong>Scale Every Workout:</strong> Check your ego at the door; scale the weights and volume so you complete workouts with crisp technique.</li>
            <li><strong>Prioritize Recovery:</strong> Allow your muscles and central nervous system to adapt through adequate rest, hydration, and stretching.</li>
            <li><strong>Commit to Consistency:</strong> Aim for 3 to 4 sessions weekly. Consistent effort yields noticeable cardiovascular and strength gains within weeks.</li>
          </ol>

          <h2>Conclusion</h2>
          <p>
            If you are searching for a CrossFit gym in Mohali, look for coaching quality, an encouraging training environment, proper equipment, and the willingness of trainers to scale movements to your individual abilities.
          </p>
          <p>
            Alpha Zone Gym provides the ideal platform to challenge yourself, build full-body athletic power, and transform your fitness.
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
          <p>Explore our complete training programs and membership plans at Alpha Zone Gym:</p>
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
            <p className="az-eyebrow" style={{ justifyContent: 'center' }}>LEVEL UP YOUR FITNESS</p>
            <h3>Ready to Experience CrossFit at Alpha Zone Gym?</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 620, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Step onto the training floor and experience varied functional conditioning that builds real-world athleticism, strength, and endurance.
            </p>
            <p style={{ fontSize: 14, color: 'var(--az-lime, #e5fa19)', fontWeight: 700, margin: '0 0 24px' }}>
              Claim your introductory session today and train with passionate coaches who have your back.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919779333155?text=Hi%20Alpha%20Zone!%20I%20want%20to%20try%20CrossFit%20training%20in%20Mohali."
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
