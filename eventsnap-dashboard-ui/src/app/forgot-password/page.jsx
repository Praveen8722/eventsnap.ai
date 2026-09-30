"use client";

// Forgot Password — the user enters their registered email and a new
// password, and the backend (POST /api/auth/forgot-password) resets it if the
// email exists. No OTP or reset link, by request. The visual layer mirrors the
// /login page; on success the user is sent to /login to sign in with the new
// password (the login flow itself is unchanged).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TbCamera } from "react-icons/tb";
import { forgotPassword } from "@/api/authApi";
import { isLoggedIn } from "@/lib/session";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await forgotPassword({ email, newPassword, confirmPassword });
      alert("Password reset successful. Please log in with your new password.");
      router.push("/login");
    } catch (error) {
      alert(error.response?.data?.message || "Password reset failed");
    } finally {
      setSubmitting(false);
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
            Reset your password to get back into your dashboard
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
            <label className="block text-sm text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border text-sm border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#6C63FF] hover:bg-[#5a52e0] text-white py-1.5 rounded-lg font-medium transition disabled:opacity-60"
          >
            {submitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Remember your password?{" "}
            <Link href="/login" className="text-[#6C63FF] font-medium">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
