import { Camera, Calendar, CreditCard, Image, BarChart3, Users, Globe, Layers, FileText, Smartphone, TrendingUp } from "lucide-react";
import { PURPLE, CORAL } from "./theme";

export const FEATURES_DATA = [
  {
    icon: Calendar,
    title: "Smart Booking Management",
    desc: "Accept bookings 24/7 with automated confirmations, reminders, and scheduling — no back-and-forth emails.",
    color: PURPLE,
  },
  {
    icon: Image,
    title: "Client Galleries",
    desc: "Deliver stunning online galleries with password protection, download controls, and effortless sharing.",
    color: CORAL,
  },
  {
    icon: CreditCard,
    title: "Payments & Invoicing",
    desc: "Send professional invoices, collect deposits, and accept online payments directly into your bank.",
    color: "#22c55e",
  },
  {
    icon: Layers,
    title: "Kanban Workflows",
    desc: "Keep every project on track with visual Kanban boards, task checklists, and automated workflow stages.",
    color: "#f59e0b",
  },
  {
    icon: Users,
    title: "Client CRM",
    desc: "Centralized client database with notes, history, questionnaires, contracts, and communication logs.",
    color: "#06b6d4",
  },
  {
    icon: BarChart3,
    title: "Business Analytics",
    desc: "Understand your revenue trends, booking performance, and business growth all at a single glance.",
    color: "#a855f7",
  },
  {
    icon: FileText,
    title: "Contracts & Proposals",
    desc: "Create, send, and collect e-signatures on professional contracts and custom quotes from any device.",
    color: "#ec4899",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    desc: "Manage your business from anywhere. Full-featured iOS and Android apps for photographers on the go.",
    color: "#10b981",
  },
];

export const STEPS_DATA = [
  {
    step: "01",
    title: "Create Your Profile",
    desc: "Set up your EventSnap.ai account in minutes. Add your services, pricing packages, portfolio images, and availability calendar.",
    icon: Camera,
  },
  {
    step: "02",
    title: "Share Your Booking Link",
    desc: "Send clients your personalized booking page. They choose a package, pick a date, sign a contract, and pay a deposit — automatically.",
    icon: Globe,
  },
  {
    step: "03",
    title: "Shoot, Deliver & Get Paid",
    desc: "Upload edited galleries directly to clients, send invoices for final balances, and collect payment. EventSnap handles the follow-up.",
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
    name: "Sarah Mitchell",
    role: "Wedding Photographer, NYC",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format",
    rating: 5,
    quote:
      "EventSnap transformed how I run my business. I went from losing bookings in my email to having everything perfectly organized. My revenue grew 40% in just 6 months.",
  },
  {
    name: "Marcus Chen",
    role: "Commercial Photographer, Los Angeles",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
    rating: 5,
    quote:
      "The client gallery feature alone is worth every penny. My clients love their photo delivery experience, and I love that payments are fully automated.",
  },
  {
    name: "Priya Sharma",
    role: "Portrait & Events Photographer, Chicago",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&auto=format",
    rating: 5,
    quote:
      "I used to spend 10+ hours every week on admin alone. With EventSnap, my bookings, invoices, and client communications practically run themselves.",
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
