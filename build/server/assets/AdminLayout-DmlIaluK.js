import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, Outlet, NavLink } from "react-router";
import { u as useAdminAuth } from "./server-build-D_48fWql.js";
import { LayoutDashboard, Building2, FileText, FileCheck, Images, LayoutList, MapPin, BookOpen, Users, Settings, Inbox, CreditCard, Activity, Menu, X, Home, LogOut } from "lucide-react";
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
const allNavItems = [
  { to: "/sps-internal-admin", end: true, label: "แดชบอร์ด", icon: LayoutDashboard, roles: ["super_admin", "admin", "member"] },
  { to: "/sps-internal-admin/properties", end: false, label: "จัดการทรัพย์", icon: Building2, roles: ["super_admin", "admin"] },
  { to: "/sps-internal-admin/my-properties", end: false, label: "ประกาศของฉัน", icon: FileText, roles: ["member"] },
  { to: "/sps-internal-admin/properties/new", end: true, label: "เพิ่มประกาศใหม่", icon: Building2, roles: ["member"] },
  { to: "/sps-internal-admin/pending-properties", end: false, label: "ตรวจสอบประกาศ", icon: FileCheck, roles: ["super_admin", "admin"] },
  { to: "/sps-internal-admin/hero-slides", end: false, label: "จัดการสไลด์หน้าแรก", icon: Images, roles: ["super_admin", "admin"] },
  { to: "/sps-internal-admin/homepage-sections", end: false, label: "จัดการหน้าแรก", icon: LayoutList, roles: ["super_admin", "admin"] },
  { to: "/sps-internal-admin/popular-locations", end: false, label: "จัดการทำเลยอดฮิต", icon: MapPin, roles: ["super_admin", "admin"] },
  { to: "/sps-internal-admin/blogs", end: false, label: "จัดการบทความ", icon: BookOpen, roles: ["super_admin", "admin"] },
  { to: "/sps-internal-admin/users", end: false, label: "จัดการสมาชิก", icon: Users, roles: ["super_admin"] },
  { to: "/sps-internal-admin/settings", end: false, label: "การตั้งค่าระบบ", icon: Settings, roles: ["super_admin"] },
  { to: "/sps-internal-admin/leads", end: false, label: "จัดการนัดหมาย", icon: Inbox, roles: ["super_admin", "admin", "member"] },
  { to: "/sps-internal-admin/loan-requests", end: false, label: "จัดการสินเชื่อ", icon: CreditCard, roles: ["super_admin"] },
  { to: "/sps-internal-admin/activities", end: false, label: "บันทึกกิจกรรม", icon: Activity, roles: ["super_admin", "admin"] }
];
function SidebarContent({ navItems, userRole, getRoleDisplayName, handleLogout, onNavClick = () => {
} }) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "p-6 border-b border-blue-800", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-bold text-lg", children: "SPS Admin" }),
      /* @__PURE__ */ jsx("p", { className: "text-blue-200 text-sm", children: "จัดการระบบ" }),
      userRole && /* @__PURE__ */ jsx("p", { className: "text-yellow-400 text-xs mt-1 font-medium", children: getRoleDisplayName() })
    ] }),
    /* @__PURE__ */ jsx("nav", { className: "flex-1 p-4 space-y-1 overflow-y-auto admin-scrollbar", children: navItems.map(({ to, end, label, icon: Icon }) => /* @__PURE__ */ jsxs(
      NavLink,
      {
        to,
        end,
        onClick: onNavClick,
        className: ({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${isActive ? "bg-yellow-400 text-yellow-900 font-semibold" : "text-blue-100 hover:bg-blue-800"}`,
        children: [
          /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5 shrink-0" }),
          /* @__PURE__ */ jsx("span", { className: "truncate", children: label })
        ]
      },
      to
    )) }),
    /* @__PURE__ */ jsxs("div", { className: "p-4 border-t border-blue-800 space-y-1", children: [
      /* @__PURE__ */ jsxs(
        NavLink,
        {
          to: "/",
          onClick: onNavClick,
          className: "flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 text-sm transition",
          children: [
            /* @__PURE__ */ jsx(Home, { className: "h-5 w-5 shrink-0" }),
            /* @__PURE__ */ jsx("span", { children: "กลับเว็บหลัก" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: handleLogout,
          className: "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 text-sm transition",
          children: [
            /* @__PURE__ */ jsx(LogOut, { className: "h-5 w-5 shrink-0" }),
            /* @__PURE__ */ jsx("span", { children: "ออกจากระบบ" })
          ]
        }
      )
    ] })
  ] });
}
function AdminLayout() {
  const { logout, userRole, hasRole } = useAdminAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleLogout = async () => {
    await logout();
    navigate("/sps-internal-admin/login", { replace: true });
  };
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return hasRole(item.roles);
  });
  const getRoleDisplayName = () => {
    switch (userRole) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "member":
        return "สมาชิก";
      default:
        return "ผู้ใช้";
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-slate-50 flex", children: [
    /* @__PURE__ */ jsx("aside", { className: "hidden lg:flex w-64 bg-blue-900 text-white shrink-0 flex-col min-h-screen sticky top-0 self-start h-screen", children: /* @__PURE__ */ jsx(
      SidebarContent,
      {
        navItems,
        userRole,
        getRoleDisplayName,
        handleLogout
      }
    ) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col min-w-0", children: [
      /* @__PURE__ */ jsxs("header", { className: "lg:hidden flex items-center gap-4 px-4 py-3 bg-blue-900 text-white sticky top-0 z-30 shadow-md shrink-0", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setDrawerOpen(true),
            className: "p-2 rounded-lg hover:bg-blue-800 transition",
            "aria-label": "เปิดเมนู",
            children: /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5" })
          }
        ),
        /* @__PURE__ */ jsx("h1", { className: "font-bold text-lg tracking-tight", children: "SPS Admin" }),
        userRole && /* @__PURE__ */ jsx("span", { className: "ml-auto text-xs font-medium text-yellow-400 uppercase tracking-wide", children: getRoleDisplayName() })
      ] }),
      /* @__PURE__ */ jsx("main", { className: "flex-1 overflow-auto p-4 sm:p-6 lg:p-8", children: /* @__PURE__ */ jsx(Outlet, {}) })
    ] }),
    drawerOpen && /* @__PURE__ */ jsx(
      "div",
      {
        className: "fixed inset-0 bg-black/60 z-40 lg:hidden",
        onClick: () => setDrawerOpen(false),
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxs(
      "aside",
      {
        className: `
          fixed top-0 left-0 h-full w-72 bg-blue-900 text-white z-50 flex flex-col
          transition-transform duration-300 ease-in-out lg:hidden
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
        `,
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 pt-5 pb-0", children: [
            /* @__PURE__ */ jsx("span", { className: "font-bold text-lg", children: "SPS Admin" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setDrawerOpen(false),
                className: "p-1.5 rounded-lg hover:bg-blue-800 transition text-blue-200",
                "aria-label": "ปิดเมนู",
                children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" })
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            SidebarContent,
            {
              navItems,
              userRole,
              getRoleDisplayName,
              handleLogout,
              onNavClick: () => setDrawerOpen(false)
            }
          )
        ]
      }
    )
  ] });
}
export {
  AdminLayout as default
};
