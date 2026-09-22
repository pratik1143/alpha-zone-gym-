export interface BlogArticle {
  slug: string;
  url: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
  readTime: string;
  publishedDate: string;
  author: string;
  excerpt: string;
  image: string;
  faqs: { question: string; answer: string }[];
}

export const blogs: BlogArticle[] = [
  {
    slug: 'best-gym-in-sohana-mohali',
    url: '/best-gym-in-sohana-mohali',
    title: 'Best Gym in Sohana, Mohali: Complete Guide to Choosing the Right Gym',
    seoTitle: 'Best Gym in Sohana, Mohali: Complete Guide to Choosing the Right Gym',
    metaDescription: 'Looking for the best gym in Sohana, Mohali? Learn what to look for in a gym, from strength training and cardio to personal training, CrossFit and HIIT.',
    primaryKeyword: 'Gym in Sohana, Mohali',
    secondaryKeywords: [
      'best gym in Sohana',
      'gym near Sohana',
      'gym in Mohali',
      'gym near Landran Road',
      'fitness centre in Sohana',
      'personal training Sohana',
      'CrossFit Sohana',
      'weight training Sohana',
      'gym near Sector 77 Mohali'
    ],
    category: 'Gym Guide & Local Fitness',
    readTime: '6 min read',
    publishedDate: '2026-09-22',
    author: 'Alpha Zone Fitness Team',
    excerpt: 'Finding the right gym in Sohana, Mohali is about more than simply finding weights and treadmills. Learn what equipment, coaching, training disciplines and environment match your fitness goals.',
    image: '/gym_images/Best Gym in Mohali.jpg',
    faqs: [
      {
        question: 'Which is a good gym in Sohana, Mohali?',
        answer: 'When choosing a gym in Sohana, consider equipment quality, training programs, coaching support, cleanliness, location, timings, and flexible membership options. Alpha Zone Gym on Landran Road provides multi-discipline training with professional coaches.'
      },
      {
        question: 'Is there a gym near Landran Road?',
        answer: 'Yes. Alpha Zone Gym is conveniently located on Landran Road in Sohana, Mohali (2nd Floor, MNB Group, SCO 16-17).'
      },
      {
        question: 'Is personal training available in Sohana?',
        answer: 'Personal training is available at Alpha Zone Gym for members looking for individualized coaching, tailored workout progression, and technique guidance.'
      },
      {
        question: 'Does Alpha Zone Gym offer CrossFit?',
        answer: 'Yes, functional CrossFit training is one of the specialized disciplines offered at Alpha Zone Gym alongside weight training, HIIT, and cardio.'
      },
      {
        question: 'Is Alpha Zone Gym suitable for beginners?',
        answer: 'Yes. Beginners start with a fitness assessment and receive guidance on proper movement mechanics, machine usage, and gradual training progression.'
      }
    ]
  },
  {
    slug: 'weight-training-for-beginners-mohali',
    url: '/weight-training-for-beginners-mohali',
    title: 'Weight Training for Beginners in Mohali: Complete Guide to Getting Started',
    seoTitle: 'Weight Training for Beginners in Mohali: Complete Guide',
    metaDescription: 'New to weight training? Learn how to start weight training in Mohali, choose exercises, build strength, avoid common mistakes and create a sustainable gym routine.',
    primaryKeyword: 'Weight Training in Mohali',
    secondaryKeywords: [
      'weight training gym in Mohali',
      'weight training for beginners',
      'strength training Mohali',
      'weight training Sohana',
      'muscle building gym Mohali',
      'beginner gym workout Mohali',
      'weight lifting gym Mohali',
      'gym near Landran Road'
    ],
    category: 'Strength & Conditioning',
    readTime: '7 min read',
    publishedDate: '2026-09-22',
    author: 'Alpha Zone Coaching Staff',
    excerpt: 'New to weight training? Discover the core movement patterns, beginner full-body workout routine, progressive overload principles, and how to avoid the common lifting mistakes.',
    image: '/gym_images/Strength Training Gym in Mohali.jpg',
    faqs: [
      {
        question: 'Is weight training good for beginners?',
        answer: 'Yes. Beginners can start resistance training safely with foundational movements, manageable weights, and proper form to build baseline strength and bone density.'
      },
      {
        question: 'Where can I do weight training in Mohali?',
        answer: 'Alpha Zone Gym in Sohana, Mohali features a dedicated strength training facility with Olympic barbells, power racks, dumbbells, and imported resistance machines.'
      },
      {
        question: 'Can weight training help with weight loss?',
        answer: 'Yes. Weight training preserves and builds lean muscle mass, which raises resting metabolic rate and optimizes body composition when paired with proper nutrition and cardio.'
      },
      {
        question: 'How often should beginners do weight training?',
        answer: 'For beginners, 3 to 4 days per week of structured resistance training with adequate recovery days between sessions yields the best sustainable results.'
      },
      {
        question: 'Can I do cardio and weight training together?',
        answer: 'Yes. Combining strength training with cardiovascular exercise provides comprehensive fitness, endurance, and heart health benefits.'
      },
      {
        question: 'Should beginners get a personal trainer?',
        answer: 'A personal trainer helps beginners learn correct biomechanics, prevent injury, establish tailored workout routines, and stay accountable to their goals.'
      }
    ]
  }
];

export function getBlogPostingSchema(article: BlogArticle) {
  const BASE_URL = 'https://www.alphazonegym.in';
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': article.seoTitle,
    'description': article.metaDescription,
    'image': `${BASE_URL}${article.image}`,
    'author': {
      '@type': 'Organization',
      'name': 'Alpha Zone Gym',
      'url': BASE_URL
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Alpha Zone Gym',
      'logo': {
        '@type': 'ImageObject',
        'url': `${BASE_URL}/gymlogo.png`
      }
    },
    'datePublished': article.publishedDate,
    'dateModified': article.publishedDate,
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${BASE_URL}${article.url}`
    },
    'keywords': [article.primaryKeyword, ...article.secondaryKeywords].join(', ')
  };
}

export function getFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
}
