import { jsx, jsxs } from "react/jsx-runtime";
import { Mail, Facebook, Clock } from "lucide-react";
import { aa as logo } from "./server-build-C8MEOO73.js";
import "react-dom/server";
import "react-router";
import "isbot";
import "react";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function Footer() {
  return /* @__PURE__ */ jsx("footer", { className: "bg-blue-900 text-white", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "py-8 sm:py-12", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx("img", { src: logo, alt: "SPS Property Solution", width: 120, height: 48, loading: "lazy", decoding: "async", className: "h-12 w-auto" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-bold text-lg", children: "SPS Property Solution" }),
          /* @__PURE__ */ jsx("p", { className: "text-blue-200 text-sm", children: "บ้านคอนโดสวย อมตะซิตี้ ชลบุรี" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-6 text-sm", children: [
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: "mailto:propertysommai@gmail.com",
            className: "flex items-center gap-2 hover:text-yellow-400 transition",
            children: [
              /* @__PURE__ */ jsx(Mail, { className: "h-4 w-4 shrink-0" }),
              "propertysommai@gmail.com"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: "https://www.facebook.com/houseamata",
            target: "_blank",
            rel: "noopener noreferrer",
            className: "flex items-center gap-2 hover:text-yellow-400 transition",
            children: [
              /* @__PURE__ */ jsx(Facebook, { className: "h-4 w-4 shrink-0" }),
              "Facebook"
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-blue-200", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4 shrink-0" }),
          "เปิดทำการตลอดเวลา (24/7)"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-8 pt-6 border-t border-blue-800 text-center text-blue-200 text-sm", children: "© SPS Property Solution | บ้านคอนโดสวย อมตะซิตี้ ชลบุรี" })
  ] }) }) });
}
export {
  Footer as default
};
