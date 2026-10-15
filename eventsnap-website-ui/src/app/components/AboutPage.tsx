import { SectionLabel } from "./SectionLabel";
import { FinalCTA } from "./FinalCTA";
import { CORAL, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

export function AboutPage({ go }: { go: (p: Page) => void }) {
  return (
    <div>
      <section className="py-20" style={{ background: DARK_GRADIENT }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionLabel color={CORAL}>About Us</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-5"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            EventSnap helps photographers run the business behind the work
          </h1>
          <p className="text-white/65 text-lg">
            The product is built around the real workflow photographers need after a shoot:
            managing inquiries, tracking bookings, sharing galleries, keeping portfolios updated,
            and staying on top of invoicing and client communication.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center mb-20">
            <div>
              <h2
                className="text-3xl font-bold text-foreground mb-5"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Our focus
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-5">
                EventSnap is designed for photographers who need more than a gallery tool.
                It brings together the operational side of a photography business — inquiry flow,
                client booking records, public event sharing, portfolio management, invoice visibility,
                and photo delivery — in a single dashboard.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The product is especially relevant for professionals handling repeat bookings,
                public event galleries, guest sharing, portfolio marketing, and day-to-day business administration.
                The goal is simple: less admin friction, clearer client workflows, and more time spent on the actual work.
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&auto=format"
                alt="Photography workflow and business planning"
                className="w-full h-72 object-cover"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                title: "Bookings",
                text: "Manage incoming requests and keep each shoot tied to its client record, timeline, and financial status.",
              },
              {
                title: "Galleries",
                text: "Create shareable event albums, control guest access, and deliver photos through a public event flow.",
              },
              {
                title: "Portfolio",
                text: "Keep business details, services, and public portfolio content synced in the same system as the rest of the dashboard.",
              },
            ].map(({ title, text }) => (
              <div key={title} className="rounded-2xl border border-border p-6 bg-muted/30">
                <h3
                  className="font-semibold mb-2"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA go={go} />
    </div>
  );
}
