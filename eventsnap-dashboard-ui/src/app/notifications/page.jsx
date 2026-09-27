"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiDollarSign, FiAlertCircle, FiCalendar, FiCamera, FiCheckCircle, FiMail } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { viewBookings } from "@/api/bookingApi";
import { getGalleries } from "@/api/galleryApi";
import { viewInquiries } from "@/api/inquiryApi";
import { buildNotifications, getReadIds, persistReadIds } from "@/lib/notifications";
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

  const fetchData = useCallback(async () => {
    try {
      // Inquiries are fetched on their own so a failure there never blanks
      // the booking/payment/gallery feed (same data the Navbar bell counts).
      const [bRes, gRes, iRes] = await Promise.all([
        viewBookings(),
        getGalleries(),
        viewInquiries().catch(() => null),
      ]);
      setBookings(bRes.data?.bookings ?? []);
      setGalleries(gRes.data?.galleries ?? []);
      setInquiries(iRes?.data?.inquiries ?? []);
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
    window.addEventListener("eventsnap-user-updated", syncUser);
    return () => {
      window.removeEventListener("eventsnap-bookings-updated", refetch);
      window.removeEventListener("eventsnap-gallery-updated", refetch);
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
  }, [activeTab]);

  const shown = filteredNotifications.slice(0, visible);

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
        <div className="flex gap-3 mb-6 p-4 py-6 border border-gray-300 rounded-xl ">
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

        <div className="space-y-4">
          {filteredNotifications.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-10">No notifications</p>
          )}
          {shown.map((notification) => {
            const isRead = readIds.includes(notification.id);
            return (
              <div
                key={notification.id}
                className="flex items-start justify-between p-4 py-6 border border-gray-300 rounded-xl hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start gap-3 pb-4">
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
