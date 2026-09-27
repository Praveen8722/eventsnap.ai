// Shared portfolio data and default state

const GALLERY_IMGS = [
  { url: 'photo-1776266099566-676119a0f06e', category: 'Wedding' },
  { url: 'photo-1779893529816-e6f028209a3d', category: 'Wedding' },
  { url: 'photo-1784796639738-c8c06b8a89c2', category: 'Wedding' },
  { url: 'photo-1684598273404-2d94d7a7ce2f', category: 'Portrait' },
  { url: 'photo-1554048612-b6a482bc67e5', category: 'Portrait' },
  { url: 'photo-1726594699522-d7c2f5459f52', category: 'Corporate' },
  { url: 'photo-1647937627386-b8d8420718a6', category: 'Corporate' },
  { url: 'photo-1551650975-87deedd944c3', category: 'Events' },
  { url: 'photo-1749773957060-8e5ede5d9f48', category: 'Events' },
];

export const DEFAULT_PORTFOLIO = {
  name: 'Marcus Chen',
  slug: 'marcus-chen',
  theme: 'dark',
  accent: '#6C63FF',
  tagline: 'Capturing Your Most Precious Moments',
  bio: 'Award-winning wedding and portrait photographer based in New York City with over 10 years of experience.',
  about: 'I believe every love story deserves to be told beautifully. With over a decade behind the lens, I specialize in creating timeless imagery that captures genuine emotion, authentic moments, and the unique story of every couple and family I photograph.',
  location: 'New York City, NY',
  serviceArea: 'New York, New Jersey, Connecticut — Available worldwide',
  phone: '+1 (555) 234-5678',
  email: 'hello@marcuschen.com',
  experience: '10+ Years',
  profilePhoto: 'photo-1554048612-b6a482bc67e5',
  coverImage: 'photo-1776266099566-676119a0f06e',
  social: {
    instagram: '@marcuschenphoto',
    facebook: 'marcuschenphoto',
    youtube: 'MarcusChenPhoto',
    whatsapp: '+15552345678',
  },
  services: [
    { id: '1', title: 'Wedding Photography', description: 'Full-day coverage of your wedding day, from preparation to reception.', duration: '8–12 hours', price: 'From ₹3,800' },
    { id: '2', title: 'Pre-Wedding Sessions', description: 'Romantic engagement and pre-wedding photo sessions at locations of your choice.', duration: '2–3 hours', price: 'From ₹800' },
    { id: '3', title: 'Portrait Photography', description: 'Professional headshots, family portraits, and individual sessions.', duration: '1–2 hours', price: 'From ₹450' },
    { id: '4', title: 'Corporate Photography', description: 'Executive headshots, team photos, and corporate event coverage.', duration: 'Flexible', price: 'From ₹1,200' },
    { id: '5', title: 'Event Photography', description: 'Birthday parties, anniversaries, galas, and special celebrations.', duration: '4–8 hours', price: 'From ₹1,800' },
    { id: '6', title: 'Fashion Photography', description: 'Editorial and commercial fashion photography for brands and individuals.', duration: 'Half/full day', price: 'From ₹2,400' },
  ],
  gallery: GALLERY_IMGS.map((img, i) => ({
    id: String(i + 1),
    url: img.url,
    category: img.category,
    caption: `${img.category} session ${i + 1}`,
  })),
  pricing: [
    {
      id: '1', name: 'Essential', price: '₹2,400', popular: false,
      description: 'Perfect for intimate ceremonies and small celebrations.',
      features: ['6 hours of coverage', '1 photographer', 'Online gallery', '300+ edited photos', 'Print release'],
    },
    {
      id: '2', name: 'Signature', price: '₹3,800', popular: true,
      description: 'Our most popular package for full wedding-day coverage.',
      features: ['10 hours of coverage', '2 photographers', 'Engagement session', 'Online gallery', '600+ edited photos', 'Wedding album', 'Print release'],
    },
    {
      id: '3', name: 'Luxury', price: '₹5,800', popular: false,
      description: 'Complete luxury experience from engagement to final delivery.',
      features: ['Full-day coverage', '2 photographers + assistant', 'Engagement session', 'Bridal portraits', 'Online gallery', '900+ edited photos', 'Premium album', 'Framed print', 'Rush delivery'],
    },
  ],
  testimonials: [
    { id: '1', clientName: 'Emma & James Wilson', eventType: 'Wedding', rating: 5, review: 'Marcus captured our wedding day perfectly. Every photo tells a story and we cry happy tears every time we look at our album. Absolutely magical.', date: 'October 2024' },
    { id: '2', clientName: 'Sophia Rodriguez', eventType: 'Portrait Session', rating: 5, review: 'I was nervous in front of the camera but Marcus made me feel so comfortable. The photos are stunning — I actually love how I look!', date: 'August 2024' },
    { id: '3', clientName: 'The Johnson Family', eventType: 'Family Portrait', rating: 5, review: 'Best family photos we have ever had. Marcus was amazing with our kids (aged 3 and 6) and the results were breathtaking.', date: 'July 2024' },
  ],
  faqs: [
    { id: '1', question: 'How far in advance should I book?', answer: 'For weddings, I recommend booking 12–18 months in advance, especially for peak season (May–October). Portrait sessions can often be booked 4–6 weeks out.' },
    { id: '2', question: 'Do you travel for destination weddings?', answer: 'Absolutely! I love destination weddings. Travel fees apply depending on location. Contact me for a custom quote.' },
    { id: '3', question: 'When will I receive my photos?', answer: 'Wedding galleries are delivered within 6–8 weeks. Portrait sessions are typically ready within 2 weeks.' },
    { id: '4', question: 'What is your payment schedule?', answer: 'A 30% retainer secures your date. The remaining balance is due 2 weeks before the event.' },
    { id: '5', question: 'Can I print my photos?', answer: 'Yes — all packages include a full print release so you can print your images wherever and whenever you like.' },
  ],
};
