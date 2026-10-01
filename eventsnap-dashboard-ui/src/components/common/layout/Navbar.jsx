"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/components/common/AppLink";
import { useRouter } from "next/navigation";
import { HiOutlineSearch } from "react-icons/hi";
import { IoMdNotificationsOutline } from "react-icons/io";
import { IoSettingsOutline } from "react-icons/io5";
import { profilePhotoUrl } from "@/api/authApi";
import { clearSession, refreshSessionUser } from "@/lib/session";
import {
  loadNotifications,
  unreadCountFrom,
  READ_EVENT,
  REFRESH_EVENT,
} from "@/lib/notifications";

// Up to two initials ("Resp Studio" -> "RS"), used when there's no photo.
const initialsOf = (text) =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const Navbar = () => {
  const router = useRouter();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  // Photo URLs that failed to load — show the initials instead.
  const [failedPhotos, setFailedPhotos] = useState([]);
  const markFailed = (url) => setFailedPhotos((list) => (list.includes(url) ? list : [...list, url]));
  const navRef = useRef(null);
  const searchButtonRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    syncUser();
    window.addEventListener("eventsnap-user-updated", syncUser);
    // Then confirm against the backend (source of truth for name/photo).
    refreshSessionUser().catch(() => {});
    return () => {
      window.removeEventListener("eventsnap-user-updated", syncUser);
    };
  }, []);

  // Bell unread count — the same feed and per-user read set as the
  // Notifications page (lib/notifications.js). Reloads when data may have
  // changed (new booking/enquiry, window refocus, periodic) and recounts
  // instantly when notifications are marked read.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    let feed = [];
    const recount = () => active && setUnread(unreadCountFrom(feed));
    const reload = () =>
      loadNotifications()
        .then((next) => {
          feed = next;
          recount();
        })
        .catch(() => {});
    reload();
    const events = ["eventsnap-bookings-updated", "eventsnap-gallery-updated", REFRESH_EVENT, "focus"];
    events.forEach((name) => window.addEventListener(name, reload));
    window.addEventListener(READ_EVENT, recount);
    const timer = setInterval(reload, 60000);
    return () => {
      active = false;
      events.forEach((name) => window.removeEventListener(name, reload));
      window.removeEventListener(READ_EVENT, recount);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!showMobileSearch) return;
    const handlePointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) {
        setShowMobileSearch(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowMobileSearch(false);
        searchButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMobileSearch]);

  const photo = profilePhotoUrl(currentUser?.profilePhoto);
  const businessPhoto = profilePhotoUrl(currentUser?.businessPhoto);

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className="@container sticky top-0 z-30 -mt-6 w-full min-w-0 overflow-x-clip border-b border-gray-300 bg-white"
    >
      <div className="flex min-h-16 min-w-0 flex-nowrap items-center justify-between gap-2 py-2 pl-11 @min-[400px]:gap-3 md:pl-0">
        <div className="flex min-w-0 shrink items-center gap-2">
          <Link href="/dashboard" className="hidden min-w-0 shrink items-center gap-2 @min-[640px]:flex">
            {/* The signed-in photographer's own business photo, else initials. */}
            {businessPhoto && !failedPhotos.includes(businessPhoto) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessPhoto}
                alt=""
                onError={() => markFailed(businessPhoto)}
                className="w-7 h-7 @min-[768px]:w-9 @min-[768px]:h-9 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="w-7 h-7 @min-[768px]:w-9 @min-[768px]:h-9 shrink-0 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-[10px] @min-[768px]:text-xs font-bold text-white"
              >
                {initialsOf(currentUser?.businessName || currentUser?.name)}
              </span>
            )}
            <strong className="min-w-0 truncate text-sm @min-[768px]:text-base">
              {currentUser?.businessName || currentUser?.name || ""}
            </strong>
          </Link>
          <Link
            href="/dashboard"
            className="flex min-w-0 shrink items-center gap-1 text-base font-bold @min-[380px]:text-lg @min-[640px]:hidden"
          >
            <Image
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/eventsnaplogo.png`}
              alt=""
              width={556}
              height={500}
              sizes="40px"
              priority
              className="w-6 h-auto shrink-0 rounded-xl"
            />
            <span className="min-w-0 truncate text-[#FF5555]">
              Event<span className="text-blue-600">Snap</span><span className="text-black">.AI</span>
            </span>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center max-w-xl bg-gray-100 rounded-xl border border-gray-200 @min-[640px]:flex">
          <HiOutlineSearch aria-hidden="true" className="shrink-0 text-gray-500 text-xl mr-2" />
          <input
            type="text"
            aria-label="Search bookings, clients, invoices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings, clients, invoices..."
            className="w-full min-w-0 bg-transparent outline-none text-sm"
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 @min-[400px]:gap-3 @min-[640px]:gap-4 @min-[960px]:gap-6">
          <button
            ref={searchButtonRef}
            type="button"
            aria-label={showMobileSearch ? "Close search" : "Open search"}
            aria-expanded={showMobileSearch}
            aria-controls="navbar-mobile-search"
            onClick={() => setShowMobileSearch((open) => !open)}
            className="shrink-0 p-2 bg-gray-100 rounded-lg border border-gray-300 @min-[640px]:hidden"
          >
            <HiOutlineSearch className="text-gray-600 text-xl" />
          </button>

          <Link
            href="/notifications"
            aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
            className="relative flex shrink-0 items-center justify-center"
          >
            <IoMdNotificationsOutline aria-hidden="true" className="text-2xl" />
            {unread > 0 && (
              <span
                aria-hidden="true"
                data-testid="notification-badge"
                className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4 text-center"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>

          <Link href="/my-profile" aria-label="Settings" className="flex shrink-0 items-center justify-center">
            <IoSettingsOutline aria-hidden="true" className="text-xl" />
          </Link>

          <div
            ref={profileMenuRef}
            className="relative flex min-w-0 shrink-0 items-center @min-[640px]:border-l @min-[640px]:border-gray-300 @min-[640px]:pl-4"
          >
            <button
              type="button"
              aria-label={profileMenuOpen ? "Close profile menu" : "Open profile menu"}
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex min-w-0 shrink-0 items-center gap-2"
            >
              <p className="hidden min-w-0 max-w-48 truncate font-semibold text-gray-600 @min-[960px]:block">
                {currentUser?.name || ""}
              </p>
              {photo && !failedPhotos.includes(photo) ? (
                // Plain <img>: the photo may be a data URL or an external host
                // that next/image isn't configured for.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt=""
                  onError={() => markFailed(photo)}
                  className="w-8 h-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-xs font-bold text-white"
                >
                  {initialsOf(currentUser?.name)}
                </span>
              )}
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <Link
                  href="/my-profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  My Profile
                </Link>
                <Link
                  href="/my-profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Settings
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Notifications
                </Link>
                <Link
                  href="/help-support"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Help & Support
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const shouldLogout = window.confirm("Are you sure you want to logout?");
                    if (!shouldLogout) return;
                    setProfileMenuOpen(false);
                    clearSession();
                    // replace, not push: Back must not return to a protected page.
                    router.replace("/login");
                    window.dispatchEvent(new CustomEvent("eventsnap-user-updated", { detail: null }));
                  }}
                  className="block w-full px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobileSearch && (
        <div
          id="navbar-mobile-search"
          className="absolute top-full left-0 w-full bg-gray-100 p-3 border-b border-gray-300 @min-[640px]:hidden"
        >
          <input
            type="text"
            aria-label="Search bookings, clients, invoices"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings, clients, invoices..."
            className="w-full px-3 py-2 bg-white border rounded-xl outline-none"
          />
        </div>
      )}
    </nav>
  );
};

export default Navbar;
