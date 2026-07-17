/**
 * Alpha Zone Gym — Local Image Utility
 * All images served from /gym_images/ in the public folder.
 * Add new images to public/gym_images/ and they'll be available here.
 */

export type GymImageCategory =
  | 'hero'
  | 'about'
  | 'services'
  | 'plans'
  | 'trainers'
  | 'equipment'
  | 'cardio'
  | 'strength'
  | 'functional'
  | 'reception'
  | 'membership'
  | 'mobile_app'
  | 'transformation'
  | 'gallery'
  | 'contact'
  | 'cta'
  | 'background';

// All local gym images with category tags
const gymImageMap: Record<string, { path: string; alt: string; categories: GymImageCategory[] }> = {
  gymInMohali: {
    path: '/gym_images/Best Gym in Mohali.jpg',
    alt: 'Best Gym in Mohali — Alpha Zone',
    categories: ['hero', 'about', 'background'],
  },
  gymInSohana: {
    path: '/gym_images/Best Gym in sohana.jpg',
    alt: 'Best Gym in Sohana — Alpha Zone Gym',
    categories: ['hero', 'gallery', 'background'],
  },
  gymNearMe: {
    path: '/gym_images/Best Gym near me.jpg',
    alt: 'Premium Gym Near You — Alpha Zone',
    categories: ['hero', 'cta', 'plans'],
  },
  gymNearby: {
    path: '/gym_images/Best Gym nearby.jpg',
    alt: 'Alpha Zone Gym Facilities',
    categories: ['about', 'gallery', 'equipment'],
  },
  gymNearLandran: {
    path: '/gym_images/Best Gym Near Landran Road.jpeg',
    alt: 'Alpha Zone Gym — Landran Road Sohana',
    categories: ['contact', 'reception', 'about'],
  },
  affordableMembership: {
    path: '/gym_images/Affordable Gym Membership in Mohali.jpeg',
    alt: 'Affordable Gym Membership Mohali',
    categories: ['membership', 'plans', 'reception'],
  },
  personalTrainingMohali: {
    path: '/gym_images/Personal Training at Alpha Zone Gym Mohali.jpg',
    alt: 'Personal Training at Alpha Zone Gym Mohali',
    categories: ['trainers', 'services', 'functional'],
  },
  personalTraining: {
    path: '/gym_images/Personal Training in Mohali.jpeg',
    alt: 'Personal Training in Mohali — Alpha Zone',
    categories: ['trainers', 'mobile_app', 'transformation'],
  },
  strengthTraining: {
    path: '/gym_images/Strength Training Gym in Mohali.jpg',
    alt: 'Strength Training Gym in Mohali',
    categories: ['strength', 'equipment', 'services', 'gallery'],
  },
  weightLoss: {
    path: '/gym_images/Weight Loss Gym Mohali.jpg',
    alt: 'Weight Loss Gym Mohali — Alpha Zone',
    categories: ['cardio', 'transformation', 'services', 'gallery'],
  },
  gymNearAirport: {
    path: '/gym_images/gym near airport.jpg',
    alt: 'Alpha Zone Gym — Premium Facility',
    categories: ['hero', 'cta', 'gallery', 'background', 'plans'],
  },
};

// Pre-indexed category → image paths
const categoryIndex: Record<GymImageCategory, typeof gymImageMap[string][]> = {
  hero: [],
  about: [],
  services: [],
  plans: [],
  trainers: [],
  equipment: [],
  cardio: [],
  strength: [],
  functional: [],
  reception: [],
  membership: [],
  mobile_app: [],
  transformation: [],
  gallery: [],
  contact: [],
  cta: [],
  background: [],
};

Object.values(gymImageMap).forEach(img => {
  img.categories.forEach(cat => {
    categoryIndex[cat].push(img);
  });
});

/**
 * Get a single gym image for a given category.
 * @param category - The image category
 * @param index - Optional specific index (defaults to first/best match)
 */
export function getGymImage(category: GymImageCategory, index = 0): { src: string; alt: string } {
  const images = categoryIndex[category];
  if (!images || images.length === 0) {
    // fallback to any available image
    const fallback = Object.values(gymImageMap)[0];
    return { src: fallback.path, alt: fallback.alt };
  }
  const img = images[index % images.length];
  return { src: img.path, alt: img.alt };
}

/**
 * Get all gym images for a given category (for galleries, carousels, etc.)
 */
export function getGymImages(category: GymImageCategory): { src: string; alt: string }[] {
  const images = categoryIndex[category];
  if (!images || images.length === 0) return [];
  return images.map(img => ({ src: img.path, alt: img.alt }));
}

/**
 * Get all available gallery images
 */
export function getAllGalleryImages(): { src: string; alt: string }[] {
  return Object.values(gymImageMap).map(img => ({ src: img.path, alt: img.alt }));
}
