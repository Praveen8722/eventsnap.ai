// Email service tests — run with `npm test` (node --test).
//
// These never send a real email: the message BUILDERS are pure (they return
// { subject, text, html } and send nothing), and the one send-path test runs
// with SMTP unconfigured, where sendEmail short-circuits before any network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";

// Guarantee no SMTP config leaks in from the shell/.env, so sendEmail can never
// open a connection during tests.
before(() => {
  for (const k of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_PORT", "SMTP_SECURE", "SMTP_FROM"]) {
    delete process.env[k];
  }
});

const {
  buildInquiryEmail,
  buildPasswordResetEmail,
  buildBookingClientEmail,
  buildBookingOwnerEmail,
  buildPaymentReminderEmail,
  sendEmail,
  sendPasswordResetEmail,
  sendPaymentReminderEmail,
  __setTestTransport,
} = await import("./emailservice.js");

test("inquiry email: subject, details and reply-to", () => {
  const msg = buildInquiryEmail({
    photographerName: "Asha",
    inquiry: { name: "Ravi", email: "ravi@example.com", phone: "9876500000", eventType: "Wedding", message: "Need a quote" },
  });
  assert.match(msg.subject, /New enquiry from Ravi/);
  assert.match(msg.text, /Event Type: Wedding/);
  assert.match(msg.html, /Need a quote/);
  assert.equal(msg.replyTo, "ravi@example.com");
});

test("inquiry email: no reply-to when the visitor left email blank", () => {
  const msg = buildInquiryEmail({ photographerName: "Asha", inquiry: { name: "Ravi", phone: "9876500000" } });
  assert.equal(msg.replyTo, undefined);
  assert.doesNotMatch(msg.text, /Email:/);
});

test("inquiry email: HTML-escapes visitor input (no script injection)", () => {
  const msg = buildInquiryEmail({
    photographerName: "Asha",
    inquiry: { name: "<script>alert(1)</script>", phone: "9876500000", message: "<b>hi</b>" },
  });
  assert.doesNotMatch(msg.html, /<script>/);
  assert.match(msg.html, /&lt;script&gt;/);
  assert.doesNotMatch(msg.html, /<b>hi<\/b>/);
});

test("inquiry email: reply-to is header-safe (no CRLF injection)", () => {
  const msg = buildInquiryEmail({
    photographerName: "Asha",
    inquiry: { name: "Ravi", email: "ok@example.com\r\nBcc: evil@example.com", phone: "9876500000" },
  });
  assert.doesNotMatch(msg.replyTo, /[\r\n]/);
});

test("password reset email: confirms the change and warns if unexpected", () => {
  const msg = buildPasswordResetEmail({ name: "Sam" });
  assert.match(msg.subject, /password was changed/i);
  assert.match(msg.text, /Hi Sam,/);
  assert.match(msg.text, /did NOT change/i);
  assert.match(msg.html, /did <b>not<\/b> change/i);
});

test("booking client email: confirmation with details", () => {
  const msg = buildBookingClientEmail({
    clientName: "Ravi",
    photographerName: "Asha",
    booking: { bookingId: "BK001", eventType: "Wedding", eventDate: "2026-12-01", packageSelected: "Premium", phone: "9876500000" },
  });
  assert.match(msg.subject, /Booking request received/);
  assert.match(msg.text, /Thanks for your booking request\. Asha/);
  assert.match(msg.html, /BK001/);
  assert.match(msg.html, /December 2026/); // fmtDate output
});

test("booking owner email: new-booking notice with client reply-to and source wording", () => {
  const msg = buildBookingOwnerEmail({
    photographerName: "Asha",
    booking: { bookingId: "BK002", clientName: "Ravi", email: "ravi@example.com", eventType: "Portrait", source: "portfolio" },
  });
  assert.match(msg.subject, /New booking from Ravi/);
  assert.match(msg.text, /via your public portfolio/);
  assert.equal(msg.replyTo, "ravi@example.com");
  assert.match(msg.html, /Ravi/);
});

test("booking owner email: internal source wording", () => {
  const msg = buildBookingOwnerEmail({ photographerName: "Asha", booking: { clientName: "Ravi", source: "internal" } });
  assert.match(msg.text, /via your dashboard/);
});

test("payment reminder email: uses the photographer's custom message, escaped", () => {
  const msg = buildPaymentReminderEmail({
    clientName: "Ravi",
    photographerName: "Asha",
    booking: { bookingId: "BK001", eventType: "Wedding", eventDate: "2026-12-01" },
    message: "Please pay ₹5000 <soon>",
  });
  assert.match(msg.subject, /Payment reminder — booking BK001/);
  assert.match(msg.text, /Please pay ₹5000 <soon>/);
  assert.match(msg.html, /Please pay ₹5000 &lt;soon&gt;/); // escaped
  assert.doesNotMatch(msg.html, /<soon>/);
});

test("payment reminder email: falls back to a default body when no message given", () => {
  const msg = buildPaymentReminderEmail({ clientName: "Ravi", photographerName: "Asha", booking: { bookingId: "BK002" } });
  assert.match(msg.text, /friendly reminder about the outstanding balance/i);
  assert.match(msg.text, /with Asha/);
});

test("sendEmail is a no-op (no real email) when SMTP is not configured", async () => {
  const res = await sendEmail({ to: "someone@example.com", subject: "x", text: "y" });
  assert.deepEqual(res, { sent: false, reason: "not-configured" });
});

test("send wrappers never throw and send nothing without SMTP", async () => {
  const res = await sendPasswordResetEmail({ to: "someone@example.com", name: "Sam" });
  assert.equal(res.sent, false);
});

// Proves delivery actually succeeds through a REAL nodemailer transport once
// SMTP is configured — using jsonTransport (nodemailer's built-in offline
// transport) so no message ever leaves the machine. This is the exact
// sendEmail → transporter.sendMail path the 502 was blocking when SMTP was
// absent; here it returns { sent: true }.
test("payment reminder is delivered through a real nodemailer transport when configured", async () => {
  const captured = [];
  // jsonTransport serializes the message instead of sending it; wrap its
  // sendMail to capture the final payload for assertions.
  const json = nodemailer.createTransport({ jsonTransport: true });
  const tx = {
    sendMail: async (msg) => {
      captured.push(msg);
      return json.sendMail(msg);
    },
  };
  process.env.SMTP_FROM = "studio@example.com"; // a valid From, as real SMTP needs
  __setTestTransport(tx);
  try {
    const res = await sendPaymentReminderEmail({
      to: "customer@example.com",
      clientName: "Ravi",
      photographerName: "Asha",
      booking: { bookingId: "BK001", eventType: "Wedding", eventDate: "2026-12-01" },
      message: "Please pay the balance.",
    });
    assert.equal(res.sent, true);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].to, "customer@example.com");
    assert.equal(captured[0].from, "studio@example.com");
    assert.match(captured[0].subject, /Payment reminder/);
  } finally {
    __setTestTransport(null);
    delete process.env.SMTP_FROM;
  }
});

after(() => __setTestTransport(null));
