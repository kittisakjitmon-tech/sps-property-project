import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import { k as getActivitiesSnapshot } from "./server-build-D_48fWql.js";
import { b as getUsernameFromEmail, f as formatRoleDisplay, a as getActionDisplay, c as getActivityBadgeClass, g as getActionCategory } from "./activityActionMap-CGU_PTkb.js";
import "node:stream";
import "@react-router/node";
import "react-router";
import "isbot";
import "react-dom/server";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
const ACTIVITY_TYPES = [
  { value: "", label: "ทุกประเภท" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" }
];
function formatTimestamp(ts) {
  if (!ts?.toDate) return "-";
  const d = ts.toDate();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
function actionMatchesFilter(action, filterType) {
  if (!filterType) return true;
  const a = (action || "").toUpperCase();
  if (filterType === "create") return a.includes("CREATE");
  if (filterType === "update") return a.includes("UPDATE") || a.includes("ADD");
  if (filterType === "delete") return a.includes("DELETE");
  if (filterType === "login") return a.includes("LOGIN");
  return true;
}
function Avatar({ email }) {
  const username = getUsernameFromEmail(email);
  const letter = username?.charAt(0)?.toUpperCase() || "?";
  return /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-semibold text-sm shrink-0", children: letter });
}
function UserDisplay({ email, role }) {
  const username = getUsernameFromEmail(email);
  const roleDisplay = formatRoleDisplay(role);
  return /* @__PURE__ */ jsxs("div", { className: "cursor-help", title: email, children: [
    /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-800", children: username }),
    /* @__PURE__ */ jsxs("span", { className: "text-slate-400 font-normal", children: [
      " (",
      roleDisplay,
      ")"
    ] })
  ] });
}
function ActivityLogsPage() {
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [limitCount, setLimitCount] = useState(20);
  useEffect(() => {
    const unsub = getActivitiesSnapshot(setActivities, limitCount);
    return () => unsub();
  }, [limitCount]);
  const uniqueUsers = useMemo(() => {
    const emails = [...new Set(activities.map((a) => a.user?.email).filter(Boolean))];
    return emails.map((email) => {
      const user = activities.find((a) => a.user?.email === email)?.user;
      return {
        email,
        label: `${getUsernameFromEmail(email)} (${formatRoleDisplay(user?.role)})`
      };
    });
  }, [activities]);
  const filteredLogs = useMemo(() => {
    return activities.filter((log) => {
      const matchType = actionMatchesFilter(log.action, filterType);
      const matchUser = !filterUser || log.user?.email === filterUser;
      return matchType && matchUser;
    });
  }, [activities, filterType, filterUser]);
  const handleExportCSV = () => {
    alert("Export CSV (Mock) - ฟีเจอร์นี้จะเชื่อมต่อกับ API ในอนาคต");
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight", children: "บันทึกกิจกรรมระบบ" }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: handleExportCSV,
          className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors border border-slate-200",
          children: [
            /* @__PURE__ */ jsx(Download, { className: "h-5 w-5" }),
            "Export CSV"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "ประเภทกิจกรรม:" }),
        /* @__PURE__ */ jsx(
          "select",
          {
            value: filterType,
            onChange: (e) => setFilterType(e.target.value),
            className: "px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            children: ACTIVITY_TYPES.map((opt) => /* @__PURE__ */ jsx("option", { value: opt.value, children: opt.label }, opt.value || "all"))
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "ผู้ใช้งาน:" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: filterUser,
            onChange: (e) => setFilterUser(e.target.value),
            className: "px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]",
            children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "ทุกคน" }),
              uniqueUsers.map((u) => /* @__PURE__ */ jsx("option", { value: u.email, children: u.label }, u.email))
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 text-left text-xs font-medium text-slate-600 uppercase tracking-wider", children: [
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "User" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "Action" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "Target" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "Timestamp" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "Details" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: filteredLogs.map((log) => /* @__PURE__ */ jsxs("tr", { className: "border-t border-gray-100 hover:bg-slate-50/50 transition-colors", children: [
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx(Avatar, { email: log.user?.email }),
            /* @__PURE__ */ jsx(UserDisplay, { email: log.user?.email, role: log.user?.role })
          ] }) }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: `inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getActivityBadgeClass(getActionCategory(log.action))}`,
              children: getActionDisplay(log.action)
            }
          ) }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-slate-700", children: log.target || "-" }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-slate-600 text-sm whitespace-nowrap", children: formatTimestamp(log.timestamp) }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-slate-600 text-sm", children: log.details || "-" })
        ] }, log.id)) })
      ] }) }),
      filteredLogs.length === 0 && /* @__PURE__ */ jsx("div", { className: "px-6 py-12 text-center text-slate-500", children: activities.length === 0 ? "ยังไม่มีรายการกิจกรรม" : "ไม่พบรายการที่ตรงกับตัวกรอง" }),
      activities.length >= limitCount && /* @__PURE__ */ jsx("div", { className: "px-6 py-4 border-t border-gray-100 bg-slate-50 flex justify-center", children: /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setLimitCount((prev) => prev + 20),
          className: "px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition shadow-sm text-sm font-medium",
          children: "โหลดเพิ่มเติม (Load More)"
        }
      ) })
    ] })
  ] });
}
export {
  ActivityLogsPage as default
};
