import { SectionLabel } from "./SectionLabel";
import { FinalCTA } from "./FinalCTA";
import { CORAL, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

export function AboutPage({ go }: { go: (p: Page) => void }) {
  const team = [
    {
      name: "Alex Rivera",
      role: "Co-Founder & CEO",
      imgId: "1507003211169-0a1dd7228f2d",
    },
    {
      name: "Maya Patel",
      role: "Co-Founder & CTO",
      imgId: "1573496359142-b8d87734a5a2",
    },
    {
      name: "Jordan Brooks",
      role: "Head of Product",
      imgId: "1560250097-0b93528c311a",
    },
    {
      name: "Lena Schmidt",
      role: "Head of Design",
      imgId: "1580489944761-15a19d654956",
    },
  ];
  return (
    <div>
      <section className="py-20" style={{ background: DARK_GRADIENT }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionLabel color={CORAL}>About Us</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-5"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Built by photographers, for photographers
          </h1>
          <p className="text-white/65 text-lg">
            EventSnap.ai was born from frustration — our founders were
            photographers tired of juggling 5 different apps, losing bookings in
            email, and spending nights on admin instead of editing.
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
                Our mission
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-5">
                We believe photographers deserve tools as beautiful and
                professional as their work. Our mission is to eliminate the
                business burden so photographers can focus on what they love —
                creating.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Founded in 2022, EventSnap.ai has grown to serve over 10,000
                photographers across 40+ countries. We're a remote-first team of
                designers, engineers, and former photographers who care deeply
                about making your business run better.
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&auto=format"
                alt="Photography team at work"
                className="w-full h-72 object-cover"
              />
            </div>
          </div>

          <div className="text-center mb-10">
            <h2
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Meet the team
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map(({ name, role, imgId }) => (
              <div key={name} className="text-center">
                <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-4 bg-muted">
                  <img
                    src={`https://images.unsplash.com/photo-${imgId}?w=200&h=200&fit=crop&auto=format`}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p
                  className="font-semibold text-foreground"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  {name}
                </p>
                <p className="text-muted-foreground text-sm mt-0.5">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA go={go} />
    </div>
  );
}
