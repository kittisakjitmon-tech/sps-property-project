import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { P as PROPERTY_TYPES, d as db, n as getPropertyLabel, u as useAdminAuth, o as getPropertiesOnce, q as getPropertyByIdOnce, L as LocationAutocomplete, r as compressImages, s as deletePropertyById, p as adminDb, t as uploadPropertyImageWithProgress, v as updatePropertyById, w as createProperty } from "./server-build-D_48fWql.js";
import { MapPin, Trash2, ExternalLink, Loader2, Download, ArrowLeft, X, RefreshCw, Star, ImagePlus } from "lucide-react";
import { l as loadLongdoMap } from "./longdoMapLoader-j2uZipWU.js";
import { serverTimestamp, addDoc, collection } from "firebase/firestore";
import { p as processMapInput, a as parseCoordinatesFromUrl, f as fetchAndCacheNearbyPlaces } from "./nearbyPlacesService-DjJhCXjZ.js";
import { g as generateAutoTags, m as mergeTags } from "./autoTags-CW6uT_27.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "node:stream";
import "@react-router/node";
import "isbot";
import "react-dom/server";
import "firebase/auth";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function MapPicker({ lat, lng, onLocationSelect, className = "" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState("");
  onLocationSelectRef.current = onLocationSelect;
  useEffect(() => {
    let mounted = true;
    loadLongdoMap().then(() => {
      if (!mounted) return;
      setMapLoadError("");
      setIsMapReady(true);
    }).catch((error) => {
      if (!mounted) return;
      console.error("MapPicker: failed to load Longdo Map API", error);
      setMapLoadError("ไม่สามารถโหลดแผนที่ได้");
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    const longdo = window.longdo;
    const initialLat = lat != null && lat !== "" ? Number(lat) : 13.7563;
    const initialLng = lng != null && lng !== "" ? Number(lng) : 100.5018;
    const hasInitial = lat != null && lat !== "" && lng != null && lng !== "";
    const map = new longdo.Map({
      placeholder: mapRef.current,
      language: "th",
      lastView: false,
      location: { lon: initialLng, lat: initialLat },
      zoom: hasInitial ? 15 : 10
    });
    mapInstanceRef.current = map;
    const addOrUpdateMarker = (lon, lat2) => {
      if (markerRef.current) {
        map.Overlays.remove(markerRef.current);
      }
      const marker = new longdo.Marker(
        { lon, lat: lat2 },
        {
          title: "คลิกเพื่อย้ายตำแหน่ง",
          draggable: true,
          clickable: true
        }
      );
      map.Overlays.add(marker);
      markerRef.current = marker;
    };
    const handleOverlayDrag = (overlay) => {
      if (overlay !== markerRef.current) return;
      const loc = overlay.location();
      if (loc && onLocationSelectRef.current) {
        onLocationSelectRef.current({ lat: loc.lat, lng: loc.lon });
      }
    };
    const handleMapClick = (point) => {
      const loc = map.location(point);
      if (!loc) return;
      addOrUpdateMarker(loc.lon, loc.lat);
      if (onLocationSelectRef.current) {
        onLocationSelectRef.current({ lat: loc.lat, lng: loc.lon });
      }
    };
    map.Event.bind("overlayDrag", handleOverlayDrag);
    map.Event.bind("click", handleMapClick);
    if (hasInitial && !isNaN(initialLat) && !isNaN(initialLng)) {
      addOrUpdateMarker(initialLng, initialLat);
    }
    return () => {
      map.Event.unbind("overlayDrag", handleOverlayDrag);
      map.Event.unbind("click", handleMapClick);
      if (markerRef.current) {
        map.Overlays.remove(markerRef.current);
        markerRef.current = null;
      }
      map.Overlays.clear();
      mapInstanceRef.current = null;
    };
  }, [isMapReady]);
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const numLat = lat != null && lat !== "" ? Number(lat) : null;
    const numLng = lng != null && lng !== "" ? Number(lng) : null;
    if (numLat == null || numLng == null || isNaN(numLat) || isNaN(numLng)) return;
    const map = mapInstanceRef.current;
    const longdo = window.longdo;
    if (markerRef.current) {
      map.Overlays.remove(markerRef.current);
    }
    const marker = new longdo.Marker(
      { lon: numLng, lat: numLat },
      { title: "คลิกเพื่อย้ายตำแหน่ง", draggable: true, clickable: true }
    );
    map.Overlays.add(marker);
    markerRef.current = marker;
    map.location({ lon: numLng, lat: numLat }, false);
  }, [isMapReady, lat, lng]);
  if (mapLoadError) {
    return /* @__PURE__ */ jsx("div", { className: `bg-slate-100 rounded-lg flex items-center justify-center ${className}`, style: { minHeight: "400px" }, children: /* @__PURE__ */ jsxs("div", { className: "text-center px-4", children: [
      /* @__PURE__ */ jsx(MapPin, { className: "h-8 w-8 text-slate-400 mx-auto mb-2" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-700", children: mapLoadError })
    ] }) });
  }
  if (!isMapReady) {
    return /* @__PURE__ */ jsx("div", { className: `bg-slate-100 rounded-lg flex items-center justify-center ${className}`, style: { minHeight: "400px" }, children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx(MapPin, { className: "h-8 w-8 text-slate-400 mx-auto mb-2" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลดแผนที่…" })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: `rounded-lg overflow-hidden border border-slate-200 ${className}`, children: [
    /* @__PURE__ */ jsx("div", { ref: mapRef, style: { width: "100%", height: "400px" } }),
    /* @__PURE__ */ jsx("div", { className: "bg-slate-50 px-4 py-2 text-sm text-slate-600 border-t border-slate-200", children: "💡 คลิกบนแผนที่เพื่อเลือกตำแหน่ง หรือลากหมุดเพื่อย้ายตำแหน่ง" })
  ] });
}
function ModernProgressLoader({ progress = 0, status = "", subStatus = "" }) {
  const percent = Math.min(100, Math.max(0, Number(progress)));
  const displayPercent = Math.round(percent);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50",
      "aria-live": "polite",
      "aria-busy": "true",
      role: "alert",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-xl p-8 w-full max-w-md", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-5xl font-bold text-blue-900 tabular-nums", children: [
              displayPercent,
              "%"
            ] }),
            status && /* @__PURE__ */ jsx("p", { className: "text-slate-600 mt-2 font-medium", children: status }),
            subStatus && /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 mt-1", children: subStatus })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "h-3 rounded-full bg-slate-200 overflow-hidden", children: /* @__PURE__ */ jsx(
            "div",
            {
              className: "h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out relative overflow-hidden progress-loader-bar",
              style: { width: `${percent}%` },
              children: /* @__PURE__ */ jsx("span", { className: "progress-loader-shine" })
            }
          ) })
        ] }),
        /* @__PURE__ */ jsx("style", { children: `
        .progress-loader-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: progress-loader-shine 1.5s ease-in-out infinite;
        }
        @keyframes progress-loader-shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      ` })
      ]
    }
  );
}
const SIMULATED_DURATION_MS = 1200;
const SIMULATED_TARGET = 70;
const HOLD_AT_TARGET_MS = 200;
function useProgressLoader() {
  const [isActive, setIsActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [subStatus, setSubStatus] = useState("");
  const simulatedTimerRef = useRef(null);
  const simulatedTargetReached = useRef(false);
  const clearSimulatedTimer = useCallback(() => {
    if (simulatedTimerRef.current) {
      clearInterval(simulatedTimerRef.current);
      simulatedTimerRef.current = null;
    }
    simulatedTargetReached.current = false;
  }, []);
  useEffect(() => {
    return () => clearSimulatedTimer();
  }, [clearSimulatedTimer]);
  const startLoading = useCallback(
    (message = "กำลังโหลด...", options = {}) => {
      const { simulated = false } = options;
      setStatus(message);
      setSubStatus("");
      setProgress(0);
      setIsActive(true);
      simulatedTargetReached.current = false;
      clearSimulatedTimer();
      if (simulated) {
        const startTime = Date.now();
        simulatedTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(1, elapsed / SIMULATED_DURATION_MS);
          const p = Math.round(SIMULATED_TARGET * (1 - Math.pow(1 - t, 1.5)));
          setProgress(p);
          if (p >= SIMULATED_TARGET) {
            simulatedTargetReached.current = true;
            clearSimulatedTimer();
          }
        }, 50);
      }
    },
    [clearSimulatedTimer]
  );
  const updateProgress = useCallback((percent, subMessage) => {
    setProgress((prev) => Math.max(prev, Math.min(100, percent)));
    if (subMessage !== void 0) setSubStatus(subMessage);
  }, []);
  const setStatusText = useCallback((message, subMessage) => {
    if (message !== void 0) setStatus(message);
    if (subMessage !== void 0) setSubStatus(subMessage);
  }, []);
  const stopLoading = useCallback(() => {
    clearSimulatedTimer();
    setProgress(100);
    setTimeout(() => {
      setIsActive(false);
      setProgress(0);
      setStatus("");
      setSubStatus("");
    }, HOLD_AT_TARGET_MS + 150);
  }, [clearSimulatedTimer]);
  return {
    isActive,
    progress,
    status,
    subStatus,
    startLoading,
    updateProgress,
    setStatus: setStatusText,
    stopLoading
  };
}
function getPrefixForType(type) {
  if (type && type.endsWith("-ID")) {
    return type.slice(0, -2);
  }
  const foundType = PROPERTY_TYPES.find((pt) => pt.label === type);
  if (foundType && foundType.id.endsWith("-ID")) {
    return foundType.id.slice(0, -2);
  }
  return "SPS-X-";
}
function generatePropertyID(type, allProperties = []) {
  const prefix = getPrefixForType(type);
  const numbers = (allProperties || []).map((p) => {
    const idToCheck = p.displayId || p.propertyId || "";
    const match = String(idToCheck).match(/\d+$/);
    if (match) {
      const num = parseInt(match[0], 10);
      return Number.isFinite(num) ? num : 0;
    }
    return 0;
  });
  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(3, "0");
  return `${prefix}${padded}`;
}
function checkPropertyIdDuplicate(propertyId, excludeId, allProperties = []) {
  if (!propertyId || !String(propertyId).trim()) return false;
  const normalized = String(propertyId).trim().toUpperCase();
  return (allProperties || []).some((p) => {
    if (p.id === excludeId) return false;
    const idA = String(p.displayId || "").trim().toUpperCase();
    const idB = String(p.propertyId || "").trim().toUpperCase();
    return idA === normalized || idB === normalized;
  });
}
const ACTIVITIES_COLLECTION = "activities";
async function logActivity({ action, target, details, currentUser, status = "SUCCESS" }) {
  if (!currentUser?.email) {
    console.warn("[ActivityLogger] No currentUser.email - skip logging");
    return null;
  }
  const email = String(currentUser.email);
  const role = currentUser.role || "member";
  const username = email.includes("@") ? email.split("@")[0] : email;
  const payload = {
    action,
    target: target || "-",
    details: details || "",
    timestamp: serverTimestamp(),
    status,
    performedBy: {
      email,
      role,
      username
    }
  };
  try {
    const docRef = await addDoc(collection(db, ACTIVITIES_COLLECTION), payload);
    return docRef.id;
  } catch (err) {
    console.error("[ActivityLogger] Failed to log activity:", err);
    return null;
  }
}
function GoogleMapsInputWithPreview({ value, onChange, onCoordinatesChange }) {
  const [inputValue, setInputValue] = useState(value || "");
  const [cleanedUrl, setCleanedUrl] = useState(value || "");
  const [embedUrl, setEmbedUrl] = useState(null);
  const [isShortLink, setIsShortLink] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const processTimerRef = useRef(null);
  useEffect(() => () => {
    if (processTimerRef.current) clearTimeout(processTimerRef.current);
  }, []);
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "");
      if (value) {
        const { embedUrl: e, cleanedUrl: c, isShortLink: short, error: err } = processMapInput(value);
        setCleanedUrl(c || value);
        setEmbedUrl(e);
        setIsShortLink(short || false);
        setError(err);
        setShowPreview((!!e || !!short) && !!c && !err);
      } else {
        setCleanedUrl("");
        setEmbedUrl(null);
        setIsShortLink(false);
        setError(null);
        setShowPreview(false);
      }
    }
  }, [value]);
  const processAndApply = useCallback((raw) => {
    if (processTimerRef.current) clearTimeout(processTimerRef.current);
    setProcessing(true);
    setError(null);
    setEmbedUrl(null);
    setIsShortLink(false);
    setShowPreview(false);
    processTimerRef.current = setTimeout(() => {
      const trimmed = (raw || "").trim();
      if (!trimmed) {
        setCleanedUrl("");
        setEmbedUrl(null);
        setIsShortLink(false);
        setError(null);
        onChange?.("");
        onCoordinatesChange?.(null);
        setProcessing(false);
        return;
      }
      const { cleanedUrl: c, embedUrl: e, isShortLink: short, error: err } = processMapInput(trimmed);
      setProcessing(false);
      if (err) {
        setError(err);
        setEmbedUrl(null);
        setIsShortLink(false);
        setShowPreview(false);
        return;
      }
      setCleanedUrl(c);
      setEmbedUrl(e);
      setIsShortLink(short || false);
      setError(null);
      setShowPreview(true);
      onChange?.(c);
      const coords = parseCoordinatesFromUrl(c || trimmed);
      if (coords) {
        onCoordinatesChange?.(coords);
      }
    }, 300);
  }, [onChange, onCoordinatesChange]);
  const handleChange = (e) => {
    const v = e.target.value;
    setInputValue(v);
    processAndApply(v);
  };
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text/plain")?.trim();
    if (pasted) {
      e.preventDefault();
      setInputValue(pasted);
      processAndApply(pasted);
    }
  };
  const handleClear = () => {
    setInputValue("");
    setCleanedUrl("");
    setEmbedUrl(null);
    setIsShortLink(false);
    setError(null);
    setShowPreview(false);
    onChange?.("");
    onCoordinatesChange?.(null);
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    !showPreview && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: inputValue,
          onChange: handleChange,
          onPaste: handlePaste,
          placeholder: "วางลิงก์ Google Maps หรือโค้ด Embed (iframe)",
          className: `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors ${error ? "border-red-400 focus:ring-red-200" : "border-slate-200"}`
        }
      ),
      processing && /* @__PURE__ */ jsxs("p", { className: "text-sm text-slate-500 mt-1.5 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "inline-block w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" }),
        "กำลังตรวจสอบลิงก์…"
      ] }),
      error && /* @__PURE__ */ jsx("p", { className: "text-sm text-red-600 mt-1.5", children: error }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1.5", children: "แนะนำให้ใช้โค้ดฝังจากเมนู Share > Embed map เพื่อความแม่นยำที่สุด" })
    ] }),
    showPreview && cleanedUrl && /* @__PURE__ */ jsxs("div", { className: "relative rounded-2xl border border-slate-200 shadow-lg overflow-hidden bg-white", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: handleClear,
          className: "absolute top-3 right-3 z-10 w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md",
          title: "ลบ/เปลี่ยนตำแหน่ง",
          children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
        }
      ),
      embedUrl ? /* @__PURE__ */ jsx("div", { className: "h-[300px] w-full", children: /* @__PURE__ */ jsx(
        "iframe",
        {
          title: "แผนที่ตัวอย่าง",
          src: embedUrl,
          className: "w-full h-full border-0",
          allowFullScreen: true,
          loading: "lazy",
          referrerPolicy: "no-referrer-when-downgrade"
        }
      ) }) : (
        /* Fallback สำหรับลิงก์สั้น (maps.app.goo.gl) ที่ฝัง iframe ไม่ได้ */
        /* @__PURE__ */ jsxs("div", { className: "h-[300px] w-full flex flex-col items-center justify-center gap-4 bg-slate-50 px-6", children: [
          /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(MapPin, { className: "h-8 w-8 text-blue-600" }) }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-center text-sm", children: "ลิงก์สั้นไม่รองรับการแสดงตัวอย่างใน iframe" }),
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: cleanedUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors",
              children: [
                /* @__PURE__ */ jsx(ExternalLink, { className: "h-4 w-4" }),
                "เปิดใน Google Maps"
              ]
            }
          )
        ] })
      ),
      /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-600 truncate flex-1 min-w-0", children: cleanedUrl }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              setShowPreview(false);
              setInputValue(cleanedUrl);
            },
            className: "text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0",
            children: "แก้ไขลิงก์"
          }
        )
      ] })
    ] })
  ] });
}
function PropertyExporter({ property }) {
  const [isExporting, setIsExporting] = useState(false);
  if (!property) return null;
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      let propertyText = `ชื่อประกาศ: ${property.title || "-"}
`;
      propertyText += `ราคา: ${property.price ? Number(property.price).toLocaleString() + " บาท" : "ไม่ระบุ"}
`;
      propertyText += `ประเภททรัพย์: ${getPropertyLabel(property.type) || "-"}
`;
      const listingTypeStr = property.listingType === "rent" ? "เช่า/ผ่อนตรง" : "ซื้อ";
      const subListingTypeStr = property.subListingType === "rent_only" ? "เช่า" : property.subListingType === "installment_only" ? "ผ่อนตรง" : "";
      propertyText += `ประเภทการดีล: ${listingTypeStr} ${subListingTypeStr ? `(${subListingTypeStr})` : ""}
`;
      if (property.listingType === "sale") {
        propertyText += `สภาพบ้าน: ${property.propertyCondition || "-"}
`;
      }
      propertyText += `พื้นที่: ${property.area || "-"}
`;
      propertyText += `ห้องนอน: ${property.bedrooms || "-"} ห้อง
`;
      propertyText += `ห้องน้ำ: ${property.bathrooms || "-"} ห้อง
`;
      const loc = property.location || {};
      propertyText += `ทำเล: ${property.locationDisplay || `${loc.subDistrict || ""} ${loc.district || ""} ${loc.province || ""}`}
`;
      if (property.mapUrl) {
        propertyText += `ลิงก์ Google Map: ${property.mapUrl}
`;
      }
      propertyText += `
รายละเอียด:
${property.description || "-"}
`;
      if (property.nearbyPlace && property.nearbyPlace.length > 0) {
        propertyText += `
สถานที่ใกล้เคียง:
`;
        property.nearbyPlace.forEach((place, i) => {
          propertyText += `- ${place.name} (${place.distance} กม.)
`;
        });
      }
      zip.file(`ข้อมูลประกาศ-${property.displayId || "property"}.txt`, propertyText);
      if (property.images && property.images.length > 0) {
        const imgFolder = zip.folder("รูปภาพ");
        const failedImages = [];
        const fetchImage = async (url) => {
          try {
            const fetchUrl = url + (url.includes("?") ? "&" : "?") + "download=" + Date.now();
            const res = await fetch(fetchUrl, { mode: "cors", cache: "no-cache" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.blob();
          } catch (e1) {
            console.warn("Fetch with cors failed, trying no-cors or canvas fallback...", e1);
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                  if (blob) resolve(blob);
                  else reject(new Error("Canvas toBlob failed"));
                }, "image/jpeg", 0.95);
              };
              img.onerror = () => reject(new Error("Image load failed (likely CORS blocked by Storage Bucket)"));
              img.src = url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now();
            });
          }
        };
        const fetchPromises = property.images.map(async (imageUrl, index) => {
          try {
            const blob = await fetchImage(imageUrl);
            let ext = "jpg";
            if (blob.type === "image/webp") ext = "webp";
            else if (blob.type === "image/png") ext = "png";
            const isCover = property.coverImageUrl === imageUrl || !property.coverImageUrl && index === 0;
            const prefix = isCover ? "00-ภาพหน้าปก" : `0${index + 1}-ภาพ`;
            imgFolder.file(`${prefix}.${ext}`, blob);
          } catch (err) {
            console.error(`Failed to download image ${index}:`, err);
            failedImages.push(`ภาพที่ ${index + 1} (${err.message})`);
          }
        });
        await Promise.all(fetchPromises);
        if (failedImages.length > 0) {
          zip.file("read_me_errors.txt", `เกิดข้อผิดพลาดในการโหลดรูปภาพบางรูป (มักเกิดจาก CORS การตั้งค่า Firebase Storage):

${failedImages.join("\n")}

วิธีแก้: ให้ Admin รันคำสั่ง gsutil cors set บน Firebase Storage bucket`);
          alert(`โหลดรูปภาพไม่สำเร็จ ${failedImages.length} รูป (ถูกบล็อกด้วยระบบความปลอดภัย)
ระบบได้สร้างไฟล์ ZIP ข้อมูลอื่น ๆ ให้แล้ว`);
        }
      }
      const zipContent = await zip.generateAsync({ type: "blob" });
      saveAs(zipContent, `SPS-${property.displayId || "Property"}.zip`);
    } catch (error) {
      console.error("Export Error:", error);
      alert("เกิดข้อผิดพลาดในการรวบรวมไฟล์ดาวน์โหลด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: handleExport,
      disabled: isExporting,
      className: "inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition",
      title: "ดาวน์โหลดข้อมูลประกาศเป็นไฟล์ ZIP",
      children: [
        isExporting ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }),
        isExporting ? "กำลังเตรียมไฟล์…" : "โหลด ZIP นำไปแชร์"
      ]
    }
  );
}
const RENT_AVAILABILITY_OPTIONS = [
  { value: "available", label: "ว่าง", color: "bg-green-100 text-green-800" },
  { value: "reserved", label: "ติดจอง", color: "bg-red-100 text-red-800" }
];
const LISTING_TYPE_OPTIONS = [
  { value: "sale", label: "ซื้อ" },
  { value: "rent", label: "เช่า/ผ่อนตรง" }
];
const SUB_LISTING_TYPE_OPTIONS = [
  { value: "rent_only", label: "เช่า" },
  { value: "installment_only", label: "ผ่อนตรง" }
];
const PROPERTY_CONDITION_OPTIONS = [
  { value: "มือ 1", label: "มือ 1", color: "bg-blue-100 text-blue-800" },
  { value: "มือ 2", label: "มือ 2", color: "bg-slate-100 text-slate-800" }
];
const SALE_AVAILABILITY_OPTIONS = [
  { value: "available", label: "ว่าง", color: "bg-green-100 text-green-800" },
  { value: "sold", label: "ขายแล้ว", color: "bg-red-100 text-red-800" }
];
const defaultForm = {
  title: "",
  price: "",
  propertyId: "",
  displayId: "",
  type: "SPS-CD-ID",
  locationDisplay: "",
  location: { province: "", district: "", subDistrict: "" },
  bedrooms: 2,
  bathrooms: 1,
  area: "",
  description: "",
  images: [],
  coverImageUrl: "",
  // URL ของภาพหน้าปก
  agentContact: { name: "", lineId: "", phone: "" },
  featured: false,
  isRental: false,
  directInstallment: false,
  hotDeal: false,
  listingType: "sale",
  // ประเภทการดีล: 'sale' หรือ 'rent'
  subListingType: "",
  // ตัวเลือกย่อยสำหรับเช่า/ผ่อนตรง: 'rent_only' หรือ 'installment_only'
  propertyCondition: "",
  // สภาพบ้าน: 'มือ 1' หรือ 'มือ 2' (สำหรับซื้อเท่านั้น)
  availability: "available",
  // สถานะ: 'available', 'sold' (ซื้อ) หรือ 'available', 'reserved' (เช่า)
  status: "available",
  // เก็บไว้เพื่อ backward compatibility
  propertySubStatus: "",
  // เก็บไว้เพื่อ backward compatibility
  showPrice: true,
  customTags: [],
  project: "",
  // ระบบโครงการ (ชื่อโครงการที่บ้านหลังนี้อยู่)
  mapUrl: "",
  lat: null,
  lng: null,
  nearbyPlace: []
};
function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAdminAuth();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [refreshingNearby, setRefreshingNearby] = useState(false);
  const [nearbyStatusMessage, setNearbyStatusMessage] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [allProperties, setAllProperties] = useState([]);
  const [displayIdManuallyEdited, setDisplayIdManuallyEdited] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [committedLocationDisplay, setCommittedLocationDisplay] = useState("");
  const [isCustomProject, setIsCustomProject] = useState(false);
  const progressLoader = useProgressLoader();
  useEffect(() => {
    getPropertiesOnce().then(setAllProperties);
  }, []);
  const existingProjects = useMemo(() => {
    const projects = allProperties.map((p) => p.project).filter((p) => p && p.trim()).map((p) => p.trim());
    return [...new Set(projects)].sort((a, b) => a.localeCompare(b, "th"));
  }, [allProperties]);
  useEffect(() => {
    if (form.project && form.project.trim()) {
      const isExisting = existingProjects.includes(form.project.trim());
      setIsCustomProject(!isExisting);
    } else {
      setIsCustomProject(false);
    }
  }, [form.project, existingProjects]);
  useEffect(() => {
    if (!isEdit && form.type && !displayIdManuallyEdited) {
      const nextId = generatePropertyID(form.type, allProperties);
      setForm((prev) => prev.displayId !== nextId ? { ...prev, displayId: nextId } : prev);
    }
  }, [isEdit, form.type, displayIdManuallyEdited, allProperties]);
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    getPropertyByIdOnce(id).then((p) => {
      if (cancelled || !p) return;
      const loc = p.location || {};
      let listingType = "sale";
      if (p.listingType) {
        listingType = p.listingType;
      } else if (p.isRental) {
        listingType = "rent";
      }
      let subListingType = "";
      if (p.subListingType) {
        subListingType = p.subListingType;
      } else if (p.directInstallment && listingType === "rent") {
        subListingType = "installment_only";
      } else if (listingType === "rent") {
        subListingType = "rent_only";
      }
      let propertyCondition = "";
      if (p.propertyCondition) {
        propertyCondition = p.propertyCondition;
      } else if (p.propertySubStatus) {
        propertyCondition = p.propertySubStatus;
      }
      let availability = "available";
      if (p.availability) {
        availability = p.availability;
      } else if (p.status && listingType === "sale") {
        if (p.status === "sold") {
          availability = "sold";
        } else {
          availability = "available";
        }
      }
      const initialLocationDisplay = p.locationDisplay ?? `${loc.district || ""} ${loc.province || ""}`.trim();
      setForm({
        title: p.title ?? "",
        price: p.price ?? "",
        propertyId: p.propertyId ?? "",
        displayId: p.displayId ?? p.propertyId ?? "",
        type: p.type ?? "SPS-CD-ID",
        locationDisplay: initialLocationDisplay,
        location: {
          province: loc.province ?? "",
          district: loc.district ?? "",
          subDistrict: loc.subDistrict ?? ""
        },
        bedrooms: p.bedrooms ?? 2,
        bathrooms: p.bathrooms ?? 1,
        area: p.area ?? "",
        description: p.description ?? "",
        images: Array.isArray(p.images) ? p.images : [],
        coverImageUrl: p.coverImageUrl || "",
        agentContact: {
          name: p.agentContact?.name ?? "",
          lineId: p.agentContact?.lineId ?? "",
          phone: p.agentContact?.phone ?? ""
        },
        featured: Boolean(p.featured),
        isRental: Boolean(p.isRental),
        directInstallment: Boolean(p.directInstallment),
        hotDeal: Boolean(p.hotDeal),
        listingType,
        subListingType,
        propertyCondition,
        availability,
        status: p.status ?? "available",
        // Keep for backward compatibility
        propertySubStatus: p.propertySubStatus ?? "",
        // Keep for backward compatibility
        showPrice: p.showPrice !== false,
        customTags: Array.isArray(p.customTags) ? p.customTags : [],
        project: p.project ?? "",
        mapUrl: p.mapUrl ?? "",
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        nearbyPlace: Array.isArray(p.nearbyPlace) ? p.nearbyPlace : []
      });
      setCommittedLocationDisplay(initialLocationDisplay);
    }).finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);
  const update = (partial) => setForm((prev) => ({ ...prev, ...partial }));
  useEffect(() => {
    if (loading || !form.title) return;
    const locationDisplayForTags = committedLocationDisplay || "";
    const propertyDataForTags = {
      displayId: form.displayId || "",
      type: form.type,
      locationDisplay: locationDisplayForTags,
      nearbyPlace: form.nearbyPlace || [],
      listingType: form.listingType || (form.isRental ? "rent" : "sale"),
      subListingType: form.subListingType || null,
      directInstallment: form.directInstallment || form.subListingType === "installment_only",
      availability: form.availability || "available",
      status: form.status || form.availability || "available",
      propertyCondition: form.propertyCondition || null,
      propertySubStatus: form.propertySubStatus || form.propertyCondition || null,
      price: Number(form.price) || 0
    };
    const autoTags = generateAutoTags(propertyDataForTags);
    const currentCustomTags = Array.isArray(form.customTags) ? form.customTags.filter((tag) => tag && tag.trim()) : [];
    const mergedTags = mergeTags(currentCustomTags, autoTags);
    const currentTagsStr = JSON.stringify((form.customTags || []).sort());
    const mergedTagsStr = JSON.stringify(mergedTags.sort());
    if (currentTagsStr !== mergedTagsStr) {
      update({ customTags: mergedTags });
    }
  }, [
    form.price,
    form.availability,
    form.listingType,
    form.subListingType,
    form.propertyCondition,
    committedLocationDisplay,
    form.nearbyPlace,
    form.type,
    form.propertyId
    // Don't include form.customTags to avoid infinite loop
    // Don't include form.locationDisplay so typing does not trigger tag update
    // Don't include loading to avoid updating during initial load
  ]);
  const handleTypeChange = (newType) => {
    const isRental = newType === "SPS-RP-ID" || newType === "บ้านเช่า";
    const next = { type: newType, isRental };
    if (!isEdit && !displayIdManuallyEdited) {
      const nextId = generatePropertyID(newType, allProperties);
      next.displayId = nextId;
    }
    if (isRental) {
      next.propertySubStatus = "";
      next.availability = "available";
      next.listingType = "rent";
      next.propertyCondition = "";
    } else {
      next.availability = "available";
      next.propertySubStatus = "";
      next.listingType = "sale";
      next.propertyCondition = "";
    }
    update(next);
  };
  const handleListingTypeChange = (newListingType) => {
    const next = { listingType: newListingType };
    if (newListingType === "sale") {
      next.availability = "available";
      next.propertyCondition = "";
      next.subListingType = "";
      next.isRental = false;
      next.directInstallment = false;
    } else if (newListingType === "rent") {
      next.availability = "available";
      next.propertyCondition = "";
      next.subListingType = form.subListingType || "rent_only";
      next.isRental = true;
    }
    update(next);
  };
  const handleSubListingTypeChange = (newSubListingType) => {
    const next = { subListingType: newSubListingType };
    if (newSubListingType === "installment_only") {
      next.directInstallment = true;
    } else if (newSubListingType === "rent_only") {
      next.directInstallment = false;
    }
    update(next);
  };
  const handleLocationSelect = (loc) => {
    if (!loc) return;
    const displayName = loc.displayName || "";
    update({
      locationDisplay: displayName,
      location: {
        province: loc.province ?? "",
        district: loc.district ?? "",
        subDistrict: loc.subDistrict ?? ""
      }
    });
    setCommittedLocationDisplay(displayName);
  };
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setCompressing(true);
    try {
      const compressedFiles = await compressImages(files, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 2
      });
      setNewFiles((prev) => [...prev, ...compressedFiles]);
      if (!form.coverImageUrl && form.images.length === 0) {
        const firstFileUrl = URL.createObjectURL(compressedFiles[0]);
        setForm((prev) => ({ ...prev, coverImageUrl: firstFileUrl }));
      }
    } catch (err) {
      console.error("Error compressing images:", err);
      alert("เกิดข้อผิดพลาดในการบีบอัดรูปภาพ: " + err.message);
      setNewFiles((prev) => [...prev, ...files]);
    } finally {
      setCompressing(false);
    }
    e.target.value = "";
  };
  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const removeExistingImage = (index) => {
    const removedUrl = form.images[index];
    const remainingImages = form.images.filter((_, i) => i !== index);
    update({
      images: remainingImages,
      // ถ้าลบรูปที่เป็น coverImageUrl ให้ reset เป็นรูปแรก (หรือ null ถ้าไม่มีรูปเหลือ)
      coverImageUrl: form.coverImageUrl === removedUrl ? remainingImages.length > 0 ? remainingImages[0] : "" : form.coverImageUrl
    });
  };
  const handleRefreshNearbyPlaces = async () => {
    if (!isEdit || !id) {
      setNearbyStatusMessage("กรุณาบันทึกทรัพย์ก่อนจึงจะอัปเดตข้อมูลสถานที่สำคัญได้");
      return;
    }
    if (form.lat == null || form.lng == null) {
      setNearbyStatusMessage("กรุณาระบุพิกัด Latitude/Longitude ก่อน");
      return;
    }
    setRefreshingNearby(true);
    setNearbyStatusMessage("กำลังอัปเดตข้อมูลสถานที่สำคัญ…");
    try {
      const nearby = await fetchAndCacheNearbyPlaces(
        {
          id,
          lat: Number(form.lat),
          lng: Number(form.lng),
          mapUrl: form.mapUrl || "",
          nearbyPlaces: []
        },
        { forceRefresh: true }
      );
      if (nearby.length > 0) {
        setNearbyStatusMessage(`อัปเดตข้อมูลแล้ว (${nearby.length} รายการ)`);
      } else {
        setNearbyStatusMessage("ไม่พบสถานที่สำคัญในระยะ 20 กม. หรือยังตั้งค่า API ไม่ครบ");
      }
    } catch {
      setNearbyStatusMessage("อัปเดตข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setRefreshingNearby(false);
    }
  };
  const handleDelete = async () => {
    if (!isEdit || !id) return;
    const confirmed = window.confirm(
      `คุณต้องการลบบ้าน/ทรัพย์นี้ใช่หรือไม่?

"${form.title || "(ไม่มีชื่อ)"}"

การดำเนินการนี้ไม่สามารถย้อนกลับได้ และรายการจะหายจากเว็บไซต์ทันที`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deletePropertyById(id, adminDb);
      try {
        await logActivity({
          action: "property_delete",
          target: form.title || id,
          details: `ลบทรัพย์: ${form.displayId || form.propertyId || id}`,
          currentUser: user
        });
      } catch (e) {
        console.error("[PropertyForm] Failed to log activity:", e);
      }
      navigate("/sps-internal-admin/properties", { replace: true });
    } catch (err) {
      console.error(err);
      alert("ลบไม่สำเร็จ: " + (err?.message || err));
    } finally {
      setDeleting(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.locationDisplay.trim() || !form.location.province) {
      alert("กรุณาเลือกพื้นที่ (จังหวัด/อำเภอ/ตำบล) ก่อนบันทึก");
      return;
    }
    let propertyIdTrimmed = String(form.propertyId || "").trim();
    if (!propertyIdTrimmed && !isEdit) {
      propertyIdTrimmed = generatePropertyID(form.type, allProperties);
    }
    if (propertyIdTrimmed && checkPropertyIdDuplicate(propertyIdTrimmed, id, allProperties)) {
      alert("รหัสทรัพย์นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่นหรือปล่อยว่างเพื่อสร้างรหัสอัตโนมัติ");
      return;
    }
    setSaving(true);
    const price = Number(form.price) || 0;
    const area = Number(form.area) || 0;
    const locationDisplayForTags = (committedLocationDisplay || "").trim();
    const propertyDataForTags = {
      propertyId: propertyIdTrimmed || null,
      type: form.type,
      locationDisplay: locationDisplayForTags,
      nearbyPlace: form.nearbyPlace || [],
      listingType: form.listingType || (form.isRental ? "rent" : "sale"),
      subListingType: form.subListingType || null,
      directInstallment: form.directInstallment || form.subListingType === "installment_only",
      availability: form.availability || "available",
      status: form.status || form.availability || "available",
      // Backward compatibility
      propertyCondition: form.propertyCondition || null,
      propertySubStatus: form.propertySubStatus || form.propertyCondition || null,
      // Backward compatibility
      price
    };
    const autoTags = generateAutoTags(propertyDataForTags);
    const cleanedCustomTags = Array.isArray(form.customTags) ? form.customTags.filter((tag) => tag && tag.trim()) : [];
    const mergedTags = mergeTags(cleanedCustomTags, autoTags);
    const payload = {
      title: form.title.trim(),
      price,
      propertyId: propertyIdTrimmed || null,
      type: form.type,
      location: form.location,
      locationDisplay: form.locationDisplay.trim(),
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      area,
      description: form.description.trim(),
      agentContact: form.agentContact,
      featured: form.featured,
      isRental: form.isRental,
      directInstallment: form.directInstallment,
      hotDeal: form.hotDeal,
      listingType: form.listingType || (form.isRental ? "rent" : "sale"),
      subListingType: form.subListingType || null,
      // บันทึก subListingType
      propertyCondition: form.propertyCondition || null,
      availability: form.availability || "available",
      status: form.status || "available",
      // Keep for backward compatibility
      propertySubStatus: form.propertySubStatus || form.propertyCondition || null,
      // Keep for backward compatibility
      showPrice: form.showPrice !== false,
      customTags: mergedTags,
      // Use merged tags (custom + auto-generated)
      project: (form.project || "").trim() || null,
      coverImageUrl: form.coverImageUrl || null,
      // บันทึก coverImageUrl
      mapUrl: (form.mapUrl || "").trim(),
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      nearbyPlace: form.nearbyPlace || []
    };
    let imageUrls = [...form.images || []];
    const totalNew = newFiles.length;
    try {
      progressLoader.startLoading("กำลังบันทึกข้อมูล…", { simulated: true });
      if (isEdit) {
        if (totalNew > 0) {
          progressLoader.setStatus("กำลังอัปโหลดรูปภาพ…", "");
          for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            progressLoader.setStatus("กำลังอัปโหลดรูปภาพ…", `${i + 1}/${totalNew}`);
            const url = await uploadPropertyImageWithProgress(file, id, (p) => {
              const segment = 100 / totalNew;
              const overall = 70 + i * segment + p / 100 * segment;
              progressLoader.updateProgress(overall);
            });
            imageUrls.push(url);
          }
        }
        payload.images = imageUrls;
        if (form.coverImageUrl && form.coverImageUrl.startsWith("blob:")) {
          payload.coverImageUrl = imageUrls.length > 0 ? imageUrls[imageUrls.length - newFiles.length] : null;
        } else {
          payload.coverImageUrl = form.coverImageUrl && imageUrls.includes(form.coverImageUrl) ? form.coverImageUrl : imageUrls.length > 0 ? imageUrls[0] : null;
        }
        await updatePropertyById(id, payload, adminDb);
        const oldPrice = Number(form.price) || 0;
        const newPrice = payload.price;
        const priceDetails = oldPrice !== newPrice && (oldPrice > 0 || newPrice > 0) ? `Price: ${(oldPrice / 1e6).toFixed(1)}M -> ${(newPrice / 1e6).toFixed(1)}M` : totalNew > 0 ? `เพิ่มรูปภาพ ${totalNew} รูป` : "อัปเดตข้อมูล";
        const userForLog = user ? { email: user.email, role: userRole || "member" } : null;
        if (userForLog?.email) {
          try {
            await logActivity({
              action: oldPrice !== newPrice ? "UPDATE_PRICE" : "UPDATE_PROPERTY",
              target: payload.title,
              details: priceDetails,
              currentUser: userForLog
            });
          } catch (e2) {
            console.error("[PropertyForm] Failed to log activity:", e2);
          }
        }
        progressLoader.updateProgress(100);
        progressLoader.stopLoading();
        if (id && payload.lat != null && payload.lng != null) {
          fetchAndCacheNearbyPlaces({
            id,
            lat: payload.lat,
            lng: payload.lng,
            mapUrl: payload.mapUrl
          }).catch(() => {
          });
        }
        navigate("/sps-internal-admin/properties");
      } else {
        const newId = await createProperty({
          ...payload,
          images: [],
          createdBy: user?.uid || null
        }, adminDb);
        if (totalNew > 0) {
          progressLoader.setStatus("กำลังอัปโหลดรูปภาพ…", "");
          for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            progressLoader.setStatus("กำลังอัปโหลดรูปภาพ…", `${i + 1}/${totalNew}`);
            const url = await uploadPropertyImageWithProgress(file, newId, (p) => {
              const segment = 100 / totalNew;
              const overall = 70 + i * segment + p / 100 * segment;
              progressLoader.updateProgress(overall);
            });
            imageUrls.push(url);
          }
          await updatePropertyById(newId, {
            images: imageUrls,
            coverImageUrl: imageUrls.length > 0 ? imageUrls[0] : null
          }, adminDb);
        } else {
          if (form.coverImageUrl) {
            await updatePropertyById(newId, { coverImageUrl: form.coverImageUrl }, adminDb);
          }
        }
        const userForLog = user ? { email: user.email, role: userRole || "member" } : null;
        if (userForLog?.email) {
          try {
            await logActivity({
              action: "CREATE_PROPERTY",
              target: payload.title,
              details: payload.isRental ? `ราคา ${Number(payload.price).toLocaleString("th-TH")} บาท/เดือน` : `ราคา ${(payload.price / 1e6).toFixed(1)} ล้าน บาท`,
              currentUser: userForLog
            });
          } catch (e2) {
            console.error("[PropertyForm] Failed to log activity:", e2);
          }
        }
        progressLoader.updateProgress(100);
        progressLoader.stopLoading();
        if (newId && payload.lat != null && payload.lng != null) {
          fetchAndCacheNearbyPlaces({
            id: newId,
            lat: payload.lat,
            lng: payload.lng,
            mapUrl: payload.mapUrl
          }).catch(() => {
          });
        }
        navigate("/sps-internal-admin/properties");
      }
    } catch (err) {
      console.error(err);
      progressLoader.stopLoading();
      alert("บันทึกไม่สำเร็จ: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
      setUploadingFiles([]);
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-12", children: /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลด…" }) });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    progressLoader.isActive && /* @__PURE__ */ jsx(
      ModernProgressLoader,
      {
        progress: progressLoader.progress,
        status: progressLoader.status,
        subStatus: progressLoader.subStatus
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "max-w-3xl", children: [
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/sps-internal-admin/properties",
          className: "inline-flex items-center gap-2 text-slate-600 hover:text-blue-900 mb-6 transition-colors",
          children: [
            /* @__PURE__ */ jsx(ArrowLeft, { className: "h-5 w-5" }),
            /* @__PURE__ */ jsx("span", { children: "ย้อนกลับรายการทรัพย์สิน" })
          ]
        }
      ),
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-blue-900 mb-6", children: isEdit ? "แก้ไขทรัพย์" : "เพิ่มทรัพย์" }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-6 space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "รหัสทรัพย์" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: form.displayId,
                onChange: (e) => {
                  setDisplayIdManuallyEdited(true);
                  update({ displayId: e.target.value });
                },
                className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "เช่น SPS-TH-1CLASS-001 (เว้นว่างเพื่อสร้างอัตโนมัติ)"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: "แก้ไขได้เองเมื่อจำเป็น (Manual Override)" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ชื่อประกาศ *" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: form.title,
                onChange: (e) => update({ title: e.target.value }),
                required: true,
                className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "เช่น คอนโดหรู ใกล้ BTS อารีย์"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ราคา (บาท) *" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: form.price ? Number(form.price).toLocaleString("th-TH") : "",
                  onChange: (e) => {
                    const rawValue = e.target.value.replace(/,/g, "");
                    if (rawValue === "" || /^\d+$/.test(rawValue)) {
                      update({ price: rawValue });
                    }
                  },
                  required: true,
                  placeholder: "เช่น 3,000,000",
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ประเภท *" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  value: form.type,
                  onChange: (e) => handleTypeChange(e.target.value),
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                  children: [
                    !PROPERTY_TYPES.some((pt) => pt.id === form.type) && form.type && /* @__PURE__ */ jsx("option", { value: form.type, children: getPropertyLabel(form.type) }),
                    PROPERTY_TYPES.map((c) => /* @__PURE__ */ jsx("option", { value: c.id, children: c.label }, c.id))
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ประเภทการดีล *" }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-3", children: LISTING_TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => handleListingTypeChange(opt.value),
                className: `px-4 py-2.5 rounded-lg border-2 transition ${form.listingType === opt.value ? "bg-blue-900 text-white border-blue-900 font-semibold" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`,
                children: opt.label
              },
              opt.value
            )) })
          ] }),
          form.listingType === "sale" ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "สภาพบ้าน *" }),
              /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-3", children: PROPERTY_CONDITION_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => update({ propertyCondition: opt.value, propertySubStatus: opt.value }),
                  className: `px-4 py-2.5 rounded-lg border-2 transition ${form.propertyCondition === opt.value ? `${opt.color} border-blue-900 font-semibold` : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`,
                  children: opt.label
                },
                opt.value
              )) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "สถานะการขาย *" }),
              /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-3", children: SALE_AVAILABILITY_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => update({ availability: opt.value, status: opt.value === "sold" ? "sold" : "available" }),
                  className: `px-4 py-2.5 rounded-lg border-2 transition ${form.availability === opt.value ? `${opt.color} border-blue-900 font-semibold` : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`,
                  children: opt.label
                },
                opt.value
              )) })
            ] })
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "เลือกประเภท *" }),
              /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-3", children: SUB_LISTING_TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handleSubListingTypeChange(opt.value),
                  className: `px-4 py-2.5 rounded-lg border-2 transition ${form.subListingType === opt.value ? "bg-blue-900 text-white border-blue-900 font-semibold" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`,
                  children: opt.label
                },
                opt.value
              )) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "สถานะการจอง *" }),
              /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-3", children: RENT_AVAILABILITY_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => update({ availability: opt.value }),
                  className: `px-4 py-2.5 rounded-lg border-2 transition ${form.availability === opt.value ? `${opt.color} border-blue-900 font-semibold` : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`,
                  children: opt.label
                },
                opt.value
              )) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-6", children: [
            /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: form.hotDeal,
                  onChange: (e) => update({ hotDeal: e.target.checked }),
                  className: "rounded border-slate-300"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "text-slate-700", children: "Hot Deal" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: form.showPrice !== false,
                  onChange: (e) => update({ showPrice: e.target.checked }),
                  className: "rounded border-slate-300"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "text-slate-700", children: "แสดงราคาเต็มหน้าเว็บ" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "Custom Tags" }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  placeholder: "พิมพ์ Tag แล้วกด Enter เพื่อเพิ่ม",
                  className: "flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                  onKeyDown: (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const tagValue = e.target.value.trim();
                      if (tagValue) {
                        const currentTags = form.customTags || [];
                        const normalizedTag = tagValue.toLowerCase();
                        const isDuplicate = currentTags.some(
                          (tag) => tag.toLowerCase() === normalizedTag
                        );
                        if (!isDuplicate) {
                          update({ customTags: [...currentTags, tagValue] });
                          e.target.value = "";
                        } else {
                          alert(`Tag "${tagValue}" มีอยู่แล้ว`);
                        }
                      }
                    }
                  }
                }
              ) }),
              form.customTags && form.customTags.length > 0 && /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: form.customTags.map((tag, index) => /* @__PURE__ */ jsxs(
                "span",
                {
                  className: "inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-md text-sm font-medium border border-blue-200",
                  children: [
                    tag,
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          update({
                            customTags: form.customTags.filter((_, i) => i !== index)
                          });
                        },
                        className: "ml-1 text-blue-600 hover:text-blue-800 transition-colors",
                        "aria-label": `ลบ ${tag}`,
                        children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
                      }
                    )
                  ]
                },
                index
              )) })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-2", children: "Tags เหล่านี้จะถูกแสดงผลในหน้าบ้านพร้อมไอคอนอัตโนมัติ" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ระบบโครงการ" }),
            existingProjects.length > 0 ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsxs(
                "select",
                {
                  value: isCustomProject ? "__custom__" : form.project || "",
                  onChange: (e) => {
                    const value = e.target.value;
                    if (value === "__custom__") {
                      setIsCustomProject(true);
                      update({ project: "" });
                    } else {
                      setIsCustomProject(false);
                      update({ project: value });
                    }
                  },
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 bg-white",
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "", children: "-- ไม่มีโครงการ --" }),
                    existingProjects.map((project) => /* @__PURE__ */ jsx("option", { value: project, children: project }, project)),
                    /* @__PURE__ */ jsx("option", { value: "__custom__", children: "+ อื่น ๆ (ระบุเอง)" })
                  ]
                }
              ),
              isCustomProject && /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: form.project,
                  onChange: (e) => update({ project: e.target.value }),
                  placeholder: "ระบุชื่อโครงการใหม่...",
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                  autoFocus: true
                }
              )
            ] }) : /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: form.project,
                onChange: (e) => update({ project: e.target.value }),
                placeholder: "เช่น โครงการหมู่บ้านจัดสรร...",
                className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: existingProjects.length > 0 ? `มีโครงการในระบบ ${existingProjects.length} โครงการ` : "ระบุว่าบ้านหลังนี้อยู่โครงการใด (ถ้ามี)" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "พื้นที่ (จังหวัด/อำเภอ/ตำบล) *" }),
            /* @__PURE__ */ jsx(
              LocationAutocomplete,
              {
                value: form.locationDisplay,
                onChange: (v) => {
                  update({ locationDisplay: v });
                  if (!v.trim()) setCommittedLocationDisplay("");
                },
                onSelect: handleLocationSelect,
                placeholder: "ค้นหาพื้นที่..."
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ห้องนอน" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  min: "0",
                  value: form.bedrooms,
                  onChange: (e) => update({ bedrooms: e.target.value }),
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ห้องน้ำ" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  min: "0",
                  value: form.bathrooms,
                  onChange: (e) => update({ bathrooms: e.target.value }),
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "พื้นที่ (ตร.ว.)" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  min: "0",
                  step: "0.5",
                  value: form.area !== "" && form.area != null ? String(Number(form.area) / 4) : "",
                  onChange: (e) => update({ area: e.target.value ? String(Math.round(Number(e.target.value) * 4)) : "" }),
                  placeholder: "เช่น 25",
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "รายละเอียด" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                value: form.description,
                onChange: (e) => update({ description: e.target.value }),
                rows: 4,
                className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "อธิบายทรัพย์สิน..."
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ลิงก์ Google Maps (ถ้ามี)" }),
            /* @__PURE__ */ jsx(
              GoogleMapsInputWithPreview,
              {
                value: form.mapUrl,
                onChange: (url) => update({ mapUrl: url }),
                onCoordinatesChange: (coords) => coords && update({ lat: coords.lat, lng: coords.lng })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-6 space-y-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-medium text-blue-900", children: "พิกัดแผนที่ (Latitude/Longitude)" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600", children: "กรอกพิกัดหรือคลิกบนแผนที่ด้านล่างเพื่อเลือกตำแหน่งอัตโนมัติ" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Latitude (ละติจูด)" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  step: "any",
                  value: form.lat ?? "",
                  onChange: (e) => update({ lat: e.target.value ? parseFloat(e.target.value) : null }),
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                  placeholder: "เช่น 13.7563"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Longitude (ลองจิจูด)" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  step: "any",
                  value: form.lng ?? "",
                  onChange: (e) => update({ lng: e.target.value ? parseFloat(e.target.value) : null }),
                  className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                  placeholder: "เช่น 100.5018"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            MapPicker,
            {
              lat: form.lat,
              lng: form.lng,
              onLocationSelect: ({ lat, lng }) => {
                update({ lat, lng });
              },
              className: "mt-4"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "pt-2 border-t border-slate-100", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: handleRefreshNearbyPlaces,
                disabled: refreshingNearby,
                className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-800 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed transition",
                children: [
                  /* @__PURE__ */ jsx(RefreshCw, { className: `h-4 w-4 ${refreshingNearby ? "animate-spin" : ""}` }),
                  "อัปเดตข้อมูลสถานที่สำคัญ"
                ]
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-2", children: "ใช้สำหรับคำนวณระยะทางและเวลาเดินทางใหม่ (Driving)" }),
            nearbyStatusMessage && /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-600 mt-1", children: nearbyStatusMessage })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4 mb-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "รูปภาพทรัพย์" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: "คลิกที่ไอคอน ⭐ เพื่อตั้งเป็นภาพหน้าปก" })
            ] }),
            isEdit && /* @__PURE__ */ jsx(PropertyExporter, { property: form })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3 mb-4", children: [
            form.images.map((url, i) => {
              const isCoverImage = form.coverImageUrl === url || !form.coverImageUrl && i === 0;
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  className: `relative group ${isCoverImage ? "ring-4 ring-green-500 ring-offset-2" : ""}`,
                  children: [
                    /* @__PURE__ */ jsx(
                      "img",
                      {
                        src: url,
                        alt: "",
                        className: `w-24 h-24 object-cover rounded-lg ${isCoverImage ? "opacity-90" : ""}`
                      }
                    ),
                    isCoverImage && /* @__PURE__ */ jsxs("div", { className: "absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx(Star, { className: "h-3 w-3 fill-white" }),
                      /* @__PURE__ */ jsx("span", { children: "ภาพหน้าปก" })
                    ] }),
                    !isCoverImage && /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => setForm((prev) => ({ ...prev, coverImageUrl: url })),
                        className: "absolute top-1 left-1 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition",
                        title: "ตั้งเป็นภาพหน้าปก",
                        children: /* @__PURE__ */ jsx(Star, { className: "h-4 w-4" })
                      }
                    ),
                    isEdit && /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          if (form.coverImageUrl === url) {
                            const remainingImages = form.images.filter((_, idx) => idx !== i);
                            setForm((prev) => ({
                              ...prev,
                              images: remainingImages,
                              coverImageUrl: remainingImages.length > 0 ? remainingImages[0] : ""
                            }));
                          } else {
                            removeExistingImage(i);
                          }
                        },
                        className: "absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition",
                        children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" })
                      }
                    )
                  ]
                },
                i
              );
            }),
            newFiles.map((file, i) => {
              const fileUrl = URL.createObjectURL(file);
              const isCoverImage = form.coverImageUrl === fileUrl;
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  className: `relative group ${isCoverImage ? "ring-4 ring-green-500 ring-offset-2" : ""}`,
                  children: [
                    /* @__PURE__ */ jsx(
                      "img",
                      {
                        src: fileUrl,
                        alt: "",
                        className: `w-24 h-24 object-cover rounded-lg ${isCoverImage ? "opacity-90" : ""}`
                      }
                    ),
                    isCoverImage && /* @__PURE__ */ jsxs("div", { className: "absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx(Star, { className: "h-3 w-3 fill-white" }),
                      /* @__PURE__ */ jsx("span", { children: "ภาพหน้าปก" })
                    ] }),
                    !isCoverImage && /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => setForm((prev) => ({ ...prev, coverImageUrl: fileUrl })),
                        className: "absolute top-1 left-1 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition",
                        title: "ตั้งเป็นภาพหน้าปก",
                        children: /* @__PURE__ */ jsx(Star, { className: "h-4 w-4" })
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          if (form.coverImageUrl === fileUrl) {
                            const remainingNewFiles = newFiles.filter((_, idx) => idx !== i);
                            const remainingImages = form.images;
                            setForm((prev) => ({
                              ...prev,
                              coverImageUrl: remainingImages.length > 0 ? remainingImages[0] : ""
                            }));
                            setNewFiles(remainingNewFiles);
                          } else {
                            removeNewFile(i);
                          }
                        },
                        className: "absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center",
                        children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" })
                      }
                    )
                  ]
                },
                `new-${i}`
              );
            })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed", children: [
            /* @__PURE__ */ jsx(ImagePlus, { className: "h-5 w-5" }),
            compressing ? "กำลังบีบอัดรูปภาพ…" : "เลือกไฟล์รูปจากเครื่อง",
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "file",
                accept: "image/*",
                multiple: true,
                onChange: handleFileSelect,
                disabled: compressing,
                className: "hidden"
              }
            )
          ] }),
          compressing && /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 mt-2", children: "กำลังบีบอัดรูปภาพเพื่อลดขนาดไฟล์…" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: saving,
              className: "px-6 py-3 rounded-lg bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 disabled:opacity-50",
              children: saving ? "กำลังบันทึก…" : "บันทึก"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => navigate("/sps-internal-admin"),
              disabled: saving || deleting,
              className: "px-6 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50",
              children: "ยกเลิก"
            }
          ),
          isEdit && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: handleDelete,
              disabled: saving || deleting,
              className: "ml-auto px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2",
              children: [
                /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }),
                deleting ? "กำลังลบ…" : "ลบบ้าน"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
export {
  PropertyForm as default
};
