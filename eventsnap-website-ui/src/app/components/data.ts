import { Camera, Calendar, CreditCard, Image, BarChart3, Users, Globe, Layers, FileText, Smartphone, TrendingUp } from "lucide-react";
import { PURPLE, CORAL } from "./theme";

export const FEATURES_DATA = [
  {
    icon: Calendar,
    title: "Smart Booking dashboard",
    desc: "Keep bookings, inquiry records, and event details together in one operational dashboard.",
    color: PURPLE,
  },
  {
    icon: Image,
    title: "Event galleries",
    desc: "Create public gallery links, manage cover photos, and control guest access for each event.",
    color: CORAL,
  },
  {
    icon: CreditCard,
    title: "Invoices and balances",
    desc: "Track payment totals, outstanding balances, and booking-level financial status in one place.",
    color: "#22c55e",
  },
  {
    icon: Layers,
    title: "Portfolio builder",
    desc: "Publish a public portfolio with portfolio sections, business details, and a clean online presence.",
    color: "#f59e0b",
  },
  {
    icon: Users,
    title: "Photographer profile tools",
    desc: "Store business profile details, profile photos, and portfolio information tied to the signed-in account.",
    color: "#06b6d4",
  },
  {
    icon: BarChart3,
    title: "Business overview",
    desc: "Monitor upcoming shoots, active bookings, and the state of the current workload without extra tools.",
    color: "#a855f7",
  },
  {
    icon: FileText,
    title: "Inquiry and lead flow",
    desc: "Capture leads and client requests in the same system that manages bookings and follow-up work.",
    color: "#ec4899",
  },
  {
    icon: Smartphone,
    title: "Android camera upload",
    desc: "Move new camera photos directly into a chosen event gallery while working on location.",
    color: "#10b981",
  },
];

export const STEPS_DATA = [
  {
    step: "01",
    title: "Create the business profile",
    desc: "Set up your photographer account, business details, and portfolio so inquiries and bookings have a clean home.",
    icon: Camera,
  },
  {
    step: "02",
    title: "Track inquiries and bookings",
    desc: "Use the dashboard to manage client requests, booking details, and follow-up activity from one place.",
    icon: Globe,
  },
  {
    step: "03",
    title: "Share galleries and manage delivery",
    desc: "Upload event footage, assign public share links, and keep guest access settings in sync with each event.",
    icon: TrendingUp,
  },
];

export const PRICING_DATA = [
  {
    name: "Starter",
    price: { monthly: 0, annual: 0 },
    description: "Perfect for photographers just starting out.",
    features: [
      "5 bookings per month",
      "2 active client galleries",
      "Basic invoicing",
      "Booking page",
      "Email support",
    ],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Pro",
    price: { monthly: 29, annual: 23 },
    description: "Everything you need to run a thriving photography business.",
    features: [
      "Unlimited bookings",
      "Unlimited client galleries",
      "Online payments & deposits",
      "Automated workflows",
      "Client CRM",
      "Contracts & e-signatures",
      "Business analytics",
      "Priority support",
    ],
    cta: "Start 14-Day Free Trial",
    featured: true,
  },
  {
    name: "Studio",
    price: { monthly: 79, annual: 63 },
    description: "For teams and high-volume photography studios.",
    features: [
      "Everything in Pro",
      "Up to 5 team members",
      "White-label galleries",
      "Custom domain booking",
      "Advanced analytics & reports",
      "Custom contracts & forms",
      "Dedicated account manager",
    ],
    cta: "Start 14-Day Free Trial",
    featured: false,
  },
];

export const TESTIMONIALS_DATA = [
  {
    name: "Workshop client",
    role: "Photographer",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format",
    rating: 5,
    quote:
      "EventSnap gave us one place to track bookings, manage event galleries, and keep our portfolio current without bouncing between tools.",
  },
  {
    name: "Event team",
    role: "Production workflow",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
    rating: 5,
    quote:
      "The dashboard makes it easier to keep every event organized, from inquiry through gallery delivery and invoice tracking.",
  },
  {
    name: "Studio owner",
    role: "Photography business",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&auto=format",
    rating: 5,
    quote:
      "We needed a tool that handled the operational side of work, not just image storage. EventSnap fits that workflow well.",
  },
];

export const FAQS_DATA = [
  {
    q: "Is EventSnap.ai really free to start?",
    a: "Yes! Our Starter plan is completely free, forever — no credit card required. You get 5 bookings per month, 2 active client galleries, and basic invoicing at no cost. Upgrade whenever you're ready to scale.",
  },
  {
    q: "Can I accept payments through EventSnap?",
    a: "Absolutely. EventSnap integrates with Stripe to accept credit cards, debit cards, and bank transfers. You can collect deposits at booking and final balances before delivery. Funds are deposited directly to your bank.",
  },
  {
    q: "How do client galleries work?",
    a: "After a shoot, upload your edited photos to EventSnap and share a private link with your client. Galleries are password-protected, mobile-optimized, and you control who can download, at what resolution, and for how long.",
  },
  {
    q: "Can I customize my booking page with my branding?",
    a: "Yes! Your booking page displays your logo, portfolio photos, services, and pricing. Pro plans include custom domain support and white-label options so it feels completely on-brand for your business.",
  },
  {
    q: "Is my client data secure?",
    a: "Absolutely. All data is encrypted in transit and at rest using industry-standard AES-256 encryption, stored in SOC 2 Type II compliant infrastructure. We never sell or share your client data — ever.",
  },
  {
    q: "Can I try Pro features before committing?",
    a: "Yes — every paid plan includes a 14-day free trial with full access to all Pro features. No credit card required. Cancel anytime, no questions asked.",
  },
  {
    q: "Does EventSnap work for photographers outside the US?",
    a: "Yes! EventSnap supports photographers in 40+ countries. We support multiple currencies, local tax configurations, and Stripe's global payment network for international bookings and payments.",
  },
  {
    q: "Can I import my existing clients and bookings?",
    a: "Yes. EventSnap supports CSV import for contacts and bookings, and our team offers free migration assistance for Studio plan subscribers to make your transition as smooth as possible.",
  },
];

