"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "@/components/common/AppLink";
import { usePathname } from "next/navigation";
import { MdDashboard, MdPayment } from "react-icons/md";
import { LuNotebookPen } from "react-icons/lu";
import { RiCalendarScheduleLine, RiFolder2Line } from "react-icons/ri";
import { GrGallery } from "react-icons/gr";
import { LiaFileInvoiceSolid } from "react-icons/lia";
import { IoMdMenu, IoMdNotificationsOutline } from "react-icons/io";
import { FaHandsHelping } from "react-icons/fa";
import { GoGitBranch } from "react-icons/go";

export default function Sidebar() {
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openBookings, setOpenBookings] = useState(false);
  const [openScheduling, setOpenScheduling] = useState(false);
  const [openPayments, setOpenPayments] = useState(false);
  const [openGalleries, setOpenGalleries] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const pathname = usePathname();

  const isActive = (href) => {
    const target = href.startsWith("/") ? href : `/${href}`;
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  return (
    <>
      <button
        className="md:hidden p-3 text-3xl fixed top-6 left-2 z-50 npm rounded"
        onClick={() => setOpenSidebar(true)}
      >
        <IoMdMenu />
      </button>

      {openSidebar && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpenSidebar(false)}
        />
      )}

      <aside
        className={`w-72 shrink-0  min-h-screen border-r border-gray-200 bg-white font-bold text-gray-600 shadow-md fixed top-0 left-0 z-50 transition-transform duration-300 md:sticky md:self-start md:h-screen md:overflow-y-auto ${
          openSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <h2 className="text-xl font-bold p-4 shadow-sm">
          <Link href="" onClick={() => setOpenSidebar(false)} className="flex items-center gap-2">
            <Image
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/eventsnaplogo.png`}
              alt=""
              width={556}
              height={500}
              sizes="40px"
              priority
              className="w-8 rounded-xl"
            />
            <span className="text-[#FF5555]">
              Event<span className="text-blue-600">Snap</span><span className="text-black">.AI</span>
            </span>
          </Link>
        </h2>

        <ul className="space-y-2">
          <li>
            <Link
              href="/dashboard"
              onClick={() => setOpenSidebar(false)}
              className={`flex items-center gap-3 p-4 hover:bg-[#6C63FF] hover:text-white rounded ${
                isActive("dashboard") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <MdDashboard className="text-xl" />
              Dashboard
            </Link>
          </li>

          <li>
            <Link
              href="/bookings"
              onClick={() => {
                setOpenBookings(!openBookings);
                setOpenSidebar(false);
              }}
              className={`flex justify-between w-full items-center p-4 hover:bg-[#6C63FF] hover:text-white rounded cursor-pointer ${
                isActive("bookings") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <LuNotebookPen className="text-xl" />
                Bookings
              </span>
            </Link>
          </li>

          <li>
            <Link
              href="/scheduling"
              onClick={() => {
                setOpenScheduling(!openScheduling);
                setOpenSidebar(false);
              }}
              className={`flex justify-between w-full items-center p-4 hover:bg-[#6C63FF] hover:text-white rounded cursor-pointer ${
                isActive("scheduling") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <RiCalendarScheduleLine className="text-xl" />
                Scheduling
              </span>
            </Link>
          </li>

          <li>
            <Link
              href="/payments"
              onClick={() => {
                setOpenPayments(!openPayments);
                setOpenSidebar(false);
              }}
              className={`flex justify-between w-full items-center p-4 hover:bg-[#6C63FF] hover:text-white rounded cursor-pointer ${
                isActive("payments") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <MdPayment className="text-xl" />
                Payments
              </span>
            </Link>
          </li>

          {/* <li>
            <Link
              href="/client-galleries"
              onClick={() => {
                setOpenGalleries(!openGalleries);
                setOpenSidebar(false);
              }}
              className={`flex justify-between w-full items-center p-4 hover:bg-[#6C63FF] hover:text-white rounded cursor-pointer ${
                isActive("client-galleries") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <GrGallery className="text-xl" />
                Client Galleries
              </span>
            </Link>
          </li> */}

          {/* <li>
            <Link
              href="/invoices"
              onClick={() => setOpenSidebar(false)}
              className={`flex items-center gap-3 p-4 hover:bg-[#6C63FF] hover:text-white rounded ${
                isActive("invoices") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <LiaFileInvoiceSolid className="text-xl" />
              Invoices
            </Link>
          </li> */}

          <li>
            <Link
              href="/project-workflow"
              onClick={() => setOpenSidebar(false)}
              className={`flex items-center gap-3 p-4 hover:bg-[#6C63FF] hover:text-white rounded ${
                isActive("/project-workflow") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <GoGitBranch className="text-xl" />
              Project Workflow
            </Link>
          </li>

          <li>
            <Link
              href="/my-profile"
              onClick={() => {
                setOpenProfile(!openProfile);
                setOpenSidebar(false);
              }}
              className={`flex justify-between w-full items-center p-4 hover:bg-[#6C63FF] hover:text-white rounded cursor-pointer ${
                isActive("my-profile") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <RiCalendarScheduleLine className="text-xl" />
                My Profile
              </span>
            </Link>
          </li>

          <li>
            <Link
              href="/notifications"
              onClick={() => setOpenSidebar(false)}
              className={`flex items-center gap-3 p-4 hover:bg-[#6C63FF] hover:text-white rounded ${
                isActive("/notifications") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <IoMdNotificationsOutline className="text-xl" />
              Notifications
            </Link>
          </li>

          <li>
            <Link
              href="/portfolio"
              onClick={() => setOpenSidebar(false)}
              className={`flex items-center gap-3 p-4 hover:bg-[#6C63FF] hover:text-white rounded ${
                isActive("/portfolio") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <RiFolder2Line className="text-xl" />
              Portfolio
            </Link>
          </li>

          <li>
            <Link
              href="/help-support"
              onClick={() => setOpenSidebar(false)}
              className={`flex items-center gap-3 p-4 hover:bg-[#6C63FF] hover:text-white rounded ${
                isActive("/help-support") ? "bg-[#6C63FF] text-white" : ""
              }`}
            >
              <FaHandsHelping className="text-xl" />
              Help & Support
            </Link>
          </li>
        </ul>
      </aside>
    </>
  );
}
