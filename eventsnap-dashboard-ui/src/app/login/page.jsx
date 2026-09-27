"use client";

// UI recovered verbatim from the last working Turbopack dev-cache
// (.next/dev/static/chunks/src_app_login_page_jsx_c7806bc3._.js, dated
// Sep 12) — the original /login page before it was replaced with a
// minimal stand-in. Only the visual layer was restored; the submit
// handler still uses the current auth flow (src/api/authApi.js's
// login() + establishSession(), redirecting to /dashboard) and the
// current logged-in guard — none of that was touched.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TbCamera } from "react-icons/tb";
import { login } from "@/api/authApi";
import { establishSession, isLoggedIn } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password });
      await establishSession(res.data.token);
      router.push("/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#6C63FF] p-4 rounded-full mb-4">
            <TbCamera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[#1E1E1E] text-2xl font-semibold">EventSnap.AI</h1>
          <p className="text-gray-600 text-center mt-2 text-sm">
            Manage your entire photography business from one powerful dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Email</label>
            <input
              type="email"
              placeholder="photographer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-600">
              <input type="checkbox" className="mr-2" />
              Remember me
            </label>
            <a href="#" className="text-[#6C63FF]">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-[#6C63FF] hover:bg-[#5a52e0] text-white py-1.5 rounded-lg font-medium transition"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#6C63FF] font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
