import mongoose from "mongoose";

// One Portfolio document per photographer (User). All portfolio sections live
// here — there is no other portfolio store.

const serviceSchema = new mongoose.Schema(
  {
    id: String,
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    duration: { type: String, default: "" },
    price: { type: String, default: "" },
  },
  { _id: false }
);

const galleryItemSchema = new mongoose.Schema(
  {
    id: String,
    url: { type: String, default: "" },
    category: { type: String, default: "" },
    caption: { type: String, default: "" },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    id: String,
    name: { type: String, default: "" },
    price: { type: String, default: "" },
    popular: { type: Boolean, default: false },
    description: { type: String, default: "" },
    features: { type: [String], default: [] },
  },
  { _id: false }
);

const testimonialSchema = new mongoose.Schema(
  {
    id: String,
    clientName: { type: String, default: "" },
    eventType: { type: String, default: "" },
    rating: { type: Number, default: 5 },
    review: { type: String, default: "" },
    date: { type: String, default: "" },
  },
  { _id: false }
);

const faqSchema = new mongoose.Schema(
  {
    id: String,
    question: { type: String, default: "" },
    answer: { type: String, default: "" },
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Public identity
    name: { type: String, default: "" },
    slug: { type: String, required: true, unique: true },

    // Look & feel
    theme: { type: String, default: "dark" },
    accent: { type: String, default: "#6C63FF" },

    // Profile / About
    tagline: { type: String, default: "" },
    bio: { type: String, default: "" },
    about: { type: String, default: "" },
    experience: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    // Portfolio navbar avatar — independent of the About profilePhoto.
    // Empty means the navbar shows the owner's initials.
    navbarPhoto: { type: String, default: "" },

    // Contact
    location: { type: String, default: "" },
    serviceArea: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    social: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      youtube: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
    },

    // Sections
    services: { type: [serviceSchema], default: [] },
    gallery: { type: [galleryItemSchema], default: [] },
    pricing: { type: [pricingSchema], default: [] },
    testimonials: { type: [testimonialSchema], default: [] },
    faqs: { type: [faqSchema], default: [] },

    // Portfolio Settings toggles (visibility / sections / advanced).
    settings: {
      published: { type: Boolean, default: true },
      allowInquiries: { type: Boolean, default: true },
      passwordProtected: { type: Boolean, default: false },
      showPricing: { type: Boolean, default: true },
      showTestimonials: { type: Boolean, default: true },
      showFAQ: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      seoOptimized: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Portfolio", portfolioSchema);
