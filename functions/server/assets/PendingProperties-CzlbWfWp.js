import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Building2, Eye, Check, X } from "lucide-react";
import { k as getPendingPropertiesSnapshot, o as adminDb, T as approvePendingProperty, U as rejectPendingProperty } from "./server-build-C8MEOO73.js";
import "react-dom/server";
import "react-router";
import "isbot";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function PendingProperties() {
  const [pendingProperties, setPendingProperties] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [viewingProperty, setViewingProperty] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  useEffect(() => {
    const unsub = getPendingPropertiesSnapshot(setPendingProperties, adminDb);
    return () => unsub();
  }, []);
  const handleApprove = async (id) => {
    if (!window.confirm("ต้องการอนุมัติประกาศนี้หรือไม่?")) return;
    setProcessingId(id);
    try {
      await approvePendingProperty(id, adminDb);
      alert("อนุมัติประกาศสำเร็จ");
    } catch (error) {
      console.error("Error approving:", error);
      alert("เกิดข้อผิดพลาดในการอนุมัติ: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };
  const handleReject = async (id, reason = null) => {
    let finalReason = reason;
    if (finalReason === null) {
      const userReason = window.prompt("กรุณาระบุเหตุผลในการปฏิเสธ (ไม่บังคับ):", "");
      if (userReason === null) return;
      finalReason = userReason || "ข้อมูลไม่ผ่านเกณฑ์การตรวจสอบ";
    }
    setProcessingId(id);
    setRejectingId(id);
    try {
      await rejectPendingProperty(id, finalReason, adminDb);
      alert("ปฏิเสธประกาศสำเร็จ");
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("เกิดข้อผิดพลาดในการปฏิเสธ: " + error.message);
    } finally {
      setProcessingId(null);
      setRejectingId(null);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-blue-900", children: "ตรวจสอบประกาศใหม่" }),
      /* @__PURE__ */ jsxs("p", { className: "text-slate-600 text-sm mt-1", children: [
        "มีประกาศรออนุมัติ ",
        pendingProperties.length,
        " รายการ"
      ] })
    ] }) }),
    pendingProperties.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-12 text-center", children: [
      /* @__PURE__ */ jsx(Building2, { className: "h-16 w-16 mx-auto mb-4 text-slate-300" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-lg font-medium", children: "ไม่มีประกาศรออนุมัติ" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm mt-2", children: "ประกาศใหม่จะแสดงที่นี่" })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: pendingProperties.map((property) => {
      const coverImage = property.images && property.images.length > 0 ? property.images[0] : null;
      const isProcessing = processingId === property.id;
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: "bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition",
          children: [
            coverImage ? /* @__PURE__ */ jsx("div", { className: "aspect-video bg-slate-100", children: /* @__PURE__ */ jsx(
              "img",
              {
                src: coverImage,
                alt: property.title,
                className: "w-full h-full object-cover"
              }
            ) }) : /* @__PURE__ */ jsx("div", { className: "aspect-video bg-slate-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(Building2, { className: "h-12 w-12 text-slate-300" }) }),
            /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-blue-900 mb-2 line-clamp-2", children: property.title }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-2 mb-4 text-sm text-slate-600", children: [
                /* @__PURE__ */ jsxs("p", { children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "ประเภท:" }),
                  " ",
                  property.type
                ] }),
                /* @__PURE__ */ jsxs("p", { children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "ราคา:" }),
                  " ",
                  property.isRental ? `${(property.price / 1e3).toFixed(0)}K บาท/เดือน` : `${(property.price / 1e6)?.toFixed(1) ?? "-"} ล้านบาท`
                ] }),
                /* @__PURE__ */ jsxs("p", { children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "พื้นที่:" }),
                  " ",
                  property.locationDisplay
                ] }),
                property.area > 0 && /* @__PURE__ */ jsxs("p", { children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "ขนาด:" }),
                  " ",
                  property.area != null && property.area > 0 ? (Number(property.area) / 4).toFixed(1) : "-",
                  " ตร.ว."
                ] }),
                (property.bedrooms > 0 || property.bathrooms > 0) && /* @__PURE__ */ jsxs("p", { children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "ห้อง:" }),
                  " ",
                  property.bedrooms,
                  " นอน",
                  " ",
                  property.bathrooms,
                  " อาบ"
                ] }),
                property.tags && property.tags.length > 0 && /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1 mt-2", children: property.tags.map((tag, idx) => /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: "px-2 py-0.5 bg-blue-100 text-blue-900 text-xs rounded",
                    children: tag
                  },
                  idx
                )) })
              ] }),
              property.description && /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-4 line-clamp-3", children: property.description }),
              /* @__PURE__ */ jsxs("div", { className: "border-t border-slate-200 pt-4 mb-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-medium text-slate-500 mb-2", children: "ข้อมูลติดต่อ:" }),
                /* @__PURE__ */ jsxs("div", { className: "text-sm text-slate-700 space-y-1", children: [
                  /* @__PURE__ */ jsxs("p", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-medium", children: "ชื่อ:" }),
                    " ",
                    property.agentContact?.name || "-"
                  ] }),
                  /* @__PURE__ */ jsxs("p", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-medium", children: "โทร:" }),
                    " ",
                    property.agentContact?.phone || "-"
                  ] }),
                  property.agentContact?.lineId && /* @__PURE__ */ jsxs("p", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-medium", children: "LINE:" }),
                    " ",
                    property.agentContact.lineId
                  ] })
                ] })
              ] }),
              property.images && property.images.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mb-4 text-xs text-slate-500", children: [
                "มีรูปภาพ ",
                property.images.length,
                " รูป"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => setViewingProperty(property),
                    className: "flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-2",
                    children: [
                      /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" }),
                      "ดูรายละเอียด"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => handleApprove(property.id),
                    disabled: isProcessing,
                    className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2",
                    children: [
                      /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }),
                      "อนุมัติ"
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => handleReject(property.id),
                    disabled: isProcessing,
                    className: "px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2",
                    children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
                  }
                )
              ] })
            ] })
          ]
        },
        property.id
      );
    }) }),
    viewingProperty && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-blue-900", children: "รายละเอียดประกาศ" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setViewingProperty(null),
            className: "p-2 hover:bg-slate-100 rounded-lg transition",
            children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5 text-slate-600" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-6", children: [
        viewingProperty.images && viewingProperty.images.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-slate-700 mb-3", children: "รูปภาพ" }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-4", children: viewingProperty.images.map((img, idx) => /* @__PURE__ */ jsx("div", { className: "aspect-square rounded-lg overflow-hidden bg-slate-100", children: /* @__PURE__ */ jsx("img", { src: img, alt: `Image ${idx + 1}`, width: 200, height: 200, className: "w-full h-full object-cover" }) }, idx)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500", children: "ชื่อประกาศ" }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-900 font-semibold", children: viewingProperty.title })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500", children: "ประเภท" }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-900", children: viewingProperty.type })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500", children: "ราคา" }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-900", children: viewingProperty.isRental ? `${(viewingProperty.price / 1e3).toFixed(0)}K บาท/เดือน` : `${(viewingProperty.price / 1e6)?.toFixed(1) ?? "-"} ล้านบาท` })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500", children: "พื้นที่" }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-900", children: viewingProperty.locationDisplay })
          ] }),
          viewingProperty.area > 0 && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500", children: "ขนาด" }),
            /* @__PURE__ */ jsxs("p", { className: "text-slate-900", children: [
              viewingProperty.area != null && viewingProperty.area > 0 ? (Number(viewingProperty.area) / 4).toFixed(1) : "-",
              " ตร.ว."
            ] })
          ] }),
          (viewingProperty.bedrooms > 0 || viewingProperty.bathrooms > 0) && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500", children: "ห้อง" }),
            /* @__PURE__ */ jsxs("p", { className: "text-slate-900", children: [
              viewingProperty.bedrooms,
              " นอน ",
              viewingProperty.bathrooms,
              " อาบ"
            ] })
          ] })
        ] }),
        viewingProperty.description && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500 mb-2", children: "รายละเอียด" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-700 whitespace-pre-wrap", children: viewingProperty.description })
        ] }),
        viewingProperty.tags && viewingProperty.tags.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500 mb-2", children: "แท็ก" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: viewingProperty.tags.map((tag, idx) => /* @__PURE__ */ jsx(
            "span",
            {
              className: "px-3 py-1 bg-blue-100 text-blue-900 text-sm rounded-full",
              children: tag
            },
            idx
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-slate-200 pt-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500 mb-3", children: "ข้อมูลติดต่อ" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: "ชื่อ" }),
              /* @__PURE__ */ jsx("p", { className: "text-slate-900", children: viewingProperty.agentContact?.name || "-" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: "โทรศัพท์" }),
              /* @__PURE__ */ jsx("p", { className: "text-slate-900", children: viewingProperty.agentContact?.phone || "-" })
            ] }),
            viewingProperty.agentContact?.lineId && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: "LINE ID" }),
              /* @__PURE__ */ jsx("p", { className: "text-slate-900", children: viewingProperty.agentContact.lineId })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 pt-4 border-t border-slate-200", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => {
                handleApprove(viewingProperty.id);
                setViewingProperty(null);
              },
              disabled: processingId === viewingProperty.id,
              className: "flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition",
              children: "อนุมัติประกาศ"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => {
                const reason = window.prompt("กรุณาระบุเหตุผลในการปฏิเสธ (ไม่บังคับ):", "");
                if (reason !== null) {
                  handleReject(viewingProperty.id, reason || "ข้อมูลไม่ผ่านเกณฑ์การตรวจสอบ");
                  setViewingProperty(null);
                }
              },
              disabled: processingId === viewingProperty.id,
              className: "flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition",
              children: "ปฏิเสธ"
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
export {
  PendingProperties as default
};
