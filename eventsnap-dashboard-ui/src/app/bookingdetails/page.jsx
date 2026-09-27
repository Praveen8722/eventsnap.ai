"use client";

// Recovered from the last working Turbopack dev-cache (.next/dev/static/chunks/src_ef305512._.js,
// dated Sep 10) — the original /bookingdetails page before it was lost.
// Registered components were "BookingDetailsContent" (reads `?id=` via
// useSearchParams, wrapped in Suspense as "BookingDetails") — both are
// reproduced below, plus an auth guard wrapper as the default export
// (matching the pattern used by every other page in this app, e.g.
// src/app/portfolio/page.jsx).
//
// API calls have been adjusted to the current src/api/bookingApi.js exports
// (getBookingById -> getBooking, updateBookingStatus -> updateBooking with
// { status }) — src/api/bookingApi.js and the backend were not touched.
// galleryApi.js already matched exactly, so the gallery panel (view/share/
// upload photos) is wired to the real API, unchanged.
//
// The original's "Edit Booking" button opened the app's multi-purpose
// Model.jsx (invoice / payment / reminder / gallery-create modal), which has
// since been restored at src/components/ui/Model.jsx. Every Quick Action on
// this page (Edit Booking, Send Invoice, Create New Invoice, Record Payment,
// Send Payment Reminder, Create Gallery Now) now renders it with the
// matching type ("editBooking" / "sendInvoice" / "invoice" / "payments" /
// "reminder" / "gallery"), always scoped to this page's own `booking` so
// every action operates on this booking only.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft, FaPlus, FaPaperPlane, FaDownload, FaWhatsapp } from "react-icons/fa";
import { LuPhone, LuEye } from "react-icons/lu";
import { MdOutlineEmail, MdDateRange } from "react-icons/md";
import { FiPackage, FiCheckCircle, FiShare2, FiEye, FiDownload } from "react-icons/fi";
import { GoImage } from "react-icons/go";
import { BiTimeFive } from "react-icons/bi";
import { getBooking, updateBooking } from "@/api/bookingApi";
import { getGalleries, addGalleryPhotos, galleryAssetUrl } from "@/api/galleryApi";
import { isLoggedIn } from "@/lib/session";
import Model from "@/components/ui/Model";
import { whatsAppLink } from "@/lib/whatsapp";

const quickActions = [
  { icon: <FaPlus />, label: "Create New Invoice" },
  { icon: <FaPaperPlane />, label: "Send Payment Reminder" },
  { icon: <FaDownload />, label: "Download Receipt" },
];
// Stages shown in the Project Timeline — the Booking status enum minus "Cancelled".
const STATUS_FLOW = [
  "Inquiry",
  "Confirmed",
  "In Progress",
  "Editing",
  "Ready for Delivery",
  "Delivered",
];
const BOOKING_STATUSES = [...STATUS_FLOW, "Cancelled"];

function BookingDetailsContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  const [booking, setBooking] = useState(null);
  // null | "editBooking" | "sendInvoice" | "invoice" | "payments"
  //      | "reminder" | "gallery"
  const [modalType, setModalType] = useState(null);
  // The gallery linked to this booking (newest first; we show the latest).
  const [bookingGalleries, setBookingGalleries] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      const response = await getBooking(bookingId);
      setBooking(response.data.booking);
    } catch (error) {
      console.error("Failed to fetch booking details", error);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const linkedBookingId = booking?.bookingId;
  const fetchBookingGalleries = useCallback(async () => {
    if (!linkedBookingId) return;
    try {
      const res = await getGalleries({ bookingId: linkedBookingId });
      setBookingGalleries(res.data?.galleries ?? []);
    } catch (error) {
      console.error("Failed to load booking gallery", error);
    }
  }, [linkedBookingId]);

  useEffect(() => {
    fetchBookingGalleries();
    const sync = () => fetchBookingGalleries();
    window.addEventListener("eventsnap-gallery-updated", sync);
    return () => window.removeEventListener("eventsnap-gallery-updated", sync);
  }, [fetchBookingGalleries]);

  const gallery = bookingGalleries[0] || null;
  const galleryShareLink =
    gallery?.shareSlug && typeof window !== "undefined"
      ? `${window.location.origin}/g/${gallery.shareSlug}`
      : "";

  const handleCopyShare = async () => {
    if (!galleryShareLink) return;
    try {
      await navigator.clipboard.writeText(galleryShareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      window.prompt("Copy this share link", galleryShareLink);
    }
  };
  const handleViewGallery = () => {
    if (galleryShareLink) window.open(galleryShareLink, "_blank", "noopener");
  };
  const handleUploadPhotos = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!gallery || !files.length) return;
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));
      await addGalleryPhotos(gallery._id, formData);
      window.dispatchEvent(new CustomEvent("eventsnap-gallery-updated"));
      await fetchBookingGalleries();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const formattedDate = booking?.eventDate
    ? new Date(booking.eventDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // ── Payment maths ──────────────────────────────────────────────────────────
  const price = Number(booking?.packegPrice) || 0;
  const advance = Number(booking?.advancePayment) || 0;
  const extraPaid = (booking?.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPaid = booking?.totalPaid ?? advance + extraPaid;
  const remaining = booking?.remaining ?? Math.max(price - totalPaid, 0);
  const paidPercent = price > 0 ? Math.min(Math.round((totalPaid / price) * 100), 100) : 0;

  // ── Timeline stages from status + history ──────────────────────────────────
  const currentIndex = STATUS_FLOW.indexOf(booking?.status);
  const isCancelled = booking?.status === "Cancelled";
  const historyDate = (name) => {
    const hit = (booking?.statusHistory || []).find((h) => h.status === name);
    if (hit) return new Date(hit.date).toLocaleDateString("en-GB");
    if (name === "Inquiry" && booking?.createdAt) return new Date(booking.createdAt).toLocaleDateString("en-GB");
    return undefined;
  };
  const steps = STATUS_FLOW.map((title, i) => {
    let status;
    if (isCancelled) {
      status = (booking?.statusHistory || []).some((h) => h.status === title) ? "done" : "upcoming";
    } else if (currentIndex === -1) {
      status = "upcoming";
    } else {
      status = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
    }
    return { title, status, date: status === "current" ? "Current Stage" : historyDate(title) };
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStatusChange = async (e) => {
    const status = e.target.value;
    if (!booking) return;
    try {
      await updateBooking(booking.bookingId, { status });
      await fetchBooking();
      // "Confirmed" auto-creates the Client Gallery on the server — pick it up.
      if (status === "Confirmed") await fetchBookingGalleries();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleDownloadReceipt = () => {
    if (!booking) return;
    const money = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
    const rows = (booking.payments || [])
      .map(
        (p) =>
          `<tr><td>${new Date(p.date).toLocaleDateString()}</td><td>${p.method || "-"}</td><td>${p.reference || "-"}</td><td style="text-align:right">${money(p.amount)}</td></tr>`
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${booking.bookingId}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1E1E1E;padding:40px;max-width:640px;margin:auto}
      h1{color:#6C63FF;margin:0} table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{border:1px solid #ddd;padding:8px;font-size:14px} th{background:#f5f5f5;text-align:left}
      .tot p{margin:4px 0;font-size:15px}
    </style></head><body>
      <h1>EventSnap.AI</h1><p>Payment Receipt</p><hr/>
      <p><b>Booking:</b> ${booking.bookingId}<br/>
      <b>Client:</b> ${booking.clientName} (${booking.email})<br/>
      <b>Event:</b> ${booking.eventType} — ${new Date(booking.eventDate).toLocaleDateString()}<br/>
      <b>Package:</b> ${booking.packageSelected}</p>
      <table><thead><tr><th>Date</th><th>Method</th><th>Reference</th>
      <th style="text-align:right">Amount</th></tr></thead><tbody>
      <tr><td>${new Date(booking.createdAt).toLocaleDateString()}</td><td>Advance</td><td>-</td>
      <td style="text-align:right">${money(booking.advancePayment)}</td></tr>
      ${rows}
      </tbody></table>
      <div class="tot" style="margin-top:24px">
        <p><b>Package Price:</b> ${money(price)}</p>
        <p><b>Total Paid:</b> ${money(totalPaid)}</p>
        <p><b>Remaining Balance:</b> ${money(remaining)}</p>
      </div>
      <p style="margin-top:32px;font-size:12px;color:#888">Generated on ${new Date().toLocaleString()}</p>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${booking.bookingId}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const quickActionHandlers = [
    () => setModalType("invoice"),
    () => setModalType("reminder"),
    handleDownloadReceipt,
  ];

  return (
    <div className="mt-4 ">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <Link
            href="/bookings"
            className="flex items-center gap-2 text-sm text-gray-600 hover:underline hover:text-blue-500 mb-4"
          >
            <FaArrowLeft />
            Back to Bookings
          </Link>
          <h1 className="text-2xl font-bold">Booking Details - {booking?.bookingId || ""}</h1>
          <p className="text-gray-500 text-sm mt-2">
            {booking ? `${booking.eventType} for ${booking.clientName}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <div>
            <button
              onClick={() => setModalType("editBooking")}
              className="cursor-pointer px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 flex items-center gap-2 border-gray-300 hover:bg-gray-100"
            >
              Edit Booking
            </button>
          </div>
          <div>
            <button
              onClick={() => setModalType("sendInvoice")}
              className="cursor-pointer text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2"
            >
              Send Invoice
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mt-8 ">
        <div className="flex flex-col md:flex-[2] gap-6">
          <div className=" border border-gray-300 rounded-2xl p-6 ">
            <h3 className="font-semibold text-lg ">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E] flex items-center justify-center">
                  <MdOutlineEmail className="text-white text-3xl" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-600">Email</h3>
                  <h4 className="text-sm text-gray-600">{booking?.email}</h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6C63FF] flex items-center justify-center">
                  <LuPhone className="text-white text-3xl" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-600">Phone</h3>
                  <h4 className="text-sm text-gray-600 flex items-center gap-2">
                    {booking?.phone}
                    {/* Photographer → Customer: free wa.me chat link. */}
                    {whatsAppLink(booking?.phone) && (
                      <a
                        href={whatsAppLink(
                          booking.phone,
                          `Hi ${booking.clientName || ""}, regarding your ${booking.eventType || "event"} booking (${booking.bookingId}).`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Chat on WhatsApp"
                        aria-label="Chat on WhatsApp"
                        className="text-[#25D366] hover:opacity-80 transition"
                      >
                        <FaWhatsapp size={16} />
                      </a>
                    )}
                  </h4>
                </div>
              </div>
            </div>
          </div>

          <div className=" border border-gray-300 rounded-2xl p-6 ">
            <h3 className="font-semibold text-lg ">Event Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <MdDateRange className="text-purple-400 text-3xl" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-600">Event Date</h3>
                  <h4 className="text-sm text-gray-600">{formattedDate}</h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <FiPackage className="text-red-400 text-3xl" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-600">Package</h3>
                  <h4 className="text-sm text-gray-600">{booking?.packageSelected}</h4>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg mt-4">
              <div>
                <h3 className="text-sm text-gray-600">Additional Notes</h3>
                <h4 className="text-sm font-medium text-gray-700 mt-2">{booking?.additionalNotes}</h4>
              </div>
            </div>
          </div>

          <div className="border border-gray-300 rounded-2xl p-6">
            <h3 className="font-semibold text-lg">Project Timeline</h3>
            <div className="mt-4 flex flex-col gap-8">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div
                    className={`w-10  rounded-xl flex items-center justify-center ${
                      step.status === "done" ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    {step.status === "done" ? (
                      <FiCheckCircle className="text-green-500 text-xl" />
                    ) : (
                      <BiTimeFive className="text-gray-500 text-xl " />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-sm ${step.status === "upcoming" ? "text-gray-400" : "text-gray-600"}`}>
                      {step.title}
                    </h3>
                    {step.date && (
                      <h4 className={`text-xs ${step.status === "current" ? "text-blue-600" : "text-gray-600"}`}>
                        {step.date}
                      </h4>
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <span className="absolute left-[20px] top-6 h-8 w-[1.5px] bg-green-300" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-300 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Client Gallery</h3>
              {gallery && <span className="text-xs text-gray-500">{gallery.galleryId}</span>}
            </div>
            {!gallery ? (
              <div className="mt-4 flex flex-col items-center text-center py-6">
                <GoImage className="text-gray-300 text-4xl mb-2" />
                <p className="text-sm text-gray-600">No gallery for this booking yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  New bookings get a Client Gallery automatically. Create one now for{" "}
                  {booking?.clientName || "this client"} · {booking?.bookingId || ""}.
                </p>
                {booking && (
                  <button
                    onClick={() => setModalType("gallery")}
                    className="mt-3 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    Create Gallery Now
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mt-4 flex gap-4">
                  <div className="w-28 h-20 rounded-lg overflow-hidden bg-linear-to-br from-purple-500 to-orange-400 flex items-center justify-center shrink-0">
                    {gallery.photos?.[0]?.url ? (
                      <img
                        src={galleryAssetUrl(gallery.photos[0].url)}
                        alt={gallery.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <GoImage className="text-white text-2xl" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{gallery.title}</p>
                    <p className="text-sm text-gray-500">{gallery.photos?.length || 0} photos</p>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <FiEye /> {gallery.views || 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <FiDownload /> {gallery.downloads || 0} downloads
                      </span>
                    </div>
                    {gallery.watermark && (
                      <p className="text-green-600 text-xs flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Watermark enabled
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs text-gray-500">Share Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={galleryShareLink}
                      readOnly
                      className="flex-1 mt-1 border border-gray-300 rounded-lg p-2 text-sm text-gray-700 outline-none"
                    />
                    <button onClick={handleCopyShare} className="text-indigo-600 font-medium text-sm hover:underline">
                      {shareCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadPhotos}
                  className="hidden"
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhotos}
                  className="mt-4 w-full border border-[#6C63FF] text-[#6C63FF] rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <FaPlus className="text-xs" />
                  {uploadingPhotos ? "Uploading…" : "Upload Photos"}
                </button>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleViewGallery}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2"
                  >
                    <LuEye />
                    View
                  </button>
                  <button
                    onClick={handleCopyShare}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2"
                  >
                    <FiShare2 />
                    Share
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-full md:flex-[1] gap-col-6 space-y-6">
          <div className="border border-gray-300 rounded-2xl p-6">
            <div className="mt-4 text-sm">
              <label className="text-lg font-semibold mb-6">Current Status</label>
              <select
                value={booking?.status || "Inquiry"}
                onChange={handleStatusChange}
                className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full bg-white p-6 rounded-2xl border border-gray-200 mt-8">
            <h2 className="text-lg font-semibold mb-6">Payment Summary</h2>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Package Price</span>
              <span className="px-3 py-1 text-sm font-medium">₹{price}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Advance Paid</span>
              <span className="px-3 py-1 text-sm font-bold text-green-500">₹{advance}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Total Paid</span>
              <span className="px-3 py-1 text-sm font-bold text-green-500">₹{totalPaid}</span>
            </div>
            <hr className="text-gray-300 mb-2" />
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 text-sm">Remaining</span>
              <span className="px-3 py-1 text-sm font-bold text-red-500">₹{remaining}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 relative">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${paidPercent}%` }} />
            </div>
            <span className="text-sm font-medium">{paidPercent}% paid</span>
            <div className="mt-6 w-full">
              <button
                onClick={() => booking && setModalType("payments")}
                className="w-full text-white text-sm font-semibold mt-6 px-4 py-2 border rounded-lg bg-[#6C63FF]"
              >
                Record Payment
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow w-full  space-y-3 border-2 border-gray-200">
            <h2 className="text-lg font-semibold mb-8">Quick Actions</h2>
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => booking && quickActionHandlers[index]()}
                className="flex text-sm items-center gap-4 w-full border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
              >
                {action.icon} <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalType && booking && (
        <Model
          type={modalType}
          booking={booking}
          onClose={() => setModalType(null)}
          onSaved={fetchBooking}
        />
      )}
    </div>
  );
}

function BookingDetails() {
  return (
    <Suspense fallback={<div className="mt-4">Loading booking details...</div>}>
      <BookingDetailsContent />
    </Suspense>
  );
}

export default function BookingDetailsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // localStorage only exists client-side, so this can't be computed during
    // render (would mismatch the server-rendered output) — it has to run
    // after mount.
    if (isLoggedIn()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthChecked(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!authChecked) return null;
  return <BookingDetails />;
}
