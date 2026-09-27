// Realistic sample portfolio content copied into a NEW photographer's Portfolio
// document the first time it is created. It is a neutral template — no real
// person's name, identity or contact details — so a new photographer can see how
// each section is meant to look and then replace it with their own details.
//
// Only the section/content fields live here. Identity fields (name, slug, email,
// phone, location) are filled from the photographer's own account on creation.
// The moment they edit and save, their data overwrites all of this.

const STARTER_PORTFOLIO = {
  tagline: "Capturing moments that last a lifetime",
  bio: "Professional photographer with a passion for natural light, honest emotion and timeless storytelling.",
  about:
    "I'm a full-time photographer specialising in weddings, portraits and events. " +
    "My style blends candid, documentary moments with a handful of carefully directed " +
    "portraits, so your gallery feels both authentic and polished. Over the years I've " +
    "photographed intimate ceremonies, large family celebrations and corporate events, " +
    "and I bring the same calm, unobtrusive presence to every shoot. When we work " +
    "together you can expect clear communication before the day, a relaxed experience " +
    "on the day, and a beautifully edited gallery delivered on time.\n\n" +
    "Replace this text with your own story — how you started, what you love to " +
    "photograph, and what clients can expect when they book you.",
  experience: "5+ Years",
  serviceArea: "Available for local bookings and destination travel",
  profilePhoto: "photo-1554048612-b6a482bc67e5",
  coverImage: "photo-1776266099566-676119a0f06e",

  services: [
    {
      id: "svc-wedding",
      title: "Wedding Photography",
      description:
        "Full-day coverage from getting ready to the last dance, with a second photographer available for larger celebrations.",
      duration: "8–10 hours",
      price: "From ₹45,000",
    },
    {
      id: "svc-prewedding",
      title: "Pre-Wedding / Engagement",
      description:
        "A relaxed couples session at a location that means something to you — perfect for save-the-dates.",
      duration: "2 hours",
      price: "From ₹12,000",
    },
    {
      id: "svc-portrait",
      title: "Portrait Sessions",
      description:
        "Individual, couple or family portraits, in studio or on location, delivered as a styled online gallery.",
      duration: "1–2 hours",
      price: "From ₹8,000",
    },
    {
      id: "svc-event",
      title: "Events & Celebrations",
      description:
        "Birthdays, anniversaries, receptions and private parties covered candidly from start to finish.",
      duration: "4–6 hours",
      price: "From ₹20,000",
    },
    {
      id: "svc-corporate",
      title: "Corporate & Branding",
      description:
        "Headshots, team photos, conferences and product launches for businesses of any size.",
      duration: "Half or full day",
      price: "From ₹15,000",
    },
  ],

  gallery: [
    { id: "g1", url: "photo-1776266099566-676119a0f06e", category: "Wedding", caption: "Ceremony first look" },
    { id: "g2", url: "photo-1779893529816-e6f028209a3d", category: "Wedding", caption: "Couple at golden hour" },
    { id: "g3", url: "photo-1784796639738-c8c06b8a89c2", category: "Wedding", caption: "Reception details" },
    { id: "g4", url: "photo-1684598273404-2d94d7a7ce2f", category: "Portrait", caption: "Natural light portrait" },
    { id: "g5", url: "photo-1554048612-b6a482bc67e5", category: "Portrait", caption: "Studio session" },
    { id: "g6", url: "photo-1726594699522-d7c2f5459f52", category: "Corporate", caption: "Executive headshot" },
    { id: "g7", url: "photo-1647937627386-b8d8420718a6", category: "Corporate", caption: "Team photo" },
    { id: "g8", url: "photo-1551650975-87deedd944c3", category: "Events", caption: "Live event coverage" },
    { id: "g9", url: "photo-1749773957060-8e5ede5d9f48", category: "Events", caption: "Celebration candids" },
  ],

  pricing: [
    {
      id: "pkg-essential",
      name: "Essential",
      price: "₹25,000",
      popular: false,
      description: "Ideal for intimate ceremonies and short sessions.",
      features: [
        "Up to 4 hours of coverage",
        "1 photographer",
        "Private online gallery",
        "150+ edited photos",
        "Personal print release",
      ],
    },
    {
      id: "pkg-signature",
      name: "Signature",
      price: "₹45,000",
      popular: true,
      description: "The most popular choice for a full wedding day.",
      features: [
        "Up to 8 hours of coverage",
        "1 photographer",
        "Engagement session included",
        "Private online gallery",
        "400+ edited photos",
        "Personal print release",
        "USB keepsake box",
      ],
    },
    {
      id: "pkg-luxury",
      name: "Luxury",
      price: "₹75,000",
      popular: false,
      description: "Complete coverage with a second photographer and album.",
      features: [
        "Up to 12 hours of coverage",
        "2 photographers",
        "Engagement session included",
        "Private online gallery",
        "700+ edited photos",
        "Premium 30-page album",
        "Personal print release",
        "Priority 3-week delivery",
      ],
    },
  ],

  testimonials: [
    {
      id: "t1",
      clientName: "Priya & Arjun",
      eventType: "Wedding",
      rating: 5,
      review:
        "We could not have asked for a better experience. Every important moment was captured beautifully and the gallery arrived faster than promised. Our families keep asking who our photographer was!",
      date: "This year",
    },
    {
      id: "t2",
      clientName: "The Sharma Family",
      eventType: "Family Portraits",
      rating: 5,
      review:
        "Relaxed, patient and great with our kids. The photos genuinely look like us on a good day — we've already ordered prints for the whole house.",
      date: "Last month",
    },
    {
      id: "t3",
      clientName: "Neha R.",
      eventType: "Corporate Event",
      rating: 5,
      review:
        "Professional from the first email to final delivery. The event photos were on brand and ready for our press release the next morning.",
      date: "Recently",
    },
  ],

  faqs: [
    {
      id: "f1",
      question: "How do I book you for my date?",
      answer:
        "Get in touch through the contact section with your date and event type. A signed agreement and a booking retainer secure the date in the calendar.",
    },
    {
      id: "f2",
      question: "How far in advance should I book?",
      answer:
        "For weddings, 6–12 months ahead is ideal, especially during peak season. Portrait and event sessions can usually be arranged within a few weeks.",
    },
    {
      id: "f3",
      question: "When will we receive our photos?",
      answer:
        "A short preview is shared within a few days. Full portrait galleries are delivered in about 2 weeks and wedding galleries in 4–6 weeks.",
    },
    {
      id: "f4",
      question: "Do you travel for shoots?",
      answer:
        "Yes. Local travel is included; for locations further away a travel fee covers transport and accommodation. Ask for a custom quote.",
    },
    {
      id: "f5",
      question: "What is your payment schedule?",
      answer:
        "A retainer is due at booking to hold your date, with the balance due shortly before the shoot. Instalment plans can be arranged on request.",
    },
  ],
};

export default STARTER_PORTFOLIO;
