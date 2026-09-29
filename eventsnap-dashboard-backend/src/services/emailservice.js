import nodemailer from "nodemailer";

// Outgoing email over plain SMTP (any provider — e.g. a Gmail App Password).
// Configure in .env:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS,
//   SMTP_FROM (optional, defaults to SMTP_USER)
//   SMTP_SECURE (optional "true"/"false"; defaults to true only for port 465)
//
// Best-effort by design: when SMTP isn't configured or the send fails, this
// logs and resolves { sent: false } — it never throws, so the caller's own
// request (e.g. saving a Portfolio inquiry) is never affected.
let transporter = null;

const env = (key) => String(process.env[key] ?? "").trim();

const smtpConfig = () => {
  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT")) || 587;
  const user = env("SMTP_USER");
  let pass = env("SMTP_PASS");
  // Google shows App Passwords as "abcd efgh ijkl mnop" — the spaces aren't
  // part of the password.
  if (/gmail\.com$/i.test(host)) pass = pass.replace(/\s+/g, "");
  const secureEnv = env("SMTP_SECURE").toLowerCase();
  const secure = secureEnv ? secureEnv === "true" : port === 465;
  return { host, port, user, pass, secure, from: env("SMTP_FROM") || user };
};

const getTransporter = () => {
  const { host, port, user, pass, secure } = smtpConfig();
  if (!host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
  }
  return transporter;
};

const describeError = (error) =>
  [error.code, error.responseCode, error.response || error.message]
    .filter(Boolean)
    .join(" | ");

// Called once at server startup so a missing or wrong SMTP setup shows up
// in the backend console immediately, not only when an email is attempted.
export const verifyEmailTransport = async () => {
  const { host, port, user, pass } = smtpConfig();
  const missing = [
    !host && "SMTP_HOST",
    !user && "SMTP_USER",
    !pass && "SMTP_PASS",
  ].filter(Boolean);
  if (missing.length) {
    console.warn(
      `SMTP not configured — emails are disabled. Missing in .env: ${missing.join(", ")}`
    );
    return false;
  }
  try {
    await getTransporter().verify();
    console.log(`SMTP ready (${host}:${port} as ${user})`);
    return true;
  } catch (error) {
    console.error(`SMTP check failed (${host}:${port}): ${describeError(error)}`);
    return false;
  }
};

export const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  const tx = getTransporter();
  if (!tx) {
    console.warn("Email not sent (SMTP_HOST not configured):", subject);
    return { sent: false, reason: "not-configured" };
  }
  if (!to) return { sent: false, reason: "no-recipient" };

  try {
    const info = await tx.sendMail({
      from: smtpConfig().from,
      to,
      subject,
      text,
      html,
      replyTo,
    });
    console.log(`Email sent: "${subject}" (${info.messageId})`);
    return { sent: true };
  } catch (error) {
    console.error(`Email send failed: ${describeError(error)}`);
    return { sent: false, reason: "send-failed" };
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Single-line values only — keeps visitor input out of mail headers.
const oneLine = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();

// Notifies a photographer of a new public Portfolio Contact form inquiry.
// Every visitor-supplied value is HTML-escaped / header-sanitized.
export const sendInquiryEmail = ({ to, photographerName, inquiry }) => {
  const rows = [
    ["Name", inquiry.name],
    ["Email", inquiry.email],
    ["Phone", inquiry.phone],
    ["Event Type", inquiry.eventType],
    ["Message", inquiry.message],
  ].filter(([, v]) => v && String(v).trim());

  const subject = `New enquiry from ${oneLine(inquiry.name)} via your EventSnap portfolio`;
  const text = [
    `Hi ${photographerName || "there"},`,
    "",
    "You have a new enquiry from your EventSnap portfolio Contact form:",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Reply to this email to respond to the customer directly.",
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(photographerName || "there")},</p>
    <p>You have a new enquiry from your EventSnap portfolio Contact form:</p>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="color:#666;vertical-align:top"><b>${k}</b></td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`
        )
        .join("")}
    </table>
    <p style="color:#666">Reply to this email to respond to the customer directly.</p>`;

  // No Reply-To when the visitor left email blank (it's optional).
  return sendEmail({ to, subject, text, html, replyTo: oneLine(inquiry.email) || undefined });
};
