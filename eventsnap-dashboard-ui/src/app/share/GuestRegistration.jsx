"use client";

import { useState } from "react";
import { HiOutlineUserCircle } from "react-icons/hi";
import { registerEventGuest } from "@/api/createEventApi";

// Guest Registration (Create Event → Guest Access): when it's on, guests
// enter their details here before the event's photos are shown. Name and
// phone are required, email is optional. onRegistered runs once the backend
// has saved the registration.

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition";

const PHONE = /^\+?[0-9]{7,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = ({ name, phone, email }) => {
  if (!name.trim()) return "Please enter your full name";
  if (!PHONE.test(phone.replace(/[\s()-]/g, ""))) return "Please enter a valid phone number";
  if (email.trim() && !EMAIL.test(email.trim())) return "Please enter a valid email address";
  return "";
};

export function GuestRegistration({ shareId, eventName, onRegistered }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const problem = validate(form);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await registerEventGuest(shareId, { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() });
      onRegistered();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't register. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[#6C63FF]/20 bg-white px-6 py-10 sm:py-12 shadow-sm">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center mb-4">
          <HiOutlineUserCircle className="text-3xl" />
        </div>
        <h2 className="text-xl font-bold text-[#1E1E1E]">Guest Registration</h2>
        <p className="text-gray-600 mt-2 max-w-md mx-auto">Enter your details to see the photos from {eventName}.</p>
      </div>

      <form onSubmit={submit} noValidate className="mt-6 max-w-sm mx-auto space-y-4">
        <div>
          <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full Name<span className="text-red-500">*</span>
          </label>
          <input
            id="guest-name"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={form.name}
            onChange={set("name")}
            placeholder="Enter your full name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number<span className="text-red-500">*</span>
          </label>
          <input
            id="guest-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            value={form.phone}
            onChange={set("phone")}
            placeholder="Enter your phone number"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            id="guest-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={form.email}
            onChange={set("email")}
            placeholder="Enter your email address"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-500 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C63FF] text-white font-semibold px-5 py-3 hover:bg-[#5B52EE] disabled:opacity-60 transition-colors"
        >
          {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          {saving ? "Registering…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
