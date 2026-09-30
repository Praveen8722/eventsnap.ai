"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiDollarSign, FiAlertCircle, FiCalendar, FiCamera, FiCheckCircle, FiMail, FiTrash2 } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { viewBookings } from "@/api/bookingApi";
import { getGalleries } from "@/api/galleryApi";
import { viewInquiries } from "@/api/inquiryApi";
import { dismissNotifications } from "@/api/authApi";
import {
  buildNotifications,
  getReadIds,
  persistReadIds,
  requestBellRefresh,
} from "@/lib/notifications";
import { isLoggedIn } from "@/lib/session";
import { whatsAppLink } from "@/lib/whatsapp";

const tabs = ["All", "Unread", "Payments", "Bookings", "Reminders"];
const PAGE_SIZE = 8;

const timeAgo = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const ms = d.getTime() - Date.now();
  const future = ms > 0;
  const abs = Math.abs(ms);
  const table = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
  ];
  for (const [label, size] of table) {
    if (abs >= size) {
      const n = Math.round(abs / size);
      const unit = `${n} ${label}${n === 1 ? "" : "s"}`;
      return future ? `in ${unit}` : `${unit} ago`;
    }
  }
  return future ? "soon" : "just now";
};

// Same icon markup as the original static design, keyed by tone.
const ICONS = {
  paymentUp: <FiDollarSign className="text-green-500 p-3 rounded-xl bg-green-100 " size={50} />,
  paymentDown: <FiAlertCircle className="text-red-500 p-3 rounded-xl bg-red-100" size={50} />,
  reminder: <FiCalendar className="text-orange-500 p-3 rounded-xl bg-orange-100" size={50} />,
  booking: <FiCamera className="text-purple-500 p-3 rounded-xl bg-purple-100" size={50} />,
  gallery: <FiCheckCircle className="text-blue-500 p-3 rounded-xl bg-blue-100" size={50} />,
  contact: <FiMail className="text-pink-500 p-3 rounded-xl bg-pink-100" size={50} />,
};

