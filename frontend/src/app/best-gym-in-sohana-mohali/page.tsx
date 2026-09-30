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
            Before purchasing a membership, consider equipment quality, available training programs, coaching, cleanliness, location, timings and membership options.
          </p>

          <h3>Quality Equipment</h3>
          <p>
            A good gym should have equipment supporting different types of workouts, including free weights, weight machines, benches, squat racks, cardio equipment, functional training equipment and conditioning equipment.
          </p>

          <h3>Different Training Programs</h3>
          <p>
            Not everyone has the same fitness goal. One person may want to build muscle, while another may want to lose weight or improve cardiovascular fitness.
          </p>

          <h3>Weight Training</h3>
          <p>
            <Link href="/weight-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Weight training</Link> can help develop strength and muscle when combined with appropriate training and nutrition. It can include dumbbells, barbells, machines, cables and free weights.
          </p>

          <h3>Strength Training</h3>
          <p>
            Strength-focused workouts generally use progressive resistance exercises designed to improve physical strength. Beginners should focus on proper technique and gradually increase training demands.
          </p>

          <h3>Cardio Training</h3>
          <p>
            Cardiovascular exercise can help improve endurance and overall fitness. Common gym cardio options include treadmill, cycling, rowing, stair climbing and conditioning equipment.
          </p>

          <h3>Functional Training</h3>
          <p>
            <Link href="/functional-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>Functional training</Link> focuses on movements that develop strength, stability, coordination and movement capacity. It can include kettlebells, medicine balls, bodyweight movements and other equipment.
          </p>

          <h3>HIIT Training</h3>
          <p>
            <Link href="/hiit-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>High-intensity interval training (HIIT)</Link> uses periods of harder effort combined with recovery periods. It can be incorporated into programs for improving conditioning and making workouts time-efficient.
          </p>

          <h3>CrossFit</h3>
          <p>
            <Link href="/crossfit-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>CrossFit</Link> combines functional movements and conditioning methods. Beginners should learn movement technique and appropriate scaling before progressing to more demanding workouts.
          </p>

          <h2>Personal Training in Sohana</h2>
          <p>
            If you are new to the gym or have a specific fitness goal, <Link href="/personal-training-mohali" style={{ color: 'var(--az-lime, #e5fa19)', textDecoration: 'underline' }}>personal training in Sohana</Link> may be useful. A personal trainer can help with workout planning, exercise technique, training progression, workout structure, accountability and goal-specific training.
          </p>

          <h2>Gym for Weight Loss in Sohana</h2>
          <p>
            A well-rounded fitness routine can combine strength training, cardio, conditioning, appropriate nutrition and consistency. Your program should match your current fitness level and goals.
          </p>

          <h2>Gym for Muscle Building in Sohana</h2>
          <p>
            For muscle-building goals, resistance training is an important component. A structured program may include squats, presses, rows, pull-downs, deadlift variations, lunges, shoulder exercises and arm exercises. Progress should be gradual, with attention to technique, recovery and nutrition.
          </p>

          <h2>Why Location Matters When Choosing a Gym</h2>
          <p>
            Convenience can make it easier to maintain a regular routine. For people around Sohana, Landran Road, Landran, Sector 77 and nearby Mohali areas, a conveniently located gym can make regular training easier.
          </p>
          <p>
            <strong>Alpha Zone Gym</strong> is located on Landran Road in Sohana, Mohali.
          </p>

          <h2>What Makes a Gym Suitable for Beginners?</h2>
          <p>
            A beginner routine should focus on learning basic movements, understanding gym equipment, developing proper technique, starting with manageable resistance, building consistency and gradually increasing training difficulty.
          </p>

          <h2>How Often Should You Go to the Gym?</h2>
          <p>
            The ideal frequency depends on your goals, fitness level, schedule and recovery. For many beginners, starting with a manageable schedule and gradually increasing training frequency can be more sustainable than exercising every day.
          </p>

          <h2>Why Alpha Zone Gym in Sohana?</h2>
          <p>
            Alpha Zone Gym offers Weight Training, Strength Training, Cardio, Personal Training, CrossFit, Functional Training, HIIT and Group Fitness.
          </p>
          <div className="az-callout-box" style={{ borderColor: 'rgba(229,250,25,0.25)' }}>
            <h3 className="az-callout-title" style={{ color: 'var(--az-lime, #e5fa19)' }}>
              <MapPin size={18} /> Alpha Zone Gym Location & Details
            </h3>
            <ul style={{ margin: '12px 0 0', paddingLeft: 20 }}>
              <li><strong>Address:</strong> 2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Mohali, Punjab 140308</li>
              <li><strong>Programs:</strong> Weight Training, Strength Training, Cardio, Personal Training, CrossFit, Functional Training, HIIT & Group Fitness</li>
              <li><strong>Timings:</strong> Mon–Sat: 5:00 AM – 11:00 PM | Sun: 6:00 AM – 12:00 PM</li>
              <li><strong>Phone:</strong> +91 97793 33155</li>
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
