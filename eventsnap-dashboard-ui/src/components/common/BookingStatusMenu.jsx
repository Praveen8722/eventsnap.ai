"use client";

// Shared inline status editor for booking tables (Bookings page + Dashboard
// "Recent Bookings"). Hovering a status pill opens a floating menu with every
// Booking status; picking one saves it via updateBooking({ status }) and
// broadcasts "eventsnap-bookings-updated" so every other view resyncs.

import { useEffect, useRef, useState } from "react";
import { FiCheck } from "react-icons/fi";
import { updateBooking } from "@/api/bookingApi";

// Status pill colours — one distinct colour per Booking status.
export const STATUS_BADGE = {
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
export const STATUS_OPTIONS = [
  "Inquiry",
  "Confirmed",
  "In Progress",
  "Editing",
  "Ready for Delivery",
  "Delivered",
  "Cancelled",
];

// `bookings` is the list the table renders; `onStatusChanged(bookingId,
// nextStatus)` runs after a successful save so the caller can update its own
// state for just that row.
export function useBookingStatusMenu(bookings, onStatusChanged) {
  // Which row's menu is open (anchored to its pill) and whether a status
  // update is in flight.
  const [statusMenu, setStatusMenu] = useState(null); // { bookingId, top, left }
  const [statusSaving, setStatusSaving] = useState(false);
  const statusCloseTimer = useRef(null);

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
      onStatusChanged(bookingId, nextStatus);
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

  const statusMenuElement = statusMenu && (
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
  );

  return {
    statusMenu,
    statusSaving,
    openStatusMenu,
    scheduleCloseStatusMenu,
    statusMenuElement,
  };
}
