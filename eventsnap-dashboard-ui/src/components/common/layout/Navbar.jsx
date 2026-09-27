"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineSearch } from "react-icons/hi";
import { IoMdNotificationsOutline } from "react-icons/io";
import { IoSettingsOutline } from "react-icons/io5";

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
  const navRef = useRef(null);
  const searchButtonRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    syncUser();
    window.addEventListener("eventsnap-user-updated", syncUser);
    return () => {
      window.removeEventListener("eventsnap-user-updated", syncUser);
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

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className="@container sticky top-0 z-30 -mt-6 w-full min-w-0 overflow-x-clip border-b border-gray-300 bg-white"
    >
      <div className="flex min-h-16 min-w-0 flex-nowrap items-center justify-between gap-2 py-2 pl-11 @min-[400px]:gap-3 md:pl-0">
        <div className="flex min-w-0 shrink items-center gap-2">
          <Link href="/dashboard" className="hidden min-w-0 shrink items-center gap-2 @min-[640px]:flex">
            <Image
              src="/images/studio.png"
              alt=""
              width={400}
              height={400}
              sizes="40px"
              priority
              className="w-7 h-7 @min-[768px]:w-9 @min-[768px]:h-9 shrink-0 rounded-2xl"
            />
            <strong className="min-w-0 truncate text-sm @min-[768px]:text-base">
              {currentUser?.businessName || "Mallu Photo Studio"}
            </strong>
          </Link>
          <Link
            href="/dashboard"
            className="flex min-w-0 shrink items-center gap-1 text-base font-bold @min-[380px]:text-lg @min-[640px]:hidden"
          >
            <Image
              src="/images/eventsnaplogo.png"
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

          <Link href="/notifications" aria-label="Notifications" className="flex shrink-0 items-center justify-center">
            <IoMdNotificationsOutline aria-hidden="true" className="text-2xl" />
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
                {currentUser?.name || "Mallu Photographer"}
              </p>
              <Image
                src="/images/photo_praveen.jpg"
                alt=""
                width={968}
                height={992}
                sizes="40px"
                priority
                className="w-8 h-8 shrink-0 rounded-full object-cover"
              />
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
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.dispatchEvent(new CustomEvent("eventsnap-user-updated", { detail: null }));
                    router.push("/login");
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
