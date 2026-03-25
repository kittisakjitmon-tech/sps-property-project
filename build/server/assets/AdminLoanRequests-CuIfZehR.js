import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { u as useAdminAuth, a1 as getLoanRequestsSnapshot, a2 as updateLoanRequestStatus, p as adminDb, a3 as deleteLoanRequest } from "./server-build-D_48fWql.js";
import { AlertTriangle, FileText, CreditCard, Search, Phone, MessageCircle, Eye, Trash2, X } from "lucide-react";
import "node:stream";
import "@react-router/node";
import "isbot";
import "react-dom/server";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
const STATUS_OPTIONS = [
  { value: "pending", label: "🟡 รอตรวจสอบ" },
  { value: "contacted", label: "🔵 ติดต่อแล้ว" },
  { value: "submitted", label: "🟢 ยื่นกู้แล้ว" },
  { value: "approved", label: "✅ อนุมัติ" },
  { value: "rejected", label: "🔴 ไม่ผ่าน" }
];
const OCCUPATION_LABELS = {
  government: "ข้าราชการ",
  employee: "พนักงานประจำ",
  business: "ธุรกิจส่วนตัว",
  freelance: "รับจ้างอิสระ",
  "": "-"
};
const CREDIT_LABELS = {
  normal: "ปกติดี",
  delayed: "เคยล่าช้า",
  bureau_closed: "ติดบูโร-ปิดแล้ว",
  bureau_open: "ติดบูโร-ยังไม่ปิด",
  "": "-"
};
function formatDate(ts) {
  if (!ts?.toDate) return "-";
  const d = ts.toDate();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${m}`;
}
function getFinancialHealth(income, debt) {
  const inc = parseFloat(income) || 0;
  const d = parseFloat(debt) || 0;
  if (inc <= 0) return { label: "-", color: "bg-slate-100 text-slate-700" };
  const ratio = d / inc;
  if (ratio <= 0.5 && inc > d * 2) return { label: "Potential", color: "bg-emerald-100 text-emerald-800" };
  if (ratio > 0.6) return { label: "High Risk", color: "bg-red-100 text-red-800" };
  return { label: "Moderate", color: "bg-amber-100 text-amber-800" };
}
function getLineAddUrl(lineId) {
  if (!lineId || typeof lineId !== "string") return null;
  const tid = lineId.trim().replace(/^@/, "");
  if (!tid) return null;
  return `https://line.me/R/ti/p/${encodeURIComponent(tid)}`;
}
function AdminLoanRequests() {
  const { isSuperAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3e3);
  };
  useEffect(() => {
    if (!isSuperAdmin()) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    const unsub = getLoanRequestsSnapshot((list) => {
      setRequests(Array.isArray(list) ? list : []);
      setLoading(false);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [isSuperAdmin]);
  const filteredAndSorted = useMemo(() => {
    let list = [...requests];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (r) => (r.nickname || "").toLowerCase().includes(q) || (r.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")) || (r.lineId || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter((r) => (r.status || "pending") === statusFilter);
    }
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return sortNewest ? tb - ta : ta - tb;
    });
    return list;
  }, [requests, searchTerm, statusFilter, sortNewest]);
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => (r.status || "pending") === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const totalValue = requests.filter((r) => r.status === "approved").reduce((sum, r) => sum + (parseFloat(r.approvedAmount) || 0), 0);
    return { total, pending, approved, totalValue };
  }, [requests]);
  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await updateLoanRequestStatus(id, newStatus, void 0, adminDb);
      showToast("อัปเดตสถานะเรียบร้อย");
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาด " + (err?.message || ""), "error");
    } finally {
      setUpdatingId(null);
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("ต้องการลบคำขอนี้หรือไม่?")) return;
    setDeletingId(id);
    try {
      await deleteLoanRequest(id, adminDb);
      setDetailModal(null);
      showToast("ลบเรียบร้อย");
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาด " + (err?.message || ""), "error");
    } finally {
      setDeletingId(null);
    }
  };
  if (accessDenied) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center min-h-[60vh]", children: [
      /* @__PURE__ */ jsx(AlertTriangle, { className: "h-16 w-16 text-red-500 mb-4" }),
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-slate-800 mb-2", children: "Access Denied" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-4", children: "เฉพาะ Super Admin เท่านั้นที่เข้าถึงหน้านี้ได้" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => navigate("/sps-internal-admin"),
          className: "px-6 py-2 rounded-lg bg-blue-900 text-white hover:bg-blue-800",
          children: "กลับแดชบอร์ด"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-blue-900", children: "จัดการคำขอกู้สินเชื่อ" }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
      { label: "คำขอทั้งหมด", value: stats.total, icon: FileText },
      { label: "รอตรวจสอบ", value: stats.pending, icon: FileText, color: "text-amber-600" },
      { label: "อนุมัติวงเงินแล้ว", value: stats.approved, icon: CreditCard, color: "text-emerald-600" },
      {
        label: "ยอดวงเงินรวม",
        value: stats.totalValue > 0 ? `${(stats.totalValue / 1e6).toFixed(2)} ล้าน` : "-",
        icon: CreditCard
      }
    ].map(({ label, value, icon: Icon, color }) => /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: `w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center ${color || "text-blue-600"}`, children: /* @__PURE__ */ jsx(Icon, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500", children: label }),
        /* @__PURE__ */ jsx("p", { className: "text-xl font-bold text-slate-800", children: value })
      ] })
    ] }, label)) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            placeholder: "ค้นหา ชื่อ, เบอร์, Line ID...",
            className: "w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: statusFilter,
          onChange: (e) => setStatusFilter(e.target.value),
          className: "px-4 py-2 rounded-lg border border-slate-300",
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "ทุกสถานะ" }),
            STATUS_OPTIONS.map((o) => /* @__PURE__ */ jsx("option", { value: o.value, children: o.label }, o.value))
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => setSortNewest((v) => !v),
          className: "px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50",
          children: sortNewest ? "มาใหม่ล่าสุด" : "เก่าสุด"
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden", children: loading ? /* @__PURE__ */ jsx("div", { className: "p-12 text-center text-slate-500", children: "กำลังโหลด…" }) : filteredAndSorted.length === 0 ? /* @__PURE__ */ jsx("div", { className: "p-12 text-center text-slate-500", children: "ไม่พบข้อมูล" }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 text-left text-sm text-slate-600", children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Date" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Customer" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Financial" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Status" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Action" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: filteredAndSorted.map((r) => {
        const health = getFinancialHealth(r.income, r.monthlyDebt);
        const lineUrl = getLineAddUrl(r.lineId);
        return /* @__PURE__ */ jsxs("tr", { className: "border-t border-slate-100 hover:bg-slate-50/50", children: [
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-sm text-slate-600 whitespace-nowrap", children: formatDate(r.createdAt) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-800", children: r.nickname || "-" }),
            /* @__PURE__ */ jsxs(
              "a",
              {
                href: `tel:${(r.phone || "").replace(/\D/g, "").replace(/^0/, "0")}`,
                className: "flex items-center gap-1 text-sm text-blue-600 hover:underline",
                children: [
                  /* @__PURE__ */ jsx(Phone, { className: "h-3.5 w-3.5" }),
                  r.phone || "-"
                ]
              }
            ),
            r.lineId ? lineUrl ? /* @__PURE__ */ jsxs(
              "a",
              {
                href: lineUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "flex items-center gap-1 text-sm text-green-600 hover:underline",
                children: [
                  /* @__PURE__ */ jsx(MessageCircle, { className: "h-3.5 w-3.5" }),
                  r.lineId
                ]
              }
            ) : /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-sm text-slate-500", children: [
              /* @__PURE__ */ jsx(MessageCircle, { className: "h-3.5 w-3.5" }),
              r.lineId
            ] }) : null
          ] }) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-slate-600", children: [
              (r.income || 0).toLocaleString("th-TH"),
              " / ",
              (r.monthlyDebt || 0).toLocaleString("th-TH")
            ] }),
            /* @__PURE__ */ jsx("span", { className: `ml-2 px-2 py-0.5 rounded text-xs font-medium ${health.color}`, children: health.label })
          ] }) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(
            "select",
            {
              value: r.status || "pending",
              onChange: (e) => handleStatusChange(r.id, e.target.value),
              disabled: updatingId === r.id,
              className: "text-sm px-2 py-1 rounded border border-slate-300",
              children: STATUS_OPTIONS.map((o) => /* @__PURE__ */ jsx("option", { value: o.value, children: o.label }, o.value))
            }
          ) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setDetailModal(r),
                className: "p-2 rounded-lg hover:bg-slate-100 text-slate-600 min-w-[44px] min-h-[44px] [touch-action:manipulation]",
                title: "ดูรายละเอียด",
                "aria-label": "ดูรายละเอียด",
                children: /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" })
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => handleDelete(r.id),
                disabled: deletingId === r.id,
                className: "p-2 rounded-lg hover:bg-red-50 text-red-600 min-w-[44px] min-h-[44px] [touch-action:manipulation]",
                title: "ลบ",
                "aria-label": "ลบคำขอนี้",
                children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
              }
            )
          ] }) })
        ] }, r.id);
      }) })
    ] }) }) }),
    detailModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-6 flex justify-between items-start border-b", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-blue-900", children: "รายละเอียดคำขอ" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setDetailModal(null),
            className: "p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] [touch-action:manipulation]",
            "aria-label": "ปิด",
            children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4 text-sm", children: [
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "วันที่:" }),
          " ",
          formatDate(detailModal.createdAt)
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "ชื่อเล่น:" }),
          " ",
          detailModal.nickname || "-"
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "เบอร์โทร:" }),
          " ",
          /* @__PURE__ */ jsx("a", { href: `tel:${detailModal.phone}`, className: "text-blue-600 hover:underline", children: detailModal.phone || "-" })
        ] }),
        detailModal.lineId && /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Line ID:" }),
          " ",
          getLineAddUrl(detailModal.lineId) ? /* @__PURE__ */ jsx("a", { href: getLineAddUrl(detailModal.lineId), target: "_blank", rel: "noopener noreferrer", className: "text-green-600 hover:underline", children: detailModal.lineId }) : detailModal.lineId
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "อาชีพ:" }),
          " ",
          OCCUPATION_LABELS[detailModal.occupation] || detailModal.occupation
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "รายได้/เดือน:" }),
          " ",
          (detailModal.income || 0).toLocaleString("th-TH"),
          " บาท"
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "ภาระหนี้/เดือน:" }),
          " ",
          (detailModal.monthlyDebt || 0).toLocaleString("th-TH"),
          " บาท"
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "ประวัติเครดิต:" }),
          " ",
          CREDIT_LABELS[detailModal.creditHistory] || detailModal.creditHistory
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "สถานะ:" }),
          " ",
          STATUS_OPTIONS.find((o) => o.value === (detailModal.status || "pending"))?.label || detailModal.status
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 border-t flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setDetailModal(null),
            className: "px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50",
            children: "ปิด"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => handleDelete(detailModal.id),
            disabled: deletingId === detailModal.id,
            className: "px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700",
            children: "ลบ"
          }
        )
      ] })
    ] }) }),
    toast && /* @__PURE__ */ jsx(
      "div",
      {
        className: `fixed bottom-6 right-6 z-[300] px-6 py-3 rounded-xl shadow-lg ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`,
        children: toast.msg
      }
    )
  ] });
}
export {
  AdminLoanRequests as default
};
