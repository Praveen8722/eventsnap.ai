"use client";

import { useEffect, useState } from "react";
import Link from "@/components/common/AppLink";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  HiOutlineCalendar,
  HiCamera,
  HiOutlineClock,
  HiOutlineCheckCircle,     
  HiOutlineExclamationCircle,       
  HiOutlinePlus, 
  HiOutlineDocumentText,
  HiOutlineUpload,
} from "react-icons/hi";
import { LuDollarSign } from "react-icons/lu";
import { IoArrowForward } from "react-icons/io5";
import { isLoggedIn } from "@/lib/session";
import { viewBookings } from "@/api/bookingApi";
import { STATUS_BADGE, useBookingStatusMenu } from "@/components/common/BookingStatusMenu";
              
const Model = dynamic(() => import("@/components/ui/Model"));
                         
     
const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatAmount = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return value || "₹0";
  }
  return `₹${numericValue.toLocaleString("en-IN")}`;
};

// Short "Mon D" label for the Upcoming Shoots date badge.
const formatShootDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

// "HH:MM" -> "3:00 PM" for the Upcoming Shoots time line.
const formatShootTime = (value) => {
  if (!value) return "";
  const [h, m] = String(value).split(":").map(Number);
  if (Number.isNaN(h)) return value;
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m || 0).padStart(2, "0")} ${ampm}`;
};

// Same localStorage "user" record Navbar reads (see
// src/components/common/layout/Navbar.jsx's getStoredUser) — populated by
// src/lib/session.js's establishSession() from GET /api/auth/dashboard.
const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

// Future (today or later) and not cancelled.
const isUpcomingShoot = (booking) => {
  const eventDate = new Date(booking.eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    booking.status !== "Cancelled" &&
    !Number.isNaN(eventDate.getTime()) &&
    eventDate >= today
  );
};

const Home = () => {
  const router = useRouter();
  const [modalType, setModalType] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    syncUser();
    window.addEventListener("eventsnap-user-updated", syncUser);
    return () => window.removeEventListener("eventsnap-user-updated", syncUser);
  }, []);

  const normalizeBookings = (bookings = []) =>
    bookings.map((booking) => {
      const price = Number(booking.packegPrice) || 0;
      const advance = Number(booking.advancePayment) || 0;
      const extra = (booking.payments || []).reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0
      );
      const totalPaid = advance + extra;
      const remaining = Math.max(price - totalPaid, 0);
      return {
        ...booking,
        price,
        totalPaid,
        remaining,
      };
    });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await viewBookings();
        const bookings = normalizeBookings(response.data?.bookings ?? []);
        const sortedBookings = [...bookings].sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setAllBookings(bookings);
        // Dashboard shows only the latest 8; "View All" links to the full list.
        setRecentBookings(sortedBookings.slice(0, 8));
      } catch (error) {
        console.error("Failed to load dashboard bookings", error);
        setAllBookings([]);
        setRecentBookings([]);
      }
    };
    fetchDashboardData();
    const refreshTimer = setInterval(fetchDashboardData, 15000);
    const handleBookingsUpdated = () => fetchDashboardData();
    window.addEventListener("eventsnap-bookings-updated", handleBookingsUpdated);
    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener("eventsnap-bookings-updated", handleBookingsUpdated);
    };
  }, []);

  // Inline status editor — same hover menu + updateBooking logic as the
  // Bookings page. The saved status is applied to both lists locally so the
  // stat cards update immediately; the shared "eventsnap-bookings-updated"
  // event then refetches from the server.
  const { statusMenu, statusSaving, openStatusMenu, scheduleCloseStatusMenu, statusMenuElement } =
    useBookingStatusMenu(recentBookings, (bookingId, nextStatus) => {
      const applyStatus = (list) =>
        list.map((b) => (b.bookingId === bookingId ? { ...b, status: nextStatus } : b));
      setAllBookings(applyStatus);
      setRecentBookings(applyStatus);
    });

  const totalBookings = allBookings.length;
  const upcomingShootsList = allBookings.filter(isUpcomingShoot).sort((a, b) => {
    const dateDiff = new Date(a.eventDate) - new Date(b.eventDate);
    if (dateDiff !== 0) return dateDiff;
    return String(a.eventTime || "").localeCompare(String(b.eventTime || ""));
  });
  const upcomingShoots = upcomingShootsList.length;
  const pendingWork = allBookings.filter(
    (booking) => booking.status !== "Delivered" && booking.status !== "Cancelled"
  ).length;
  const completedWork = allBookings.filter((booking) => booking.status === "Delivered").length;
  const paymentsCollected = allBookings.reduce(
    (sum, booking) => sum + (Number(booking.totalPaid) || 0),
    0
  );
  const paymentsPending = allBookings.reduce(
    (sum, booking) => sum + (Number(booking.remaining) || 0),
    0
  );

  // ── Trend for each stat card = how the card's own (cumulative, all-time)
  // figure has grown since the end of last month, from this user's own bookings
  // only. Comparing the current total against the total that already existed at
  // the end of last month keeps the % consistent with the number above it: a
  // booking made last month and unchanged since reads 0%, not -100%. "—" (not a
  // fabricated percentage) when there is no prior figure to compare against —
  // e.g. a brand new account, or the first booking of this month.
  const now = new Date();
  // Last moment of the previous calendar month (day 0 of this month).
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  // Bookings that already existed at the end of last month — the prior baseline.
  const priorBookings = allBookings.filter((b) => {
    const created = new Date(b.createdAt);
    return !Number.isNaN(created.getTime()) && created <= endOfLastMonth;
  });
  const sumPaid = (list) => list.reduce((sum, b) => sum + (Number(b.totalPaid) || 0), 0);
  const sumRemaining = (list) => list.reduce((sum, b) => sum + (Number(b.remaining) || 0), 0);
  const countPending = (list) =>
    list.filter((b) => b.status !== "Delivered" && b.status !== "Cancelled").length;
  const countCompleted = (list) => list.filter((b) => b.status === "Delivered").length;
  const countUpcoming = (list) => list.filter(isUpcomingShoot).length;
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
  const totalBookingsTrend = trend(totalBookings, priorBookings.length);
  const upcomingShootsTrend = trend(upcomingShoots, countUpcoming(priorBookings));
  const pendingWorkTrend = trend(pendingWork, countPending(priorBookings));
  const completedWorkTrend = trend(completedWork, countCompleted(priorBookings));
  const paymentsCollectedTrend = trend(paymentsCollected, sumPaid(priorBookings));
  const paymentsPendingTrend = trend(paymentsPending, sumRemaining(priorBookings));

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hi {currentUser?.name || ""}</h1>
          <h1 className="text-gray-600">
            Welcome to{" "}
            <span className="text-[#FF5555]">
              Event<span className="text-blue-600">Snap.AI </span>
            </span>
            dashboard{" "}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Total Bookings
            <div className="w-12 h-12 bg-[#3A7BFF] rounded-xl flex items-center justify-center">
              <HiOutlineCalendar className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{totalBookings}</h2>
          <p className={`text-sm inline-block py-1 px-2.5 ${TREND_CLASSES[totalBookingsTrend.tone]}`}>
            {totalBookingsTrend.text}
          </p>
        </Link>

        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Upcoming Shoots
            <div className="w-12 h-12 rounded-xl bg-[#6A5CFF] flex items-center justify-center">
              <HiCamera className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{upcomingShoots}</h2>
          <p className={`text-sm inline-block py-1 px-2.5 ${TREND_CLASSES[upcomingShootsTrend.tone]}`}>
            {upcomingShootsTrend.text}
          </p>
        </Link>

        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Pending Work
            <div className="w-12 h-12 rounded-xl bg-[#FF7A1A] flex items-center justify-center">
              <HiOutlineClock className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{pendingWork}</h2>
          <p className={`text-sm inline-block py-1 px-2.5 ${TREND_CLASSES[pendingWorkTrend.tone]}`}>
            {pendingWorkTrend.text}
          </p>
        </Link>

        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Completed Work
            <div className="w-12 h-12 rounded-xl bg-[#22C55E] flex items-center justify-center">
              <HiOutlineCheckCircle className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{completedWork}</h2>
          <p className={`text-sm inline-block py-1 px-2.5 ${TREND_CLASSES[completedWorkTrend.tone]}`}>
            {completedWorkTrend.text}
          </p>
        </Link>

        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Payments Collected
            <div className="w-12 h-12 rounded-xl bg-[#22cb60] flex items-center justify-center">
              <LuDollarSign className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{formatAmount(paymentsCollected)}</h2>
          <p className={`text-sm inline-block py-1 px-2.5 ${TREND_CLASSES[paymentsCollectedTrend.tone]}`}>
            {paymentsCollectedTrend.text}
          </p>
        </Link>

        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Payments Pending
            <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center">
              <HiOutlineExclamationCircle className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{formatAmount(paymentsPending)}</h2>
          <p className={`text-sm inline-block py-1 px-2.5 ${TREND_CLASSES[paymentsPendingTrend.tone]}`}>
            {paymentsPendingTrend.text}
          </p>
        </Link>
      </div>

      <div className="p-6 bg-white rounded-xl shadow-sm border-2 border-gray-200 mt-6 cursor-pointer dashboard-card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setModalType("newBooking")}
            className="flex items-center gap-3 bg-[#635BFF] text-white py-4 px-6 rounded-lg w-full"
          >
            <HiOutlinePlus className="text-2xl" />
            <span className="text-base font-semibold">Add Booking</span>
          </button>
          <button
            type="button"
            onClick={() => setModalType("invoice")}
            className="flex items-center gap-3 bg-[#F15B4A] text-white py-4 px-6 rounded-lg w-full"
          >
            <HiOutlineDocumentText className="text-2xl" />
            <span className="text-base font-semibold">Create Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => setModalType("gallery")}
            className="flex items-center gap-3 bg-[#A23EFF] text-white py-4 px-6 rounded-lg w-full"
          >
            <HiOutlineUpload className="text-2xl" />
            <span className="text-base font-semibold">Upload Gallery</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 ">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 cursor-pointer dashboard-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Bookings</h2>
            <Link
              href="/bookings"
              className="text-sm font-bold text-blue-600 hover:underline flex justify-between items-center gap-1"
            >
              View All
              <IoArrowForward />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="py-2 text-left">Client</th>
                <th className="py-2 text-left">Event</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((item, index) => (
                <tr key={item.bookingId || index} className="border-t border-gray-200">
                  <td className="py-5 font-medium text-gray-700">{item.clientName}</td>
                  <td className="py-5 text-gray-600">{item.eventType}</td>
                  <td className="py-5 text-gray-600">{formatDate(item.eventDate)}</td>
                  <td className="py-5">
                    <div
                      className="relative inline-block"
                      onMouseEnter={(e) => openStatusMenu(e, item.bookingId)}
                      onMouseLeave={scheduleCloseStatusMenu}
                    >
                      <span
                        title="Hover to change status"
                        className={`px-3 py-1 rounded-full text-xs cursor-pointer select-none ${
                          STATUS_BADGE[item.status] || "bg-gray-100 text-gray-600"
                        } ${
                          statusSaving && statusMenu?.bookingId === item.bookingId ? "opacity-60" : ""
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 text-gray-700">{formatAmount(item.packegPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 cursor-pointer dashboard-card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Shoots</h2>
          <div className="flex flex-col gap-4">
            {upcomingShootsList.length === 0 && (
              <p className="text-sm text-gray-400">No upcoming shoots</p>
            )}
            {upcomingShootsList.slice(0, 5).map((shoot, index) => (
              <div
                key={shoot.bookingId || index}
                className="flex items-start gap-4 bg-gray-100 p-4 rounded-xl"
              >
                <div className="bg-[#6B5BFF] text-white rounded-lg px-4 py-2 text-center">
                  <p className="text-sm font-semibold">{formatShootDay(shoot.eventDate)}</p>
                </div>
                <div>
                  <p className="text-gray-600  font-semibold ">
                    {shoot.eventType} - {shoot.clientName}
                  </p>
                  {shoot.eventTime && (
                    <p className="text-gray-600 text-sm">{formatShootTime(shoot.eventTime)}</p>
                  )}
                  <p className="text-gray-500 text-sm">{formatDate(shoot.eventDate)}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push("/scheduling")}
            className="mt-5 w-full py-3 border rounded-lg text-gray-600 font-semibold cursor-pointer hover:text-[#6C63FF] hover:bg-gray-100 transition"
          >
            View Calendar
          </button>
        </div>
      </div>

      {modalType && <Model type={modalType} onClose={() => setModalType(null)} />}
      {statusMenuElement}
    </div>
  );
};

/* Card */
/* <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        <Link
          href="#"
          className="p-4 border-2 border-gray-200 rounded-xl bg-white w-full h-[20rem] flex flex-col justify-between cursor-pointer dashboard-card"
        >
          <div>
            <div className="flex justify-between font-semibold text-gray-700">
              Client Attendance
              <IoIosArrowForward className="text-xl" />
            </div>
            <p className="text-xs text-gray-400">NA</p>
          </div>
            <div className="flex flex-col items-center mt-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-[10px] border-gray-200" />
              <span className="absolute text-3xl font-bold">0%</span>
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full" />
            </div>
          </div>
            <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <p className="text-xs text-gray-600">Present</p>
              </div>
              <span className="text-xs font-semibold text-pink-500">0</span>
            </div>
            <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <p className="text-xs text-gray-600">Expected</p>
              </div>
              <span className="text-xs font-semibold">0</span>
            </div>
          </div>
        </Link>
          <div className="p-4 border-2 border-gray-200 rounded-xl w-full h-[20rem] flex flex-col justify-between cursor-pointer dashboard-card">
          <div>
            <div className="flex justify-between font-semibold text-gray-700">
              About to Expire
            </div>
            <p className="text-xs text-gray-400">November 2025</p>
          </div>
          <div className="flex flex-col items-center">
            <span>No members found</span>
          </div>
          <Link
            href="#"
            className="flex items-center justify-center gap-1 text-blue-500 text-xs font-bold"
          >
            View More
            <FaArrowRightLong />
          </Link>
        </div>
          <div className="p-4 border-2 border-gray-200 rounded-xl w-full h-[20rem] flex flex-col justify-between cursor-pointer dashboard-card">
          <div>
            <div className="flex justify-between font-semibold text-gray-700">
              Expired
            </div>
            <p className="text-xs text-gray-400">November 2025</p>
          </div>
          <div className="flex flex-col items-center">
            <span>No members found</span>
          </div>
          <Link
            href="#"
            className="flex items-center justify-center gap-1 text-blue-500 text-xs font-bold"
          >
            View More
            <FaArrowRightLong />
          </Link>
        </div>
      </div> */

export default function DashboardPage() {
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

  if (!authChecked) return null;
  return <Home />;
}
