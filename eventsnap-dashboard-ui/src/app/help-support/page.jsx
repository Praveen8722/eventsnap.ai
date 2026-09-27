"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "@/lib/session";
import { IoMdAdd } from "react-icons/io";
import { RxLightningBolt } from "react-icons/rx";
import { LuDollarSign, LuCamera, LuNotebookPen, LuPhone } from "react-icons/lu";
import { MdOutlineAccessTime, MdOutlineEmail } from "react-icons/md";
import {
  IoSearch,
  IoChatbubbleOutline,
  IoBookOutline,
  IoHelpCircleOutline,
} from "react-icons/io5";
import { GrShare } from "react-icons/gr";
import { FiVideo, FiEye, FiCheckCircle } from "react-icons/fi";

const tutorials = [
  {
    time: "2:30",
    topics: "Getting Started with EventSnap Pro",
    views: "12.5K",
  },
  {
    time: "1:78",
    topics: "Creating & Sharing Client Galleries",
    views: "8.3K ",
  },
  {
    time: "4:12",
    topics: "Managing Bookings & Calendar",
    views: "6.1K",
  },
  {
    time: "1:12",
    topics: "Setting Up Payment Tracking",
    views: "5.7K",
  },
];

const galleriesPhotos = [
  {
    q: "How do I create my first gallery?",
    a: "Navigate to the Galleries page and click 'Create Gallery'. Upload your photos, set access permissions, and share the link with your client.",
  },
  {
    q: "How do I add a new booking?",
    a: "Go to Bookings page, click 'New Booking', fill in client details, event date, and pricing information. You can also add it directly from the Calendar view.",
  },
  {
    q: "Can I import my existing client list?",
    a: "Yes! Go to Profile > Import Data and upload a CSV file with your client information. We support imports from Excel, Google Sheets, and other photography platforms.",
  },
];

const gettingStarted = [
  {
    q: "What file formats are supported for uploads?",
    a: "We support JPG, PNG, HEIC, and RAW formats (CR2, NEF, ARW). Maximum file size is 50MB per photo.",
  },
  {
    q: "How do I add a watermark to my photos?",
    a: "In your Profile settings, upload your watermark image. Then when creating a gallery, toggle 'Apply Watermark' to automatically add it to all photos.",
  },
  {
    q: "Can clients download original resolution photos?",
    a: "Yes, you can control this per gallery. Toggle 'Allow Downloads' when creating or editing a gallery to enable/disable full-resolution downloads.",
  },
  {
    q: "How long do galleries stay active?",
    a: "Free plan: 30 days. Pro plan: 1 year. Business plan: Unlimited. You can also set custom expiry dates for each gallery.",
  },
];

const paymentsBilling = [
  {
    q: "How do I track payment status?",
    a: "Go to the Payments page to see all invoices. Use filters to view pending, paid, or overdue payments. You can also send payment reminders directly to clients.",
  },
  {
    q: "Can I accept online payments?",
    a: "Yes! Connect Stripe or PayPal in your Profile > Payment Settings. Clients can pay invoices online with credit cards or digital wallets.",
  },
  {
    q: "What happens if I downgrade my plan?",
    a: "Your data remains safe. Some features will be limited based on your new plan. Active galleries beyond your limit will become read-only until you upgrade or delete some.",
  },
];

const accountSettings = [
  {
    q: "How do I change my email or password?",
    a: "Go to Profile > Personal Information. Click 'Update Email' or 'Change Password' and follow the verification steps.",
  },
  {
    q: "Can I have multiple users on my account?",
    a: "Team collaboration is available on Business plan. You can add up to 5 team members with different permission levels.",
  },
  {
    q: "Is my data backed up?",
    a: "Yes! We perform daily automated backups. Your photos and client data are stored securely with 99.9% uptime guarantee.",
  },
];

