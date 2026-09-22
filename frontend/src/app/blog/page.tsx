import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs } from '../../lib/blogs';
import { ArrowRight, Clock, Calendar, BookOpen } from 'lucide-react';
import '../../components/blog.css';

export const metadata = getSEO({
  title: 'Alpha Zone Gym Fitness Blog | Guides, Workouts & Gym Tips in Mohali',
  description: 'Read fitness, weight training, CrossFit and gym guides from Alpha Zone Gym in Sohana, Mohali. Expert training advice for beginners and athletes.',
  path: '/blog',
  keywords: [
    'Gym Blog Mohali',
    'Fitness Blog Mohali',
    'Gym in Sohana Mohali',
    'Weight Training Mohali',
    'CrossFit Mohali',
    'Fitness Tips Sohana'
  ]
});

export default function BlogHubPage() {
  return (
    <PageLayout>
      <div className="az-blog-hub az-container">
        <div className="az-blog-header">
          <p className="az-eyebrow" style={{ justifyContent: 'center' }}>
            EXPERT FITNESS INSIGHTS
          </p>
          <h1
            style={{
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              fontWeight: 900,
              textTransform: 'uppercase',
              lineHeight: 1.15,
              color: '#fff',
              margin: '12px 0 20px',
              letterSpacing: '-0.5px'
            }}
          >
            Alpha Zone <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Fitness Blog</span>
          </h1>
          <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, maxWidth: 640, margin: '0 auto' }}>
            In-depth guides, training advice, and workout routines curated by professional coaches at Alpha Zone Gym in Sohana, Mohali.
          </p>
        </div>

        <div className="az-blog-grid">
          {blogs.map((blog) => (
            <Link key={blog.slug} href={blog.url} className="az-blog-card">
              <div className="az-blog-card-image">
                <Image
                  src={blog.image}
                  alt={blog.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="az-blog-card-content">
                <div>
                  <span className="az-blog-badge">{blog.category}</span>
                  <h2 className="az-blog-card-title">{blog.title}</h2>
                  <p className="az-blog-card-desc">{blog.excerpt}</p>
                </div>
                <div>
                  <div className="az-blog-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={13} /> {blog.publishedDate}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={13} /> {blog.readTime}
                    </span>
                    <span className="az-blog-read-more">
                      Read Guide <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Hub CTA */}
        <div className="az-cta-banner">
          <p className="az-eyebrow" style={{ justifyContent: 'center' }}>START YOUR TRANSFORMATION</p>
          <h3>Ready to Train in a World-Class Facility?</h3>
          <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 580, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Visit Alpha Zone Gym on Landran Road, Sohana, Mohali. Train with top-tier equipment and expert coaching tailored to your individual milestones.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/contact-us" className="az-button">
              Visit Alpha Zone Gym
            </Link>
            <Link href="/gym-membership-mohali" className="az-button az-button-dark" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
              Explore Memberships
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
