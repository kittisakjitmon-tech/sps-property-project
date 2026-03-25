import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { _ as PropertyCard } from "./server-build-D_48fWql.js";
import "node:stream";
import "@react-router/node";
import "isbot";
import "react-dom/server";
import "react";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
const HOMEPAGE_LIMIT = 4;
function DynamicPropertySection({
  title,
  subtitle,
  properties,
  targetTag,
  titleColor = "text-blue-900",
  isHighlighted = false,
  isBlinking = false,
  sectionIndex = 0,
  homeLayout = false,
  limit = 0
}) {
  if (!properties || properties.length === 0) return null;
  const displayProperties = limit > 0 ? properties.slice(0, limit) : properties;
  if (displayProperties.length === 0) return null;
  const tagForFilter = targetTag && targetTag.trim() || title || "";
  const viewAllHref = tagForFilter ? `/properties?tag=${encodeURIComponent(tagForFilter)}` : "/properties";
  const getTitleStyle = () => {
    let baseClasses = "text-xl sm:text-2xl font-bold tracking-tight";
    if (isHighlighted) {
      let gradientFrom = "from-blue-900";
      let gradientVia = "via-blue-700";
      let gradientTo = "to-blue-900";
      if (titleColor.includes("red")) {
        gradientFrom = "from-red-600";
        gradientVia = "via-red-500";
        gradientTo = "to-red-600";
      } else if (titleColor.includes("yellow")) {
        gradientFrom = "from-yellow-600";
        gradientVia = "via-yellow-500";
        gradientTo = "to-yellow-600";
      } else if (titleColor.includes("emerald") || titleColor.includes("green")) {
        gradientFrom = "from-emerald-600";
        gradientVia = "via-emerald-500";
        gradientTo = "to-emerald-600";
      } else if (titleColor.includes("purple")) {
        gradientFrom = "from-purple-600";
        gradientVia = "via-purple-500";
        gradientTo = "to-purple-600";
      } else if (titleColor.includes("orange")) {
        gradientFrom = "from-orange-600";
        gradientVia = "via-orange-500";
        gradientTo = "to-orange-600";
      }
      baseClasses += ` bg-gradient-to-r ${gradientFrom} ${gradientVia} ${gradientTo} bg-clip-text text-transparent`;
    } else {
      baseClasses += ` ${titleColor || "text-blue-900"}`;
    }
    if (isBlinking) {
      baseClasses += " animate-pulse";
    }
    return {
      className: baseClasses
    };
  };
  const titleStyle = getTitleStyle();
  const bgClass = sectionIndex % 2 === 0 ? "bg-slate-50" : "bg-white";
  return /* @__PURE__ */ jsx("section", { className: `py-4 sm:py-4 ${bgClass}`, children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "w-1 h-7 bg-yellow-400 rounded-full shrink-0" }),
          /* @__PURE__ */ jsx("h2", { className: titleStyle.className, children: title })
        ] }),
        isHighlighted && /* @__PURE__ */ jsx("span", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-30" }),
        subtitle && /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm mt-1.5 ml-4", children: subtitle })
      ] }),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: viewAllHref,
          className: "inline-flex items-center gap-1 text-sm font-semibold text-blue-900 border border-blue-200 bg-blue-50 hover:bg-blue-900 hover:text-white px-4 py-1.5 rounded-full transition-all duration-200 shrink-0",
          children: [
            "ดูทั้งหมด",
            /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4 transition-transform group-hover:translate-x-0.5" })
          ]
        }
      )
    ] }),
    homeLayout ? /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-[18px] max-w-[1280px] mx-auto", children: displayProperties.slice(0, HOMEPAGE_LIMIT).map((property) => /* @__PURE__ */ jsx(PropertyCard, { property, home: true }, property.id)) }) : /* @__PURE__ */ jsx(
      "div",
      {
        className: "gap-5",
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))"
        },
        children: displayProperties.map((property) => /* @__PURE__ */ jsx(PropertyCard, { property, compact: true }, property.id))
      }
    )
  ] }) });
}
export {
  DynamicPropertySection as default
};
