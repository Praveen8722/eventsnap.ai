// End-to-end-ish tests for the two email flows, exercised at the controller
// level with the Mongoose models mocked and a fake mail transport — so no
// database and no real email are involved.
//
// Covered: successful send, missing recipient email, SMTP failure, and
// multi-user isolation (a photographer can only remind their own bookings, and
// an enquiry is always delivered to the slug-resolved owner).
import { test, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// No SMTP config from the shell/.env leaks in; the fake transport below is the
// only transport used.
before(() => {
  for (const k of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_PORT", "SMTP_SECURE", "SMTP_FROM"]) {
    delete process.env[k];
  }
});

const Booking = (await import("../models/Booking.js")).default;
const User = (await import("../models/User.js")).default;
const Portfolio = (await import("../models/Portfolio.js")).default;
const Inquiry = (await import("../models/Inquiry.js")).default;
const { sendPaymentReminder } = await import("./bookingController.js");
const { submitInquiry } = await import("./inquiryController.js");
const { __setTestTransport } = await import("../services/emailservice.js");

// A Mongoose-query-like thenable: supports `await q`, `q.select(...)` and
// `q.catch(...)`, all resolving to the same value.
const q = (value) => ({
  select: () => q(value),
  catch: () => Promise.resolve(value),
  then: (resolve) => resolve(value),
});

// Fake mail transport that records every message and can be told to fail,
// so the email paths run without a network connection.
let sentMessages = [];
let transportShouldFail = false;
const fakeTransport = {
  sendMail: async (msg) => {
    sentMessages.push(msg);
    if (transportShouldFail) throw new Error("smtp down");
    return { messageId: "test-message-id" };
  },
};

beforeEach(() => {
  sentMessages = [];
  transportShouldFail = false;
  __setTestTransport(fakeTransport);
});
afterEach(() => {
  __setTestTransport(null); // restore real SMTP resolution
});

const mockRes = () => {
  const r = { statusCode: 0, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};
const flush = () => new Promise((r) => setImmediate(r));

// ───────────────────────── Payment reminder ─────────────────────────────────

test("payment reminder: sends to the customer email from the DB booking (not the request)", async (t) => {
  const findOne = t.mock.method(Booking, "findOne", () =>
    q({ bookingId: "BK001", user: "ownerA", clientName: "Ravi", email: "customer@db.example", eventType: "Wedding" })
  );
  t.mock.method(User, "findById", () => q({ name: "Asha", businessName: "Asha Studio" }));

  const res = mockRes();
  await sendPaymentReminder(
    // A spoofed `email` in the body must be ignored — recipient comes from DB.
    { params: { bookingId: "BK001" }, userId: "ownerA", body: { message: "Please pay", email: "attacker@evil.example" } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].to, "customer@db.example");
  assert.notEqual(sentMessages[0].to, "attacker@evil.example");
  // The booking lookup is scoped to the authenticated owner.
  assert.deepEqual(findOne.mock.calls[0].arguments[0], { bookingId: "BK001", user: "ownerA" });
});

test("payment reminder: missing customer email → 400, nothing sent", async (t) => {
  t.mock.method(Booking, "findOne", () => q({ bookingId: "BK001", user: "ownerA", clientName: "Ravi", email: "" }));
  t.mock.method(User, "findById", () => q({ name: "Asha" }));

  const res = mockRes();
  await sendPaymentReminder({ params: { bookingId: "BK001" }, userId: "ownerA", body: {} }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /no saved email/i);
  assert.equal(sentMessages.length, 0);
});

test("payment reminder: SMTP failure → 502, action does not crash", async (t) => {
  t.mock.method(Booking, "findOne", () => q({ bookingId: "BK001", user: "ownerA", clientName: "Ravi", email: "customer@db.example" }));
  t.mock.method(User, "findById", () => q({ name: "Asha" }));
  transportShouldFail = true;

  const res = mockRes();
  await sendPaymentReminder({ params: { bookingId: "BK001" }, userId: "ownerA", body: {} }, res);

  assert.equal(res.statusCode, 502);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /could not send/i);
  assert.equal(sentMessages.length, 1); // attempted exactly once
});

test("payment reminder: multi-user isolation — another owner's booking is not found", async (t) => {
  // Owner B asks for a booking id that only exists under owner A: scoped
  // findOne returns null, so no booking and no email.
  const findOne = t.mock.method(Booking, "findOne", () => q(null));

  const res = mockRes();
  await sendPaymentReminder({ params: { bookingId: "BK001" }, userId: "ownerB", body: {} }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(sentMessages.length, 0);
  // Proven scoped to the caller, so cross-user access can't resolve a booking.
  assert.deepEqual(findOne.mock.calls[0].arguments[0], { bookingId: "BK001", user: "ownerB" });
});

// ───────────────────────── Portfolio enquiry ────────────────────────────────

const inquiryReq = (slug, body) => ({ params: { slug }, body });

test("enquiry: notifies the slug-resolved portfolio owner, from DB (not the visitor)", async (t) => {
  t.mock.method(Portfolio, "findOne", () => q({ user: "ownerA" }));
  t.mock.method(User, "findById", () => q({ name: "Asha", businessName: "Asha Studio", email: "asha@owner.example", phone: "9876500000" }));
  t.mock.method(Inquiry, "create", async (doc) => ({ ...doc, toObject: () => ({ ...doc }) }));

  const res = mockRes();
  await submitInquiry(
    inquiryReq("asha-studio", { name: "Visitor", email: "visitor@public.example", phone: "9123456780", eventType: "Wedding", message: "Hi" }),
    res
  );
  await flush(); // let the fire-and-forget email settle

  assert.equal(res.statusCode, 201);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].to, "asha@owner.example"); // owner, from DB
  assert.notEqual(sentMessages[0].to, "visitor@public.example");
  // The visitor's email is only the Reply-To, never the recipient.
  assert.equal(sentMessages[0].replyTo, "visitor@public.example");
});

