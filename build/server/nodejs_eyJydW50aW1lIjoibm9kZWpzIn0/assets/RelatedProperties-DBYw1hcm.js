import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { query, collection, where, limit, getDocs } from "firebase/firestore";
import { i as isValidImageUrl, g as getPropertyPath, a as getCloudinaryThumbUrl, d as db } from "./server-build-DQWFMthd.js";
import { MapPin, Bed, Bath } from "lucide-react";
import "node:stream";
import "@react-router/node";
import "react-router";
import "isbot";
import "react-dom/server";
import "firebase/auth";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
const formatPrice = (price, isRental, showPrice) => {
  if (showPrice === false) return "Contact for Price";
  if (!price) return "Contact for Price";
  const formatted = new Intl.NumberFormat("th-TH").format(price);
  return isRental ? `฿${formatted}/เดือน` : `฿${formatted}`;
};
function RelatedProperties({ currentPropertyId, district, type }) {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchRelated = async () => {
      try {
        setLoading(true);
        const seen = /* @__PURE__ */ new Set([currentPropertyId]);
        let items = [];
        if (district && type) {
          const q1 = query(
            collection(db, "properties"),
            where("status", "==", "available"),
            where("type", "==", type),
            where("location.district", "==", district),
            limit(4)
          );
          const snap1 = await getDocs(q1);
          snap1.forEach((doc) => {
            if (!seen.has(doc.id)) {
              const data = doc.data();
              if (data?.id || data?.location?.district || data?.type) {
                seen.add(doc.id);
                items.push({ id: doc.id, ...data });
              }
            }
          });
        }
        if (items.length < 3 && type) {
          const q2 = query(
            collection(db, "properties"),
            where("status", "==", "available"),
            where("type", "==", type),
            limit(10)
          );
          const snap2 = await getDocs(q2);
          snap2.forEach((doc) => {
            if (!seen.has(doc.id) && items.length < 3) {
              const data = doc.data();
              if (data?.location?.district || data?.type) {
                seen.add(doc.id);
                items.push({ id: doc.id, ...data });
              }
            }
          });
        }
        if (items.length < 3) {
          const q3 = query(
            collection(db, "properties"),
            where("status", "==", "available"),
            limit(15)
          );
          const snap3 = await getDocs(q3);
          snap3.forEach((doc) => {
            if (!seen.has(doc.id) && items.length < 3) {
              const data = doc.data();
              if (data?.location?.district || data?.title) {
                seen.add(doc.id);
                items.push({ id: doc.id, ...data });
              }
            }
          });
        }
        setRelated(items);
      } catch (error) {
        console.error("Error fetching related properties:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRelated();
  }, [currentPropertyId, district, type]);
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "mt-12 mb-8", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-slate-900 mb-6 border-b pb-4", children: "บ้านที่คุณอาจสนใจ" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxs("div", { className: "animate-pulse bg-white rounded-xl border border-slate-200 overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "aspect-[4/3] bg-slate-200" }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 space-y-2", children: [
          /* @__PURE__ */ jsx("div", { className: "h-4 bg-slate-200 rounded w-3/4" }),
          /* @__PURE__ */ jsx("div", { className: "h-3 bg-slate-100 rounded w-1/2" })
        ] })
      ] }, i)) })
    ] });
  }
  if (related.length === 0) return null;
  return /* @__PURE__ */ jsxs("div", { className: "mt-12 mb-8", children: [
    /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-slate-900 mb-6 border-b pb-4", children: "บ้านที่คุณอาจสนใจ" }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6", children: related.map((prop) => {
      if (!prop?.id) return null;
      const rawCover = prop.images && prop.images.length > 0 ? prop.images[0] : null;
      const coverImage = rawCover && isValidImageUrl(rawCover) ? rawCover : null;
      const propertyPath = getPropertyPath(prop);
      if (!propertyPath || propertyPath === "/properties") {
        console.warn("Invalid property path for property:", prop.id, prop);
        return null;
      }
      const handleLinkClick = (e) => {
      };
      return /* @__PURE__ */ jsxs("a", { href: propertyPath, onClick: handleLinkClick, className: "group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition block no-underline cursor-pointer", children: [
        /* @__PURE__ */ jsxs("div", { className: "aspect-[4/3] bg-slate-200 overflow-hidden relative", children: [
          coverImage ? /* @__PURE__ */ jsx("img", { src: getCloudinaryThumbUrl(coverImage), alt: prop.title, width: 400, height: 300, loading: "lazy", className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" }) : /* @__PURE__ */ jsx("div", { className: "w-full h-full flex items-center justify-center text-slate-400", children: "No Image" }),
          /* @__PURE__ */ jsx("div", { className: "absolute top-3 right-3 bg-white px-2.5 py-1 rounded-md text-xs font-bold text-blue-900 shadow-sm border border-slate-100", children: formatPrice(prop.price, prop.isRental, prop.showPrice) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4", children: [
          /* @__PURE__ */ jsx("h4", { className: "font-semibold text-slate-900 line-clamp-1 mb-2 group-hover:text-blue-700 transition", children: prop.title }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-slate-500 mb-3 text-sm", children: [
            /* @__PURE__ */ jsx(MapPin, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ jsxs("span", { className: "truncate", children: [
              prop.location?.district || "",
              ", ",
              prop.location?.province || ""
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-xs text-slate-600 border-t pt-3", children: [
            /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(Bed, { className: "h-3.5 w-3.5" }),
              " ",
              prop.bedrooms || "-"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(Bath, { className: "h-3.5 w-3.5" }),
              " ",
              prop.bathrooms || "-"
            ] })
          ] })
        ] })
      ] }, prop.id);
    }) })
  ] });
}
export {
  RelatedProperties as default
};
