"use client";

// Recovered from the last working Turbopack dev-cache (.next/dev/static/chunks/src_7ce12fdf._.js,
// dated Sep 10) — the original /bookings page before it was lost. API calls
// have been adjusted to the current src/api/bookingApi.js exports
// (getBookingById -> getBooking is not used here; updateBookingStatus ->
// updateBooking({ status })). Both "New Booking" and "Edit Booking" now use
// the restored multi-purpose shared Model component (type="newBooking" /
// type="editBooking") — everything else (layout, classNames, copy,
// behaviour) is preserved exactly as compiled.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IoMdAdd } from "react-icons/io";
import { IoSearch } from "react-icons/io5";
import { FiFilter, FiEye, FiEdit2, FiCheck } from "react-icons/fi";
import { viewBookings, updateBooking } from "@/api/bookingApi";
import Model from "@/components/ui/Model";
import { whatsAppLink } from "@/lib/whatsapp";
import { FaWhatsapp } from "react-icons/fa";

// Each sub-tab maps to a slice of the Booking status enum. Together they
// partition every booking (New + Pending + Completed + Cancelled = All).
const TAB_STATUS_MATCHERS = {
  "All Bookings": () => true,
  "New Booking": (status) => status === "Inquiry",
  Pending: (status) =>
    ["Confirmed", "In Progress", "Editing", "Ready for Delivery"].includes(status),
  Completed: (status) => status === "Delivered",
  Cancelled: (status) => status === "Cancelled",
};
const TAB_LABELS = ["All Bookings", "New Booking", "Pending", "Completed", "Cancelled"];
const PAGE_SIZE = 10;

