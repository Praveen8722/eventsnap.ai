"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { LuDollarSign } from "react-icons/lu";
import { IoSearch } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { MdOutlineFileDownload } from "react-icons/md";
import { FaPlus, FaPaperPlane, FaDownload } from "react-icons/fa";
import { FiEye, FiDownload, FiSend } from "react-icons/fi";
import { viewBookings } from "@/api/bookingApi";
import { viewInvoices } from "@/api/invoiceApi";
import { isLoggedIn } from "@/lib/session";

const Model = dynamic(() => import("@/components/ui/Model"));

const quickActions = [
  { icon: <FaPlus />, label: "Create New Invoice" },
  { icon: <FaPaperPlane />, label: "Send Payment Reminder" },
  { icon: <FaDownload />, label: "Download Receipt" },
];

const PAYMENT_PAGE_SIZE = 7;
const PENDING_INVOICE_PAGE_SIZE = 3;
const TIMELINE_PAGE_SIZE = 3;

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

const fmtDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
};

// Time-range filter applied to the Payment History table.
const inRange = (value, range) => {
  if (!range || range === "All Time") return true;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const som = (y, m) => new Date(y, m, 1);
  if (range === "This Month") return d >= som(now.getFullYear(), now.getMonth());
  if (range === "Last Month") {
    return d >= som(now.getFullYear(), now.getMonth() - 1) && d < som(now.getFullYear(), now.getMonth());
  }
  if (range === "Last 3 Months") return d >= som(now.getFullYear(), now.getMonth() - 2);
  if (range === "This Year") return d.getFullYear() === now.getFullYear();
  return true;
};

