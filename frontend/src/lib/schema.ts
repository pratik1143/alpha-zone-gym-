// 1. Home – /
export const homeSchemas = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "@id": "https://www.alphazonegym.in/#gym",
  "name": "Alpha Zone Gym",
  "url": "https://www.alphazonegym.in/",
  "telephone": "+919779333155",
  "description": "Alpha Zone Gym is a fitness and training facility in Sohana, Mohali offering weight training, cardio, personal training, CrossFit, functional training and group fitness classes.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "2nd Floor, MNB Group, SCO 16-17, Landran Road",
    "addressLocality": "Sohana",
    "addressRegion": "Punjab",
    "postalCode": "140308",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 30.6910467,
    "longitude": 76.7093083
  },
  "hasMap": "https://maps.app.goo.gl/pX8VZNoXNu4YAeBW6",
  "areaServed": [
    { "@type": "City", "name": "Sohana" },
    { "@type": "City", "name": "Mohali" },
    { "@type": "AdministrativeArea", "name": "SAS Nagar" }
  ]
};

// 2. About Us – /about-us/
export const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://www.alphazonegym.in/about-us/#about",
  "url": "https://www.alphazonegym.in/about-us/",
  "name": "About Alpha Zone Gym",
  "description": "Learn about Alpha Zone Gym, a fitness and performance training facility in Sohana, Mohali offering strength training, cardio, personal training, CrossFit and functional fitness.",
  "mainEntity": { "@id": "https://www.alphazonegym.in/#gym" },
  "about": { "@id": "https://www.alphazonegym.in/#gym" }
};

// 3. Gym Services – /gym-services/
export const servicesSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://www.alphazonegym.in/gym-services/#page",
  "url": "https://www.alphazonegym.in/gym-services/",
  "name": "Gym Services in Mohali",
  "description": "Explore gym and fitness services at Alpha Zone Gym in Sohana, Mohali, including weight training, cardio, personal training, CrossFit, functional training and HIIT.",
  "about": { "@id": "https://www.alphazonegym.in/#gym" },
  "mainEntity": {
    "@type": "ItemList",
    "name": "Alpha Zone Gym Services",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Weight Training", "url": "https://www.alphazonegym.in/weight-training-mohali/" },
      { "@type": "ListItem", "position": 2, "name": "Personal Training", "url": "https://www.alphazonegym.in/personal-training-mohali/" },
      { "@type": "ListItem", "position": 3, "name": "CrossFit", "url": "https://www.alphazonegym.in/crossfit-mohali/" },
      { "@type": "ListItem", "position": 4, "name": "Functional Training", "url": "https://www.alphazonegym.in/functional-training-mohali/" },
      { "@type": "ListItem", "position": 5, "name": "HIIT Training", "url": "https://www.alphazonegym.in/hiit-training-mohali/" },
      { "@type": "ListItem", "position": 6, "name": "Weight Loss Training", "url": "https://www.alphazonegym.in/weight-loss-gym-mohali/" }
    ]
  }
};

// 4. Personal Training – /personal-training-mohali/
export const personalTrainingSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.alphazonegym.in/personal-training-mohali/#service",
  "name": "Personal Training in Mohali",
  "url": "https://www.alphazonegym.in/personal-training-mohali/",
  "description": "Personal training at Alpha Zone Gym in Sohana, Mohali with customized workout programming, coaching, fitness assessment and goal-based training.",
  "serviceType": "Personal Training",
  "provider": { "@id": "https://www.alphazonegym.in/#gym" },
  "areaServed": ["Sohana", "Mohali", "SAS Nagar"],
  "availableChannel": { "@type": "ServiceChannel", "serviceUrl": "https://www.alphazonegym.in/personal-training-mohali/" }
};

// 5. CrossFit – /crossfit-mohali/
export const crossfitSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.alphazonegym.in/crossfit-mohali/#service",
  "name": "CrossFit Gym in Mohali",
  "url": "https://www.alphazonegym.in/crossfit-mohali/",
  "description": "CrossFit training at Alpha Zone Gym in Sohana, Mohali featuring high-intensity functional conditioning, Olympic lifting, plyometrics, gymnastic movements and performance training.",
  "serviceType": "CrossFit Gym",
  "provider": { "@id": "https://www.alphazonegym.in/#gym" },
  "areaServed": ["Sohana", "Mohali", "SAS Nagar"],
  "availableChannel": { "@type": "ServiceChannel", "serviceUrl": "https://www.alphazonegym.in/crossfit-mohali/" }
};

// 6. Weight Training – /weight-training-mohali/
export const weightTrainingSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.alphazonegym.in/weight-training-mohali/#service",
  "name": "Weight Training Gym in Mohali",
  "url": "https://www.alphazonegym.in/weight-training-mohali/",
  "description": "Weight training at Alpha Zone Gym in Sohana, Mohali using professional strength equipment, free weights, machines and structured training for muscle and strength development.",
  "serviceType": "Weight Training Gym",
  "provider": { "@id": "https://www.alphazonegym.in/#gym" },
  "areaServed": ["Sohana", "Mohali", "SAS Nagar"],
  "availableChannel": { "@type": "ServiceChannel", "serviceUrl": "https://www.alphazonegym.in/weight-training-mohali/" }
};

