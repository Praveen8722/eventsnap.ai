"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/common/AppLink";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { IoMdAdd } from "react-icons/io";
import { LuFileText } from "react-icons/lu";
import { FiEye, FiDownload, FiSend } from "react-icons/fi";
import { viewInvoices, updateInvoice } from "@/api/invoiceApi";
import { isLoggedIn } from "@/lib/session";

const Model = dynamic(() => import("@/components/ui/Model"));

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB").format(d);
};
const downloadFile = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

function Invoices() {
  const [modalType, setModalType] = useState(null); // "invoice" | "invoiceDetail" | null
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [rows, setRows] = useState([]);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await viewInvoices();
      setRows(res.data?.invoices ?? []);
    } catch (error) {
      console.error("Failed to load invoices", error);
    }
  }, []);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    const handler = () => fetchInvoices();
    window.addEventListener("eventsnap-invoices-updated", handler);
    window.addEventListener("eventsnap-bookings-updated", handler);
    return () => {
      window.removeEventListener("eventsnap-invoices-updated", handler);
      window.removeEventListener("eventsnap-bookings-updated", handler);
    };
  }, [fetchInvoices]);

  // ── Stat cards ──────────────────────────────────────────────────────────
  const totalInvoices = rows.length;
  const paidCount = rows.filter((i) => i.status === "Paid").length;
  const pendingCount = rows.filter((i) => i.status !== "Paid").length;
  const outstanding = rows
    .filter((i) => i.status !== "Paid")
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleView = (inv) => {
    setActiveInvoice(inv);
    setModalType("invoiceDetail");
  };

  const handleSend = async (inv) => {
    try {
      await updateInvoice(inv._id, {
        status: "Sent",
      });
      window.dispatchEvent(new CustomEvent("eventsnap-invoices-updated"));
      await fetchInvoices();
      alert(`Invoice ${inv.invoiceId} sent to ${inv.email || inv.clientName}`);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to send invoice");
    }
  };

  const handleDownload = (inv) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${inv.invoiceId}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1E1E1E;padding:48px;max-width:720px;margin:auto}
      h1{color:#6C63FF;margin:0} .row{display:flex;justify-content:space-between;margin-top:6px;font-size:14px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      td,th{border:1px solid #ddd;padding:10px;font-size:14px}th{background:#f5f5f5;text-align:left}
      .tot{margin-top:20px;text-align:right;font-size:16px;font-weight:bold}
      .muted{color:#888;font-size:12px;margin-top:32px}
    </style></head><body>
      <h1>EventSnap.AI</h1><p>Invoice</p><hr/>
      <div class="row"><span><b>Invoice ID:</b> ${inv.invoiceId}</span><span><b>Status:</b> ${inv.status}</span></div>
      <div class="row"><span><b>Billed To:</b> ${inv.clientName} ${inv.email ? `(${inv.email})` : ""}</span><span><b>Booking:</b> ${inv.bookingId}</span></div>
      <div class="row"><span><b>Issued:</b> ${fmtDate(inv.createdAt)}</span><span><b>Due:</b> ${fmtDate(inv.dueDate)}</span></div>
      <table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody><tr><td>${inv.description || "Photography services"}</td><td style="text-align:right">${fmt(inv.amount)}</td></tr></tbody></table>
      <p class="tot">Total: ${fmt(inv.amount)}</p>
      ${inv.notes ? `<p style="font-size:13px">${inv.notes}</p>` : ""}
      <p class="muted">Generated on ${new Date().toLocaleString()}</p>
    </body></html>`;
    downloadFile(html, `${inv.invoiceId}.html`, "text/html");
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-gray-500 text-sm mt-2">Generate and manage invoices for your clients</p>
        </div>
        <div className="flex  gap-2">
          <button
            onClick={() => setModalType("invoice")}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2"
          >
            <IoMdAdd className="text-xl" />
            Create Invoice
          </button>
          {modalType && (
            <Model
              type={modalType}
              invoice={activeInvoice}
              onClose={() => {
                setModalType(null);
                setActiveInvoice(null);
              }}
              onSaved={fetchInvoices}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Total Invoices
            <div className="w-12 h-12 bg-[#22C55E] rounded-xl flex items-center justify-center">
              <LuFileText className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{totalInvoices}</h2>
        </Link>

        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Paid
            <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center">
              <LuFileText className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{paidCount}</h2>
        </Link>

        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Pending
            <div className="w-12 h-12 rounded-xl bg-[#3A7BFF] flex items-center justify-center">
              <LuFileText className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{pendingCount}</h2>
        </Link>

        <Link href="#" className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Outstanding
            <div className="w-12 h-12 rounded-xl bg-[#5a52e0] flex items-center justify-center">
              <LuFileText className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{fmt(outstanding)}</h2>
        </Link>
      </div>

      <div className="grid grid-cols-1  gap-6 mt-6 ">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 cursor-pointer dashboard-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-gray-600">
                  <th className="py-2 text-left">Invoice ID</th>
                  <th className="py-2 text-left">Client Name</th>
                  <th className="py-2 text-left">Booking ID</th>
                  <th className="py-2 text-left">Amount</th>
                  <th className="py-2 text-left">Issued Date</th>
                  <th className="py-2 text-left">Due Date</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-400 text-sm">
                      No invoices yet
                    </td>
                  </tr>
                )}
                {rows.map((item, index) => (
                  <tr key={item._id || index} className="border-t border-gray-200">
                    <td className="py-3 md:py-5 font-medium text-gray-700">{item.invoiceId} </td>
                    <td className="py-3 md:py-5 text-gray-600">{item.clientName}</td>
                    <td className="py-3 md:py-5 text-gray-600">{item.bookingId}</td>
                    <td className="py-3 md:py-5 text-gray-600">{fmt(item.amount)}</td>
                    <td className="py-3 md:py-5 text-gray-600">{fmtDate(item.createdAt)}</td>
                    <td className="py-3 md:py-5 text-gray-700">{fmtDate(item.dueDate)}</td>
                    <td className="py-3 md:py-5">
                      <span
                        className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm
                ${item.status === "Paid" ? "bg-green-100 text-green-700" : item.status === "Sent" ? "bg-blue-100 text-blue-700" : item.status === "Partial" ? "bg-yellow-100 text-yellow-700" : item.status === "Pending" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {item.status}
                      </span>{" "}
                    </td>
                    <td className="py-3 md:py-5">
                      <div className="flex items-center gap-4 text-[#4B5563]">
                        <FiEye
                          size={18}
                          onClick={() => handleView(item)}
                          className="cursor-pointer hover:text-[#6C63FF] transition"
                        />
                        <FiDownload
                          size={18}
                          onClick={() => handleDownload(item)}
                          className="cursor-pointer hover:text-[#6C63FF] transition"
                        />
                        <FiSend
                          size={18}
                          onClick={() => handleSend(item)}
                          className="cursor-pointer hover:text-[#6C63FF] transition"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
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
  if (!authChecked) return null;
  return <Invoices />;
}
