import { viewBookings } from "@/api/bookingApi";
import { getGalleries } from "@/api/galleryApi";
import { viewInquiries } from "@/api/inquiryApi";

// Shared notification logic — used by both the Notifications page and the
// Navbar bell so there is a single source of truth (no duplicate logic).

// Base key for the read/unread set — actually stored per signed-in
// photographer (see readKey() below), so switching accounts in the same
// browser never carries one photographer's read/unread flags over to another's.
export const READ_KEY = "eventsnap-notifications-read";
// Fired (same-tab) whenever the read set changes, so the bell can refresh.
export const READ_EVENT = "eventsnap-notifications-read";
// Fired when the Notifications page opens, so the bell recalculates immediately.
export const REFRESH_EVENT = "eventsnap-notifications-refresh";

// The current signed-in user's id, straight from the same localStorage
// "user" record everything else in this module already reads.
const currentUserId = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    return stored?._id || null;
  } catch {
    return null;
  }
};

// Namespaces the read-state key by user id. Falls back to the bare base key
// only when no user is known yet (e.g. this runs before login on a public
// page) — normal signed-in use always resolves to a per-user key.
const readKey = () => {
  const id = currentUserId();
  return id ? `${READ_KEY}:${id}` : READ_KEY;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PHOTO_BATCH_GAP_MS = 2 * 60 * 1000;

const money = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

// Build the notification feed from the user's real Booking / Payment / Gallery
// / Profile data. Every notification has a deterministic id so it never
// duplicates and its read state stays stable across refreshes.
export const buildNotifications = (bookings, galleries, user, inquiries = []) => {
  const list = [];
  const now = Date.now();
  const currentUserIdValue = user?._id ? String(user._id) : currentUserId();

  if (!currentUserIdValue) {
    return [];
  }

  // Portfolio bookings get exactly one "New Booking" notification and nothing
  // else — including no notifications for the Client Gallery linked to them.
  const portfolioBookingIds = new Set(
    bookings.filter((b) => b.source === "portfolio").map((b) => b.bookingId)
  );

  // Where clicking a notification should take the photographer.
  const bookingHref = (bookingId) => `/bookingdetails?id=${bookingId}`;

  for (const b of bookings) {
    const name = b.clientName || "A client";
    const evt = b.eventType || "shoot";

    // Portfolio bookings raise exactly one notification — "New Booking" — and
    // nothing else (no status / advance / payment / overdue / upcoming items).
    // Bookings from Dashboard / Bookings Management / other internal forms get
    // no "New Booking" notification but do keep every other notification below.
    if (b.source === "portfolio") {
      list.push({
        id: `booking-${b.bookingId}`,
        type: "booking",
        tone: "booking",
        title: "New Booking",
        description: `${name} booked ${evt} (${b.bookingId}) from your portfolio`,
        timestamp: b.createdAt,
        href: bookingHref(b.bookingId),
        userId: currentUserIdValue,
      });
      continue;
    }

    // Status changes — from statusHistory, skipping the initial creation entry.
    (b.statusHistory || []).slice(1).forEach((h) => {
      if (!h?.status || !h?.date) return;
      const ts = new Date(h.date).getTime();
      list.push({
        id: `status-${b.bookingId}-${ts}`,
        type: "booking",
        tone: "booking",
        title: "Booking Status Updated",
        description: `${name}'s ${evt} (${b.bookingId}) is now ${h.status}`,
        timestamp: h.date,
        href: bookingHref(b.bookingId),
        userId: currentUserIdValue,
      });
    });

    // Advance payment on the booking.
    if (Number(b.advancePayment) > 0) {
      list.push({
        id: `advance-${b.bookingId}`,
        type: "payment",
        tone: "paymentUp",
        title: "Advance Payment Received",
        description: `${name} paid an advance of ${money(
          b.advancePayment
        )} for ${b.packageSelected || evt}`,
        timestamp: b.createdAt,
        href: bookingHref(b.bookingId),
        userId: currentUserIdValue,
      });
    }

    // Each recorded payment.
    (b.payments || []).forEach((p, i) => {
      list.push({
        id: `pay-${p._id || `${b.bookingId}-${i}`}`,
        type: "payment",
        tone: "paymentUp",
        title: "Payment Received",
        description: `${name} paid ${money(p.amount)} for ${evt}`,
        timestamp: p.date || p.createdAt || b.createdAt,
        href: bookingHref(b.bookingId),
        userId: currentUserIdValue,
      });
    });

    // Outstanding balance after the event date has passed.
    const remaining = Number(b.remaining) || 0;
    const eventPast = b.eventDate && new Date(b.eventDate).getTime() < now;
    if (remaining > 0 && eventPast && b.status !== "Cancelled") {
      list.push({
        id: `overdue-${b.bookingId}`,
        type: "payment",
        tone: "paymentDown",
        title: "Payment Overdue",
        description: `${name} has an overdue payment of ${money(remaining)}`,
        timestamp: b.eventDate,
        href: bookingHref(b.bookingId),
        userId: currentUserIdValue,
      });
    }

    // Shoot coming up within a week.
    if (b.eventDate && b.status !== "Cancelled" && b.status !== "Delivered") {
      const t = new Date(b.eventDate).getTime();
      if (t >= now && t - now <= WEEK_MS) {
        list.push({
          id: `upcoming-${b.bookingId}`,
          type: "reminder",
          tone: "reminder",
          title: "Upcoming Shoot Reminder",
          description: `${evt} with ${name} on ${new Date(
            b.eventDate
          ).toLocaleDateString("en-GB")}${
            b.eventTime ? ` at ${b.eventTime}` : ""
          }`,
          timestamp: b.eventDate,
          href: bookingHref(b.bookingId),
          userId: currentUserIdValue,
        });
      }
    }
  }

  for (const g of galleries) {
    // Skip galleries tied to a Portfolio booking — that booking shows only its
    // single "New Booking" notification.
    if (g.bookingId && portfolioBookingIds.has(g.bookingId)) continue;

    const gid = g._id || g.galleryId;
    const photos = g.photos || [];
    const created = new Date(g.createdAt).getTime();

    // Gallery was created.
    list.push({
      id: `gallery-${gid}`,
      type: "gallery",
      tone: "gallery",
      title: "Gallery Created",
      description: `${photos.length} photo${
        photos.length === 1 ? "" : "s"
      } in "${g.title}"${g.clientName ? ` for ${g.clientName}` : ""}`,
      timestamp: g.createdAt,
      href: g.bookingId ? bookingHref(g.bookingId) : "/client-galleries",
      userId: currentUserIdValue,
    });

    // Photos added after creation — one notification per latest upload batch.
    const laterTimes = photos
      .map((p) => new Date(p.createdAt || 0).getTime())
      .filter((t) => t && t - created > PHOTO_BATCH_GAP_MS);
    if (laterTimes.length) {
      const newest = Math.max(...laterTimes);
      list.push({
        id: `gallery-updated-${gid}-${newest}`,
        type: "gallery",
        tone: "gallery",
        title: "Gallery Updated",
        description: `${laterTimes.length} photo${
          laterTimes.length === 1 ? "" : "s"
        } added to "${g.title}"`,
        timestamp: new Date(newest).toISOString(),
        href: g.bookingId ? bookingHref(g.bookingId) : "/client-galleries",
        userId: currentUserIdValue,
      });
    }
  }

  // A customer's message submitted through the public Portfolio Contact form.
  // Opened via the modal on the Notifications page (not a page navigation),
  // so the full inquiry is carried on the notification for the click handler.
  //
  // Defense-in-depth: /api/inquiries already scopes to the authenticated
  // req.userId server-side, but a Contact notification carries another
  // person's name/email/phone/message — sensitive enough that this is
  // re-checked here too. If the currently signed-in user is known, any
  // inquiry whose `user` doesn't match it is dropped rather than shown, so a
  // stale fetch (e.g. this tab's poll firing after a different account logs
  // in elsewhere in the same browser, sharing the same localStorage token)
  // can never surface someone else's contact message.
  const ownUserId = currentUserIdValue;
  const ownInquiries = inquiries.filter(
    (inq) => String(inq?.user || "") === ownUserId
  );

  for (const inq of ownInquiries) {
    if (!inq?._id) continue;
    list.push({
      id: `contact-${inq._id}`,
      type: "contact",
      tone: "contact",
      title: "New Contact Message",
      description: `${inq.name || "Someone"} sent an enquiry${
        inq.eventType ? ` about ${inq.eventType}` : ""
      }`,
      timestamp: inq.createdAt,
      href: null,
      data: inq,
      userId: ownUserId,
    });
  }

  // Important profile update — the profile has been edited since it was created.
  if (user?.updatedAt && user?.createdAt) {
    const upd = new Date(user.updatedAt).getTime();
    const crt = new Date(user.createdAt).getTime();
    if (upd - crt > 1000) {
      list.push({
        id: `profile-${upd}`,
        type: "profile",
        tone: "gallery",
        title: "Profile Updated",
        description: "Your business profile & payment details were updated",
        timestamp: user.updatedAt,
        href: "/my-profile",
        userId: currentUserIdValue,
      });
    }
  }

  // De-duplicate by id, then newest first.
  const seen = new Set();
  return list
    .filter((n) => String(n.userId || "") === ownUserId)
    .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
};

export const getReadIds = () => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(readKey()) || "[]");
  } catch {
    return [];
  }
};

export const persistReadIds = (ids) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(readKey(), JSON.stringify(ids));
  } catch {
    /* ignore storage errors */
  }
  window.dispatchEvent(new CustomEvent(READ_EVENT));
};

// Ask the Navbar bell to recalculate now (e.g. when the Notifications page opens).
export const requestBellRefresh = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
};

const readStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

// Fetch the same data the Notifications page uses and return the built feed.
export const loadNotifications = async () => {
  const [bRes, gRes, iRes] = await Promise.all([
    viewBookings(),
    getGalleries(),
    viewInquiries(),
  ]);
  return buildNotifications(
    bRes.data?.bookings ?? [],
    gRes.data?.galleries ?? [],
    readStoredUser(),
    iRes.data?.inquiries ?? []
  );
};

// Unread count for a feed, using the current read set. Pure/synchronous, so the
// bell can recompute instantly when only the read state changed.
export const unreadCountFrom = (feed) => {
  const read = new Set(getReadIds());
  return (feed || []).filter((n) => !read.has(n.id)).length;
};

export const loadUnreadCount = async () =>
  unreadCountFrom(await loadNotifications());
