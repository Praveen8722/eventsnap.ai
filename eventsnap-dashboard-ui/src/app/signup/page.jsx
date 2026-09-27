"use client";

// UI recovered verbatim from the last working Turbopack dev-cache
// (.next/dev/static/chunks/src_app_signup_page_jsx_30f1e05f._.js, dated
// Sep 12) — the original /signup page before it was replaced with a
// minimal stand-in. Only the visual layer was restored; the submit
// handler still uses the current auth flow (src/api/authApi.js's
// signup() + establishSession(), redirecting to /dashboard) and the
// current logged-in guard — none of that was touched.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TbCamera } from "react-icons/tb";
import { signup } from "@/api/authApi";
import { establishSession, isLoggedIn } from "@/lib/session";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await signup(form);
      await establishSession(res.data.token);
      router.push("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#6C63FF] p-4 rounded-full mb-4">
            <TbCamera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[#1E1E1E] text-2xl font-semibold">EventSnap.AI</h1>
          <p className="text-gray-600 text-center mt-2 text-sm">
            Start managing your photography business today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full">
              <label className="text-sm text-gray-700 mb-2 block">Your Name</label>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={form.name}
                onChange={handleChange}
                className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 bg-transparent focus:bg-transparent"
              />
            </div>
            <div className="w-full">
              <label className="text-sm text-gray-700 mb-2 block">Business Name</label>
              <input
                type="text"
                name="businessName"
                placeholder="Business Name"
                value={form.businessName}
                onChange={handleChange}
                className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 bg-transparent focus:bg-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-700 mb-2 block">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="photographer@example.com"
              value={form.email}
              onChange={handleChange}
              className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 bg-transparent focus:bg-transparent"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 mb-2 block">Phone Number</label>
            <input
              type="tel"
              name="phone"
              placeholder="9876543210"
              value={form.phone}
              onChange={handleChange}
              className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 bg-transparent focus:bg-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full">
              <label className="text-sm text-gray-700 mb-2 block">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 bg-transparent focus:bg-transparent"
              />
            </div>
            <div className="w-full">
              <label className="text-sm text-gray-700 mb-2 block">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 bg-transparent focus:bg-transparent"
              />
            </div>
          </div>

          <label className="flex items-center text-sm text-gray-600 ">
            <input type="checkbox" required className="mr-2" />
            I agree to the Terms of Service and Privacy Policy
          </label>

          <button
            type="submit"
            className="w-full bg-[#6C63FF] hover:bg-[#5a52e0] text-white py-1.5 rounded-lg font-medium transition"
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-[#6C63FF] font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
