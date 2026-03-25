import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { u as useAdminAuth, c as getPropertiesSnapshot, Z as PropertyCard } from "./server-build-C8MEOO73.js";
import { Plus, FileText } from "lucide-react";
import "react-dom/server";
import "isbot";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function MyProperties() {
  const { user, isMember } = useAdminAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user || !isMember()) return;
    const unsub = getPropertiesSnapshot((allProperties) => {
      const myProperties = allProperties.filter((p) => {
        return p.createdBy === user.uid;
      });
      setProperties(myProperties);
      setLoading(false);
    });
    return () => unsub();
  }, [user, isMember]);
  if (!isMember()) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto", children: /* @__PURE__ */ jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-red-700", children: "เฉพาะสมาชิกเท่านั้นที่สามารถเข้าถึงหน้านี้ได้" }) }) });
  }
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-6xl mx-auto", children: /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลดข้อมูล…" }) });
  }
  const available = properties.filter((p) => p.status === "available");
  const pending = properties.filter((p) => p.status === "pending");
  const sold = properties.filter((p) => p.status === "sold");
  const reserved = properties.filter((p) => p.status === "reserved");
  return /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-blue-900 mb-2", children: "ประกาศของฉัน" }),
        /* @__PURE__ */ jsxs("p", { className: "text-slate-600", children: [
          "จัดการประกาศทั้งหมด (",
          properties.length,
          " รายการ)"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/sps-internal-admin/properties/new",
          className: "flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition",
          children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" }),
            "เพิ่มประกาศใหม่"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-1", children: "ว่าง" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-green-600", children: available.length })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-1", children: "ติดจอง" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-yellow-600", children: reserved.length })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-1", children: "ขายแล้ว" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-blue-600", children: sold.length })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-1", children: "รออนุมัติ" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-orange-600", children: pending.length })
      ] })
    ] }),
    properties.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-12 text-center", children: [
      /* @__PURE__ */ jsx(FileText, { className: "h-16 w-16 mx-auto mb-4 text-slate-400" }),
      /* @__PURE__ */ jsx("p", { className: "text-lg font-medium text-slate-700 mb-2", children: "ยังไม่มีประกาศ" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-6", children: "เริ่มต้นด้วยการเพิ่มประกาศแรกของคุณ" }),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/sps-internal-admin/properties/new",
          className: "inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition",
          children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" }),
            "เพิ่มประกาศใหม่"
          ]
        }
      )
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", children: properties.map((property) => /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(PropertyCard, { property }),
      /* @__PURE__ */ jsx(
        Link,
        {
          to: `/sps-internal-admin/properties/edit/${property.id}`,
          className: "absolute inset-0",
          "aria-label": `แก้ไข ${property.title}`
        }
      )
    ] }, property.id)) })
  ] });
}
export {
  MyProperties as default
};
