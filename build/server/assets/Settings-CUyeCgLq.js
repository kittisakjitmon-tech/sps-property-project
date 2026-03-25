import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { u as useAdminAuth, X as getSystemSettingsSnapshot, Y as updateSystemSettings, o as adminDb } from "./server-build-C8MEOO73.js";
import { AlertCircle, Settings as Settings$1, Check, Globe, Mail, Database, Shield, Info, Save } from "lucide-react";
import "react-dom/server";
import "react-router";
import "isbot";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function Settings() {
  const { isSuperAdmin } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [settings, setSettings] = useState({
    siteName: "SPS Property Solution",
    siteDescription: "ระบบค้นหาและจัดการอสังหาริมทรัพย์",
    contactEmail: "",
    contactPhone: "",
    maintenanceMode: false,
    allowPublicRegistration: true,
    maxPropertiesPerUser: 10,
    autoApproveProperties: false
  });
  useEffect(() => {
    if (!isSuperAdmin()) return;
    const unsub = getSystemSettingsSnapshot((data) => {
      setSettings({
        siteName: data.siteName || "SPS Property Solution",
        siteDescription: data.siteDescription || "ระบบค้นหาและจัดการอสังหาริมทรัพย์",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
        maintenanceMode: data.maintenanceMode || false,
        allowPublicRegistration: data.allowPublicRegistration !== false,
        maxPropertiesPerUser: data.maxPropertiesPerUser || 10,
        autoApproveProperties: data.autoApproveProperties || false
      });
      setInitialLoading(false);
    }, adminDb);
    return () => unsub();
  }, [isSuperAdmin]);
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3e3);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5e3);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);
  const handleSave = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await updateSystemSettings(settings, adminDb);
      setSuccessMessage("บันทึกการตั้งค่าสำเร็จ");
    } catch (error) {
      console.error("Error saving settings:", error);
      setErrorMessage("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  if (!isSuperAdmin()) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 text-center", children: [
      /* @__PURE__ */ jsx(AlertCircle, { className: "h-12 w-12 text-red-600 mx-auto mb-4" }),
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-red-900 mb-2", children: "ไม่มีสิทธิ์เข้าถึง" }),
      /* @__PURE__ */ jsx("p", { className: "text-red-700", children: "เฉพาะ Super Admin เท่านั้นที่สามารถเข้าถึงหน้านี้ได้" })
    ] }) });
  }
  if (initialLoading) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-5xl mx-auto", children: /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลดการตั้งค่า…" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-2", children: [
        /* @__PURE__ */ jsx(Settings$1, { className: "h-8 w-8 text-blue-900" }),
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-blue-900", children: "การตั้งค่าระบบ" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "จัดการการตั้งค่าระบบและค่าคอนฟิกต่างๆ" })
    ] }),
    successMessage && /* @__PURE__ */ jsxs("div", { className: "mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(Check, { className: "h-5 w-5 text-green-600 flex-shrink-0" }),
      /* @__PURE__ */ jsx("p", { className: "text-green-800 font-medium", children: successMessage })
    ] }),
    errorMessage && /* @__PURE__ */ jsxs("div", { className: "mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3", children: [
      /* @__PURE__ */ jsx(AlertCircle, { className: "h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsx("p", { className: "text-red-800 flex-1", children: errorMessage })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-blue-900 px-6 py-4 border-b border-blue-800", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Globe, { className: "h-5 w-5 text-white" }),
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-white", children: "การตั้งค่าทั่วไป" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ชื่อเว็บไซต์" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: settings.siteName,
                onChange: (e) => setSettings({ ...settings, siteName: e.target.value }),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900",
                placeholder: "ชื่อเว็บไซต์"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "คำอธิบายเว็บไซต์" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                value: settings.siteDescription,
                onChange: (e) => setSettings({ ...settings, siteDescription: e.target.value }),
                rows: 3,
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900",
                placeholder: "คำอธิบายเว็บไซต์"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-blue-900 px-6 py-4 border-b border-blue-800", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Mail, { className: "h-5 w-5 text-white" }),
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-white", children: "ข้อมูลติดต่อ" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "อีเมลติดต่อ" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "email",
                value: settings.contactEmail,
                onChange: (e) => setSettings({ ...settings, contactEmail: e.target.value }),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900",
                placeholder: "contact@example.com"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "เบอร์โทรศัพท์" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "tel",
                value: settings.contactPhone,
                onChange: (e) => setSettings({ ...settings, contactPhone: e.target.value }),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900",
                placeholder: "02-XXX-XXXX"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-blue-900 px-6 py-4 border-b border-blue-800", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Database, { className: "h-5 w-5 text-white" }),
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-white", children: "การตั้งค่าระบบ" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "โหมดบำรุงรักษา" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: "เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าถึงเว็บไซต์ได้" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: settings.maintenanceMode,
                  onChange: (e) => setSettings({ ...settings, maintenanceMode: e.target.checked }),
                  className: "sr-only peer"
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-900/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "อนุญาตให้สมัครสมาชิก" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: "อนุญาตให้ผู้ใช้ทั่วไปสามารถสมัครสมาชิกได้" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: settings.allowPublicRegistration,
                  onChange: (e) => setSettings({ ...settings, allowPublicRegistration: e.target.checked }),
                  className: "sr-only peer"
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-900/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "อนุมัติประกาศอัตโนมัติ" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: "ประกาศใหม่จะถูกอนุมัติอัตโนมัติโดยไม่ต้องรอตรวจสอบ" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: settings.autoApproveProperties,
                  onChange: (e) => setSettings({ ...settings, autoApproveProperties: e.target.checked }),
                  className: "sr-only peer"
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-900/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "จำนวนประกาศสูงสุดต่อผู้ใช้" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                min: "1",
                max: "100",
                value: settings.maxPropertiesPerUser,
                onChange: (e) => setSettings({ ...settings, maxPropertiesPerUser: parseInt(e.target.value) || 0 }),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: "จำนวนประกาศที่ผู้ใช้แต่ละคนสามารถสร้างได้สูงสุด" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-blue-900 px-6 py-4 border-b border-blue-800", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Shield, { className: "h-5 w-5 text-white" }),
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-white", children: "ความปลอดภัย" })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "p-6", children: /* @__PURE__ */ jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3", children: [
          /* @__PURE__ */ jsx(Info, { className: "h-5 w-5 text-yellow-900 flex-shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-yellow-900 mb-1", children: "การตั้งค่าความปลอดภัย" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-yellow-800", children: "การตั้งค่าความปลอดภัยจะถูกจัดการผ่าน Firestore Security Rules และ Firebase Authentication" })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center justify-end gap-3", children: /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: handleSave,
          disabled: loading,
          className: "px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
          children: [
            /* @__PURE__ */ jsx(Save, { className: "h-5 w-5" }),
            loading ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"
          ]
        }
      ) })
    ] })
  ] });
}
export {
  Settings as default
};