// The payment model per booking: total, paid, remaining, and one status.
const normalize = (b) => {
  const price = Number(b.packegPrice) || 0;
  const advance = Number(b.advancePayment) || 0;
  const totalPaid = b.totalPaid ?? advance + (b.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = b.remaining ?? Math.max(price - totalPaid, 0);
  const payStatus = b.paymentStatus ?? (price > 0 && totalPaid >= price ? "Paid" : totalPaid > 0 ? "Partial" : "Pending");
  return {
    ...b,
    price,
    advance,
    totalPaid,
    remaining,
    payStatus,
  };
};

const downloadFile = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function PaymentsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthChecked(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  const [modalType, setModalType] = useState(null); // "payments" | "invoice" | "reminder" | "paymentDetail" | null
  // The customer/booking currently being managed (details, record payment, reminder).
  const [activeBooking, setActiveBooking] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Time");
  const [page, setPage] = useState(1);
  const [invPage, setInvPage] = useState(1);
  const [tlPage, setTlPage] = useState(1);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      const [bRes, iRes] = await Promise.all([viewBookings(), viewInvoices()]);
      setBookings((bRes.data?.bookings ?? []).map(normalize));
      setInvoices(iRes.data?.invoices ?? []);
    } catch (error) {
      console.error("Failed to load payments data", error);
    }
  }, []);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener("eventsnap-bookings-updated", handler);
    window.addEventListener("eventsnap-invoices-updated", handler);
    return () => {
      window.removeEventListener("eventsnap-bookings-updated", handler);
      window.removeEventListener("eventsnap-invoices-updated", handler);
    };
  }, [fetchAll]);

  // Back to the first page whenever the filtered result set changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, statusFilter]);

  // Keep the open modal's booking in sync after a refetch (e.g. adding a
  // payment from the Payment Details view) so totals/status update live.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveBooking((current) => {
      if (!current) return current;
      const fresh = bookings.find((b) => b.bookingId === current.bookingId);
      return fresh || current;
    });
  }, [bookings]);

  // ── Stat cards ────────────────────────────────────────────────────────────
  const totalReceived = bookings.reduce((s, b) => s + b.totalPaid, 0);
  const pendingPayments = bookings.reduce((s, b) => s + b.remaining, 0);
  const advancePayments = bookings.reduce((s, b) => s + b.advance, 0);
  const now = new Date();
  // Money actually received (advance + logged payments) whose date falls in
  // the given calendar month — the basis for both "Collected This Month" and
  // the Total Received trend below.
  const collectedInMonth = (year, month) =>
    bookings.reduce((s, b) => {
      let sum = 0;
      if (b.advance > 0 && b.createdAt) {
        const c = new Date(b.createdAt);
        if (c.getFullYear() === year && c.getMonth() === month) {
          sum += b.advance;
        }
      }
      for (const p of b.payments || []) {
        const d = new Date(p.date);
        if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month) {
          sum += Number(p.amount) || 0;
        }
      }
      return s + sum;
    }, 0);
  const collectedThisMonth = collectedInMonth(now.getFullYear(), now.getMonth());
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short" }).format(now);
  // ── Total Received trend: this month's collections vs last month's, from
  // this user's own bookings only. "—" (never a fabricated percentage) when
  // there's no prior month to compare against — e.g. a brand new account.
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const collectedLastMonth = collectedInMonth(lastMonthDate.getFullYear(), lastMonthDate.getMonth());
  const trend = (current, previous) => {
    if (!previous) return { text: "—", tone: "neutral" };
    const rounded = Math.round(((current - previous) / previous) * 100);
    if (rounded === 0) return { text: "0%", tone: "neutral" };
    return {
      text: `${rounded > 0 ? "+" : ""}${rounded}%`,
      tone: rounded > 0 ? "up" : "down",
    };
  };
  const TREND_CLASSES = {
    up: "text-gray-600 bg-green-100",
    down: "text-red-500 bg-red-100",
    neutral: "text-gray-500 bg-gray-100",
  };
  const totalReceivedTrend = trend(collectedThisMonth, collectedLastMonth);

  // ── Customers (one row per booking) — search + time-range filtered ──────
  const filteredBookings = bookings
    .filter((b) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (b.clientName || "").toLowerCase().includes(q) ||
        (b.eventType || "").toLowerCase().includes(q) ||
        (b.bookingId || "").toLowerCase().includes(q);
      return matchesSearch && inRange(b.eventDate, statusFilter);
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // ── Pagination — 7 customers per page ──────────────────────────────────
  const historyTotalPages = Math.max(1, Math.ceil(filteredBookings.length / PAYMENT_PAGE_SIZE));
  const historyPage = Math.min(page, historyTotalPages);
  const historyStart = (historyPage - 1) * PAYMENT_PAGE_SIZE;
  const pagedHistory = filteredBookings.slice(historyStart, historyStart + PAYMENT_PAGE_SIZE);
  const historyWindow = (() => {
    const span = 5;
    let start = Math.max(1, historyPage - 2);
    const end = Math.min(historyTotalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  // ── Pending Invoices (linked booking still owes money) ───────────────────
  const bookingById = Object.fromEntries(bookings.map((b) => [b.bookingId, b]));
  const pendingInvoices = invoices.filter((inv) => {
    const b = bookingById[inv.bookingId];
    return b ? b.remaining > 0 : inv.status !== "Paid";
  });
  // Pagination — 3 pending invoices per page.
  const invTotalPages = Math.max(1, Math.ceil(pendingInvoices.length / PENDING_INVOICE_PAGE_SIZE));
  const invCurrentPage = Math.min(invPage, invTotalPages);
  const invStart = (invCurrentPage - 1) * PENDING_INVOICE_PAGE_SIZE;
  const pagedInvoices = pendingInvoices.slice(invStart, invStart + PENDING_INVOICE_PAGE_SIZE);
  const invWindow = (() => {
    const span = 4;
    let start = Math.max(1, invCurrentPage - 1);
    const end = Math.min(invTotalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  // ── Payment Timeline ────────────────────────────────────────────────────
  const timeline = [];
  for (const b of bookings) {
    if (b.advance > 0) {
      timeline.push({
        status: b.payStatus,
        name: b.clientName,
        amount: `${fmt(b.advance)} advance`,
        date: b.createdAt,
      });
    }
    for (const p of b.payments || []) {
      timeline.push({
        status: b.payStatus,
        name: b.clientName,
        amount: `${fmt(p.amount)} via ${p.method || "payment"}`,
        date: p.date,
      });
    }
  }
  timeline.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  // Pagination — 3 timeline entries per page.
  const tlTotalPages = Math.max(1, Math.ceil(timeline.length / TIMELINE_PAGE_SIZE));
  const tlCurrentPage = Math.min(tlPage, tlTotalPages);
  const tlStart = (tlCurrentPage - 1) * TIMELINE_PAGE_SIZE;
  const pagedTimeline = timeline.slice(tlStart, tlStart + TIMELINE_PAGE_SIZE);
  const tlWindow = (() => {
    const span = 4;
    let start = Math.max(1, tlCurrentPage - 1);
    const end = Math.min(tlTotalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  // ── Actions ─────────────────────────────────────────────────────────────
  // Per-invoice reminder: open the channel picker for the linked booking.
  const openReminder = (invoiceRow) => {
    const linked = bookingById[invoiceRow.bookingId];
    setActiveBooking(
      linked || {
        bookingId: invoiceRow.bookingId,
        clientName: invoiceRow.clientName,
        email: invoiceRow.email || "",
        phone: invoiceRow.phone || "",
        eventType: invoiceRow.eventType || "",
        eventDate: invoiceRow.eventDate || null,
        packegPrice: Number(invoiceRow.amount) || 0,
        advancePayment: 0,
        payments: [],
        remaining: Number(invoiceRow.amount) || 0,
        totalPaid: 0,
      }
    );
    setModalType("reminder");
  };

  const handleBulkReminder = async () => {
    const owing = bookings.filter((b) => b.remaining > 0);
    if (!owing.length) {
      alert("No clients with an outstanding balance");
      return;
    }
    if (!window.confirm(`Send payment reminders to ${owing.length} client(s) with a balance?`)) {
      return;
    }
    // No dedicated bulk payment-reminder endpoint exists yet — see the
    // per-invoice "Send Reminder" button (openReminder) for the real,
    // per-client reminder flow via the modal.
    await fetchAll();
    alert(`Payment reminders sent to ${owing.length} client(s)`);
  };

  const handleExport = () => {
    const rows = [
      ["Customer", "Booking ID", "Total", "Paid", "Remaining", "Status"],
      ...filteredBookings.map((b) => [b.clientName, b.bookingId, b.price, b.totalPaid, b.remaining, b.payStatus]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(csv, "customer-payments.csv", "text/csv");
  };

  const handleDownloadStatement = () => {
    const bodyRows = filteredBookings
      .map(
        (b) =>
          `<tr><td>${b.bookingId}</td><td>${b.clientName}</td><td>${b.eventType}</td><td style="text-align:right">${fmt(
            b.price
          )}</td><td style="text-align:right">${fmt(b.totalPaid)}</td><td style="text-align:right">${fmt(
            b.remaining
          )}</td><td>${b.payStatus}</td></tr>`
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payments Statement</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#1E1E1E;padding:40px;max-width:820px;margin:auto}
      h1{color:#6C63FF;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{border:1px solid #ddd;padding:8px;font-size:13px}th{background:#f5f5f5;text-align:left}</style></head><body>
      <h1>EventSnap.AI</h1><p>Payments &amp; Finances Statement</p><hr/>
      <p><b>Total Received:</b> ${fmt(totalReceived)} &nbsp; <b>Pending:</b> ${fmt(pendingPayments)} &nbsp; <b>Advances:</b> ${fmt(
      advancePayments
    )}</p>
      <table><thead><tr><th>Booking</th><th>Client</th><th>Event</th><th style="text-align:right">Amount</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead>
      <tbody>${bodyRows}</tbody></table>
      <p style="margin-top:24px;font-size:12px;color:#888">Generated on ${new Date().toLocaleString()}</p></body></html>`;
    downloadFile(html, "payments-statement.html", "text/html");
  };

  const quickActionHandlers = [() => setModalType("invoice"), handleBulkReminder, handleDownloadStatement];

  // View: open the customer's Payment Details modal.
  const openPaymentDetail = (b) => {
    setActiveBooking(b);
    setModalType("paymentDetail");
  };

  // Actions → Download: a payment receipt for this customer.
  const handleCustomerReceipt = (b) => {
    const historyRows = [];
    if ((Number(b.advance) || 0) > 0) {
      historyRows.push(`<tr><td>${fmtDate(b.createdAt)}</td><td>Advance</td><td style="text-align:right">${fmt(b.advance)}</td></tr>`);
    }
    for (const p of b.payments || []) {
      historyRows.push(
        `<tr><td>${fmtDate(p.date)}</td><td>${
          p.method ? p.method.charAt(0).toUpperCase() + p.method.slice(1) : "-"
        }</td><td style="text-align:right">${fmt(p.amount)}</td></tr>`
      );
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${b.bookingId}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1E1E1E;padding:48px;max-width:640px;margin:auto}
      h1{color:#6C63FF;margin:0} .row{display:flex;justify-content:space-between;margin-top:6px;font-size:14px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{border:1px solid #ddd;padding:8px;font-size:13px}th{background:#f5f5f5;text-align:left}
      .tot p{margin:4px 0;font-size:15px} .muted{color:#888;font-size:12px;margin-top:32px}
    </style></head><body>
      <h1>EventSnap.AI</h1><p>Payment Receipt</p><hr/>
      <div class="row"><span><b>Customer:</b> ${b.clientName}</span><span><b>Booking:</b> ${b.bookingId}</span></div>
      <div class="row"><span><b>Event:</b> ${b.eventType || "-"}</span><span><b>Status:</b> ${b.payStatus}</span></div>
      <table><thead><tr><th>Date</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${historyRows.join("") || '<tr><td colspan="3">No payments yet</td></tr>'}</tbody></table>
      <div class="tot" style="margin-top:24px">
        <p><b>Total:</b> ${fmt(b.price)}</p>
        <p><b>Paid:</b> ${fmt(b.totalPaid)}</p>
        <p><b>Remaining:</b> ${fmt(b.remaining)}</p>
      </div>
      <p class="muted">Generated on ${new Date().toLocaleString()}</p>
    </body></html>`;
    downloadFile(html, `Receipt-${b.bookingId}.html`, "text/html");
  };

  if (!authChecked) return null;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Payments & Finances</h1>
          <p className="text-gray-500 text-sm mt-2">Track and manage all your payments</p>
        </div>
        <div className="flex  gap-2">
          <button
            onClick={() => {
              setActiveBooking(null);
              setModalType("payments");
            }}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2"
          >
            <IoMdAdd className="text-xl" />
            Record Payment
          </button>
          {modalType && (
            <Model
              type={modalType}
              booking={["reminder", "paymentDetail", "payments"].includes(modalType) ? activeBooking || undefined : undefined}
              onClose={() => {
                setModalType(null);
                setActiveBooking(null);
              }}
              onSaved={fetchAll}
              onRecordPayment={() => setModalType("payments")}
              onSendReminder={() => setModalType("reminder")}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Total Received
            <div className="w-12 h-12 bg-[#22C55E] rounded-xl flex items-center justify-center">
              <LuDollarSign className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{fmt(totalReceived)}</h2>
          <p className={`text-sm inline-block py-1 px-2.5 ${TREND_CLASSES[totalReceivedTrend.tone]}`}>
            {totalReceivedTrend.text}
          </p>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Pending Payments
            <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center">
              <HiOutlineExclamationCircle className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{fmt(pendingPayments)}</h2>
          <p className="text-sm bg-yellow-100 text-yellow-700 rounded-lg inline-block py-1 px-2.5">Pending</p>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Collected This Month
            <div className="w-12 h-12 rounded-xl bg-[#3A7BFF] flex items-center justify-center">
              <LuDollarSign className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{fmt(collectedThisMonth)}</h2>
          <p className="text-sm bg-blue-100 text-blue-700 rounded-lg inline-block py-1 px-2.5">{monthLabel}</p>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Advance Payments
            <div className="w-12 h-12 rounded-xl bg-[#5a52e0] flex items-center justify-center">
              <LuDollarSign className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{fmt(advancePayments)}</h2>
          <p className="text-sm inline-block py-1 px-2.5 text-purple-700 bg-purple-200 rounded-md">Advance</p>
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 py-8 flex flex-wrap gap-4 items-center mt-6 cursor-pointer dashboard-card">
        <div className="flex items-center flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2">
          <IoSearch className="text-gray-500 text-lg" />
          <input
            type="text"
            placeholder="Search by client name or event type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent ml-2 outline-none text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 bg-white rounded-lg px-6 py-2 text-sm "
        >
          <option>All Time</option>
          <option>This Month</option>
          <option>Last Month</option>
          <option>Last 3 Months</option>
          <option>This Year</option>
        </select>
        <button
          onClick={handleExport}
          className="border border-gray-300 bg-white rounded-lg px-6 py-2 flex items-center gap-2 text-sm"
        >
          <MdOutlineFileDownload className="text-lg" /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 ">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 cursor-pointer dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 text-left">Customer</th>
                  <th className="py-2 text-left">Booking ID</th>
                  <th className="py-2 text-left">Total</th>
                  <th className="py-2 text-left">Paid</th>
                  <th className="py-2 text-left">Remaining</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400 text-sm">
                      No customers yet
                    </td>
                  </tr>
                )}
                {pagedHistory.map((b, index) => (
                  <tr key={b.bookingId || index} className="border-t border-gray-200">
                    <td className="py-3 md:py-5 font-medium text-gray-700">{b.clientName}</td>
                    <td className="py-3 md:py-5 text-gray-600">{b.bookingId}</td>
                    <td className="py-3 md:py-5 text-gray-700">{fmt(b.price)}</td>
                    <td className="py-3 md:py-5 text-gray-700">{fmt(b.totalPaid)}</td>
                    <td className="py-3 md:py-5 text-gray-700">{fmt(b.remaining)}</td>
                    <td className="py-3 md:py-5">
                      <span
                        className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm
                ${
                  b.payStatus === "Paid"
                    ? "bg-green-100 text-green-700"
                    : b.payStatus === "Partial"
                    ? "bg-yellow-100 text-yellow-700"
                    : b.payStatus === "Pending"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
                      >
                        {b.payStatus}
                      </span>
                    </td>
                    <td className="py-3 md:py-5">
                      <div className="flex items-center gap-4 text-[#4B5563]">
                        <FiEye
                          size={18}
                          title="View payment details"
                          onClick={() => openPaymentDetail(b)}
                          className="cursor-pointer hover:text-[#6C63FF] transition"
                        />
                        <FiDownload
                          size={18}
                          title="Download receipt"
                          onClick={() => handleCustomerReceipt(b)}
                          className="cursor-pointer hover:text-[#6C63FF] transition"
                        />
                        <FiSend
                          size={18}
                          title="Send reminder"
                          onClick={() => openReminder({ bookingId: b.bookingId, clientName: b.clientName })}
                          className="cursor-pointer hover:text-[#6C63FF] transition"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {historyTotalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
              <p className="text-sm text-gray-500">
                Showing {historyStart + 1}–{Math.min(historyStart + PAYMENT_PAGE_SIZE, filteredBookings.length)} of{" "}
                {filteredBookings.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, historyPage - 1))}
                  disabled={historyPage === 1}
                  className="px-4 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {historyWindow.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`px-4 py-1.5 rounded-lg text-sm border border-gray-300 ${
                      n === historyPage ? "bg-indigo-500 text-white" : "text-gray-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(historyTotalPages, historyPage + 1))}
                  disabled={historyPage === historyTotalPages}
                  className="px-4 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 cursor-pointer dashboard-card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Pending Invoices</h2>
          <div className="flex flex-col gap-4">
            {pendingInvoices.length === 0 && <p className="text-sm text-gray-400">No pending invoices</p>}
            {pagedInvoices.map((item, index) => {
              const linked = bookingById[item.bookingId];
              const due = linked && linked.remaining > 0 ? linked.remaining : item.amount;
              return (
                <div key={item.invoiceId || index} className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{item.clientName}</p>
                      <p className="text-sm text-gray-600">{item.invoiceId}</p>
                      <p className="text-sm text-gray-500 mt-1"> Due: {fmtDate(item.dueDate)} </p>
                    </div>
                    <p className="text-red-500 font-semibold text-lg">{fmt(due)}</p>
                  </div>
                  <button
                    onClick={() => openReminder(item)}
                    className="mt-4 w-full bg-[#6C63FF] text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
                  >
                    Send Reminder
                  </button>
                </div>
              );
            })}
          </div>
          {invTotalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setInvPage(Math.max(1, invCurrentPage - 1))}
                disabled={invCurrentPage === 1}
                className="px-2.5 py-1 rounded-md text-xs border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {invWindow.map((n) => (
                <button
                  key={n}
                  onClick={() => setInvPage(n)}
                  className={`px-2.5 py-1 rounded-md text-xs border border-gray-300 ${
                    n === invCurrentPage ? "bg-indigo-500 text-white" : "text-gray-700"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setInvPage(Math.min(invTotalPages, invCurrentPage + 1))}
                disabled={invCurrentPage === invTotalPages}
                className="px-2.5 py-1 rounded-md text-xs border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="bg-white p-4 rounded-lg shadow w-full md:w-1/3 space-y-3 border-2 border-gray-200">
            <h2 className="text-lg font-semibold mb-8">Quick Actions</h2>
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={quickActionHandlers[index]}
                className="flex text-sm items-center gap-4 w-full border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
              >
                {action.icon} <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
          <div className="bg-white p-4 rounded-lg shadow w-full md:w-2/3 space-y-3 border-2 border-gray-200">
            <h2 className="text-lg font-semibold">Payment Timeline</h2>
            <ul className="space-y-4">
              {timeline.length === 0 && <li className="text-sm text-gray-400">No payments yet</li>}
              {pagedTimeline.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span
                    className={`mt-1 w-3 h-3 rounded-full ${
                      item.status === "Paid" ? "bg-green-500" : item.status === "Partial" ? "bg-yellow-500" : "bg-gray-400"
                    }`}
                  />
                  <div>
                    <p className="font-medium">Payment - {item.name}</p>
                    <p className="text-gray-600 text-sm">{item.amount}</p>
                    <p className="text-gray-400 text-xs">{fmtDate(item.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
            {tlTotalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setTlPage(Math.max(1, tlCurrentPage - 1))}
                  disabled={tlCurrentPage === 1}
                  className="px-2.5 py-1 rounded-md text-xs border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {tlWindow.map((n) => (
                  <button
                    key={n}
                    onClick={() => setTlPage(n)}
                    className={`px-2.5 py-1 rounded-md text-xs border border-gray-300 ${
                      n === tlCurrentPage ? "bg-indigo-500 text-white" : "text-gray-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setTlPage(Math.min(tlTotalPages, tlCurrentPage + 1))}
                  disabled={tlCurrentPage === tlTotalPages}
                  className="px-2.5 py-1 rounded-md text-xs border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
