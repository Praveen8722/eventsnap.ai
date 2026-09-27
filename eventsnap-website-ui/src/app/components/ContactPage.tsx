import { useState } from "react";
import { ArrowRight, Clock, Mail, Phone, MapPin, CheckCircle } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { PrimaryBtn } from "./PrimaryBtn";
import { PURPLE, CORAL, DARK_GRADIENT } from "./theme";

// EventSnap.ai company website's own backend (separate project, separate
// database) — see eventsnap-website-backend/src/routes/contactRoutes.js.
// Hosted website backend (VITE_WEBSITE_API_URL, set by pages-cd.yaml), local one otherwise.
const CONTACT_API_URL = `${
  import.meta.env.VITE_WEBSITE_API_URL || "http://localhost:8081"
}/api/contact`;

export function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to send message");
      }
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <section className="py-16" style={{ background: DARK_GRADIENT }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionLabel color={CORAL}>Contact Us</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            We'd love to hear from you
          </h1>
          <p className="text-white/65 text-lg">
            Have a question, feedback, or want a demo? Our team replies within 1
            business day.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              {sent ? (
                <div className="text-center py-16">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: `${PURPLE}15` }}
                  >
                    <CheckCircle
                      className="w-8 h-8"
                      style={{ color: PURPLE }}
                    />
                  </div>
                  <h3
                    className="text-xl font-bold text-foreground mb-2"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    Message sent!
                  </h3>
                  <p className="text-muted-foreground">
                    We'll get back to you within 1 business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Sarah Mitchell"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="sarah@studio.com"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="How can we help?"
                      value={form.subject}
                      onChange={(e) =>
                        setForm({ ...form, subject: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell us more..."
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground resize-none"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  <PrimaryBtn size="md">
                    {sending ? (
                      "Sending…"
                    ) : (
                      <>
                        Send Message <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </PrimaryBtn>
                </form>
              )}
            </div>

            <div className="lg:col-span-2 space-y-5">
              {[
                { icon: Mail, label: "Email", value: "hello@eventsnap.ai" },
                { icon: Phone, label: "Phone", value: "+1 (800) 123-4567" },
                {
                  icon: MapPin,
                  label: "Address",
                  value: "340 Pine Street, San Francisco, CA 94104",
                },
                {
                  icon: Clock,
                  label: "Support Hours",
                  value: "Mon–Fri, 9am–6pm PT",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${PURPLE}12` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: PURPLE }} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      {label}
                    </p>
                    <p className="text-foreground text-sm mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
