"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { IoMdAdd } from "react-icons/io";
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { IoTimeOutline, IoLocationOutline } from "react-icons/io5";
import { getEvents } from "@/api/eventApi";
import { viewBookings } from "@/api/bookingApi";
import { isLoggedIn } from "@/lib/session";

const Model = dynamic(() => import("@/components/ui/Model"));

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Calendar dot colour per event type — matches the "Event Types" legend.
const EVENT_TYPE_COLOR = {
  Wedding: "#ec4899",
  "Corporate Event": "#3b82f6",
  "Birthday Party": "#a855f7",
  "Portrait Session": "#22c55e",
  Engagement: "#ef4444",
};
const DEFAULT_COLOR = "#6C63FF";
const UPCOMING_PAGE_SIZE = 5;

const toISO = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = String(t).split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m || 0).padStart(2, "0")} ${ampm}`;
};

const fmtDate = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
};

export default function SchedulingPage() {
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

  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [presetDate, setPresetDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  // Day-of-month currently hovered on the calendar (for the events popover).
  const [hoveredDay, setHoveredDay] = useState(null);
  const [upcomingPage, setUpcomingPage] = useState(1);

  const fetchAll = useCallback(async () => {
    try {
      const [evRes, bkRes] = await Promise.all([getEvents(), viewBookings()]);
      setEvents(evRes.data?.events ?? []);
      setBookings(bkRes.data?.bookings ?? []);
    } catch (error) {
      console.error("Failed to load calendar data", error);
    }
  }, []);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchAll();
  }, [fetchAll]);

  // Keep the calendar in sync when a booking or event changes anywhere.
  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener("eventsnap-events-updated", handler);
    window.addEventListener("eventsnap-bookings-updated", handler);
    return () => {
      window.removeEventListener("eventsnap-events-updated", handler);
      window.removeEventListener("eventsnap-bookings-updated", handler);
    };
  }, [fetchAll]);

  const shiftMonth = (delta) =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ── Unified calendar items: every booking + every scheduled event ─────────
  const bookingItems = bookings
    .filter((b) => b.status !== "Cancelled" && b.eventDate)
    .map((b) => ({
      id: `b-${b._id || b.bookingId}`,
      date: b.eventDate,
      title: `${b.eventType || "Booking"} - ${b.clientName || ""}`.trim(),
      startTime: b.eventTime || "",
      endTime: "",
      location: b.eventLocation || "",
      customer: b.clientName || "",
      eventType: b.eventType || "",
      status: b.status || "",
      color: EVENT_TYPE_COLOR[b.eventType] || DEFAULT_COLOR,
      kind: "booking",
    }));
  const eventItems = events.map((ev) => ({
    id: `e-${ev._id}`,
    date: ev.date,
    title: ev.title,
    startTime: ev.startTime || "",
    endTime: ev.endTime || "",
    location: ev.location || "",
    customer: "",
    eventType: ev.type || "",
    status: "",
    color: ev.color || DEFAULT_COLOR,
    kind: "event",
  }));
  const items = [...bookingItems, ...eventItems];

  // day-of-month -> items falling on that day of the visible month
  const itemsByDay = {};
  for (const it of items) {
    const dt = new Date(it.date);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      (itemsByDay[dt.getDate()] ||= []).push(it);
    }
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const startOfToday = (() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  })();

  // All upcoming events (bookings + scheduled events), nearest first.
  const upcoming = [...items]
    .filter((it) => new Date(it.date) >= startOfToday)
    .sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date);
      if (diff !== 0) return diff;
      return String(a.startTime || "").localeCompare(String(b.startTime || ""));
    });

  // Paginate the upcoming list — 5 per page.
  const upcomingTotalPages = Math.max(1, Math.ceil(upcoming.length / UPCOMING_PAGE_SIZE));
  const upcomingCurrentPage = Math.min(upcomingPage, upcomingTotalPages);
  const upcomingStart = (upcomingCurrentPage - 1) * UPCOMING_PAGE_SIZE;
  const pagedUpcoming = upcoming.slice(upcomingStart, upcomingStart + UPCOMING_PAGE_SIZE);
  const upcomingWindow = (() => {
    const span = 4;
    let start = Math.max(1, upcomingCurrentPage - 1);
    const end = Math.min(upcomingTotalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  const openAddEvent = (date) => {
    setPresetDate(date);
    setOpenModal(true);
  };
  const closeModal = () => {
    setOpenModal(false);
    setPresetDate(null);
  };

  if (!authChecked) return null;

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Calendar &amp; Scheduling</h1>
          <p className="text-gray-500 text-sm">Manage your bookings and events</p>
        </div>
        <button
          onClick={() => openAddEvent(null)}
          className="text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2"
        >
          <IoMdAdd className="text-xl" />
          Add Event
        </button>
        {openModal && (
          <Model type="addevent" defaultDate={presetDate} onClose={closeModal} onSaved={fetchAll} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6 mt-8 ">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-8 mt-2 flex items-center justify-between">
            {monthLabel}
            <span className="flex items-center gap-6">
              <MdOutlineKeyboardArrowLeft
                onClick={() => shiftMonth(-1)}
                className="cursor-pointer border border-gray-300 p-1 rounded-md text-3xl"
              />
              <MdOutlineKeyboardArrowRight
                onClick={() => shiftMonth(1)}
                className="cursor-pointer border border-gray-300 p-1 rounded-md text-3xl"
              />
            </span>
          </h2>

          <div className="grid grid-cols-7 text-center text-gray-600 text-sm mb-4">
            {WEEK_DAYS.map((d) => (
              <p key={d}>{d}</p>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3 text-center">
            {cells.map((d, i) => {
              if (d === null) return <div key={i}></div>;
              const dayItems = itemsByDay[d] || [];
              const hasItems = dayItems.length > 0;
              return (
                <div
                  key={i}
                  onClick={() => openAddEvent(toISO(year, month, d))}
                  onMouseEnter={() => hasItems && setHoveredDay(d)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`border border-gray-300 rounded-xl py-14 relative cursor-pointer ${
                    hasItems ? "bg-blue-50" : ""
                  } ${hoveredDay === d ? "z-30" : ""}`}
                >
                  {d}
                  {hasItems && (
                    <span
                      className="w-2 h-2 rounded-full absolute bottom-2 left-1/2 -translate-x-1/2"
                      style={{ backgroundColor: dayItems[0].color || DEFAULT_COLOR }}
                    />
                  )}
                  {hasItems && hoveredDay === d && (
                    <div className="absolute z-30 left-1/2 -translate-x-1/2 top-8 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-left pointer-events-none">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        {new Date(year, month, d).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <div className="space-y-2">
                        {dayItems.map((it) => (
                          <div key={it.id} className="flex items-start gap-2">
                            <span
                              className="mt-1 w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: it.color || DEFAULT_COLOR }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{it.title}</p>
                              {it.startTime && (
                                <p className="text-[11px] text-gray-500">
                                  {formatTime(it.startTime)}
                                  {it.endTime ? ` - ${formatTime(it.endTime)}` : ""}
                                </p>
                              )}
                              {it.location ? (
                                <p className="text-[11px] text-gray-400 truncate">{it.location}</p>
                              ) : (
                                it.status && (
                                  <p className="text-[11px] text-gray-400 truncate">{it.status}</p>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6 pr-0 lg:pr-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-300">
            <h3 className="font-semibold text-lg mb-4">Upcoming Events </h3>
            <div className="space-y-4">
              {upcoming.length === 0 && (
                <p className="text-sm text-gray-400">No upcoming events</p>
              )}
              {pagedUpcoming.map((it) => (
                <div key={it.id} className="bg-gray-50 p-4 rounded-xl">
                  <p className="font-semibold text-[15px]">{it.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-gray-600 text-sm">
                    <IoTimeOutline className="text-lg" />
                    <p>
                      {it.startTime
                        ? `${formatTime(it.startTime)}${
                            it.endTime ? ` - ${formatTime(it.endTime)}` : ""
                          }`
                        : fmtDate(it.date)}
                    </p>
                  </div>
                  {it.location && (
                    <div className="flex items-center gap-2 mt-1 text-gray-600 text-sm">
                      <IoLocationOutline className="text-lg" />
                      <p>{it.location}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {upcomingTotalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setUpcomingPage(Math.max(1, upcomingCurrentPage - 1))}
                  disabled={upcomingCurrentPage === 1}
                  className="px-2.5 py-1 rounded-md text-xs border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {upcomingWindow.map((n) => (
                  <button
                    key={n}
                    onClick={() => setUpcomingPage(n)}
                    className={`px-2.5 py-1 rounded-md text-xs border border-gray-300 ${
                      n === upcomingCurrentPage ? "bg-indigo-500 text-white" : "text-gray-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setUpcomingPage(Math.min(upcomingTotalPages, upcomingCurrentPage + 1))
                  }
                  disabled={upcomingCurrentPage === upcomingTotalPages}
                  className="px-2.5 py-1 rounded-md text-xs border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-[#6C63FF] to-[#6C63FF]/80 p-6 rounded-xl shadow-sm text-white">
            <h3 className="font-semibold mb-8">Quick Schedule</h3>
            <p className="text-sm mb-4">Add a new event to your calendar</p>
            <button
              onClick={() => openAddEvent(null)}
              className="bg-white text-[#6C63FF] w-full py-2 rounded-lg font-semibold text-sm flex justify-center gap-2"
            >
              <IoMdAdd className="text-lg" />
              Schedule Event
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white mt-6 p-6 rounded-xl shadow-sm border border-gray-300">
        <h3 className="font-semibold mb-4">Event Types</h3>
        <div className="flex items-center flex-wrap gap-6">
          <p className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-pink-500"></span> Wedding
          </p>
          <p className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-blue-500"></span> Corporate Event
          </p>
          <p className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-purple-500"></span> Birthday Party
          </p>
          <p className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-green-500"></span> Portrait Session
          </p>
          <p className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-red-500"></span> Engagement
          </p>
        </div>
      </div>
    </div>
  );
}
