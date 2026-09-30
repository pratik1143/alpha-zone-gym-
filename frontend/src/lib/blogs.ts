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
  },
  {
    slug: 'best-gym-in-mohali',
    url: '/best-gym-in-mohali',
    title: 'Best Gym in Mohali: How to Choose the Right Gym for Your Fitness Goals',
    seoTitle: 'Best Gym in Mohali: How to Choose the Right Gym for Your Fitness Goals | Alpha Zone Gym',
    metaDescription: 'Looking for the best gym in Mohali? Learn what to look for in a gym, from strength training and cardio to personal training, CrossFit, and HIIT.',
    primaryKeyword: 'Best Gym in Mohali',
    secondaryKeywords: [
      'gym in Mohali',
      'gym near Sohana',
      'gym near Landran Road',
      'fitness centre Mohali',
      'personal training Mohali',
      'CrossFit Mohali',
      'strength training Mohali',
      'gym near Sector 77 Mohali',
      'gym in Kharar Landran'
    ],
    category: 'Gym Guide & Local Fitness',
    readTime: '6 min read',
    publishedDate: '2026-09-30',
    author: 'Alpha Zone Fitness Team',
    excerpt: 'Finding the right gym in Mohali is about more than modern equipment. Discover how to evaluate gym coaching, multi-discipline zones, proximity, and membership options.',
    image: '/gym_images/best-gym-in-mohali.jpg',
    faqs: [
      {
        question: 'Which is the best gym in Mohali for strength and cardio?',
        answer: 'Alpha Zone Gym on Landran Road in Sohana, Mohali provides dedicated zones for heavy strength training, imported cardio decks, functional fitness turf, and CrossFit conditioning.'
      },
      {
        question: 'Does Alpha Zone Gym offer personal training in Mohali?',
        answer: 'Yes. Certified personal trainers provide one-on-one coaching, custom workout plans, form correction, and progressive goal tracking for members.'
      },
      {
        question: 'Is Alpha Zone Gym easily accessible from Sector 77, 78, 79, and Kharar?',
        answer: 'Yes. Strategically situated at SCO 16–17 on Landran Road in Sohana, Alpha Zone Gym offers direct connectivity and ample parking for residents of Sector 77–80, Kharar, Landran, and Sohana.'
      },
      {
        question: 'What training programs are available at Alpha Zone Gym?',
        answer: 'Members enjoy access to Strength Training, Personal Training, Cardio, HIIT & Conditioning, Functional Fitness, and CrossFit-style high-energy workouts under one roof.'
      }
    ]
  },
  {
    slug: 'affordable-gym-in-mohali',
    url: '/affordable-gym-in-mohali',
    title: 'Affordable Gym in Mohali: How to Find a Low-Cost Gym Without Compromising Your Workout',
    seoTitle: 'Affordable Gym in Mohali: How to Find a Low-Cost Gym Without Compromising Your Workout | Alpha Zone Gym',
    metaDescription: 'Searching for an affordable gym in Mohali? Learn how to choose a low-cost gym with quality equipment, training programs and membership options.',
    primaryKeyword: 'Affordable Gym in Mohali',
    secondaryKeywords: [
      'low-cost gym in Mohali',
      'budget friendly gym Mohali',
      'affordable gym near me',
      'affordable personal training Mohali',
      'cheap gym membership Mohali',
      'gym near Landran Road Sohana',
      'gym in Sector 77 Mohali'
    ],
    category: 'Membership & Value',
    readTime: '6 min read',
    publishedDate: '2026-09-30',
    author: 'Alpha Zone Fitness Team',
    excerpt: 'Searching for an affordable gym in Mohali does not mean compromising on equipment or coaching. Learn how to compare facilities, packages, and value to start training sustainably.',
    image: '/gym_images/affordable-gym-in-mohali.jpg',
    faqs: [
      {
        question: 'Is there an affordable gym near Sohana and Landran Road?',
        answer: 'Yes. Alpha Zone Gym offers flexible and budget-friendly membership packages with complete access to imported strength machines, free weights, cardio equipment, and functional turf.'
      },
      {
        question: 'What is included in an affordable gym membership at Alpha Zone?',
        answer: 'Memberships cover full floor access to weight training, cardio decks, functional fitness zones, locker amenities, and on-floor trainer assistance without hidden fees.'
      },
      {
        question: 'Can beginners join an affordable gym without feeling lost?',
        answer: 'Absolutely. Alpha Zone Gym provides beginner-friendly orientation, basic movement instruction, and affordable personal training options to ensure safe, structured progression.'
      },
      {
        question: 'Where is Alpha Zone Gym located in Mohali?',
        answer: 'Alpha Zone Gym is located at 2nd Floor, MNB Group, SCO 16–17, Landran Road, Sohana, Mohali, Punjab 140308. Phone: 097793 33155.'
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
