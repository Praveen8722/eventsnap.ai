"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuSave, LuCamera } from "react-icons/lu";
import { FiUser } from "react-icons/fi";
import {
  editProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  uploadBusinessPhoto,
  deleteBusinessPhoto,
  profilePhotoUrl,
} from "@/api/authApi";
import { isLoggedIn } from "@/lib/session";

const defaultProfile = {
  name: "",
  businessName: "",
  email: "",
  phone: "",
  location: "",
  businessAddress: "",
  businessDescription: "",
  website: "",
  taxId: "",
  upiId: "",
  bankName: "",
  accountNumber: "",
  swiftIfsc: "",
  emailNotifications: true,
  smsNotifications: true,
  paymentReminders: true,
  bookingUpdates: true,
  clientMessages: true,
  createdAt: "",
};

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const formatMemberSince = (date) => {
  if (!date) return "Member since —";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "Member since —";
  }
};

const MyProfile = () => {
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef(null);
  const businessPhotoInputRef = useRef(null);

  const syncProfile = (user) => {
    setProfile({
      ...defaultProfile,
      ...user,
      emailNotifications: user?.emailNotifications ?? true,
      smsNotifications: user?.smsNotifications ?? true,
      paymentReminders: user?.paymentReminders ?? true,
      bookingUpdates: user?.bookingUpdates ?? true,
      clientMessages: user?.clientMessages ?? true,
    });
  };

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      syncProfile(storedUser);
    }
    setLoading(false);

    // The navbar re-reads the account from the backend on load; pick up the
    // confirmed photos without touching any unsaved form edits.
    const syncPhoto = () => {
      const stored = getStoredUser();
      setProfile((prev) => ({
        ...prev,
        profilePhoto: stored?.profilePhoto || "",
        businessPhoto: stored?.businessPhoto || "",
      }));
    };
    window.addEventListener("eventsnap-user-updated", syncPhoto);
    return () => window.removeEventListener("eventsnap-user-updated", syncPhoto);
  }, []);

  // Photos are saved on the backend for the signed-in account (owner from the
  // JWT); the response is that account's record, which becomes the session.
  const applyPhotoResponse = (user) => {
    setProfile((prev) => ({
      ...prev,
      profilePhoto: user?.profilePhoto || "",
      businessPhoto: user?.businessPhoto || "",
    }));
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("eventsnap-user-updated", { detail: user }));
  };

  const runPhotoAction = async (action, failMessage) => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const response = await action();
      applyPhotoResponse(response.data.user);
    } catch (error) {
      alert(error?.response?.data?.message || failMessage);
    } finally {
      setPhotoBusy(false);
    }
  };

  // File picker change -> upload with the given API call.
  const onPhotoPicked = (upload) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (file) runPhotoAction(() => upload(file), "Failed to upload photo");
  };

  const handlePhotoSelected = onPhotoPicked(uploadProfilePhoto);
  const handleBusinessPhotoSelected = onPhotoPicked(uploadBusinessPhoto);

  const handleRemovePhoto = () => {
    if (!photoBusy && window.confirm("Remove your profile photo?"))
      runPhotoAction(deleteProfilePhoto, "Failed to remove photo");
  };

  const handleRemoveBusinessPhoto = () => {
    if (!photoBusy && window.confirm("Remove your business photo?"))
      runPhotoAction(deleteBusinessPhoto, "Failed to remove photo");
  };

  const updateField = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await editProfile(profile);
      const user = response.data?.user || profile;
      syncProfile(user);
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new CustomEvent("eventsnap-user-updated", { detail: user }));
      alert("Profile updated successfully");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Persist just the payment fields via the same /edit-profile endpoint.
  const handleUpdatePayment = async () => {
    if (savingPayment) return;
    setSavingPayment(true);
    try {
      const response = await editProfile({
        upiId: profile.upiId,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        swiftIfsc: profile.swiftIfsc,
      });
      const user = response.data?.user || profile;
      syncProfile(user);
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new CustomEvent("eventsnap-user-updated", { detail: user }));
      alert("Payment info updated successfully");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update payment info");
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="mt-4 ">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-gray-500 text-sm mt-2">Manage your profile and business settings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2 disabled:opacity-60"
          >
            <LuSave className="text-xl" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mt-8">
        <div className="w-full md:flex-2 border border-gray-300 rounded-2xl p-6">
          <div className="flex items-center text-center border-b border-gray-300 pb-4">
            <div className="relative">
              {profile.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePhotoUrl(profile.profilePhoto)}
                  alt="Profile photo"
                  className="w-[100px] h-[100px] rounded-full object-cover border"
                />
              ) : (
                <FiUser className="text-white border rounded-full p-6  bg-[#6C63FF]     " size={100} />
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelected}
              />
              <button
                type="button"
                aria-label="Change profile photo"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoBusy || loading}
                className="absolute bottom-1 right-1 bg-white text-[#5a52e0] rounded-full p-2 shadow-md disabled:opacity-60"
              >
                <LuCamera />
              </button>
            </div>
            <div className="flex flex-col items-start space-y-2  ml-4">
              <h2 className="text-lg font-semibold text-gray-800">{profile.name || "Your Name"}</h2>
              <p className="text-sm text-gray-500">{profile.businessName || "Business Name"}</p>
              <p className="text-xs text-gray-500">{formatMemberSince(profile.createdAt)}</p>
              {profile.profilePhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={photoBusy}
                  className="text-xs text-red-500 hover:underline disabled:opacity-60"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mt-10">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-sm text-gray-600">Full Name</label>
                <input
                  value={profile.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="mt-1 w-full text-sm rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <input
                  value={profile.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="mt-1 w-full text-sm  rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <input
                  value={profile.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="mt-1 w-full text-sm  rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Location</label>
                <input
                  value={profile.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  className="mt-1 w-full text-sm  rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
            </div>

            <h3 className="font-semibold text-lg mt-8">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-sm text-gray-600">Business Name</label>
                <input
                  value={profile.businessName}
                  onChange={(e) => updateField("businessName", e.target.value)}
                  className="mt-1 w-full text-sm   rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Business Address</label>
                <input
                  value={profile.businessAddress}
                  onChange={(e) => updateField("businessAddress", e.target.value)}
                  className="mt-1 w-full text-sm  rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
            </div>

            {/* Business photo — shown beside the Business Name in the navbar. */}
            <div className="mt-4">
              <label className="text-sm text-gray-600">Business Photo</label>
              <div className="mt-1 flex items-center gap-3">
                {profile.businessPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePhotoUrl(profile.businessPhoto)}
                    alt="Business photo"
                    className="w-12 h-12 rounded-2xl object-cover border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                    <LuCamera />
                  </div>
                )}
                <input
                  ref={businessPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBusinessPhotoSelected}
                />
                <button
                  type="button"
                  onClick={() => businessPhotoInputRef.current?.click()}
                  disabled={photoBusy || loading}
                  className="text-sm font-medium text-[#6C63FF] hover:underline disabled:opacity-60"
                >
                  {profile.businessPhoto ? "Change photo" : "Upload photo"}
                </button>
                {profile.businessPhoto && (
                  <button
                    type="button"
                    onClick={handleRemoveBusinessPhoto}
                    disabled={photoBusy}
                    className="text-xs text-red-500 hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-gray-600">Business Description</label>
              <textarea
                rows="3"
                value={profile.businessDescription}
                onChange={(e) => updateField("businessDescription", e.target.value)}
                className="mt-1 w-full text-sm   rounded-lg px-3 py-2 bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm text-gray-600">Website</label>
                <input
                  value={profile.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="mt-1 w-full text-sm  rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Tax ID / GST Number</label>
                <input
                  value={profile.taxId}
                  onChange={(e) => updateField("taxId", e.target.value)}
                  className="mt-1 w-full text-sm  rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:flex-1 gap-col-6 space-y-6">
          <div className="border border-gray-300 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-5">Payment Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">UPI ID</label>
                <input
                  type="text"
                  value={profile.upiId}
                  onChange={(e) => updateField("upiId", e.target.value)}
                  className="w-full text-sm  mt-1  px-3 py-2 bg-gray-100 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Bank Name</label>
                <input
                  type="text"
                  value={profile.bankName}
                  onChange={(e) => updateField("bankName", e.target.value)}
                  className="w-full text-sm  mt-1  px-3 py-2 bg-gray-100 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Account Number</label>
                <input
                  type="password"
                  value={profile.accountNumber}
                  onChange={(e) => updateField("accountNumber", e.target.value)}
                  className="w-full text-sm  mt-1  px-3 py-2 bg-gray-100 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">SWIFT/IFSC Code</label>
                <input
                  type="text"
                  value={profile.swiftIfsc}
                  onChange={(e) => updateField("swiftIfsc", e.target.value)}
                  className="w-full text-sm  mt-1  px-3 py-2 bg-gray-100 rounded-lg"
                />
              </div>
            </div>
            <button
              onClick={handleUpdatePayment}
              disabled={savingPayment || loading}
              className="w-full mt-6 px-3 py-1 border rounded-xl text-[#6C63FF] hover:bg-gray-50"
            >
              {savingPayment ? "Updating..." : "Update Payment Info"}
            </button>
          </div>

          <div className=" shadow  border border-gray-300 rounded-2xl p-6 ">
            <h2 className="text-lg font-semibold mb-5">Notification Settings</h2>
            <div className="space-y-4 text-sm font-semibold text-gray-600">
              <div className="flex justify-between">
                <span>Email Notifications</span>
                <input
                  type="checkbox"
                  checked={profile.emailNotifications}
                  onChange={(e) => updateField("emailNotifications", e.target.checked)}
                  className="accent-[#6C63FF]"
                />
              </div>
              <div className="flex justify-between">
                <span>SMS Notifications</span>
                <input
                  type="checkbox"
                  checked={profile.smsNotifications}
                  onChange={(e) => updateField("smsNotifications", e.target.checked)}
                  className="accent-[#6C63FF]"
                />
              </div>
              <div className="flex justify-between">
                <span>Payment Reminders</span>
                <input
                  type="checkbox"
                  checked={profile.paymentReminders}
                  onChange={(e) => updateField("paymentReminders", e.target.checked)}
                  className="accent-[#6C63FF]"
                />
              </div>
              <div className="flex justify-between">
                <span>Booking Updates</span>
                <input
                  type="checkbox"
                  checked={profile.bookingUpdates}
                  onChange={(e) => updateField("bookingUpdates", e.target.checked)}
                  className="accent-[#6C63FF]"
                />
              </div>
              <div className="flex justify-between">
                <span>Client Messages</span>
                <input
                  type="checkbox"
                  checked={profile.clientMessages}
                  onChange={(e) => updateField("clientMessages", e.target.checked)}
                  className="accent-[#6C63FF]"
                />
              </div>
            </div>
          </div>

          <div className="bg-linear-to-r from-[#6C63FF] to-[#5147FF] text-white p-8 rounded-2xl shadow ">
            <h2 className="text-xl font-semibold mb-2">Upgrade to Pro</h2>
            <p className="text-sm opacity-90">Get unlimited bookings, advanced analytics, and priority support</p>
            <button className="mt-6 w-full bg-white text-[#6C63FF] py-2 rounded-lg font-medium hover:bg-gray-100">
              View Plans
            </button>
          </div>
        </div>
      </div>

      <div className="w-full bg-white p-6 rounded-2xl border border-gray-200 mt-8">
        <h2 className="text-xl font-semibold mb-6">Subscription & Billing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Plan</span>
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">Free</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Member Since</span>
              <span className="font-medium">{formatMemberSince(profile.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 text-sm">Storage Used</span>
              <span className="text-sm font-medium">20 GB / 100 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gray-500 h-2 rounded-full" style={{ width: "40%" }} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Plan</span>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">Pro</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Member Since</span>
              <span className="font-medium">------</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 text-sm">Storage Used</span>
              <span className="text-sm font-medium"> 100 % / 50 MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Plan</span>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Business</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500">Member Since</span>
              <span className="font-medium">-------</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 text-sm">Storage Used</span>
              <span className="text-sm font-medium">100 MB / 100 MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button className="text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2">
            Upgrade Plan
          </button>
          <button className="border px-4 py-2 text-sm rounded-lg hover:bg-gray-100 border-gray-300">
            View Billing History
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MyProfilePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // localStorage only exists client-side, so this can't be computed during
    // render (would mismatch the server-rendered output) — it has to run
    // after mount.
    if (isLoggedIn()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthChecked(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!authChecked) return null;
  return <MyProfile />;
}