// Stored event dates are ISO strings ("2026-09-30T00:00:00.000Z") — show just
// the date, e.g. "Sep 30, 2026" (same style as the Dashboard). Formatted in
// UTC so the saved calendar day never shifts with the viewer's timezone.
const formatEventDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};
// Status pill colours — one distinct colour per Booking status.
const STATUS_BADGE = {
  Inquiry: "bg-gray-100 text-gray-600",
  Confirmed: "bg-purple-100 text-purple-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Editing: "bg-orange-100 text-orange-700",
  "Ready for Delivery": "bg-cyan-100 text-cyan-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};
// Every Booking status the photographer can switch a row to (matches the
// backend enum). Order follows the natural project flow.
const STATUS_OPTIONS = [
  "Inquiry",
  "Confirmed",
  "In Progress",
  "Editing",
  "Ready for Delivery",
  "Delivered",
  "Cancelled",
];

export function Bookings() {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);
  // The booking currently open in the Edit Booking modal (null = closed).
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [active, setActive] = useState("All Bookings");
  const [page, setPage] = useState(1);
  // Inline status editor: which row's menu is open (anchored to its pill) and
  // whether a status update is in flight.
  const [statusMenu, setStatusMenu] = useState(null); // { bookingId, top, left }
  const [statusSaving, setStatusSaving] = useState(false);
  const statusCloseTimer = useRef(null);

  const matchesTab = (status) => (TAB_STATUS_MATCHERS[active] ?? (() => true))(status);
  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.eventType.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || b.status === statusFilter;
    return matchesSearch && matchesStatus && matchesTab(b.status);
  });
  // Counts are derived from the fetched bookings so each tab stays in sync.
  const tabs = TAB_LABELS.map((label) => ({
    label,
    count: bookings.filter((b) => TAB_STATUS_MATCHERS[label](b.status)).length,
  }));

  // Reset to the first page whenever the result set changes.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, active]);

  // Client-side pagination — 10 rows per page over the already-filtered list.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const pageWindow = (() => {
    const span = 5;
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  const fetchData = async () => {
    try {
      const response = await viewBookings();
      const list = response.data.bookings ?? [];
      // Newest booking first (falls back to bookingId when createdAt is missing).
      const sorted = [...list].sort((a, b) => {
        const diff = new Date(b.createdAt) - new Date(a.createdAt);
        if (!Number.isNaN(diff) && diff !== 0) return diff;
        return String(b.bookingId).localeCompare(String(a.bookingId));
      });
      setBookings(sorted);
    } catch (error) {
      alert(error?.response?.data?.message || "View Bookings failed");
    }
  };

  // Guard against the effect running twice (React Strict Mode / Fast Refresh)
  // so "View Bookings" is requested only once.
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchData();
  }, []);

  // ── Inline status editor ──────────────────────────────────────────────────
  const openStatusMenu = (e, bookingId) => {
    if (statusCloseTimer.current) clearTimeout(statusCloseTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusMenu({ bookingId, top: rect.bottom + 4, left: rect.left });
  };
  const scheduleCloseStatusMenu = () => {
    if (statusCloseTimer.current) clearTimeout(statusCloseTimer.current);
    statusCloseTimer.current = setTimeout(() => setStatusMenu(null), 150);
  };
  const cancelCloseStatusMenu = () => {
    if (statusCloseTimer.current) clearTimeout(statusCloseTimer.current);
  };
  const handleStatusSelect = async (bookingId, nextStatus) => {
    const current = bookings.find((b) => b.bookingId === bookingId);
    setStatusMenu(null);
    if (!current || statusSaving || current.status === nextStatus) return;
    setStatusSaving(true);
    try {
      await updateBooking(bookingId, { status: nextStatus });
      // Update only this booking — leave every other row untouched.
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === bookingId ? { ...b, status: nextStatus } : b))
      );
      window.dispatchEvent(new CustomEvent("eventsnap-bookings-updated"));
      window.dispatchEvent(new CustomEvent("eventsnap-gallery-updated"));
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  // Close the floating menu on scroll/resize so it never sits detached.
  useEffect(() => {
    if (!statusMenu) return;
    const close = () => setStatusMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [statusMenu]);

  useEffect(() => {
    return () => {
      if (statusCloseTimer.current) clearTimeout(statusCloseTimer.current);
    };
  }, []);

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center justify-between mt-2 bg-white ">
        <div>
          <h1 className="text-2xl font-bold">Bookings Management</h1>
          <p className="text-gray-500 text-sm">Manage all your client bookings and events</p>
        </div>
        <div>
          <button
            onClick={() => setOpenModal(true)}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2 cursor-pointer"
          >
            <IoMdAdd className="text-xl" />
            New Booking
          </button>
          {openModal && (
            <Model type="newBooking" onClose={() => setOpenModal(false)} onCreated={fetchData} />
          )}
        </div>
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
          <option>All Status</option>
          <option>Inquiry</option>
          <option>Confirmed</option>
          <option>In Progress</option>
          <option>Editing</option>
          <option>Ready for Delivery</option>
          <option>Delivered</option>
          <option>Cancelled</option>
        </select>
        <button className="border border-gray-300 bg-white rounded-lg px-6 py-2 flex items-center gap-2 text-sm">
          <FiFilter className="text-lg" /> More Filters
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-2 mt-4">
        {tabs.map((item) => (
          <button
            key={item.label}
            onClick={() => setActive(item.label)}
            className={`px-4 py-1.5 rounded-lg text-sm border border-gray-300 ${
              active === item.label ? "bg-indigo-500 text-white" : "text-gray-700"
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 mt-6 w-full overflow-x-auto cursor-pointer dashboard-card">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-gray-700 text-[15px]  flex-1 bg-gray-50">
              <th className="py-2 text-left">Booking ID</th>
              <th className="py-2 text-left">Client Name</th>
              <th className="py-2 text-left">Event Type</th>
              <th className="py-2 text-left">Event Date</th>
              <th className="py-2 text-left">Package</th>
              <th className="py-2 text-left">Amount</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((item, idx) => (
              <tr key={item.bookingId || idx} className="border-t border-gray-200">
                <td className="py-5 font-medium text-gray-800">{item.bookingId}</td>
                <td className="py-5 text-gray-700">
                  <div className="flex   flex-col">
                    <span>{item.clientName}</span>{" "}
                    <span className="text-gray-400">{item.email}</span>
                  </div>
                </td>
                <td className="py-5 text-gray-700">{item.eventType}</td>
                <td className="py-5 text-gray-700">{formatEventDate(item.eventDate)}</td>
                <td className="py-5 text-gray-700">{item.packageSelected}</td>
                <td className="py-5 text-gray-700">₹{item.packegPrice}</td>
                <td className="py-5">
                  <div
                    className="relative inline-block"
                    onMouseEnter={(e) => openStatusMenu(e, item.bookingId)}
                    onMouseLeave={scheduleCloseStatusMenu}
                  >
                    <span
                      title="Hover to change status"
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer select-none ${
                        STATUS_BADGE[item.status] || "bg-gray-100 text-gray-600"
                      } ${
                        statusSaving && statusMenu?.bookingId === item.bookingId ? "opacity-60" : ""
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </td>
                <td className="py-5">
                  <div className="flex items-center gap-4 text-gray-500">
                    <FiEye
                      size={18}
                      title="View details"
                      onClick={() => router.push(`/bookingdetails?id=${item.bookingId}`)}
                      className="cursor-pointer hover:text-[#6C63FF] transition"
                    />
                    <FiEdit2
                      size={16}
                      title="Edit booking"
                      onClick={() => setEditingBooking(item)}
                      className="cursor-pointer hover:text-[#6C63FF] transition"
                    />
                    {/* Photographer → Customer: free wa.me chat link. */}
                    {whatsAppLink(item.phone) && (
                      <a
                        href={whatsAppLink(
                          item.phone,
                          `Hi ${item.clientName || ""}, regarding your ${item.eventType || "event"} booking (${item.bookingId}).`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Chat on WhatsApp"
                        aria-label="Chat on WhatsApp"
                        className="cursor-pointer hover:text-[#25D366] transition"
                      >
                        <FaWhatsapp size={18} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <p className="text-sm text-gray-500">
            Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {pageWindow.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-4 py-1.5 rounded-lg text-sm border border-gray-300 ${
                  n === currentPage ? "bg-indigo-500 text-white" : "text-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editingBooking && (
        <Model
          type="editBooking"
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSaved={fetchData}
        />
      )}

      {statusMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          style={{ top: statusMenu.top, left: statusMenu.left }}
          onMouseEnter={cancelCloseStatusMenu}
          onMouseLeave={scheduleCloseStatusMenu}
        >
          {STATUS_OPTIONS.map((status) => {
            const isCurrent =
              bookings.find((b) => b.bookingId === statusMenu.bookingId)?.status === status;
            return (
              <button
                key={status}
                disabled={statusSaving}
                onClick={() => handleStatusSelect(statusMenu.bookingId, status)}
                className="w-full flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed"
              >
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_BADGE[status] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {status}
                </span>
                {isCurrent && <FiCheck className="text-[#6C63FF] text-sm shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