test("enquiry: multi-user isolation — a different slug reaches a different owner", async (t) => {
  t.mock.method(Portfolio, "findOne", () => q({ user: "ownerB" }));
  t.mock.method(User, "findById", () => q({ name: "Ben", businessName: "Ben Studio", email: "ben@owner.example", phone: "9876511111" }));
  t.mock.method(Inquiry, "create", async (doc) => ({ ...doc, toObject: () => ({ ...doc }) }));

  const res = mockRes();
  await submitInquiry(inquiryReq("ben-studio", { name: "Visitor", phone: "9123456780" }), res);
  await flush();

  assert.equal(res.statusCode, 201);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].to, "ben@owner.example");
});

test("enquiry: owner has no email → inquiry still saved (201), nothing sent", async (t) => {
  t.mock.method(Portfolio, "findOne", () => q({ user: "ownerA" }));
  t.mock.method(User, "findById", () => q({ name: "Asha", email: "" }));
  t.mock.method(Inquiry, "create", async (doc) => ({ ...doc, toObject: () => ({ ...doc }) }));

  const res = mockRes();
  await submitInquiry(inquiryReq("asha-studio", { name: "Visitor", phone: "9123456780" }), res);
  await flush();

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(sentMessages.length, 0);
});

test("enquiry: SMTP failure never breaks the enquiry (still 201)", async (t) => {
  t.mock.method(Portfolio, "findOne", () => q({ user: "ownerA" }));
  t.mock.method(User, "findById", () => q({ name: "Asha", email: "asha@owner.example" }));
  t.mock.method(Inquiry, "create", async (doc) => ({ ...doc, toObject: () => ({ ...doc }) }));
  transportShouldFail = true;

  const res = mockRes();
  await submitInquiry(inquiryReq("asha-studio", { name: "Visitor", phone: "9123456780" }), res);
  await flush();

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
});
