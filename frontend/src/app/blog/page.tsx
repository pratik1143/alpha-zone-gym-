import Link from 'next/link';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getSEO } from '../../lib/seo';
import { blogs } from '../../lib/blogs';
import { ArrowRight, Clock, Calendar } from 'lucide-react';
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
        {/* Symmetrical Header */}
        <div className="az-blog-header">
          <div className="az-blog-eyebrow-wrap">
            <span className="az-blog-eyebrow-line" />
            <span className="az-blog-eyebrow">EXPERT FITNESS INSIGHTS</span>
            <span className="az-blog-eyebrow-line" />
          </div>
          <h1>
            Alpha Zone <span style={{ color: 'var(--az-lime, #e5fa19)' }}>Fitness Blog</span>
          </h1>
          <p className="az-blog-subtitle">
            In-depth guides, training advice, and workout routines curated by professional coaches at Alpha Zone Gym in Sohana, Mohali.
          </p>
        </div>

        {/* 2x2 Perfectly Aligned Responsive Grid */}
        <div className="az-blog-grid">
          {blogs.map((blog) => (
            <Link key={blog.slug} href={blog.url} className="az-blog-card">
              <div className="az-blog-card-image">
                <Image
                  src={blog.image}
                  alt={blog.title}
                  fill
                  sizes="(max-width: 860px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="az-blog-card-content">
                <div className="az-blog-card-body">
                  <span className="az-blog-badge">{blog.category}</span>
                  <h2 className="az-blog-card-title">{blog.title}</h2>
                  <p className="az-blog-card-desc">{blog.excerpt}</p>
                </div>
                <div className="az-blog-meta">
                  <div className="az-blog-meta-left">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={13} /> {blog.publishedDate}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={13} /> {blog.readTime}
                    </span>
                  </div>
                  <span className="az-blog-read-more">
                    Read Guide <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Hub CTA */}
        <div className="az-cta-banner">
          <div className="az-blog-eyebrow-wrap" style={{ marginBottom: 12 }}>
            <span className="az-blog-eyebrow-line" />
            <span className="az-blog-eyebrow">START YOUR TRANSFORMATION</span>
            <span className="az-blog-eyebrow-line" />
          </div>
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