// 7. Functional Training – /functional-training-mohali/
export const functionalTrainingSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.alphazonegym.in/functional-training-mohali/#service",
  "name": "Functional Training in Mohali",
  "url": "https://www.alphazonegym.in/functional-training-mohali/",
  "description": "Functional training at Alpha Zone Gym in Sohana, Mohali focused on strength, mobility, stability, coordination and real-world athletic movement.",
  "serviceType": "Functional Training",
  "provider": { "@id": "https://www.alphazonegym.in/#gym" },
  "areaServed": ["Sohana", "Mohali", "SAS Nagar"],
  "availableChannel": { "@type": "ServiceChannel", "serviceUrl": "https://www.alphazonegym.in/functional-training-mohali/" }
};

// 8. HIIT Training – /hiit-training-mohali/
export const hiitTrainingSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.alphazonegym.in/hiit-training-mohali/#service",
  "name": "HIIT Training in Mohali",
  "url": "https://www.alphazonegym.in/hiit-training-mohali/",
  "description": "High-intensity interval training at Alpha Zone Gym in Sohana, Mohali designed to improve cardiovascular fitness, conditioning, endurance and overall performance.",
  "serviceType": "HIIT Training",
  "provider": { "@id": "https://www.alphazonegym.in/#gym" },
  "areaServed": ["Sohana", "Mohali", "SAS Nagar"],
  "availableChannel": { "@type": "ServiceChannel", "serviceUrl": "https://www.alphazonegym.in/hiit-training-mohali/" }
};

// 9. Weight Loss – /weight-loss-gym-mohali/
export const weightLossSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.alphazonegym.in/weight-loss-gym-mohali/#service",
  "name": "Weight Loss Gym in Mohali",
  "url": "https://www.alphazonegym.in/weight-loss-gym-mohali/",
  "description": "Goal-based weight loss and fat loss training at Alpha Zone Gym in Sohana, Mohali with structured workouts, cardio, strength training and fitness coaching.",
  "serviceType": "Weight Loss Gym",
  "provider": { "@id": "https://www.alphazonegym.in/#gym" },
  "areaServed": ["Sohana", "Mohali", "SAS Nagar"],
  "availableChannel": { "@type": "ServiceChannel", "serviceUrl": "https://www.alphazonegym.in/weight-loss-gym-mohali/" }
};

// 10. Gym Membership – /gym-membership-mohali/
export const packagesSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.alphazonegym.in/gym-membership-mohali/#service",
  "name": "Gym Membership in Mohali",
  "url": "https://www.alphazonegym.in/gym-membership-mohali/",
  "description": "Flexible gym membership plans at Alpha Zone Gym in Sohana, Mohali, including monthly, 3-month, 6-month, and annual membership options.",
  "serviceType": "Gym Membership",
  "provider": { "@id": "https://www.alphazonegym.in/#gym" },
  "areaServed": ["Sohana", "Mohali", "SAS Nagar"],
  "availableChannel": { "@type": "ServiceChannel", "serviceUrl": "https://www.alphazonegym.in/gym-membership-mohali/" }
};

// 11. Gym Near Sector 77 – /gym-sector-77-mohali/
export const gymSector77Schema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://www.alphazonegym.in/gym-sector-77-mohali/#page",
  "url": "https://www.alphazonegym.in/gym-sector-77-mohali/",
  "name": "Best Gym Near Sector 77, Mohali",
  "description": "Find a gym near Sector 77, Mohali at Alpha Zone Gym in Sohana on Landran Road. Alpha Zone offers weight training, CrossFit, personal training, functional training, cardio and HIIT.",
  "about": {
    "@type": "Service",
    "@id": "https://www.alphazonegym.in/gym-sector-77-mohali/#service",
    "name": "Gym Near Sector 77, Mohali",
    "serviceType": "Gym and Fitness Training",
    "provider": { "@id": "https://www.alphazonegym.in/#gym" },
    "areaServed": { "@type": "Place", "name": "Sector 77, Mohali, Punjab" }
  },
  "mainEntity": { "@id": "https://www.alphazonegym.in/#gym" }
};

// 12. Contact Us – /contact-us/
export const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": "https://www.alphazonegym.in/contact-us/#contact",
  "url": "https://www.alphazonegym.in/contact-us/",
  "name": "Contact Alpha Zone Gym",
  "description": "Contact Alpha Zone Gym in Sohana, Mohali for gym memberships, personal training, fitness programs and training services.",
  "mainEntity": { "@id": "https://www.alphazonegym.in/#gym" },
  "about": { "@id": "https://www.alphazonegym.in/#gym" }
};

// 13. Privacy Policy – /privacy-policy/
export const privacySchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://www.alphazonegym.in/privacy-policy/#page",
  "url": "https://www.alphazonegym.in/privacy-policy/",
  "name": "Privacy Policy | Alpha Zone Gym",
  "description": "Privacy Policy for Alpha Zone Gym explaining how website and customer information is handled."
};

// 14. Terms & Conditions – /terms-and-conditions/
export const termsSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://www.alphazonegym.in/terms-and-conditions/#page",
  "url": "https://www.alphazonegym.in/terms-and-conditions/",
  "name": "Terms & Conditions | Alpha Zone Gym",
  "description": "Terms and Conditions for using Alpha Zone Gym services, memberships and website."
};

// Additional utility schemas for existing pages
export const teamSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "Alpha Zone Gym Team",
  "url": "https://www.alphazonegym.in/team"
};

export const appSchema = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  "name": "Alpha Zone Gym App",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Android, iOS"
};
