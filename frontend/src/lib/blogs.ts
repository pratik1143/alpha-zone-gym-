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
    publishedDate: '2026-09-30',
    author: 'Alpha Zone Fitness Team',
    excerpt: 'Finding the right gym in Sohana, Mohali is about more than simply finding a place with weights and treadmills. Learn what equipment, coaching, training disciplines and environment match your fitness goals.',
    image: '/gym_images/best-gym-in-sohana-mohali.jpg',
    faqs: [
      {
        question: 'Which is a good gym in Sohana, Mohali?',
        answer: 'When choosing a gym in Sohana, consider equipment, training programs, coaching, cleanliness, location, timings and membership options. Alpha Zone Gym provides state-of-the-art facilities across all these areas.'
      },
      {
        question: 'Is there a gym near Landran Road?',
        answer: 'Yes. Alpha Zone Gym is located on Landran Road in Sohana, Mohali (2nd Floor, MNB Group, SCO 16-17).'
      },
      {
        question: 'Is personal training available in Sohana?',
        answer: 'Personal training is available at Alpha Zone Gym for members looking for individualized training guidance and progressive coaching.'
      },
      {
        question: 'Does Alpha Zone Gym offer CrossFit?',
        answer: 'Yes, CrossFit is one of the training options offered by Alpha Zone Gym.'
      },
      {
        question: 'Is Alpha Zone Gym suitable for beginners?',
        answer: 'Yes. Beginners can start with appropriate exercises and gradually progress according to their fitness level and goals.'
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
    publishedDate: '2026-09-30',
    author: 'Alpha Zone Coaching Staff',
    excerpt: 'New to weight training? Discover foundational movement patterns, a beginner workout routine, progressive overload, and essential mistakes to avoid for safe progress.',
    image: '/gym_images/weight-training-for-beginners-mohali.jpg',
    faqs: [
      {
        question: 'Is weight training good for beginners?',
        answer: 'Yes. Beginners can start resistance training with appropriate exercises, manageable resistance and proper technique.'
      },
      {
        question: 'Where can I do weight training in Mohali?',
        answer: 'Alpha Zone Gym in Sohana, Mohali offers weight and strength training facilities.'
      },
      {
        question: 'Can weight training help with weight loss?',
        answer: 'Weight training can be part of a comprehensive weight-loss program alongside appropriate nutrition, cardiovascular activity and overall physical activity.'
      },
      {
        question: 'How often should beginners do weight training?',
        answer: 'Training frequency depends on fitness level, goals, schedule and recovery. A sustainable routine is generally more useful than an excessive workload.'
      },
      {
        question: 'Can I do cardio and weight training together?',
        answer: 'Yes. Many fitness programs combine resistance training and cardiovascular exercise.'
      },
      {
        question: 'Should beginners get a personal trainer?',
        answer: 'A personal trainer can be useful if you\'re new to the gym, unsure about exercise technique or working toward a specific goal.'
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
