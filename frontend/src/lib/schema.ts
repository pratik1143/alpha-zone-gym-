export const homeSchemas = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://alphazonegym.in/#organization",
      "name": "Alpha Zone Gym",
      "url": "https://alphazonegym.in/",
      "email": "alphazonegym@gmail.com",
      "telephone": "+91-9779333155"
    },
    {
      "@type": "Gym",
      "@id": "https://alphazonegym.in/#gym",
      "name": "Alpha Zone Gym",
      "url": "https://alphazonegym.in/",
      "description": "Alpha Zone Gym is one of the best gyms in Mohali near Landran Road and Airport Road offering personal training, strength training, weight loss, CrossFit, cardio and functional fitness.",
      "telephone": "+91-9779333155",
      "email": "alphazonegym@gmail.com",
      "priceRange": "₹₹",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana",
        "addressLocality": "Sahibzada Ajit Singh Nagar",
        "addressRegion": "Punjab",
        "postalCode": "140308",
        "addressCountry": "IN"
      },
      "areaServed": [
        "Mohali",
        "Sohana",
        "Landran Road",
        "Airport Road",
        "Chandigarh",
        "Kharar"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://alphazonegym.in/#website",
      "name": "Alpha Zone Gym",
      "url": "https://alphazonegym.in/"
    }
  ]
};

export const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About Alpha Zone Gym",
  "url": "https://alphazonegym.in/about"
};

export const servicesSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Gym Services",
  "url": "https://alphazonegym.in/services"
};

export const packagesSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Gym Membership Packages",
  "url": "https://alphazonegym.in/packages"
};

export const teamSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "Alpha Zone Gym Team",
  "url": "https://alphazonegym.in/team"
};

export const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact Alpha Zone Gym",
  "url": "https://alphazonegym.in/contact"
};

export const appSchema = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  "name": "Alpha Zone Gym App",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Android, iOS"
};

export const privacySchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Privacy Policy - Alpha Zone Gym",
  "url": "https://alphazonegym.in/privacy-policy"
};

export const termsSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Terms and Conditions - Alpha Zone Gym",
  "url": "https://alphazonegym.in/terms"
};
