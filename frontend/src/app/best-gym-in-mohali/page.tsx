import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs, getBlogPostingSchema, getFaqSchema } from '../../lib/blogs';
import { 
  Dumbbell, Target, Flame, Zap, Award, Activity, Heart, 
  MapPin, Phone, ArrowUpRight, ChevronRight, Sparkles 
} from 'lucide-react';
import '../../components/blog.css';

const article = blogs[2]; // best-gym-in-mohali

export const metadata = getSEO({
  title: article.seoTitle,
  description: article.metaDescription,
  path: article.url,
  keywords: [article.primaryKeyword, ...article.secondaryKeywords],
  image: article.image,
  type: 'article'
});

export default function BestGymInMohaliPage() {
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
          <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Best Gym in Mohali</span>
        </nav>

        {/* Article Header */}
        <header className="az-article-header">
          <span className="az-blog-badge">{article.category}</span>
          <h1 className="az-article-title">
            Best Gym in Mohali: How to Choose the Right Gym for Your Fitness Goals
          </h1>
          <div className="az-article-meta-bar">
            <span>By <strong>{article.author}</strong></span>
            <span>•</span>
            <span>Published {article.publishedDate}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Certified Coach Verified</span>
          </div>
        </header>

        {/* Featured Banner Image */}
        <div className="az-article-hero-image">
          <Image
            src={article.image}
            alt="Best Gym in Mohali - Alpha Zone Gym Facility"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className="object-cover"
          />
        </div>

        {/* Main Article Body */}
        <div className="az-article-content">
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.75, fontWeight: 500 }}>
            Finding the right <strong>gym in Mohali</strong> is not only about finding a place with modern equipment. The right fitness centre should provide a comfortable workout environment, quality equipment, useful training programs, knowledgeable trainers, and membership options that fit your individual fitness goals.
          </p>

          <p>
            Whether you live in <strong>Sohana, Sector 77, Sector 78, Sector 79, Sector 80, Kharar, Landran</strong>, or nearby areas of Mohali, having a well-equipped gym close to your home or workplace can make it significantly easier to stay consistent with your fitness routine.
          </p>

          <p>
            <Link href="/" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Alpha Zone Gym</Link> in Sohana, Mohali provides a dedicated fitness environment for people looking to build strength, improve fitness, lose fat, gain muscle, or simply maintain an active lifestyle.
          </p>

          <div className="az-callout-box">
            <h3 className="az-callout-title">
              <Sparkles size={18} /> Quick Checklist: Choosing the Best Gym in Mohali
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1' }}>
              Ensure the gym offers multi-discipline training zones (heavy weights, functional turf, cardio deck), certified coaching on the gym floor, hygienic facilities, accessible location on Landran Road, and flexible membership options.
            </p>
          </div>

          <h2>What Should You Look for in the Best Gym in Mohali?</h2>
          <p>
            Before joining a gym, consider the equipment, available training programs, coaching, cleanliness, location, timings and membership options.
          </p>

          <h3>Quality Gym Equipment</h3>
          <p>
            A good gym should have equipment for different types of workouts, including strength training, free weights, cardio, functional training, HIIT workouts and resistance training. Modern plate-loaded and pin-loaded machines ensure biomechanically correct movements that reduce injury risk.
          </p>

          <h3>Personal Training</h3>
          <p>
            If you are new to fitness or need help reaching a specific goal, <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>personal training in Mohali</Link> can provide additional guidance. A personal trainer can help you understand exercise techniques, create a workout routine, and keep your training structured according to your goals.
          </p>

          <h3>Strength Training</h3>
          <p>
            <Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Strength training</Link> is useful for people who want to develop muscle, improve physical strength, and build a stronger foundation. A gym should provide adequate space and equipment for exercises such as squats, presses, rows, deadlifts, and other resistance exercises.
          </p>

          <h3>Cardio Training</h3>
          <p>
            Cardio can be an important part of a balanced fitness routine. Depending on your goals, you may use treadmills, cycles, cross trainers, rowing machines, or other cardio conditioning equipment.
          </p>

          <h3>Functional Fitness and HIIT</h3>
          <p>
            <Link href="/functional-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Functional training</Link> and <Link href="/hiit-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>HIIT</Link> can add variety to your workouts. These programs can include movements using kettlebells, battle ropes, bodyweight exercises, and other functional equipment to enhance stamina and agility.
          </p>

          <h2>Why Location Matters When Choosing a Gym</h2>
          <p>
            One of the biggest reasons people stop going to a gym is inconvenience. Commuting across heavy traffic can derail consistency faster than difficult workouts.
          </p>
          <p>
            If you are searching for a <strong>gym near me in Mohali</strong>, choosing a convenient location makes it easier to maintain consistency.
          </p>
          <div className="az-callout-box" style={{ borderColor: 'rgba(229,250,25,0.25)' }}>
            <h3 className="az-callout-title" style={{ color: 'var(--az-lime, #e5fa19)' }}>
              <MapPin size={18} /> Alpha Zone Gym Location
            </h3>
            <p style={{ margin: '8px 0 4px', fontSize: 15, color: '#f1f5f9' }}>
              <strong>2nd Floor, MNB Group, SCO 16–17, Landran Road, Sohana, Mohali, Punjab 140308</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Easily accessible from Sector 77, Sector 78, Sector 79, Sector 80, Landran, and Kharar with dedicated member parking.
            </p>
          </div>

          <h2>Fitness Programs Available at Alpha Zone Gym</h2>
          <p>
            Alpha Zone Gym provides different training options for different fitness goals:
          </p>
          <ul>
            <li><strong>Strength Training:</strong> Build a stronger foundation with resistance and weight training using Olympic barbells, power racks, and imported pin-loaded machines.</li>
            <li><strong>Personal Training:</strong> Get focused guidance and a workout routine based around your individual goals with certified coaches.</li>
            <li><strong>Cardio Training:</strong> Improve your cardiovascular fitness and stamina with dedicated cardio workouts.</li>
            <li><strong>HIIT & Conditioning:</strong> High-intensity workouts can add variety and challenge to your training routine, accelerating metabolic fat burn.</li>
            <li><strong>Functional Fitness:</strong> Functional movements can help improve strength, coordination, mobility, and overall physical performance.</li>
            <li><strong>CrossFit-Style Training:</strong> High-energy functional workouts can be incorporated into a varied fitness routine for dynamic conditioning.</li>
          </ul>

          <h2>Is Alpha Zone Gym Right for You?</h2>
          <p>
            The right gym depends on your individual goals, schedule, preferred training style, and budget.
          </p>
          <p>
            If you are looking for a gym in Mohali where you can work on strength, cardio, conditioning, personal training, and general fitness, <strong>Alpha Zone Gym</strong> offers multiple training options under one roof with supportive coaches and premium hygiene standards.
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
            <p className="az-eyebrow" style={{ justifyContent: 'center' }}>START YOUR FITNESS JOURNEY</p>
            <h3>Ready to Train at the Best Gym in Mohali?</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 600, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Looking for the best gym in Mohali, a gym near Sohana, or a convenient fitness centre near Landran Road? Visit Alpha Zone Gym and explore the available training programs and membership options.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919779333155?text=Hello%20Alpha%20Zone!%20I%20want%20to%20visit%20the%20best%20gym%20in%20Mohali."
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
            <p style={{ marginTop: 20, fontSize: 13, color: '#64748b' }}>
              Location: 2nd Floor, MNB Group, SCO 16–17, Landran Road, Sohana, Mohali • Phone: 097793 33155
            </p>
          </div>
        </div>
      </article>
    </PageLayout>
  );
}
