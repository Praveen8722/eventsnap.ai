import { ArrowRight, Globe, Smartphone, Award, Heart, BookOpen, Zap } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { PrimaryBtn } from "./PrimaryBtn";
import { TestimonialsSection } from "./TestimonialsSection";
import { FinalCTA } from "./FinalCTA";
import { PURPLE, CORAL, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

export function ForPhotographersPage({ go }: { go: (p: Page) => void }) {
  const types = [
    {
      icon: Heart,
      title: "Wedding Photographers",
      desc: "Manage inquiries, contracts, timelines, and galleries for every wedding. Impress couples from first contact to final delivery.",
    },
    {
      icon: Award,
      title: "Portrait Photographers",
      desc: "Book sessions, deliver galleries, and keep clients coming back with a professional experience that stands out.",
    },
    {
      icon: BookOpen,
      title: "Commercial Photographers",
      desc: "Handle corporate clients, invoicing, usage rights, and project workflows with the professionalism your clients expect.",
    },
    {
      icon: Globe,
      title: "Event Photographers",
      desc: "Manage multi-day bookings, team coordination, and rapid gallery delivery for concerts, sports, and corporate events.",
    },
    {
      icon: Smartphone,
      title: "Family Photographers",
      desc: "Accept seasonal bookings, automate mini-session scheduling, and streamline your entire family photography workflow.",
    },
    {
      icon: Zap,
      title: "Newborn & Maternity",
      desc: "Handle inquiry-to-delivery for your most sentimental clients with care, contracts, and beautiful gallery experiences.",
    },
  ];

  return (
    <div>
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: DARK_GRADIENT }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionLabel color={CORAL}>For Photographers</SectionLabel>
              <h1
                className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Your business runs smoother. You focus on shooting.
              </h1>
              <p className="text-white/65 text-lg mb-8">
                EventSnap.ai handles the business side so you can spend more
                time behind the lens and less time in your inbox.
              </p>
              <PrimaryBtn onClick={() => go("signup")} size="lg">
                Start Free Today <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&h=400&fit=crop&auto=format"
                  alt="Professional photographer at work"
                  className="w-full object-cover h-72"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2
              className="text-3xl font-bold text-foreground mb-4"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Built for every type of photographer
            </h2>
            <p className="text-muted-foreground text-lg">
              Whether you shoot weddings, portraits, or commercial work —
              EventSnap.ai adapts to your workflow.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {types.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-border p-6 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${PURPLE}12` }}
                >
                  <Icon className="w-5 h-5" style={{ color: PURPLE }} />
                </div>
                <h3
                  className="font-semibold text-foreground mb-2"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20" style={{ background: "#f7f6ff" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl font-bold text-foreground mb-6"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            The numbers don't lie
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                value: "10 hrs",
                label: "Saved per week on average",
                sub: "Per photographer using EventSnap",
              },
              {
                value: "32%",
                label: "Revenue growth in 6 months",
                sub: "For Pro plan subscribers",
              },
              {
                value: "4.9★",
                label: "Photographer satisfaction",
                sub: "From 2,400+ verified reviews",
              },
            ].map(({ value, label, sub }) => (
              <div
                key={label}
                className="bg-white rounded-2xl p-7 border border-border text-center"
              >
                <p
                  className="font-bold text-3xl mb-2"
                  style={{ color: PURPLE, fontFamily: "Poppins, sans-serif" }}
                >
                  {value}
                </p>
                <p className="font-semibold text-foreground text-sm mb-1">
                  {label}
                </p>
                <p className="text-muted-foreground text-xs">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <TestimonialsSection />
      <FinalCTA go={go} />
    </div>
  );
}