export default function NotificationsPage() {
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

  const [activeTab, setActiveTab] = useState("All");
  const [bookings, setBookings] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [user, setUser] = useState(null);
  const [readIds, setReadIds] = useState([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  // Ids selected for deletion, and whether a delete is in flight.
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Inquiries are fetched on their own so a failure there never blanks
      // the booking/payment/gallery feed (same data the Navbar bell counts).
      const [bRes, gRes, iRes] = await Promise.all([
        viewBookings(),
        getGalleries(),
        viewInquiries().catch(() => null),
      ]);
      const nextBookings = bRes.data?.bookings ?? [];
      const nextGalleries = gRes.data?.galleries ?? [];
      const nextInquiries = iRes?.data?.inquiries ?? [];
      setBookings(nextBookings);
      setGalleries(nextGalleries);
      setInquiries(nextInquiries);

      // Viewing this page marks everything in the loaded feed as read — saved
      // in this user's own read set (so it survives refresh / logout / login),
      // which also clears the Navbar bell count via READ_EVENT.
      let storedUser = null;
      try {
        storedUser = JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        /* no user — buildNotifications returns nothing */
      }
      const ids = buildNotifications(nextBookings, nextGalleries, storedUser, nextInquiries).map((n) => n.id);
      const read = getReadIds();
      if (ids.some((id) => !read.includes(id))) {
        const merged = Array.from(new Set([...read, ...ids]));
        setReadIds(merged);
        persistReadIds(merged);
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadIds(getReadIds());
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    } catch {
      setUser(null);
    }
    fetchData();
    // Let the Navbar bell recount now that the page is open.
    requestBellRefresh();
  }, [fetchData]);

  // Stay current with changes made elsewhere in the app (Booking / Payment /
  // Gallery flows refetch; Profile flow updates from its event detail).
  useEffect(() => {
    const refetch = () => fetchData();
    const syncUser = (e) => {
      if (e?.detail !== undefined) {
        setUser(e.detail);
        return;
      }
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("eventsnap-bookings-updated", refetch);
    window.addEventListener("eventsnap-gallery-updated", refetch);
    // New portfolio bookings / enquiries arrive from outside this tab —
    // pick them up when the photographer comes back to it.
    window.addEventListener("focus", refetch);
    window.addEventListener("eventsnap-user-updated", syncUser);
    return () => {
      window.removeEventListener("eventsnap-bookings-updated", refetch);
      window.removeEventListener("eventsnap-gallery-updated", refetch);
      window.removeEventListener("focus", refetch);
      window.removeEventListener("eventsnap-user-updated", syncUser);
    };
  }, [fetchData]);

  const allNotifications = useMemo(
    () => buildNotifications(bookings, galleries, user, inquiries),
    [bookings, galleries, user, inquiries]
  );

  const persistRead = (ids) => {
    setReadIds(ids);
    persistReadIds(ids);
  };

  const markRead = (id) => {
    if (readIds.includes(id)) return;
    persistRead([...readIds, id]);
  };

  const markAllRead = () => {
    persistRead(Array.from(new Set([...readIds, ...allNotifications.map((n) => n.id)])));
  };

  const unreadCount = allNotifications.filter((n) => !readIds.includes(n.id)).length;

  const filteredNotifications = allNotifications.filter((n) => {
    if (activeTab === "Unread") return !readIds.includes(n.id);
    if (activeTab === "Payments") return n.type === "payment";
    if (activeTab === "Bookings") return n.type === "booking";
    if (activeTab === "Reminders") return n.type === "reminder";
    return true;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(PAGE_SIZE);
    setSelected([]); // selection never carries across tabs
  }, [activeTab]);

  const shown = filteredNotifications.slice(0, visible);

  // Selection + delete. Select All covers the notifications currently on
  // screen; a selected id that scrolls out of view (tab/filter change) is
  // ignored. Deleting records the ids as dismissed on the signed-in user's
  // own record (server-side) — it never touches the underlying booking /
  // gallery / inquiry — then the feed is re-derived without them.
  const shownIds = shown.map((n) => n.id);
  const selectedShown = selected.filter((id) => shownIds.includes(id));
  const allSelected = shownIds.length > 0 && selectedShown.length === shownIds.length;

  const toggleSelect = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = () => setSelected(allSelected ? [] : shownIds);

  const applyDismiss = async (ids) => {
    if (!ids.length || deleting) return;
    setDeleting(true);
    try {
      const res = await dismissNotifications(ids);
      const merged =
        res.data?.dismissedNotifications ??
        Array.from(new Set([...(user?.dismissedNotifications || []), ...ids]));
      // Persist onto the stored user so both this page and the Navbar bell
      // exclude them (the bell rebuilds its feed from the stored user).
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null") || {};
        localStorage.setItem("user", JSON.stringify({ ...stored, dismissedNotifications: merged }));
      } catch {
        /* ignore storage errors */
      }
      setUser((prev) => ({ ...(prev || {}), dismissedNotifications: merged }));
      setSelected([]);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete notification");
    } finally {
      setDeleting(false);
      requestBellRefresh();
    }
  };

  const handleDeleteOne = (id) => {
    if (deleting) return;
    if (!window.confirm("Delete this notification? This can't be undone.")) return;
    applyDismiss([id]);
  };

  const handleDeleteSelected = () => {
    if (deleting || selectedShown.length === 0) return;
    const n = selectedShown.length;
    if (!window.confirm(`Delete ${n} selected notification${n === 1 ? "" : "s"}? This can't be undone.`)) return;
    applyDismiss(selectedShown);
  };

  if (!authChecked) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-gray-500 text-sm mt-2">
            You have {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex  gap-2">
          <button onClick={markAllRead} className=" text-sm font-semibold text-[#6C63FF] hover:underline">
            Mark all as read
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex gap-3 mb-6 p-4 py-6 border border-gray-300 rounded-xl cursor-pointer dashboard-card">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                activeTab === tab ? "bg-[#6C63FF] text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {shown.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                aria-label="Select all notifications"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selectedShown.length > 0 && !allSelected;
                }}
                onChange={toggleSelectAll}
                disabled={deleting}
                className="accent-[#6C63FF] cursor-pointer"
              />
              Select all
              {selectedShown.length > 0 && (
                <span className="text-gray-400">({selectedShown.length} selected)</span>
              )}
            </label>
            {selectedShown.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex items-center gap-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FiTrash2 size={14} />
                {deleting ? "Deleting..." : `Delete Selected (${selectedShown.length})`}
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          {filteredNotifications.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-10">No notifications</p>
          )}
          {shown.map((notification) => {
            const isRead = readIds.includes(notification.id);
            return (
              <div
                key={notification.id}
                className="flex items-start justify-between p-4 py-6 border border-gray-300 rounded-xl hover:shadow-md transition-shadow bg-white cursor-pointer dashboard-card"
              >
                <div className="flex items-start gap-3 pb-4">
                  <input
                    type="checkbox"
                    aria-label={`Select notification: ${notification.title}`}
                    checked={selected.includes(notification.id)}
                    onChange={() => toggleSelect(notification.id)}
                    disabled={deleting}
                    className="mt-3 accent-[#6C63FF] cursor-pointer"
                  />
                  <div className="mt-1 ">{ICONS[notification.tone]}</div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{notification.title}</h3>
                    <p className="text-gray-500 text-sm mt-2">{notification.description}</p>
                    {notification.type === "contact" && notification.data && (
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <p><span className="text-gray-400">Name:</span> {notification.data.name}</p>
                        <p>
                          <span className="text-gray-400">Email:</span>{" "}
                          <a href={`mailto:${notification.data.email}`} className="text-[#6C63FF] hover:underline">
                            {notification.data.email}
                          </a>
                        </p>
                        {notification.data.phone && (
                          <p className="flex items-center gap-2">
                            <span className="text-gray-400">Phone:</span> {notification.data.phone}
                            {whatsAppLink(notification.data.phone) && (
                              <a
                                href={whatsAppLink(
                                  notification.data.phone,
                                  `Hi ${notification.data.name || ""}, thanks for your enquiry${
                                    notification.data.eventType ? ` about ${notification.data.eventType}` : ""
                                  }.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Reply on WhatsApp"
                                aria-label="Reply on WhatsApp"
                                className="text-[#25D366] hover:opacity-80"
                              >
                                <FaWhatsapp size={16} />
                              </a>
                            )}
                          </p>
                        )}
                        {notification.data.eventType && (
                          <p><span className="text-gray-400">Event Type:</span> {notification.data.eventType}</p>
                        )}
                        {notification.data.message && (
                          <p className="whitespace-pre-wrap">
                            <span className="text-gray-400">Message:</span> {notification.data.message}
                          </p>
                        )}
                      </div>
                    )}
                    <span className="text-gray-400 text-xs">{timeAgo(notification.timestamp)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isRead ? (
                    <span className="text-sm text-gray-300">Read</span>
                  ) : (
                    <button
                      onClick={() => markRead(notification.id)}
                      className="text-sm text-gray-400 hover:text-purple-500"
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteOne(notification.id)}
                    disabled={deleting}
                    title="Delete notification"
                    aria-label={`Delete notification: ${notification.title}`}
                    className="text-gray-400 hover:text-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredNotifications.length > visible && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="px-6 py-2  border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Load More Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
