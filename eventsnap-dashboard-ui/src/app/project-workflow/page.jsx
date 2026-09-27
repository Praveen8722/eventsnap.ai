"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BiGridVertical } from "react-icons/bi";
import { MdOutlineDateRange } from "react-icons/md";
import { isLoggedIn } from "@/lib/session";
import { viewBookings } from "@/api/bookingApi";

// The board columns are the Booking status flow (Cancelled is not a stage).
// Colours/headers are kept exactly as the original static design.
const COLUMNS = [
  {
    title: "Inquiry",
    color: "border-gray-300",
    headerColor: "bg-gray-500 border-b-2 bodrer-b-gray-600",
  },
  {
    title: "Confirmed",
    color: "border-gray-300",
    headerColor: "bg-blue-500 border-b-2 border-b-blue-600",
  },
  {
    title: "In Progress",
    color: " border-gray-300",
    headerColor: "bg-yellow-500 border-b-2 border-b-yellow-600",
  },
  {
    title: "Editing",
    color: "border-gray-300",
    headerColor: "bg-orange-500 border-b-2 border-b-orange-600",
  },
  {
    title: "Ready for Delivery",
    color: "border-gray-300",
    headerColor: "bg-purple-500 border-b-2 border-b-purple-600",
  },
  {
    title: "Delivered",
    color: "border-gray-300",
    headerColor: "bg-green-500 border-b-2 border-b-green-600",
  },
];

// Statuses counted as "active" — everything on the board except Delivered.
const ACTIVE_STATUSES = COLUMNS.map((c) => c.title).filter((t) => t !== "Delivered");

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB");
};

const fmtPrice = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

// Payment progress = total paid / package price.
const paymentProgress = (b) => {
  const total = Number(b.bookingTotal ?? b.packegPrice) || 0;
  const paid = Number(b.totalPaid) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((paid / total) * 100)));
};

const isThisMonth = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

// Delivered this month — dated from the "Delivered" status-history entry,
// falling back to the record's last update.
const deliveredThisMonth = (b) => {
  if (b.status !== "Delivered") return false;
  const hit = (b.statusHistory || []).find((h) => h.status === "Delivered");
  return isThisMonth(hit?.date || b.updatedAt);
};

export default function ProjectWorkflowPage() {
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

  const [bookings, setBookings] = useState([]);
  const fetchData = useCallback(async () => {
    try {
      const res = await viewBookings();
      setBookings(res.data?.bookings ?? []);
    } catch (error) {
      console.error("Failed to load project workflow", error);
    }
  }, []);

  // Fetch once, then refresh whenever a booking changes elsewhere in the app
  // (e.g. the inline status editor on the Bookings page).
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener("eventsnap-bookings-updated", handler);
    return () => window.removeEventListener("eventsnap-bookings-updated", handler);
  }, [fetchData]);

  // Group bookings into the board columns by status.
  const columns = COLUMNS.map((col) => {
    const cards = bookings
      .filter((b) => b.status === col.title)
      .sort((a, b) => new Date(a.eventDate || 0) - new Date(b.eventDate || 0))
      .map((b) => ({
        name: b.clientName,
        type: b.eventType,
        date: fmtDate(b.eventDate),
        package: b.packageSelected,
        price: fmtPrice(b.bookingTotal ?? b.packegPrice),
        progress: paymentProgress(b),
        code: b.bookingId,
      }));
    return {
      ...col,
      count: cards.length,
      cards,
    };
  });

  const activeProjects = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const inEditing = bookings.filter((b) => b.status === "Editing").length;
  const deliveredCount = bookings.filter(deliveredThisMonth).length;

  if (!authChecked) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Project Workflow</h1>
          <p className="text-gray-500 text-sm mt-2">Track your projects through every stage</p>
        </div>
        <div className="flex  gap-2">
          <button className=" px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 flex items-center gap-2">
            <MdOutlineDateRange className="text-xl" />
            Filter by Date
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Active Projectss
            <div className="w-12 h-12 bg-[#3A7BFF] rounded-xl flex items-center justify-center">
              <BiGridVertical className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{activeProjects}</h2>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            In Editing
            <div className="w-12 h-12 rounded-xl bg-[#FF6A00] flex items-center justify-center">
              <BiGridVertical className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{inEditing}</h2>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Delivered This Month
            <div className="w-12 h-12 rounded-xl bg-[#22C55E] flex items-center justify-center">
              <BiGridVertical className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{deliveredCount}</h2>
        </Link>
      </div>

      <div className="py-8  overflow-x-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 items-start">
          {columns.map((col, i) => (
            <div key={i} className={`border rounded-xl shadow-sm ${col.color}`}>
              <div className={`${col.headerColor} px-4 py-2 border-b flex justify-between items-center rounded-t-xl`}>
                <h3 className="text-white">{col.title}</h3>
                <span className="bg-white text-gray-500 px-2.5 py-0.5 rounded-lg text-sm border">{col.count}</span>
              </div>
              <div className="p-4 space-y-4">
                {col.cards.map((b, idx) => (
                  <Link
                    key={b.code || idx}
                    href={`/bookingdetails?id=${b.code}`}
                    className="block bg-white p-4 rounded-xl border shadow-sm border-gray-200"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-semibold">{b.name}</h4>
                        <p className="text-gray-500 text-sm mt-2">{b.type}</p>
                        <p className="text-gray-500 text-sm mt-1">{b.date}</p>
                      </div>
                      <span className="text-[10px] sm:text-xs bg-gray-100 rounded px-2 py-0.5 w-fit h-fit">{b.code}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-gray-600">{b.package}</span>
                      <span className="font-semibold text-indigo-600">{b.price}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">Payment Progress</p>
                      <p className="text-xs text-gray-500">{b.progress}%</p>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                      <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${b.progress}%` }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
