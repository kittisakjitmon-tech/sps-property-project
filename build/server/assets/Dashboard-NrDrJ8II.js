import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "react-router";
import { Loader2, DatabaseZap, Plus, DollarSign, Building2, Users, FileCheck, ChevronRight, Phone, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, BarChart, Bar } from "recharts";
import { useState, useEffect, useMemo } from "react";
import { e as getPropertiesSnapshot, h as getLeadsSnapshot, j as getViewingRequestsSnapshot, k as getActivitiesSnapshot, l as getPendingPropertiesSnapshot, m as getPropertyViewsSnapshot, n as getPropertyLabel, o as getPropertiesOnce, P as PROPERTY_TYPES, p as adminDb } from "./server-build-D_48fWql.js";
import { g as getActionCategory, a as getActionDisplay, b as getUsernameFromEmail, f as formatRoleDisplay, c as getActivityBadgeClass } from "./activityActionMap-CGU_PTkb.js";
import { writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { g as generateAutoTags } from "./autoTags-CW6uT_27.js";
import "node:stream";
import "@react-router/node";
import "isbot";
import "react-dom/server";
import "firebase/auth";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
const DASHBOARD_ACTIVITY_LIMIT = 5;
const DASHBOARD_LEADS_LIMIT = 5;
const DAY_NAMES = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TOP_VIEWS_LIMIT = 10;
function mergeContacts(leads, viewingRequests) {
  const fromLeads = (leads || []).map((l) => ({
    id: `lead-${l.id}`,
    name: l.name || l.customerName || "ลูกค้า",
    phone: l.phone || l.tel || "-",
    property: l.propertyTitle || l.propertyId || "-",
    status: l.contacted ? "ติดต่อแล้ว" : "รอติดต่อ",
    createdAt: l.createdAt,
    source: "leads"
  }));
  const fromViewing = (viewingRequests || []).map((v) => ({
    id: `view-${v.id}`,
    name: v.name || "ลูกค้า",
    phone: v.phone || "-",
    property: v.propertyName || v.propertyId || "-",
    status: v.status === "contacted" ? "ติดต่อแล้ว" : "รอติดต่อ",
    createdAt: v.createdAt,
    source: "viewing_requests"
  }));
  const merged = [...fromLeads, ...fromViewing];
  merged.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return merged;
}
function getViewTime(v) {
  const ts = v.timestamp?.toMillis?.();
  if (ts) return ts;
  if (v.date) return new Date(v.date).getTime();
  return 0;
}
function filterViewsByRange(views, rangeKey) {
  if (!views || views.length === 0) return [];
  const now = /* @__PURE__ */ new Date();
  const cutoff = new Date(now);
  if (rangeKey === "7d") cutoff.setDate(now.getDate() - 7);
  else if (rangeKey === "30d") cutoff.setDate(now.getDate() - 30);
  else if (rangeKey === "6m") cutoff.setMonth(now.getMonth() - 6);
  else if (rangeKey === "1y") cutoff.setFullYear(now.getFullYear() - 1);
  const cutoffTime = cutoff.getTime();
  return views.filter((v) => getViewTime(v) >= cutoffTime);
}
function buildViewsChartData(views, rangeKey) {
  const filtered = filterViewsByRange(views, rangeKey);
  const now = /* @__PURE__ */ new Date();
  if (rangeKey === "7d" || rangeKey === "30d") {
    const days = rangeKey === "7d" ? 7 : 30;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().slice(0, 10);
      const count = filtered.filter((v) => {
        const vDate = v.date || (getViewTime(v) ? new Date(getViewTime(v)).toISOString().slice(0, 10) : "");
        return vDate === dateStr;
      }).length;
      result.push({
        name: rangeKey === "7d" ? DAY_NAMES[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`,
        views: count,
        date: dateStr
      });
    }
    return result;
  }
  if (rangeKey === "6m" || rangeKey === "1y") {
    const months = rangeKey === "6m" ? 6 : 12;
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = filtered.filter((v) => {
        const t = getViewTime(v);
        if (!t) return false;
        const vd = new Date(t);
        return vd.getFullYear() === year && vd.getMonth() === month;
      }).length;
      result.push({
        name: `${MONTH_NAMES[month]} ${String(year).slice(-2)}`,
        views: count,
        year,
        month
      });
    }
    return result;
  }
  return [];
}
function buildTopPropertiesByViews(views, properties, limit = TOP_VIEWS_LIMIT) {
  const countByProperty = {};
  (views || []).forEach((v) => {
    const id = v.propertyId || "unknown";
    countByProperty[id] = (countByProperty[id] || 0) + 1;
  });
  const metaById = {};
  (properties || []).forEach((p) => {
    metaById[p.id] = {
      title: p.title || "(ไม่ระบุชื่อ)",
      typeLabel: getPropertyLabel(p.type) || p.type || "อื่นๆ",
      province: p.location && p.location.province || ""
    };
  });
  return Object.entries(countByProperty).map(([propertyId, viewsCount]) => ({
    propertyId,
    views: viewsCount,
    title: metaById[propertyId] && metaById[propertyId].title || propertyId,
    typeLabel: metaById[propertyId] && metaById[propertyId].typeLabel || "-",
    province: metaById[propertyId] && metaById[propertyId].province || "-"
  })).sort((a, b) => b.views - a.views).slice(0, limit);
}
function buildPropertyTypeDataWithViews(properties, views) {
  const countByType = {};
  (properties || []).forEach((p) => {
    const t = p.type || "อื่นๆ";
    countByType[t] = { count: (countByType[t]?.count || 0) + 1, views: countByType[t]?.views || 0 };
  });
  const viewsByType = {};
  (views || []).forEach((v) => {
    const t = v.type || "อื่นๆ";
    viewsByType[t] = (viewsByType[t] || 0) + 1;
  });
  Object.keys(viewsByType).forEach((t) => {
    if (!countByType[t]) countByType[t] = { count: 0, views: 0 };
    countByType[t].views = viewsByType[t];
  });
  Object.keys(countByType).forEach((t) => {
    if (countByType[t].views === void 0) countByType[t].views = 0;
  });
  const colors = ["#1e3a8a", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
  return Object.entries(countByType).map(([typeKey, { count, views: views2 }], i) => ({
    typeKey,
    name: getPropertyLabel(typeKey) || typeKey,
    count,
    views: views2 || 0,
    color: colors[i % colors.length]
  })).sort((a, b) => b.count - a.count);
}
function useDashboardData(viewRange = "7d", firestore) {
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [viewingRequests, setViewingRequests] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    let firstLoad = true;
    const unsubP = getPropertiesSnapshot((list) => {
      if (mounted) setProperties(list);
    }, firestore);
    const unsubL = getLeadsSnapshot((list) => {
      if (mounted) setLeads(list);
    }, firestore);
    const unsubV = getViewingRequestsSnapshot((list) => {
      if (mounted) setViewingRequests(list);
    }, firestore);
    const unsubA = getActivitiesSnapshot((list) => {
      if (mounted) setActivities(list);
    }, 20, firestore);
    const unsubPending = getPendingPropertiesSnapshot((list) => {
      if (mounted) setPendingProperties(list);
    }, firestore);
    const unsubViews = getPropertyViewsSnapshot((list) => {
      if (mounted) setViews(list);
    }, firestore);
    const timer = setTimeout(() => {
      if (mounted && firstLoad) {
        firstLoad = false;
        setLoading(false);
      }
    }, 800);
    return () => {
      mounted = false;
      clearTimeout(timer);
      unsubP();
      unsubL();
      unsubV();
      unsubA();
      unsubPending();
      unsubViews();
    };
  }, [firestore]);
  const contacts = useMemo(() => mergeContacts(leads, viewingRequests), [leads, viewingRequests]);
  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const totalAssetValue = properties.reduce((sum, p) => {
      const price = typeof p.price === "string" ? parseInt(p.price.replace(/,/g, ""), 10) : Number(p.price);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);
    const activeLeads = contacts.filter((c) => c.status === "รอติดต่อ").length;
    const now = /* @__PURE__ */ new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const closedThisMonth = properties.filter((p) => {
      if (p.status !== "sold") return false;
      const updated = p.updatedAt?.toMillis?.();
      if (!updated) return false;
      return new Date(updated) >= thisMonthStart;
    }).length;
    return { totalProperties, totalAssetValue, activeLeads, closedThisMonth };
  }, [properties, contacts]);
  const filteredViews = useMemo(() => filterViewsByRange(views, viewRange), [views, viewRange]);
  const viewsChartData = useMemo(() => buildViewsChartData(views, viewRange), [views, viewRange]);
  const topPropertiesByViews = useMemo(
    () => buildTopPropertiesByViews(filteredViews, properties, TOP_VIEWS_LIMIT),
    [filteredViews, properties]
  );
  const propertyTypeDataWithViews = useMemo(
    () => buildPropertyTypeDataWithViews(properties, views),
    [properties, views]
  );
  const recentLeads = useMemo(() => contacts.slice(0, DASHBOARD_LEADS_LIMIT), [contacts]);
  const recentActivities = useMemo(() => activities.slice(0, DASHBOARD_ACTIVITY_LIMIT), [activities]);
  return {
    loading,
    properties,
    contacts,
    activities,
    pendingProperties,
    stats,
    viewsChartData,
    topPropertiesByViews,
    propertyTypeDataWithViews,
    recentLeads,
    recentActivities
  };
}
function StatCard({ title, value, icon: Icon, iconBg, href }) {
  const formattedValue = typeof value === "number" && value >= 1e6 ? `${(value / 1e6).toFixed(1)} ล้าน` : value.toLocaleString("th-TH");
  const content = /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-600 truncate", children: title }),
      /* @__PURE__ */ jsx("p", { className: "text-2xl sm:text-3xl font-bold text-blue-900 mt-1", children: formattedValue })
    ] }),
    /* @__PURE__ */ jsx("div", { className: `flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`, children: /* @__PURE__ */ jsx(Icon, { className: "h-6 w-6 text-blue-900" }) })
  ] });
  const cardClass = "bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200";
  if (href) {
    return /* @__PURE__ */ jsx(Link, { to: href, className: `block ${cardClass}`, children: content });
  }
  return /* @__PURE__ */ jsx("div", { className: cardClass, children: content });
}
function LeadAvatar({ name }) {
  const initial = name?.charAt(0) || "?";
  return /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-semibold text-sm shrink-0", children: initial });
}
function DashboardSkeleton() {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8 animate-pulse", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
      /* @__PURE__ */ jsx("div", { className: "h-9 w-48 bg-slate-200 rounded-lg" }),
      /* @__PURE__ */ jsx("div", { className: "h-10 w-32 bg-slate-200 rounded-xl" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6", children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-6", children: [
      /* @__PURE__ */ jsx("div", { className: "h-4 w-24 bg-slate-200 rounded mb-4" }),
      /* @__PURE__ */ jsx("div", { className: "h-9 w-20 bg-slate-200 rounded" })
    ] }, i)) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 h-[380px]", children: [
        /* @__PURE__ */ jsx("div", { className: "h-5 w-40 bg-slate-200 rounded mb-2" }),
        /* @__PURE__ */ jsx("div", { className: "h-4 w-32 bg-slate-100 rounded mb-6" }),
        /* @__PURE__ */ jsx("div", { className: "h-64 bg-slate-100 rounded" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-gray-100 p-6 h-[380px]", children: [
        /* @__PURE__ */ jsx("div", { className: "h-5 w-36 bg-slate-200 rounded mb-2" }),
        /* @__PURE__ */ jsx("div", { className: "h-4 w-28 bg-slate-100 rounded mb-6" }),
        /* @__PURE__ */ jsx("div", { className: "h-64 bg-slate-100 rounded" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "h-14 px-6 border-b border-gray-100 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "h-5 w-40 bg-slate-200 rounded" }),
          /* @__PURE__ */ jsx("div", { className: "h-4 w-20 bg-slate-100 rounded" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "p-6 space-y-4", children: [1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-slate-200" }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-2", children: [
            /* @__PURE__ */ jsx("div", { className: "h-4 w-32 bg-slate-200 rounded" }),
            /* @__PURE__ */ jsx("div", { className: "h-3 w-48 bg-slate-100 rounded" })
          ] })
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-gray-100 overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "h-14 px-6 border-b border-gray-100 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "h-5 w-28 bg-slate-200 rounded" }),
          /* @__PURE__ */ jsx("div", { className: "h-4 w-20 bg-slate-100 rounded" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "p-4 space-y-3", children: [1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxs("div", { className: "p-3 rounded-lg bg-slate-50", children: [
          /* @__PURE__ */ jsx("div", { className: "h-4 w-full bg-slate-200 rounded mb-2" }),
          /* @__PURE__ */ jsx("div", { className: "h-3 w-24 bg-slate-100 rounded" })
        ] }, i)) })
      ] })
    ] })
  ] });
}
function Dashboard() {
  const [viewRange, setViewRange] = useState("7d");
  const {
    loading,
    stats,
    viewsChartData,
    topPropertiesByViews,
    propertyTypeDataWithViews,
    recentLeads,
    recentActivities,
    pendingProperties
  } = useDashboardData(viewRange, adminDb);
  const [migrating, setMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [tagsRegenerating, setTagsRegenerating] = useState(false);
  const [tagsDone, setTagsDone] = useState(false);
  const handleMigration = async () => {
    if (!window.confirm("คุณต้องการรันสคริปต์ปรับปรุงระบบ ID (PropertyTypes & DisplayId) หรือไม่?")) return;
    setMigrating(true);
    try {
      const allProps = await getPropertiesOnce();
      if (!allProps || allProps.length === 0) {
        alert("ไม่มีข้อมูลอสังหาริมทรัพย์");
        return;
      }
      const getPropertyIdByLabel = (label) => {
        const found = PROPERTY_TYPES.find((pt) => pt.label === label);
        return found ? found.id : null;
      };
      const getPrefixForTypeLocal = (type) => {
        if (type && type.endsWith("-ID")) return type.slice(0, -2);
        const found = PROPERTY_TYPES.find((pt) => pt.label === type);
        if (found && found.id.endsWith("-ID")) return found.id.slice(0, -2);
        return "SPS-X-";
      };
      let count = 0;
      const batch = writeBatch(adminDb);
      let globalMaxSequence = 0;
      allProps.forEach((p) => {
        const idToCheck = p.displayId || p.propertyId || "";
        const match = idToCheck.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > globalMaxSequence) {
            globalMaxSequence = num;
          }
        }
      });
      allProps.forEach((property, index) => {
        const docRef = doc(adminDb, "properties", property.id);
        let needsUpdate = false;
        const updateData = {};
        let resolvedType = property.type;
        const typeId = getPropertyIdByLabel(property.type);
        if (typeId && property.type !== typeId) {
          resolvedType = typeId;
          updateData.type = typeId;
          needsUpdate = true;
        }
        const prefix = getPrefixForTypeLocal(resolvedType);
        const existingIdStr = property.displayId || property.propertyId || "";
        const match = existingIdStr.match(/\d+$/);
        let sequenceNum = 0;
        if (match) {
          sequenceNum = parseInt(match[0], 10);
        } else {
          globalMaxSequence++;
          sequenceNum = globalMaxSequence;
        }
        const newDisplayId = `${prefix}${String(sequenceNum).padStart(3, "0")}`;
        if (property.displayId !== newDisplayId) {
          updateData.displayId = newDisplayId;
          needsUpdate = true;
        }
        if (needsUpdate) {
          updateData.updatedAt = serverTimestamp();
          batch.update(docRef, updateData);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        alert(`ปรับปรุงข้อมูลสำเร็จ ${count} รายการ`);
        setMigrationDone(true);
      } else {
        alert("ไม่มีข้อมูลที่ต้องปรับปรุง");
        setMigrationDone(true);
      }
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการปรับปรุงข้อมูล: " + e.message);
    } finally {
      setMigrating(false);
    }
  };
  const handleRegenerateTags = async () => {
    if (!window.confirm("คุณต้องการรีเซ็ต Custom Tags ทั้งหมดหรือไม่?\n⚠️ Tags ที่เคยใส่เองจะถูกลบและสร้างใหม่จากข้อมูลจริงของ property")) return;
    setTagsRegenerating(true);
    try {
      const allProps = await getPropertiesOnce();
      if (!allProps || allProps.length === 0) {
        alert("ไม่มีข้อมูลอสังหาริมทรัพย์");
        return;
      }
      const CHUNK = 400;
      let totalUpdated = 0;
      for (let i = 0; i < allProps.length; i += CHUNK) {
        const chunk = allProps.slice(i, i + CHUNK);
        const batch = writeBatch(adminDb);
        chunk.forEach((property) => {
          const autoTags = generateAutoTags(property);
          const docRef = doc(adminDb, "properties", property.id);
          batch.update(docRef, {
            customTags: autoTags,
            tags: autoTags,
            updatedAt: serverTimestamp()
          });
          totalUpdated++;
        });
        await batch.commit();
      }
      alert(`รีเซ็ต Custom Tags สำเร็จ ${totalUpdated} รายการ`);
      setTagsDone(true);
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setTagsRegenerating(false);
    }
  };
  const pendingCount = pendingProperties.length;
  if (loading) {
    return /* @__PURE__ */ jsx(DashboardSkeleton, {});
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight", children: "แดชบอร์ด" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        !migrationDone && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleMigration,
            disabled: migrating,
            className: "inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50",
            children: [
              migrating ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(DatabaseZap, { className: "h-4 w-4" }),
              /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "ปรับปรุงระบบ ID" }),
              /* @__PURE__ */ jsx("span", { className: "sm:hidden", children: "Migration" })
            ]
          }
        ),
        !tagsDone ? /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleRegenerateTags,
            disabled: tagsRegenerating,
            className: "inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50",
            children: [
              tagsRegenerating ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(DatabaseZap, { className: "h-4 w-4" }),
              /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "รีเซ็ต Custom Tags" }),
              /* @__PURE__ */ jsx("span", { className: "sm:hidden", children: "Reset Tags" })
            ]
          }
        ) : /* @__PURE__ */ jsx("span", { className: "text-sm text-emerald-600 font-medium", children: "✓ Tags อัปเดตแล้ว" }),
        /* @__PURE__ */ jsxs(
          Link,
          {
            to: "/sps-internal-admin/properties/new",
            className: "inline-flex items-center gap-2 px-3 sm:px-5 py-2 rounded-xl bg-yellow-400 text-yellow-900 text-sm font-semibold hover:bg-yellow-500 transition-colors shadow-sm",
            children: [
              /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
              "เพิ่มทรัพย์"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6", children: [
      /* @__PURE__ */ jsx(
        StatCard,
        {
          title: "มูลค่าพอร์ตลงทุน",
          value: stats.totalAssetValue,
          icon: DollarSign,
          iconBg: "bg-blue-100"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          title: "ทรัพย์สินทั้งหมด",
          value: stats.totalProperties,
          icon: Building2,
          iconBg: "bg-blue-100",
          href: "/sps-internal-admin/properties"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          title: "ลูกค้าที่สนใจ (Active)",
          value: stats.activeLeads,
          icon: Users,
          iconBg: "bg-yellow-100"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          title: "ปิดการขายเดือนนี้",
          value: stats.closedThisMonth,
          icon: FileCheck,
          iconBg: "bg-green-100"
        }
      )
    ] }),
    pendingCount > 0 && /* @__PURE__ */ jsxs(
      Link,
      {
        to: "/sps-internal-admin/pending-properties",
        className: "flex items-center justify-between px-6 py-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 hover:bg-amber-100 transition-colors",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center", children: /* @__PURE__ */ jsx(FileCheck, { className: "h-5 w-5 text-amber-800" }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "ประกาศรออนุมัติ" }),
              /* @__PURE__ */ jsxs("p", { className: "text-sm text-amber-700", children: [
                "มี ",
                pendingCount,
                " รายการรอตรวจสอบ"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(ChevronRight, { className: "h-5 w-5 text-amber-700" })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-blue-900", children: "การเข้าชมเว็บ" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mt-0.5", children: "จำนวนการเข้าชมหน้ารายละเอียดทรัพย์" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: [
            { key: "7d", label: "7 วัน" },
            { key: "30d", label: "30 วัน" },
            { key: "6m", label: "6 เดือน" },
            { key: "1y", label: "1 ปี" }
          ].map(({ key, label }) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setViewRange(key),
              className: `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewRange === key ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
              children: label
            },
            key
          )) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "p-4 h-[340px]", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(AreaChart, { data: viewsChartData, children: [
          /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "colorViews", x1: "0", y1: "0", x2: "0", y2: "1", children: [
            /* @__PURE__ */ jsx("stop", { offset: "5%", stopColor: "#1e3a8a", stopOpacity: 0.5 }),
            /* @__PURE__ */ jsx("stop", { offset: "95%", stopColor: "#1e3a8a", stopOpacity: 0 })
          ] }) }),
          /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0" }),
          /* @__PURE__ */ jsx(XAxis, { dataKey: "name", stroke: "#64748b", fontSize: 12, tickLine: false }),
          /* @__PURE__ */ jsx(YAxis, { stroke: "#64748b", fontSize: 12, tickLine: false, axisLine: false }),
          /* @__PURE__ */ jsx(
            Tooltip,
            {
              contentStyle: { borderRadius: "12px", border: "1px solid #e2e8f0" },
              formatter: (value) => [value.toLocaleString("th-TH"), "จำนวนการเข้าชม"],
              labelFormatter: (label) => String(label)
            }
          ),
          /* @__PURE__ */ jsx(Area, { type: "monotone", dataKey: "views", stroke: "#1e3a8a", strokeWidth: 2, fill: "url(#colorViews)", name: "การเข้าชม" })
        ] }) }) }),
        /* @__PURE__ */ jsxs("div", { className: "px-6 pb-4 border-t border-gray-100 pt-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-slate-700 mb-3", children: "10 อันดับทรัพย์ที่มีการเข้าชมสูงสุด" }),
          /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "text-left text-xs font-medium text-slate-600 uppercase tracking-wider", children: [
              /* @__PURE__ */ jsx("th", { className: "py-2 pr-2 w-10", children: "#" }),
              /* @__PURE__ */ jsx("th", { className: "py-2 pr-2", children: "ชื่อทรัพย์" }),
              /* @__PURE__ */ jsx("th", { className: "py-2 pr-2", children: "ประเภท" }),
              /* @__PURE__ */ jsx("th", { className: "py-2 text-right whitespace-nowrap", children: "จำนวนการเข้าชม" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-gray-50", children: topPropertiesByViews.length > 0 ? topPropertiesByViews.map((row, i) => /* @__PURE__ */ jsxs("tr", { className: "text-slate-700 hover:bg-slate-50/80", children: [
              /* @__PURE__ */ jsx("td", { className: "py-2 pr-2 font-medium text-slate-500", children: i + 1 }),
              /* @__PURE__ */ jsx("td", { className: "py-2 pr-2", children: /* @__PURE__ */ jsx(
                Link,
                {
                  to: `/sps-internal-admin/properties/${row.propertyId}`,
                  className: "font-medium text-blue-700 hover:underline truncate block max-w-[200px]",
                  title: row.title,
                  children: row.title
                }
              ) }),
              /* @__PURE__ */ jsx("td", { className: "py-2 pr-2 text-slate-600", children: row.typeLabel }),
              /* @__PURE__ */ jsx("td", { className: "py-2 text-right font-medium", children: row.views.toLocaleString("th-TH") })
            ] }, row.propertyId)) : /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 4, className: "py-4 text-center text-slate-500", children: "ยังไม่มีข้อมูลการเข้าชมในช่วงนี้" }) }) })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-gray-100", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-blue-900", children: "Property Distribution" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mt-0.5", children: "ประเภททรัพย์ vs จำนวนประกาศ และการเข้าชม" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "p-4 flex-1 min-h-0 flex flex-col gap-4", children: propertyTypeDataWithViews.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "h-[200px] shrink-0", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(BarChart, { data: propertyTypeDataWithViews, layout: "vertical", margin: { left: 0, right: 12 }, children: [
            /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", horizontal: false }),
            /* @__PURE__ */ jsx(XAxis, { type: "number", stroke: "#64748b", fontSize: 11, tickLine: false, allowDecimals: false }),
            /* @__PURE__ */ jsx(YAxis, { type: "category", dataKey: "name", stroke: "#64748b", fontSize: 11, tickLine: false, width: 90 }),
            /* @__PURE__ */ jsx(
              Tooltip,
              {
                contentStyle: { borderRadius: "12px", border: "1px solid #e2e8f0" },
                formatter: (value, name) => [value.toLocaleString("th-TH"), name === "count" ? "จำนวนประกาศ" : "จำนวนการเข้าชม"],
                labelFormatter: (label) => label
              }
            ),
            /* @__PURE__ */ jsx(Bar, { dataKey: "count", name: "จำนวนประกาศ", fill: "#1e3a8a", radius: [0, 4, 4, 0] }),
            /* @__PURE__ */ jsx(Bar, { dataKey: "views", name: "จำนวนการเข้าชม", fill: "#3b82f6", radius: [0, 4, 4, 0] })
          ] }) }) }),
          /* @__PURE__ */ jsx("div", { className: "border-t border-gray-100 pt-3 overflow-auto flex-1 min-h-0", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "text-left text-xs font-medium text-slate-600 uppercase tracking-wider", children: [
              /* @__PURE__ */ jsx("th", { className: "py-2 pr-2", children: "ประเภททรัพย์" }),
              /* @__PURE__ */ jsx("th", { className: "py-2 text-right whitespace-nowrap", children: "จำนวนประกาศ" }),
              /* @__PURE__ */ jsx("th", { className: "py-2 text-right whitespace-nowrap", children: "การเข้าชม" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-gray-50", children: propertyTypeDataWithViews.map((row, i) => /* @__PURE__ */ jsxs("tr", { className: "text-slate-700", children: [
              /* @__PURE__ */ jsx("td", { className: "py-2 pr-2 font-medium", children: row.name }),
              /* @__PURE__ */ jsx("td", { className: "py-2 text-right", children: row.count.toLocaleString("th-TH") }),
              /* @__PURE__ */ jsx("td", { className: "py-2 text-right", children: row.views.toLocaleString("th-TH") })
            ] }, row.typeKey || i)) })
          ] }) })
        ] }) : /* @__PURE__ */ jsx("div", { className: "flex-1 flex items-center justify-center text-slate-500 text-sm", children: "ยังไม่มีข้อมูลทรัพย์สิน" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-gray-100 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-base sm:text-lg font-bold text-blue-900 truncate", children: "ลูกค้าล่าสุด" }),
          /* @__PURE__ */ jsxs(
            Link,
            {
              to: "/sps-internal-admin/leads",
              className: "text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1",
              children: [
                "ดูทั้งหมด",
                /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50/80 text-left text-xs font-medium text-slate-600 uppercase tracking-wider", children: [
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "ลูกค้า" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "เบอร์โทร" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "ทรัพย์ที่สนใจ" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "สถานะ" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: recentLeads.length > 0 ? recentLeads.map((lead) => /* @__PURE__ */ jsxs("tr", { className: "border-t border-gray-100 hover:bg-slate-50/50 transition-colors", children: [
            /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx(LeadAvatar, { name: lead.name }),
              /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-800", children: lead.name })
            ] }) }),
            /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxs("a", { href: `tel:${lead.phone}`, className: "flex items-center gap-2 text-slate-600 hover:text-blue-600", children: [
              /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4" }),
              lead.phone
            ] }) }),
            /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-slate-600 text-sm line-clamp-2", children: lead.property }),
            /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx(
              "span",
              {
                className: `inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${lead.status === "ติดต่อแล้ว" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`,
                children: lead.status
              }
            ) })
          ] }, lead.id)) : /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 4, className: "px-6 py-12 text-center text-slate-500", children: "ยังไม่มีลูกค้าติดต่อ" }) }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-gray-100 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Activity, { className: "h-5 w-5 text-blue-900" }),
            /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-blue-900", children: "Activity Feed" })
          ] }),
          /* @__PURE__ */ jsxs(
            Link,
            {
              to: "/sps-internal-admin/activities",
              className: "text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1",
              children: [
                "ดูทั้งหมด",
                /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "p-4 space-y-3 max-h-[400px] overflow-y-auto", children: recentActivities.length > 0 ? recentActivities.map((item) => {
          const category = getActionCategory(item.action);
          const displayAction = getActionDisplay(item.action);
          const fmtTs = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "-";
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex gap-3 p-3 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 transition-colors",
              children: [
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: `flex-shrink-0 w-2 h-2 mt-2 rounded-full ${category === "critical" ? "bg-red-500" : category === "operation" ? "bg-blue-400" : "bg-slate-400"}`
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-slate-700 leading-snug", title: item.user?.email, children: [
                    /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-800", children: getUsernameFromEmail(item.user?.email) }),
                    /* @__PURE__ */ jsxs("span", { className: "text-slate-400 font-normal", children: [
                      " (",
                      formatRoleDisplay(item.user?.role),
                      ")"
                    ] }),
                    /* @__PURE__ */ jsx("span", { className: "mx-1", children: "·" }),
                    /* @__PURE__ */ jsx("span", { className: `inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getActivityBadgeClass(category)}`, children: displayAction }),
                    item.target && item.target !== "-" && /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsx("span", { className: "mx-1", children: "·" }),
                      /* @__PURE__ */ jsx("span", { children: item.target })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: fmtTs }),
                  item.details && /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-600 mt-0.5", children: item.details })
                ] })
              ]
            },
            item.id
          );
        }) : /* @__PURE__ */ jsx("div", { className: "py-8 text-center text-slate-500 text-sm", children: "ยังไม่มีกิจกรรม" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/sps-internal-admin/properties",
          className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors",
          children: [
            /* @__PURE__ */ jsx(Building2, { className: "h-4 w-4" }),
            "ดูรายการทรัพย์ทั้งหมด"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/sps-internal-admin/leads",
          className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors",
          children: [
            /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }),
            "จัดการ Lead"
          ]
        }
      )
    ] })
  ] });
}
export {
  Dashboard as default
};