export default function HelpSupportPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [openPhotos, setOpenPhots] = useState(null);
  const [openStart, setOpenStart] = useState(null);
  const [openBilling, setOpenBilling] = useState(null);
  const [openSetting, setOpenSetting] = useState(null);

  useEffect(() => {
    if (isLoggedIn()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthChecked(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!authChecked) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Help & Support</h1>
          <p className="text-gray-500 text-sm mt-2">
            Get help and learn how to use EventSnap Pro
          </p>
        </div>
        <div className="flex  gap-2">
          <button className="text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2">
            <IoMdAdd className="text-xl" />
            Record Payment
          </button>
        </div>
      </div>

      <div className="flex items-center bg-gray-100 border-gray-200 border rounded-lg px-3 py-2 w-full max-w-2xl mt-6">
        <IoSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Search for help articles, guides, and FAQs..."
          className="w-full bg-transparent outline-none text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Payments Guide
            <div className="w-12 h-12 bg-[#22C55E] rounded-xl flex items-center justify-center">
              <LuDollarSign className="text-white text-3xl" />
            </div>
          </h5>
          <p className="text-sm text-gray-600  inline-block ">
            Learn about payment features and tracking
          </p>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Subscription Guide
            <div className="w-12 h-12 rounded-xl bg-[#5a52e0] flex items-center justify-center">
              <RxLightningBolt className="text-white text-3xl" />
            </div>
          </h5>
          <p className="text-sm rounded-lg text-gray-600  inline-block">
            Understand pricing and billing
          </p>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Gallery Management
            <div className="w-12 h-12 rounded-xl bg-[#3A7BFF] flex items-center justify-center">
              <LuCamera className="text-white text-3xl" />
            </div>
          </h5>
          <p className="text-sm rounded-lg text-gray-600  inline-block">
            Upload and share client photos
          </p>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Booking System
            <div className="w-12 h-12 rounded-xl bg-[#FF675D] flex items-center justify-center">
              <LuNotebookPen className="text-white text-3xl" />
            </div>
          </h5>
          <p className="text-sm inline-block text-gray-600  rounded-md">
            Manage your photography schedule
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Live Chat
            <div className="w-12 h-12 bg-[#3A7BFF] rounded-xl flex items-center justify-center">
              <IoChatbubbleOutline className="text-white text-3xl" />
            </div>
          </h5>
          <div className="flex flex-col text-sm text-gray-600 gap-2">
            <p>Chat with our support team in real-time</p>
            <p className="flex items-center gap-1 ">
              <MdOutlineAccessTime /> Available 24/7
            </p>
          </div>
          <button className="mt-4 w-full bg-[#3A7BFF] text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Start Chat
          </button>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Email Support
            <div className="w-12 h-12 rounded-xl bg-[#22C55E] flex items-center justify-center">
              <MdOutlineEmail className="text-white text-3xl" />
            </div>
          </h5>
          <div className="flex flex-col text-sm text-gray-600 gap-2">
            <p>Get help via email within 24 hours</p>
            <p className="flex items-center gap-1 ">
              <MdOutlineAccessTime /> Response in 24h
            </p>
          </div>
          <button className="mt-4 w-full bg-[#22C55E] text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Send Email
          </button>
        </Link>
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Phone Support
            <div className="w-12 h-12 rounded-xl bg-[#6C63FF] flex items-center justify-center">
              <LuPhone className="text-white text-3xl" />
            </div>
          </h5>
          <div className="flex flex-col text-sm text-gray-600 gap-2">
            <p>Call us for urgent assistance</p>
            <p className="flex items-center gap-1 ">
              <MdOutlineAccessTime /> Mon-Fri 9AM-6PM EST
            </p>
          </div>
          <button className="mt-4 w-full bg-[#6C63FF] text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
            View Number
          </button>
        </Link>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <h1>Video Tutorials</h1>
        <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <GrShare />
          View All Videos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mt-4">
        {tutorials.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="relative">
              <div className="h-70 w-full bg-[#6C63FF] flex items-center justify-center">
                <div className="p-4 rounded-full bg-white">
                  <FiVideo className="text-4xl p-1 text-[#6C63FF]" />
                </div>
              </div>
              <span className="absolute bottom-3 right-3 bg-black/80 text-white px-3 py-1 text-xs rounded-sm">
                {item.time}
              </span>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 mb-3">{item.topics}</p>
              <div className="flex items-center gap-6 text-sm mb-3 text-gray-600">
                <span className="flex items-center gap-1">
                  <FiEye /> {item.views} views
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className=" mt-10">
        <h2 className="text-lg text-gray-600 font-semibold mb-4">
          Frequently Asked Questions
        </h2>
        <div className="flex items-center gap-2 text-gray-700 font-medium mb-4">
          <IoBookOutline className="text-indigo-500 text-xl" />
          Getting Started
        </div>
        <div className="space-y-3 w-full mx-auto">
          {galleriesPhotos.map((item, index) => (
            <div
              key={index}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-white transition cursor-pointer w-full"
              onClick={() => setOpenPhots(openPhotos === index ? null : index)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <IoHelpCircleOutline className="text-indigo-500 text-2xl" />
                  <p className="text-gray-800">{item.q}</p>
                </div>
                <FiCheckCircle
                  className={`text-gray-400 text-xl transition-transform duration-200 ${
                    openPhotos === index ? "rotate-180" : ""
                  }`}
                />
              </div>
              {openPhotos === index && (
                <p className="text-sm ml-8 text-gray-600 mt-3">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className=" mt-6">
        <div className="flex items-center gap-2 text-gray-700 font-medium mb-4">
          <IoBookOutline className="text-indigo-500 text-xl" />
          Galleries & Photos
        </div>
        <div className="space-y-3 w-full mx-auto">
          {gettingStarted.map((item, index) => (
            <div
              key={index}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-white transition cursor-pointer w-full"
              onClick={() => setOpenStart(openStart === index ? null : index)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <IoHelpCircleOutline className="text-indigo-500 text-2xl" />
                  <p className="text-gray-800">{item.q}</p>
                </div>
                <FiCheckCircle
                  className={`text-gray-400 text-xl transition-transform duration-200 ${
                    openStart === index ? "rotate-180" : ""
                  }`}
                />
              </div>
              {openStart === index && (
                <p className="text-sm ml-8 text-gray-600 mt-3">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className=" mt-6">
        <div className="flex items-center gap-2 text-gray-700 font-medium mb-4">
          <IoBookOutline className="text-indigo-500 text-xl" />
          Payments & Billing
        </div>
        <div className="space-y-3 w-full mx-auto">
          {paymentsBilling.map((item, index) => (
            <div
              key={index}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-white transition cursor-pointer w-full"
              onClick={() =>
                setOpenBilling(openBilling === index ? null : index)
              }
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <IoHelpCircleOutline className="text-indigo-500 text-2xl" />
                  <p className="text-gray-800">{item.q}</p>
                </div>
                <FiCheckCircle
                  className={`text-gray-400 text-xl transition-transform duration-200 ${
                    openBilling === index ? "rotate-180" : ""
                  }`}
                />
              </div>
              {openBilling === index && (
                <p className="text-sm ml-8 text-gray-600 mt-3">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className=" mt-6">
        <div className="flex items-center gap-2 text-gray-700 font-medium mb-4">
          <IoBookOutline className="text-indigo-500 text-xl" />
          Account & Settings
        </div>
        <div className="space-y-3 w-full mx-auto">
          {accountSettings.map((item, index) => (
            <div
              key={index}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-white transition cursor-pointer w-full"
              onClick={() =>
                setOpenSetting(openSetting === index ? null : index)
              }
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <IoHelpCircleOutline className="text-indigo-500 text-2xl" />
                  <p className="text-gray-800">{item.q}</p>
                </div>
                <FiCheckCircle
                  className={`text-gray-400 text-xl transition-transform duration-200 ${
                    openSetting === index ? "rotate-180" : ""
                  }`}
                />
              </div>
              {openSetting === index && (
                <p className="text-sm ml-8 text-gray-600 mt-3">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
