import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { MapPin, Factory, ShoppingBag, GraduationCap, Hospital, Car } from "lucide-react";
import { g as getCoordsFromProperty, f as fetchAndCacheNearbyPlaces } from "./nearbyPlacesService-B9rrtuVJ.js";
import "./server-build-C8MEOO73.js";
import "react-dom/server";
import "react-router";
import "isbot";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
const TYPE_ICONS = {
  hospital: Hospital,
  education: GraduationCap,
  mall: ShoppingBag,
  industrial: Factory
};
const TYPE_ORDER = ["industrial", "mall", "hospital", "education"];
const TYPE_TITLES = {
  industrial: "นิคมอุตสาหกรรม",
  mall: "ห้างสรรพสินค้า",
  hospital: "โรงพยาบาล",
  education: "การศึกษา"
};
function NeighborhoodData({ property }) {
  const [places, setPlaces] = useState(property?.nearbyPlaces || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const coords = getCoordsFromProperty(property || {});
  const hasMapUrl = !!property?.mapUrl;
  const hasCoords = !!coords;
  useEffect(() => {
    if (!property) return;
    if (property.nearbyPlaces && Array.isArray(property.nearbyPlaces) && property.nearbyPlaces.length > 0) {
      setPlaces(property.nearbyPlaces);
      return;
    }
    if (!coords) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAndCacheNearbyPlaces({ ...property, lat: coords.lat, lng: coords.lng }).then((result) => {
      if (!cancelled) setPlaces(result);
    }).catch((e) => {
      if (!cancelled) {
        setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
        setPlaces([]);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [property?.id, coords?.lat, coords?.lng, property?.nearbyPlaces?.length]);
  const groupedPlaces = useMemo(() => {
    const groups = {
      industrial: [],
      mall: [],
      hospital: [],
      education: []
    };
    for (const place of places || []) {
      const type = place.type === "shopping" ? "mall" : place.type === "school" ? "education" : place.type;
      if (groups[type]) groups[type].push({ ...place, type });
    }
    return groups;
  }, [places]);
  if (!hasMapUrl) {
    return /* @__PURE__ */ jsxs("div", { className: "bg-slate-100 rounded-xl border border-slate-200 p-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-blue-900 mb-4", children: "สถานที่สำคัญใกล้เคียง" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-slate-500", children: [
        /* @__PURE__ */ jsx(MapPin, { className: "h-12 w-12 mb-3 opacity-50" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "ยังไม่มี Map" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs mt-1", children: "ข้อมูลสถานที่สำคัญจะปรากฏขึ้นเมื่อระบุพิกัดแผนที่" })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-6", children: [
    /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-blue-900 mb-4", children: "สถานที่สำคัญใกล้เคียง" }),
    loading ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-slate-500", children: [
      /* @__PURE__ */ jsx("div", { className: "w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm", children: "กำลังค้นหาสถานที่ใกล้เคียง…" })
    ] }) : error ? /* @__PURE__ */ jsx("div", { className: "py-6 text-center text-slate-500 text-sm", children: error }) : !hasCoords ? /* @__PURE__ */ jsxs("div", { className: "py-6 text-center text-slate-500 text-sm", children: [
      "ข้อมูลสถานที่สำคัญจะปรากฏขึ้นเมื่อระบุพิกัดแผนที่",
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsx("span", { className: "text-xs", children: "ตรวจสอบจากแผนที่" })
    ] }) : places.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-4", children: TYPE_ORDER.filter((type) => groupedPlaces[type].length > 0).map((type) => {
      const Icon = TYPE_ICONS[type] || MapPin;
      return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
          /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4 text-blue-900" }) }),
          /* @__PURE__ */ jsx("h4", { className: "font-semibold text-blue-900", children: TYPE_TITLES[type] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-2", children: groupedPlaces[type].map((place, index) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-white border border-slate-100 p-3", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-800", children: [
            place.name,
            " - ",
            place.distanceText || "ตรวจสอบจากแผนที่",
            " (",
            place.durationText || "ตรวจสอบจากแผนที่",
            ")"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-center gap-1 text-xs text-slate-500", children: [
            /* @__PURE__ */ jsx(Car, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ jsx("span", { children: "โหมดขับรถ" })
          ] })
        ] }, `${place.name}-${index}`)) })
      ] }, type);
    }) }) : /* @__PURE__ */ jsxs("div", { className: "py-6 text-center text-slate-500 text-sm", children: [
      "ข้อมูลสถานที่สำคัญจะปรากฏขึ้นเมื่อระบุพิกัดแผนที่",
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsx("span", { className: "text-xs", children: "ตรวจสอบจากแผนที่" })
    ] })
  ] });
}
export {
  NeighborhoodData as default
};
