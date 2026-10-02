"use client";

// Recovered from the last working Turbopack dev-cache
// (.next/dev/static/chunks/src_6b99b2a7._.js, dated Sep 12) — the original,
// multi-purpose Model.jsx before it was overwritten by a small single-purpose
// "New Booking" form. This is the shared modal used across the dashboard:
// Dashboard Quick Actions, Bookings / Booking Details, Scheduling, Payments &
// Finances, Invoices, Client Galleries and the public Portfolio "Book Now"
// form all dynamically import this component and dispatch on the `type`
// prop. Layout, classNames, copy and behaviour are preserved exactly as
// compiled.
//
// Two handlers had no matching backend support at the time of this recovery
// and were adapted (call sites only — src/api/bookingApi.js and the backend
// were not touched):
//  - The compiled source posted payments to a dedicated `recordPayment`
//    booking-API endpoint that doesn't exist in this codebase (the Booking
//    model has no payments sub-collection). Recording a payment here instead
//    folds the amount into `advancePayment` via the existing `updateBooking`
//    partial update — the same total-paid math every page already falls back
//    to (advancePayment + payments[].amount). The inline Payment Details →
//    Add Payment instead appends a dated entry to the booking's payments[]
//    (updateBooking `addPayment`), so each one gets its own history row.
//  - The compiled source posted to a `sendPaymentReminder` booking-API
//    endpoint that also doesn't exist. There is no reminder-sending
//    capability anywhere in the current backend (see the identical gap noted
//    in src/app/payments/page.jsx's bulk "Send Payment Reminder" quick
//    action), so this simulates success the same way that page already does.

import { useEffect, useRef, useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { LuUpload } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import {
  createBooking,
  updateBooking,
  viewBookings,
  sendPaymentReminder,
} from "@/api/bookingApi";
import { createInvoice, updateInvoice } from "@/api/invoiceApi";
import { createEvent } from "@/api/eventApi";
import { createGallery } from "@/api/galleryApi";
import { isValidPhoneNumber } from "@/lib/phone";
import { whatsAppLink } from "@/lib/whatsapp";

const methods = [
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "card", label: "Card", icon: "💳" },
  { id: "bank", label: "Bank Transfer", icon: "🏦" },
  { id: "paypal", label: "PayPal", icon: "📱" },
  { id: "upi", label: "UPI", icon: "📱" },
  { id: "other", label: "Other", icon: "💰" },
];
const colors = [
  "#6C63FF", // purple
  "#FF6B6B", // red
  "#4D8DFF", // blue
  "#4DBD82", // green
  "#E8A620", // yellow
  "#D64545", // dark red
];

// Fields required by the New / Edit Booking forms (bookingId/status are set
// server-side; email, package price, advance payment and additional notes are
// optional — the backend treats them the same way, saving an empty price or
// advance as 0, so payment totals keep working).
const REQUIRED_BOOKING_FIELDS = [
  ["clientName", "Client Name"],
  ["phone", "Phone"],
  ["eventType", "Event Type"],
  ["eventDate", "Event Date"],
  ["packageSelected", "Package"],
];
// Placeholder <option> labels that must not count as a real selection.
const BOOKING_PLACEHOLDER_VALUES = ["Select event type", "Select package"];

