"use client";

import { useState, useCallback, useRef } from "react";
import {
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
  User,
  Image as ImageIcon,
  FileText,
  MapPin,
  Phone,
  Mail,
  Camera,
  Star,
  HelpCircle,
  Share2,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { usePortfolioDataStore } from "./portfolioStore";
import { publicPortfolioPrefix, displayUrl } from "@/lib/portfolioQr";
import { uploadPortfolioPhoto } from "@/api/portfolioApi";
import { photoSrc } from "./portfolioPhoto";

function useDebouncedSave(onSave, delay = 1800) {
  const timer = useRef(null);
  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onSave, delay);
  }, [onSave, delay]);
}

function SaveIndicator({ state, onRetry }) {
  if (state === "idle") return null;
  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${
        state === "saving"
          ? "text-gray-500 bg-gray-100"
          : state === "saved"
            ? "text-green-600 bg-green-50"
            : "text-red-600 bg-red-50"
      }`}
    >
      {state === "saving" && <Loader2 size={12} className="animate-spin" />}
      {state === "saved" && <Check size={12} />}
      {state === "error" && <AlertCircle size={12} />}
      <span>
        {state === "saving"
          ? "Saving..."
          : state === "saved"
            ? "Saved automatically"
            : "Unable to save — Retry"}
      </span>
      {state === "error" && (
        <button className="underline ml-1" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm cursor-pointer dashboard-card">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#EEF0FF] rounded-lg flex items-center justify-center text-[#6C63FF]">
            {icon}
          </div>
          <span className="font-medium text-[#1E1E1E]">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF]/30 transition-colors";
const TEXTAREA = `${INPUT} resize-none`;

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

// Built-in photos a photographer can pick instead of uploading, for the
// Profile Photo and the Navbar Photo (the first one is the seeded starter photo).
const PRESET_PROFILE_PHOTOS = [
  "photo-1554048612-b6a482bc67e5",
  "photo-1542038784456-1ea8e935640e",
  "photo-1520390138845-fd2d229dd553",
  "photo-1516035069371-29a1b244cc32",
  "photo-1471341971476-ae15ff5dd4ea",
  "photo-1452587925148-ce544e77e70d",
];

// A picked preset is saved as its full image URL rather than the bare id, so
// it's distinguishable from the seeded starter id. Saved ids from before this
// still count as selected.
const presetPhotoUrl = (id) => `https://images.unsplash.com/${id}?w=800&auto=format`;

function PresetPhotoPicker({ presets, value, label, onSelect }) {
  return (
    <div className="grid grid-cols-6 @max-[560px]:grid-cols-3 gap-1.5 mt-2">
      {presets.map((id, i) => {
        const selected = value === id || value === presetPhotoUrl(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(presetPhotoUrl(id))}
            aria-label={`Use preset ${label} ${i + 1}`}
            aria-pressed={selected}
            className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
              selected
                ? "border-[#6C63FF]"
                : "border-transparent hover:border-[#6C63FF]/50"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc(id, "w=120&h=120&fit=crop&auto=format")}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}

function PhotoUploadCard({ src, label, kind, onSelect }) {
  const inputRef = useRef(null);

  // The file is stored on the server (a base64 data URL is too large for the
  // portfolio save); only its saved "/uploads/..." url goes into the portfolio.
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES)
      return;
    try {
      const res = await uploadPortfolioPhoto(kind, file);
      if (res.data?.url) onSelect?.(res.data.url);
    } catch (err) {
      alert(err?.response?.data?.message || `Failed to upload ${label}`);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="relative group rounded-xl overflow-hidden border-2 border-dashed border-gray-200 hover:border-[#6C63FF] transition-colors cursor-pointer"
      style={{ height: 120 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />
      {src ? (
        <>
          <img
            src={photoSrc(src, "w=300&h=240&fit=crop&auto=format")}
            className="w-full h-full object-cover"
            alt={label}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
            <Camera size={20} className="text-white" />
            <span className="text-white text-xs">Change {label}</span>
          </div>
        </>
      ) : (
        // Nothing chosen yet (only the optional Navbar Photo starts empty).
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400 group-hover:text-[#6C63FF] transition-colors">
          <Camera size={20} />
          <span className="text-xs">Upload {label}</span>
        </div>
      )}
    </div>
  );
}

export function EditPortfolio() {
  const { data, setData, save } = usePortfolioDataStore();
  const [saveState, setSaveState] = useState("idle");
  const idleTimer = useRef(null);

  const doSave = useCallback(async () => {
    setSaveState("saving");
    const res = await save();
    setSaveState(res.ok ? "saved" : "error");
    if (res.ok) {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setSaveState("idle"), 3500);
    }
  }, [save]);

  const triggerSave = useDebouncedSave(doSave);

  const update = useCallback(
    (key, value) => {
      setData((prev) => ({ ...prev, [key]: value }));
      setSaveState("saving");
      triggerSave();
    },
    [setData, triggerSave],
  );

  const updateSocial = (key, value) => {
    setData((prev) => ({ ...prev, social: { ...prev.social, [key]: value } }));
    setSaveState("saving");
    triggerSave();
  };

  // Services
  const addService = () => {
    const newService = {
      id: Date.now().toString(),
      title: "",
      description: "",
      duration: "",
      price: "",
    };
    update("services", [...data.services, newService]);
  };
  const removeService = (id) =>
    update(
      "services",
      data.services.filter((s) => s.id !== id),
    );
  const updateService = (id, field, val) => {
    update(
      "services",
      data.services.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
    );
  };

  // Pricing
  const addPricing = () => {
    update("pricing", [
      ...data.pricing,
      {
        id: Date.now().toString(),
        name: "",
        price: "",
        description: "",
        features: [""],
        popular: false,
      },
    ]);
  };
  const removePricing = (id) =>
    update(
      "pricing",
      data.pricing.filter((p) => p.id !== id),
    );
  const updatePricing = (id, field, val) => {
    update(
      "pricing",
      data.pricing.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    );
  };
  const addFeature = (pId) => {
    update(
      "pricing",
      data.pricing.map((p) =>
        p.id === pId ? { ...p, features: [...p.features, ""] } : p,
      ),
    );
  };
  const updateFeature = (pId, idx, val) => {
    update(
      "pricing",
      data.pricing.map((p) =>
        p.id === pId
          ? { ...p, features: p.features.map((f, i) => (i === idx ? val : f)) }
          : p,
      ),
    );
  };
  const removeFeature = (pId, idx) => {
    update(
      "pricing",
      data.pricing.map((p) =>
        p.id === pId
          ? { ...p, features: p.features.filter((_, i) => i !== idx) }
          : p,
      ),
    );
  };

  // Testimonials
  const addTestimonial = () => {
    update("testimonials", [
      ...data.testimonials,
      {
        id: Date.now().toString(),
        clientName: "",
        eventType: "",
        rating: 5,
        review: "",
        date: "",
      },
    ]);
  };
  const removeTestimonial = (id) =>
    update(
      "testimonials",
      data.testimonials.filter((t) => t.id !== id),
    );
  const updateTestimonial = (id, field, val) => {
    update(
      "testimonials",
      data.testimonials.map((t) => (t.id === id ? { ...t, [field]: val } : t)),
    );
  };

  // FAQs
  const addFAQ = () => {
    update("faqs", [
      ...data.faqs,
      { id: Date.now().toString(), question: "", answer: "" },
    ]);
  };
  const removeFAQ = (id) =>
    update(
      "faqs",
      data.faqs.filter((f) => f.id !== id),
    );
  const updateFAQ = (id, field, val) => {
    update(
      "faqs",
      data.faqs.map((f) => (f.id === id ? { ...f, [field]: val } : f)),
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1E1E]">Edit Portfolio</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Changes save automatically and update your public portfolio
            instantly
          </p>
        </div>
        <SaveIndicator state={saveState} onRetry={doSave} />
      </div>

      {/* Profile */}
      <Section
        title="Profile Information"
        icon={<User size={16} />}
        defaultOpen
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 @max-[560px]:grid-cols-1 gap-4 pt-3">
          <Field label="Photographer Name">
            <input
              className={INPUT}
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your full name"
            />
          </Field>
          <Field label="Portfolio URL Slug">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#6C63FF] focus-within:ring-1 focus-within:ring-[#6C63FF]/30">
              {/* Same live URL prefix the QR code / Portfolio Link use. It can be
                  long, so it may shorten with "…" to keep room for the slug. */}
              <span
                title={displayUrl(publicPortfolioPrefix())}
                className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-r border-gray-200 whitespace-nowrap truncate max-w-[55%] @min-[640px]:max-w-[70%]"
              >
                {displayUrl(publicPortfolioPrefix())}
              </span>
              <input
                className="flex-1 min-w-0 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                value={data.slug}
                onChange={(e) => update("slug", e.target.value)}
                placeholder="your-name"
              />
            </div>
          </Field>
          <Field label="Professional Tagline">
            <input
              className={INPUT}
              value={data.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="e.g. Capturing Your Most Precious Moments"
            />
          </Field>
          <Field label="Years of Experience">
            <input
              className={INPUT}
              value={data.experience}
              onChange={(e) => update("experience", e.target.value)}
              placeholder="e.g. 10+ Years"
            />
          </Field>
          <div className="sm:col-span-2 @max-[560px]:col-span-1">
            <Field label="Short Bio">
              <textarea
                className={TEXTAREA}
                rows={2}
                value={data.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="One or two sentences for your hero section..."
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* Photos */}
      <Section title="Profile & Cover Photo" icon={<ImageIcon size={16} />}>
        <div className="grid grid-cols-2 gap-4 pt-3">
          <Field label="Profile Photo">
            <PhotoUploadCard
              src={data.profilePhoto}
              label="Profile Photo"
              kind="profile"
              onSelect={(url) => update("profilePhoto", url)}
            />
            <PresetPhotoPicker
              presets={PRESET_PROFILE_PHOTOS}
              value={data.profilePhoto}
              label="Profile Photo"
              onSelect={(id) => update("profilePhoto", id)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Square image, at least 400×400px
            </p>
          </Field>
          <Field label="Cover Image">
            <PhotoUploadCard
              src={data.coverImage}
              label="Cover Image"
              kind="cover"
              onSelect={(url) => update("coverImage", url)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Landscape, at least 1200×800px
            </p>
          </Field>
          <Field label="Navbar Photo">
            <PhotoUploadCard
              src={data.navbarPhoto}
              label="Navbar Photo"
              kind="navbar"
              onSelect={(url) => update("navbarPhoto", url)}
            />
            <PresetPhotoPicker
              presets={PRESET_PROFILE_PHOTOS}
              value={data.navbarPhoto}
              label="Navbar Photo"
              onSelect={(id) => update("navbarPhoto", id)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Small avatar in your portfolio&apos;s top bar. Leave empty to show your initials.
              {data.navbarPhoto && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => update("navbarPhoto", "")}
                    className="text-[#6C63FF] hover:underline"
                  >
                    Use initials
                  </button>
                </>
              )}
            </p>
          </Field>
        </div>
      </Section>

      {/* About */}
      <Section title="About" icon={<FileText size={16} />}>
        <div className="pt-3">
          <Field label="About Description">
            <textarea
              className={TEXTAREA}
              rows={4}
              value={data.about}
              onChange={(e) => update("about", e.target.value)}
              placeholder="Tell clients your story, your approach, and what makes you unique..."
            />
          </Field>
        </div>
      </Section>

      {/* Contact & Location */}
      <Section title="Contact & Location" icon={<MapPin size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 @max-[560px]:grid-cols-1 gap-4 pt-3">
          <Field label="Location">
            <input
              className={INPUT}
              value={data.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="City, State"
            />
          </Field>
          <Field label="Service Area">
            <input
              className={INPUT}
              value={data.serviceArea}
              onChange={(e) => update("serviceArea", e.target.value)}
              placeholder="Areas you serve"
            />
          </Field>
          <Field label="Phone">
            <div className="relative">
              <Phone
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className={`${INPUT} pl-8`}
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </Field>
          <Field label="Email">
            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className={`${INPUT} pl-8`}
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="hello@yourname.com"
              />
            </div>
          </Field>
        </div>
      </Section>

      {/* Services */}
      <Section title="Services" icon={<Briefcase size={16} />}>
        <div className="pt-3 space-y-3">
          {data.services.map((svc, idx) => (
            <div
              key={svc.id}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative group cursor-pointer dashboard-card"
            >
              <button
                onClick={() => removeService(svc.id)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={14} className="text-gray-300 cursor-grab" />
                <span className="text-xs text-gray-400 font-medium">
                  Service {idx + 1}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 @max-[560px]:grid-cols-1 gap-3">
                <Field label="Service Name">
                  <input
                    className={INPUT}
                    value={svc.title}
                    onChange={(e) =>
                      updateService(svc.id, "title", e.target.value)
                    }
                    placeholder="e.g. Wedding Photography"
                  />
                </Field>
                <Field label="Duration">
                  <input
                    className={INPUT}
                    value={svc.duration}
                    onChange={(e) =>
                      updateService(svc.id, "duration", e.target.value)
                    }
                    placeholder="e.g. 8–12 hours"
                  />
                </Field>
                <Field label="Starting Price">
                  <input
                    className={INPUT}
                    value={svc.price}
                    onChange={(e) =>
                      updateService(svc.id, "price", e.target.value)
                    }
                    placeholder="e.g. From ₹3,800"
                  />
                </Field>
                <div className="sm:col-span-2 @max-[560px]:col-span-1">
                  <Field label="Description">
                    <textarea
                      className={TEXTAREA}
                      rows={2}
                      value={svc.description}
                      onChange={(e) =>
                        updateService(svc.id, "description", e.target.value)
                      }
                      placeholder="Brief description of this service..."
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addService}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors"
          >
            <Plus size={16} />
            Add Service
          </button>
        </div>
      </Section>

      {/* Pricing */}
      <Section title="Pricing Packages" icon={<DollarSign size={16} />}>
        <div className="pt-3 space-y-3">
          {data.pricing.map((pkg, idx) => (
            <div
              key={pkg.id}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative group cursor-pointer dashboard-card"
            >
              <button
                onClick={() => removePricing(pkg.id)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={14} className="text-gray-300 cursor-grab" />
                <span className="text-xs text-gray-400 font-medium">
                  Package {idx + 1}
                </span>
                <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pkg.popular}
                    onChange={(e) =>
                      updatePricing(pkg.id, "popular", e.target.checked)
                    }
                    className="rounded"
                  />
                  Mark as Popular
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 @max-[560px]:grid-cols-1 gap-3 mb-3">
                <Field label="Package Name">
                  <input
                    className={INPUT}
                    value={pkg.name}
                    onChange={(e) =>
                      updatePricing(pkg.id, "name", e.target.value)
                    }
                    placeholder="e.g. Signature"
                  />
                </Field>
                <Field label="Price">
                  <input
                    className={INPUT}
                    value={pkg.price}
                    onChange={(e) =>
                      updatePricing(pkg.id, "price", e.target.value)
                    }
                    placeholder="e.g. ₹3,800"
                  />
                </Field>
                <div className="sm:col-span-2 @max-[560px]:col-span-1">
                  <Field label="Description">
                    <textarea
                      className={TEXTAREA}
                      rows={1}
                      value={pkg.description}
                      onChange={(e) =>
                        updatePricing(pkg.id, "description", e.target.value)
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Package Features
                </label>
                {pkg.features.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2">
                    <Check size={13} className="text-[#6C63FF] flex-shrink-0" />
                    <input
                      className={`${INPUT} flex-1`}
                      value={f}
                      onChange={(e) =>
                        updateFeature(pkg.id, fi, e.target.value)
                      }
                      placeholder="Feature..."
                    />
                    <button
                      onClick={() => removeFeature(pkg.id, fi)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addFeature(pkg.id)}
                  className="text-xs text-[#6C63FF] flex items-center gap-1 hover:underline"
                >
                  <Plus size={12} />
                  Add Feature
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addPricing}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors"
          >
            <Plus size={16} />
            Add Package
          </button>
        </div>
      </Section>

      {/* Testimonials */}
      <Section title="Testimonials" icon={<Star size={16} />}>
        <div className="pt-3 space-y-3">
          {data.testimonials.map((t, idx) => (
            <div
              key={t.id}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative group cursor-pointer dashboard-card"
            >
              <button
                onClick={() => removeTestimonial(t.id)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={14} className="text-gray-300 cursor-grab" />
                <span className="text-xs text-gray-400 font-medium">
                  Testimonial {idx + 1}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 @max-[560px]:grid-cols-1 gap-3">
                <Field label="Client Name">
                  <input
                    className={INPUT}
                    value={t.clientName}
                    onChange={(e) =>
                      updateTestimonial(t.id, "clientName", e.target.value)
                    }
                    placeholder="Client name"
                  />
                </Field>
                <Field label="Event Type">
                  <input
                    className={INPUT}
                    value={t.eventType}
                    onChange={(e) =>
                      updateTestimonial(t.id, "eventType", e.target.value)
                    }
                    placeholder="e.g. Wedding"
                  />
                </Field>
                <Field label="Date">
                  <input
                    className={INPUT}
                    value={t.date}
                    onChange={(e) =>
                      updateTestimonial(t.id, "date", e.target.value)
                    }
                    placeholder="e.g. October 2024"
                  />
                </Field>
                <div className="sm:col-span-3 @max-[560px]:col-span-1">
                  <Field label="Review">
                    <textarea
                      className={TEXTAREA}
                      rows={2}
                      value={t.review}
                      onChange={(e) =>
                        updateTestimonial(t.id, "review", e.target.value)
                      }
                      placeholder="Client review..."
                    />
                  </Field>
                </div>
                <div>
                  <Field label="Rating">
                    <div className="flex items-center gap-1 pt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => updateTestimonial(t.id, "rating", n)}
                        >
                          <Star
                            size={18}
                            fill={n <= t.rating ? "#F59E0B" : "none"}
                            className={
                              n <= t.rating ? "text-[#F59E0B]" : "text-gray-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addTestimonial}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors"
          >
            <Plus size={16} />
            Add Testimonial
          </button>
        </div>
      </Section>

      {/* FAQs */}
      <Section title="FAQ" icon={<HelpCircle size={16} />}>
        <div className="pt-3 space-y-3">
          {data.faqs.map((faq, idx) => (
            <div
              key={faq.id}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative group cursor-pointer dashboard-card"
            >
              <button
                onClick={() => removeFAQ(faq.id)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
              <span className="text-xs text-gray-400 font-medium block mb-2">
                Question {idx + 1}
              </span>
              <div className="space-y-2">
                <input
                  className={INPUT}
                  value={faq.question}
                  onChange={(e) =>
                    updateFAQ(faq.id, "question", e.target.value)
                  }
                  placeholder="Frequently asked question..."
                />
                <textarea
                  className={TEXTAREA}
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => updateFAQ(faq.id, "answer", e.target.value)}
                  placeholder="Your answer..."
                />
              </div>
            </div>
          ))}
          <button
            onClick={addFAQ}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors"
          >
            <Plus size={16} />
            Add FAQ
          </button>
        </div>
      </Section>

      {/* Social Media */}
      <Section title="Social Media" icon={<Share2 size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 @max-[560px]:grid-cols-1 gap-4 pt-3">
          {(["instagram", "facebook", "youtube", "whatsapp"]).map(
            (platform) => (
              <Field
                key={platform}
                label={platform.charAt(0).toUpperCase() + platform.slice(1)}
              >
                <input
                  className={INPUT}
                  value={data.social[platform]}
                  onChange={(e) => updateSocial(platform, e.target.value)}
                  placeholder={`Your ${platform} handle or URL`}
                />
              </Field>
            ),
          )}
        </div>
      </Section>

      <div className="flex items-center justify-between pt-2 pb-8">
        <p className="text-xs text-gray-400">
          Changes are saved automatically and your public portfolio is updated
          instantly.
        </p>
        <SaveIndicator state={saveState} onRetry={doSave} />
      </div>
    </div>
  );
}
