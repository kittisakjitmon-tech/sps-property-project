import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import { a9 as getHeroSlidesOnce, aa as getOptimizedImageUrl } from "./server-build-D_48fWql.js";
import "node:stream";
import "@react-router/node";
import "react-router";
import "isbot";
import "react-dom/server";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "lucide-react";
import "react-helmet-async";
import "firebase/functions";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=75&auto=format";
const HERO_WIDTH = 800;
const HERO_HEIGHT = 450;
function getSlideImageUrl(slide) {
  return slide?.imageUrl || slide?.image || slide?.url || DEFAULT_IMAGE;
}
function HeroSkeleton({ children }) {
  return /* @__PURE__ */ jsxs("section", { className: "relative flex items-center justify-center min-h-[85vh] overflow-hidden", children: [
    /* @__PURE__ */ jsx(
      "img",
      {
        src: DEFAULT_IMAGE,
        alt: "",
        width: HERO_WIDTH,
        height: HERO_HEIGHT,
        fetchPriority: "high",
        decoding: "async",
        className: "absolute inset-0 w-full h-full object-cover",
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75 z-[1]" }),
    /* @__PURE__ */ jsx("div", { className: "relative z-[2] w-full flex flex-col items-center justify-center min-h-[85vh] py-16 md:py-20 px-4", children })
  ] });
}
function HeroSlider({ children, className = "" }) {
  const [slides, setSlides] = useState(null);
  useRef(false);
  useEffect(() => {
    getHeroSlidesOnce().then((list) => {
      const finalSlides = list.length > 0 ? list : [{ id: "default", imageUrl: DEFAULT_IMAGE, order: 0 }];
      setSlides(finalSlides);
    }).catch(() => {
      setSlides([{ id: "default", imageUrl: DEFAULT_IMAGE, order: 0 }]);
    });
  }, []);
  if (slides === null) {
    return /* @__PURE__ */ jsx(HeroSkeleton, { children });
  }
  return /* @__PURE__ */ jsxs(
    "section",
    {
      className: `relative min-h-[85vh] flex items-center justify-center ${className}`,
      style: { minHeight: "85vh" },
      children: [
        /* @__PURE__ */ jsx(
          Swiper,
          {
            modules: [Autoplay, EffectFade, Pagination],
            effect: "fade",
            autoplay: { delay: 5e3, disableOnInteraction: false },
            pagination: {
              clickable: true,
              bulletClass: "swiper-pagination-bullet !bg-white/50 !w-2 !h-2 !mx-1",
              bulletActiveClass: "!bg-yellow-400 !w-6"
            },
            loop: slides.length > 1,
            className: "!absolute !inset-0 !w-full !h-full",
            style: { height: "100%", minHeight: "85vh" },
            children: slides.map((slide, index) => {
              const rawUrl = getSlideImageUrl(slide);
              const imageUrl = rawUrl === DEFAULT_IMAGE ? rawUrl : getOptimizedImageUrl(rawUrl, { width: HERO_WIDTH, height: HERO_HEIGHT, crop: "fill" });
              return /* @__PURE__ */ jsx(SwiperSlide, { style: { height: "100%", minHeight: "85vh" }, children: /* @__PURE__ */ jsx(
                "img",
                {
                  src: imageUrl,
                  alt: "",
                  width: HERO_WIDTH,
                  height: HERO_HEIGHT,
                  className: "absolute inset-0 w-full h-full object-cover",
                  loading: index === 0 ? "eager" : "lazy",
                  fetchPriority: index === 0 ? "high" : "auto",
                  decoding: "async",
                  "aria-hidden": "true"
                }
              ) }, slide.id);
            })
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75 z-[1]" }),
        /* @__PURE__ */ jsx("div", { className: "relative z-[2] w-full flex flex-col items-center justify-center min-h-[85vh] py-16 md:py-20 px-4", children })
      ]
    }
  );
}
export {
  HeroSlider as default
};