const Model = ({
  type,
  onClose,
  onCreated,
  booking,
  onSaved,
  defaultDate,
  invoice,
  onRecordPayment,
  onSendReminder,
  bookingSource,
  portfolioSlug,
  contact,
}) => {
  const [selected, setSelected] = useState("upi");
  const [color, setColor] = useState(colors[0]);
  const [payBooking, setPayBooking] = useState(null);
  const [bookingData, setBookingData] = useState({
    clientName: "",
    email: "",
    phone: "",
    eventType: "",
    eventDate: "",
    eventTime: "",
    eventLocation: "",
    packageSelected: "",
    packegPrice: "",
    advancePayment: "",
    additionalNotes: "",
    // New Booking → optional multi-day schedule (one booking, many days).
    eventDays: [],
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: "",
    reference: "",
    note: "",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    amount: "",
    dueDate: "",
    description: "",
    notes: "",
  });
  const [availableBookings, setAvailableBookings] = useState([]);
  const [selectedInvoiceBookingId, setSelectedInvoiceBookingId] = useState("");
  // Real bookings loaded for the standalone Record Payment modal (no booking prop).
  const [paymentBookings, setPaymentBookings] = useState([]);
  // Blocks a second submit while a mutation request is in flight (no duplicate records).
  const busyRef = useRef(false);
  const [galleryForm, setGalleryForm] = useState({
    title: "",
    bookingId: "",
    watermark: false,
    files: [],
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    type: "Booking / Shoot",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    bookingId: "",
    notes: "",
  });
  const [invoiceEditForm, setInvoiceEditForm] = useState({
    amount: "",
    dueDate: "",
    status: "Draft",
    description: "",
    notes: "",
  });
  const [reminderForm, setReminderForm] = useState({
    channel: "email",
    message: "",
  });
  // Inline "Add Payment" field inside the Payment Details view (amount only).
  const [detailPaymentAmount, setDetailPaymentAmount] = useState("");
  const [detailPaymentBusy, setDetailPaymentBusy] = useState(false);

  // ── Payment maths for the current booking (Send Invoice / Record Payment) ──
  const price = Number(booking?.packegPrice) || 0;
  const advance = Number(booking?.advancePayment) || 0;
  const extraPaid = (booking?.payments || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );
  const totalPaid = booking?.totalPaid ?? advance + extraPaid;
  const remaining = booking?.remaining ?? Math.max(price - totalPaid, 0);
  const payStatus =
    booking?.paymentStatus ??
    booking?.payStatus ??
    (price > 0 && totalPaid >= price
      ? "Paid"
      : totalPaid > 0
        ? "Partial"
        : "Pending");

  // This booking's payments, newest first, for the customer Payment Details view.
  const customerPayments = (() => {
    const rows = [];
    if (advance > 0) {
      rows.push({
        date: booking?.createdAt,
        amount: advance,
        method: "Advance",
      });
    }
    for (const p of booking?.payments || []) {
      rows.push({
        date: p.date,
        amount: Number(p.amount) || 0,
        method: p.method
          ? p.method.charAt(0).toUpperCase() + p.method.slice(1)
          : "—",
      });
    }
    return rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  })();

  // Prefill the shared booking form when editing / invoicing an existing booking.
  useEffect(() => {
    if (booking && (type === "editBooking" || type === "sendInvoice")) {
      setBookingData({
        clientName: booking.clientName ?? "",
        email: booking.email ?? "",
        phone: booking.phone ?? "",
        eventType: booking.eventType ?? "",
        eventDate: booking.eventDate
          ? String(booking.eventDate).slice(0, 10)
          : "",
        eventTime: booking.eventTime ?? "",
        eventLocation: booking.eventLocation ?? "",
        packageSelected: booking.packageSelected ?? "",
        packegPrice: booking.packegPrice ?? "",
        advancePayment: booking.advancePayment ?? "",
        additionalNotes: booking.additionalNotes ?? "",
        eventDays: (booking.eventDays || []).map((d) => ({
          _key: nextEventDayKey(),
          name: d.name ?? "",
          date: d.date ? String(d.date).slice(0, 10) : "",
          location: d.location ?? "",
          notes: d.notes ?? "",
        })),
      });
    }
  }, [booking, type]);

  // Preselect + prefill the invoice / payment forms from the booking.
  useEffect(() => {
    if (!booking) return;
    if (type === "payments") {
      setPayBooking({
        id: booking.bookingId,
        client: booking.clientName,
        event: booking.eventType,
        price,
        paid: totalPaid,
      });
    }
    if (type === "invoice") {
      setInvoiceForm((f) => ({
        ...f,
        amount: String(remaining || price || ""),
      }));
    }
  }, [booking, type, price, totalPaid, remaining]);

  // Real bookings for the "Select Booking" pickers on the Invoice + Gallery
  // modals, and the "Link to Booking" picker on the Add Event modal.
  useEffect(() => {
    if (!["invoice", "gallery", "addevent"].includes(type) || booking) return;
    const loadBookings = async () => {
      try {
        const response = await viewBookings();
        const list = response.data?.bookings ?? [];
        setAvailableBookings(list);
        if (list.length) {
          if (type === "invoice")
            setSelectedInvoiceBookingId(list[0].bookingId);
          if (type === "gallery") {
            setGalleryForm((f) => ({
              ...f,
              bookingId: f.bookingId || list[0].bookingId,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to load bookings for modal", error);
        setAvailableBookings([]);
        setSelectedInvoiceBookingId("");
      }
    };
    loadBookings();
  }, [booking, type]);

  // Load real bookings for the standalone Record Payment modal picker.
  useEffect(() => {
    if (type !== "payments" || booking) return;
    const loadPaymentBookings = async () => {
      try {
        const response = await viewBookings();
        setPaymentBookings(response.data?.bookings ?? []);
      } catch (error) {
        console.error("Failed to load bookings for payment modal", error);
        setPaymentBookings([]);
      }
    };
    loadPaymentBookings();
  }, [booking, type]);

  // Prefill the Add Event date when a specific calendar day was clicked.
  useEffect(() => {
    if (type === "addevent" && defaultDate) {
      setEventForm((f) => ({ ...f, date: defaultDate }));
    }
  }, [type, defaultDate]);

  // Prefill the View / Edit Invoice form from the selected invoice.
  useEffect(() => {
    if (type === "invoiceDetail" && invoice) {
      setInvoiceEditForm({
        amount: invoice.amount ?? "",
        dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : "",
        status: invoice.status || "Draft",
        description: invoice.description || "",
        notes: invoice.notes || "",
      });
    }
  }, [type, invoice]);

  // Prefill the Payment Reminder — pick a channel the customer can receive on
  // and draft a message that includes the booking + pending amount, plus the
  // photographer's saved payment options (from their My Profile → Payment
  // Settings) so the customer knows how to pay.
  useEffect(() => {
    if (type !== "reminder" || !booking) return;
    const hasEmail = !!booking.email;
    const hasPhone = !!booking.phone;
    const pending = booking.remaining ?? Math.max(price - totalPaid, 0);
    const when = booking.eventDate
      ? new Date(booking.eventDate).toLocaleDateString("en-GB")
      : "TBD";
    // Photographer's stored payment details (kept fresh by My Profile).
    let storedUser = null;
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      storedUser = null;
    }
    const payLines = [
      ["UPI ID", storedUser?.upiId],
      ["UPI Phone", storedUser?.phone],
      ["Bank", storedUser?.bankName],
      ["A/C No", storedUser?.accountNumber],
      ["IFSC", storedUser?.swiftIfsc],
    ].filter(([, value]) => value && String(value).trim());
    const payBlock = payLines.length
      ? `\n\nPayment options:\n${payLines.map(([label, value]) => `${label}: ${value}`).join("\n")}`
      : "";
    setReminderForm({
      channel: hasEmail ? "email" : hasPhone ? "sms" : "email",
      message:
        `Hi ${booking.clientName}, a friendly reminder for your ${booking.eventType} ` +
        `booking (${booking.bookingId}) on ${when}` +
        `${booking.eventTime ? ` at ${booking.eventTime}` : ""}` +
        `${booking.eventLocation ? `, ${booking.eventLocation}` : ""}. ` +
        `Outstanding balance: ₹${Number(pending).toLocaleString("en-IN")}. ` +
        `Please arrange payment at your earliest convenience.` +
        payBlock,
    });
  }, [type, booking, price, totalPaid]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({ ...prev, [name]: value }));
  };

  // ── New / Edit Booking → Event Days ──────────────────────────────────────
  // Any number of separate, non-consecutive days on the same booking. Each day
  // has a name and date (required) plus optional location and notes; with
  // days present the booking's Event Date is the earliest day.
  const eventDays = bookingData.eventDays || [];
  const hasEventDays =
    (type === "newBooking" || type === "editBooking") && eventDays.length > 0;
  const earliestEventDayDate =
    eventDays
      .map((d) => d.date)
      .filter(Boolean)
      .sort()[0] || "";
  // Event Date follows the earliest event day only once a day has a date — a
  // freshly added (still blank) day never clears or locks what was typed, and
  // the typed value comes back if every day is removed.
  const eventDateFromDays = hasEventDays && earliestEventDayDate !== "";
  const effectiveEventDate = eventDateFromDays ? earliestEventDayDate : bookingData.eventDate;
  // Each card gets a stable client-side key (never sent to the API) so React
  // keeps every card's inputs attached to the right day when one is removed.
  const eventDayKeyRef = useRef(0);
  function nextEventDayKey() {
    eventDayKeyRef.current += 1;
    return `event-day-${eventDayKeyRef.current}`;
  }
  const withEventDayKeys = (days) =>
    days.map((d) => (d._key ? d : { ...d, _key: nextEventDayKey() }));
  // Days as the API expects them — only name, date, location and notes.
  const eventDaysForApi = eventDays.map(({ name, date, location, notes }) => ({
    name,
    date,
    location,
    notes,
  }));
  const focusEventDayRef = useRef(null);
  const addEventDay = () => {
    const key = nextEventDayKey();
    focusEventDayRef.current = key;
    setBookingData((prev) => ({
      ...prev,
      eventDays: [
        ...withEventDayKeys(prev.eventDays || []),
        { _key: key, name: "", date: "", location: "", notes: "" },
      ],
    }));
  };
  // Bring a newly added card into view and put the cursor in its name field.
  useEffect(() => {
    const key = focusEventDayRef.current;
    if (!key) return;
    const input = document.getElementById(`${key}-name`);
    if (!input) return;
    focusEventDayRef.current = null;
    input.focus({ preventScroll: true });
    input
      .closest("[data-event-day]")
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [eventDays.length]);
  const updateEventDay = (key, field, value) =>
    setBookingData((prev) => ({
      ...prev,
      eventDays: (prev.eventDays || []).map((d) =>
        d._key === key ? { ...d, [field]: value } : d,
      ),
    }));
  const removeEventDay = (key) =>
    setBookingData((prev) => ({
      ...prev,
      eventDays: (prev.eventDays || []).filter((d) => d._key !== key),
    }));
  // `nested`: rendered as a field group inside "Event Details" (New Booking),
  // so its title matches the other field labels instead of a section heading.
  const renderEventDays = ({ nested = false } = {}) => (
    <div>
      <p className={nested ? "text-sm text-gray-700" : "font-medium text-gray-700"}>
        Event Days (Optional)
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Add each day of a multi-day booking, e.g. Pooja, Pre-wedding, Wedding.
        Dates don&apos;t need to be consecutive.
      </p>
      {eventDays.length > 0 && (
        <div className="mt-4 space-y-4">
          {eventDays.map((day, index) => (
            <div
              key={day._key}
              data-event-day={day._key}
              className="border border-gray-300 rounded-lg p-4 text-sm"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-700">Day {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeEventDay(day._key)}
                  aria-label={`Remove event day ${index + 1}`}
                  title="Remove this day"
                  className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-red-500 transition cursor-pointer"
                >
                  <IoCloseSharp className="text-lg" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label htmlFor={`${day._key}-name`} className="text-gray-700">
                    Event Name
                  </label>
                  <input
                    id={`${day._key}-name`}
                    value={day.name}
                    onChange={(e) =>
                      updateEventDay(day._key, "name", e.target.value)
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="e.g. Pooja, Pre-wedding, Wedding"
                  />
                </div>
                <div>
                  <label htmlFor={`${day._key}-date`} className="text-gray-700">
                    Date
                  </label>
                  <input
                    id={`${day._key}-date`}
                    type="date"
                    value={day.date}
                    onChange={(e) =>
                      updateEventDay(day._key, "date", e.target.value)
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addEventDay}
        className="mt-4 w-full flex items-center justify-center gap-2 border border-dashed border-[#6C63FF] text-[#6C63FF] rounded-lg py-2 text-sm font-semibold hover:bg-[#EEF0FF] transition cursor-pointer"
      >
        <IoMdAdd className="text-lg" />
        Add Event Day
      </button>
    </div>
  );

  const validateBookingForm = () => {
    // Email is optional in New and Edit Booking; phone is required. New
    // Booking also checks the phone format (same shared validator as the
    // Portfolio Send Enquiry form).
    const isNewBooking = type === "newBooking";
    const requiredFields = REQUIRED_BOOKING_FIELDS;
    if (hasEventDays) {
      const bad = eventDays.findIndex(
        (d) => !String(d.name ?? "").trim() || !d.date,
      );
      if (bad !== -1) {
        alert(`Event Day ${bad + 1}: event name and date are required`);
        return false;
      }
    }
    const values = { ...bookingData, eventDate: effectiveEventDate };
    const missing = requiredFields.filter(([key]) => {
      const value = String(values[key] ?? "").trim();
      return !value || BOOKING_PLACEHOLDER_VALUES.includes(value);
    });
    if (missing.length) {
      alert(
        `Please fill all required fields: ${missing.map(([, label]) => label).join(", ")}`,
      );
      return false;
    }
    if (isNewBooking && !isValidPhoneNumber(bookingData.phone)) {
      alert("Please enter a valid phone number");
      return false;
    }
    // Optional amounts: empty is fine, but anything entered must be a number.
    if (Number.isNaN(Number(String(bookingData.packegPrice ?? "").trim()))) {
      alert("Package Price must be a number");
      return false;
    }
    if (Number.isNaN(Number(String(bookingData.advancePayment ?? "").trim()))) {
      alert("Advance Payment must be a number");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    if (!validateBookingForm()) return;
    busyRef.current = true;
    try {
      await createBooking({
        ...bookingData,
        eventDate: effectiveEventDate,
        eventDays: hasEventDays ? eventDaysForApi : [],
        source: bookingSource === "portfolio" ? "portfolio" : "internal",
        // Identifies which photographer's portfolio this came from — the
        // backend resolves ownership from this, never from anything else.
        ...(bookingSource === "portfolio" ? { portfolioSlug } : {}),
      });
      window.dispatchEvent(new CustomEvent("eventsnap-bookings-updated"));
      // A Client Gallery is auto-created with the booking — refresh galleries too.
      window.dispatchEvent(new CustomEvent("eventsnap-gallery-updated"));
      // Refresh the parent list so the new booking shows up on top instantly.
      await onCreated?.();
      onClose();
      alert("Booking Created Successfully");
    } catch (error) {
      alert(error?.response?.data?.message || "Create Booking failed");
    } finally {
      busyRef.current = false;
    }
  };

  // ── Edit Booking ─────────────────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!booking) return;
    if (!validateBookingForm()) return;
    try {
      await updateBooking(booking.bookingId, {
        ...bookingData,
        eventDate: effectiveEventDate,
        eventDays: eventDaysForApi,
      });
      window.dispatchEvent(new CustomEvent("eventsnap-bookings-updated"));
      await onSaved?.();
      onClose();
      alert("Booking updated successfully");
    } catch (error) {
      alert(error?.response?.data?.message || "Update Booking failed");
    }
  };

  // ── Send Invoice (creates an invoice for the outstanding balance) ─────────
  const handleSendInvoice = async (e) => {
    e.preventDefault();
    if (!booking || busyRef.current) return;
    const amount = remaining > 0 ? remaining : price;
    busyRef.current = true;
    try {
      await createInvoice({
        bookingId: booking.bookingId,
        clientName: bookingData.clientName || booking.clientName,
        email: bookingData.email || booking.email,
        amount,
        description: `Invoice for ${booking.packageSelected} — ${booking.eventType}`,
        status: "Sent",
      });
      window.dispatchEvent(new CustomEvent("eventsnap-invoices-updated"));
      await onSaved?.();
      onClose();
      alert(`Invoice sent to ${bookingData.email || booking.email}`);
    } catch (error) {
      alert(error?.response?.data?.message || "Send Invoice failed");
    } finally {
      busyRef.current = false;
    }
  };

  // ── Create New Invoice (from Booking Details Quick Actions) ──────────────
  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    const selectedBooking =
      booking ??
      availableBookings.find(
        (item) => item.bookingId === selectedInvoiceBookingId,
      );
    if (!selectedBooking) {
      alert("Please select a booking to create an invoice");
      return;
    }
    if (
      Number.isNaN(Number(invoiceForm.amount)) ||
      Number(invoiceForm.amount) <= 0
    ) {
      alert("Invoice amount must be a positive number");
      return;
    }
    busyRef.current = true;
    try {
      await createInvoice({
        bookingId: selectedBooking.bookingId,
        clientName: selectedBooking.clientName ?? booking?.clientName,
        email: selectedBooking.email ?? booking?.email,
        amount: Number(invoiceForm.amount),
        dueDate: invoiceForm.dueDate || undefined,
        description: invoiceForm.description,
        notes: invoiceForm.notes,
        status: "Draft",
      });
      window.dispatchEvent(new CustomEvent("eventsnap-invoices-updated"));
      await onSaved?.();
      onClose();
      alert("Invoice generated successfully");
    } catch (error) {
      alert(error?.response?.data?.message || "Generate Invoice failed");
    } finally {
      busyRef.current = false;
    }
  };

  // ── View / Edit Invoice ────────────────────────────────────────────────
  const handleUpdateInvoice = async (e) => {
    e.preventDefault();
    if (!invoice?._id || busyRef.current) return;
    if (
      invoiceEditForm.amount === "" ||
      Number.isNaN(Number(invoiceEditForm.amount)) ||
      Number(invoiceEditForm.amount) < 0
    ) {
      alert("Invoice amount must be a valid number");
      return;
    }
    busyRef.current = true;
    try {
      await updateInvoice(invoice._id, {
        amount: Number(invoiceEditForm.amount),
        dueDate: invoiceEditForm.dueDate || null,
        status: invoiceEditForm.status,
        description: invoiceEditForm.description,
        notes: invoiceEditForm.notes,
      });
      window.dispatchEvent(new CustomEvent("eventsnap-invoices-updated"));
      await onSaved?.();
      onClose();
      alert("Invoice updated successfully");
    } catch (error) {
      alert(error?.response?.data?.message || "Update Invoice failed");
    } finally {
      busyRef.current = false;
    }
  };

  // ── Send Payment Reminder (Email / SMS / Both / WhatsApp) ──────────────
  const handleSendReminder = async (e) => {
    e.preventDefault();
    if (!booking?.bookingId || busyRef.current) return;
    const { channel } = reminderForm;
    // WhatsApp is a free click-to-chat link (no backend call): open a chat
    // with the customer's saved phone, pre-filled with the reminder message
    // (which already states the pending amount).
    if (channel === "whatsapp") {
      const message =
        reminderForm.message.trim() ||
        `Hi ${booking.clientName || ""}, a friendly reminder for your booking ` +
          `(${booking.bookingId}). Pending amount: ₹${Number(remaining).toLocaleString("en-IN")}.`;
      const link = whatsAppLink(booking.phone, message);
      if (!link) {
        alert("This customer has no valid phone number for WhatsApp");
        return;
      }
      window.open(link, "_blank", "noopener,noreferrer");
      onClose();
      return;
    }
    if ((channel === "email" || channel === "both") && !booking.email) {
      alert("This customer has no saved email address");
      return;
    }
    if ((channel === "sms" || channel === "both") && !booking.phone) {
      alert("This customer has no saved phone number");
      return;
    }
    busyRef.current = true;
    try {
      // Email (and the email half of "Both") is sent by the backend, which
      // resolves the customer's address from the stored booking — the message
      // is the only thing sent from here. SMS has no provider wired up, so that
      // channel is still simulated (unchanged behaviour).
      if (channel === "email" || channel === "both") {
        await sendPaymentReminder(booking.bookingId, {
          message: reminderForm.message,
        });
      }
      await onSaved?.();
      onClose();
      alert("Payment reminder sent");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to send reminder");
    } finally {
      busyRef.current = false;
    }
  };

  const handleCreateGallery = async () => {
    if (busyRef.current) return;
    const title = galleryForm.title.trim();
    if (!title) {
      alert("Please enter a gallery title");
      return;
    }
    // Opened from a booking → use that booking directly; otherwise use the picker.
    const linked =
      booking ||
      availableBookings.find((b) => b.bookingId === galleryForm.bookingId);
    if (!linked) {
      alert("Please select the related booking");
      return;
    }
    const files = (galleryForm.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!files.length) {
      alert("Please select at least one photo to upload");
      return;
    }
    busyRef.current = true;
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("bookingId", linked.bookingId);
      formData.append("clientName", linked.clientName || "");
      formData.append("eventType", linked.eventType || "");
      formData.append("watermark", galleryForm.watermark ? "true" : "false");
      files.forEach((file) => formData.append("photos", file));
      await createGallery(formData);
      window.dispatchEvent(new CustomEvent("eventsnap-gallery-updated"));
      await onSaved?.();
      onClose();
      alert(
        `Gallery created — ${files.length} photo(s) uploaded for ${linked.clientName}`,
      );
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to create gallery");
    } finally {
      busyRef.current = false;
    }
  };

  // ── Record Payment ──────────────────────────────────────────────────────
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    const targetId = booking?.bookingId ?? payBooking?.id;
    if (!targetId) {
      alert("Please select a booking");
      return;
    }
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      alert("Payment amount must be a positive number");
      return;
    }
    // Prevent overpayment (server is the source of truth, this is instant feedback).
    const targetBalance = booking
      ? remaining
      : payBooking
        ? Math.max(
            (Number(payBooking.price) || 0) - (Number(payBooking.paid) || 0),
            0,
          )
        : Infinity;
    if (targetBalance <= 0) {
      alert("This booking is already fully paid");
      return;
    }
    if (amount > targetBalance + 0.01) {
      alert(
        `Payment exceeds the remaining balance of ₹${targetBalance.toLocaleString("en-IN")}`,
      );
      return;
    }
    // No payments sub-collection exists on the backend — fold the amount into
    // advancePayment via the ordinary partial update (see file header note).
    const currentAdvance = booking ? advance : Number(payBooking?.paid) || 0;
    busyRef.current = true;
    try {
      await updateBooking(targetId, {
        advancePayment: currentAdvance + amount,
      });
      window.dispatchEvent(new CustomEvent("eventsnap-bookings-updated"));
      window.dispatchEvent(new CustomEvent("eventsnap-invoices-updated"));
      await onSaved?.();
      onClose();
      alert("Payment recorded successfully");
    } catch (error) {
      alert(error?.response?.data?.message || "Record Payment failed");
    } finally {
      busyRef.current = false;
    }
  };

  // ── Add Payment (inline, inside the Payment Details view) ────────────────
  // Amount only — no method/reference. Saved as its own entry in the
  // booking's payments[] (dated server-side to the day it's added), so it
  // shows as a separate Payment History row; the Advance entry is untouched.
  // Total Paid / Remaining / Status recompute from the refreshed booking.
  const handleAddDetailPayment = async () => {
    if (detailPaymentBusy) return;
    const targetId = booking?.bookingId;
    if (!targetId) {
      alert("Please select a booking");
      return;
    }
    const amount = Number(detailPaymentAmount);
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      alert("Payment amount must be a positive number");
      return;
    }
    if (remaining <= 0) {
      alert("This booking is already fully paid");
      return;
    }
    if (amount > remaining + 0.01) {
      alert(
        `Payment exceeds the remaining balance of ₹${remaining.toLocaleString("en-IN")}`,
      );
      return;
    }
    setDetailPaymentBusy(true);
    try {
      await updateBooking(targetId, { addPayment: amount });
      window.dispatchEvent(new CustomEvent("eventsnap-bookings-updated"));
      window.dispatchEvent(new CustomEvent("eventsnap-invoices-updated"));
      await onSaved?.();
      setDetailPaymentAmount("");
    } catch (error) {
      alert(error?.response?.data?.message || "Add Payment failed");
    } finally {
      setDetailPaymentBusy(false);
    }
  };

  // ── Add Event (Scheduling) ──────────────────────────────────────────────
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    const required = [
      ["title", "Event Title"],
      ["date", "Date"],
      ["startTime", "Start Time"],
      ["endTime", "End Time"],
    ];
    const missing = required.filter(
      ([key]) => !String(eventForm[key] ?? "").trim(),
    );
    if (missing.length) {
      alert(
        `Please fill all required fields: ${missing.map(([, label]) => label).join(", ")}`,
      );
      return;
    }
    busyRef.current = true;
    try {
      await createEvent({ ...eventForm, color });
      window.dispatchEvent(new CustomEvent("eventsnap-events-updated"));
      await onSaved?.();
      onClose();
      alert("Event added successfully");
    } catch (error) {
      alert(error?.response?.data?.message || "Add Event failed");
    } finally {
      busyRef.current = false;
    }
  };

  // For the booking-scoped Record Payment modal, restrict the picker to this booking.
  // Otherwise show every real booking with its live paid/balance figures.
  const paymentBookingOptions = booking
    ? [
        {
          id: booking.bookingId,
          client: booking.clientName,
          event: booking.eventType,
          price,
          paid: totalPaid,
        },
      ]
    : paymentBookings.map((b) => {
        const bPrice = Number(b.packegPrice) || 0;
        const bPaid =
          (Number(b.advancePayment) || 0) +
          (b.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        return {
          id: b.bookingId,
          client: b.clientName,
          event: b.eventType,
          price: bPrice,
          paid: bPaid,
        };
      });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      {type === "newBooking" && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <h2 className="text-lg font-semibold">New Booking</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div>
              <p className="font-medium text-gray-700">Client Information</p>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">Client Name</label>
                <input
                  name="clientName"
                  value={bookingData.clientName}
                  onChange={handleChange}
                  className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  placeholder="Enter client name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className=" text-gray-700">
                    Email{bookingSource === "portfolio" ? " (Optional)" : ""}
                  </label>
                  <input
                    name="email"
                    value={bookingData.email}
                    onChange={handleChange}
                    className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="client@email.com"
                  />
                </div>
                <div>
                  <label className=" text-gray-700">Phone</label>
                  <input
                    name="phone"
                    value={bookingData.phone}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Event Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className="text-sm text-gray-700">Event Type</label>
                  <select
                    name="eventType"
                    value={bookingData.eventType}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  >
                    <option>Select event type</option>
                    <option>Wedding</option>
                    <option>Engagement</option>
                    <option>Birthday Party</option>
                    <option>Corporate Event</option>
                    <option>Portrait Session</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Event Date</label>
                  <input
                    name="eventDate"
                    value={effectiveEventDate}
                    onChange={handleChange}
                    readOnly={eventDateFromDays}
                    type="date"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                  {eventDateFromDays && (
                    <p className="text-xs text-gray-400 mt-1">
                      Set from the earliest event day
                    </p>
                  )}
                </div>
              </div>
              {/* Event Days sit directly above the Location field in New Booking. */}
              <div className="mt-4">{renderEventDays({ nested: true })}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className="text-sm text-gray-700">
                    Location (Optional)
                  </label>
                  <input
                    name="eventLocation"
                    value={bookingData.eventLocation}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="e.g. Grand Hotel, Studio B"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Package</label>
                  <select
                    name="packageSelected"
                    value={bookingData.packageSelected}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  >
                    <option>Select package</option>
                    <option>Basic Package</option>
                    <option>Standard Package</option>
                    <option>Premium Package</option>
                    <option>Deluxe Package</option>
                    <option>Custom Package</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Payment Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className=" text-gray-700">Package Price (Optional)</label>
                  <input
                    name="packegPrice"
                    value={bookingData.packegPrice}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="₹ 0.00"
                  />
                </div>
                <div>
                  <label className=" text-gray-700">Advance Payment (Optional)</label>
                  <input
                    name="advancePayment"
                    value={bookingData.advancePayment}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="₹ 0.00"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Additional Notes</p>
              <textarea
                name="additionalNotes"
                value={bookingData.additionalNotes}
                onChange={handleChange}
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-28 outline-none resize-none"
                placeholder="Add any special requirements or notes..."
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600   border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Create Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "editBooking" && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <h2 className="text-lg font-semibold">
              Edit Booking - {booking?.bookingId || ""}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div>
              <p className="font-medium text-gray-700">Client Information</p>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">Client Name</label>
                <input
                  name="clientName"
                  value={bookingData.clientName}
                  onChange={handleChange}
                  className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  placeholder="Enter client name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className=" text-gray-700">Email</label>
                  <input
                    name="email"
                    value={bookingData.email}
                    onChange={handleChange}
                    className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="client@email.com"
                  />
                </div>
                <div>
                  <label className=" text-gray-700">Phone</label>
                  <input
                    name="phone"
                    value={bookingData.phone}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Event Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className="text-sm text-gray-700">Event Type</label>
                  <select
                    name="eventType"
                    value={bookingData.eventType}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  >
                    <option>Select event type</option>
                    <option>Wedding</option>
                    <option>Engagement</option>
                    <option>Birthday Party</option>
                    <option>Corporate Event</option>
                    <option>Portrait Session</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Event Date</label>
                  <input
                    name="eventDate"
                    value={effectiveEventDate}
                    onChange={handleChange}
                    readOnly={eventDateFromDays}
                    type="date"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                  {eventDateFromDays && (
                    <p className="text-xs text-gray-400 mt-1">
                      Set from the earliest event day
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                {/* <div>
                  <label className="text-sm text-gray-700">Event Time (Optional)</label>
                  <input
                    name="eventTime"
                    value={bookingData.eventTime}
                    onChange={handleChange}
                    type="time"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                </div> */}
                <div>
                  <label className="text-sm text-gray-700">
                    Location (Optional)
                  </label>
                  <input
                    name="eventLocation"
                    value={bookingData.eventLocation}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="e.g. Grand Hotel, Studio B"
                  />
                </div>
              </div>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">Package</label>
                <select
                  name="packageSelected"
                  value={bookingData.packageSelected}
                  onChange={handleChange}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                >
                  <option>Select package</option>
                  <option>Basic Package</option>
                  <option>Standard Package</option>
                  <option>Premium Package</option>
                  <option>Deluxe Package</option>
                  <option>Custom Package</option>
                </select>
              </div>
            </div>

            {renderEventDays()}

            <div>
              <p className="font-medium text-gray-700">Payment Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className=" text-gray-700">Package Price (Optional)</label>
                  <input
                    name="packegPrice"
                    value={bookingData.packegPrice}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="₹ 0.00"
                  />
                </div>
                <div>
                  <label className=" text-gray-700">Advance Payment (Optional)</label>
                  <input
                    name="advancePayment"
                    value={bookingData.advancePayment}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="₹ 0.00"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Additional Notes</p>
              <textarea
                name="additionalNotes"
                value={bookingData.additionalNotes}
                onChange={handleChange}
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-28 outline-none resize-none"
                placeholder="Add any special requirements or notes..."
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600   border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "sendInvoice" && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <div>
              <h2 className="text-lg font-semibold">Send Invoice</h2>
              <h2 className="text-xs font-semibold text-gray-600">
                {booking ? `${booking.clientName} - ${booking.bookingId}` : ""}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div className="w-full bg-white p-4 rounded-2xl border border-gray-200 ">
              <h2 className="text-lg font-semibold mb-6">Payment Summary</h2>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500">Package Price</span>
                <span className="px-3 text-sm font-medium">
                  ₹{price.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500">Total Paid</span>
                <span className="px-3 text-sm font-bold text-green-500">
                  ₹{totalPaid.toLocaleString("en-IN")}
                </span>
              </div>
              <hr className="text-gray-300 mb-2" />
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-sm">Remaining Balance</span>
                <span className="px-3 text-sm font-bold text-red-500">
                  ₹{remaining.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Client Information</p>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">Client Name</label>
                <input
                  name="clientName"
                  value={bookingData.clientName}
                  onChange={handleChange}
                  className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  placeholder="Enter client name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className=" text-gray-700">Email</label>
                  <input
                    name="email"
                    value={bookingData.email}
                    onChange={handleChange}
                    className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="client@email.com"
                  />
                </div>
                <div>
                  <label className=" text-gray-700">Phone</label>
                  <input
                    name="phone"
                    value={bookingData.phone}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Event Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className="text-sm text-gray-700">Event Type</label>
                  <select
                    name="eventType"
                    value={bookingData.eventType}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  >
                    <option>Select event type</option>
                    <option>Wedding</option>
                    <option>Engagement</option>
                    <option>Birthday Party</option>
                    <option>Corporate Event</option>
                    <option>Portrait Session</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Event Date</label>
                  <input
                    name="eventDate"
                    value={bookingData.eventDate}
                    onChange={handleChange}
                    type="date"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                {/* <div>
                  <label className="text-sm text-gray-700">Event Time (Optional)</label>
                  <input
                    name="eventTime"
                    value={bookingData.eventTime}
                    onChange={handleChange}
                    type="time"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                </div> */}
                <div>
                  <label className="text-sm text-gray-700">
                    Location (Optional)
                  </label>
                  <input
                    name="eventLocation"
                    value={bookingData.eventLocation}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="e.g. Grand Hotel, Studio B"
                  />
                </div>
              </div>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">Package</label>
                <select
                  name="packageSelected"
                  value={bookingData.packageSelected}
                  onChange={handleChange}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                >
                  <option>Select package</option>
                  <option>Basic Package</option>
                  <option>Standard Package</option>
                  <option>Premium Package</option>
                  <option>Deluxe Package</option>
                  <option>Custom Package</option>
                </select>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Payment Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className=" text-gray-700">Package Price</label>
                  <input
                    name="packegPrice"
                    value={bookingData.packegPrice}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="₹ 0.00"
                  />
                </div>
                <div>
                  <label className=" text-gray-700">Advance Payment</label>
                  <input
                    name="advancePayment"
                    value={bookingData.advancePayment}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="₹ 0.00"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Additional Notes</p>
              <textarea
                name="additionalNotes"
                value={bookingData.additionalNotes}
                onChange={handleChange}
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-28 outline-none resize-none"
                placeholder="Add any special requirements or notes..."
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600   border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvoice}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "gallery" && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <h2 className="text-lg font-semibold">Create New Gallery</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">Gallery Title</label>
                <input
                  value={galleryForm.title}
                  onChange={(e) =>
                    setGalleryForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  placeholder="e.g., Sarah & Praveen Wedding 2025"
                />
              </div>
            </div>

            <div>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">
                  {booking ? "Client & Booking" : "Select Client"}
                </label>
                {booking ? (
                  <div className="mt-1 w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2 text-gray-700">
                    {booking.bookingId} — {booking.clientName}
                    {booking.eventType ? ` — ${booking.eventType}` : ""}
                  </div>
                ) : (
                  <select
                    value={galleryForm.bookingId}
                    onChange={(e) =>
                      setGalleryForm((f) => ({
                        ...f,
                        bookingId: e.target.value,
                      }))
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  >
                    {!availableBookings.length && (
                      <option value="">Choose a client...</option>
                    )}
                    {availableBookings.map((b) => (
                      <option key={b.bookingId} value={b.bookingId}>
                        {b.bookingId} - {b.clientName} - {b.eventType}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-2">Upload Photos</p>
              <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 w-full flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#5a54e6] transition">
                <div className="text-gray-500 text-4xl mb-3">
                  <LuUpload />
                </div>
                <p className="text-gray-600 font-medium">
                  Drag and drop photos here
                </p>
                <p className="text-gray-400 text-sm mt-1">or click to browse</p>
                <span className="mt-4 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5a54e6] transition">
                  Select Files
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setGalleryForm((f) => ({
                      ...f,
                      files: Array.from(e.target.files || []),
                    }))
                  }
                  className="hidden"
                />
              </label>
              {galleryForm.files.length > 0 && (
                <p className="text-gray-500 text-sm mt-2">
                  {galleryForm.files.length} photo(s) selected
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="watermark"
                checked={galleryForm.watermark}
                onChange={(e) =>
                  setGalleryForm((f) => ({ ...f, watermark: e.target.checked }))
                }
                className="w-4 h-4"
              />
              <label htmlFor="watermark" className="text-sm">
                Add watermark to all photos
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600  border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGallery}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Create Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "invoice" && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <h2 className="text-lg font-semibold">Create New Invoice</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">Select Booking</label>
                {booking ? (
                  <select
                    value={`${booking.bookingId} - ${booking.clientName} - ${booking.eventType}`}
                    onChange={() => {}}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  >
                    <option>{`${booking.bookingId} - ${booking.clientName} - ${booking.eventType}`}</option>
                  </select>
                ) : (
                  <select
                    value={selectedInvoiceBookingId}
                    onChange={(e) =>
                      setSelectedInvoiceBookingId(e.target.value)
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  >
                    {!availableBookings.length && (
                      <option value="">Choose a booking...</option>
                    )}
                    {availableBookings.length > 0 ? (
                      availableBookings.map((item) => (
                        <option key={item.bookingId} value={item.bookingId}>
                          {item.bookingId} - {item.clientName} -{" "}
                          {item.eventType}
                        </option>
                      ))
                    ) : (
                      <option value="">Loading bookings...</option>
                    )}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className=" text-gray-700">Invoice Amount (₹)</label>
                  <input
                    value={invoiceForm.amount}
                    onChange={(e) =>
                      setInvoiceForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                    placeholder="₹ 0.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) =>
                      setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Description / Items</p>
              <textarea
                value={invoiceForm.description}
                onChange={(e) =>
                  setInvoiceForm((f) => ({ ...f, description: e.target.value }))
                }
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-30 outline-none resize-none"
                placeholder="Enter invoice item and description..."
              />
            </div>

            <div>
              <p className="font-medium text-gray-700">Additional Notes</p>
              <textarea
                value={invoiceForm.notes}
                onChange={(e) =>
                  setInvoiceForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-25 outline-none resize-none"
                placeholder="Payment terms, bank details, etc..."
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600 border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoice}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "invoiceDetail" && invoice && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <div>
              <h2 className="text-lg font-semibold">
                Invoice {invoice.invoiceId}
              </h2>
              <h2 className="text-xs font-semibold text-gray-600">
                {invoice.clientName} - {invoice.bookingId}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className=" text-gray-700">Client</label>
                <p className="mt-1 font-medium text-gray-800">
                  {invoice.clientName}
                </p>
                <p className="text-gray-500">{invoice.email}</p>
              </div>
              <div>
                <label className=" text-gray-700">Booking</label>
                <p className="mt-1 font-medium text-gray-800">
                  {invoice.bookingId}
                </p>
                <p className="text-gray-500">
                  Issued{" "}
                  {invoice.createdAt
                    ? new Date(invoice.createdAt).toLocaleDateString("en-GB")
                    : "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className=" text-gray-700">Invoice Amount (₹)</label>
                <input
                  value={invoiceEditForm.amount}
                  onChange={(e) =>
                    setInvoiceEditForm((f) => ({
                      ...f,
                      amount: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  placeholder="₹ 0.00"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Due Date</label>
                <input
                  type="date"
                  value={invoiceEditForm.dueDate}
                  onChange={(e) =>
                    setInvoiceEditForm((f) => ({
                      ...f,
                      dueDate: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Status</label>
                <select
                  value={invoiceEditForm.status}
                  onChange={(e) =>
                    setInvoiceEditForm((f) => ({
                      ...f,
                      status: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                >
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Paid</option>
                </select>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Description / Items</p>
              <textarea
                value={invoiceEditForm.description}
                onChange={(e) =>
                  setInvoiceEditForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-30 outline-none resize-none"
                placeholder="Enter invoice item and description..."
              />
            </div>

            <div>
              <p className="font-medium text-gray-700">Additional Notes</p>
              <textarea
                value={invoiceEditForm.notes}
                onChange={(e) =>
                  setInvoiceEditForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-25 outline-none resize-none"
                placeholder="Payment terms, bank details, etc..."
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600 border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateInvoice}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "paymentDetail" && booking && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <div>
              <h2 className="text-lg font-semibold">Payment Details</h2>
              <h2 className="text-xs font-semibold text-gray-600">
                {booking.clientName} - {booking.bookingId}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div className="w-full bg-white p-4 rounded-2xl border border-gray-200 ">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-800 sm:mt-0.5 sm:block">
                    {booking.clientName || "—"}
                  </span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Booking ID</span>
                  <span className="font-medium text-gray-800 sm:mt-0.5 sm:block">
                    {booking.bookingId || "—"}
                  </span>
                </div>
              </div>
              <hr className="border-gray-200 mb-4" />
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500">Package Amount</span>
                <span className="text-sm font-medium">
                  ₹{price.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500">Advance Amount</span>
                <span className="text-sm font-medium">
                  ₹{advance.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500">Total Paid</span>
                <span className="text-sm font-bold text-green-500">
                  ₹{totalPaid.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500">Remaining Amount</span>
                <span className="text-sm font-bold text-red-500">
                  ₹{remaining.toLocaleString("en-IN")}
                </span>
              </div>
              <hr className="border-gray-200 mb-3" />
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Payment Status</span>
                <span
                  className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm
              ${
                payStatus === "Paid"
                  ? "bg-green-100 text-green-700"
                  : payStatus === "Partial"
                    ? "bg-yellow-100 text-yellow-700"
                    : payStatus === "Pending"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
              }`}
                >
                  {payStatus}
                </span>
              </div>
            </div>

            {remaining > 0 ? (
              <div>
                <p className="font-medium text-gray-700 mb-3">Add Payment</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center flex-1 border border-gray-300 rounded-lg px-3 py-2">
                    <span className="text-gray-500 text-sm">₹</span>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={detailPaymentAmount}
                      onChange={(e) => setDetailPaymentAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddDetailPayment();
                      }}
                      placeholder="Amount received"
                      className="w-full bg-transparent ml-2 outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleAddDetailPayment}
                    disabled={detailPaymentBusy}
                    className="text-white px-5 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {detailPaymentBusy ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-green-600 font-medium">
                This booking is fully paid.
              </p>
            )}

            <div>
              <p className="font-medium text-gray-700 mb-3">Payment History</p>
              <div className="space-y-2">
                {customerPayments.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No payments recorded yet
                  </p>
                )}
                {customerPayments.map((p, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 p-3 rounded-lg flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-500">
                      {p.date
                        ? new Date(p.date).toLocaleDateString("en-GB")
                        : "-"}
                    </span>
                    <span className="font-semibold text-gray-700">
                      ₹{(Number(p.amount) || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {remaining > 0 && (
              <div className="flex items-center pt-2">
                <button
                  onClick={onSendReminder}
                  className="w-full text-gray-600 border border-gray-300 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                >
                  Send Reminder
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {type === "reminder" && booking && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <div>
              <h2 className="text-lg font-semibold">Send Payment Reminder</h2>
              <h2 className="text-xs font-semibold text-gray-600">
                {booking.clientName} - {booking.bookingId}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div className="w-full bg-white p-4 rounded-2xl border border-gray-200 ">
              <h2 className="text-lg font-semibold mb-6">Payment Summary</h2>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500">Package Price</span>
                <span className="px-3 text-sm font-medium">
                  ₹{price.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500">Total Paid</span>
                <span className="px-3 text-sm font-bold text-green-500">
                  ₹{totalPaid.toLocaleString("en-IN")}
                </span>
              </div>
              <hr className="text-gray-300 mb-2" />
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-sm">Pending Amount</span>
                <span className="px-3 text-sm font-bold text-red-500">
                  ₹{remaining.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Booking Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <label className=" text-gray-700">Event</label>
                  <p className="mt-1 font-medium text-gray-800">
                    {booking.eventType}
                  </p>
                </div>
                <div>
                  <label className=" text-gray-700">Event Date</label>
                  <p className="mt-1 font-medium text-gray-800">
                    {booking.eventDate
                      ? new Date(booking.eventDate).toLocaleDateString("en-GB")
                      : "TBD"}
                    {booking.eventTime ? ` · ${booking.eventTime}` : ""}
                  </p>
                </div>
                <div>
                  <label className=" text-gray-700">Email</label>
                  <p className="mt-1 font-medium text-gray-800">
                    {booking.email || "— not saved —"}
                  </p>
                </div>
                <div>
                  <label className=" text-gray-700">Phone</label>
                  <p className="mt-1 font-medium text-gray-800">
                    {booking.phone || "— not saved —"}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full">
              <p className="text-sm text-gray-700 mb-3">Send Via *</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    id: "email",
                    label: "Email",
                    icon: "✉️",
                    ok: !!booking.email,
                  },
                  { id: "sms", label: "SMS", icon: "💬", ok: !!booking.phone },
                  {
                    id: "both",
                    label: "Both",
                    icon: "📨",
                    ok: !!booking.email && !!booking.phone,
                  },
                  {
                    id: "whatsapp",
                    label: "WhatsApp",
                    icon: <FaWhatsapp className="text-[#25D366]" />,
                    ok: !!whatsAppLink(booking.phone),
                  },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!c.ok}
                    onClick={() =>
                      setReminderForm((f) => ({ ...f, channel: c.id }))
                    }
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition
              ${
                reminderForm.channel === c.id
                  ? "bg-indigo-50 border-indigo-500 shadow-sm"
                  : "bg-white border-gray-300 hover:border-indigo-300"
              }
              ${!c.ok ? "opacity-40 cursor-not-allowed" : ""}
            `}
                  >
                    <span className="text-3xl mb-2">{c.icon}</span>
                    <span className="text-sm text-gray-800">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-700">Message</p>
              <textarea
                value={reminderForm.message}
                onChange={(e) =>
                  setReminderForm((f) => ({ ...f, message: e.target.value }))
                }
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-28 outline-none resize-none"
                placeholder="Reminder message to the customer..."
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600   border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Send Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "addevent" && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <h2 className="text-lg font-semibold">Add New Event</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div>
              <div className="text-sm">
                <label className=" text-gray-700">Event Title *</label>
                <input
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  placeholder="e.g., Client Meeting, Photo Shoot, Editing Session"
                />
              </div>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">Event Type *</label>
                <select
                  value={eventForm.type}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                >
                  <option>Booking / Shoot</option>
                  <option>Meeting</option>
                  <option>Reminder</option>
                  <option>Task</option>
                  <option>Personal</option>
                </select>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <label className="text-sm text-gray-700">Date *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Start Time *</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) =>
                      setEventForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">End Time *</label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) =>
                      setEventForm((f) => ({ ...f, endTime: e.target.value }))
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  />
                </div>
              </div>
              <div className="text-sm mt-4">
                <label className=" text-gray-700">Location</label>
                <input
                  value={eventForm.location}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, location: e.target.value }))
                  }
                  className="mt-1 w-full  border border-gray-300 rounded-lg px-4 py-2 outline-none"
                  placeholder="e.g.,  Studio, Client Address, Venue Name"
                />
              </div>
              <div className="mt-4 text-sm">
                <label className=" text-gray-700">
                  {" "}
                  Link to Booking (Optional){" "}
                </label>
                <select
                  value={eventForm.bookingId}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, bookingId: e.target.value }))
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                >
                  <option value="">No linked booking</option>
                  {availableBookings.map((b) => (
                    <option key={b.bookingId} value={b.bookingId}>
                      {b.bookingId} – {b.clientName} – {b.eventType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-700 mb-2">Event Color</p>
              <div className="flex items-center gap-3">
                {colors.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-lg cursor-pointer border-2 transition-all
              ${color === c ? "border-black scale-120" : "border-transparent scale-100"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="text-sm">
              <p className=" text-gray-700">Additional Notes</p>
              <textarea
                value={eventForm.notes}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, notes: e.target.value }))
                }
                className=" mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-28 outline-none resize-none"
                placeholder="Add any special requirements or notes..."
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600   border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "payments" && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 ">
            <h2 className="text-lg font-semibold">Record Payment</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div className="max-w-2xl text-sm ">
              <label className="text-gray-700">Select Booking *</label>
              <select
                value={payBooking?.id || ""}
                className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                onChange={(e) =>
                  setPayBooking(
                    paymentBookingOptions.find((x) => x.id === e.target.value),
                  )
                }
              >
                <option value="">Choose a booking...</option>
                {paymentBookingOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id} – {x.client} – {x.event} (Balance: ₹
                    {x.price - x.paid})
                  </option>
                ))}
              </select>

              {payBooking && (
                <div className="mt-4 p-4 rounded-xl border border-gray-300  bg-purple-50">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Booking Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">Client:</p>{" "}
                      <p>{payBooking.client}</p>
                      <p className="mt-3 text-gray-600">Package Price:</p>{" "}
                      <p>₹{payBooking.price}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Event Type:</p>{" "}
                      <p>{payBooking.event}</p>
                      <p className="mt-3 text-gray-600">Total Paid:</p>{" "}
                      <p>₹{payBooking.paid}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-600">Remaining Balance:</p>
                    <p className="text-red-400 font-bold text-lg">
                      ₹{payBooking.price - payBooking.paid}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className=" text-sm">
              <label className=" text-gray-700">Payment Amount *</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                }
                className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                placeholder="₹ 0.00"
              />
            </div>

            <div className=" text-sm">
              <label className=" text-gray-700"> Payment Date * </label>
              <input
                type="date"
                value={paymentForm.date}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, date: e.target.value }))
                }
                className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
              />
            </div>

            <div className="w-full">
              <p className="text-sm text-gray-700 mb-3">Payment Method *</p>
              <div className="grid grid-cols-3 gap-4">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition
              ${
                selected === m.id
                  ? "bg-indigo-50 border-indigo-500 shadow-sm"
                  : "bg-white border-gray-300 hover:border-indigo-300"
              }
            `}
                  >
                    <span className="text-3xl mb-2">{m.icon}</span>
                    <span className="text-sm text-gray-800">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-700">
                Reference / Transaction ID
              </label>
              <input
                value={paymentForm.reference}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, reference: e.target.value }))
                }
                className=" text-sm mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                placeholder="e.g,, TXN123456, Check #789, etc."
              />
            </div>

            <div>
              <p className="text-sm text-gray-700">Additional Notes</p>
              <textarea
                value={paymentForm.note}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, note: e.target.value }))
                }
                className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 h-28 outline-none resize-none"
                placeholder="Add any Additional notes about this payment..."
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 ">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600   border border-gray-300  py-2 rounded-lg text-sm font-semibold  items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="w-1/2  text-white  py-2 rounded-lg text-sm font-semibold bg-[#6C63FF]  items-center cursor-pointer"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {type === "contactDetail" && contact && (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <div>
              <h2 className="text-lg font-semibold">Contact Message</h2>
              <h2 className="text-xs font-semibold text-gray-600">
                {contact.name}
                {contact.createdAt
                  ? ` · ${new Date(contact.createdAt).toLocaleString("en-GB")}`
                  : ""}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
            >
              <IoCloseSharp className="text-2xl " />
            </button>
          </div>

          <div className="px-6 py-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-700">Name</label>
                <p className="mt-1 font-medium text-gray-800">
                  {contact.name || "—"}
                </p>
              </div>
              <div>
                <label className="text-gray-700">Email</label>
                <p className="mt-1 font-medium text-gray-800">
                  {contact.email || "—"}
                </p>
              </div>
              <div>
                <label className="text-gray-700">Phone</label>
                <p className="mt-1 font-medium text-gray-800">
                  {contact.phone || "— not provided —"}
                </p>
              </div>
              <div>
                <label className="text-gray-700">Event Type</label>
                <p className="mt-1 font-medium text-gray-800">
                  {contact.eventType || "— not specified —"}
                </p>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700">Message</p>
              <div className="text-sm mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-700 whitespace-pre-wrap">
                {contact.message || "No message included."}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4">
              <button
                onClick={onClose}
                className="w-1/2 text-gray-600 border border-gray-300 py-2 rounded-lg text-sm font-semibold items-center cursor-pointer"
              >
                Close
              </button>
              <a
                href={contact.email ? `mailto:${contact.email}` : undefined}
                className={`w-1/2 text-center text-white py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] items-center cursor-pointer ${
                  contact.email ? "" : "pointer-events-none opacity-50"
                }`}
              >
                Reply via Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Model;
