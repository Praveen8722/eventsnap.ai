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

// Test seam: when set, sendEmail uses this transport instead of real SMTP, so
// the email paths can be exercised without a network connection. Nothing in
// the app sets it — only the test suite does (see __setTestTransport). In
// production it stays null and real SMTP config is used.
let testTransport = null;
export const __setTestTransport = (tx) => {
  testTransport = tx;
  transporter = null;
};

const getTransporter = () => {
  if (testTransport) return testTransport;
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

// A readable date, or "" for a missing / unparseable value.
const fmtDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

// Renders a list of [label, value] rows as the shared two-column HTML table,
// HTML-escaping every value. Empty values are dropped by the caller.
const detailsTable = (rows) => `
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="color:#666;vertical-align:top"><b>${escapeHtml(k)}</b></td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`
        )
        .join("")}
    </table>`;

// ── Message builders ───────────────────────────────────────────────────────
// Each returns a plain { subject, text, html, replyTo? } object and sends
// nothing, so they can be unit-tested without SMTP. The send* wrappers below
// pair a builder with a recipient and hand it to the best-effort sendEmail.

// New public Portfolio Contact-form inquiry, for the photographer.
export const buildInquiryEmail = ({ photographerName, inquiry }) => {
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
    ${detailsTable(rows)}
    <p style="color:#666">Reply to this email to respond to the customer directly.</p>`;

  // No Reply-To when the visitor left email blank (it's optional).
  return { subject, text, html, replyTo: oneLine(inquiry.email) || undefined };
};

// Security notice after a self-service password reset (there is no reset link
// or code — forgotPassword replaces the hash directly), sent to the account's
// own registered email so the owner knows if it wasn't them.
export const buildPasswordResetEmail = ({ name } = {}) => {
  const subject = "Your EventSnap password was changed";
  const text = [
    `Hi ${name || "there"},`,
    "",
    "This is a confirmation that the password for your EventSnap account was just changed.",
    "",
    "If you made this change, no further action is needed.",
    "If you did NOT change your password, reset it again immediately from the Forgot Password page and contact support.",
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(name || "there")},</p>
    <p>This is a confirmation that the password for your EventSnap account was just changed.</p>
    <p>If you made this change, no further action is needed.</p>
    <p style="color:#a00">If you did <b>not</b> change your password, reset it again immediately from the Forgot Password page and contact support.</p>`;
  return { subject, text, html };
};

// Booking details shared by the client confirmation and the owner notification.
const bookingRows = (booking = {}) =>
  [
    ["Booking ID", booking.bookingId],
    ["Event Type", booking.eventType],
    ["Event Date", fmtDate(booking.eventDate)],
    ["Package", booking.packageSelected],
    ["Phone", booking.phone],
  ].filter(([, v]) => v && String(v).trim());

// Confirmation to the person who booked (dashboard or public "Book Now" form).
export const buildBookingClientEmail = ({ clientName, photographerName, booking } = {}) => {
  const rows = bookingRows(booking);
  const who = photographerName || "your photographer";
  const subject = `Booking request received${booking?.eventType ? ` — ${oneLine(booking.eventType)}` : ""}`;
  const text = [
    `Hi ${clientName || "there"},`,
    "",
    `Thanks for your booking request. ${who} has received it and will be in touch soon.`,
    "",
    "Your booking details:",
    ...rows.map(([k, v]) => `${k}: ${v}`),
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(clientName || "there")},</p>
    <p>Thanks for your booking request. ${escapeHtml(who)} has received it and will be in touch soon.</p>
    <p>Your booking details:</p>
    ${detailsTable(rows)}`;
  return { subject, text, html };
};

// New-booking notification to the photographer (owner).
export const buildBookingOwnerEmail = ({ photographerName, booking } = {}) => {
  const rows = [
    ["Client", booking?.clientName],
    ["Email", booking?.email],
    ...bookingRows(booking).filter(([k]) => k !== "Booking ID"),
    ["Booking ID", booking?.bookingId],
  ].filter(([, v]) => v && String(v).trim());
  const via = booking?.source === "portfolio" ? "your public portfolio" : "your dashboard";
  const subject = `New booking from ${oneLine(booking?.clientName) || "a client"} via EventSnap`;
  const text = [
    `Hi ${photographerName || "there"},`,
    "",
    `You have a new booking via ${via}:`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Reply to this email to respond to the client directly.",
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(photographerName || "there")},</p>
    <p>You have a new booking via ${escapeHtml(via)}:</p>
    ${detailsTable(rows)}
    <p style="color:#666">Reply to this email to respond to the client directly.</p>`;
  return { subject, text, html, replyTo: oneLine(booking?.email) || undefined };
};

// ── Senders (best-effort; never throw — see sendEmail) ──────────────────────

export const sendInquiryEmail = ({ to, photographerName, inquiry }) =>
  sendEmail({ to, ...buildInquiryEmail({ photographerName, inquiry }) });

export const sendPasswordResetEmail = ({ to, name }) =>
  sendEmail({ to, ...buildPasswordResetEmail({ name }) });

export const sendBookingClientEmail = ({ to, clientName, photographerName, booking }) =>
  sendEmail({ to, ...buildBookingClientEmail({ clientName, photographerName, booking }) });

export const sendBookingOwnerEmail = ({ to, photographerName, booking }) =>
  sendEmail({ to, ...buildBookingOwnerEmail({ photographerName, booking }) });

// Payment reminder to the customer for an outstanding booking balance. The
// photographer may supply a custom `message` (the UI pre-fills one); it is the
// body text and is HTML-escaped. The recipient is resolved by the caller from
// the stored booking record, never from the message or any request field.
export const buildPaymentReminderEmail = ({ clientName, photographerName, booking, message } = {}) => {
  const rows = [
    ["Booking ID", booking?.bookingId],
    ["Event Type", booking?.eventType],
    ["Event Date", fmtDate(booking?.eventDate)],
    ["Package", booking?.packageSelected],
  ].filter(([, v]) => v && String(v).trim());
  const from = photographerName || "your photographer";
  const subject = `Payment reminder${booking?.bookingId ? ` — booking ${oneLine(booking.bookingId)}` : ""}`;
  const body = String(message || "").trim();
  const defaultLine = `This is a friendly reminder about the outstanding balance for your booking with ${from}. Please arrange payment at your earliest convenience.`;
  const text = [
    `Hi ${clientName || "there"},`,
    "",
    body || defaultLine,
    "",
    "Your booking details:",
    ...rows.map(([k, v]) => `${k}: ${v}`),
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(clientName || "there")},</p>
    <p style="white-space:pre-wrap">${escapeHtml(body || defaultLine)}</p>
    <p>Your booking details:</p>
    ${detailsTable(rows)}`;
  return { subject, text, html };
};

export const sendPaymentReminderEmail = ({ to, clientName, photographerName, booking, message }) =>
  sendEmail({ to, ...buildPaymentReminderEmail({ clientName, photographerName, booking, message }) });
