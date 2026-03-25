import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, UNSAFE_withComponentProps, useLoaderData, Outlet, UNSAFE_withErrorBoundaryProps, isRouteErrorResponse, Meta, Links, ScrollRestoration, Scripts, useNavigate, Link, useSearchParams, useParams, data, useLocation, Navigate } from "react-router";
import { isbot } from "isbot";
import React, { createContext, useState, useCallback, useMemo, useContext, useEffect, useRef, forwardRef, lazy, Suspense, memo, useTransition, createElement, useId } from "react";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getDoc, doc, serverTimestamp, setDoc, onSnapshot, getDocs, collection, updateDoc, query, where, limit, addDoc, orderBy, deleteDoc, writeBatch, startAfter } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Wrench, ChevronDown, Home as Home$1, Sparkles, House, Flame, Building2, CreditCard, Megaphone, BookOpen, Heart, LogIn, User, Settings as Settings$1, LogOut, X, Menu, ArrowUp, MapPin, KeyRound, CircleDollarSign, Search, Award, Users, Clock, Play, CalendarDays, MessageCircle, Wallet, BadgeCheck, Zap, Trophy, MapPinned, CheckCircle2, Lightbulb, Handshake, TrendingUp, DollarSign, Maximize2, Bed, Bath, ArrowRight, Star, ShieldCheck, SearchX, CheckCircle, Copy, Share2, Check, ChevronLeft, ChevronRight, ShieldAlert, Globe2, Mail, Facebook, Calculator, FileText, AlertCircle, Phone, Briefcase, Lock, Upload, Target, Shield, Calendar, ArrowLeft, ImagePlus, Save } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { getFunctions, httpsCallable } from "firebase/functions";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent") || "";
    const readyOption = isbot(userAgent) ? "onAllReady" : "onShellReady";
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              const writable = new WritableStream({
                write(chunk) {
                  controller.enqueue(
                    typeof chunk === "string" ? encoder.encode(chunk) : chunk
                  );
                },
                close() {
                  controller.close();
                }
              });
              const nodeStream = {
                write(chunk) {
                  const writer = writable.getWriter();
                  writer.write(chunk);
                  writer.releaseLock();
                  return true;
                },
                end() {
                  const writer = writable.getWriter();
                  writer.close();
                  writer.releaseLock();
                },
                on() {
                  return this;
                },
                removeListener() {
                  return this;
                }
              };
              pipe(nodeStream);
            }
          });
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const SearchStateContext = createContext(null);
const SearchActionsContext = createContext(null);
const INITIAL_FILTERS = {
  location: "",
  propertyType: "",
  priceMin: "",
  priceMax: "",
  bedrooms: "",
  bathrooms: "",
  areaMin: "",
  areaMax: "",
  propertySubStatus: "",
  // มือ 1, มือ 2
  isRental: null,
  // null = ทั้งหมด, false = ซื้อ, true = เช่า
  tag: ""
  // จาก homepage section (targetTag)
};
function SearchProvider({ children }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const updateFilters = useCallback((next) => {
    setFilters((prev) => typeof next === "function" ? next(prev) : { ...prev, ...next });
  }, []);
  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);
  const actions = useMemo(() => ({ updateFilters, clearFilters }), [updateFilters, clearFilters]);
  return /* @__PURE__ */ jsx(SearchStateContext.Provider, { value: filters, children: /* @__PURE__ */ jsx(SearchActionsContext.Provider, { value: actions, children }) });
}
function useSearch() {
  const filters = useContext(SearchStateContext);
  const actions = useContext(SearchActionsContext);
  if (!filters || !actions) throw new Error("useSearch must be used within SearchProvider");
  return { filters, ...actions };
}
const __vite_import_meta_env__ = { "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SSR": true, "VITE_CLOUDINARY_CLOUD_NAME": "dhqvmo8dd", "VITE_CLOUDINARY_UPLOAD_PRESET": "sps_property_unsigned", "VITE_FIREBASE_API_KEY": "AIzaSyAXHmRz6Qh9JLG632JXrUyVs8B7Q5uevbc", "VITE_FIREBASE_APP_ID": "1:545921029498:web:c81c14f582f7070c5372c3", "VITE_FIREBASE_AUTH_DOMAIN": "sps-property.firebaseapp.com", "VITE_FIREBASE_MEASUREMENT_ID": "G-HZ5JQ0MTXH", "VITE_FIREBASE_MESSAGING_SENDER_ID": "545921029498", "VITE_FIREBASE_PROJECT_ID": "sps-property", "VITE_FIREBASE_STORAGE_BUCKET": "sps-property.firebasestorage.app", "VITE_GAS_WEBHOOK_URL": "https://script.google.com/macros/s/AKfycbxXLqx7DQsmWF2WjcQM8OtwVkoFjIg3Vhw_MXtYTvlajlriy82qSIiV5cWisA3dHMDaCQ/exec", "VITE_GOOGLE_PLACES_API_KEY": "AIzaSyCpHgL5ckGPKM8yeol1XgsASKQdcVBq2DQ", "VITE_LONGDO_MAP_KEY": "e4aec2faf2c8e741e7fce2093b958abc" };
async function loader() {
  const getEnv = (key) => {
    if (typeof process !== "undefined" && process.env && process.env[key]) {
      return process.env[key];
    }
    try {
      return __vite_import_meta_env__[key];
    } catch (e) {
      return void 0;
    }
  };
  return {
    ENV: {
      VITE_FIREBASE_API_KEY: getEnv("VITE_FIREBASE_API_KEY"),
      VITE_FIREBASE_AUTH_DOMAIN: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
      VITE_FIREBASE_PROJECT_ID: getEnv("VITE_FIREBASE_PROJECT_ID"),
      VITE_FIREBASE_STORAGE_BUCKET: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
      VITE_FIREBASE_MESSAGING_SENDER_ID: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
      VITE_FIREBASE_APP_ID: getEnv("VITE_FIREBASE_APP_ID"),
      VITE_CLOUDINARY_CLOUD_NAME: getEnv("VITE_CLOUDINARY_CLOUD_NAME"),
      VITE_CLOUDINARY_UPLOAD_PRESET: getEnv("VITE_CLOUDINARY_UPLOAD_PRESET")
    }
  };
}
function Layout({
  children,
  loaderData
}) {
  loaderData?.ENV || {};
  return /* @__PURE__ */ jsxs("html", {
    lang: "th",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "UTF-8"
      }), /* @__PURE__ */ jsx("meta", {
        httpEquiv: "Content-Security-Policy",
        content: "upgrade-insecure-requests"
      }), /* @__PURE__ */ jsx("link", {
        rel: "icon",
        type: "image/x-icon",
        href: "/icon.png"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://res.cloudinary.com",
        crossOrigin: "anonymous"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://fonts.googleapis.com"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://firestore.googleapis.com"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://identitytoolkit.googleapis.com"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preload",
        as: "image",
        href: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=75&auto=format",
        fetchPriority: "high"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [children, /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
}
function meta$3() {
  return [{
    title: "SPS Property Solution | บ้านคอนโดสวย อมตะซิตี้ ชลบุรี"
  }, {
    name: "description",
    content: "SPS Property Solution บ้านคอนโดสวย อมตะซิตี้ ชลบุรี - ค้นหาบ้านและคอนโดที่ใช่สำหรับคุณในอมตะซิตี้ ชลบุรี"
  }];
}
const root = UNSAFE_withComponentProps(function Root() {
  const loaderData = useLoaderData() || {};
  const ENV = loaderData.ENV || {};
  return /* @__PURE__ */ jsxs(SearchProvider, {
    children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx("script", {
      dangerouslySetInnerHTML: {
        __html: `window.ENV = ${JSON.stringify(ENV)}`
      }
    })]
  });
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2({
  error
}) {
  let message = "เกิดข้อผิดพลาด";
  let details = "กรุณาลองใหม่อีกครั้ง";
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "ไม่พบหน้าที่ต้องการ" : `Error ${error.status}`;
    details = error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
  }
  return /* @__PURE__ */ jsx("div", {
    className: "min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4",
    children: /* @__PURE__ */ jsxs("div", {
      className: "text-center",
      children: [/* @__PURE__ */ jsx("h1", {
        className: "text-2xl font-bold text-slate-800 mb-2",
        children: message
      }), /* @__PURE__ */ jsx("p", {
        className: "text-slate-500 mb-6",
        children: details
      }), /* @__PURE__ */ jsx("a", {
        href: "/",
        className: "inline-flex items-center px-6 py-3 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors",
        children: "กลับหน้าแรก"
      })]
    })
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  Layout,
  default: root,
  loader,
  meta: meta$3
}, Symbol.toStringTag, { value: "Module" }));
const getEnvVar = (key, viteKey) => {
  if (typeof window !== "undefined" && window.ENV && window.ENV[key]) return window.ENV[key];
  if (typeof process !== "undefined" && process.env && process.env[key]) return process.env[key];
  return viteKey;
};
const firebaseConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY", "AIzaSyAXHmRz6Qh9JLG632JXrUyVs8B7Q5uevbc"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN", "sps-property.firebaseapp.com"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID", "sps-property"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET", "sps-property.firebasestorage.app"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID", "545921029498"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID", "1:545921029498:web:c81c14f582f7070c5372c3")
};
const isServer = typeof window === "undefined";
let publicApp, adminApp;
const existingApps = getApps();
const getOrInitApp = (name, config) => {
  const existing = existingApps.find((a) => a.name === name);
  if (existing) return existing;
  return initializeApp(config, name);
};
publicApp = getOrInitApp("public", firebaseConfig);
adminApp = getOrInitApp("admin", firebaseConfig);
let publicAuth, adminAuth;
if (!isServer) {
  publicAuth = initializeAuth(publicApp, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence]
  });
  adminAuth = initializeAuth(adminApp, {
    persistence: browserSessionPersistence
  });
} else {
  publicAuth = getAuth(publicApp);
  adminAuth = getAuth(adminApp);
}
const db = !isServer ? initializeFirestore(publicApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : initializeFirestore(publicApp, {});
const adminDb = initializeFirestore(adminApp, {});
const storage = getStorage(publicApp);
const adminStorage = getStorage(adminApp);
const publicDb = db;
const publicStorage = storage;
const app = publicApp;
const PublicAuthContext = createContext(null);
function PublicAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(publicAuth, async (u) => {
      if (u) {
        try {
          const userDoc = await getDoc(doc(publicDb, "users", u.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || "member");
            setUserProfile(userData);
          } else {
            const initialProfile = {
              email: u.email,
              role: "member",
              username: u.email?.split("@")[0] || "",
              createdAt: serverTimestamp()
            };
            await setDoc(doc(publicDb, "users", u.uid), initialProfile);
            setUserRole("member");
            setUserProfile(initialProfile);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("member");
          setUserProfile(null);
        }
      } else {
        setUserRole(null);
        setUserProfile(null);
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(publicAuth, email, password);
    try {
      const userDoc = await getDoc(doc(publicDb, "users", cred.user.uid));
      const role = userDoc.exists() ? userDoc.data().role || "member" : "member";
      if (role === "admin" || role === "super_admin") {
        await signOut(publicAuth);
        const error = new Error("บัญชี Admin ไม่สามารถเข้าสู่ระบบหน้าบ้านได้ กรุณาใช้หน้า Admin Login");
        error.code = "auth/admin-not-allowed";
        throw error;
      }
    } catch (err) {
      if (err.code === "auth/admin-not-allowed") {
        throw err;
      }
      await signOut(publicAuth);
      throw err;
    }
  };
  const logout = async () => {
    await signOut(publicAuth);
    setUserRole(null);
    setUserProfile(null);
  };
  const hasRole = (requiredRoles) => {
    if (!userRole) return false;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(userRole);
    }
    return userRole === requiredRoles;
  };
  const isSuperAdmin = () => userRole === "super_admin";
  const isAdmin = () => userRole === "admin" || userRole === "super_admin";
  const isMember = () => userRole === "member";
  const isAgent = () => userRole === "agent";
  return /* @__PURE__ */ jsx(
    PublicAuthContext.Provider,
    {
      value: {
        user,
        userRole,
        userProfile,
        loading,
        login,
        logout,
        hasRole,
        isSuperAdmin,
        isAdmin,
        isMember,
        isAgent
      },
      children
    }
  );
}
function usePublicAuth() {
  const ctx = useContext(PublicAuthContext);
  if (!ctx) throw new Error("usePublicAuth must be used within PublicAuthProvider");
  return ctx;
}
function firestoreDb(override) {
  return override || db;
}
const PROPERTIES = "properties";
const LEADS = "leads";
const SHARE_LINKS = "share_links";
const CLOUDINARY_CLOUD_NAME = "dhqvmo8dd";
const CLOUDINARY_UPLOAD_PRESET = "sps_property_unsigned";
const CLOUDINARY_ENHANCE_TRANSFORM = "e_improve:outdoor,a_auto,q_auto,f_auto";
function getCloudinaryUploadEndpoint() {
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
}
function buildEnhancedCloudinaryUrl(publicId) {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${CLOUDINARY_ENHANCE_TRANSFORM}/${publicId}`;
}
function uploadImageToCloudinaryWithProgress(file, onProgress) {
  const endpoint = getCloudinaryUploadEndpoint();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round(event.loaded / event.total * 100);
      onProgress?.(progress);
    };
    xhr.onerror = () => reject(new Error("Cloudinary upload failed"));
    xhr.onload = () => {
      let parsedResponse = null;
      try {
        parsedResponse = JSON.parse(xhr.responseText);
      } catch {
        parsedResponse = null;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const cloudinaryMessage = parsedResponse?.error?.message;
        const detail = cloudinaryMessage ? `: ${cloudinaryMessage}` : "";
        reject(new Error(`Cloudinary upload failed (${xhr.status})${detail}`));
        return;
      }
      try {
        const response = parsedResponse ?? JSON.parse(xhr.responseText);
        if (!response?.public_id) {
          reject(new Error("Cloudinary upload returned no public_id"));
          return;
        }
        onProgress?.(100);
        resolve(buildEnhancedCloudinaryUrl(response.public_id));
      } catch {
        reject(new Error("Cloudinary upload response parse failed"));
      }
    };
    xhr.send(formData);
  });
}
function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return 0;
}
function generateShareToken(length = 20) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
function getPropertiesSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = collection(d, PROPERTIES);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }));
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    callback(list);
  });
}
function isAvailable(p) {
  const s = String(p.status || p.availability || "").toLowerCase();
  return s === "available" || s === "ว่าง" || s === "";
}
async function getPropertiesOnce(availableOnly = false) {
  const q = query(collection(db, PROPERTIES), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (availableOnly) {
    list = list.filter(isAvailable);
  }
  return list;
}
async function getPropertiesOnceForListing(availableOnly = false, maxCount = 300) {
  const q = query(
    collection(db, PROPERTIES),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (availableOnly) {
    list = list.filter(isAvailable);
  }
  return list;
}
async function getPropertyByIdOnce(id) {
  const d = await getDoc(doc(db, PROPERTIES, id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() };
}
async function createOrReuseShareLink({ propertyId, createdBy, ttlHours = 24 }) {
  if (!propertyId || !createdBy) {
    throw new Error("propertyId and createdBy are required");
  }
  const nowMs = Date.now();
  const q = query(
    collection(db, SHARE_LINKS),
    where("propertyId", "==", propertyId),
    where("createdBy", "==", createdBy),
    limit(10)
  );
  const snap = await getDocs(q);
  const candidates = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const reusable = candidates.find((item) => toMillis(item.expiresAt) > nowMs);
  if (reusable) return reusable;
  const expiresAt = new Date(nowMs + ttlHours * 60 * 60 * 1e3);
  const payload = {
    propertyId,
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt
  };
  const token = generateShareToken();
  await setDoc(doc(db, SHARE_LINKS, token), payload);
  return { id: token, ...payload };
}
async function getShareLinkByToken(token) {
  if (!token) return null;
  const snap = await getDoc(doc(db, SHARE_LINKS, token));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
function isShareLinkExpired(shareLink) {
  const expiresAtMs = toMillis(shareLink?.expiresAt);
  if (!expiresAtMs) return true;
  return expiresAtMs <= Date.now();
}
async function createProperty(data2, firestore) {
  const d = firestoreDb(firestore);
  const payload = {
    ...data2,
    status: data2.status ?? "available",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref2 = await addDoc(collection(d, PROPERTIES), payload);
  return ref2.id;
}
async function updatePropertyById(id, data2, firestore) {
  const d = firestoreDb(firestore);
  await updateDoc(doc(d, PROPERTIES, id), {
    ...data2,
    updatedAt: serverTimestamp()
  });
}
async function addTagToProperty(propertyId, tag, firestore) {
  if (!propertyId || !tag || typeof tag !== "string" || !tag.trim()) return;
  const d = firestoreDb(firestore);
  const tagVal = tag.trim();
  const snap = await getDoc(doc(d, PROPERTIES, propertyId));
  if (!snap.exists()) return;
  const current = snap.data();
  const existing = Array.isArray(current.customTags) ? current.customTags : Array.isArray(current.tags) ? current.tags : [];
  const tags = [...existing];
  if (tags.some((t) => String(t).trim() === tagVal)) return;
  tags.push(tagVal);
  await updateDoc(doc(d, PROPERTIES, propertyId), {
    customTags: tags,
    tags,
    updatedAt: serverTimestamp()
  });
}
async function removeTagFromProperty(propertyId, tag, firestore) {
  if (!propertyId || !tag || typeof tag !== "string" || !tag.trim()) return;
  const d = firestoreDb(firestore);
  const tagVal = tag.trim();
  const snap = await getDoc(doc(d, PROPERTIES, propertyId));
  if (!snap.exists()) return;
  const current = snap.data();
  const existing = Array.isArray(current.customTags) ? current.customTags : Array.isArray(current.tags) ? current.tags : [];
  const filtered = existing.filter((t) => String(t).trim() !== tagVal);
  if (filtered.length === existing.length) return;
  await updateDoc(doc(d, PROPERTIES, propertyId), {
    customTags: filtered,
    tags: filtered,
    updatedAt: serverTimestamp()
  });
}
async function deletePropertyById(id, firestore) {
  const d = firestoreDb(firestore);
  await deleteDoc(doc(d, PROPERTIES, id));
}
function uploadPropertyImageWithProgress(file, propertyId, onProgress) {
  return uploadImageToCloudinaryWithProgress(file, onProgress);
}
function getLeadsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = collection(d, LEADS);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }));
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    callback(list);
  });
}
const VIEWING_REQUESTS = "viewing_requests";
function getViewingRequestsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  return onSnapshot(collection(d, VIEWING_REQUESTS), (snap) => {
    const list = snap.docs.map((d2) => ({ id: d2.id, ...d2.data(), source: "viewing_requests" }));
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    callback(list);
  });
}
const APPOINTMENTS = "appointments";
async function createAppointment(data2) {
  await addDoc(collection(db, APPOINTMENTS), {
    ...data2,
    status: data2.status ?? "pending",
    createdAt: serverTimestamp()
  });
}
function getAppointmentsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  return onSnapshot(collection(d, APPOINTMENTS), (snap) => {
    const list = snap.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
    callback(list);
  });
}
async function updateAppointmentStatus(id, status, firestore) {
  const d = firestoreDb(firestore);
  await updateDoc(doc(d, APPOINTMENTS, id), {
    status,
    updatedAt: serverTimestamp()
  });
}
const INQUIRIES = "inquiries";
async function createInquiry(data2) {
  await addDoc(collection(db, INQUIRIES), {
    ...data2,
    status: "pending",
    createdAt: serverTimestamp()
  });
}
const LOAN_REQUESTS = "loan_requests";
async function createLoanRequest(data2) {
  await addDoc(collection(db, LOAN_REQUESTS), {
    ...data2,
    status: "pending",
    createdAt: serverTimestamp()
  });
}
function getLoanRequestsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = query(
    collection(d, LOAN_REQUESTS),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => {
      const data2 = d2.data();
      return {
        id: d2.id,
        ...data2,
        createdAt: data2.createdAt
      };
    });
    callback(list);
  });
}
async function updateLoanRequestStatus(id, status, approvedAmount, firestore) {
  const d = firestoreDb(firestore);
  const payload = { status, updatedAt: serverTimestamp() };
  await updateDoc(doc(d, LOAN_REQUESTS, id), payload);
}
async function deleteLoanRequest(id, firestore) {
  const d = firestoreDb(firestore);
  await deleteDoc(doc(d, LOAN_REQUESTS, id));
}
const HERO_SLIDES = "hero_slides";
function storageRef(override) {
  return override || storage;
}
function getHeroSlidesSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = collection(d, HERO_SLIDES);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }));
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    callback(list);
  });
}
async function getHeroSlidesOnce() {
  const snap = await getDocs(collection(db, HERO_SLIDES));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}
async function createHeroSlide(data2, firestore) {
  const d = firestoreDb(firestore);
  await addDoc(collection(d, HERO_SLIDES), {
    ...data2,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
async function deleteHeroSlideById(id, imageUrl, firestore, storageOverride) {
  const str = storageRef(storageOverride);
  const d = firestoreDb(firestore);
  if (imageUrl) {
    try {
      const urlObj = new URL(imageUrl);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const fileRef = ref(str, filePath);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error("Error deleting image from Storage:", error);
    }
  }
  await deleteDoc(doc(d, HERO_SLIDES, id));
}
async function uploadHeroSlideImage(file, storageOverride) {
  const str = storageRef(storageOverride);
  const name = `hero_slides/${Date.now()}_${file.name}`;
  const fileRef = ref(str, name);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
async function batchUpdateHeroSlideOrders(updates, firestore) {
  const d = firestoreDb(firestore);
  const batch = writeBatch(d);
  updates.forEach(({ id, order }) => {
    const slideRef = doc(d, HERO_SLIDES, id);
    batch.update(slideRef, { order, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}
const PENDING_PROPERTIES = "pending_properties";
async function createPendingProperty(data2) {
  await addDoc(collection(db, PENDING_PROPERTIES), {
    ...data2,
    status: "pending",
    userId: data2.userId || data2.createdBy || null,
    createdBy: data2.createdBy || data2.userId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
function getPendingPropertiesSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = collection(d, PENDING_PROPERTIES);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }));
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    callback(list);
  });
}
async function getPendingPropertyByIdOnce(id, firestore) {
  const d = firestoreDb(firestore);
  const snap = await getDoc(doc(d, PENDING_PROPERTIES, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
async function approvePendingProperty(pendingId, firestore) {
  const d = firestoreDb(firestore);
  const pending = await getPendingPropertyByIdOnce(pendingId, firestore);
  if (!pending) throw new Error("ไม่พบข้อมูลประกาศ");
  const { id, status, createdAt, updatedAt, ...propertyData } = pending;
  const newPropertyId = await createProperty({
    ...propertyData,
    status: "available",
    createdBy: pending.createdBy || pending.userId || null
  }, firestore);
  if (pending.images && pending.images.length > 0) {
    await updatePropertyById(newPropertyId, { images: pending.images }, firestore);
  }
  await deleteDoc(doc(d, PENDING_PROPERTIES, pendingId));
  return newPropertyId;
}
async function rejectPendingProperty(id, rejectionReason = "", firestore) {
  const d = firestoreDb(firestore);
  const pending = await getPendingPropertyByIdOnce(id, firestore);
  if (!pending) throw new Error("ไม่พบข้อมูลประกาศ");
  const { id: pendingId, status, createdAt, updatedAt, ...propertyData } = pending;
  await createProperty({
    ...propertyData,
    status: "rejected",
    rejectionReason: rejectionReason || "ข้อมูลไม่ผ่านเกณฑ์การตรวจสอบ",
    createdBy: pending.createdBy || pending.userId || null
  }, firestore);
  await deleteDoc(doc(d, PENDING_PROPERTIES, id));
}
async function uploadPendingPropertyImage(file, pendingId) {
  const name = `pending_properties/${pendingId}/${Date.now()}_${file.name}`;
  const storageRef2 = ref(storage, name);
  await uploadBytes(storageRef2, file);
  return getDownloadURL(storageRef2);
}
const POPULAR_LOCATIONS = "popular_locations";
function getPopularLocationsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = collection(d, POPULAR_LOCATIONS);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }));
    list.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    callback(list);
  });
}
async function getPopularLocationsOnce() {
  const snap = await getDocs(collection(db, POPULAR_LOCATIONS));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return list;
}
async function createPopularLocation(data2, firestore) {
  const d = firestoreDb(firestore);
  const snap = await getDocs(collection(d, POPULAR_LOCATIONS));
  const maxOrder = snap.docs.length > 0 ? Math.max(...snap.docs.map((doc2) => doc2.data().order ?? 0), -1) : -1;
  await addDoc(collection(d, POPULAR_LOCATIONS), {
    ...data2,
    order: maxOrder + 1,
    isActive: data2.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
async function updatePopularLocationById(id, data2, firestore) {
  const d = firestoreDb(firestore);
  await updateDoc(doc(d, POPULAR_LOCATIONS, id), {
    ...data2,
    updatedAt: serverTimestamp()
  });
}
async function deletePopularLocationById(id, imageUrl, firestore, storageOverride) {
  const str = storageRef(storageOverride);
  const d = firestoreDb(firestore);
  if (imageUrl) {
    try {
      const urlObj = new URL(imageUrl);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const fileRef = ref(str, filePath);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error("Error deleting image from Storage:", error);
    }
  }
  await deleteDoc(doc(d, POPULAR_LOCATIONS, id));
}
async function uploadPopularLocationImage(file, storageOverride) {
  const str = storageRef(storageOverride);
  const name = `popular_locations/${Date.now()}_${file.name}`;
  const fileRef = ref(str, name);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
async function batchUpdatePopularLocationOrders(updates, firestore) {
  const d = firestoreDb(firestore);
  const batch = writeBatch(d);
  updates.forEach(({ id, order }) => {
    const locationRef = doc(d, POPULAR_LOCATIONS, id);
    batch.update(locationRef, { order, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}
const AUDIT_LOGS = "audit_logs";
const ACTIVITIES = "activities";
function getActivitiesSnapshot(callback, limitCount = 20, firestore) {
  const d = firestoreDb(firestore);
  const q = query(
    collection(d, ACTIVITIES),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => {
      const data2 = d2.data();
      return {
        id: d2.id,
        ...data2,
        user: data2.performedBy
        // normalized for display
      };
    });
    callback(list);
  });
}
const PROPERTY_VIEWS = "property_views";
const VIEWS_DAYS_LIMIT = 365;
async function recordPropertyView({ propertyId, type }) {
  if (!propertyId) return;
  const now = /* @__PURE__ */ new Date();
  const date = now.toISOString().slice(0, 10);
  await addDoc(collection(db, PROPERTY_VIEWS), {
    propertyId,
    type: type || "อื่นๆ",
    date,
    timestamp: serverTimestamp()
  });
}
function getPropertyViewsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = query(
    collection(d, PROPERTY_VIEWS),
    orderBy("timestamp", "desc"),
    limit(5e3)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }));
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - VIEWS_DAYS_LIMIT);
    const filtered = list.filter((v) => {
      const ts = v.timestamp?.toMillis?.();
      return ts && ts >= cutoff.getTime();
    });
    callback(filtered);
  });
}
async function createAuditLog(data2, firestore) {
  const d = firestoreDb(firestore);
  await addDoc(collection(d, AUDIT_LOGS), {
    ...data2,
    timestamp: serverTimestamp()
  });
}
const SYSTEM_SETTINGS = "system_settings";
const SETTINGS_DOC_ID = "main";
async function updateSystemSettings(settings, firestore) {
  const d = firestoreDb(firestore);
  await setDoc(
    doc(d, SYSTEM_SETTINGS, SETTINGS_DOC_ID),
    {
      ...settings,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
function getSystemSettingsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  return onSnapshot(doc(d, SYSTEM_SETTINGS, SETTINGS_DOC_ID), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback({
        siteName: "SPS Property Solution",
        siteDescription: "ระบบค้นหาและจัดการอสังหาริมทรัพย์",
        contactEmail: "",
        contactPhone: "",
        maintenanceMode: false,
        allowPublicRegistration: true,
        maxPropertiesPerUser: 10,
        autoApproveProperties: false
      });
    }
  });
}
const HOMEPAGE_SECTIONS = "homepage_sections";
function getHomepageSectionsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = collection(d, HOMEPAGE_SECTIONS);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }));
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    callback(list);
  });
}
async function getHomepageSectionsOnce() {
  const snap = await getDocs(collection(db, HOMEPAGE_SECTIONS));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}
async function createHomepageSection(data2, firestore) {
  const d = firestoreDb(firestore);
  const payload = {
    ...data2,
    propertyIds: data2.propertyIds || [],
    criteria: data2.criteria || {},
    order: data2.order ?? 0,
    isActive: data2.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref2 = await addDoc(collection(d, HOMEPAGE_SECTIONS), payload);
  return ref2.id;
}
async function updateHomepageSectionById(id, data2, firestore) {
  const d = firestoreDb(firestore);
  await updateDoc(doc(d, HOMEPAGE_SECTIONS, id), {
    ...data2,
    updatedAt: serverTimestamp()
  });
}
async function deleteHomepageSectionById(id, firestore) {
  const d = firestoreDb(firestore);
  await deleteDoc(doc(d, HOMEPAGE_SECTIONS, id));
}
async function batchUpdateHomepageSectionOrders(updates, firestore) {
  const d = firestoreDb(firestore);
  const batch = writeBatch(d);
  updates.forEach(({ id, order }) => {
    const ref2 = doc(d, HOMEPAGE_SECTIONS, id);
    batch.update(ref2, { order, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}
function filterPropertiesByCriteria(properties, criteria) {
  if (!criteria || Object.keys(criteria).length === 0) {
    return properties.filter((p) => p.status === "available");
  }
  const toStr = (v) => (v != null && typeof v === "string" ? v : String(v ?? "")).trim();
  let list = properties.filter((p) => p.status === "available");
  const { maxPrice, minPrice, location, type, tags } = criteria;
  if (minPrice != null && Number(minPrice) > 0) {
    const v = Number(minPrice);
    list = list.filter((p) => (Number(p?.price) || 0) >= v);
  }
  if (maxPrice != null && Number(maxPrice) > 0) {
    const v = Number(maxPrice);
    list = list.filter((p) => (Number(p?.price) || 0) <= v);
  }
  if (location && toStr(location).length > 0) {
    const loc = toStr(location).toLowerCase();
    list = list.filter((p) => {
      const prov = toStr(p?.location?.province).toLowerCase();
      const dist = toStr(p?.location?.district).toLowerCase();
      return prov.includes(loc) || dist.includes(loc);
    });
  }
  if (type && toStr(type).length > 0) {
    list = list.filter((p) => p?.type === type);
  }
  if (tags && Array.isArray(tags) && tags.length > 0) {
    list = list.filter((p) => {
      const pt = p?.customTags || p?.tags || [];
      return tags.some((t) => pt.includes(t));
    });
  }
  return list;
}
const BLOGS = "blogs";
const MAX_FEATURED_BLOGS = 4;
function getBlogsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore);
  const q = query(collection(d, BLOGS), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const blogs = snapshot.docs.map((doc2) => ({
      id: doc2.id,
      ...doc2.data()
    }));
    callback(blogs);
  });
}
async function getPublishedBlogs(pageSize = 9, lastDoc = null) {
  let q = query(
    collection(db, BLOGS),
    where("published", "==", true),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  if (lastDoc) {
    q = query(
      collection(db, BLOGS),
      where("published", "==", true),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }
  const snapshot = await getDocs(q);
  const blogs = snapshot.docs.map((doc2) => ({
    id: doc2.id,
    ...doc2.data()
  }));
  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  const hasMore = snapshot.docs.length === pageSize;
  return {
    blogs,
    lastDoc: lastVisible,
    hasMore
  };
}
async function getFeaturedBlogs() {
  const q = query(
    collection(db, BLOGS),
    where("published", "==", true),
    where("isFeatured", "==", true),
    orderBy("createdAt", "desc"),
    limit(MAX_FEATURED_BLOGS)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc2) => ({
    id: doc2.id,
    ...doc2.data()
  }));
}
async function getBlogByIdOnce(id) {
  const snap = await getDoc(doc(db, BLOGS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
async function createBlog(data2, firestore) {
  const d = firestoreDb(firestore);
  const payload = {
    title: data2.title || "",
    content: data2.content || "",
    youtubeUrl: data2.youtubeUrl || "",
    images: data2.images || [],
    published: data2.published ?? false,
    isFeatured: data2.isFeatured ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref2 = await addDoc(collection(d, BLOGS), payload);
  return ref2.id;
}
async function updateBlogById(id, data2, firestore) {
  const d = firestoreDb(firestore);
  await updateDoc(doc(d, BLOGS, id), {
    ...data2,
    updatedAt: serverTimestamp()
  });
}
async function deleteBlogById(id, firestore) {
  const d = firestoreDb(firestore);
  await deleteDoc(doc(d, BLOGS, id));
}
async function uploadBlogImage(file, onProgress, storageInstance) {
  const s = storageInstance || storage;
  const storageRef2 = ref(s, `blogs/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef2, file);
  const url = await getDownloadURL(storageRef2);
  return url;
}
const CACHE_KEY = "sps_system_settings";
const DEFAULT_SETTINGS = {
  siteName: "SPS Property Solution",
  siteDescription: "",
  contactEmail: "",
  contactPhone: "",
  maintenanceMode: false,
  allowPublicRegistration: true,
  maxPropertiesPerUser: 10,
  autoApproveProperties: false
};
const getLocalStorageItem = (key) => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const setLocalStorageItem = (key, value) => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
  }
};
const removeLocalStorageItem = (key) => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {
  }
};
function useSystemSettings() {
  const [settings, setSettings] = useState(() => {
    const cached = getLocalStorageItem(CACHE_KEY);
    if (cached) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
      } catch {
        removeLocalStorageItem(CACHE_KEY);
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(() => {
    return !getLocalStorageItem(CACHE_KEY);
  });
  useEffect(() => {
    const unsub = getSystemSettingsSnapshot((data2) => {
      const newSettings = { ...DEFAULT_SETTINGS, ...data2 };
      setSettings(newSettings);
      setLoading(false);
      setLocalStorageItem(CACHE_KEY, JSON.stringify(newSettings));
    });
    return () => unsub();
  }, []);
  return { settings, loading };
}
function MaintenancePage({ siteName = "SPS Property Solution" }) {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "relative mb-8", children: /* @__PURE__ */ jsx("div", { className: "w-24 h-24 rounded-full bg-yellow-400/10 border-2 border-yellow-400/30 flex items-center justify-center animate-pulse", children: /* @__PURE__ */ jsx(Wrench, { className: "w-10 h-10 text-yellow-400" }) }) }),
    /* @__PURE__ */ jsx("h1", { className: "text-3xl sm:text-4xl font-bold text-white mb-3", children: siteName }),
    /* @__PURE__ */ jsx("p", { className: "text-xl text-yellow-400 font-semibold mb-4", children: "ปิดปรับปรุงระบบชั่วคราว" }),
    /* @__PURE__ */ jsx("p", { className: "text-slate-400 max-w-md leading-relaxed", children: "ขออภัยในความไม่สะดวก ระบบอยู่ระหว่างการปรับปรุง กรุณากลับมาใหม่ในอีกสักครู่" }),
    /* @__PURE__ */ jsxs("div", { className: "mt-10 flex items-center gap-2 text-slate-500 text-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "w-2 h-2 rounded-full bg-yellow-400 animate-bounce", style: { animationDelay: "0ms" } }),
      /* @__PURE__ */ jsx("div", { className: "w-2 h-2 rounded-full bg-yellow-400 animate-bounce", style: { animationDelay: "150ms" } }),
      /* @__PURE__ */ jsx("div", { className: "w-2 h-2 rounded-full bg-yellow-400 animate-bounce", style: { animationDelay: "300ms" } })
    ] })
  ] });
}
const _public = UNSAFE_withComponentProps(function PublicLayout() {
  const {
    settings,
    loading
  } = useSystemSettings();
  if (!loading && settings.maintenanceMode) {
    return /* @__PURE__ */ jsx(MaintenancePage, {
      siteName: settings.siteName
    });
  }
  return /* @__PURE__ */ jsx(PublicAuthProvider, {
    children: /* @__PURE__ */ jsx(Outlet, {})
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _public
}, Symbol.toStringTag, { value: "Module" }));
function useHoverMenu(delay = 100) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const openMenu = useCallback(() => {
    clearTimer();
    setOpen(true);
  }, [clearTimer]);
  const closeMenu = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);
  const scheduleClose = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setOpen(false);
      timerRef.current = null;
    }, delay);
  }, [clearTimer, delay]);
  const toggle = useCallback(() => {
    clearTimer();
    setOpen((prev) => !prev);
  }, [clearTimer]);
  useEffect(() => () => clearTimer(), [clearTimer]);
  return { open, openMenu, closeMenu, scheduleClose, toggle };
}
const variants = {
  primary: "bg-blue-900 text-white hover:bg-blue-800 focus:ring-blue-500",
  secondary: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400",
  outline: "border-2 border-blue-900 text-blue-900 hover:bg-blue-50 focus:ring-blue-500",
  ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
};
const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base"
};
const Button = forwardRef(function Button2({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  ...props
}, ref2) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  return /* @__PURE__ */ jsxs(
    "button",
    {
      ref: ref2,
      disabled: disabled || loading,
      className: `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`,
      ...props,
      children: [
        loading && /* @__PURE__ */ jsx("span", { className: "w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" }),
        icon && iconPosition === "left" && icon,
        children,
        icon && iconPosition === "right" && icon
      ]
    }
  );
});
forwardRef(function Input2({
  label,
  error,
  helperText,
  icon,
  className = "",
  containerClassName = "",
  ...props
}, ref2) {
  return /* @__PURE__ */ jsxs("div", { className: containerClassName, children: [
    label && /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1.5", children: label }),
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      icon && /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400", children: icon }),
      /* @__PURE__ */ jsx(
        "input",
        {
          ref: ref2,
          className: `
            w-full px-4 py-3 rounded-xl border-2 
            ${icon ? "pl-10" : ""}
            ${error ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-200 focus:border-brand-500 focus:ring-brand-200"}
            text-slate-800 placeholder:text-slate-400
            focus:outline-none focus:ring-2
            transition-colors duration-200
            disabled:bg-slate-50 disabled:cursor-not-allowed
            ${className}
          `,
          ...props
        }
      )
    ] }),
    error && /* @__PURE__ */ jsx("p", { className: "mt-1.5 text-sm text-red-600", children: error }),
    helperText && !error && /* @__PURE__ */ jsx("p", { className: "mt-1.5 text-sm text-slate-500", children: helperText })
  ] });
});
forwardRef(function Card2({
  children,
  className = "",
  hover = false,
  padding = "default",
  ...props
}, ref2) {
  const paddingStyles = {
    none: "",
    sm: "p-3",
    default: "p-4",
    lg: "p-6"
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: ref2,
      className: `
        bg-white rounded-2xl shadow-card
        ${hover ? "hover:shadow-card-hover hover:-translate-y-0.5" : ""}
        ${paddingStyles[padding]}
        transition-all duration-300
        ${className}
      `,
      ...props,
      children
    }
  );
});
const badgeVariants = {
  default: "bg-slate-100 text-slate-700",
  primary: "bg-brand-100 text-brand-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  accent: "bg-accent-100 text-accent-700"
};
const badgeSizes = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1 text-sm"
};
forwardRef(function Badge2({
  children,
  variant = "default",
  size = "md",
  icon,
  className = "",
  ...props
}, ref2) {
  return /* @__PURE__ */ jsxs(
    "span",
    {
      ref: ref2,
      className: `
        inline-flex items-center gap-1 rounded-full font-medium
        ${badgeVariants[variant]}
        ${badgeSizes[size]}
        ${className}
      `,
      ...props,
      children: [
        icon,
        children
      ]
    }
  );
});
const logo = "/assets/logo-pfZ_vpby.png";
const buyHomeLinks = [
  { to: "/properties?listingType=sale", label: "รวมโครงการทั้งหมด", icon: Home$1 },
  { to: "/properties?listingType=sale&propertyCondition=มือ 1", label: "บ้านมือ 1", icon: Sparkles },
  { to: "/properties?listingType=sale&propertyCondition=มือ 2", label: "บ้านมือ 2", icon: House },
  { to: "/properties?listingType=rent&subListingType=installment_only", label: "บ้านผ่อนตรง", icon: Flame, highlight: true },
  { to: "/properties?project=NPA", label: "บ้าน NPA", icon: Building2, npaHighlight: true }
];
const serviceLinks = [
  { to: "/loan-services", label: "สินเชื่อ & ปิดภาระหนี้", icon: CreditCard },
  { to: "/post", label: "ฝากขาย / เช่า", icon: Megaphone },
  { to: "/blogs", label: "บทความ", icon: BookOpen }
];
function Navbar() {
  const buyMenu = useHoverMenu();
  const serviceMenu = useHoverMenu();
  const userMenu = useHoverMenu();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileBuyOpen, setMobileBuyOpen] = useState(false);
  const [mobileServiceOpen, setMobileServiceOpen] = useState(false);
  const desktopMenuRef = useRef(null);
  const propertiesPrefetchedRef = useRef(false);
  const { user, userRole, userProfile, logout, isAgent } = usePublicAuth();
  const navigate = useNavigate();
  const prefetchProperties = () => {
    if (propertiesPrefetchedRef.current) return;
    propertiesPrefetchedRef.current = true;
    import("./Properties-DH0XPWXS.js");
  };
  const handleLogout = async () => {
    await logout();
    userMenu.closeMenu();
    navigate("/");
  };
  useEffect(() => {
    function handleClickOutside(e) {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target)) {
        buyMenu.closeMenu();
        serviceMenu.closeMenu();
        userMenu.closeMenu();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [buyMenu, serviceMenu, userMenu]);
  return /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-[100] w-full bg-white border-b border-gray-200", children: /* @__PURE__ */ jsxs("nav", { className: "w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 lg:max-w-7xl min-h-[60px] flex flex-wrap items-center justify-between gap-3 py-2", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2 shrink min-w-0 max-w-[calc(100%-56px)] lg:max-w-none", children: [
      /* @__PURE__ */ jsx("img", { src: logo, alt: "SPS Logo", width: 120, height: 48, className: "h-8 w-auto" }),
      /* @__PURE__ */ jsx("span", { className: "text-base font-semibold text-gray-900 whitespace-nowrap truncate hidden sm:inline", children: "SPS Property Solution" })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: desktopMenuRef, className: "hidden lg:flex items-center gap-6 flex-1 justify-center min-w-0", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "nav-link text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap no-underline py-2", children: "หน้าหลัก" }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative",
          onMouseEnter: () => {
            buyMenu.openMenu();
            prefetchProperties();
          },
          onMouseLeave: buyMenu.scheduleClose,
          children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => {
                  buyMenu.toggle();
                  serviceMenu.closeMenu();
                },
                className: "nav-link inline-flex items-center gap-1 text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap bg-transparent border-0 cursor-pointer py-2",
                children: [
                  "ซื้อบ้าน",
                  /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 transition-transform ${buyMenu.open ? "rotate-180" : ""}` })
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: `absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 transition-all duration-200 ${buyMenu.open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`,
                children: buyHomeLinks.map(({ to, label, icon: Icon, highlight, npaHighlight }) => /* @__PURE__ */ jsxs(
                  Link,
                  {
                    to,
                    className: `flex items-center gap-2 px-4 py-2.5 text-sm transition ${highlight ? "font-semibold text-red-600 hover:bg-red-50" : npaHighlight ? "font-semibold text-indigo-700 hover:bg-indigo-50" : "text-slate-700 hover:bg-slate-50"}`,
                    onClick: () => buyMenu.closeMenu(),
                    children: [
                      /* @__PURE__ */ jsx(Icon, { className: `h-4 w-4 ${highlight ? "text-red-500" : npaHighlight ? "text-indigo-500" : "text-slate-500"}` }),
                      label,
                      npaHighlight && /* @__PURE__ */ jsx("span", { className: "ml-auto text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full", children: "NPA" })
                    ]
                  },
                  to
                ))
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsx(Link, { to: "/properties?listingType=rent&subListingType=rent_only", className: "nav-link text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap no-underline py-2", onMouseEnter: prefetchProperties, children: "เช่า" }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative",
          onMouseEnter: serviceMenu.openMenu,
          onMouseLeave: serviceMenu.scheduleClose,
          children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => {
                  serviceMenu.toggle();
                  buyMenu.closeMenu();
                },
                className: "nav-link inline-flex items-center gap-1 text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap bg-transparent border-0 cursor-pointer py-2",
                children: [
                  "บริการของเรา",
                  /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 transition-transform ${serviceMenu.open ? "rotate-180" : ""}` })
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: `absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 transition-all duration-200 ${serviceMenu.open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`,
                children: serviceLinks.map(({ to, label, icon: Icon }) => /* @__PURE__ */ jsxs(
                  Link,
                  {
                    to,
                    className: "flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition",
                    onClick: () => serviceMenu.closeMenu(),
                    children: [
                      /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4 text-slate-500" }),
                      label
                    ]
                  },
                  to
                ))
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsx(Link, { to: "/contact", className: "nav-link text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap no-underline py-2", children: "ติดต่อเรา" }),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/favorites",
          className: "nav-link text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap no-underline py-2",
          children: [
            /* @__PURE__ */ jsx(Heart, { className: "h-4 w-4" }),
            "รายการโปรด"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "hidden lg:flex items-center gap-3 shrink-0", children: [
      !user ? /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/login",
          className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors",
          children: [
            /* @__PURE__ */ jsx(LogIn, { className: "h-4 w-4" }),
            /* @__PURE__ */ jsx("span", { className: "whitespace-nowrap", children: "เข้าสู่ระบบ" })
          ]
        }
      ) : isAgent() || userRole ? /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative",
          onMouseEnter: userMenu.openMenu,
          onMouseLeave: userMenu.scheduleClose,
          children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => {
                  userMenu.toggle();
                  buyMenu.closeMenu();
                  serviceMenu.closeMenu();
                },
                className: "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                children: [
                  userProfile?.photoURL || user.photoURL ? /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: userProfile?.photoURL || user.photoURL,
                      alt: "Profile",
                      className: "w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                    }
                  ) : /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center", children: /* @__PURE__ */ jsx(User, { className: "h-5 w-5 text-white" }) }),
                  /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-700 hidden lg:inline", children: userProfile?.username || user.displayName || user.email?.split("@")[0] || "ผู้ใช้" }),
                  /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 text-slate-600 transition-transform ${userMenu.open ? "rotate-180" : ""}` })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: `absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 transition-all duration-200 ${userMenu.open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`,
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-slate-100", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: "เข้าสู่ระบบเป็น" }),
                    /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-slate-800", children: userProfile?.username || user.displayName || user.email?.split("@")[0] || "ผู้ใช้" })
                  ] }),
                  /* @__PURE__ */ jsxs(
                    Link,
                    {
                      to: "/profile-settings",
                      onClick: () => userMenu.closeMenu(),
                      className: "flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition",
                      children: [
                        /* @__PURE__ */ jsx(Settings$1, { className: "h-4 w-4 text-slate-500" }),
                        "ตั้งค่าโปรไฟล์"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: handleLogout,
                      className: "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition",
                      children: [
                        /* @__PURE__ */ jsx(LogOut, { className: "h-4 w-4" }),
                        "ออกจากระบบ"
                      ]
                    }
                  )
                ]
              }
            )
          ]
        }
      ) : null,
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/post",
          className: "inline-flex items-center px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold whitespace-nowrap hover:bg-amber-600 transition-colors",
          children: "ลงประกาศฟรี"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => setMobileOpen((o) => !o),
        className: "lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "aria-label": mobileOpen ? "ปิดเมนู" : "เปิดเมนู",
        children: mobileOpen ? /* @__PURE__ */ jsx(X, { className: "h-6 w-6" }) : /* @__PURE__ */ jsx(Menu, { className: "h-6 w-6" })
      }
    ),
    mobileOpen && /* @__PURE__ */ jsx("div", { className: "lg:hidden basis-full w-full py-3 border-t border-slate-100", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/",
          onClick: () => setMobileOpen(false),
          className: "w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium min-h-[44px] flex items-center",
          children: "หน้าหลัก"
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => setMobileBuyOpen((prev) => !prev),
          className: "w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-between min-h-[44px]",
          children: [
            /* @__PURE__ */ jsx("span", { children: "ซื้อบ้าน" }),
            /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 transition-transform ${mobileBuyOpen ? "rotate-180" : ""}` })
          ]
        }
      ),
      mobileBuyOpen && /* @__PURE__ */ jsx("div", { className: "w-full space-y-2", children: buyHomeLinks.map(({ to, label, icon: Icon, highlight, npaHighlight }) => /* @__PURE__ */ jsxs(
        Link,
        {
          to,
          onClick: () => {
            setMobileOpen(false);
            setMobileBuyOpen(false);
          },
          className: `w-full rounded-xl border px-4 py-3.5 flex items-center gap-3 text-sm min-h-[48px] ${highlight ? "font-semibold text-red-600" : npaHighlight ? "font-semibold text-indigo-700" : "text-slate-700"}`,
          children: [
            /* @__PURE__ */ jsx(Icon, { className: `h-4 w-4 ${highlight ? "text-red-500" : npaHighlight ? "text-indigo-500" : "text-slate-500"}` }),
            label,
            npaHighlight && /* @__PURE__ */ jsx("span", { className: "ml-auto text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full", children: "NPA" })
          ]
        },
        to
      )) }),
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/properties?listingType=rent&subListingType=rent_only",
          onClick: () => setMobileOpen(false),
          className: "w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium min-h-[44px] flex items-center",
          children: "เช่า"
        }
      ),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/blogs",
          onClick: () => setMobileOpen(false),
          className: "w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 min-h-[44px]",
          children: [
            /* @__PURE__ */ jsx(BookOpen, { className: "h-4 w-4" }),
            "บทความ"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => setMobileServiceOpen((prev) => !prev),
          className: "w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-between min-h-[44px]",
          children: [
            /* @__PURE__ */ jsx("span", { children: "บริการของเรา" }),
            /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 transition-transform ${mobileServiceOpen ? "rotate-180" : ""}` })
          ]
        }
      ),
      mobileServiceOpen && /* @__PURE__ */ jsx("div", { className: "w-full space-y-2", children: serviceLinks.map(({ to, label, icon: Icon }) => /* @__PURE__ */ jsxs(
        Link,
        {
          to,
          onClick: () => {
            setMobileOpen(false);
            setMobileServiceOpen(false);
          },
          className: "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex items-center gap-3 text-sm text-slate-700 min-h-[52px] hover:bg-slate-50 transition",
          children: [
            /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4 text-slate-500" }),
            label
          ]
        },
        to
      )) }),
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/contact",
          onClick: () => setMobileOpen(false),
          className: "w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium min-h-[44px] flex items-center",
          children: "ติดต่อเรา"
        }
      ),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/favorites",
          onClick: () => setMobileOpen(false),
          className: "w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 min-h-[44px]",
          children: [
            /* @__PURE__ */ jsx(Heart, { className: "h-4 w-4" }),
            "รายการโปรด"
          ]
        }
      ),
      !user ? /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/login",
          onClick: () => setMobileOpen(false),
          className: "w-full px-4 py-3 rounded-xl text-blue-900 hover:bg-blue-50 font-medium flex items-center gap-2 min-h-[44px]",
          children: [
            /* @__PURE__ */ jsx(LogIn, { className: "h-4 w-4" }),
            "เข้าสู่ระบบ"
          ]
        }
      ) : /* @__PURE__ */ jsxs(Fragment, { children: [
        isAgent() && /* @__PURE__ */ jsxs(
          Link,
          {
            to: "/profile-settings",
            onClick: () => setMobileOpen(false),
            className: "w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 min-h-[44px]",
            children: [
              /* @__PURE__ */ jsx(Settings$1, { className: "h-4 w-4" }),
              "ตั้งค่าโปรไฟล์"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => {
              handleLogout();
              setMobileOpen(false);
            },
            className: "w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 text-left min-h-[44px]",
            children: [
              /* @__PURE__ */ jsx(LogOut, { className: "h-4 w-4" }),
              "ออกจากระบบ"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/post",
          onClick: () => setMobileOpen(false),
          className: "w-full mt-2 inline-flex items-center justify-center px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-semibold hover:shadow-md min-h-[48px]",
          children: "ลงประกาศฟรี"
        }
      )
    ] }) })
  ] }) });
}
const HeroSlider = lazy(() => import("./HeroSlider-D0EznOG9.js"));
const Footer = lazy(() => import("./Footer-D4WdLH2D.js"));
function PageLayout({
  children,
  searchComponent = null,
  heroTitle = "SPS Property Solution",
  heroSubtitle = "บ้านคอนโดสวย อมตะซิตี้ ชลบุรี",
  heroExtra = null,
  showHero = true,
  fullHeight = false,
  useHeroSlider = false,
  showFooter = true,
  transparentSearch = false
}) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-slate-50", children: [
    /* @__PURE__ */ jsx(Navbar, {}),
    showHero && (useHeroSlider && fullHeight ? /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsxs("section", { className: "relative flex items-center justify-center min-h-[85vh] overflow-hidden", children: [
      /* @__PURE__ */ jsx(
        "img",
        {
          src: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=75&auto=format",
          alt: "",
          width: 800,
          height: 450,
          fetchPriority: "high",
          decoding: "async",
          className: "absolute inset-0 w-full h-full object-cover",
          "aria-hidden": "true"
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-black/50 to-black/70 z-[1]" }),
      /* @__PURE__ */ jsxs("div", { className: "relative z-[2] w-full max-w-5xl mx-auto px-4 text-center", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight", children: heroTitle }),
        /* @__PURE__ */ jsx("p", { className: "text-white text-lg sm:text-xl md:text-2xl drop-shadow-md font-medium mb-8", children: heroSubtitle }),
        searchComponent && /* @__PURE__ */ jsx("div", { className: transparentSearch ? "max-w-5xl mx-auto" : "bg-white/90 border border-white/30 shadow-md rounded-2xl p-3 sm:p-5 max-w-3xl mx-auto", children: searchComponent }),
        heroExtra && /* @__PURE__ */ jsx("div", { className: "mt-12", children: heroExtra })
      ] })
    ] }), children: /* @__PURE__ */ jsx(HeroSlider, { children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-5xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight", children: heroTitle }),
        /* @__PURE__ */ jsx("p", { className: "text-white text-lg sm:text-xl md:text-2xl drop-shadow-md font-medium", children: heroSubtitle })
      ] }),
      searchComponent && /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsx("div", { className: transparentSearch ? "max-w-5xl mx-auto" : "bg-white/90 border border-white/30 shadow-md rounded-2xl p-3 sm:p-5 max-w-3xl mx-auto", children: searchComponent }) }),
      heroExtra && /* @__PURE__ */ jsx("div", { className: "mt-12", children: heroExtra })
    ] }) }) }) : /* @__PURE__ */ jsxs(
      "section",
      {
        className: `relative flex items-center justify-center bg-slate-800 bg-cover bg-center ${fullHeight ? "min-h-[70vh]" : "min-h-[20vh]"}`,
        style: {
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.6)), url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920')`
        },
        children: [
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0" }),
          /* @__PURE__ */ jsxs("div", { className: `relative z-10 w-full max-w-4xl px-4 ${fullHeight ? "" : "py-4"}`, children: [
            /* @__PURE__ */ jsx("h1", { className: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-2", children: heroTitle }),
            /* @__PURE__ */ jsx("p", { className: `text-slate-200 text-center text-lg ${fullHeight ? "mb-6" : "mb-2"}`, children: heroSubtitle }),
            searchComponent && /* @__PURE__ */ jsx("div", { className: transparentSearch ? "max-w-5xl mx-auto" : `bg-white/90 border border-white/30 shadow-md rounded-2xl ${fullHeight ? "p-4 sm:p-6" : "p-3 sm:p-4 max-w-2xl mx-auto"}`, children: searchComponent }),
            heroExtra && /* @__PURE__ */ jsx("div", { className: "mt-8", children: heroExtra })
          ] })
        ]
      }
    )),
    /* @__PURE__ */ jsx("main", { children }),
    showFooter && /* @__PURE__ */ jsx(
      Suspense,
      {
        fallback: /* @__PURE__ */ jsx("footer", { className: "bg-blue-900 text-white min-h-[200px] flex items-center justify-center", "aria-hidden": "true", children: /* @__PURE__ */ jsx("div", { className: "animate-pulse text-blue-200 text-sm", children: "กำลังโหลด…" }) }),
        children: /* @__PURE__ */ jsx(Footer, {})
      }
    ),
    showBackToTop && /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: scrollToTop,
        className: "fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300",
        "aria-label": "กลับขึ้นบน",
        children: /* @__PURE__ */ jsx(ArrowUp, { className: "h-5 w-5" })
      }
    )
  ] });
}
function useTypingPlaceholder(phrases = ["ค้นหาบ้าน...", "ค้นหาคอนโด...", "ค้นหาทาวน์โฮม..."], typingSpeed = 100, deletingSpeed = 50, pauseTime = 2e3) {
  const [displayText, setDisplayText] = useState("");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const timeoutRef = useRef(null);
  const currentIndexRef = useRef(0);
  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsStopped(true);
    setIsPaused(true);
  }, []);
  const start = useCallback(() => {
    setIsStopped(false);
    setIsPaused(false);
    setIsTyping(true);
    setDisplayText("");
    setCurrentPhraseIndex(0);
    currentIndexRef.current = 0;
  }, []);
  useEffect(() => {
    if (phrases.length === 0 || isStopped) return;
    const currentPhrase = phrases[currentPhraseIndex];
    if (!currentPhrase) return;
    const type = () => {
      if (currentIndexRef.current < currentPhrase.length) {
        setDisplayText(currentPhrase.slice(0, currentIndexRef.current + 1));
        currentIndexRef.current++;
        timeoutRef.current = setTimeout(type, typingSpeed);
      } else {
        setIsPaused(true);
        timeoutRef.current = setTimeout(() => {
          setIsPaused(false);
          setIsTyping(false);
        }, pauseTime);
      }
    };
    const deleteText = () => {
      if (currentIndexRef.current > 0) {
        setDisplayText(currentPhrase.slice(0, currentIndexRef.current - 1));
        currentIndexRef.current--;
        timeoutRef.current = setTimeout(deleteText, deletingSpeed);
      } else {
        setIsTyping(true);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        currentIndexRef.current = 0;
      }
    };
    if (isTyping && !isPaused && !isStopped) {
      type();
    } else if (!isTyping && !isPaused && !isStopped) {
      deleteText();
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [phrases, currentPhraseIndex, isTyping, isPaused, isStopped, typingSpeed, deletingSpeed, pauseTime]);
  return { displayText, stop, start };
}
let thaiLocationsLoadPromise = null;
function loadSearchLocations() {
  if (!thaiLocationsLoadPromise) {
    thaiLocationsLoadPromise = import("./thaiLocations-BeSGz9qC.js").then((m) => m.searchLocations);
  }
  return thaiLocationsLoadPromise;
}
const TYPING_PHRASES = [
  "ค้นหาพื้นที่ จังหวัด อำเภอ...",
  "ค้นหาชลบุรี...",
  "ค้นหาฉะเชิงเทรา...",
  "ค้นหาระยอง..."
];
function LocationAutocomplete({
  value = "",
  onChange,
  onSelect,
  placeholder = "ค้นหาพื้นที่ จังหวัด อำเภอ ตำบล...",
  className = "",
  inputClassName = "",
  enableTypingAnimation = true
}) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [searchLocationsFn, setSearchLocationsFn] = useState(null);
  const wrapperRef = useRef(null);
  useEffect(() => {
    loadSearchLocations().then((fn) => {
      setSearchLocationsFn(() => fn);
    });
  }, []);
  const { displayText: typingPlaceholder, stop: stopTyping, start: startTyping } = useTypingPlaceholder(
    TYPING_PHRASES,
    100,
    50,
    2e3
  );
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);
  useEffect(() => {
    if (enableTypingAnimation) {
      if (isFocused) {
        stopTyping();
      } else if (!searchQuery.trim()) {
        startTyping();
      }
    }
  }, [isFocused, searchQuery, enableTypingAnimation, stopTyping, startTyping]);
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    if (!searchLocationsFn) {
      setSuggestions([]);
      return;
    }
    const results = searchLocationsFn(searchQuery);
    setSuggestions(results.slice(0, 8));
    setIsOpen(results.length > 0);
    setHighlightIndex(-1);
  }, [searchQuery, searchLocationsFn]);
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleInputChange = (e) => {
    const v = e.target.value;
    setSearchQuery(v);
    onChange?.(v);
  };
  const handleSelect = (location) => {
    const display = location.displayName;
    setSearchQuery(display);
    onChange?.(display);
    onSelect?.(location);
    setIsOpen(false);
  };
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => i < suggestions.length - 1 ? i + 1 : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => i > 0 ? i - 1 : suggestions.length - 1);
    } else if (e.key === "Enter" && highlightIndex >= 0 && suggestions[highlightIndex]) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };
  return /* @__PURE__ */ jsxs("div", { ref: wrapperRef, className: `relative ${className}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(MapPin, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: searchQuery,
          onChange: handleInputChange,
          onFocus: (e) => {
            setIsFocused(true);
            stopTyping();
            if (searchQuery.trim() && suggestions.length > 0) {
              setIsOpen(true);
            }
          },
          onBlur: () => {
            setIsFocused(false);
            if (!searchQuery.trim()) {
              startTyping();
            }
            setTimeout(() => setIsOpen(false), 200);
          },
          onKeyDown: handleKeyDown,
          placeholder: isFocused ? "ค้นหาทำเล, จังหวัด, อำเภอ..." : enableTypingAnimation && !searchQuery.trim() ? typingPlaceholder : placeholder,
          autoComplete: "off",
          className: `w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0 ${inputClassName}`
        }
      )
    ] }),
    isOpen && suggestions.length > 0 && /* @__PURE__ */ jsx(
      "ul",
      {
        className: "absolute z-50 w-full mt-1 py-1 bg-white rounded-xl shadow-lg max-h-60 overflow-auto border-0",
        role: "listbox",
        children: suggestions.map((loc, i) => /* @__PURE__ */ jsxs(
          "li",
          {
            role: "option",
            "aria-selected": i === highlightIndex,
            onMouseEnter: () => setHighlightIndex(i),
            onClick: () => handleSelect(loc),
            className: `px-4 py-2.5 cursor-pointer flex items-center gap-2 text-sm ${i === highlightIndex ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-50"}`,
            children: [
              /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4 text-slate-400 shrink-0" }),
              /* @__PURE__ */ jsx("span", { children: loc.displayName })
            ]
          },
          loc.id
        ))
      }
    )
  ] });
}
const PROPERTY_TYPES = [
  { id: "SPS-S-1CLASS-ID", label: "บ้านเดี่ยว 1 ชั้น" },
  { id: "SPS-S-2CLASS-ID", label: "บ้านเดี่ยว 2 ชั้น" },
  { id: "SPS-TW-1CLASS-ID", label: "บ้านแฝด 1 ชั้น" },
  { id: "SPS-TW-2CLASS-ID", label: "บ้านแฝด 2 ชั้น" },
  { id: "SPS-TH-1CLASS-ID", label: "ทาวน์โฮม 1 ชั้น" },
  { id: "SPS-TH-2CLASS-ID", label: "ทาวน์โฮม 2 ชั้น" },
  { id: "SPS-PV-ID", label: "บ้านพูลวิลล่า" },
  { id: "SPS-CD-ID", label: "คอนโด" },
  { id: "SPS-LD-ID", label: "ที่ดินเปล่า" },
  { id: "SPS-RP-ID", label: "บ้านเช่า/ผ่อนตรง" }
];
function getPropertyLabel(idOrLabel) {
  if (!idOrLabel) return "";
  const match = PROPERTY_TYPES.find((pt) => pt.id === idOrLabel);
  return match ? match.label : idOrLabel;
}
const PRICE_RANGES = [
  { label: "ทุกราคา", min: "", max: "" },
  { label: "ไม่เกิน 1 ล้าน", min: "", max: "1000000" },
  { label: "1 - 2 ล้าน", min: "1000000", max: "2000000" },
  { label: "2 - 3 ล้าน", min: "2000000", max: "3000000" },
  { label: "3 - 5 ล้าน", min: "3000000", max: "5000000" },
  { label: "5 - 10 ล้าน", min: "5000000", max: "10000000" },
  { label: "10 ล้านขึ้นไป", min: "10000000", max: "" }
];
function HomeSearch() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [propertyType, setPropertyType] = useState("");
  const [priceRange, setPriceRange] = useState(PRICE_RANGES[0]);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const priceRef = useRef(null);
  const typeRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (priceRef.current && !priceRef.current.contains(e.target)) setIsPriceOpen(false);
      if (typeRef.current && !typeRef.current.contains(e.target)) setIsTypeOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (activeTab === "buy") {
      params.set("type", "buy");
    } else if (activeTab === "rent") {
      params.set("type", "rent");
    } else if (activeTab === "installment") {
      params.set("type", "rent");
      params.set("subListingType", "installment_only");
    }
    if (searchQuery.trim()) {
      if (selectedLocation && searchQuery === selectedLocation.displayName) {
        params.set("location", selectedLocation.district || selectedLocation.province);
      } else {
        params.set("q", searchQuery.trim());
      }
    }
    if (propertyType) {
      params.set("propertyType", propertyType);
    }
    if (priceRange.min) {
      params.set("priceMin", priceRange.min);
    }
    if (priceRange.max) {
      params.set("priceMax", priceRange.max);
    }
    navigate(`/properties?${params.toString()}`);
  };
  return /* @__PURE__ */ jsxs("div", { className: "w-full max-w-5xl mx-auto px-4 sm:px-0", children: [
    /* @__PURE__ */ jsx("div", { className: "flex gap-1 mb-0 ml-2 sm:ml-4", children: [
      { id: "buy", label: "ซื้อ", icon: Home$1 },
      { id: "rent", label: "เช่า", icon: KeyRound },
      { id: "installment", label: "ผ่อนตรง", icon: Sparkles }
    ].map((tab) => /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => setActiveTab(tab.id),
        className: `flex items-center gap-2 px-6 py-3 rounded-t-2xl font-bold transition-all duration-200 ${activeTab === tab.id ? "bg-white text-blue-900 shadow-card" : "bg-blue-900/40 text-white/80 hover:bg-blue-900/60 backdrop-blur-sm"}`,
        children: [
          /* @__PURE__ */ jsx(tab.icon, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { children: tab.label })
        ]
      },
      tab.id
    )) }),
    /* @__PURE__ */ jsx("div", { className: "bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-3 sm:p-4 border border-slate-100 relative z-10", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col lg:flex-row gap-3 items-stretch lg:items-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("div", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-4", children: "ทำเล / โครงการ" }),
        /* @__PURE__ */ jsx(
          LocationAutocomplete,
          {
            value: searchQuery,
            onChange: (v) => {
              setSearchQuery(v);
              if (selectedLocation && v !== selectedLocation.displayName) {
                setSelectedLocation(null);
              }
            },
            onSelect: setSelectedLocation,
            placeholder: "ค้นหาทำเล, จังหวัด, อำเภอ หรือชื่อโครงการ...",
            inputClassName: "!bg-slate-50 !rounded-2xl !py-4 border-2 border-transparent focus:!border-blue-200",
            enableTypingAnimation: true
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "hidden lg:block w-px h-12 bg-slate-100 mx-1" }),
      /* @__PURE__ */ jsxs("div", { className: "relative flex-1", ref: typeRef, children: [
        /* @__PURE__ */ jsx("div", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-4", children: "ประเภททรัพย์" }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => {
              setIsTypeOpen(!isTypeOpen);
              setIsPriceOpen(false);
            },
            className: `w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border-2 transition-all duration-200 ${isTypeOpen ? "border-blue-200 bg-white ring-4 ring-blue-50" : "border-transparent"}`,
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
                /* @__PURE__ */ jsx(Building2, { className: `h-5 w-5 ${propertyType ? "text-blue-600" : "text-slate-400"}` }),
                /* @__PURE__ */ jsx("span", { className: `text-sm font-semibold truncate ${propertyType ? "text-slate-900" : "text-slate-500"}`, children: propertyType ? PROPERTY_TYPES.find((t) => t.id === propertyType)?.label : "ทุกประเภท" })
              ] }),
              /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 text-slate-400 transition-transform duration-300 ${isTypeOpen ? "rotate-180" : ""}` })
            ]
          }
        ),
        isTypeOpen && /* @__PURE__ */ jsxs("div", { className: "absolute top-[calc(100%+10px)] left-0 w-full min-w-[220px] bg-white rounded-2xl shadow-dropdown border border-slate-100 py-2 z-50", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setPropertyType("");
                setIsTypeOpen(false);
              },
              className: `w-full text-left px-5 py-3 text-sm transition-colors ${!propertyType ? "bg-blue-50 text-blue-900 font-bold" : "text-slate-600 hover:bg-slate-50"}`,
              children: "ทุกประเภท"
            }
          ),
          PROPERTY_TYPES.map((type) => /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setPropertyType(type.id);
                setIsTypeOpen(false);
              },
              className: `w-full text-left px-5 py-3 text-sm transition-colors ${propertyType === type.id ? "bg-blue-50 text-blue-900 font-bold" : "text-slate-600 hover:bg-slate-50"}`,
              children: type.label
            },
            type.id
          ))
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "hidden lg:block w-px h-12 bg-slate-100 mx-1" }),
      /* @__PURE__ */ jsxs("div", { className: "relative flex-1", ref: priceRef, children: [
        /* @__PURE__ */ jsx("div", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-4", children: "ช่วงราคา" }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => {
              setIsPriceOpen(!isPriceOpen);
              setIsTypeOpen(false);
            },
            className: `w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border-2 transition-all duration-200 ${isPriceOpen ? "border-blue-200 bg-white ring-4 ring-blue-50" : "border-transparent"}`,
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
                /* @__PURE__ */ jsx(CircleDollarSign, { className: `h-5 w-5 ${priceRange.min || priceRange.max ? "text-blue-600" : "text-slate-400"}` }),
                /* @__PURE__ */ jsx("span", { className: `text-sm font-semibold truncate ${priceRange.min || priceRange.max ? "text-slate-900" : "text-slate-500"}`, children: priceRange.label })
              ] }),
              /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 text-slate-400 transition-transform duration-300 ${isPriceOpen ? "rotate-180" : ""}` })
            ]
          }
        ),
        isPriceOpen && /* @__PURE__ */ jsx("div", { className: "absolute top-[calc(100%+10px)] left-0 w-full min-w-[200px] bg-white rounded-2xl shadow-dropdown border border-slate-100 py-2 z-50", children: PRICE_RANGES.map((range, idx) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setPriceRange(range);
              setIsPriceOpen(false);
            },
            className: `w-full text-left px-5 py-3 text-sm transition-colors ${priceRange.label === range.label ? "bg-blue-50 text-blue-900 font-bold" : "text-slate-600 hover:bg-slate-50"}`,
            children: range.label
          },
          idx
        )) })
      ] }),
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "primary",
          size: "lg",
          icon: /* @__PURE__ */ jsx(Search, { className: "h-5 w-5" }),
          onClick: handleSearch,
          className: "lg:ml-2 shadow-lg shadow-blue-200 hover:shadow-blue-300",
          children: "ค้นหา"
        }
      )
    ] }) })
  ] });
}
function getCloudName() {
  if (typeof window !== "undefined" && window.ENV?.VITE_CLOUDINARY_CLOUD_NAME) {
    return window.ENV.VITE_CLOUDINARY_CLOUD_NAME;
  }
  try {
    return "dhqvmo8dd";
  } catch {
    return "";
  }
}
function getCdnBase() {
  const name = getCloudName();
  return name ? `https://res.cloudinary.com/${name}/image/upload` : "";
}
function getFetchBase() {
  const name = getCloudName();
  return name ? `https://res.cloudinary.com/${name}/image/fetch/` : "";
}
function isCloudinaryUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.includes("res.cloudinary.com") && url.includes("/image/upload");
}
function isFirebaseStorageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.includes("firebasestorage.googleapis.com") || url.includes("firebasestorage.app") || url.includes("appspot.com");
}
function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length < 20 || trimmed.includes(" ")) return false;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const isFirebaseStorage = trimmed.includes("firebasestorage.googleapis.com");
    const validFirebaseBucket = trimmed.includes("appspot.com") || trimmed.includes("firebasestorage.app");
    if (isFirebaseStorage && !validFirebaseBucket) return false;
    return true;
  } catch {
    return false;
  }
}
function parseCloudinaryPath(fullUrl) {
  if (!isCloudinaryUrl(fullUrl)) return null;
  try {
    const u = new URL(fullUrl);
    const match = u.pathname.match(/\/image\/upload\/(.+)/);
    if (!match) return null;
    const afterUpload = match[1];
    const parts = afterUpload.split("/");
    if (parts.length >= 2) {
      const publicId = parts.slice(1).join("/");
      return { transform: parts[0], publicId };
    }
    return { transform: "", publicId: afterUpload };
  } catch {
    return null;
  }
}
function getCloudinaryImageUrl(url, options = {}) {
  if (!url || typeof url !== "string") return url;
  if (!isCloudinaryUrl(url)) return url;
  const CDN_BASE = getCdnBase();
  if (!CDN_BASE) return url;
  const parsed = parseCloudinaryPath(url);
  if (!parsed) return url;
  const { width, height, crop = "fill", quality = "auto", format = "auto" } = options;
  const transforms = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if ((width || height) && crop) transforms.push(`c_${crop}`);
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);
  const transformStr = transforms.join(",");
  const newPath = transformStr ? `${transformStr}/${parsed.publicId}` : `${parsed.transform}/${parsed.publicId}`;
  return `${CDN_BASE}/${newPath}`;
}
function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== "string") return url;
  if (isCloudinaryUrl(url)) {
    return getCloudinaryImageUrl(url, { ...options, format: "webp", quality: options.quality ?? "auto" });
  }
  if (isFirebaseStorageUrl(url)) {
    return url;
  }
  const FETCH_BASE = getFetchBase();
  if (!FETCH_BASE) return url;
  const { width, height, crop = "fill", quality = "auto" } = options;
  const parts = ["f_webp", `q_${quality}`];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if ((width || height) && crop) parts.push(`c_${crop}`);
  const transformStr = parts.join(",");
  return `${FETCH_BASE}${transformStr}/${encodeURIComponent(url)}`;
}
function getCloudinaryThumbUrl(url) {
  return getOptimizedImageUrl(url, { width: 400, height: 300, crop: "fill" });
}
function getCloudinaryMediumUrl(url) {
  return getOptimizedImageUrl(url, { width: 800, height: 450, crop: "fill" });
}
function getCloudinaryLargeUrl(url) {
  return getOptimizedImageUrl(url, { width: 1200, height: 675, crop: "fill" });
}
function useInView(options = {}) {
  const { rootMargin = "0px", threshold = 0.1, triggerOnce = true } = options;
  const [isInView, setIsInView] = useState(false);
  const ref2 = useRef(null);
  useEffect(() => {
    const el = ref2.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry2]) => {
        if (entry2.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold, triggerOnce]);
  return [ref2, isInView];
}
function sanitizeBlogSlugPart(str) {
  return String(str).trim().replace(/\s+/g, "-").replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\-]/g, "");
}
function generateBlogSlug(blog) {
  if (!blog?.id) return "";
  const titlePart = blog.title ? sanitizeBlogSlugPart(blog.title).replace(/-{2,}/g, "-") || `blog-${blog.id}` : `blog-${blog.id}`;
  return `${titlePart}--${blog.id}`;
}
function getBlogPath(blog) {
  if (!blog?.id) return "/blogs";
  return `/blogs/${generateBlogSlug(blog)}`;
}
function extractIdFromSlug$1(slugParam) {
  if (!slugParam) return null;
  const sep = slugParam.lastIndexOf("--");
  return sep !== -1 ? slugParam.substring(sep + 2) : slugParam;
}
const DynamicPropertySection = lazy(() => import("./DynamicPropertySection-ZYUrMh-M.js"));
const PLACEHOLDER_BG = "bg-gradient-to-br from-blue-600 to-blue-500";
function formatBlogDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}
function getYouTubeThumbnail(url) {
  const videoId = extractYouTubeId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
}
function PopularLocationCard({ loc, buildLocationPath, highPriority = false }) {
  const displayName = loc.displayName || loc.district || loc.province;
  const rawUrl = loc.imageUrl || loc.image_url || "";
  const imageUrl = typeof rawUrl === "string" && rawUrl.trim() ? rawUrl.trim() : null;
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const showImage = imageUrl && failedImageUrl !== imageUrl;
  return /* @__PURE__ */ jsxs(
    Link,
    {
      to: buildLocationPath(loc),
      className: "group relative aspect-video rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 block",
      children: [
        /* @__PURE__ */ jsx("div", { className: `absolute inset-0 z-0 ${PLACEHOLDER_BG} flex items-center justify-center`, children: /* @__PURE__ */ jsx(MapPinned, { className: "h-16 w-16 text-white/40" }) }),
        showImage && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 z-[1] overflow-hidden", onContextMenu: (e) => e.preventDefault(), children: /* @__PURE__ */ jsx(
          "img",
          {
            src: getOptimizedImageUrl(imageUrl, { width: 400, height: 225, crop: "fill" }),
            alt: displayName,
            width: 400,
            height: 225,
            className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none",
            loading: highPriority ? "eager" : "lazy",
            decoding: "async",
            draggable: false,
            fetchPriority: highPriority ? "high" : "auto",
            onError: () => setFailedImageUrl(imageUrl)
          },
          imageUrl
        ) }),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" }),
        /* @__PURE__ */ jsx("span", { className: "absolute bottom-4 left-4 right-4 text-white text-xl font-bold drop-shadow z-20", children: displayName })
      ]
    }
  );
}
const serviceHighlights = [
  {
    icon: CheckCircle2,
    title: "รับปิดหนี้ รวมหนี้ ผ่อนทางเดียว",
    iconClassName: "text-emerald-300"
  },
  {
    icon: Building2,
    title: "บริการสินเชื่อครบวงจร",
    iconClassName: "text-blue-200"
  },
  {
    icon: Lightbulb,
    title: "รับปรึกษาภาระหนี้สินเกินรายได้",
    iconClassName: "text-amber-300"
  },
  {
    icon: Handshake,
    title: "บริการครบวงจรทุกขั้นตอน",
    iconClassName: "text-purple-200"
  },
  {
    icon: TrendingUp,
    title: "รับนักลงทุนพร้อมบริหารงานเช่า",
    iconClassName: "text-cyan-200"
  }
];
const ANIMATE_VISIBLE = "opacity-100 translate-y-0";
const ANIMATE_HIDDEN = "opacity-0 translate-y-6";
const ANIMATE_TRANSITION = "transition-all duration-500 ease-out";
const PropertySectionSkeleton = () => /* @__PURE__ */ jsx("section", { className: "py-8 bg-slate-50 animate-pulse", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
  /* @__PURE__ */ jsx("div", { className: "h-6 w-40 bg-slate-200 rounded-lg mb-6" }),
  /* @__PURE__ */ jsx("div", { className: "flex gap-5 overflow-hidden", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "shrink-0 w-[300px] rounded-2xl bg-slate-200 h-64" }, i)) })
] }) });
function Home() {
  const [properties, setProperties] = useState([]);
  const [popularLocations, setPopularLocations] = useState([]);
  const [homepageSections, setHomepageSections] = useState([]);
  const [featuredBlogs, setFeaturedBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [showBlogs, setShowBlogs] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [refBlogs, inViewBlogs] = useInView({ rootMargin: "80px", threshold: 0.05 });
  const [refSections, inViewSections] = useInView({ rootMargin: "80px", threshold: 0.05 });
  const [refLocations, inViewLocations] = useInView({ rootMargin: "80px", threshold: 0.05 });
  const fetchedBlogsRef = useRef(false);
  const fetchedSectionsRef = useRef(false);
  const fetchedLocationsRef = useRef(false);
  useEffect(() => {
    if (!inViewBlogs || fetchedBlogsRef.current) return;
    fetchedBlogsRef.current = true;
    setBlogsLoading(true);
    getFeaturedBlogs().then((blogs) => setFeaturedBlogs((blogs || []).slice(0, 4))).catch((e) => console.error("Error loading featured blogs:", e)).finally(() => setBlogsLoading(false));
  }, [inViewBlogs]);
  useEffect(() => {
    if (!inViewSections || fetchedSectionsRef.current) return;
    fetchedSectionsRef.current = true;
    setSectionsLoading(true);
    Promise.all([getPropertiesOnce(false), getHomepageSectionsOnce()]).then(([allProperties, sections]) => {
      setProperties(allProperties);
      setHomepageSections((sections || []).filter((s) => s.isActive === true));
    }).catch((e) => console.error("Error loading sections:", e)).finally(() => setSectionsLoading(false));
  }, [inViewSections]);
  useEffect(() => {
    if (!inViewLocations || fetchedLocationsRef.current) return;
    fetchedLocationsRef.current = true;
    setLocationsLoading(true);
    getPopularLocationsOnce().then((locations) => {
      const list = (locations || []).filter((loc) => loc.isActive === true);
      setPopularLocations(list);
    }).catch((e) => console.error("Error loading popular locations:", e)).finally(() => setLocationsLoading(false));
  }, [inViewLocations]);
  useEffect(() => {
    if (featuredBlogs.length === 0 || blogsLoading) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setShowBlogs(true));
    });
    return () => cancelAnimationFrame(id);
  }, [featuredBlogs.length, blogsLoading]);
  useEffect(() => {
    if (sectionsLoading) return;
    const hasSectionData = homepageSections.length > 0 || properties.some((p) => p.status === "available" && p.featured);
    if (!hasSectionData) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setShowSections(true));
    });
    return () => cancelAnimationFrame(id);
  }, [sectionsLoading, homepageSections.length, properties]);
  useEffect(() => {
    if (locationsLoading) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setShowLocations(true));
    });
    return () => cancelAnimationFrame(id);
  }, [locationsLoading]);
  const sectionPropertiesMap = useMemo(() => {
    const map = {};
    homepageSections.forEach((section) => {
      if (section.type === "manual" && section.propertyIds?.length > 0) {
        const list = section.propertyIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean).slice(0, 4);
        map[section.id] = list;
      } else if (section.type === "query" && section.criteria) {
        const filtered = filterPropertiesByCriteria(properties, section.criteria);
        map[section.id] = filtered.slice(0, 4);
      } else {
        map[section.id] = [];
      }
    });
    return map;
  }, [homepageSections, properties]);
  const buildLocationPath = (location) => {
    const params = new URLSearchParams();
    const searchLocation = location.district || location.province;
    if (searchLocation) {
      params.set("location", searchLocation);
    }
    return `/properties?${params.toString()}`;
  };
  const available = properties.filter((p) => p.status === "available");
  const featured = available.filter((p) => p.featured === true).slice(0, 4);
  const hasSections = homepageSections.length > 0;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Helmet, { children: [
      /* @__PURE__ */ jsx("title", { children: "SPS Property Solution | บ้านคอนโดสวย อมตะซิตี้ ชลบุรี" }),
      /* @__PURE__ */ jsx("meta", { name: "description", content: "SPS Property Solution บ้านคอนโดสวย อมตะซิตี้ ชลบุรี - ค้นหาบ้านและคอนโดที่ใช่สำหรับคุณในอมตะซิตี้ ชลบุรี" }),
      /* @__PURE__ */ jsx("link", { rel: "canonical", href: "https://spspropertysolution.com/" }),
      /* @__PURE__ */ jsx("script", { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "SPS Property Solution",
        "image": "https://spspropertysolution.com/icon.png",
        "description": "SPS Property Solution ให้บริการรับฝาก ซื้อ-ขาย-เช่า-จำนอง-ขายฝาก อสังหาริมทรัพย์ทุกประเภทในเขตพื้นที่ ชลบุรี ฉะเชิงเทรา ระยอง ปทุมธานี กทม.",
        "url": "https://spspropertysolution.com",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "เมืองชลบุรี",
          "addressRegion": "ชลบุรี",
          "addressCountry": "TH"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "13.3611",
          "longitude": "100.9847"
        },
        "openingHoursSpecification": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
          ],
          "opens": "00:00",
          "closes": "23:59"
        }
      }) })
    ] }),
    /* @__PURE__ */ jsxs(
      PageLayout,
      {
        heroTitle: /* @__PURE__ */ jsxs("span", { className: "inline-block leading-tight", children: [
          /* @__PURE__ */ jsxs("span", { className: "block text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white", children: [
            "รวมภาระหนี้",
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-yellow-400 drop-shadow", children: "ผ่อนบ้านทางเดียว" })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "block text-lg sm:text-xl font-medium text-blue-200 mt-3", children: "อสังหาริมทรัพย์คุณภาพ อมตะซิตี้ · ชลบุรี" })
        ] }),
        heroSubtitle: "",
        searchComponent: /* @__PURE__ */ jsx(HomeSearch, {}),
        useHeroSlider: true,
        transparentSearch: true,
        heroExtra: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto w-full space-y-6", children: [
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4", children: serviceHighlights.map((item) => {
            const IconComponent = item.icon;
            return /* @__PURE__ */ jsxs(
              "div",
              {
                className: "flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-white/15 border border-white/25 shadow-sm",
                children: [
                  /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsx(IconComponent, { className: `h-4.5 w-4.5 ${item.iconClassName}` }) }),
                  /* @__PURE__ */ jsx("p", { className: "text-white text-base sm:text-lg leading-relaxed font-medium", children: item.title })
                ]
              },
              item.title
            );
          }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 text-gray-300 text-sm", children: [
            /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4" }),
            /* @__PURE__ */ jsx("p", { children: "พื้นที่ให้บริการ: ชลบุรี ฉะเชิงเทรา ระยอง ปทุมธานี กทม." })
          ] })
        ] }),
        searchAfterHeroExtra: true,
        fullHeight: true,
        children: [
          /* @__PURE__ */ jsx("section", { className: "bg-blue-900 py-8 sm:py-10", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-6 text-center", children: [
            { icon: Building2, value: "500+", label: "ทรัพย์สินทั้งหมด" },
            { icon: Award, value: "12+", label: "ปีประสบการณ์" },
            { icon: Users, value: "1,200+", label: "ลูกค้าที่ไว้วางใจ" },
            { icon: Clock, value: "24/7", label: "บริการตลอดเวลา" }
          ].map((stat) => {
            const Icon = stat.icon;
            return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2", children: [
              /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-1", children: /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5 text-yellow-400" }) }),
              /* @__PURE__ */ jsx("span", { className: "text-3xl sm:text-4xl font-extrabold text-yellow-400 leading-none", children: stat.value }),
              /* @__PURE__ */ jsx("span", { className: "text-sm text-blue-200 font-medium", children: stat.label })
            ] }, stat.label);
          }) }) }) }),
          /* @__PURE__ */ jsx("section", { ref: refBlogs, className: "py-10 bg-white min-h-[320px]", children: blogsLoading && featuredBlogs.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
            /* @__PURE__ */ jsx("div", { className: "h-8 w-48 bg-slate-200 rounded-lg mb-6 animate-pulse" }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-slate-100 aspect-video animate-pulse" }, i)) })
          ] }) : featuredBlogs.length > 0 ? /* @__PURE__ */ jsxs(
            "div",
            {
              className: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${ANIMATE_TRANSITION} ${showBlogs ? ANIMATE_VISIBLE : ANIMATE_HIDDEN}`,
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
                  /* @__PURE__ */ jsx("h2", { className: "text-2xl sm:text-3xl font-bold text-slate-900", children: "บทความน่าสนใจ" }),
                  /* @__PURE__ */ jsxs(
                    Link,
                    {
                      to: "/blogs",
                      className: "text-blue-900 font-medium hover:underline flex items-center gap-1",
                      children: [
                        "ดูทั้งหมด",
                        /* @__PURE__ */ jsx("span", { children: "→" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: featuredBlogs.slice(0, 4).map((blog) => {
                  const rawCover = blog.images?.[0];
                  const coverImage = rawCover && isValidImageUrl(rawCover) ? rawCover : null;
                  const hasVideo = !!blog.youtubeUrl;
                  const thumbnail = coverImage || getYouTubeThumbnail(blog.youtubeUrl);
                  return /* @__PURE__ */ jsxs(
                    Link,
                    {
                      to: getBlogPath(blog),
                      className: "group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300",
                      children: [
                        /* @__PURE__ */ jsx("div", { className: "relative aspect-video bg-slate-100 overflow-hidden", children: thumbnail ? /* @__PURE__ */ jsxs(Fragment, { children: [
                          /* @__PURE__ */ jsx(
                            "img",
                            {
                              src: getOptimizedImageUrl(thumbnail, { width: 400, height: 225, crop: "fill" }),
                              alt: blog.title,
                              width: 400,
                              height: 225,
                              loading: "lazy",
                              decoding: "async",
                              className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            }
                          ),
                          hasVideo && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/30", children: /* @__PURE__ */ jsx("div", { className: "bg-white/90 rounded-full p-3 shadow-lg group-hover:scale-110 transition-transform duration-300", children: /* @__PURE__ */ jsx(Play, { className: "h-6 w-6 text-blue-900 fill-blue-900" }) }) })
                        ] }) : /* @__PURE__ */ jsx("div", { className: "w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100", children: /* @__PURE__ */ jsx("span", { className: "text-blue-400 text-sm font-medium", children: "ไม่มีรูปภาพ" }) }) }),
                        /* @__PURE__ */ jsxs("div", { className: "p-5", children: [
                          /* @__PURE__ */ jsx("h3", { className: "text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition-colors", children: blog.title }),
                          /* @__PURE__ */ jsxs("p", { className: "text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed", children: [
                            blog.content?.substring(0, 100),
                            "..."
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-400", children: [
                            /* @__PURE__ */ jsx(CalendarDays, { className: "h-3.5 w-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: formatBlogDate(blog.createdAt) })
                          ] })
                        ] })
                      ]
                    },
                    blog.id
                  );
                }) })
              ]
            }
          ) : null }),
          /* @__PURE__ */ jsx("div", { ref: refSections, className: "min-h-[280px]", children: sectionsLoading && properties.length === 0 && homepageSections.length === 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(PropertySectionSkeleton, {}),
            /* @__PURE__ */ jsx(PropertySectionSkeleton, {})
          ] }) : hasSections || featured.length > 0 ? /* @__PURE__ */ jsx(
            "div",
            {
              className: `${ANIMATE_TRANSITION} ${showSections ? ANIMATE_VISIBLE : ANIMATE_HIDDEN}`,
              children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(PropertySectionSkeleton, {}), children: hasSections ? homepageSections.map((section, idx) => /* @__PURE__ */ jsx(
                DynamicPropertySection,
                {
                  title: section.title,
                  subtitle: section.subtitle,
                  properties: sectionPropertiesMap[section.id] || [],
                  targetTag: section.targetTag && section.targetTag.trim() || section.title || "",
                  titleColor: section.titleColor || "text-blue-900",
                  isHighlighted: section.isHighlighted || false,
                  isBlinking: section.isBlinking || false,
                  sectionIndex: idx,
                  homeLayout: true,
                  limit: 4
                },
                section.id
              )) : /* @__PURE__ */ jsx(DynamicPropertySection, { title: "ทรัพย์เด่น", properties: featured, sectionIndex: 0, homeLayout: true, limit: 4 }) })
            }
          ) : null }),
          /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden bg-blue-900 py-12 sm:py-16", children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "absolute inset-0 opacity-[0.07]",
                style: {
                  backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                  backgroundSize: "24px 24px"
                }
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "absolute -top-24 -left-24 w-72 h-72 bg-blue-700 rounded-full blur-2xl opacity-40 pointer-events-none" }),
            /* @__PURE__ */ jsx("div", { className: "absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-700 rounded-full blur-2xl opacity-30 pointer-events-none" }),
            /* @__PURE__ */ jsx("div", { className: "relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-8", children: [
              /* @__PURE__ */ jsxs("div", { className: "md:max-w-xl", children: [
                /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4", children: [
                  /* @__PURE__ */ jsx(MessageCircle, { className: "h-3.5 w-3.5" }),
                  "ปรึกษาฟรี ไม่มีค่าใช้จ่าย"
                ] }),
                /* @__PURE__ */ jsxs("h2", { className: "text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight", children: [
                  "ต้องการความช่วยเหลือ",
                  /* @__PURE__ */ jsx("br", { className: "hidden sm:block" }),
                  "ในการหาบ้าน?"
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-blue-200 text-sm sm:text-base leading-relaxed", children: "ทีมงานผู้เชี่ยวชาญพร้อมให้คำปรึกษา ตอบทุกคำถาม ตลอด 24 ชั่วโมง ไม่มีค่าใช้จ่าย" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 md:shrink-0", children: /* @__PURE__ */ jsxs(
                "a",
                {
                  href: "https://www.facebook.com/houseamata",
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-300 text-sm whitespace-nowrap",
                  children: [
                    /* @__PURE__ */ jsx(MessageCircle, { className: "h-4 w-4" }),
                    "ติดต่อผ่าน Facebook"
                  ]
                }
              ) })
            ] }) })
          ] }),
          /* @__PURE__ */ jsx("section", { className: "py-12 sm:py-16 bg-slate-50", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-center mb-10", children: [
              /* @__PURE__ */ jsx("span", { className: "inline-block text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full mb-3", children: "ทำไมต้องเลือก SPS" }),
              /* @__PURE__ */ jsx("h2", { className: "text-2xl sm:text-3xl font-bold text-slate-900", children: "ครบ · เร็ว · เชื่อใจได้" }),
              /* @__PURE__ */ jsx("p", { className: "text-slate-500 mt-2 text-sm sm:text-base max-w-xl mx-auto", children: "เราดูแลทุกขั้นตอนตั้งแต่ค้นหาจนถึงโอนกรรมสิทธิ์" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6", children: [
              {
                Icon: Home$1,
                title: "ทรัพย์ครบทุกประเภท",
                desc: "บ้านเดี่ยว ทาวน์โฮม คอนโด ทั้งขาย เช่า และผ่อนตรง ในพื้นที่อมตะซิตี้และชลบุรี",
                color: "bg-blue-50 text-blue-700 group-hover:bg-blue-100"
              },
              {
                Icon: Wallet,
                title: "รับปิดหนี้ รวมหนี้",
                desc: "บริการปรึกษาและจัดการภาระหนี้ ผ่อนบ้านทางเดียว ง่าย สบาย ไม่ยุ่งยาก",
                color: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100"
              },
              {
                Icon: BadgeCheck,
                title: "บริการครบวงจร",
                desc: "ดูแลตั้งแต่ต้นจนจบ ทำสัญญา โอนกรรมสิทธิ์ ประสานงานสินเชื่อ",
                color: "bg-purple-50 text-purple-700 group-hover:bg-purple-100"
              },
              {
                Icon: MapPin,
                title: "รู้จักทำเลดี",
                desc: "ทีมงานชำนาญพื้นที่ ชลบุรี ฉะเชิงเทรา ระยอง ปทุมธานี และ กทม.",
                color: "bg-amber-50 text-amber-700 group-hover:bg-amber-100"
              },
              {
                Icon: Zap,
                title: "ตอบสนองรวดเร็ว",
                desc: "ทีมงานพร้อมให้คำปรึกษา 24/7 ผ่าน Facebook",
                color: "bg-cyan-50 text-cyan-700 group-hover:bg-cyan-100"
              },
              {
                Icon: Trophy,
                title: "ประสบการณ์กว่า 12 ปี",
                desc: "ไว้วางใจโดยลูกค้ากว่า 1,200 ราย ด้วยความซื่อสัตย์และโปร่งใส",
                color: "bg-rose-50 text-rose-700 group-hover:bg-rose-100"
              }
            ].map(({ Icon, title, desc, color }) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "flex flex-col items-center text-center px-6 py-8 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300 group",
                children: [
                  /* @__PURE__ */ jsx("div", { className: `w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300 ${color}`, children: /* @__PURE__ */ jsx(Icon, { className: "h-7 w-7" }) }),
                  /* @__PURE__ */ jsx("h3", { className: "text-base font-bold text-slate-900 mb-2", children: title }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 leading-relaxed", children: desc })
                ]
              },
              title
            )) })
          ] }) }),
          /* @__PURE__ */ jsx("section", { ref: refLocations, className: "py-10 sm:py-12 bg-white min-h-[320px]", children: locationsLoading && popularLocations.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
            /* @__PURE__ */ jsx("div", { className: "h-6 w-40 bg-slate-200 rounded-lg mb-6 animate-pulse" }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "aspect-video rounded-2xl bg-slate-100 animate-pulse" }, i)) })
          ] }) : /* @__PURE__ */ jsxs(
            "div",
            {
              className: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${ANIMATE_TRANSITION} ${showLocations ? ANIMATE_VISIBLE : ANIMATE_HIDDEN}`,
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsx("span", { className: "w-1 h-7 bg-yellow-400 rounded-full shrink-0" }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("h2", { className: "text-xl sm:text-2xl font-bold text-slate-900 tracking-tight", children: "ทำเลยอดฮิต" }),
                      /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm mt-0.5", children: "พื้นที่แนะนำในชลบุรีและใกล้เคียง" })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(
                    Link,
                    {
                      to: "/properties",
                      className: "inline-flex items-center gap-1 text-sm font-semibold text-blue-900 border border-blue-200 bg-blue-50 hover:bg-blue-900 hover:text-white px-4 py-1.5 rounded-full transition-all duration-200 shrink-0",
                      children: "ดูทั้งหมด →"
                    }
                  )
                ] }),
                popularLocations.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-8 text-slate-500", children: [
                  /* @__PURE__ */ jsx(MapPinned, { className: "h-10 w-10 text-slate-300 mx-auto mb-3" }),
                  /* @__PURE__ */ jsx("p", { className: "text-lg", children: "ยังไม่มีทำเลยอดฮิต" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm mt-1", children: "กรุณาเพิ่มทำเลในหน้า Admin" })
                ] }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5", children: popularLocations.map((loc, index) => /* @__PURE__ */ jsx(
                  PopularLocationCard,
                  {
                    loc,
                    buildLocationPath,
                    highPriority: index === 0
                  },
                  loc.id
                )) })
              ]
            }
          ) })
        ]
      }
    )
  ] });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Home
}, Symbol.toStringTag, { value: "Module" }));
const FAVORITES_KEY = "sps_property_favorites";
function isClient() {
  return typeof window !== "undefined";
}
function safeLocalStorage() {
  if (!isClient()) return null;
  return window.localStorage;
}
function getFavorites() {
  try {
    const storage2 = safeLocalStorage();
    if (!storage2) return [];
    const stored = storage2.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
function addFavorite(propertyId) {
  const storage2 = safeLocalStorage();
  if (!storage2) return;
  const favorites = getFavorites();
  if (!favorites.includes(propertyId)) {
    favorites.push(propertyId);
    storage2.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}
function removeFavorite(propertyId) {
  const storage2 = safeLocalStorage();
  if (!storage2) return;
  const favorites = getFavorites();
  const updated = favorites.filter((id) => id !== propertyId);
  storage2.setItem(FAVORITES_KEY, JSON.stringify(updated));
}
function isFavorite(propertyId) {
  if (!isClient()) return false;
  const favorites = getFavorites();
  return favorites.includes(propertyId);
}
function toggleFavorite(propertyId) {
  if (!isClient()) return false;
  if (isFavorite(propertyId)) {
    removeFavorite(propertyId);
    return false;
  } else {
    addFavorite(propertyId);
    return true;
  }
}
function formatPriceShort(price, isRentalOrListingType, showPrice = true) {
  if (price == null || price === "") return "-";
  const num = Number(price);
  if (!Number.isFinite(num)) return "-";
  const isRental = isRentalOrListingType === true || isRentalOrListingType === "rent" || typeof isRentalOrListingType === "string" && isRentalOrListingType.toLowerCase() === "rent";
  if (showPrice === false) {
    const firstDigit = String(Math.floor(num)).charAt(0);
    if (!isRental && num >= 1e6) {
      return `฿${firstDigit}.xx ล้าน`;
    }
    if (isRental) {
      return `฿${firstDigit},xxx/ด.`;
    }
    return `฿${firstDigit}xx,xxx`;
  }
  if (isRental) {
    return `฿${num.toLocaleString("th-TH")}/ด.`;
  }
  if (num >= 1e6) {
    const millions = num / 1e6;
    const formatted = parseFloat(millions.toFixed(2)).toString();
    return `฿${formatted} ล้าน`;
  }
  return `฿${num.toLocaleString("th-TH")}`;
}
function maskFormattedNumber(formatted) {
  if (!formatted) return "-";
  const str = String(formatted);
  const parts = str.split(",");
  if (parts.length <= 1) {
    const chars = str.split("");
    if (chars.length <= 1) return `${chars[0] ?? "-"}x`;
    return `${chars[0]}${"x".repeat(chars.length - 1)}`;
  }
  return parts.map((part, idx) => idx === 0 ? part : part.replace(/\d/g, "x")).join(",");
}
function formatPrice(price, isRentalOrListingType, showPrice = true) {
  if (price == null || price === "") return "-";
  const num = Number(price);
  if (!Number.isFinite(num)) return "-";
  const formatted = num.toLocaleString("th-TH");
  const displayNumber = showPrice !== false ? formatted : maskFormattedNumber(formatted);
  const isRental = isRentalOrListingType === true || isRentalOrListingType === "rent" || typeof isRentalOrListingType === "string" && isRentalOrListingType.toLowerCase() === "rent";
  return isRental ? `${displayNumber} บาท/เดือน` : `${displayNumber} บาท`;
}
function sanitizeSlugPart(str) {
  return String(str).trim().replace(/\s+/g, "-").replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\-.]/g, "");
}
function formatPriceForSlug(price) {
  const num = Number(price);
  if (!Number.isFinite(num) || num <= 0) return "";
  if (num >= 1e6) {
    const m = (num / 1e6).toFixed(2);
    return `${parseFloat(m)}m`;
  }
  if (num >= 1e3) {
    const k = (num / 1e3).toFixed(1);
    return `${parseFloat(k)}k`;
  }
  return String(num);
}
function generatePropertySlug(property) {
  if (!property?.id) {
    console.warn("Property missing id:", property);
    return "";
  }
  const parts = [];
  let loc = property.location;
  if (typeof loc === "string") {
    parts.push(sanitizeSlugPart(loc));
  } else if (loc && typeof loc === "object") {
    if (loc.district) parts.push(sanitizeSlugPart(loc.district));
    if (loc.province) parts.push(sanitizeSlugPart(loc.province));
  }
  const typeLabel = getPropertyLabel(property.type);
  if (typeLabel) parts.push(sanitizeSlugPart(typeLabel));
  let listingType = property.listingType;
  if (!listingType) {
    listingType = property.isRental ? "rent" : "sale";
  }
  parts.push(listingType === "rent" ? "เช่า" : "ขาย");
  const priceSlug = formatPriceForSlug(property.price);
  if (priceSlug) parts.push(priceSlug);
  const body = parts.filter(Boolean).join("-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
  if (!body) {
    console.warn("Empty slug body for property:", property.id, property);
    return `property--${property.id}`;
  }
  return `${body}--${property.id}`;
}
function getPropertyPath(property) {
  if (!property?.id) return "/properties";
  const slug = generatePropertySlug(property);
  return `/properties/${slug}`;
}
function getShortPropertyPath(property) {
  if (!property?.id) return "/properties";
  return `/p/${property.id}`;
}
function extractIdFromSlug(slugParam) {
  if (!slugParam) {
    console.warn("extractIdFromSlug: empty slug param");
    return null;
  }
  const slug = String(slugParam).trim();
  const sep = slug.lastIndexOf("--");
  if (sep === -1) {
    console.warn("extractIdFromSlug: no -- separator found in slug:", slug);
    return null;
  }
  const id = slug.substring(sep + 2);
  if (!id) {
    console.warn("extractIdFromSlug: empty id after separator in slug:", slug);
    return null;
  }
  return id;
}
const BedIcon = () => /* @__PURE__ */ jsx("span", { className: "text-[13px] leading-none", "aria-hidden": true, children: "🛏" });
const BathIcon = () => /* @__PURE__ */ jsx("span", { className: "text-[13px] leading-none", "aria-hidden": true, children: "🛁" });
const AreaIcon = () => /* @__PURE__ */ jsx("span", { className: "text-[13px] leading-none", "aria-hidden": true, children: "📐" });
const HeartIcon = ({ active }) => /* @__PURE__ */ jsx(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: active ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: `w-4 h-4 transition-all duration-200 ${active ? "text-red-500" : "text-slate-500"}`,
    "aria-hidden": true,
    children: /* @__PURE__ */ jsx("path", { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" })
  }
);
function PropertyCard({ property, compact = false, home = false }) {
  const propertyId = property?.id ?? null;
  const [favorited, setFavorited] = useState(() => typeof window !== "undefined" && propertyId ? isFavorite(propertyId) : false);
  const [renderedAt, setRenderedAt] = useState(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRenderedAt(Date.now());
      setFavorited(propertyId ? isFavorite(propertyId) : false);
    }
  }, [propertyId]);
  if (!propertyId) return null;
  const listingType = property.listingType || (property.isRental ? "rent" : "sale");
  const subListingType = property.subListingType;
  const isNew = renderedAt && property.createdAt && renderedAt - (property.createdAt?.toMillis?.() || property.createdAt) < 7 * 24 * 60 * 60 * 1e3;
  const isInstallment = subListingType === "installment_only" || property.directInstallment;
  const loc = property.location || {};
  const district = [loc.district, loc.province].filter(Boolean).join(" ");
  const subDistrict = loc.subDistrict || "";
  const typeLabel = getPropertyLabel(property.type) || "อสังหาริมทรัพย์";
  const titleText = subDistrict ? `${typeLabel} ${subDistrict}` : typeLabel;
  const areaSqWa = property.area != null && Number(property.area) > 0 ? (Number(property.area) / 4).toFixed(0) : null;
  const installmentPerMonth = isInstallment && property.price != null && Number(property.price) > 0 ? Math.round(Number(property.price) / 120) : null;
  const handleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      setFavorited(toggleFavorite(propertyId));
    }
  };
  const isHome = home || false;
  return /* @__PURE__ */ jsxs(
    "article",
    {
      className: `group flex flex-col h-full w-full bg-white overflow-hidden rounded-2xl transition-all duration-300 ${isHome ? "shadow-card hover:shadow-card-hover" : "shadow-card hover:shadow-card-hover hover:-translate-y-0.5"}`,
      style: isHome ? void 0 : { maxWidth: "min(100%, 340px)" },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "relative w-full aspect-[4/3] flex-shrink-0 overflow-hidden rounded-t-2xl", children: [
          /* @__PURE__ */ jsx(Link, { to: getPropertyPath(property), className: "block w-full h-full", children: /* @__PURE__ */ jsx(
            "img",
            {
              src: getCloudinaryThumbUrl(property.coverImageUrl || property.images?.[0]),
              alt: titleText,
              width: 400,
              height: 300,
              loading: "lazy",
              decoding: "async",
              className: "w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            }
          ) }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute inset-0 pointer-events-none",
              style: {
                background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 35%, transparent 55%)"
              }
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "absolute top-2.5 left-2.5 flex gap-2 z-10 pointer-events-none", children: [
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "inline-flex items-center py-1 px-2.5 text-xs font-semibold text-white leading-none rounded-full shadow-sm",
                style: {
                  backgroundColor: isInstallment ? "#059669" : listingType === "rent" ? "#ea580c" : "#2563eb"
                },
                children: isInstallment ? "ผ่อนตรง" : listingType === "rent" ? "เช่า" : "ขาย"
              }
            ),
            isNew && /* @__PURE__ */ jsx("span", { className: "inline-flex items-center py-1 px-2.5 text-xs font-semibold text-white leading-none rounded-full shadow-sm bg-blue-500", children: "New" })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleFavorite,
              className: "absolute top-2.5 right-2.5 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm hover:bg-white hover:shadow hover:scale-105 active:scale-95 transition-all duration-200",
              "aria-label": favorited ? "ลบออกจากรายการโปรด" : "เพิ่มในรายการโปรด",
              children: /* @__PURE__ */ jsx(HeartIcon, { active: favorited })
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "absolute bottom-0 left-0 right-0 z-10 pointer-events-none p-2 pt-5", children: [
            property.hotDeal && /* @__PURE__ */ jsx("div", { className: "text-amber-300 text-[10px] font-bold uppercase tracking-wide mb-0.5 drop-shadow-md", children: "🔥 ราคาดี" }),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "text-white font-bold text-sm leading-tight tracking-tight",
                style: {
                  textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)"
                },
                children: formatPriceShort(property.price, listingType === "rent", property.showPrice !== false)
              }
            ),
            installmentPerMonth != null && /* @__PURE__ */ jsxs(
              "div",
              {
                className: "text-white/95 text-xs font-medium mt-0.5",
                style: { textShadow: "0 1px 2px rgba(0,0,0,0.6)" },
                children: [
                  "≈ ฿",
                  installmentPerMonth.toLocaleString("th-TH"),
                  " / ด."
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col flex-1 min-w-0 p-3 gap-0.5", children: [
          /* @__PURE__ */ jsx(Link, { to: getPropertyPath(property), className: "block mb-0.5", children: /* @__PURE__ */ jsx("h3", { className: "font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors text-sm", children: titleText }) }),
          /* @__PURE__ */ jsxs("p", { className: "text-slate-500 text-xs font-medium mb-1.5", children: [
            /* @__PURE__ */ jsx("span", { "aria-hidden": true, children: "📍" }),
            " ",
            district || "—"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-slate-600 text-xs font-medium flex-wrap mb-2", children: [
            /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-0.5", children: [
              /* @__PURE__ */ jsx(BedIcon, {}),
              " ",
              property.bedrooms ?? "-"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-slate-300", "aria-hidden": true, children: "|" }),
            /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-0.5", children: [
              /* @__PURE__ */ jsx(BathIcon, {}),
              " ",
              property.bathrooms ?? "-"
            ] }),
            areaSqWa != null && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("span", { className: "text-slate-300", "aria-hidden": true, children: "|" }),
              /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-0.5", children: [
                /* @__PURE__ */ jsx(AreaIcon, {}),
                " ",
                areaSqWa,
                " ตร.ว."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1.5 mb-3", children: [
            /* @__PURE__ */ jsxs(
              "span",
              {
                className: `inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${property.availability === "available" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`,
                children: [
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `w-1 h-1 rounded-full ${property.availability === "available" ? "bg-green-500" : "bg-amber-500"}`,
                      "aria-hidden": true
                    }
                  ),
                  property.availability === "available" ? "ว่าง" : "ติดจอง"
                ]
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600", children: property.propertyCondition || "มือสอง" })
          ] }),
          /* @__PURE__ */ jsxs(
            Link,
            {
              to: getPropertyPath(property),
              className: "mt-auto inline-flex items-center justify-center gap-1 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-xs hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50/50 active:scale-[0.98] transition-all duration-200 min-h-[40px] py-2 px-3",
              children: [
                "ดูรายละเอียด",
                /* @__PURE__ */ jsx("span", { "aria-hidden": true, children: "→" })
              ]
            }
          )
        ] })
      ]
    }
  );
}
const PropertyCard$1 = memo(PropertyCard);
function ActiveSearchCriteriaBar({
  keyword = "",
  filters = {},
  resultCount = 0,
  onRemoveFilter,
  onClearAll
}) {
  const activeFilters = [];
  if (keyword && keyword.trim()) {
    activeFilters.push({
      type: "keyword",
      label: `🔍 ${keyword}`,
      value: keyword
    });
  }
  if (filters.tag && filters.tag.trim()) {
    activeFilters.push({
      type: "tag",
      label: `🏷️ ${filters.tag}`,
      value: filters.tag,
      highlight: true
    });
  }
  if (filters.isRental === true) {
    activeFilters.push({
      type: "isRental",
      label: "เช่า",
      value: "rent"
    });
  } else if (filters.isRental === false) {
    activeFilters.push({
      type: "isRental",
      label: "ซื้อ",
      value: "buy"
    });
  }
  if (filters.propertySubStatus) {
    activeFilters.push({
      type: "propertySubStatus",
      label: filters.propertySubStatus,
      value: filters.propertySubStatus
    });
  }
  if (filters.feature === "directInstallment") {
    activeFilters.push({
      type: "feature",
      label: "🏠 ผ่อนตรง",
      value: "directInstallment",
      highlight: true
      // Badge สีพิเศษ
    });
  }
  if (filters.project && filters.project.trim()) {
    activeFilters.push({
      type: "project",
      label: `🏢 โครงการ: ${filters.project}`,
      value: filters.project,
      npaHighlight: true
    });
  }
  if (filters.propertyType) {
    activeFilters.push({
      type: "propertyType",
      label: getPropertyLabel(filters.propertyType),
      value: filters.propertyType
    });
  }
  if (filters.location) {
    activeFilters.push({
      type: "location",
      label: `📍 ${filters.location}`,
      value: filters.location
    });
  }
  if (filters.priceMin || filters.priceMax) {
    const formatPrice2 = (price) => {
      if (!price) return "";
      const num = Number(price);
      if (num >= 1e6) {
        return `${(num / 1e6).toFixed(1)}M`;
      }
      return num.toLocaleString("th-TH");
    };
    const min = filters.priceMin ? formatPrice2(filters.priceMin) : "";
    const max = filters.priceMax ? formatPrice2(filters.priceMax) : "";
    const priceLabel = min && max ? `${min} - ${max}` : min || max;
    activeFilters.push({
      type: "price",
      label: `💰 ${priceLabel}`,
      value: { min: filters.priceMin, max: filters.priceMax }
    });
  }
  if (filters.bedrooms) {
    activeFilters.push({
      type: "bedrooms",
      label: `🛏️ ${filters.bedrooms === "5" ? "5+" : filters.bedrooms} ห้อง`,
      value: filters.bedrooms
    });
  }
  if (filters.bathrooms) {
    activeFilters.push({
      type: "bathrooms",
      label: `🚿 ${filters.bathrooms === "4" ? "4+" : filters.bathrooms} ห้อง`,
      value: filters.bathrooms
    });
  }
  if (filters.areaMin || filters.areaMax) {
    const formatArea = (area) => {
      if (!area) return "";
      return `${Number(area).toLocaleString("th-TH")} ตร.ม.`;
    };
    const min = filters.areaMin ? formatArea(filters.areaMin) : "";
    const max = filters.areaMax ? formatArea(filters.areaMax) : "";
    const areaLabel = min && max ? `${min} - ${max}` : min || max;
    activeFilters.push({
      type: "area",
      label: `📐 ${areaLabel}`,
      value: { min: filters.areaMin, max: filters.areaMax }
    });
  }
  if (activeFilters.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsx("div", { className: "mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex-shrink-0 text-sm text-slate-600", children: [
      /* @__PURE__ */ jsx("span", { className: "font-medium text-blue-900", children: "กำลังแสดงผลลัพธ์:" }),
      " ",
      /* @__PURE__ */ jsxs("span", { className: "font-semibold text-blue-900", children: [
        "พบ ",
        resultCount.toLocaleString("th-TH"),
        " รายการ"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-x-auto scrollbar-hide", children: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 min-w-max", children: activeFilters.map((filter, index) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter.highlight ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm" : filter.npaHighlight ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm" : "bg-blue-50 text-blue-900 hover:bg-blue-100"}`,
        children: [
          /* @__PURE__ */ jsx("span", { children: filter.label }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => onRemoveFilter(filter),
              className: `ml-0.5 p-0.5 rounded-full hover:bg-opacity-20 transition ${filter.highlight || filter.npaHighlight ? "hover:bg-white/30 text-white" : "hover:bg-blue-200 text-blue-700"}`,
              "aria-label": `ลบ ${filter.label}`,
              children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" })
            }
          )
        ]
      },
      `${filter.type}-${index}`
    )) }) }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: onClearAll,
        className: "flex-shrink-0 px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition whitespace-nowrap",
        children: "ล้างทั้งหมด"
      }
    )
  ] }) });
}
function AdvancedFiltersPanel({ filters, onUpdateFilters, onApply }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const handleApplyFilters = () => {
    onApply();
    setIsExpanded(false);
  };
  const handleClearAdvancedFilters = () => {
    onUpdateFilters({
      priceMin: "",
      priceMax: "",
      bedrooms: "",
      bathrooms: "",
      areaMin: "",
      areaMax: ""
    });
  };
  const activeCount = [
    filters.priceMin,
    filters.priceMax,
    filters.bedrooms,
    filters.bathrooms,
    filters.areaMin,
    filters.areaMax
  ].filter(Boolean).length;
  return /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => setIsExpanded(!isExpanded),
        className: `w-full flex items-center justify-between px-5 py-3 rounded-xl border-2 transition-all duration-200 ${isExpanded ? "bg-blue-50 border-blue-500 text-blue-900" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50"}`,
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-sm", children: "ตัวกรองเพิ่มเติม" }),
            activeCount > 0 && /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-xs font-bold", children: activeCount })
          ] }),
          /* @__PURE__ */ jsx(
            ChevronDown,
            {
              className: `h-5 w-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`
            }
          )
        ]
      }
    ),
    isExpanded && /* @__PURE__ */ jsxs("div", { className: "mt-3 p-6 bg-white border-2 border-blue-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3", children: [
            /* @__PURE__ */ jsx("div", { className: "p-1.5 rounded-lg bg-green-100 text-green-700", children: /* @__PURE__ */ jsx(DollarSign, { className: "h-4 w-4" }) }),
            "ราคา (บาท)"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                placeholder: "ราคาต่ำสุด",
                value: filters.priceMin || "",
                onChange: (e) => onUpdateFilters({ priceMin: e.target.value }),
                className: "px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              }
            ),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                placeholder: "ราคาสูงสุด",
                value: filters.priceMax || "",
                onChange: (e) => onUpdateFilters({ priceMax: e.target.value }),
                className: "px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3", children: [
            /* @__PURE__ */ jsx("div", { className: "p-1.5 rounded-lg bg-purple-100 text-purple-700", children: /* @__PURE__ */ jsx(Maximize2, { className: "h-4 w-4" }) }),
            "พื้นที่ (ตร.ว.)"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                placeholder: "ขั้นต่ำ",
                value: filters.areaMin || "",
                onChange: (e) => onUpdateFilters({ areaMin: e.target.value }),
                className: "px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              }
            ),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                placeholder: "สูงสุด",
                value: filters.areaMax || "",
                onChange: (e) => onUpdateFilters({ areaMax: e.target.value }),
                className: "px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3", children: [
            /* @__PURE__ */ jsx("div", { className: "p-1.5 rounded-lg bg-blue-100 text-blue-700", children: /* @__PURE__ */ jsx(Bed, { className: "h-4 w-4" }) }),
            "ห้องนอน"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            [1, 2, 3, 4, "5+"].map((num) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => onUpdateFilters({ bedrooms: String(num) }),
                className: `px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${filters.bedrooms === String(num) ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-300 text-slate-700 hover:border-blue-400"}`,
                children: num
              },
              num
            )),
            filters.bedrooms && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => onUpdateFilters({ bedrooms: "" }),
                className: "px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors",
                title: "ล้าง",
                children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3", children: [
            /* @__PURE__ */ jsx("div", { className: "p-1.5 rounded-lg bg-cyan-100 text-cyan-700", children: /* @__PURE__ */ jsx(Bath, { className: "h-4 w-4" }) }),
            "ห้องน้ำ"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            [1, 2, 3, "4+"].map((num) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => onUpdateFilters({ bathrooms: String(num) }),
                className: `px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${filters.bathrooms === String(num) ? "bg-cyan-600 border-cyan-600 text-white shadow-md" : "bg-white border-slate-300 text-slate-700 hover:border-cyan-400"}`,
                children: num
              },
              num
            )),
            filters.bathrooms && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => onUpdateFilters({ bathrooms: "" }),
                className: "px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors",
                title: "ล้าง",
                children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mt-6 pt-6 border-t border-slate-200", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: handleApplyFilters,
            className: "flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all",
            children: "นำค่ากรอง"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: handleClearAdvancedFilters,
            className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors",
            children: "ล้างทั้งหมด"
          }
        )
      ] })
    ] })
  ] });
}
function RecommendedPropertiesSection({ allProperties, currentFilters, vertical = false }) {
  const recommendations = useMemo(() => {
    if (!Array.isArray(allProperties) || allProperties.length === 0) return [];
    const featured = allProperties.filter((p) => p.featured);
    const hotDeals = allProperties.filter((p) => p.hotDeal && !p.featured);
    const recentlyAdded = allProperties.filter((p) => {
      if (!p.createdAt || p.featured || p.hotDeal) return false;
      const daysSinceCreated = (Date.now() - p.createdAt.toMillis()) / (1e3 * 60 * 60 * 24);
      return daysSinceCreated <= 7;
    }).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    let similarToSearch = [];
    if (currentFilters?.propertyType || currentFilters?.location) {
      similarToSearch = allProperties.filter((p) => {
        if (p.featured || p.hotDeal) return false;
        const matchesType = currentFilters.propertyType ? p.type === currentFilters.propertyType : true;
        const matchesLocation = currentFilters.location ? p.locationDisplay?.includes(currentFilters.location) || p.location?.province?.includes(currentFilters.location) || p.location?.district?.includes(currentFilters.location) : true;
        return matchesType && matchesLocation;
      });
    }
    const combined = [
      ...featured,
      ...hotDeals,
      ...recentlyAdded.slice(0, 3),
      ...similarToSearch.slice(0, 3)
    ];
    const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
    return unique.slice(0, 12);
  }, [allProperties, currentFilters]);
  if (recommendations.length === 0) return null;
  if (vertical) {
    return /* @__PURE__ */ jsxs("section", { className: "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-5 border-2 border-amber-200 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-md", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-white" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-sm font-bold text-slate-900", children: "บ้านแนะนำ" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-600", children: [
            recommendations.length,
            " รายการ"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: recommendations.slice(0, 6).map((property) => /* @__PURE__ */ jsx(RecommendedPropertyCard, { property, compact: true }, property.id)) })
    ] });
  }
  return /* @__PURE__ */ jsxs("section", { className: "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-6 mb-8 border-2 border-amber-200 shadow-sm", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-5 w-5 text-white" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-slate-900", children: "บ้านแนะนำสำหรับคุณ" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-600", children: "ดีลเด็ด • มาใหม่ • ยอดนิยม" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "hidden sm:flex items-center gap-1.5 text-sm text-slate-600", children: /* @__PURE__ */ jsxs("span", { className: "font-medium", children: [
        recommendations.length,
        " รายการ"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-amber-50 to-transparent z-10 pointer-events-none" }),
      /* @__PURE__ */ jsx("div", { className: "absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-amber-50 to-transparent z-10 pointer-events-none" }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide scroll-smooth", children: recommendations.map((property) => /* @__PURE__ */ jsx(RecommendedPropertyCard, { property }, property.id)) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "sm:hidden text-center mt-3", children: /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 flex items-center justify-center gap-1", children: [
      /* @__PURE__ */ jsx(ArrowRight, { className: "h-3 w-3" }),
      "เลื่อนดูเพิ่มเติม"
    ] }) })
  ] });
}
function RecommendedPropertyCard({ property, compact = false }) {
  const coverImage = property.coverImageUrl || property.images && property.images[0] || "";
  let badge = null;
  if (property.featured) {
    badge = { label: "แนะนำ", icon: Star, color: "bg-amber-500 text-white" };
  } else if (property.hotDeal) {
    badge = { label: "ดีลเด็ด", icon: TrendingUp, color: "bg-red-500 text-white" };
  } else if (property.createdAt) {
    const daysSinceCreated = (Date.now() - property.createdAt.toMillis()) / (1e3 * 60 * 60 * 24);
    if (daysSinceCreated <= 7) {
      badge = { label: "มาใหม่", icon: Clock, color: "bg-green-500 text-white" };
    }
  }
  if (compact) {
    return /* @__PURE__ */ jsx(
      Link,
      {
        to: getPropertyPath(property),
        className: "group block",
        children: /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-3 p-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100", children: [
            coverImage ? /* @__PURE__ */ jsx(
              "img",
              {
                src: coverImage,
                alt: property.title,
                width: 80,
                height: 80,
                loading: "lazy",
                decoding: "async",
                className: "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              }
            ) : /* @__PURE__ */ jsx("div", { className: "w-full h-full flex items-center justify-center text-slate-400", children: /* @__PURE__ */ jsx(Home$1, { className: "h-6 w-6" }) }),
            badge && /* @__PURE__ */ jsxs("div", { className: `absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${badge.color} shadow-sm`, children: [
              /* @__PURE__ */ jsx(badge.icon, { className: "h-2.5 w-2.5" }),
              /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold", children: badge.label })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-semibold text-xs text-slate-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors", children: property.title }),
            /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-blue-600 mb-1", children: formatPrice(property.price, property.isRental, false) }),
            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-500 truncate", children: [
              property.location?.district,
              ", ",
              property.location?.province
            ] })
          ] })
        ] }) })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    Link,
    {
      to: getPropertyPath(property),
      className: "group flex-none w-[280px] sm:w-[320px] snap-start",
      children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 h-full", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative aspect-[16/10] overflow-hidden bg-slate-100", children: [
          coverImage ? /* @__PURE__ */ jsx(
            "img",
            {
              src: coverImage,
              alt: property.title,
              width: 320,
              height: 200,
              loading: "lazy",
              decoding: "async",
              className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            }
          ) : /* @__PURE__ */ jsx("div", { className: "w-full h-full flex items-center justify-center text-slate-400", children: /* @__PURE__ */ jsx(Home$1, { className: "h-12 w-12" }) }),
          badge && /* @__PURE__ */ jsxs("div", { className: `absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full ${badge.color} shadow-md`, children: [
            /* @__PURE__ */ jsx(badge.icon, { className: "h-3.5 w-3.5" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold", children: badge.label })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm shadow-md", children: /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-blue-600", children: formatPrice(property.price, property.isRental, false) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "mb-2", children: /* @__PURE__ */ jsx("span", { className: "inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium", children: getPropertyLabel(property.type) }) }),
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-slate-900 text-sm mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 transition-colors", children: property.title }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(MapPin, { className: "h-3 w-3 shrink-0" }),
            /* @__PURE__ */ jsxs("span", { className: "truncate", children: [
              property.location?.district,
              ", ",
              property.location?.province
            ] })
          ] }),
          (property.bedrooms || property.bathrooms || property.area) && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600", children: [
            property.bedrooms > 0 && /* @__PURE__ */ jsxs("span", { children: [
              "🛏️ ",
              property.bedrooms
            ] }),
            property.bathrooms > 0 && /* @__PURE__ */ jsxs("span", { children: [
              "🚿 ",
              property.bathrooms
            ] }),
            property.area > 0 && /* @__PURE__ */ jsxs("span", { children: [
              "📐 ",
              (property.area / 4).toFixed(1),
              " ตร.ว."
            ] })
          ] })
        ] })
      ] })
    }
  );
}
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;
  document.head.appendChild(style);
}
function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
function smartTokenize$1(query2) {
  if (!query2 || typeof query2 !== "string") return [];
  const normalized = normalizeText(query2);
  if (!normalized) return [];
  const tokens = [];
  let remainingText = normalized;
  const specialPatterns = [
    /มือ\s*1/g,
    // Matches 'มือ 1' or 'มือ1'
    /มือ\s*2/g
    // Matches 'มือ 2' or 'มือ2'
  ];
  const specialMatches = [];
  specialPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(remainingText)) !== null) {
      specialMatches.push({
        text: match[0],
        index: match.index
      });
    }
  });
  specialMatches.sort((a, b) => a.index - b.index);
  let lastIndex = 0;
  specialMatches.forEach((match) => {
    if (match.index > lastIndex) {
      const beforeText = remainingText.substring(lastIndex, match.index).trim();
      if (beforeText) {
        const beforeTokens = beforeText.split(/\s+/).filter((t) => t.length > 0);
        tokens.push(...beforeTokens);
      }
    }
    const normalizedKeyword = match.text.replace(/\s+/g, " ").trim();
    if (normalizedKeyword === "มือ1" || normalizedKeyword === "มือ 1") {
      tokens.push("มือ 1");
    } else if (normalizedKeyword === "มือ2" || normalizedKeyword === "มือ 2") {
      tokens.push("มือ 2");
    } else {
      tokens.push(normalizedKeyword);
    }
    lastIndex = match.index + match.text.length;
  });
  if (lastIndex < remainingText.length) {
    const afterText = remainingText.substring(lastIndex).trim();
    if (afterText) {
      const afterTokens = afterText.split(/\s+/).filter((t) => t.length > 0);
      tokens.push(...afterTokens);
    }
  }
  if (specialMatches.length === 0) {
    return normalized.split(/\s+/).filter((t) => t.length > 0);
  }
  return tokens.filter((t) => t.length > 0);
}
function parsePriceQuery(query2) {
  if (!query2 || typeof query2 !== "string") {
    return { min: null, max: null, cleanedQuery: (query2 || "").trim() };
  }
  let cleanedQuery = query2.trim();
  let min = null;
  let max = null;
  const LAAN = 1e6;
  const SAEN = 1e5;
  function toAmount(numStr, unit) {
    const num = parseFloat(String(numStr).replace(/,/g, ""));
    if (isNaN(num)) return null;
    const u = (unit || "").trim().toLowerCase();
    if (u === "ล้าน" || u === "laan") return Math.round(num * LAAN);
    if (u === "แสน" || u === "saen") return Math.round(num * SAEN);
    return Math.round(num);
  }
  const rangeRe = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi;
  let rangeMatch = rangeRe.exec(cleanedQuery);
  if (rangeMatch) {
    min = toAmount(rangeMatch[1], rangeMatch[3]);
    max = toAmount(rangeMatch[2], rangeMatch[3]);
    cleanedQuery = cleanedQuery.replace(rangeMatch[0], " ");
  }
  if (max === null) {
    const maxPatterns = [
      /(?:ไม่เกิน|ต่ำกว่า)\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi,
      /งบ\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi,
      /ราคา\s*(?:ไม่เกิน|ต่ำกว่า)?\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi,
      /ราคา\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi
    ];
    for (const re of maxPatterns) {
      re.lastIndex = 0;
      const m = re.exec(cleanedQuery);
      if (m) {
        max = toAmount(m[1], m[2]);
        cleanedQuery = cleanedQuery.replace(m[0], " ");
        break;
      }
    }
  }
  cleanedQuery = cleanedQuery.replace(/\s+/g, " ").trim();
  return { min, max, cleanedQuery };
}
function matchesField(value, query2) {
  if (!query2) return true;
  if (!value) return false;
  return normalizeText(String(value)).includes(normalizeText(query2));
}
function matchesArrayField(array, query2) {
  if (!query2) return true;
  if (!Array.isArray(array) || array.length === 0) return false;
  return array.some((item) => {
    if (typeof item === "string") {
      return matchesField(item, query2);
    }
    if (item && typeof item === "object") {
      return matchesField(item.label || item.name || item.value || "", query2);
    }
    return false;
  });
}
function filterProperties(properties = [], filters = {}) {
  try {
    if (!Array.isArray(properties) || properties.length === 0) return [];
    const {
      keyword = "",
      tag = "",
      listingType = "",
      subListingType = "",
      propertyCondition = "",
      availability = "",
      type = "",
      location = "",
      project = "",
      minPrice: filterMinPrice,
      maxPrice: filterMaxPrice,
      bedrooms,
      bathrooms,
      areaMin,
      areaMax
    } = filters;
    const { min: parsedMin, max: parsedMax, cleanedQuery } = parsePriceQuery(keyword);
    const keywordForSearch = cleanedQuery || keyword;
    const minPrice = Number(parsedMin ?? filterMinPrice) || 0;
    const maxPrice = Number(parsedMax ?? filterMaxPrice) || 0;
    const normalizedKeyword = normalizeText(keywordForSearch);
    const normalizedLocation = normalizeText(location);
    const keywordTokens = normalizedKeyword ? smartTokenize$1(normalizedKeyword) : [];
    const tagVal = tag ? tag.trim() : "";
    return properties.filter((property) => {
      try {
        if (!property || typeof property !== "object") return false;
        if (tagVal) {
          const propTags = property.customTags || property.tags || [];
          if (!propTags.some((t) => String(t).trim() === tagVal)) return false;
        }
        if (project) {
          const pProject = property.project || "";
          if (normalizeText(pProject) !== normalizeText(project)) return false;
        }
        if (keywordTokens.length > 0) {
          const allKeywordsMatch = keywordTokens.every((token) => {
            if (token === "มือ 1" || token === "มือ 2") {
              const pc = property.propertyCondition || property.propertySubStatus || "";
              if (normalizeText(pc) === token) return true;
            }
            if (!property._searchableIndex) {
              property._searchableIndex = normalizeText([
                property.title,
                property.displayId,
                property.propertyId,
                property.type,
                getPropertyLabel(property.type),
                property.locationDisplay,
                property.location?.province,
                property.location?.district,
                property.description
              ].join(" "));
            }
            if (property._searchableIndex.includes(token)) return true;
            if (matchesArrayField(property.customTags, token)) return true;
            if (matchesArrayField(property.nearbyPlace, token)) return true;
            return false;
          });
          if (!allKeywordsMatch) return false;
        }
        if (normalizedLocation) {
          if (!property._locationIndex) {
            property._locationIndex = normalizeText([
              property.locationDisplay,
              property.location?.province,
              property.location?.district,
              property.location?.subDistrict
            ].join(" "));
          }
          const locMatch = property._locationIndex.includes(normalizedLocation) || matchesArrayField(property.nearbyPlace, normalizedLocation);
          if (!locMatch) return false;
        }
        if (listingType) {
          const pListingType = property.listingType || (property.isRental ? "rent" : "sale");
          if (pListingType !== listingType) return false;
          if (listingType === "rent" && subListingType) {
            const pSubType = property.subListingType || (property.directInstallment ? "installment_only" : "rent_only");
            if (pSubType !== subListingType) return false;
          }
          if (listingType === "sale" && propertyCondition) {
            const pCond = property.propertyCondition || property.propertySubStatus;
            if (pCond !== propertyCondition) return false;
          }
        }
        if (availability) {
          const pStatus = property.availability || property.status;
          let mapped = pStatus;
          if (pStatus === "available" || pStatus === "ว่าง") mapped = "available";
          else if (pStatus === "sold" || pStatus === "ขายแล้ว") mapped = "sold";
          else if (pStatus === "reserved" || pStatus === "ติดจอง") mapped = "reserved";
          if (mapped !== availability) return false;
        }
        if (type && property.type !== type) return false;
        const pPrice = Number(property.price) || 0;
        if (minPrice > 0 && pPrice < minPrice) return false;
        if (maxPrice > 0 && pPrice > maxPrice) return false;
        if (bedrooms && Number(property.bedrooms) !== Number(bedrooms)) return false;
        if (bathrooms && Number(property.bathrooms) !== Number(bathrooms)) return false;
        const pArea = Number(property.area) || 0;
        if (areaMin && pArea < Number(areaMin)) return false;
        if (areaMax && pArea > Number(areaMax)) return false;
        return true;
      } catch (e) {
        return false;
      }
    });
  } catch (critical) {
    return [];
  }
}
const PropertiesMap = lazy(() => import("./PropertiesMap-BUBZPvL2.js"));
function meta$2() {
  return [{
    title: "รายการประกาศ | SPS Property Solution"
  }, {
    name: "description",
    content: "ค้นหาบ้าน คอนโด ทาวน์โฮม ให้เช่า-ขาย ในอมตะซิตี้ ชลบุรี"
  }, {
    tagName: "link",
    rel: "canonical",
    href: "https://spspropertysolution.com/properties"
  }];
}
async function clientLoader$2() {
  try {
    const properties = await getPropertiesOnceForListing(true, 300);
    return {
      properties: Array.isArray(properties) ? properties : []
    };
  } catch (error) {
    console.error("Properties loader error:", error);
    return {
      properties: []
    };
  }
}
clientLoader$2.hydrate = true;
const toSearchableText = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toSearchableText(item)).filter(Boolean).join(" ");
  }
  if (value && typeof value === "object") {
    const preferred = [value.name, value.label, value.title, value.address, value.fullAddress, value.province, value.district].map((item) => toSearchableText(item)).filter(Boolean).join(" ");
    if (preferred) return preferred;
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
};
const FilterItem = ({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  activeColor = "text-blue-900"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  return /* @__PURE__ */ jsxs("div", {
    className: "relative",
    ref: containerRef,
    children: [/* @__PURE__ */ jsx("div", {
      className: "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1",
      children: label
    }), /* @__PURE__ */ jsxs("button", {
      onClick: () => setIsOpen(!isOpen),
      className: `w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-white border-2 transition-all duration-200 ${isOpen ? "border-blue-900 shadow-md ring-4 ring-blue-900/5 bg-white" : "border-transparent"}`,
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-2.5 min-w-0",
        children: [/* @__PURE__ */ jsx("div", {
          className: `p-1.5 rounded-lg ${value ? "bg-blue-100 " + activeColor : "bg-slate-200 text-slate-400"}`,
          children: createElement(Icon, {
            className: "h-3.5 w-3.5"
          })
        }), /* @__PURE__ */ jsx("span", {
          className: `text-sm font-semibold truncate ${value ? "text-slate-900" : "text-slate-500"}`,
          children: selectedOption.label
        })]
      }), /* @__PURE__ */ jsx(ChevronDown, {
        className: `h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`
      })]
    }), isOpen && /* @__PURE__ */ jsx("div", {
      className: "absolute top-[calc(100%+8px)] left-0 w-full min-w-[200px] bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200",
      children: options.map((opt) => /* @__PURE__ */ jsxs("button", {
        onClick: () => {
          onChange(opt.value);
          setIsOpen(false);
        },
        className: `w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${value === opt.value ? "bg-blue-50 text-blue-900 font-bold" : "text-slate-600 hover:bg-slate-50"}`,
        children: [opt.label, value === opt.value && /* @__PURE__ */ jsx(ShieldCheck, {
          className: "h-4 w-4"
        })]
      }, opt.value))
    })]
  });
};
const _public_properties = UNSAFE_withComponentProps(function Properties({
  loaderData
}) {
  const properties = loaderData?.properties || [];
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  let filters, updateFilters, clearFilters;
  try {
    const searchContext = useSearch();
    filters = searchContext?.filters || {};
    updateFilters = searchContext?.updateFilters || (() => {
    });
    clearFilters = searchContext?.clearFilters || (() => {
    });
  } catch (_error) {
    filters = {};
    updateFilters = () => {
    };
    clearFilters = () => {
    };
  }
  const initialKeyword = searchParams.get("search") || searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialKeyword);
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialKeyword);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));
  const resultsTopRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isPending, startTransition] = useTransition();
  const TYPING_PHRASES2 = ["บ้านมือสอง", "คอนโดผ่อนตรง", "ทาวน์โฮมใกล้นิคม", "บ้านเดี่ยวชลบุรี", "คอนโดอมตะนคร"];
  const {
    displayText: typingPlaceholder,
    stop: stopTyping,
    start: startTyping
  } = useTypingPlaceholder(TYPING_PHRASES2, 100, 50, 2e3);
  const typeParam = searchParams.get("type");
  const isRentalFilter = typeParam === "rent" ? true : typeParam === "buy" ? false : null;
  const prevSearchParamsRef = useRef(searchParams.toString());
  const filtered = useMemo(() => {
    try {
      if (!Array.isArray(properties)) return [];
      const searchFilters = {
        keyword: debouncedKeyword || "",
        tag: filters?.tag || searchParams.get("tag") || "",
        location: filters?.location || searchParams.get("location") || "",
        type: filters?.propertyType || "",
        listingType: filters?.listingType || searchParams.get("listingType") || (isRentalFilter === true ? "rent" : isRentalFilter === false ? "sale" : ""),
        subListingType: filters?.subListingType || searchParams.get("subListingType") || "",
        propertyCondition: filters?.propertyCondition || searchParams.get("propertyCondition") || "",
        availability: filters?.availability || searchParams.get("availability") || "",
        minPrice: filters?.priceMin || searchParams.get("priceMin") || "",
        maxPrice: filters?.priceMax || searchParams.get("priceMax") || "",
        bedrooms: filters?.bedrooms || searchParams.get("bedrooms") || "",
        bathrooms: filters?.bathrooms || searchParams.get("bathrooms") || "",
        areaMin: filters?.areaMin || searchParams.get("areaMin") || "",
        areaMax: filters?.areaMax || searchParams.get("areaMax") || "",
        project: filters?.project || searchParams.get("project") || ""
      };
      return filterProperties(properties, searchFilters);
    } catch {
      return [];
    }
  }, [properties, debouncedKeyword, filters, searchParams, isRentalFilter]);
  const safeFiltered = Array.isArray(filtered) ? filtered : [];
  const totalPages = Math.max(1, Math.ceil(safeFiltered.length / ITEMS_PER_PAGE));
  const {
    mapProperties,
    mapShowingMaxCaption
  } = useMemo(() => {
    const withCoords = safeFiltered.filter((p) => typeof p.lat === "number" && typeof p.lng === "number" && !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
    const loc = toSearchableText(filters.location).trim().toLowerCase();
    if (loc) {
      withCoords.sort((a, b) => {
        const aText = `${toSearchableText(a.location)} ${toSearchableText(a.address)}`.toLowerCase();
        const bText = `${toSearchableText(b.location)} ${toSearchableText(b.address)}`.toLowerCase();
        return (bText.includes(loc) ? 1 : 0) - (aText.includes(loc) ? 1 : 0);
      });
    }
    return {
      mapProperties: withCoords.slice(0, 100),
      mapShowingMaxCaption: withCoords.length > 100
    };
  }, [safeFiltered, filters.location]);
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return safeFiltered.slice(start, start + ITEMS_PER_PAGE);
  }, [safeFiltered, currentPage]);
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("page", newPage.toString());
      navigate(`/properties?${params.toString()}`);
      resultsTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  };
  const updateFiltersWithUrl = useCallback((filterUpdates) => {
    updateFilters(filterUpdates);
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      Object.entries(filterUpdates).forEach(([key, value]) => {
        const paramKey = key === "propertyType" ? "type" : key === "propertySubStatus" ? "status" : key;
        if (value && value !== "" && value !== null && value !== void 0) {
          params.set(paramKey, String(value));
        } else {
          params.delete(paramKey);
        }
      });
      params.delete("page");
      prevSearchParamsRef.current = params.toString();
      navigate(params.toString() ? `/properties?${params.toString()}` : "/properties", {
        replace: true
      });
    });
  }, [searchParams, navigate, updateFilters]);
  const handleRemoveFilter = useCallback((filter) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("page");
      switch (filter.type) {
        case "keyword":
          setSearchQuery("");
          setDebouncedKeyword("");
          params.delete("q");
          params.delete("search");
          break;
        case "tag":
          updateFilters({
            tag: ""
          });
          params.delete("tag");
          break;
        case "feature":
          updateFilters({
            feature: ""
          });
          params.delete("feature");
          break;
        case "propertyType":
          updateFilters({
            propertyType: ""
          });
          params.delete("propertyType");
          break;
        case "location":
          updateFilters({
            location: ""
          });
          params.delete("location");
          break;
        case "propertySubStatus":
          updateFilters({
            propertySubStatus: ""
          });
          params.delete("status");
          break;
        case "price":
          updateFilters({
            priceMin: "",
            priceMax: ""
          });
          params.delete("priceMin");
          params.delete("priceMax");
          break;
        case "bedrooms":
          updateFilters({
            bedrooms: ""
          });
          params.delete("bedrooms");
          break;
        case "bathrooms":
          updateFilters({
            bathrooms: ""
          });
          params.delete("bathrooms");
          break;
        case "area":
          updateFilters({
            areaMin: "",
            areaMax: ""
          });
          params.delete("areaMin");
          params.delete("areaMax");
          break;
        case "isRental":
          updateFilters({
            isRental: null,
            subListingType: ""
          });
          params.delete("type");
          params.delete("listingType");
          params.delete("subListingType");
          break;
        case "project":
          updateFilters({
            project: ""
          });
          params.delete("project");
          break;
      }
      prevSearchParamsRef.current = params.toString();
      navigate(params.toString() ? `/properties?${params.toString()}` : "/properties");
      resultsTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }, [navigate, searchParams, updateFilters]);
  const handleClearAllFilters = useCallback(() => {
    startTransition(() => {
      clearFilters();
      setSearchQuery("");
      setDebouncedKeyword("");
      prevSearchParamsRef.current = "";
      navigate("/properties");
      resultsTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }, [navigate, clearFilters]);
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };
  const pageTitle = isRentalFilter === true ? "ทรัพย์สินให้เช่า" : isRentalFilter === false ? "ทรัพย์สินขาย" : "รายการประกาศ";
  const heroTitle = isRentalFilter === true ? "ทรัพย์สินให้เช่า" : isRentalFilter === false ? "ทรัพย์สินขาย" : "SPS Property Solution";
  const heroSubtitle = "ค้นหาบ้านที่ใช่สำหรับคุณ";
  return /* @__PURE__ */ jsx(PageLayout, {
    heroTitle,
    heroSubtitle,
    searchComponent: null,
    children: /* @__PURE__ */ jsx("div", {
      className: "min-h-screen bg-slate-50 py-8",
      ref: resultsTopRef,
      "aria-busy": isPending,
      children: /* @__PURE__ */ jsxs("div", {
        className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4",
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("h1", {
              className: "text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight",
              children: pageTitle
            }), safeFiltered.length > 0 && /* @__PURE__ */ jsxs("p", {
              className: "text-slate-500 text-sm mt-1",
              children: ["พบ ", /* @__PURE__ */ jsx("span", {
                className: "font-semibold text-blue-900",
                children: safeFiltered.length
              }), " รายการ", totalPages > 1 && ` (หน้า ${currentPage} จาก ${totalPages})`]
            })]
          }), safeFiltered.length > 0 && /* @__PURE__ */ jsxs("div", {
            className: "text-xs text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm",
            children: ["แสดง ", (currentPage - 1) * ITEMS_PER_PAGE + 1, " - ", Math.min(currentPage * ITEMS_PER_PAGE, safeFiltered.length)]
          })]
        }), /* @__PURE__ */ jsx("div", {
          className: "mb-6",
          children: /* @__PURE__ */ jsxs("div", {
            className: "relative flex items-center gap-2",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "relative flex-1",
              children: [/* @__PURE__ */ jsx(Search, {
                className: "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none z-10"
              }), /* @__PURE__ */ jsx("input", {
                ref: searchInputRef,
                type: "search",
                value: searchQuery,
                onChange: (e) => setSearchQuery(e.target.value),
                onFocus: () => {
                  setIsSearchFocused(true);
                  stopTyping();
                },
                onBlur: () => {
                  setIsSearchFocused(false);
                  if (!searchQuery.trim()) startTyping();
                },
                placeholder: isSearchFocused ? "ค้นหาทำเล, รหัสทรัพย์..." : !searchQuery.trim() ? typingPlaceholder : "ค้นหาประกาศ...",
                className: "w-full pl-12 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition"
              }), searchQuery.length > 0 && /* @__PURE__ */ jsx("button", {
                onClick: () => {
                  setSearchQuery("");
                  setDebouncedKeyword("");
                  startTyping();
                },
                className: "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100",
                children: /* @__PURE__ */ jsx(X, {
                  className: "h-4 w-4 text-slate-500"
                })
              })]
            }), /* @__PURE__ */ jsxs("button", {
              className: "flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-md",
              children: [/* @__PURE__ */ jsx(Search, {
                className: "h-5 w-5"
              }), /* @__PURE__ */ jsx("span", {
                className: "hidden sm:inline",
                children: "ค้นหา"
              })]
            })]
          })
        }), /* @__PURE__ */ jsxs("div", {
          className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100",
          children: [/* @__PURE__ */ jsx(FilterItem, {
            label: "ประเภทอสังหาฯ",
            icon: Home$1,
            value: filters.propertyType || "",
            onChange: (val) => updateFiltersWithUrl({
              propertyType: val
            }),
            options: [{
              value: "",
              label: "ทั้งหมด"
            }, ...PROPERTY_TYPES.map((pt) => ({
              value: pt.id,
              label: pt.label
            }))]
          }), /* @__PURE__ */ jsx(FilterItem, {
            label: "พื้นที่ / ทำเล",
            icon: MapPin,
            value: filters.location || "",
            onChange: (val) => updateFiltersWithUrl({
              location: val
            }),
            options: [{
              value: "",
              label: "ทุกทำเล"
            }, {
              value: "ชลบุรี",
              label: "ชลบุรี"
            }, {
              value: "พานทอง",
              label: "พานทอง"
            }, {
              value: "บ้านบึง",
              label: "บ้านบึง"
            }, {
              value: "ศรีราชา",
              label: "ศรีราชา"
            }, {
              value: "ฉะเชิงเทรา",
              label: "ฉะเชิงเทรา"
            }, {
              value: "ระยอง",
              label: "ระยอง"
            }]
          }), /* @__PURE__ */ jsx(FilterItem, {
            label: "สภาพบ้าน",
            icon: Sparkles,
            value: filters.propertySubStatus || "",
            onChange: (val) => updateFiltersWithUrl({
              propertySubStatus: val
            }),
            options: [{
              value: "",
              label: "ทั้งหมด"
            }, {
              value: "มือ 1",
              label: "มือ 1 (ใหม่)"
            }, {
              value: "มือ 2",
              label: "มือ 2 (พร้อมอยู่)"
            }]
          }), /* @__PURE__ */ jsx(FilterItem, {
            label: "เงื่อนไขสัญญา",
            icon: ShieldCheck,
            value: filters.subListingType === "installment_only" ? "installment" : filters.isRental ? "rent" : filters.isRental === false ? "sale" : "",
            onChange: (val) => {
              if (val === "installment") updateFiltersWithUrl({
                subListingType: "installment_only",
                isRental: true
              });
              else if (val === "rent") updateFiltersWithUrl({
                isRental: true,
                subListingType: ""
              });
              else if (val === "sale") updateFiltersWithUrl({
                isRental: false,
                subListingType: ""
              });
              else updateFiltersWithUrl({
                isRental: null,
                subListingType: ""
              });
            },
            options: [{
              value: "",
              label: "ทั้งหมด"
            }, {
              value: "sale",
              label: "ขายปกติ"
            }, {
              value: "rent",
              label: "เช่าปกติ"
            }, {
              value: "installment",
              label: "🔥 ผ่อนตรง (เช่าซื้อ)"
            }]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col lg:flex-row gap-6",
          children: [/* @__PURE__ */ jsxs("aside", {
            className: "w-full lg:w-80 shrink-0 space-y-6",
            children: [/* @__PURE__ */ jsx(AdvancedFiltersPanel, {
              filters,
              onUpdateFilters: updateFiltersWithUrl,
              onApply: () => handlePageChange(1)
            }), /* @__PURE__ */ jsx("div", {
              className: "hidden lg:block",
              children: /* @__PURE__ */ jsx(RecommendedPropertiesSection, {
                allProperties: properties,
                currentFilters: filters,
                vertical: true
              })
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "flex-1 min-w-0",
            children: [/* @__PURE__ */ jsx(ActiveSearchCriteriaBar, {
              keyword: debouncedKeyword,
              filters: {
                ...filters,
                tag: searchParams.get("tag") || filters.tag || "",
                isRental: isRentalFilter !== null ? isRentalFilter : filters.isRental,
                feature: searchParams.get("feature") || filters.feature || ""
              },
              resultCount: safeFiltered.length,
              onRemoveFilter: handleRemoveFilter,
              onClearAll: handleClearAllFilters
            }), /* @__PURE__ */ jsxs("div", {
              className: "mb-8 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white",
              children: [/* @__PURE__ */ jsx("div", {
                className: "h-[320px] relative",
                children: /* @__PURE__ */ jsx(Suspense, {
                  fallback: /* @__PURE__ */ jsx("div", {
                    className: "absolute inset-0 bg-slate-100 flex items-center justify-center animate-pulse",
                    children: /* @__PURE__ */ jsx("span", {
                      className: "text-slate-500 text-sm",
                      children: "กำลังอัปเดตแผนที่…"
                    })
                  }),
                  children: safeFiltered.length > 0 ? /* @__PURE__ */ jsx(PropertiesMap, {
                    properties: mapProperties
                  }) : /* @__PURE__ */ jsxs("div", {
                    className: "absolute inset-0 bg-slate-50 flex flex-col items-center justify-center text-slate-400",
                    children: [/* @__PURE__ */ jsx(MapPin, {
                      className: "h-8 w-8 mb-2 opacity-20"
                    }), /* @__PURE__ */ jsx("p", {
                      className: "text-sm",
                      children: "ไม่พบตำแหน่งทรัพย์สิน"
                    })]
                  })
                })
              }), mapShowingMaxCaption && /* @__PURE__ */ jsx("p", {
                className: "text-xs text-slate-400 px-4 py-2 bg-slate-50 border-t border-slate-100",
                children: "แสดงตำแหน่งไม่เกิน 100 รายการ"
              })]
            }), /* @__PURE__ */ jsx("div", {
              className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center",
              children: paginatedProperties.map((p) => p && p.id && /* @__PURE__ */ jsx(PropertyCard$1, {
                property: p,
                searchQuery: debouncedKeyword
              }, p.id))
            }), totalPages > 1 && /* @__PURE__ */ jsxs("div", {
              className: "mt-12 flex flex-col items-center gap-4",
              children: [/* @__PURE__ */ jsxs("div", {
                className: "flex items-center gap-1 sm:gap-2",
                children: [/* @__PURE__ */ jsx("button", {
                  onClick: () => handlePageChange(currentPage - 1),
                  disabled: currentPage === 1,
                  className: "p-2.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40",
                  children: /* @__PURE__ */ jsx(ChevronDown, {
                    className: "h-5 w-5 rotate-90"
                  })
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center gap-1 sm:gap-2",
                  children: [getPageNumbers()[0] > 1 && /* @__PURE__ */ jsxs(Fragment, {
                    children: [/* @__PURE__ */ jsx("button", {
                      onClick: () => handlePageChange(1),
                      className: "w-10 h-10 rounded-xl hover:bg-slate-100",
                      children: "1"
                    }), getPageNumbers()[0] > 2 && /* @__PURE__ */ jsx("span", {
                      className: "text-slate-300",
                      children: "..."
                    })]
                  }), getPageNumbers().map((n) => /* @__PURE__ */ jsx("button", {
                    onClick: () => handlePageChange(n),
                    className: `w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-sm font-bold transition-all ${currentPage === n ? "bg-blue-900 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`,
                    children: n
                  }, n)), getPageNumbers()[getPageNumbers().length - 1] < totalPages && /* @__PURE__ */ jsxs(Fragment, {
                    children: [getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && /* @__PURE__ */ jsx("span", {
                      className: "text-slate-300",
                      children: "..."
                    }), /* @__PURE__ */ jsx("button", {
                      onClick: () => handlePageChange(totalPages),
                      className: "w-10 h-10 rounded-xl hover:bg-slate-100",
                      children: totalPages
                    })]
                  })]
                }), /* @__PURE__ */ jsx("button", {
                  onClick: () => handlePageChange(currentPage + 1),
                  disabled: currentPage === totalPages,
                  className: "p-2.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40",
                  children: /* @__PURE__ */ jsx(ChevronDown, {
                    className: "h-5 w-5 -rotate-90"
                  })
                })]
              }), /* @__PURE__ */ jsxs("p", {
                className: "text-xs text-slate-400 font-medium",
                children: ["หน้าที่ ", currentPage, " จาก ", totalPages, " หน้า"]
              })]
            }), safeFiltered.length === 0 && /* @__PURE__ */ jsxs("div", {
              className: "text-center py-16",
              children: [/* @__PURE__ */ jsx("div", {
                className: "inline-flex w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4",
                children: /* @__PURE__ */ jsx(SearchX, {
                  className: "h-8 w-8 text-slate-400"
                })
              }), /* @__PURE__ */ jsx("h2", {
                className: "text-lg font-bold text-slate-800 mb-1",
                children: "ไม่พบรายการที่ตรงกับเงื่อนไข"
              }), /* @__PURE__ */ jsx("p", {
                className: "text-slate-500 text-sm mb-8",
                children: "ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองใหม่"
              })]
            })]
          })]
        })]
      })
    })
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  clientLoader: clientLoader$2,
  default: _public_properties,
  meta: meta$2
}, Symbol.toStringTag, { value: "Module" }));
const SPOO_TIMEOUT = 8e3;
async function fetchWithTimeout(url, opts = {}, timeout = SPOO_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}
async function createSpoomeShortUrl(longUrl) {
  if (!longUrl || typeof longUrl !== "string") return null;
  try {
    const res = await fetchWithTimeout("https://spoo.me/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: `url=${encodeURIComponent(longUrl)}`
    });
    if (!res.ok) throw new Error("spoo.me request failed");
    const data2 = await res.json();
    if (data2 && data2.short_url) return data2.short_url;
    throw new Error("Invalid spoo.me response");
  } catch (err) {
    console.warn("spoo.me shortening failed, falling back to long URL", err);
    return longUrl;
  }
}
function Toast({ message, isVisible, onClose, duration = 2500 }) {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isVisible, onClose, duration]);
  if (!isVisible) return null;
  return /* @__PURE__ */ jsx("div", { className: "fixed bottom-4 right-4 z-[100] animate-slide-up", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-lg shadow-lg border border-slate-200 px-4 py-3 flex items-center gap-3 min-w-[200px]", children: [
    /* @__PURE__ */ jsx(CheckCircle, { className: "h-5 w-5 text-green-500 shrink-0" }),
    /* @__PURE__ */ jsx("span", { className: "text-slate-700 text-sm font-medium", children: message })
  ] }) });
}
function ProtectedImageContainer({
  children,
  propertyId = null,
  className = "",
  showWatermark = true
}) {
  const handleContextMenu = (e) => {
    e.preventDefault();
  };
  const handleDragStart = (e) => {
    e.preventDefault();
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `protected-image-container relative overflow-hidden ${className}`,
      onContextMenu: handleContextMenu,
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "absolute inset-0 z-0 [&_img]:select-none [&_img]:[touch-action:none]",
            onDragStart: handleDragStart,
            children
          }
        ),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "absolute inset-0 z-[1] pointer-events-none select-none",
            onContextMenu: handleContextMenu,
            "aria-hidden": true
          }
        ),
        showWatermark && /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 z-[2] pointer-events-none", "aria-hidden": true, children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute inset-0 opacity-[0.14]",
              style: {
                backgroundImage: `repeating-linear-gradient(
                -18deg,
                transparent,
                transparent 52px,
                rgba(255,255,255,0.22) 52px,
                rgba(255,255,255,0.22) 54px
              )`
              }
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute right-2 bottom-2 left-2 text-right",
              style: { textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)" },
              children: /* @__PURE__ */ jsx("span", { className: "text-[10px] sm:text-xs text-white font-semibold", children: "SPS Property Solution" })
            }
          )
        ] })
      ]
    }
  );
}
function MortgageCalculator({ price, directInstallment }) {
  const [loanType, setLoanType] = useState(directInstallment ? "direct" : "bank");
  const [downPercent, setDownPercent] = useState(20);
  const [years, setYears] = useState(20);
  const [bankInterestRate, setBankInterestRate] = useState(3.5);
  const [directInterestRate, setDirectInterestRate] = useState(2.5);
  const down = Math.round(price * downPercent / 100);
  const loan = price - down;
  const interestRate = loanType === "direct" ? directInterestRate : bankInterestRate;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = years * 12;
  const monthlyPayment = monthlyRate === 0 ? loan / numPayments : loan * monthlyRate * Math.pow(1 + monthlyRate, numPayments) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const paymentSchedule = [];
  let remainingBalance = loan;
  for (let i = 1; i <= Math.min(12, numPayments); i++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;
    paymentSchedule.push({
      month: i,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, remainingBalance)
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-6 shadow-md", children: [
    /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-blue-900 mb-4", children: "คำนวณสินเชื่อบ้าน" }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ประเภทสินเชื่อ" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setLoanType("bank"),
              className: `px-4 py-3 rounded-lg border-2 transition ${loanType === "bank" ? "border-blue-900 bg-blue-50 text-blue-900 font-semibold" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`,
              children: "กู้แบงก์"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setLoanType("direct"),
              className: `px-4 py-3 rounded-lg border-2 transition ${loanType === "direct" ? "border-blue-900 bg-blue-50 text-blue-900 font-semibold" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`,
              children: "ผ่อนตรง"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "เงินดาวน์ (%)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "range",
            min: "10",
            max: "50",
            value: downPercent,
            onChange: (e) => setDownPercent(Number(e.target.value)),
            className: "w-full"
          }
        ),
        /* @__PURE__ */ jsxs("span", { className: "text-sm text-slate-600", children: [
          downPercent,
          "% = ",
          (down / 1e6).toFixed(1),
          " ล้านบาท"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ระยะเวลากู้ (ปี)" }),
        /* @__PURE__ */ jsx(
          "select",
          {
            value: years,
            onChange: (e) => setYears(Number(e.target.value)),
            className: "w-full px-3 py-2 border border-slate-200 rounded-lg",
            children: [5, 10, 15, 20, 25, 30].map((y) => /* @__PURE__ */ jsxs("option", { value: y, children: [
              y,
              " ปี"
            ] }, y))
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: [
          "อัตราดอกเบี้ย (% ต่อปี) - ",
          loanType === "direct" ? "ผ่อนตรง" : "กู้แบงก์"
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            step: "0.1",
            value: loanType === "direct" ? directInterestRate : bankInterestRate,
            onChange: (e) => {
              if (loanType === "direct") {
                setDirectInterestRate(Number(e.target.value));
              } else {
                setBankInterestRate(Number(e.target.value));
              }
            },
            className: "w-full px-3 py-2 border border-slate-200 rounded-lg"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "pt-4 border-t border-slate-200", children: [
        /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-sm mb-1", children: "ค่างวดโดยประมาณ" }),
        /* @__PURE__ */ jsxs("p", { className: "text-2xl font-bold text-yellow-900", children: [
          monthlyPayment.toLocaleString("th-TH", { maximumFractionDigits: 0 }),
          " บาท/เดือน"
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
          "รวมทั้งสิ้น ",
          (monthlyPayment * numPayments / 1e6).toFixed(1),
          " ล้านบาท (",
          years,
          " ปี)"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "pt-4 border-t border-slate-200", children: [
        /* @__PURE__ */ jsx("h4", { className: "text-sm font-semibold text-blue-900 mb-3", children: "ตารางค่างวด 12 เดือนแรก" }),
        /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-xs", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50", children: [
            /* @__PURE__ */ jsx("th", { className: "px-2 py-2 text-left font-medium text-slate-700", children: "เดือน" }),
            /* @__PURE__ */ jsx("th", { className: "px-2 py-2 text-right font-medium text-slate-700", children: "ค่างวด" }),
            /* @__PURE__ */ jsx("th", { className: "px-2 py-2 text-right font-medium text-slate-700", children: "เงินต้น" }),
            /* @__PURE__ */ jsx("th", { className: "px-2 py-2 text-right font-medium text-slate-700", children: "ดอกเบี้ย" }),
            /* @__PURE__ */ jsx("th", { className: "px-2 py-2 text-right font-medium text-slate-700", children: "คงเหลือ" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100", children: paymentSchedule.map((row) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50", children: [
            /* @__PURE__ */ jsx("td", { className: "px-2 py-2 text-slate-600", children: row.month }),
            /* @__PURE__ */ jsx("td", { className: "px-2 py-2 text-right font-medium text-blue-900", children: row.payment.toLocaleString("th-TH", { maximumFractionDigits: 0 }) }),
            /* @__PURE__ */ jsx("td", { className: "px-2 py-2 text-right text-slate-600", children: row.principal.toLocaleString("th-TH", { maximumFractionDigits: 0 }) }),
            /* @__PURE__ */ jsx("td", { className: "px-2 py-2 text-right text-slate-600", children: row.interest.toLocaleString("th-TH", { maximumFractionDigits: 0 }) }),
            /* @__PURE__ */ jsx("td", { className: "px-2 py-2 text-right text-slate-500", children: row.balance.toLocaleString("th-TH", { maximumFractionDigits: 0 }) })
          ] }, row.month)) })
        ] }) })
      ] })
    ] })
  ] });
}
function validatePhone$1(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && /^0\d{9}$/.test(digits);
}
function LeadForm({ propertyId, propertyTitle, propertyPrice, isRental, onSuccess, onError }) {
  const { user, isAgent } = usePublicAuth();
  const activeTab = user && isAgent() ? "agent" : "customer";
  const baseId = useId();
  const [today, setToday] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [agentCustomerName, setAgentCustomerName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentVisitDate, setAgentVisitDate] = useState("");
  const [agentVisitTime, setAgentVisitTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    setToday((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (activeTab === "customer") {
      if (!customerName.trim()) newErrors.customerName = "กรุณากรอกชื่อลูกค้า";
      if (!customerPhone.trim()) newErrors.customerPhone = "กรุณากรอกเบอร์โทร";
      else if (!validatePhone$1(customerPhone.trim())) newErrors.customerPhone = "เบอร์โทรต้องเป็นตัวเลข 10 หลัก (เช่น 0812345678)";
      if (!visitDate.trim()) newErrors.visitDate = "กรุณาเลือกวันที่เข้าชม";
      if (!visitTime.trim()) newErrors.visitTime = "กรุณาเลือกเวลา";
    } else {
      if (!agentCustomerName.trim()) newErrors.agentCustomerName = "กรุณากรอกชื่อลูกค้า";
      if (!agentName.trim()) newErrors.agentName = "กรุณากรอกชื่อเอเจ้นท์ที่ดูแล";
      if (!agentPhone.trim()) newErrors.agentPhone = "กรุณากรอกเบอร์โทรเอเจ้นท์";
      else if (!validatePhone$1(agentPhone.trim())) newErrors.agentPhone = "เบอร์โทรต้องเป็นตัวเลข 10 หลัก (เช่น 0812345678)";
      if (!agentVisitDate.trim()) newErrors.agentVisitDate = "กรุณาเลือกวันที่เข้าชม";
      if (!agentVisitTime.trim()) newErrors.agentVisitTime = "กรุณาเลือกเวลา";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setIsLoading(true);
    setErrors({});
    try {
      const appointmentData = activeTab === "customer" ? {
        type: "Customer",
        contactName: customerName.trim(),
        tel: customerPhone.trim(),
        date: visitDate.trim(),
        time: visitTime.trim(),
        propertyId: propertyId || "",
        propertyTitle: propertyTitle || ""
      } : {
        type: "Agent",
        agentName: agentName.trim(),
        contactName: agentCustomerName.trim(),
        tel: agentPhone.trim(),
        date: agentVisitDate.trim(),
        time: agentVisitTime.trim(),
        propertyId: propertyId || "",
        propertyTitle: propertyTitle || ""
      };
      await createAppointment(appointmentData);
      if (activeTab === "customer") {
        setCustomerName("");
        setCustomerPhone("");
        setVisitDate("");
        setVisitTime("");
      } else {
        setAgentCustomerName("");
        setAgentName("");
        setAgentPhone("");
        setAgentVisitDate("");
        setAgentVisitTime("");
      }
      onSuccess?.("ส่งคำขอนัดเยี่ยมชมสำเร็จ! เจ้าหน้าที่จะติดต่อกลับเร็วๆ นี้");
    } catch (err) {
      console.error(err);
      onError?.();
    } finally {
      setIsLoading(false);
    }
  };
  const fieldClass = (hasError) => `w-full px-4 py-2.5 rounded-lg border text-sm bg-white transition-colors ${hasError ? "border-amber-500 focus:ring-amber-200" : "border-slate-200 focus:ring-blue-200"} focus:ring-2 focus:outline-none`;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsx("div", { className: "flex gap-2 border-b border-slate-200", children: /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "flex-1 px-4 py-2 text-sm font-medium bg-blue-900 text-white rounded-t-lg",
        disabled: true,
        children: activeTab === "customer" ? "สำหรับลูกค้า" : "สำหรับเอเจน"
      }
    ) }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsx("h4", { className: "text-base font-semibold text-blue-900", children: activeTab === "customer" ? "ลูกค้านัดเข้าชมโครงการ" : "เอเจ้นท์พาลูกค้าเข้าชม" }),
      activeTab === "customer" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-customerName`, className: "block text-sm font-medium text-slate-700 mb-1", children: "ชื่อลูกค้า *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-customerName`,
              type: "text",
              value: customerName,
              onChange: (e) => {
                setCustomerName(e.target.value);
                setErrors((p) => ({ ...p, customerName: "" }));
              },
              placeholder: "กรอกชื่อลูกค้า",
              className: fieldClass(errors.customerName)
            }
          ),
          errors.customerName && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.customerName })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-customerPhone`, className: "block text-sm font-medium text-slate-700 mb-1", children: "เบอร์โทร *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-customerPhone`,
              type: "tel",
              value: customerPhone,
              onChange: (e) => {
                setCustomerPhone(e.target.value);
                setErrors((p) => ({ ...p, customerPhone: "" }));
              },
              placeholder: "เช่น 0812345678",
              className: fieldClass(errors.customerPhone)
            }
          ),
          errors.customerPhone && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.customerPhone })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-visitDate`, className: "block text-sm font-medium text-slate-700 mb-1", children: "วันที่เข้าชม *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-visitDate`,
              type: "date",
              value: visitDate,
              onChange: (e) => {
                setVisitDate(e.target.value);
                setErrors((p) => ({ ...p, visitDate: "" }));
              },
              min: today,
              className: fieldClass(errors.visitDate)
            }
          ),
          errors.visitDate && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.visitDate })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-visitTime`, className: "block text-sm font-medium text-slate-700 mb-1", children: "เวลา *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-visitTime`,
              type: "time",
              value: visitTime,
              onChange: (e) => {
                setVisitTime(e.target.value);
                setErrors((p) => ({ ...p, visitTime: "" }));
              },
              className: fieldClass(errors.visitTime)
            }
          ),
          errors.visitTime && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.visitTime })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-propertyId`, className: "block text-sm font-medium text-slate-700 mb-1", children: "รหัสทรัพย์" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-propertyId`,
              type: "text",
              value: propertyId || "",
              readOnly: true,
              className: "w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-agentCustomerName`, className: "block text-sm font-medium text-slate-700 mb-1", children: "ชื่อลูกค้า *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-agentCustomerName`,
              type: "text",
              value: agentCustomerName,
              onChange: (e) => {
                setAgentCustomerName(e.target.value);
                setErrors((p) => ({ ...p, agentCustomerName: "" }));
              },
              placeholder: "กรอกชื่อลูกค้า",
              className: fieldClass(errors.agentCustomerName)
            }
          ),
          errors.agentCustomerName && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.agentCustomerName })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-agentName`, className: "block text-sm font-medium text-slate-700 mb-1", children: "ชื่อเอเจ้นท์ที่ดูแล *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-agentName`,
              type: "text",
              value: agentName,
              onChange: (e) => {
                setAgentName(e.target.value);
                setErrors((p) => ({ ...p, agentName: "" }));
              },
              placeholder: "กรอกชื่อเอเจ้นท์",
              className: fieldClass(errors.agentName)
            }
          ),
          errors.agentName && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.agentName })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-agentPhone`, className: "block text-sm font-medium text-slate-700 mb-1", children: "เบอร์โทรเอเจ้นท์ *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-agentPhone`,
              type: "tel",
              value: agentPhone,
              onChange: (e) => {
                setAgentPhone(e.target.value);
                setErrors((p) => ({ ...p, agentPhone: "" }));
              },
              placeholder: "เช่น 0812345678",
              className: fieldClass(errors.agentPhone)
            }
          ),
          errors.agentPhone && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.agentPhone })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-agentVisitDate`, className: "block text-sm font-medium text-slate-700 mb-1", children: "วันที่เข้าชม *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-agentVisitDate`,
              type: "date",
              value: agentVisitDate,
              onChange: (e) => {
                setAgentVisitDate(e.target.value);
                setErrors((p) => ({ ...p, agentVisitDate: "" }));
              },
              min: today,
              className: fieldClass(errors.agentVisitDate)
            }
          ),
          errors.agentVisitDate && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.agentVisitDate })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-agentVisitTime`, className: "block text-sm font-medium text-slate-700 mb-1", children: "เวลา *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-agentVisitTime`,
              type: "time",
              value: agentVisitTime,
              onChange: (e) => {
                setAgentVisitTime(e.target.value);
                setErrors((p) => ({ ...p, agentVisitTime: "" }));
              },
              className: fieldClass(errors.agentVisitTime)
            }
          ),
          errors.agentVisitTime && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-amber-600", children: errors.agentVisitTime })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: `${baseId}-agentPropertyId`, className: "block text-sm font-medium text-slate-700 mb-1", children: "รหัสทรัพย์" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: `${baseId}-agentPropertyId`,
              type: "text",
              value: propertyId || "",
              readOnly: true,
              className: "w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          disabled: isLoading,
          className: "w-full py-3 rounded-lg bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 hover:ring-2 hover:ring-yellow-400 hover:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2",
          children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("span", { className: "inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
            "กำลังส่งข้อมูล…"
          ] }) : "ส่งคำขอนัดเยี่ยมชม"
        }
      )
    ] })
  ] });
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function smartTokenize(query2) {
  if (!query2 || typeof query2 !== "string") return [];
  const normalized = query2.trim().toLowerCase();
  if (!normalized) return [];
  const tokens = [];
  let remainingText = normalized;
  const specialPatterns = [
    /มือ\s*1/g,
    // Matches 'มือ 1' or 'มือ1'
    /มือ\s*2/g
    // Matches 'มือ 2' or 'มือ2'
  ];
  const specialMatches = [];
  specialPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(remainingText)) !== null) {
      specialMatches.push({
        text: match[0],
        index: match.index
      });
    }
  });
  specialMatches.sort((a, b) => a.index - b.index);
  let lastIndex = 0;
  specialMatches.forEach((match) => {
    if (match.index > lastIndex) {
      const beforeText = remainingText.substring(lastIndex, match.index).trim();
      if (beforeText) {
        const beforeTokens = beforeText.split(/\s+/).filter((t) => t.length > 0);
        tokens.push(...beforeTokens);
      }
    }
    const normalizedKeyword = match.text.replace(/\s+/g, " ").trim();
    if (normalizedKeyword === "มือ1" || normalizedKeyword === "มือ 1") {
      tokens.push("มือ 1");
    } else if (normalizedKeyword === "มือ2" || normalizedKeyword === "มือ 2") {
      tokens.push("มือ 2");
    } else {
      tokens.push(normalizedKeyword);
    }
    lastIndex = match.index + match.text.length;
  });
  if (lastIndex < remainingText.length) {
    const afterText = remainingText.substring(lastIndex).trim();
    if (afterText) {
      const afterTokens = afterText.split(/\s+/).filter((t) => t.length > 0);
      tokens.push(...afterTokens);
    }
  }
  if (specialMatches.length === 0) {
    return normalized.split(/\s+/).filter((t) => t.length > 0);
  }
  return tokens.filter((t) => t.length > 0);
}
function highlightText(text, query2) {
  if (!text || typeof text !== "string") return text;
  if (!query2 || typeof query2 !== "string" || query2.trim().length === 0) {
    return text;
  }
  try {
    const keywords = smartTokenize(query2);
    if (keywords.length === 0) return text;
    const escapedKeywords = keywords.map((keyword) => {
      return escapeRegex(keyword);
    });
    const pattern = new RegExp(`(${escapedKeywords.join("|")})`, "gi");
    const parts = text.split(pattern);
    return parts.map((part, index) => {
      if (!part || part.length === 0) return "";
      const normalizedPart = part.toLowerCase().trim();
      const isMatch = keywords.some((keyword) => {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (normalizedKeyword.includes(" ")) {
          return normalizedPart === normalizedKeyword || normalizedPart.includes(normalizedKeyword);
        }
        return normalizedPart.includes(normalizedKeyword);
      });
      if (isMatch && part.length > 0) {
        return React.createElement(
          "mark",
          {
            key: index,
            className: "bg-yellow-200 text-black rounded-sm px-0.5 font-medium"
          },
          part
        );
      }
      return part;
    });
  } catch (error) {
    console.error("highlightText error:", error);
    return text;
  }
}
const RelatedProperties = lazy(() => import("./RelatedProperties-Ci5ojAVb.js"));
const NeighborhoodData$1 = lazy(() => import("./NeighborhoodData-DN97J7Ie.js"));
function meta$1({
  data: loaderData
}) {
  if (!loaderData?.property) {
    return [{
      title: "ไม่พบรายการนี้ | SPS Property Solution"
    }, {
      name: "robots",
      content: "noindex"
    }];
  }
  const p = loaderData.property;
  const title = `${p.title || "อสังหาริมทรัพย์"} | SPS Property Solution`;
  const description = (p.description || "").slice(0, 160) + ((p.description || "").length > 160 ? "..." : "");
  const rawImgs = p.images && Array.isArray(p.images) ? p.images.filter(isValidImageUrl) : [];
  const primaryImage = rawImgs.length > 0 ? rawImgs[0] : "https://spspropertysolution.com/icon.png";
  const url = `https://spspropertysolution.com${getPropertyPath(p)}`;
  return [
    {
      title
    },
    {
      name: "description",
      content: description
    },
    {
      tagName: "link",
      rel: "canonical",
      href: url
    },
    // Open Graph
    {
      property: "og:type",
      content: "article"
    },
    {
      property: "og:title",
      content: title
    },
    {
      property: "og:description",
      content: description
    },
    {
      property: "og:image",
      content: primaryImage
    },
    {
      property: "og:url",
      content: url
    },
    {
      property: "og:site_name",
      content: "SPS Property Solution"
    },
    // Twitter
    {
      name: "twitter:card",
      content: "summary_large_image"
    },
    {
      name: "twitter:title",
      content: title
    },
    {
      name: "twitter:description",
      content: description
    },
    {
      name: "twitter:image",
      content: primaryImage
    }
  ];
}
async function clientLoader$1({
  params
}) {
  const propertyId = extractIdFromSlug(params.slug);
  if (!propertyId) {
    throw data("Not Found", {
      status: 404
    });
  }
  const property = await getPropertyByIdOnce(propertyId);
  if (!property) {
    throw data("Not Found", {
      status: 404
    });
  }
  recordPropertyView({
    propertyId: property.id,
    type: property.type
  }).catch(() => {
  });
  return {
    property
  };
}
clientLoader$1.hydrate = true;
const _public_properties_$slug = UNSAFE_withComponentProps(function PropertyDetailPage({
  loaderData
}) {
  const property = loaderData?.property;
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user,
    isAgent
  } = usePublicAuth();
  const searchQuery = searchParams.get("q") || "";
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!property) {
    return /* @__PURE__ */ jsx("div", {
      className: "min-h-screen bg-slate-50 flex items-center justify-center",
      children: /* @__PURE__ */ jsxs("div", {
        className: "text-center",
        children: [/* @__PURE__ */ jsx("p", {
          className: "text-slate-600 mb-4",
          children: "ไม่พบรายการนี้"
        }), /* @__PURE__ */ jsx(Link, {
          to: "/",
          className: "text-blue-900 font-medium hover:underline",
          children: "กลับหน้าแรก"
        })]
      })
    });
  }
  const canonicalSlug = generatePropertySlug(property);
  if (canonicalSlug && slug !== canonicalSlug) {
    navigate(`/properties/${canonicalSlug}`, {
      replace: true
    });
  }
  const loc = property.location || {};
  const defaultImg = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800";
  const rawImgs = property.images && Array.isArray(property.images) ? property.images.filter(isValidImageUrl) : [];
  let finalImgs = [...rawImgs];
  if (property.coverImageUrl && isValidImageUrl(property.coverImageUrl)) {
    finalImgs = [property.coverImageUrl, ...rawImgs.filter((img) => img !== property.coverImageUrl)];
  }
  const imgs = finalImgs.length > 0 ? finalImgs : [defaultImg];
  const getMapEmbedUrl = (url) => {
    if (!url) {
      if (loc.district && loc.province) {
        const locationQuery = `${loc.district}, ${loc.province}`;
        return `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`;
      }
      return null;
    }
    if (url.includes("<iframe")) {
      const match = url.match(/src="([^"]+)"/);
      if (match) return match[1];
    }
    if (url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps")) return null;
    if (url.includes("/embed")) return url;
    if (url.includes("google.") && url.includes("/maps")) {
      let query2 = "";
      const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) query2 = `${coordMatch[1]},${coordMatch[2]}`;
      else {
        const placeMatch = url.match(/place\/([^/?#]+)/);
        if (placeMatch) query2 = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        else {
          const searchMatch = url.match(/[?&]q=([^&]+)/);
          if (searchMatch) query2 = decodeURIComponent(searchMatch[1]);
        }
      }
      if (query2) return `https://maps.google.com/maps?q=${encodeURIComponent(query2)}&output=embed`;
      if (loc.district && loc.province) return `https://maps.google.com/maps?q=${encodeURIComponent(`${loc.district}, ${loc.province}`)}&output=embed`;
    }
    return null;
  };
  const mapEmbedUrl = getMapEmbedUrl(property.mapUrl);
  const isShortMapLink = property.mapUrl && (property.mapUrl.includes("maps.app.goo.gl") || property.mapUrl.includes("goo.gl/maps"));
  const handleShare = async () => {
    if (!property?.id) return;
    const isLineApp = /Line/i.test(navigator.userAgent);
    try {
      const link = await createOrReuseShareLink({
        propertyId: property.id,
        createdBy: "public_share",
        ttlHours: 24
      });
      const shareUrl = `${window.location.origin}/share/${link.id}`;
      if (isLineApp) {
        window.location.href = shareUrl;
        return;
      }
      const newTab = window.open(shareUrl, "_blank", "noopener,noreferrer");
      if (!newTab || newTab.closed) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setToastMessage("คัดลอกลิงก์แชร์แล้ว");
        } catch {
          setToastMessage(`ลิงก์แชร์: ${shareUrl}`);
        }
        setShowToast(true);
      }
    } catch {
      setToastMessage("ไม่สามารถสร้างลิงก์แชร์ได้");
      setShowToast(true);
    }
  };
  const handleCopyLink = async () => {
    if (!property?.id) return;
    setIsCopying(true);
    try {
      const longUrl = window.location.href;
      const shortUrl = await createSpoomeShortUrl(longUrl);
      await navigator.clipboard.writeText(shortUrl);
      setToastMessage(`คัดลอกลิงก์แล้ว: ${shortUrl}`);
      setShowToast(true);
      setCopied(true);
      setTimeout(() => setCopied(false), 3e3);
    } catch {
      setToastMessage("ไม่สามารถคัดลอกลิงก์ได้");
      setShowToast(true);
    } finally {
      setIsCopying(false);
    }
  };
  return /* @__PURE__ */ jsxs(PageLayout, {
    heroTitle: property.title,
    heroSubtitle: `${loc.district || ""}, ${loc.province || ""}`,
    searchComponent: null,
    children: [/* @__PURE__ */ jsx("div", {
      className: "min-h-screen bg-slate-50 pb-24 md:pb-8",
      children: /* @__PURE__ */ jsx("div", {
        className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
        children: /* @__PURE__ */ jsxs("div", {
          className: "grid grid-cols-1 lg:grid-cols-3 gap-8",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "lg:col-span-2 space-y-6",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-xl overflow-hidden shadow-md",
              children: [/* @__PURE__ */ jsx(ProtectedImageContainer, {
                propertyId: property.propertyId,
                className: "aspect-video relative bg-slate-200",
                children: /* @__PURE__ */ jsx("img", {
                  src: getCloudinaryLargeUrl(imgs[galleryIndex]),
                  alt: `${getPropertyLabel(property.type) || "อสังหาริมทรัพย์"} โครงการ ${property.title} - รูปภาพที่ ${galleryIndex + 1}`,
                  className: "w-full h-full object-cover protected-image",
                  loading: "lazy",
                  decoding: "async",
                  draggable: false
                })
              }), imgs.length > 1 && /* @__PURE__ */ jsx("div", {
                className: "flex gap-2 p-2 overflow-x-auto",
                onContextMenu: (e) => e.preventDefault(),
                children: imgs.map((img, i) => /* @__PURE__ */ jsx("button", {
                  type: "button",
                  onClick: () => setGalleryIndex(i),
                  className: `shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 ${i === galleryIndex ? "border-blue-900" : "border-transparent"}`,
                  children: /* @__PURE__ */ jsx("img", {
                    src: getCloudinaryThumbUrl(img),
                    alt: `รูปย่อที่ ${i + 1}`,
                    className: "w-full h-full object-cover protected-image",
                    loading: "lazy",
                    decoding: "async",
                    draggable: false
                  })
                }, i))
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-xl border border-slate-200 p-6",
              children: [/* @__PURE__ */ jsxs("div", {
                className: "flex flex-wrap items-center gap-2 mb-4",
                children: [property.propertyId && /* @__PURE__ */ jsxs("div", {
                  className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "font-mono",
                    children: property.propertyId
                  }), /* @__PURE__ */ jsx("button", {
                    type: "button",
                    onClick: () => {
                      navigator.clipboard.writeText(property.propertyId);
                      setToastMessage("คัดลอกรหัสทรัพย์แล้ว");
                      setShowToast(true);
                    },
                    className: "p-0.5 hover:bg-gray-200 rounded transition",
                    children: /* @__PURE__ */ jsx(Copy, {
                      className: "h-3.5 w-3.5"
                    })
                  })]
                }), property.type && /* @__PURE__ */ jsx("span", {
                  className: "px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium",
                  children: property.isRental ? "เช่า" : "ซื้อ"
                }), !property.isRental && property.propertySubStatus && /* @__PURE__ */ jsx("span", {
                  className: "px-3 py-1.5 rounded-full bg-blue-900 text-white text-sm font-medium",
                  children: property.propertySubStatus
                }), (() => {
                  let statusLabel = "", statusColor = "";
                  if (property.isRental) {
                    statusLabel = property.availability === "unavailable" ? "ไม่ว่าง" : "ว่าง";
                    statusColor = property.availability === "unavailable" ? "bg-red-600 text-white" : "bg-emerald-500 text-white";
                  } else {
                    if (property.status === "available") {
                      statusLabel = "ว่าง";
                      statusColor = "bg-emerald-500 text-white";
                    } else if (property.status === "reserved") {
                      statusLabel = "ติดจอง";
                      statusColor = "bg-orange-500 text-white";
                    } else if (property.status === "sold") {
                      statusLabel = "ขายแล้ว";
                      statusColor = "bg-red-600 text-white";
                    }
                  }
                  return statusLabel ? /* @__PURE__ */ jsx("span", {
                    className: `px-3 py-1.5 rounded-full ${statusColor} text-sm font-medium`,
                    children: statusLabel
                  }) : null;
                })(), property.directInstallment && /* @__PURE__ */ jsx("span", {
                  className: "px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-400 text-blue-900",
                  children: "ผ่อนตรง"
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "flex items-start justify-between mb-4",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex-1",
                  children: [/* @__PURE__ */ jsx("h1", {
                    className: "text-2xl sm:text-3xl font-bold text-blue-900 mb-4",
                    children: property.title
                  }), /* @__PURE__ */ jsx("p", {
                    className: "text-2xl font-bold text-amber-700 mb-4",
                    children: formatPrice(property.price, property.isRental, property.showPrice)
                  })]
                }), /* @__PURE__ */ jsxs("button", {
                  type: "button",
                  onClick: handleShare,
                  className: "ml-2 sm:ml-4 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 min-h-[44px] rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all font-semibold shrink-0",
                  children: [/* @__PURE__ */ jsx(Share2, {
                    className: "h-5 w-5"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "hidden sm:inline",
                    children: "แชร์ให้ลูกค้า"
                  })]
                }), /* @__PURE__ */ jsxs("button", {
                  type: "button",
                  onClick: handleCopyLink,
                  className: `ml-2 sm:ml-3 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 min-h-[44px] rounded-xl font-semibold shrink-0 transition-all shadow-sm border ${copied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`,
                  children: [isCopying ? /* @__PURE__ */ jsx("span", {
                    className: "inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
                  }) : copied ? /* @__PURE__ */ jsx(Check, {
                    className: "h-5 w-5"
                  }) : /* @__PURE__ */ jsx(Copy, {
                    className: "h-5 w-5"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "hidden sm:inline",
                    children: copied ? "คัดลอกสำเร็จ" : "คัดลอกลิงก์"
                  })]
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "space-y-3 mb-4",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex items-center gap-2 text-gray-600",
                  children: [/* @__PURE__ */ jsx(MapPin, {
                    className: "h-4 w-4 shrink-0"
                  }), /* @__PURE__ */ jsxs("span", {
                    children: [loc.district || "", loc.district && loc.province ? ", " : "", loc.province || ""]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-wrap items-center gap-4 text-gray-600",
                  children: [/* @__PURE__ */ jsxs("span", {
                    className: "flex items-center gap-1.5",
                    children: [/* @__PURE__ */ jsx(Bed, {
                      className: "h-4 w-4 shrink-0"
                    }), /* @__PURE__ */ jsxs("span", {
                      children: [property.bedrooms || "-", " ห้องนอน"]
                    })]
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "flex items-center gap-1.5",
                    children: [/* @__PURE__ */ jsx(Bath, {
                      className: "h-4 w-4 shrink-0"
                    }), /* @__PURE__ */ jsxs("span", {
                      children: [property.bathrooms || "-", " ห้องน้ำ"]
                    })]
                  }), property.area != null && property.area > 0 && /* @__PURE__ */ jsxs("span", {
                    className: "flex items-center gap-1.5",
                    children: [/* @__PURE__ */ jsx(Maximize2, {
                      className: "h-4 w-4 shrink-0"
                    }), /* @__PURE__ */ jsxs("span", {
                      children: [(Number(property.area) / 4).toFixed(1), " ตร.ว."]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsx("p", {
                className: "text-slate-700 leading-relaxed whitespace-pre-wrap",
                style: {
                  fontFamily: "Prompt, sans-serif"
                },
                children: property.description || "-"
              }), property.directInstallment && /* @__PURE__ */ jsxs("div", {
                className: "mt-6 p-6 rounded-xl border-2 border-blue-200 bg-blue-50/50",
                children: [/* @__PURE__ */ jsxs("h3", {
                  className: "text-lg font-bold text-blue-900 mb-4 flex items-center gap-2",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-blue-900 text-sm",
                    children: "ผ่อนตรง"
                  }), "เงื่อนไขการผ่อนตรง (เช่าซื้อ)"]
                }), /* @__PURE__ */ jsx("ul", {
                  className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
                  children: ["ไม่เช็คเครดิตบูโร ไม่ต้องกู้แบงก์", "ใช้เพียงบัตรประชาชนใบเดียวในการทำสัญญา", "วางเงินดาวน์ตามตกลง เข้าอยู่ได้ทันที", "ผ่อนชำระโดยตรงกับโครงการ/เจ้าของ", "สามารถเปลี่ยนเป็นการกู้ธนาคารได้ในภายหลังเมื่อพร้อม"].map((item, i) => /* @__PURE__ */ jsxs("li", {
                    className: "flex items-start gap-3 text-slate-700",
                    children: [/* @__PURE__ */ jsx(CheckCircle2, {
                      className: "h-5 w-5 text-blue-900 shrink-0 mt-0.5"
                    }), /* @__PURE__ */ jsx("span", {
                      children: item
                    })]
                  }, i))
                })]
              }), property.customTags && Array.isArray(property.customTags) && property.customTags.length > 0 && /* @__PURE__ */ jsxs("div", {
                className: "mt-6",
                children: [/* @__PURE__ */ jsx("h3", {
                  className: "text-xl font-semibold text-blue-900 mb-3",
                  children: "Tag"
                }), /* @__PURE__ */ jsx("div", {
                  className: "flex flex-wrap gap-2",
                  children: property.customTags.map((tag, index) => /* @__PURE__ */ jsx(Link, {
                    to: `/properties?search=${encodeURIComponent(tag)}`,
                    className: "px-3 py-1.5 bg-blue-50 text-gray-700 text-sm rounded-full border border-blue-200 font-medium hover:bg-blue-600 hover:text-white transition-colors",
                    children: searchQuery ? highlightText(tag, searchQuery) : tag
                  }, index))
                })]
              })]
            }), property.mapUrl && !property.mapUrl.includes("/embed") && /* @__PURE__ */ jsx("div", {
              className: "bottom-2 right-2",
              children: /* @__PURE__ */ jsx("a", {
                href: property.mapUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "px-3 py-1.5 bg-white rounded-lg shadow-md text-xs text-blue-900 font-medium hover:bg-slate-50 transition",
                children: "เปิดใน Google Maps"
              })
            }), /* @__PURE__ */ jsx("div", {
              className: "bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md",
              children: mapEmbedUrl ? /* @__PURE__ */ jsx("div", {
                className: "aspect-video",
                children: /* @__PURE__ */ jsx("iframe", {
                  title: "แผนที่",
                  src: mapEmbedUrl,
                  className: "w-full h-full border-0",
                  allowFullScreen: true,
                  loading: "lazy",
                  referrerPolicy: "no-referrer-when-downgrade"
                })
              }) : isShortMapLink ? /* @__PURE__ */ jsxs("div", {
                className: "aspect-video flex flex-col items-center justify-center gap-4 bg-slate-50 px-6",
                children: [/* @__PURE__ */ jsx(MapPin, {
                  className: "h-12 w-12 text-blue-600"
                }), /* @__PURE__ */ jsx("p", {
                  className: "text-slate-600 text-center",
                  children: "ลิงก์สั้นไม่รองรับการแสดงแผนที่ในหน้า"
                }), /* @__PURE__ */ jsx("a", {
                  href: property.mapUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors",
                  children: "เปิดใน Google Maps"
                })]
              }) : /* @__PURE__ */ jsx("div", {
                className: "h-64 bg-slate-200 flex items-center justify-center text-slate-500",
                children: /* @__PURE__ */ jsxs("div", {
                  className: "text-center",
                  children: [/* @__PURE__ */ jsx(MapPin, {
                    className: "h-12 w-12 mx-auto mb-2 opacity-50"
                  }), /* @__PURE__ */ jsx("p", {
                    children: "แผนที่ Google Maps"
                  }), /* @__PURE__ */ jsxs("p", {
                    className: "text-sm",
                    children: [loc.district || "ไม่ระบุ", ", ", loc.province || "ไม่ระบุ"]
                  })]
                })
              })
            }), !property.isRental && property.price > 0 && property.showPrice !== false && /* @__PURE__ */ jsx("div", {
              className: "mt-6",
              children: /* @__PURE__ */ jsx(MortgageCalculator, {
                price: property.price,
                directInstallment: property.directInstallment
              })
            }), /* @__PURE__ */ jsx(Suspense, {
              fallback: /* @__PURE__ */ jsxs("div", {
                className: "py-8",
                children: [/* @__PURE__ */ jsx("div", {
                  className: "h-6 w-40 bg-slate-200 rounded-lg mb-4 animate-pulse"
                }), /* @__PURE__ */ jsx("div", {
                  className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
                  children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", {
                    className: "h-64 bg-slate-100 rounded-xl animate-pulse"
                  }, i))
                })]
              }),
              children: /* @__PURE__ */ jsx(RelatedProperties, {
                currentPropertyId: property.id,
                district: loc.district,
                type: property.type
              })
            })]
          }), /* @__PURE__ */ jsx("div", {
            className: "lg:col-span-1",
            children: /* @__PURE__ */ jsxs("div", {
              className: "lg:sticky lg:top-24 space-y-6",
              children: [/* @__PURE__ */ jsx("div", {
                className: "bg-white rounded-xl border border-blue-100 p-6 shadow-md",
                children: /* @__PURE__ */ jsxs("div", {
                  className: "pt-4 border-slate-100",
                  children: [/* @__PURE__ */ jsx("p", {
                    className: "text-sm font-medium text-slate-700 mb-2",
                    children: "จองเยี่ยมชม (ส่งข้อความ)"
                  }), /* @__PURE__ */ jsx(LeadForm, {
                    propertyId: property.displayId || property.propertyId || property.id,
                    propertyTitle: property.title,
                    propertyPrice: property.price,
                    isRental: property.isRental,
                    onSuccess: (m) => {
                      setToastMessage(m || "ส่งข้อมูลสำเร็จ");
                      setShowToast(true);
                    },
                    onError: () => {
                      setToastMessage("เกิดข้อผิดพลาด กรุณาลองใหม่");
                      setShowToast(true);
                    }
                  })]
                })
              }), /* @__PURE__ */ jsx(Suspense, {
                fallback: /* @__PURE__ */ jsx("div", {
                  className: "bg-white rounded-xl border p-6 min-h-[120px] animate-pulse"
                }),
                children: /* @__PURE__ */ jsx(NeighborhoodData$1, {
                  property
                })
              })]
            })
          })]
        })
      })
    }), /* @__PURE__ */ jsx(Toast, {
      message: toastMessage,
      isVisible: showToast,
      onClose: () => setShowToast(false),
      duration: 3e3
    })]
  });
});
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  clientLoader: clientLoader$1,
  default: _public_properties_$slug,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
const _public_p_$id = UNSAFE_withComponentProps(function PropertyRedirect() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    getPropertyByIdOnce(id).then((p) => {
      if (p) navigate(`/properties/${generatePropertySlug(p)}`, {
        replace: true
      });
      else navigate("/", {
        replace: true
      });
      setLoading(false);
    }).catch(() => {
      navigate("/", {
        replace: true
      });
      setLoading(false);
    });
  }, [id, navigate]);
  if (loading) return /* @__PURE__ */ jsx("div", {
    className: "min-h-screen flex items-center justify-center",
    children: /* @__PURE__ */ jsx("p", {
      className: "text-slate-500",
      children: "กำลังโหลด..."
    })
  });
  return null;
});
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _public_p_$id
}, Symbol.toStringTag, { value: "Module" }));
const NeighborhoodData = lazy(() => import("./NeighborhoodData-DN97J7Ie.js"));
function SharePage() {
  const { id: token } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const thumbnailContainerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function loadSharedProperty() {
      try {
        const shareLink = await getShareLinkByToken(token);
        if (shareLink) {
          if (isShareLinkExpired(shareLink)) {
            if (!cancelled) {
              setExpired(true);
              setProperty(null);
            }
            return;
          }
          const p = await getPropertyByIdOnce(shareLink.propertyId);
          if (!cancelled) setProperty(p);
          return;
        }
        const fallback = await getPropertyByIdOnce(token);
        if (!cancelled) setProperty(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSharedProperty();
    return () => {
      cancelled = true;
    };
  }, [token]);
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-white flex items-center justify-center", children: /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลด…" }) });
  }
  if (!property) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-white flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-4", children: expired ? "ลิงก์นี้หมดอายุแล้ว กรุณาให้เอเจนต์แชร์ลิงก์ใหม่" : "ไม่พบรายการนี้" }),
      /* @__PURE__ */ jsx(Link, { to: "/", className: "text-blue-900 font-medium hover:underline", children: "กลับหน้าแรก" })
    ] }) });
  }
  const loc = property.location || {};
  const imgs = property.images && property.images.length > 0 ? property.images : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"];
  const category = property?.category || (property?.isRental ? "rent" : "buy");
  const condition = property?.condition || property?.subStatus;
  const availability = property?.availability;
  const propertyIdText = property?.propertyId || "N/A";
  const priceText = formatPrice(property.price, property.isRental, property.showPrice);
  const locationText = property.locationDisplay && property.locationDisplay.trim() || [loc.subDistrict, loc.district, loc.province].filter(Boolean).join(", ") || "ไม่ระบุ";
  const getMapEmbedUrl = (mapUrl) => {
    const hasValidCoords = property.lat != null && property.lng != null && !isNaN(Number(property.lat)) && !isNaN(Number(property.lng));
    if (hasValidCoords) return `https://maps.google.com/maps?q=${property.lat},${property.lng}&output=embed`;
    if (!mapUrl) {
      return locationText !== "ไม่ระบุ" ? `https://maps.google.com/maps?q=${encodeURIComponent(locationText)}&output=embed` : null;
    }
    if (mapUrl.includes("<iframe")) {
      const match = mapUrl.match(/src="([^"]+)"/);
      if (match) return match[1];
    }
    if (mapUrl.includes("maps.app.goo.gl") || mapUrl.includes("goo.gl/maps")) return null;
    if (mapUrl.includes("/embed")) return mapUrl;
    if (mapUrl.includes("google.") && mapUrl.includes("/maps")) {
      let query2 = "";
      const coordMatch = mapUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) {
        query2 = `${coordMatch[1]},${coordMatch[2]}`;
      } else {
        const placeMatch = mapUrl.match(/place\/([^/?#]+)/);
        if (placeMatch) {
          query2 = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        } else {
          const searchMatch = mapUrl.match(/[?&]q=([^&]+)/);
          if (searchMatch) {
            query2 = decodeURIComponent(searchMatch[1]);
          } else {
            const pathSearchMatch = mapUrl.match(/\/search\/([^/?#]+)/);
            if (pathSearchMatch) {
              query2 = decodeURIComponent(pathSearchMatch[1].replace(/\+/g, " "));
            }
          }
        }
      }
      if (query2) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(query2)}&output=embed`;
      }
      if (locationText !== "ไม่ระบุ") {
        return `https://maps.google.com/maps?q=${encodeURIComponent(locationText)}&output=embed`;
      }
    }
    return null;
  };
  const mapEmbedUrl = getMapEmbedUrl(property.mapUrl);
  const isShortMapLink = property.mapUrl && (property.mapUrl.includes("maps.app.goo.gl") || property.mapUrl.includes("goo.gl/maps"));
  const pageTitle = `${property.title} | SPS Property Solution`;
  const shareDescription = `${property.title} - ${priceText} - ${locationText}`;
  const primaryImageRaw = imgs[0];
  const primaryImage = primaryImageRaw && primaryImageRaw.startsWith("http") ? primaryImageRaw : `https://spspropertysolution.com${primaryImageRaw || ""}`;
  const shareUrl = `https://spspropertysolution.com/share/${token}`;
  property ? `https://spspropertysolution.com${getShortPropertyPath(property)}` : "";
  const handleContextMenu = (e) => e.preventDefault();
  const handleCopyPropertyId = async () => {
    if (!property?.id) return;
    try {
      const urlToCopy = `https://spspropertysolution.com${getShortPropertyPath(property)}`;
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const minSwipeDistance = 50;
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      if (thumbnailContainerRef.current) {
        thumbnailContainerRef.current.scrollBy({ left: 200, behavior: "smooth" });
      }
    }
    if (isRightSwipe) {
      if (thumbnailContainerRef.current) {
        thumbnailContainerRef.current.scrollBy({ left: -200, behavior: "smooth" });
      }
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Helmet, { children: [
      /* @__PURE__ */ jsx("title", { children: pageTitle }),
      /* @__PURE__ */ jsx("meta", { name: "description", content: shareDescription }),
      /* @__PURE__ */ jsx("meta", { property: "og:title", content: pageTitle }),
      /* @__PURE__ */ jsx("meta", { property: "og:description", content: shareDescription }),
      /* @__PURE__ */ jsx("meta", { property: "og:url", content: shareUrl }),
      /* @__PURE__ */ jsx("meta", { property: "og:type", content: "website" }),
      /* @__PURE__ */ jsx("meta", { property: "og:image", content: primaryImage }),
      /* @__PURE__ */ jsx("meta", { name: "twitter:card", content: "summary_large_image" }),
      /* @__PURE__ */ jsx("meta", { name: "twitter:title", content: pageTitle }),
      /* @__PURE__ */ jsx("meta", { name: "twitter:description", content: shareDescription }),
      /* @__PURE__ */ jsx("meta", { name: "twitter:image", content: primaryImage })
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "share-page protected-content min-h-screen bg-white flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-y-auto",
        onContextMenu: handleContextMenu,
        children: [
          /* @__PURE__ */ jsx("div", { className: "share-page-watermark absolute inset-0 pointer-events-none", "aria-hidden": true }),
          /* @__PURE__ */ jsxs("div", { className: "w-full max-w-3xl relative z-10", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden", children: [
              /* @__PURE__ */ jsxs(ProtectedImageContainer, { propertyId: property.propertyId, className: "aspect-video relative bg-slate-100 select-none", children: [
                /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: imgs[galleryIndex],
                    alt: property.title,
                    className: "w-full h-full object-cover share-protected-image protected-image",
                    draggable: false
                  }
                ),
                /* @__PURE__ */ jsx("div", { className: "absolute inset-0 pointer-events-none share-image-watermark", "aria-hidden": true }),
                imgs.length > 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setGalleryIndex((prev) => prev === 0 ? imgs.length - 1 : prev - 1),
                      className: "absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition",
                      "aria-label": "รูปก่อนหน้า",
                      children: /* @__PURE__ */ jsx(ChevronLeft, { className: "h-5 w-5" })
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setGalleryIndex((prev) => prev === imgs.length - 1 ? 0 : prev + 1),
                      className: "absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition",
                      "aria-label": "รูปถัดไป",
                      children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-5 w-5" })
                    }
                  )
                ] })
              ] }),
              imgs.length > 1 && /* @__PURE__ */ jsx("div", { className: "px-4 py-3 border-b border-slate-100 bg-white", children: /* @__PURE__ */ jsx(
                "div",
                {
                  ref: thumbnailContainerRef,
                  className: "thumbnail-gallery flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 select-none",
                  style: {
                    touchAction: "pan-x",
                    WebkitOverflowScrolling: "touch",
                    cursor: "grab"
                  },
                  onTouchStart,
                  onTouchMove,
                  onTouchEnd,
                  children: imgs.map((img, i) => /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setGalleryIndex(i),
                      className: `shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition snap-start ${i === galleryIndex ? "border-blue-900" : "border-transparent"}`,
                      children: /* @__PURE__ */ jsx("img", { src: img, alt: "", width: 80, height: 56, loading: "lazy", decoding: "async", className: "w-full h-full object-cover protected-image", draggable: false })
                    },
                    `${img}-${i}`
                  ))
                }
              ) }),
              /* @__PURE__ */ jsxs("div", { className: "p-5 sm:p-8", children: [
                /* @__PURE__ */ jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-3", children: [
                  /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-1.5 bg-gray-100 rounded-md px-2 py-1", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-mono text-xs sm:text-sm text-slate-700", children: propertyIdText }),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: handleCopyPropertyId,
                        className: "inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 text-slate-600 transition",
                        title: "คัดลอกรหัสทรัพย์",
                        "aria-label": "คัดลอกรหัสทรัพย์",
                        children: copied ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 text-emerald-700" }) : /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: `inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${category === "rent" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`, children: category === "rent" ? "เช่า" : "ซื้อ" }),
                  category === "rent" ? /* @__PURE__ */ jsx("span", { className: `inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${availability === "available" || availability === "ว่าง" ? "bg-green-700 text-white" : "bg-red-700 text-white"}`, children: availability === "available" || availability === "ว่าง" ? "ว่าง" : "ไม่ว่าง" }) : condition ? /* @__PURE__ */ jsx("span", { className: `inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${condition === "มือ 1" ? "bg-blue-900 text-white" : "bg-slate-500 text-white"}`, children: condition }) : null
                ] }) }),
                /* @__PURE__ */ jsx("h1", { className: "text-xl sm:text-2xl font-bold text-blue-900 mb-3 line-clamp-2", children: property.title }),
                /* @__PURE__ */ jsx("p", { className: "text-2xl sm:text-3xl font-bold text-yellow-900 mb-4", children: priceText }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2 text-slate-600 mb-4", children: [
                  /* @__PURE__ */ jsx(MapPin, { className: "h-5 w-5 shrink-0 text-blue-900 mt-0.5" }),
                  /* @__PURE__ */ jsx("span", { className: "text-sm sm:text-base", children: locationText })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4 pb-4 border-b border-slate-100", children: [
                  property.bedrooms != null && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-slate-600", children: [
                    /* @__PURE__ */ jsx(Bed, { className: "h-4 w-4 text-blue-900" }),
                    /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                      property.bedrooms,
                      " ห้องนอน"
                    ] })
                  ] }),
                  property.bathrooms != null && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-slate-600", children: [
                    /* @__PURE__ */ jsx(Bath, { className: "h-4 w-4 text-blue-900" }),
                    /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                      property.bathrooms,
                      " ห้องน้ำ"
                    ] })
                  ] }),
                  property.area && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-slate-600", children: [
                    /* @__PURE__ */ jsx(Maximize2, { className: "h-4 w-4 text-blue-900" }),
                    /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                      property.area != null && property.area > 0 ? (Number(property.area) / 4).toFixed(1) : "",
                      " ตร.ว."
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4", children: /* @__PURE__ */ jsx("p", { className: "text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap", style: { fontFamily: "Prompt, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" }, children: property.description || "-" }) }),
                /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(
                  Suspense,
                  {
                    fallback: /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 p-6 shadow-sm min-h-[120px] animate-pulse", "aria-hidden": "true" }),
                    children: /* @__PURE__ */ jsx(NeighborhoodData, { property })
                  }
                ) }),
                /* @__PURE__ */ jsx("div", { className: "mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm", children: mapEmbedUrl ? /* @__PURE__ */ jsx("div", { className: "aspect-video", children: /* @__PURE__ */ jsx(
                  "iframe",
                  {
                    title: "แผนที่โครงการ",
                    src: mapEmbedUrl,
                    className: "w-full h-full border-0",
                    allowFullScreen: true,
                    loading: "lazy",
                    referrerPolicy: "no-referrer-when-downgrade"
                  }
                ) }) : isShortMapLink ? /* @__PURE__ */ jsxs("div", { className: "aspect-video flex flex-col items-center justify-center gap-3 bg-slate-50 px-6", children: [
                  /* @__PURE__ */ jsx(MapPin, { className: "h-10 w-10 text-blue-600" }),
                  /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-center text-sm", children: "ลิงก์สั้นไม่รองรับการฝังแผนที่ในหน้า" })
                ] }) : /* @__PURE__ */ jsx("div", { className: "aspect-video flex items-center justify-center bg-slate-100 text-slate-500", children: "ไม่สามารถแสดงแผนที่ได้" }) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "text-center text-slate-500 text-xs sm:text-sm mt-6 flex items-center justify-center gap-2", children: [
              /* @__PURE__ */ jsx(ShieldAlert, { className: "h-4 w-4" }),
              "ข้อมูลนี้เป็นลิขสิทธิ์ของ SPS Property Solution ห้ามมิให้ทำซ้ำหรือเผยแพร่โดยไม่ได้รับอนุญาต"
            ] })
          ] })
        ]
      }
    )
  ] });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: SharePage
}, Symbol.toStringTag, { value: "Module" }));
const MAPS_EMBED_URL = "https://www.google.com/maps?q=%E0%B8%95.%E0%B8%AB%E0%B8%99%E0%B8%AD%E0%B8%87%E0%B8%AB%E0%B8%87%E0%B8%A9%E0%B8%B2+%E0%B8%AD.%E0%B8%9E%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%AD%E0%B8%87+%E0%B8%88.%E0%B8%8A%E0%B8%A5%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5&output=embed";
const THANK_YOU_MESSAGE = "ขอบคุณที่ไว้วางใจ SPS Property Solution ทางทีมงานได้รับข้อมูลของท่านเรียบร้อยแล้ว และจะติดต่อกลับโดยเร็วที่สุด";
function validatePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && /^0\d{9}$/.test(digits);
}
function ContactItem({ href, icon: Icon, children, className = "" }) {
  const base = "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200";
  if (href) {
    return /* @__PURE__ */ jsxs(
      "a",
      {
        href,
        target: href.startsWith("http") ? "_blank" : void 0,
        rel: "noopener noreferrer",
        className: `${base} ${className}`,
        children: [
          /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5 shrink-0" }),
          /* @__PURE__ */ jsx("span", { className: "font-medium text-sm", children })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs("div", { className: `${base} ${className}`, children: [
    /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5 shrink-0" }),
    /* @__PURE__ */ jsx("span", { className: "text-sm", children })
  ] });
}
function Contact() {
  const baseId = useId();
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "กรุณากรอกชื่อ";
    if (!form.phone.trim()) newErrors.phone = "กรุณากรอกเบอร์โทร";
    else if (!validatePhone(form.phone.trim())) newErrors.phone = "เบอร์โทรต้องเป็นตัวเลข 10 หลัก (เช่น 0812345678)";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setIsLoading(true);
    try {
      await createInquiry({
        name: form.name.trim(),
        phone: form.phone.trim(),
        message: form.message.trim() || ""
      });
      setShowThankYou(true);
    } catch (err) {
      console.error(err);
      setErrors({ submit: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCloseThankYou = () => {
    setShowThankYou(false);
    setForm({ name: "", phone: "", message: "" });
    setErrors({});
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Helmet, { children: /* @__PURE__ */ jsx("title", { children: "ติดต่อเรา | SPS Property Solution - บ้านคอนโดสวย อมตะซิตี้ ชลบุรี" }) }),
    /* @__PURE__ */ jsxs(PageLayout, { heroTitle: "ติดต่อเรา", heroSubtitle: "บ้านคอนโดสวย อมตะซิตี้ ชลบุรี", searchComponent: null, children: [
      /* @__PURE__ */ jsx("div", { className: "py-12 md:py-16 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 min-h-screen", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
              /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-blue-900", children: "SPS Property Solutions" }),
              /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm mt-1", children: "ผู้เชี่ยวชาญด้านอสังหาริมทรัพย์ อมตะซิตี้ ชลบุรี" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 py-1", children: [
                /* @__PURE__ */ jsx(MapPin, { className: "h-5 w-5 text-blue-900 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-800 text-sm", children: "ที่อยู่" }),
                  /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm mt-0.5", children: "103/162 หมู่ 5 ตำบลหนองหงษ์, Phanthong, Chonburi 20160" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 py-1", children: [
                /* @__PURE__ */ jsx(Globe2, { className: "h-5 w-5 text-blue-900 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-800 text-sm", children: "พื้นที่บริการ" }),
                  /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm mt-0.5", children: "กรุงเทพฯ, ชลบุรี, ระยอง และพัทยา" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "pt-2 space-y-2", children: [
                /* @__PURE__ */ jsx(
                  ContactItem,
                  {
                    href: "mailto:propertysommai@gmail.com",
                    icon: Mail,
                    className: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900",
                    children: "propertysommai@gmail.com"
                  }
                ),
                /* @__PURE__ */ jsx(
                  ContactItem,
                  {
                    href: "https://www.facebook.com/houseamata",
                    icon: Facebook,
                    className: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900",
                    children: "Facebook: houseamata"
                  }
                ),
                /* @__PURE__ */ jsx(
                  ContactItem,
                  {
                    icon: Clock,
                    className: "bg-slate-50 border-slate-200 text-slate-600 cursor-default",
                    children: "เปิดทำการตลอดเวลา (24/7)"
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "rounded-2xl overflow-hidden border border-slate-100 shadow-sm", children: /* @__PURE__ */ jsx(
            "iframe",
            {
              title: "แผนที่ ต.หนองหงษ์ อ.พานทอง จ.ชลบุรี",
              src: MAPS_EMBED_URL,
              width: "100%",
              height: "280",
              style: { border: 0 },
              allowFullScreen: true,
              loading: "lazy",
              referrerPolicy: "no-referrer-when-downgrade"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-blue-900", children: "ส่งข้อความถึงเรา" }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-sm mt-1", children: "กรอกข้อมูลด้านล่าง ทีมงานจะติดต่อกลับโดยเร็ว" })
          ] }),
          /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", noValidate: true, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("label", { htmlFor: `${baseId}-name`, className: "block text-sm font-medium text-slate-700 mb-1.5", children: [
                "ชื่อ–นามสกุล ",
                /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
              ] }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: `${baseId}-name`,
                  type: "text",
                  name: "name",
                  value: form.name,
                  onChange: handleChange,
                  placeholder: "กรอกชื่อ-นามสกุล",
                  className: `w-full px-4 py-3 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition ${errors.name ? "border-red-400 bg-red-50/30" : "border-slate-200"}`
                }
              ),
              errors.name && /* @__PURE__ */ jsxs("p", { className: "mt-1.5 text-xs text-red-500 flex items-center gap-1", children: [
                /* @__PURE__ */ jsx("span", { children: "⚠" }),
                " ",
                errors.name
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("label", { htmlFor: `${baseId}-phone`, className: "block text-sm font-medium text-slate-700 mb-1.5", children: [
                "เบอร์โทรศัพท์ ",
                /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
              ] }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: `${baseId}-phone`,
                  type: "tel",
                  name: "phone",
                  value: form.phone,
                  onChange: handleChange,
                  placeholder: "เช่น 0812345678",
                  inputMode: "numeric",
                  className: `w-full px-4 py-3 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition ${errors.phone ? "border-red-400 bg-red-50/30" : "border-slate-200"}`
                }
              ),
              errors.phone && /* @__PURE__ */ jsxs("p", { className: "mt-1.5 text-xs text-red-500 flex items-center gap-1", children: [
                /* @__PURE__ */ jsx("span", { children: "⚠" }),
                " ",
                errors.phone
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("label", { htmlFor: `${baseId}-message`, className: "block text-sm font-medium text-slate-700 mb-1.5", children: [
                "ข้อความ ",
                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-normal", children: "(ถ้ามี)" })
              ] }),
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  id: `${baseId}-message`,
                  name: "message",
                  value: form.message,
                  onChange: handleChange,
                  rows: 4,
                  placeholder: "ระบุคำถามหรือความต้องการ...",
                  className: "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition"
                }
              )
            ] }),
            errors.submit && /* @__PURE__ */ jsx("p", { className: "text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2", children: errors.submit }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "submit",
                disabled: isLoading,
                className: "w-full py-3.5 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 hover:shadow-md disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2 text-sm",
                children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx("span", { className: "inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                  "กำลังส่ง…"
                ] }) : "ส่งข้อความ"
              }
            )
          ] })
        ] }) })
      ] }) }) }),
      showThankYou && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "fixed inset-0 bg-black/50 z-50",
            onClick: handleCloseThankYou,
            "aria-hidden": "true"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none", children: /* @__PURE__ */ jsx("div", { className: "bg-white rounded-2xl shadow-xl max-w-md w-full p-8 pointer-events-auto", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsx(CheckCircle2, { className: "h-8 w-8 text-emerald-600" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-slate-900 mb-2", children: "ส่งข้อความสำเร็จ!" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-sm leading-relaxed mb-6", children: THANK_YOU_MESSAGE }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleCloseThankYou,
              className: "w-full py-3 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 transition",
              children: "ปิด"
            }
          )
        ] }) }) })
      ] })
    ] })
  ] });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Contact
}, Symbol.toStringTag, { value: "Module" }));
const OCCUPATIONS = [
  { value: "", label: "เลือกอาชีพ" },
  { value: "government", label: "ข้าราชการ" },
  { value: "employee", label: "พนักงานประจำ" },
  { value: "business", label: "ธุรกิจส่วนตัว" },
  { value: "freelance", label: "รับจ้างอิสระ" }
];
const CREDIT_HISTORY = [
  { value: "", label: "เลือกประวัติเครดิต" },
  { value: "normal", label: "ปกติดี" },
  { value: "delayed", label: "เคยล่าช้า" },
  { value: "bureau_closed", label: "ติดบูโร - ปิดแล้ว" },
  { value: "bureau_open", label: "ติดบูโร - ยังไม่ปิด" }
];
const LINE_URL = "https://line.me/R/ti/p/@sps-property";
function LoanService() {
  const formSectionRef = useRef(null);
  const navigate = useNavigate();
  const [debtAmount, setDebtAmount] = useState("");
  const [currentRate, setCurrentRate] = useState(20);
  const [homeRate, setHomeRate] = useState(4);
  const [form, setForm] = useState({
    nickname: "",
    phone: "",
    lineId: "",
    occupation: "",
    income: "",
    monthlyDebt: "",
    creditHistory: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalScenario, setModalScenario] = useState(null);
  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const debtNum = parseFloat(String(debtAmount).replace(/,/g, "")) || 0;
  const minPaymentRate = 0.05;
  const currentMonthly = debtNum * (currentRate / 100 / 12) + debtNum * minPaymentRate;
  const homeMonthly = debtNum * (homeRate / 100 / 12) * (1 + homeRate / 100 / 12) ** 360 / ((1 + homeRate / 100 / 12) ** 360 - 1);
  const savingsPerMonth = Math.max(0, Math.round(currentMonthly - homeMonthly));
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const validateForm = () => {
    const err = {};
    if (!form.nickname.trim()) err.nickname = "กรุณากรอกชื่อเล่น";
    if (!form.phone.trim()) err.phone = "กรุณากรอกเบอร์โทร";
    else if (!/^0\d{9}$/.test(form.phone.replace(/\D/g, ""))) err.phone = "เบอร์โทรต้องเป็น 10 หลัก";
    if (!form.occupation) err.occupation = "กรุณาเลือกอาชีพ";
    if (!form.income.trim()) err.income = "กรุณากรอกรายได้";
    else if (isNaN(parseFloat(form.income)) || parseFloat(form.income) < 0) err.income = "กรุณากรอกตัวเลข";
    if (!form.monthlyDebt.trim()) form.monthlyDebt = "0";
    if (!form.creditHistory) err.creditHistory = "กรุณาเลือกประวัติเครดิต";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };
  const getScenario = () => {
    const income = parseFloat(form.income) || 0;
    const debt = parseFloat(form.monthlyDebt) || 0;
    const credit = form.creditHistory;
    const isBureauBad = credit === "bureau_open" || credit === "bureau_closed" || credit === "delayed";
    const isLowIncome = income < 15e3;
    if (income >= 25e3 && !isBureauBad && debt > 0) {
      return "A";
    }
    if (isLowIncome || isBureauBad) {
      return "B";
    }
    return "A";
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await createLoanRequest({
        nickname: form.nickname.trim(),
        phone: form.phone.trim(),
        lineId: form.lineId.trim(),
        occupation: form.occupation,
        income: form.income,
        monthlyDebt: form.monthlyDebt || "0",
        creditHistory: form.creditHistory
      });
      const scenario = getScenario();
      setModalScenario(scenario);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setFormErrors({ submit: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setModalScenario(null);
  };
  const handleGoInstallment = () => {
    handleCloseModal();
    navigate("/properties?listingType=rent&subListingType=installment_only");
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Helmet, { children: [
      /* @__PURE__ */ jsx("title", { children: "ปลดล็อคชีวิตการเงินด้วยอสังหาฯ | SPS Property Solution" }),
      /* @__PURE__ */ jsx("meta", { name: "description", content: "เปลี่ยนหนี้บัตรหลายใบเป็นบ้านหลังเดียว ผ่อนถูกลงครึ่งต่อครึ่ง ปิดหนี้ให้ก่อน ไม่ผ่านคืนเงินจอง" })
    ] }),
    /* @__PURE__ */ jsx(PageLayout, { showHero: false, children: /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-slate-50", children: [
      /* @__PURE__ */ jsxs("section", { className: "relative bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-white overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 opacity-20", style: { backgroundImage: "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920')", backgroundSize: "cover" } }),
        /* @__PURE__ */ jsxs("div", { className: "relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24", children: [
          /* @__PURE__ */ jsxs("h1", { className: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-6 drop-shadow", children: [
            "เปลี่ยนหนี้บัตรหลายใบ...",
            /* @__PURE__ */ jsx("br", {}),
            "ให้เป็นบ้านหลังเดียว ผ่อนถูกลงครึ่งต่อครึ่ง!"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl", children: "ติดบูโร? ภาระเยอะ? กู้ไม่ผ่าน? อย่าเพิ่งท้อ เราช่วยปิดหนี้ให้ก่อนยื่นกู้ หรือเลือกผ่อนตรงกับเจ้าของได้ทันที" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-4 sm:gap-6 mb-10", children: [
            { icon: Check, text: "ปิดหนี้ให้ก่อน" },
            { icon: Check, text: "ดันเคสทุกอาชีพ" },
            { icon: Check, text: "ไม่ผ่านคืนเงินจอง" }
          ].map(({ icon: Icon, text }) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20", children: /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5 text-emerald-400" }) }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold", children: text })
          ] }, text)) }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: scrollToForm,
              className: "inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
              children: [
                /* @__PURE__ */ jsx(Calculator, { className: "h-6 w-6" }),
                "ประเมินวงเงิน & ทางออกแก้หนี้ (ฟรี)",
                /* @__PURE__ */ jsx(ChevronDown, { className: "h-5 w-5" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("section", { className: "py-12 sm:py-16 bg-white border-b border-slate-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-8", children: [
          /* @__PURE__ */ jsx(Calculator, { className: "h-8 w-8 text-blue-600" }),
          /* @__PURE__ */ jsx("h2", { className: "text-2xl sm:text-3xl font-bold text-blue-900", children: "คำนวณเห็นภาพ: รวมหนี้แล้วเหลือเท่าไหร่?" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10", children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border-2 border-slate-200 p-6 sm:p-8 bg-slate-50", children: [
            /* @__PURE__ */ jsxs("h3", { className: "text-lg font-bold text-slate-700 mb-4 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(CreditCard, { className: "h-5 w-5 text-amber-600" }),
              "จ่ายขั้นต่ำปัจจุบัน"
            ] }),
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-600 mb-2", children: "ยอดหนี้บัตร/สินเชื่อ (บาท)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                inputMode: "numeric",
                value: debtAmount,
                onChange: (e) => setDebtAmount(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")),
                placeholder: "เช่น 500000",
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              }
            ),
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-600 mt-4 mb-2", children: "ดอกเบี้ยประมาณ (% ต่อปี)" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                value: currentRate,
                onChange: (e) => setCurrentRate(Number(e.target.value)),
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500",
                children: [18, 20, 22, 25].map((r) => /* @__PURE__ */ jsxs("option", { value: r, children: [
                  r,
                  "%"
                ] }, r))
              }
            ),
            /* @__PURE__ */ jsxs("p", { className: "mt-4 text-slate-600 text-sm", children: [
              "ผ่อนขั้นต่ำเดือนละประมาณ ",
              /* @__PURE__ */ jsxs("span", { className: "font-bold text-amber-700", children: [
                currentMonthly.toLocaleString("th-TH", { maximumFractionDigits: 0 }),
                " บาท"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border-2 border-emerald-200 p-6 sm:p-8 bg-emerald-50/50", children: [
            /* @__PURE__ */ jsxs("h3", { className: "text-lg font-bold text-slate-700 mb-4 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Home$1, { className: "h-5 w-5 text-emerald-600" }),
              "เมื่อรวมหนี้เป็นก้อนเดียว (กู้บ้าน)"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-sm mb-4", children: "ดอกเบี้ยบ้านประมาณ 3-5% ผ่อนยาว 30 ปี" }),
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-600 mb-2", children: "อัตราดอกเบี้ยบ้าน (% ต่อปี)" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                value: homeRate,
                onChange: (e) => setHomeRate(Number(e.target.value)),
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500",
                children: [3, 4, 5].map((r) => /* @__PURE__ */ jsxs("option", { value: r, children: [
                  r,
                  "%"
                ] }, r))
              }
            ),
            /* @__PURE__ */ jsxs("p", { className: "mt-4 text-slate-600 text-sm", children: [
              "ผ่อนบ้านเดือนละประมาณ ",
              /* @__PURE__ */ jsxs("span", { className: "font-bold text-emerald-700", children: [
                homeMonthly.toLocaleString("th-TH", { maximumFractionDigits: 0 }),
                " บาท"
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 sm:p-8 text-white text-center", children: [
          /* @__PURE__ */ jsx("p", { className: "text-lg sm:text-xl font-medium mb-2", children: "หยุดจ่ายดอกเบี้ยแพงๆ! รวมหนี้วันนี้ มีเงินเหลือไปแต่งบ้านเดือนละ" }),
          /* @__PURE__ */ jsxs("p", { className: "text-3xl sm:text-4xl md:text-5xl font-extrabold drop-shadow", children: [
            savingsPerMonth.toLocaleString("th-TH"),
            " บาท"
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("section", { ref: formSectionRef, className: "py-12 sm:py-16 bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50", children: /* @__PURE__ */ jsxs("div", { className: "max-w-2xl mx-auto px-4 sm:px-6 lg:px-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-8", children: [
          /* @__PURE__ */ jsx(FileText, { className: "h-8 w-8 text-blue-600" }),
          /* @__PURE__ */ jsx("h2", { className: "text-2xl sm:text-3xl font-bold text-blue-900", children: "เช็คโอกาสกู้ & รับคำปรึกษาส่วนตัว" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-8", children: "ข้อมูลปลอดภัย 100% ใช้เพื่อวิเคราะห์โอกาสกู้และติดต่อกลับเท่านั้น" }),
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6", children: [
          formErrors.submit && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm", children: [
            /* @__PURE__ */ jsx(AlertCircle, { className: "h-5 w-5 shrink-0" }),
            formErrors.submit
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(User, { className: "h-4 w-4" }),
              " ชื่อเล่น"
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                name: "nickname",
                value: form.nickname,
                onChange: handleFormChange,
                placeholder: "เช่น ปุ่ม",
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
              }
            ),
            formErrors.nickname && /* @__PURE__ */ jsx("p", { className: "mt-1 text-red-600 text-sm", children: formErrors.nickname })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4" }),
              " เบอร์โทร"
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "tel",
                name: "phone",
                value: form.phone,
                onChange: handleFormChange,
                placeholder: "0812345678",
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base",
                inputMode: "numeric"
              }
            ),
            formErrors.phone && /* @__PURE__ */ jsx("p", { className: "mt-1 text-red-600 text-sm", children: formErrors.phone })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(MessageCircle, { className: "h-4 w-4" }),
              " Line ID"
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                name: "lineId",
                value: form.lineId,
                onChange: handleFormChange,
                placeholder: "เช่น @yourline",
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Briefcase, { className: "h-4 w-4" }),
              " อาชีพ"
            ] }),
            /* @__PURE__ */ jsx(
              "select",
              {
                name: "occupation",
                value: form.occupation,
                onChange: handleFormChange,
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base",
                children: OCCUPATIONS.map((o) => /* @__PURE__ */ jsx("option", { value: o.value, children: o.label }, o.value))
              }
            ),
            formErrors.occupation && /* @__PURE__ */ jsx("p", { className: "mt-1 text-red-600 text-sm", children: formErrors.occupation })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Wallet, { className: "h-4 w-4" }),
              " รายได้รวม (บาท/เดือน)"
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                name: "income",
                value: form.income,
                onChange: handleFormChange,
                placeholder: "เช่น 25000",
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base",
                inputMode: "numeric"
              }
            ),
            formErrors.income && /* @__PURE__ */ jsx("p", { className: "mt-1 text-red-600 text-sm", children: formErrors.income })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(DollarSign, { className: "h-4 w-4" }),
              " ภาระหนี้ต่อเดือน (บาท)"
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                name: "monthlyDebt",
                value: form.monthlyDebt,
                onChange: handleFormChange,
                placeholder: "เช่น 8000",
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base",
                inputMode: "numeric"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(AlertCircle, { className: "h-4 w-4" }),
              " ประวัติเครดิต"
            ] }),
            /* @__PURE__ */ jsx(
              "select",
              {
                name: "creditHistory",
                value: form.creditHistory,
                onChange: handleFormChange,
                className: "w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base",
                children: CREDIT_HISTORY.map((c) => /* @__PURE__ */ jsx("option", { value: c.value, children: c.label }, c.value))
              }
            ),
            formErrors.creditHistory && /* @__PURE__ */ jsx("p", { className: "mt-1 text-red-600 text-sm", children: formErrors.creditHistory })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: isSubmitting,
              className: "w-full py-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed",
              children: isSubmitting ? "กำลังส่ง…" : "ส่งข้อมูลรับคำปรึกษา"
            }
          )
        ] })
      ] }) }),
      showModal && modalScenario && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: handleCloseModal,
            className: "absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-600",
            "aria-label": "ปิด",
            children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" })
          }
        ),
        modalScenario === "A" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "flex justify-center mb-4", children: /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-8 w-8 text-emerald-600" }) }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-blue-900 text-center mb-2", children: "ยินดีด้วย! เครดิตคุณดีพอที่จะล้างไพ่หนี้สินได้!" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-center mb-6", children: "เราสามารถดันเคสปิดหนี้บัตรให้คุณได้ รวมเป็นก้อนเดียวผ่อนบ้าน สบายกว่าเดิมเยอะ" }),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: LINE_URL,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "block w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-center transition-colors",
              children: "สนใจโปรเจกต์ปิดหนี้ (แอดไลน์เจ้าหน้าที่)"
            }
          )
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "flex justify-center mb-4", children: /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(Home$1, { className: "h-8 w-8 text-amber-600" }) }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-blue-900 text-center mb-2", children: "กู้ธนาคารอาจเหนื่อย... แต่คุณมีบ้านได้แน่นอน!" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-center mb-6", children: "ไม่ต้องง้อแบงค์! เรามีโครงการผ่อนตรงกับเจ้าของ (Rent-to-Own) ไม่เช็คบูโร หิ้วกระเป๋าเข้าอยู่ได้เลย" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleGoInstallment,
              className: "w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold transition-colors",
              children: "ดูบ้านผ่อนตรง (เข้าอยู่ได้เลย)"
            }
          )
        ] })
      ] }) })
    ] }) })
  ] });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LoanService
}, Symbol.toStringTag, { value: "Module" }));
async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    maxSizeMB = 2
  } = options;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        if (typeof document === "undefined") {
          resolve(file);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }
            const sizeMB = blob.size / (1024 * 1024);
            if (sizeMB > maxSizeMB && quality > 0.5) {
              const newQuality = Math.max(0.5, quality - 0.1);
              compressImage(file, { maxWidth, maxHeight, quality: newQuality, maxSizeMB }).then(resolve).catch(reject);
              return;
            }
            const originalName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
            const newFileName = `${originalName}.webp`;
            const compressedFile = new File([blob], newFileName, {
              type: "image/webp",
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
async function compressImages(files, options = {}) {
  const results = await Promise.all(
    files.map((file) => compressImage(file, options))
  );
  return results;
}
const CATEGORIES = [
  { value: "บ้านเดี่ยว", label: "บ้านเดี่ยว" },
  { value: "คอนโดมิเนียม", label: "คอนโดมิเนียม" },
  { value: "ทาวน์โฮม", label: "ทาวน์โฮม" },
  { value: "วิลล่า", label: "วิลล่า" },
  { value: "บ้านเช่า", label: "บ้านเช่า" }
];
const SUGGESTED_TAGS = [
  "บ้านเดี่ยว",
  "คอนโด",
  "ใกล้นิคมอมตะซิตี้",
  "ผ่อนตรง",
  "พร้อมอยู่",
  "พานทอง",
  "ชลบุรี"
];
function PostProperty() {
  const navigate = useNavigate();
  const { user } = usePublicAuth();
  const { settings } = useSystemSettings();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: "",
    type: "คอนโดมิเนียม",
    price: "",
    area: "",
    bedrooms: 2,
    bathrooms: 1,
    locationDisplay: "",
    location: { province: "", district: "", subDistrict: "" },
    description: "",
    images: [],
    tags: [],
    contactName: "",
    contactPhone: "",
    contactLineId: "",
    isRental: false,
    directInstallment: false,
    hotDeal: false,
    acceptedTerms: false
  });
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const updateForm = (partial) => setForm((prev) => ({ ...prev, ...partial }));
  const filteredTags = SUGGESTED_TAGS.filter(
    (tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !form.tags.includes(tag)
  );
  const addTag = (tag) => {
    if (!form.tags.includes(tag) && form.tags.length < 10) {
      updateForm({ tags: [...form.tags, tag] });
      setTagInput("");
      setShowTagSuggestions(false);
    }
  };
  const removeTag = (tagToRemove) => {
    updateForm({ tags: form.tags.filter((tag) => tag !== tagToRemove) });
  };
  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (previewFiles.length + files.length > 10) {
      setError("อัปโหลดได้สูงสุด 10 รูป");
      return;
    }
    setUploadingImages(true);
    try {
      const compressed = await compressImages(files, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 2
      });
      const newPreviews = compressed.map((file) => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setPreviewFiles((prev) => [...prev, ...newPreviews]);
    } catch (err) {
      console.error("Error compressing:", err);
      setError("เกิดข้อผิดพลาดในการบีบอัดรูปภาพ");
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  };
  const removeImage = (index) => {
    URL.revokeObjectURL(previewFiles[index].preview);
    setPreviewFiles(previewFiles.filter((_, i) => i !== index));
  };
  const validateStep = (stepNum) => {
    if (stepNum === 1) {
      if (!form.title.trim()) {
        setError("กรุณากรอกชื่อประกาศ");
        return false;
      }
      if (!form.price || Number(form.price) <= 0) {
        setError("กรุณากรอกราคาที่ถูกต้อง");
        return false;
      }
      if (!form.locationDisplay.trim()) {
        setError("กรุณาเลือกพื้นที่");
        return false;
      }
    }
    if (stepNum === 3) {
      if (!form.contactName.trim()) {
        setError("กรุณากรอกชื่อผู้ติดต่อ");
        return false;
      }
      if (!form.contactPhone.trim()) {
        setError("กรุณากรอกเบอร์โทรศัพท์");
        return false;
      }
      if (!form.acceptedTerms) {
        setError("กรุณายอมรับเงื่อนไขก่อนส่งประกาศ");
        return false;
      }
    }
    setError(null);
    return true;
  };
  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };
  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    if (!settings.allowPublicRegistration) {
      setError("ขณะนี้ระบบปิดรับการลงประกาศชั่วคราว กรุณาติดต่อเจ้าหน้าที่");
      return;
    }
    if (user?.uid) {
      try {
        const functions = getFunctions(publicApp, "asia-southeast1");
        const checkLimit = httpsCallable(functions, "checkPropertyLimit");
        const { data: data2 } = await checkLimit();
        if (!data2.allowed) {
          setError(`คุณมีประกาศในระบบครบ ${data2.limit} รายการแล้ว ไม่สามารถเพิ่มได้อีก`);
          return;
        }
      } catch {
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      let imageUrls = [];
      if (previewFiles.length > 0) {
        const tempId = `temp_${Date.now()}`;
        for (const { file } of previewFiles) {
          const url = await uploadPendingPropertyImage(file, tempId);
          imageUrls.push(url);
        }
      }
      const propertyPayload = {
        title: form.title.trim(),
        type: form.type,
        price: Number(form.price) || 0,
        area: Number(form.area) || 0,
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        location: form.location,
        locationDisplay: form.locationDisplay.trim(),
        description: form.description.trim(),
        images: imageUrls,
        tags: form.tags,
        agentContact: {
          name: form.contactName.trim(),
          phone: form.contactPhone.trim(),
          lineId: form.contactLineId.trim()
        },
        isRental: form.isRental || form.type === "บ้านเช่า",
        directInstallment: form.directInstallment,
        hotDeal: form.hotDeal,
        userId: user?.uid || null,
        createdBy: user?.uid || null
      };
      if (settings.autoApproveProperties) {
        await createProperty({ ...propertyPayload, status: "available" });
      } else {
        await createPendingProperty(propertyPayload);
      }
      setSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 5e3);
    } catch (err) {
      console.error("Error submitting:", err);
      setError("เกิดข้อผิดพลาดในการส่งประกาศ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };
  if (success) {
    return /* @__PURE__ */ jsx(PageLayout, { heroTitle: "ส่งประกาศสำเร็จ", heroSubtitle: "", showHero: false, children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-lg p-8 max-w-md text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsx(Check, { className: "h-8 w-8 text-green-600" }) }),
      /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-blue-900 mb-4", children: "ส่งประกาศสำเร็จ!" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-6", children: settings.autoApproveProperties ? "ประกาศของคุณได้รับการเผยแพร่แล้ว" : "ระบบได้รับข้อมูลแล้ว เจ้าหน้าที่จะตรวจสอบและอนุมัติภายใน 24 ชม." }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => navigate("/"),
          className: "px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition",
          children: "กลับหน้าหลัก"
        }
      )
    ] }) }) });
  }
  if (!settings.allowPublicRegistration) {
    return /* @__PURE__ */ jsx(PageLayout, { heroTitle: "ลงประกาศฟรี", heroSubtitle: "", showHero: false, children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-lg p-8 max-w-md text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsx(Lock, { className: "h-8 w-8 text-slate-500" }) }),
      /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-slate-800 mb-3", children: "ปิดรับประกาศชั่วคราว" }),
      /* @__PURE__ */ jsxs("p", { className: "text-slate-500 mb-6", children: [
        "ขณะนี้ระบบไม่เปิดรับการลงประกาศใหม่",
        /* @__PURE__ */ jsx("br", {}),
        "กรุณาติดต่อเจ้าหน้าที่ผ่านหน้าติดต่อเรา"
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/contact", className: "px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition inline-block", children: "ไปหน้าติดต่อเรา" })
    ] }) }) });
  }
  return /* @__PURE__ */ jsx(PageLayout, { heroTitle: "ลงประกาศฟรี", heroSubtitle: "ฟอร์มลงประกาศขาย-เช่าอสังหาฯ", showHero: true, children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-slate-50 py-12 px-4 pb-20", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-10 gap-8", children: [
    /* @__PURE__ */ jsx("div", { className: "lg:col-span-7", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-lg overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-gradient-to-r from-blue-50 via-blue-50/80 to-blue-50 px-6 sm:px-8 py-6 border-b border-blue-200", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between w-full mb-4", children: [1, 2, 3].map((s) => {
          const isActive = step === s;
          const isCompleted = step > s;
          return /* @__PURE__ */ jsxs("div", { className: "flex-1 flex items-center", children: [
            /* @__PURE__ */ jsx("div", { className: "relative flex flex-col items-center flex-1", children: /* @__PURE__ */ jsx(
              "div",
              {
                className: `w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 relative z-10 ${isActive ? "bg-blue-900 text-white shadow-lg shadow-blue-900/40 ring-4 ring-blue-900/20" : isCompleted ? "bg-blue-900 text-white shadow-md" : "bg-gray-200 text-gray-600"}`,
                children: isCompleted ? /* @__PURE__ */ jsx(Check, { className: "h-6 w-6 text-white" }) : /* @__PURE__ */ jsx("span", { className: "text-base", children: s })
              }
            ) }),
            s < 3 && /* @__PURE__ */ jsx(
              "div",
              {
                className: `flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${isCompleted || step > s ? "bg-blue-900" : "bg-gray-200"}`
              }
            )
          ] }, s);
        }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between w-full text-sm", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `text-center transition-all ${step >= 1 ? step === 1 ? "font-bold text-blue-900" : "font-semibold text-blue-900" : "font-normal text-gray-400"}`,
              children: "ข้อมูลทรัพย์สิน"
            }
          ),
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `text-center transition-all ${step >= 2 ? step === 2 ? "font-bold text-blue-900" : "font-semibold text-blue-900" : "font-normal text-gray-400"}`,
              children: "รูปภาพ"
            }
          ),
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `text-center transition-all ${step >= 3 ? step === 3 ? "font-bold text-blue-900" : "font-semibold text-blue-900" : "font-normal text-gray-400"}`,
              children: "ข้อมูลติดต่อ"
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 sm:p-8", children: [
        error && /* @__PURE__ */ jsxs("div", { className: "mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3", children: [
          /* @__PURE__ */ jsx(AlertCircle, { className: "h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsx("p", { className: "text-red-800 flex-1", children: error }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setError(null),
              className: "p-1 hover:bg-red-100 rounded transition",
              children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4 text-red-600" })
            }
          )
        ] }),
        step === 1 && /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { htmlFor: "post-title", className: "block text-sm font-medium text-slate-700 mb-2", children: [
              "ชื่อประกาศ ",
              /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "post-title",
                type: "text",
                value: form.title,
                onChange: (e) => updateForm({ title: e.target.value }),
                className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "เช่น คอนโดหรู ใกล้ BTS อารีย์"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("label", { htmlFor: "post-type", className: "block text-sm font-medium text-slate-700 mb-2", children: [
                "ประเภท ",
                /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
              ] }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  id: "post-type",
                  value: form.type,
                  onChange: (e) => updateForm({
                    type: e.target.value,
                    isRental: e.target.value === "บ้านเช่า"
                  }),
                  className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                  children: CATEGORIES.map((c) => /* @__PURE__ */ jsx("option", { value: c.value, children: c.label }, c.value))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("label", { htmlFor: "post-price", className: "block text-sm font-medium text-slate-700 mb-2", children: [
                "ราคา (บาท) ",
                /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
              ] }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: "post-price",
                  type: "number",
                  value: form.price,
                  onChange: (e) => updateForm({ price: e.target.value }),
                  min: "0",
                  className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                  placeholder: "เช่น 5000000"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "post-area", className: "block text-sm font-medium text-slate-700 mb-2", children: "พื้นที่ (ตร.ว.)" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: "post-area",
                  type: "number",
                  value: form.area !== "" && form.area != null ? String(Number(form.area) / 4) : "",
                  onChange: (e) => updateForm({ area: e.target.value ? String(Math.round(Number(e.target.value) * 4)) : "" }),
                  min: "0",
                  step: "0.5",
                  placeholder: "เช่น 25",
                  className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "post-bedrooms", className: "block text-sm font-medium text-slate-700 mb-2", children: "ห้องนอน" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: "post-bedrooms",
                  type: "number",
                  value: form.bedrooms,
                  onChange: (e) => updateForm({ bedrooms: e.target.value }),
                  min: "0",
                  className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "post-bathrooms", className: "block text-sm font-medium text-slate-700 mb-2", children: "ห้องน้ำ" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: "post-bathrooms",
                  type: "number",
                  value: form.bathrooms,
                  onChange: (e) => updateForm({ bathrooms: e.target.value }),
                  min: "0",
                  className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: [
              "พื้นที่ (จังหวัด/อำเภอ/ตำบล) ",
              /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
            ] }),
            /* @__PURE__ */ jsx(
              LocationAutocomplete,
              {
                value: form.locationDisplay,
                onChange: (v, loc) => updateForm({
                  locationDisplay: v,
                  location: loc || form.location
                })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "post-description", className: "block text-sm font-medium text-slate-700 mb-2", children: "รายละเอียด" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                id: "post-description",
                value: form.description,
                onChange: (e) => updateForm({ description: e.target.value }),
                rows: 5,
                className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "อธิบายรายละเอียดทรัพย์สิน..."
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "post-tags", className: "block text-sm font-medium text-slate-700 mb-2", children: "แท็กที่เกี่ยวข้อง" }),
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: "post-tags",
                  type: "text",
                  value: tagInput,
                  onChange: (e) => {
                    setTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  },
                  onFocus: () => setShowTagSuggestions(true),
                  className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                  placeholder: "พิมพ์เพื่อค้นหาแท็ก..."
                }
              ),
              showTagSuggestions && filteredTags.length > 0 && /* @__PURE__ */ jsx("div", { className: "absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto", children: filteredTags.map((tag) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => addTag(tag),
                  className: "w-full px-4 py-2 text-left hover:bg-blue-50 transition",
                  children: tag
                },
                tag
              )) })
            ] }),
            form.tags.length > 0 && /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2 mt-3", children: form.tags.map((tag) => /* @__PURE__ */ jsxs(
              "span",
              {
                className: "inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm",
                children: [
                  tag,
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => removeTag(tag),
                      className: "hover:text-blue-700",
                      children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" })
                    }
                  )
                ]
              },
              tag
            )) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: form.directInstallment,
                  onChange: (e) => updateForm({ directInstallment: e.target.checked }),
                  className: "w-4 h-4 text-blue-900 rounded focus:ring-blue-900"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "text-sm text-slate-700", children: "ผ่อนตรง" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: form.hotDeal,
                  onChange: (e) => updateForm({ hotDeal: e.target.checked }),
                  className: "w-4 h-4 text-blue-900 rounded focus:ring-blue-900"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "text-sm text-slate-700", children: "ดีลร้อน" })
            ] })
          ] })
        ] }),
        step === 2 && /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-blue-900 mb-6", children: "อัปโหลดรูปภาพ" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "post-images", className: "block text-sm font-medium text-slate-700 mb-2", children: "เลือกรูปภาพ (สูงสุด 10 รูป)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "post-images",
                type: "file",
                accept: "image/*",
                multiple: true,
                onChange: handleImageSelect,
                disabled: uploadingImages || previewFiles.length >= 10,
                className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 disabled:opacity-50"
              }
            )
          ] }),
          previewFiles.length > 0 && /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-4", children: previewFiles.map((preview, index) => /* @__PURE__ */ jsxs("div", { className: "relative group", children: [
            /* @__PURE__ */ jsx("div", { className: "aspect-square rounded-lg overflow-hidden bg-slate-100", children: /* @__PURE__ */ jsx(
              "img",
              {
                src: preview.preview,
                alt: `Preview ${index + 1}`,
                className: "w-full h-full object-cover"
              }
            ) }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => removeImage(index),
                className: "absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition",
                children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
              }
            )
          ] }, index)) }),
          previewFiles.length === 0 && /* @__PURE__ */ jsxs("div", { className: "text-center py-12 text-slate-400", children: [
            /* @__PURE__ */ jsx(Upload, { className: "h-12 w-12 mx-auto mb-3 opacity-50" }),
            /* @__PURE__ */ jsx("p", { children: "ยังไม่มีรูปภาพ" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm mt-1", children: "อัปโหลดรูปภาพเพื่อให้ประกาศของคุณน่าสนใจยิ่งขึ้น" })
          ] })
        ] }),
        step === 3 && /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-blue-900 mb-6", children: "ข้อมูลติดต่อ" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { htmlFor: "post-contact-name", className: "block text-sm font-medium text-slate-700 mb-2", children: [
              "ชื่อผู้ติดต่อ ",
              /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "post-contact-name",
                type: "text",
                value: form.contactName,
                onChange: (e) => updateForm({ contactName: e.target.value }),
                className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "ชื่อของคุณ"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { htmlFor: "post-contact-phone", className: "block text-sm font-medium text-slate-700 mb-2", children: [
              "เบอร์โทรศัพท์ ",
              /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "post-contact-phone",
                type: "tel",
                value: form.contactPhone,
                onChange: (e) => updateForm({ contactPhone: e.target.value }),
                className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "0812345678"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "post-line-id", className: "block text-sm font-medium text-slate-700 mb-2", children: "LINE ID" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "post-line-id",
                type: "text",
                value: form.contactLineId,
                onChange: (e) => updateForm({ contactLineId: e.target.value }),
                className: "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "@lineid หรือ ID"
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "p-4 bg-blue-50 border border-blue-200 rounded-lg", children: /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-3 cursor-pointer", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: form.acceptedTerms,
                onChange: (e) => updateForm({ acceptedTerms: e.target.checked }),
                className: "w-5 h-5 mt-0.5 text-blue-900 rounded focus:ring-blue-900"
              }
            ),
            /* @__PURE__ */ jsxs("span", { className: "text-sm text-slate-700", children: [
              /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" }),
              " ข้าพเจ้ายืนยันว่าข้อมูลที่ลงประกาศเป็นความจริง และขอสงวนสิทธิ์ในการพิจารณาอนุมัติหรือลบประกาศที่ไม่เป็นไปตามมาตรฐานของคุณภาพจากระบบ"
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mt-8 pt-6 border-t border-slate-200", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: prevStep,
              disabled: step === 1,
              className: "flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition",
              children: [
                /* @__PURE__ */ jsx(ChevronLeft, { className: "h-5 w-5" }),
                "ย้อนกลับ"
              ]
            }
          ),
          step < 3 ? /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: nextStep,
              className: "flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition",
              children: [
                "ถัดไป",
                /* @__PURE__ */ jsx(ChevronRight, { className: "h-5 w-5" })
              ]
            }
          ) : /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleSubmit,
              disabled: submitting,
              className: "flex items-center gap-2 px-6 py-3 bg-yellow-400 text-yellow-900 font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition",
              children: submitting ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("span", { className: "inline-block w-4 h-4 border-2 border-yellow-900 border-t-transparent rounded-full animate-spin" }),
                "กำลังส่ง…"
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Check, { className: "h-5 w-5" }),
                "ส่งประกาศ"
              ] })
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "lg:col-span-3", children: /* @__PURE__ */ jsx("div", { className: "lg:sticky lg:top-24 space-y-6", children: /* @__PURE__ */ jsxs("div", { className: "bg-blue-50 rounded-xl border-2 border-blue-900/20 p-6 shadow-md", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-blue-900 mb-6 text-center", children: "ทำไมต้องลงประกาศกับเรา?" }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-lg bg-blue-900 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsx(Target, { className: "h-6 w-6 text-white" }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-semibold text-blue-900 mb-1", children: "เข้าถึงคนอมตะซิตี้โดยตรง" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-700 leading-relaxed", children: "เจาะกลุ่มเป้าหมายในนิคมอุตสาหกรรม ชลบุรี และระยอง" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-lg bg-blue-900 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsx(Zap, { className: "h-6 w-6 text-white" }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-semibold text-blue-900 mb-1", children: "โอกาสขายไวด้วยระบบผ่อนตรง" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-700 leading-relaxed", children: "รองรับกลุ่มลูกค้าที่สนใจการเช่าซื้อ/ผ่อนตรง" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-lg bg-blue-900 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsx(Shield, { className: "h-6 w-6 text-white" }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-semibold text-blue-900 mb-1", children: "ลงง่าย ไม่มีค่าธรรมเนียม" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-700 leading-relaxed", children: "ระบบจัดการง่าย พร้อมทีมงานช่วยตรวจสอบข้อมูล" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-8 pt-6 border-t border-blue-200", children: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-3 p-4 bg-white rounded-lg border border-blue-200", children: /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-600 mb-1", children: "ปรึกษาการลงประกาศ" }),
        /* @__PURE__ */ jsx(Link, { to: "/contact", className: "text-base font-bold text-blue-900 hover:text-blue-700 transition", children: "ไปหน้าติดต่อเรา" })
      ] }) }) })
    ] }) }) })
  ] }) }) }) });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: PostProperty
}, Symbol.toStringTag, { value: "Module" }));
function Favorites() {
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setFavoriteIds(getFavorites());
    let mounted = true;
    const fetchProps = async () => {
      try {
        const props = await getPropertiesOnce();
        if (mounted) {
          setProperties(props);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching favorites:", error);
        if (mounted) setLoading(false);
      }
    };
    fetchProps();
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setFavoriteIds(getFavorites());
    }, 500);
    return () => clearInterval(interval);
  }, []);
  const favoriteProperties = properties.filter((p) => favoriteIds.includes(p.id));
  return /* @__PURE__ */ jsx(PageLayout, { heroTitle: "รายการโปรด", heroSubtitle: "ทรัพย์สินที่คุณบันทึกไว้", searchComponent: null, children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-slate-50 py-8", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: favoriteProperties.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-16", children: [
    /* @__PURE__ */ jsx("div", { className: "w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsx(Heart, { className: "h-10 w-10 text-slate-400" }) }),
    /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-slate-700 mb-2", children: "ยังไม่มีรายการโปรด" }),
    /* @__PURE__ */ jsx("p", { className: "text-slate-500 mb-6", children: "คลิกปุ่มหัวใจบนการ์ดทรัพย์สินเพื่อบันทึกเป็นรายการโปรด" })
  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-6", children: /* @__PURE__ */ jsxs("h1", { className: "text-2xl sm:text-3xl font-bold text-blue-900", children: [
      "รายการโปรด (",
      favoriteProperties.length,
      ")"
    ] }) }),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "gap-5",
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))"
        },
        children: favoriteProperties.map((p) => /* @__PURE__ */ jsx(PropertyCard$1, { property: p }, p.id))
      }
    )
  ] }) }) }) });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Favorites
}, Symbol.toStringTag, { value: "Module" }));
function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);
  const pageSize = 9;
  useEffect(() => {
    loadBlogs(1);
  }, []);
  const loadBlogs = async (page) => {
    setLoading(true);
    try {
      const lastDocForPage = page === 1 ? null : pageHistory[page - 2] || null;
      const result = await getPublishedBlogs(pageSize, lastDocForPage);
      setBlogs(result.blogs);
      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
      if (result.lastDoc) {
        const newHistory = [...pageHistory];
        newHistory[page - 1] = result.lastDoc;
        setPageHistory(newHistory);
      }
    } catch (error) {
      console.error("Error loading blogs:", error);
    } finally {
      setLoading(false);
    }
  };
  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    setCurrentPage(newPage);
    loadBlogs(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };
  const extractYouTubeId2 = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };
  const getYouTubeThumbnail2 = (url) => {
    const videoId = extractYouTubeId2(url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };
  if (loading && blogs.length === 0) {
    return /* @__PURE__ */ jsx(PageLayout, { children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12", children: /* @__PURE__ */ jsxs("div", { className: "animate-pulse space-y-6", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 bg-slate-200 rounded w-1/4" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [...Array(6)].map((_, i) => /* @__PURE__ */ jsx("div", { className: "h-64 bg-slate-200 rounded-lg" }, i)) })
    ] }) }) });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Helmet, { children: [
      /* @__PURE__ */ jsx("title", { children: "บทความอสังหาริมทรัพย์และบ้าน | SPS Property Solution" }),
      /* @__PURE__ */ jsx("meta", { name: "description", content: "อ่านบทความและสาระน่ารู้เกี่ยวกับอสังหาริมทรัพย์ บ้าน ทาวน์โฮม คอนโด การกู้สินเชื่อ และเคล็ดลับการลงทุนจาก SPS Property Solution" }),
      /* @__PURE__ */ jsx("link", { rel: "canonical", href: "https://spspropertysolution.com/blogs" })
    ] }),
    /* @__PURE__ */ jsx(PageLayout, { children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-slate-900 mb-2", children: "บทความทั้งหมด" }),
        /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "อ่านบทความที่น่าสนใจเกี่ยวกับอสังหาริมทรัพย์" })
      ] }),
      blogs.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-center py-12", children: /* @__PURE__ */ jsx("p", { className: "text-slate-500 text-lg", children: "ยังไม่มีบทความ" }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8", children: blogs.map((blog) => {
          const rawCover = blog.images?.[0];
          const coverImage = (rawCover && isValidImageUrl(rawCover) ? rawCover : null) || getYouTubeThumbnail2(blog.youtubeUrl);
          const hasVideo = !!blog.youtubeUrl;
          return /* @__PURE__ */ jsxs(
            Link,
            {
              to: getBlogPath(blog),
              className: "group bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300",
              children: [
                /* @__PURE__ */ jsx("div", { className: "relative aspect-video bg-slate-200 overflow-hidden", children: coverImage ? /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: getOptimizedImageUrl(coverImage, { width: 400, height: 225, crop: "fill" }),
                      alt: blog.title,
                      width: 400,
                      height: 225,
                      loading: "lazy",
                      decoding: "async",
                      className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    }
                  ),
                  hasVideo && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/30", children: /* @__PURE__ */ jsx("div", { className: "bg-white/90 rounded-full p-3", children: /* @__PURE__ */ jsx(Play, { className: "h-6 w-6 text-blue-900", fill: "currentColor" }) }) })
                ] }) : /* @__PURE__ */ jsx("div", { className: "w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200", children: /* @__PURE__ */ jsx("span", { className: "text-blue-600 text-sm font-medium", children: "ไม่มีรูปภาพ" }) }) }),
                /* @__PURE__ */ jsxs("div", { className: "p-5", children: [
                  /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition", children: blog.title }),
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-slate-600 mb-4 line-clamp-3", children: [
                    blog.content?.substring(0, 150),
                    "..."
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500", children: [
                    /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4" }),
                    /* @__PURE__ */ jsx("span", { children: formatDate(blog.createdAt) })
                  ] })
                ] })
              ]
            },
            blog.id
          );
        }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => handlePageChange(currentPage - 1),
              disabled: currentPage === 1 || loading,
              className: "px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition",
              children: /* @__PURE__ */ jsx(ChevronLeft, { className: "h-5 w-5" })
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: "px-4 py-2 text-slate-700", children: [
            "หน้า ",
            currentPage
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => handlePageChange(currentPage + 1),
              disabled: !hasMore || loading,
              className: "px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition",
              children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-5 w-5" })
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Blogs
}, Symbol.toStringTag, { value: "Module" }));
function meta({
  data: loaderData
}) {
  if (!loaderData?.blog) {
    return [{
      title: "ไม่พบบทความ | SPS Property Solution"
    }, {
      name: "robots",
      content: "noindex"
    }];
  }
  const blog = loaderData.blog;
  const title = `${blog.title} | SPS Property Solution`;
  const description = (blog.content || "").substring(0, 160) + "...";
  const canonicalUrl = `https://spspropertysolution.com${getBlogPath(blog)}`;
  const rawCover = blog.images?.[0];
  const ogImage = rawCover && isValidImageUrl(rawCover) ? getCloudinaryLargeUrl(rawCover) : "https://spspropertysolution.com/icon.png";
  return [
    {
      title
    },
    {
      name: "description",
      content: description
    },
    {
      tagName: "link",
      rel: "canonical",
      href: canonicalUrl
    },
    // Open Graph
    {
      property: "og:type",
      content: "article"
    },
    {
      property: "og:title",
      content: title
    },
    {
      property: "og:description",
      content: description
    },
    {
      property: "og:image",
      content: ogImage
    },
    {
      property: "og:url",
      content: canonicalUrl
    },
    // Twitter
    {
      name: "twitter:card",
      content: "summary_large_image"
    },
    {
      name: "twitter:title",
      content: title
    },
    {
      name: "twitter:description",
      content: description
    },
    {
      name: "twitter:image",
      content: ogImage
    }
  ];
}
async function clientLoader({
  params
}) {
  const blogId = extractIdFromSlug$1(params.slug);
  if (!blogId) {
    throw data("Not Found", {
      status: 404
    });
  }
  const blog = await getBlogByIdOnce(blogId);
  if (!blog || !blog.published) {
    throw data("Not Found", {
      status: 404
    });
  }
  return {
    blog
  };
}
clientLoader.hydrate = true;
const _public_blogs_$slug = UNSAFE_withComponentProps(function BlogDetailPage({
  loaderData
}) {
  const blog = loaderData?.blog;
  const {
    slug,
    id
  } = useParams();
  const navigate = useNavigate();
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };
  const extractYouTubeId2 = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };
  const getYouTubeEmbedUrl = (url) => {
    const videoId = extractYouTubeId2(url);
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  };
  if (!blog) {
    return /* @__PURE__ */ jsx(PageLayout, {
      children: /* @__PURE__ */ jsx("div", {
        className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12",
        children: /* @__PURE__ */ jsxs("div", {
          className: "text-center",
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-bold text-slate-900 mb-4",
            children: "ไม่พบบทความ"
          }), /* @__PURE__ */ jsxs(Link, {
            to: "/blogs",
            className: "inline-flex items-center gap-2 text-blue-900 hover:underline",
            children: [/* @__PURE__ */ jsx(ArrowLeft, {
              className: "h-5 w-5"
            }), " กลับไปหน้าบทความทั้งหมด"]
          })]
        })
      })
    });
  }
  const canonicalSlug = generateBlogSlug(blog);
  if (id && !slug) navigate(`/blogs/${canonicalSlug}`, {
    replace: true
  });
  else if (canonicalSlug && slug !== canonicalSlug) navigate(`/blogs/${canonicalSlug}`, {
    replace: true
  });
  const rawCover = blog.images?.[0];
  const coverImage = rawCover && isValidImageUrl(rawCover) ? rawCover : null;
  const youtubeEmbedUrl = getYouTubeEmbedUrl(blog.youtubeUrl);
  return /* @__PURE__ */ jsx(PageLayout, {
    children: /* @__PURE__ */ jsxs("div", {
      className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12",
      children: [/* @__PURE__ */ jsxs(Link, {
        to: "/blogs",
        className: "inline-flex items-center gap-2 text-slate-600 hover:text-blue-900 mb-6 transition",
        children: [/* @__PURE__ */ jsx(ArrowLeft, {
          className: "h-5 w-5"
        }), " กลับไปหน้าบทความทั้งหมด"]
      }), /* @__PURE__ */ jsx("h1", {
        className: "text-3xl md:text-4xl font-bold text-slate-900 mb-4",
        children: blog.title
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-2 text-slate-500 mb-8",
        children: [/* @__PURE__ */ jsx(Calendar, {
          className: "h-5 w-5"
        }), /* @__PURE__ */ jsx("span", {
          children: formatDate(blog.createdAt)
        })]
      }), coverImage && /* @__PURE__ */ jsx("div", {
        className: "mb-8 rounded-lg overflow-hidden",
        children: /* @__PURE__ */ jsx("img", {
          src: getCloudinaryLargeUrl(coverImage),
          alt: blog.title,
          className: "w-full h-auto object-cover",
          loading: "eager",
          decoding: "async"
        })
      }), youtubeEmbedUrl && /* @__PURE__ */ jsx("div", {
        className: "mb-8 aspect-video rounded-lg overflow-hidden",
        children: /* @__PURE__ */ jsx("iframe", {
          src: youtubeEmbedUrl,
          title: blog.title,
          className: "w-full h-full",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowFullScreen: true
        })
      }), /* @__PURE__ */ jsx("div", {
        className: "prose prose-slate max-w-none mb-8",
        children: /* @__PURE__ */ jsx("div", {
          className: "whitespace-pre-wrap text-slate-700 leading-relaxed",
          children: blog.content
        })
      }), blog.images && blog.images.length > 1 && (() => {
        const validExtra = blog.images.slice(1).filter(isValidImageUrl);
        if (validExtra.length === 0) return null;
        return /* @__PURE__ */ jsxs("div", {
          className: "mt-12",
          children: [/* @__PURE__ */ jsx("h2", {
            className: "text-2xl font-bold text-slate-900 mb-6",
            children: "รูปภาพเพิ่มเติม"
          }), /* @__PURE__ */ jsx("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
            children: validExtra.map((imageUrl, index) => /* @__PURE__ */ jsx("div", {
              className: "rounded-lg overflow-hidden",
              children: /* @__PURE__ */ jsx("img", {
                src: getCloudinaryMediumUrl(imageUrl),
                alt: `${blog.title} - รูปภาพ ${index + 2}`,
                className: "w-full h-auto object-cover",
                loading: "lazy",
                decoding: "async"
              })
            }, index))
          })]
        });
      })(), /* @__PURE__ */ jsx("div", {
        className: "mt-12 pt-8 border-t border-slate-200",
        children: /* @__PURE__ */ jsxs(Link, {
          to: "/blogs",
          className: "inline-flex items-center gap-2 text-blue-900 hover:underline font-medium",
          children: [/* @__PURE__ */ jsx(ArrowLeft, {
            className: "h-5 w-5"
          }), " กลับไปหน้าบทความทั้งหมด"]
        })
      })]
    })
  });
});
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  clientLoader,
  default: _public_blogs_$slug,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const _public_b_$id = UNSAFE_withComponentProps(function BlogRedirect() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    getBlogByIdOnce(id).then((b) => {
      if (b) navigate(`/blogs/${generateBlogSlug(b)}`, {
        replace: true
      });
      else navigate("/", {
        replace: true
      });
      setLoading(false);
    }).catch(() => {
      navigate("/", {
        replace: true
      });
      setLoading(false);
    });
  }, [id, navigate]);
  if (loading) return /* @__PURE__ */ jsx("div", {
    className: "min-h-screen flex items-center justify-center",
    children: /* @__PURE__ */ jsx("p", {
      className: "text-slate-500",
      children: "กำลังโหลด..."
    })
  });
  return null;
});
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _public_b_$id
}, Symbol.toStringTag, { value: "Module" }));
function getAuthErrorMessage(err) {
  if (!err) return "เกิดข้อผิดพลาด กรุณาลองใหม่";
  const code = err?.code || "";
  const messageMap = {
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
    "auth/user-disabled": "บัญชีนี้ถูกปิดใช้งาน",
    "auth/user-not-found": "ไม่พบผู้ใช้กับอีเมลนี้",
    "auth/wrong-password": "รหัสผ่านไม่ถูกต้อง",
    "auth/not-agent": "บัญชีนี้ไม่ใช่ Agent ไม่สามารถเข้าสู่ระบบฝั่งหน้าบ้านได้",
    "auth/operation-not-allowed": "ระบบยังไม่เปิดใช้การเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน กรุณาติดต่อผู้ดูแลระบบหรือเปิดใน Firebase Console",
    "auth/too-many-requests": "ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
    "auth/network-request-failed": "เชื่อมต่อเครือข่ายไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต"
  };
  if (messageMap[code]) return messageMap[code];
  if (typeof err?.message === "string" && err.message.includes("auth/")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}
function PublicLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = usePublicAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/";
  const idEmail = useId();
  const idPassword = useId();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsx(PageLayout, { heroTitle: "", heroSubtitle: "", showHero: false, children: /* @__PURE__ */ jsx("div", { className: "min-h-[60vh] bg-slate-50 py-12 flex items-center justify-center px-4", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-slate-200", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-blue-900 mb-2", children: "เข้าสู่ระบบ" }),
    /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-6", children: "SPS Property Solution" }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      error && /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-red-50 text-red-700 text-sm", children: error }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: idEmail, className: "block text-sm font-medium text-slate-700 mb-1", children: "อีเมล" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: idEmail,
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true,
            className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900",
            placeholder: "your@email.com"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: idPassword, className: "block text-sm font-medium text-slate-700 mb-1", children: "รหัสผ่าน" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: idPassword,
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            required: true,
            className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "submit",
          disabled: submitting,
          className: "w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 transition disabled:opacity-50",
          children: [
            /* @__PURE__ */ jsx(LogIn, { className: "h-5 w-5" }),
            submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-4 text-center", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "text-sm text-blue-900 hover:underline", children: "กลับหน้าหลัก" }) })
  ] }) }) });
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: PublicLogin
}, Symbol.toStringTag, { value: "Module" }));
function Profile() {
  return /* @__PURE__ */ jsx(PageLayout, { heroTitle: "โปรไฟล์สมาชิก", heroSubtitle: "", showHero: false, children: /* @__PURE__ */ jsx("div", { className: "min-h-[60vh] bg-slate-50 py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-blue-900", children: "โปรไฟล์สมาชิก" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-slate-600", children: "ระบบโปรไฟล์พร้อมใช้งานแล้ว คุณสามารถเข้าใช้งานหน้านี้ได้ตามปกติ" })
  ] }) }) }) });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Profile
}, Symbol.toStringTag, { value: "Module" }));
function ProfileSettings() {
  const { user, userRole, isAgent } = usePublicAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    phone: "",
    lineId: "",
    facebookUrl: "",
    username: "",
    photoURL: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    if (!isAgent()) {
      navigate("/");
      return;
    }
    loadUserData();
  }, [user, navigate, isAgent]);
  const loadUserData = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(publicDb, "users", user.uid));
      if (userDoc.exists()) {
        const data2 = userDoc.data();
        setForm({
          firstName: data2.firstName || "",
          lastName: data2.lastName || "",
          nickname: data2.nickname || "",
          phone: data2.phone || "",
          lineId: data2.lineId || "",
          facebookUrl: data2.facebookUrl || "",
          username: data2.username || (user.email?.split("@")[0] || ""),
          photoURL: data2.photoURL || user.photoURL || ""
        });
      } else {
        const emailUsername = user.email?.split("@")[0] || "";
        setForm({
          firstName: "",
          lastName: "",
          nickname: "",
          phone: "",
          lineId: "",
          facebookUrl: "",
          username: emailUsername,
          photoURL: ""
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };
  const validateUsername = (username) => {
    return /^[a-zA-Z0-9]+$/.test(username);
  };
  const checkUsernameExists = async (username, currentUserId) => {
    if (!username || username === (user.email?.split("@")[0] || "")) return false;
    const q = query(collection(publicDb, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);
    return snapshot.docs.some((doc2) => doc2.id !== currentUserId);
  };
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    setUploadingPhoto(true);
    setErrorMessage(null);
    try {
      if (form.photoURL && form.photoURL.includes("firebasestorage")) {
        try {
          const oldRef = ref(publicStorage, form.photoURL);
          await deleteObject(oldRef);
        } catch (err) {
          console.error("Error deleting old photo:", err);
        }
      }
      const compressedFile = await compressImage(file, { maxWidth: 800, maxHeight: 800 });
      const storageRef2 = ref(publicStorage, `agents/${user.uid}/${Date.now()}_${compressedFile.name}`);
      await uploadBytes(storageRef2, compressedFile);
      const downloadURL = await getDownloadURL(storageRef2);
      setForm((prev) => ({ ...prev, photoURL: downloadURL }));
      setSuccessMessage("อัปโหลดรูปภาพสำเร็จ");
      setTimeout(() => setSuccessMessage(null), 3e3);
    } catch (error) {
      console.error("Error uploading photo:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setUploadingPhoto(false);
    }
  };
  const handleRemovePhoto = async () => {
    if (!form.photoURL) return;
    try {
      if (form.photoURL.includes("firebasestorage")) {
        const photoRef = ref(publicStorage, form.photoURL);
        await deleteObject(photoRef);
      }
      setForm((prev) => ({ ...prev, photoURL: "" }));
      setSuccessMessage("ลบรูปภาพสำเร็จ");
      setTimeout(() => setSuccessMessage(null), 3e3);
    } catch (error) {
      console.error("Error removing photo:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการลบรูปภาพ");
    }
  };
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (!form.username.trim()) {
        setErrorMessage("กรุณากรอก Username");
        setSaving(false);
        return;
      }
      if (!validateUsername(form.username)) {
        setErrorMessage("Username ต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้น");
        setSaving(false);
        return;
      }
      const usernameExists = await checkUsernameExists(form.username.trim(), user.uid);
      if (usernameExists) {
        setErrorMessage("Username นี้ถูกใช้งานแล้ว กรุณาเลือก Username อื่น");
        setSaving(false);
        return;
      }
      await updateDoc(doc(publicDb, "users", user.uid), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nickname: form.nickname.trim(),
        phone: form.phone.trim(),
        lineId: form.lineId.trim(),
        facebookUrl: form.facebookUrl.trim(),
        username: form.username.trim(),
        photoURL: form.photoURL,
        updatedAt: serverTimestamp()
      });
      if (form.photoURL) {
        await updateProfile(publicAuth.currentUser, {
          photoURL: form.photoURL,
          displayName: form.username.trim()
        });
      }
      setSuccessMessage("บันทึกข้อมูลสำเร็จ");
      setTimeout(() => setSuccessMessage(null), 3e3);
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setSaving(false);
    }
  };
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPassword(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordForm;
      if (!currentPassword || !newPassword || !confirmPassword) {
        setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
        setChangingPassword(false);
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        setChangingPassword(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("รหัสผ่านใหม่ไม่ตรงกัน");
        setChangingPassword(false);
        return;
      }
      if (currentPassword === newPassword) {
        setErrorMessage("รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านเดิม");
        setChangingPassword(false);
        return;
      }
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(publicAuth.currentUser, credential);
      await updatePassword(publicAuth.currentUser, newPassword);
      setSuccessMessage("เปลี่ยนรหัสผ่านสำเร็จ");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setTimeout(() => setSuccessMessage(null), 3e3);
    } catch (error) {
      console.error("Error changing password:", error);
      if (error.code === "auth/wrong-password") {
        setErrorMessage("รหัสผ่านเดิมไม่ถูกต้อง");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("รหัสผ่านใหม่ไม่แข็งแรงพอ");
      } else {
        setErrorMessage("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
      }
    } finally {
      setChangingPassword(false);
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsx(PageLayout, { heroTitle: "ตั้งค่าโปรไฟล์", heroSubtitle: "", showHero: false, children: /* @__PURE__ */ jsx("div", { className: "min-h-[60vh] bg-slate-50 py-12 flex items-center justify-center", children: /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลดข้อมูล…" }) }) });
  }
  return /* @__PURE__ */ jsx(PageLayout, { heroTitle: "ตั้งค่าโปรไฟล์", heroSubtitle: "", showHero: false, children: /* @__PURE__ */ jsx("div", { className: "min-h-[60vh] bg-slate-50 py-12", children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    successMessage && /* @__PURE__ */ jsx("div", { className: "mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800", children: successMessage }),
    errorMessage && /* @__PURE__ */ jsx("div", { className: "mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800", children: errorMessage }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-xl font-bold text-blue-900 mb-6 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(User, { className: "h-6 w-6" }),
        "ข้อมูลโปรไฟล์"
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSaveProfile, className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "รูปโปรไฟล์" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
            form.photoURL ? /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: form.photoURL,
                  alt: "Profile",
                  className: "w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: handleRemovePhoto,
                  className: "absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition",
                  children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
                }
              )
            ] }) : /* @__PURE__ */ jsx("div", { className: "w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center", children: /* @__PURE__ */ jsx(User, { className: "h-12 w-12 text-slate-400" }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition cursor-pointer", children: [
                /* @__PURE__ */ jsx(ImagePlus, { className: "h-5 w-5" }),
                uploadingPhoto ? "กำลังอัปโหลด…" : "เลือกรูปภาพ",
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "file",
                    accept: "image/*",
                    onChange: handlePhotoUpload,
                    disabled: uploadingPhoto,
                    className: "hidden"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-2", children: "รูปภาพจะถูกบีบอัดอัตโนมัติ" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: [
            "Username ",
            /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: form.username,
              onChange: (e) => setForm({ ...form, username: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "username",
              required: true
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: "ภาษาอังกฤษหรือตัวเลขเท่านั้น" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ชื่อ" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: form.firstName,
                onChange: (e) => setForm({ ...form, firstName: e.target.value }),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "ชื่อ"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "นามสกุล" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: form.lastName,
                onChange: (e) => setForm({ ...form, lastName: e.target.value }),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
                placeholder: "นามสกุล"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ชื่อเล่น" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: form.nickname,
              onChange: (e) => setForm({ ...form, nickname: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "ชื่อเล่น"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4" }),
            "เบอร์โทรศัพท์"
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "tel",
              value: form.phone,
              onChange: (e) => setForm({ ...form, phone: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "0812345678"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(MessageCircle, { className: "h-4 w-4" }),
            "Line ID"
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: form.lineId,
              onChange: (e) => setForm({ ...form, lineId: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "line_id"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Facebook, { className: "h-4 w-4" }),
            "Facebook URL"
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "url",
              value: form.facebookUrl,
              onChange: (e) => setForm({ ...form, facebookUrl: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "https://facebook.com/yourprofile"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "อีเมล" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "email",
              value: user.email || "",
              disabled: true,
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: "ไม่สามารถแก้ไขอีเมลได้" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs(
          "button",
          {
            type: "submit",
            disabled: saving,
            className: "inline-flex items-center gap-2 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed",
            children: [
              /* @__PURE__ */ jsx(Save, { className: "h-5 w-5" }),
              saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"
            ]
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-6", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-xl font-bold text-blue-900 mb-6 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Lock, { className: "h-6 w-6" }),
        "เปลี่ยนรหัสผ่าน"
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleChangePassword, className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "รหัสผ่านเดิม" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "password",
              value: passwordForm.currentPassword,
              onChange: (e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "กรอกรหัสผ่านเดิม",
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "รหัสผ่านใหม่" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "password",
              value: passwordForm.newPassword,
              onChange: (e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "อย่างน้อย 6 ตัวอักษร",
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ยืนยันรหัสผ่านใหม่" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "password",
              value: passwordForm.confirmPassword,
              onChange: (e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "กรอกรหัสผ่านใหม่อีกครั้ง",
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs(
          "button",
          {
            type: "submit",
            disabled: changingPassword,
            className: "inline-flex items-center gap-2 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed",
            children: [
              /* @__PURE__ */ jsx(Lock, { className: "h-5 w-5" }),
              changingPassword ? "กำลังเปลี่ยนรหัสผ่าน…" : "เปลี่ยนรหัสผ่าน"
            ]
          }
        ) })
      ] })
    ] })
  ] }) }) });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProfileSettings
}, Symbol.toStringTag, { value: "Module" }));
const AdminAuthContext = createContext(null);
async function resolveUserRole(u) {
  if (!u) return null;
  try {
    let userDoc = await getDoc(doc(adminDb, "users", u.uid));
    if (userDoc.exists()) {
      const role2 = userDoc.data().role || "member";
      if (role2 === "agent") return "agent";
      return role2;
    }
    const email = (u.email || "").trim().toLowerCase();
    let role = "member";
    let byEmail = null;
    if (email) {
      const q = query(collection(adminDb, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      byEmail = snap.docs[0] || null;
      if (byEmail) {
        role = byEmail.data().role || "member";
        await setDoc(doc(adminDb, "users", u.uid), {
          ...byEmail.data(),
          email: u.email,
          updatedAt: serverTimestamp()
        });
      }
    }
    if (role === "agent") return "agent";
    if (!byEmail) {
      await setDoc(doc(adminDb, "users", u.uid), {
        email: u.email,
        role: "member",
        createdAt: serverTimestamp()
      });
    }
    return role;
  } catch (err) {
    console.error("Error fetching user role:", err);
    return "member";
  }
}
function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(adminAuth, async (u) => {
      if (u) {
        const role = await resolveUserRole(u);
        if (role === "agent") {
          await signOut(adminAuth);
          setUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(adminAuth, email, password);
    const role = await resolveUserRole(cred.user);
    if (role === "agent") {
      await signOut(adminAuth);
      const error = new Error("บัญชี Agent ไม่สามารถเข้าสู่ระบบหลังบ้านได้ กรุณาใช้หน้า Login ปกติ");
      error.code = "auth/agent-not-allowed";
      throw error;
    }
    setUser(cred.user);
    setUserRole(role);
    setLoading(false);
  };
  const logout = async () => {
    await signOut(adminAuth);
    setUserRole(null);
  };
  const hasRole = (requiredRoles) => {
    if (!userRole) return false;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(userRole);
    }
    return userRole === requiredRoles;
  };
  const isSuperAdmin = () => userRole === "super_admin";
  const isAdmin = () => userRole === "admin" || userRole === "super_admin";
  const isMember = () => userRole === "member";
  return /* @__PURE__ */ jsx(
    AdminAuthContext.Provider,
    {
      value: {
        user,
        userRole,
        loading,
        login,
        logout,
        hasRole,
        isSuperAdmin,
        isAdmin,
        isMember
      },
      children
    }
  );
}
function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
const Login = lazy(() => import("./Login-CXJ4aJwQ.js"));
const _admin_login = UNSAFE_withComponentProps(function AdminLoginRoute() {
  return /* @__PURE__ */ jsx(AdminAuthProvider, {
    children: /* @__PURE__ */ jsx(Suspense, {
      fallback: null,
      children: /* @__PURE__ */ jsx(Login, {})
    })
  });
});
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_login
}, Symbol.toStringTag, { value: "Module" }));
function AdminProtectedRoute({ children, requiredRoles }) {
  const { user, userRole, loading, hasRole } = useAdminAuth();
  const location = useLocation();
  if (loading || user && userRole === null) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-slate-50 flex items-center justify-center", children: /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลด…" }) });
  }
  if (!user) {
    return /* @__PURE__ */ jsx(Navigate, { to: "/sps-internal-admin/login", state: { from: location }, replace: true });
  }
  if (userRole === "agent") {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-slate-50 flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("p", { className: "text-red-600 font-semibold mb-2", children: "ไม่มีสิทธิ์เข้าถึงหน้านี้" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-sm", children: "Agent ไม่สามารถเข้าถึงระบบหลังบ้านได้" })
    ] }) });
  }
  if (requiredRoles && !hasRole(requiredRoles)) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-slate-50 flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("p", { className: "text-red-600 font-semibold mb-2", children: "ไม่มีสิทธิ์เข้าถึงหน้านี้" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-sm", children: "กรุณาติดต่อผู้ดูแลระบบ" })
    ] }) });
  }
  return children;
}
const AdminLayout = lazy(() => import("./AdminLayout-D4SDIyrT.js"));
const _admin = UNSAFE_withComponentProps(function AdminLayoutRoute() {
  return /* @__PURE__ */ jsx(AdminAuthProvider, {
    children: /* @__PURE__ */ jsx(AdminProtectedRoute, {
      children: /* @__PURE__ */ jsx(Suspense, {
        fallback: /* @__PURE__ */ jsx("div", {
          className: "min-h-screen flex items-center justify-center",
          children: /* @__PURE__ */ jsx("div", {
            className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"
          })
        }),
        children: /* @__PURE__ */ jsx(AdminLayout, {
          children: /* @__PURE__ */ jsx(Outlet, {})
        })
      })
    })
  });
});
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin
}, Symbol.toStringTag, { value: "Module" }));
const Dashboard = lazy(() => import("./Dashboard-xPaDjygb.js"));
const _admin_dashboard = UNSAFE_withComponentProps(function DashboardRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(Dashboard, {})
  });
});
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_dashboard
}, Symbol.toStringTag, { value: "Module" }));
const PropertyListPage = lazy(() => import("./PropertyListPage-BIo8c365.js"));
const _admin_properties = UNSAFE_withComponentProps(function AdminPropertiesRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(PropertyListPage, {})
  });
});
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_properties
}, Symbol.toStringTag, { value: "Module" }));
const PropertyForm$1 = lazy(() => import("./PropertyForm-wvzWJwts.js"));
const _admin_properties_new = UNSAFE_withComponentProps(function NewPropertyRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(PropertyForm$1, {})
  });
});
const route21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_properties_new
}, Symbol.toStringTag, { value: "Module" }));
const PropertyForm = lazy(() => import("./PropertyForm-wvzWJwts.js"));
const _admin_properties_edit_$id = UNSAFE_withComponentProps(function EditPropertyRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(PropertyForm, {})
  });
});
const route22 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_properties_edit_$id
}, Symbol.toStringTag, { value: "Module" }));
const HeroSlidesAdmin = lazy(() => import("./HeroSlidesAdmin-DS5Vm9ha.js"));
const _admin_heroSlides = UNSAFE_withComponentProps(function HeroSlidesRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(HeroSlidesAdmin, {})
  });
});
const route23 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_heroSlides
}, Symbol.toStringTag, { value: "Module" }));
const HomepageSectionsAdmin = lazy(() => import("./HomepageSectionsAdmin-CPFnZFCt.js"));
const _admin_homepageSections = UNSAFE_withComponentProps(function HomepageSectionsRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(HomepageSectionsAdmin, {})
  });
});
const route24 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_homepageSections
}, Symbol.toStringTag, { value: "Module" }));
const PopularLocationsAdmin = lazy(() => import("./PopularLocationsAdmin-CuEZf2Zq.js"));
const _admin_popularLocations = UNSAFE_withComponentProps(function PopularLocationsRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(PopularLocationsAdmin, {})
  });
});
const route25 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_popularLocations
}, Symbol.toStringTag, { value: "Module" }));
const PendingProperties = lazy(() => import("./PendingProperties-CzlbWfWp.js"));
const _admin_pendingProperties = UNSAFE_withComponentProps(function PendingPropertiesRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(PendingProperties, {})
  });
});
const route26 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_pendingProperties
}, Symbol.toStringTag, { value: "Module" }));
const UserManagement = lazy(() => import("./UserManagement-Biiqdi75.js"));
const _admin_users = UNSAFE_withComponentProps(function UsersRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(UserManagement, {})
  });
});
const route27 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_users
}, Symbol.toStringTag, { value: "Module" }));
const Settings = lazy(() => import("./Settings-CUyeCgLq.js"));
const _admin_settings = UNSAFE_withComponentProps(function SettingsRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(Settings, {})
  });
});
const route28 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_settings
}, Symbol.toStringTag, { value: "Module" }));
const MyProperties = lazy(() => import("./MyProperties-H45ZQnXx.js"));
const _admin_myProperties = UNSAFE_withComponentProps(function MyPropertiesRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(MyProperties, {})
  });
});
const route29 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_myProperties
}, Symbol.toStringTag, { value: "Module" }));
const LeadsInbox = lazy(() => import("./LeadsInbox-Cs2XQYs1.js"));
const _admin_leads = UNSAFE_withComponentProps(function LeadsRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(LeadsInbox, {})
  });
});
const route30 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_leads
}, Symbol.toStringTag, { value: "Module" }));
const AdminLoanRequests = lazy(() => import("./AdminLoanRequests-Ccb_btkk.js"));
const _admin_loanRequests = UNSAFE_withComponentProps(function LoanRequestsRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(AdminLoanRequests, {})
  });
});
const route31 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_loanRequests
}, Symbol.toStringTag, { value: "Module" }));
const ActivityLogsPage = lazy(() => import("./ActivityLogsPage-DIBZADRV.js"));
const _admin_activities = UNSAFE_withComponentProps(function ActivitiesRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(ActivityLogsPage, {})
  });
});
const route32 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_activities
}, Symbol.toStringTag, { value: "Module" }));
const AdminBlogs = lazy(() => import("./AdminBlogs-BPIL9Iqb.js"));
const _admin_blogs = UNSAFE_withComponentProps(function AdminBlogsRoute() {
  return /* @__PURE__ */ jsx(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx(AdminBlogs, {})
  });
});
const route33 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _admin_blogs
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-CZ9kZjb7.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/index-C7tYgCD2.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/root-cwhNAPZn.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/index-C7tYgCD2.js", "/assets/SearchContext-5cPdWEvg.js"], "css": ["/assets/root-BwuS_Gte.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public": { "id": "routes/_public", "parentId": "root", "path": void 0, "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public-vl6aexjy.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/useSystemSettings-BejCRE5c.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/firebase-D-u4jYmS.js", "/assets/firestore-DyrBlunv.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.home": { "id": "routes/_public.home", "parentId": "routes/_public", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.home-CUb83HLN.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/index.esm-DI3MsE5U.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/LocationAutocomplete-BFeATXdb.js", "/assets/propertyTypes-CmUZhZ6T.js", "/assets/menu-DSqbvbhH.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/building-2-CaoYG_kn.js", "/assets/search-EmUbZtvp.js", "/assets/firestore-DyrBlunv.js", "/assets/cloudinary-CcBsTNds.js", "/assets/blogSlug-BH_7bUex.js", "/assets/users-1rpTC_GO.js", "/assets/clock-DokSqWsJ.js", "/assets/play-Dywjmae0.js", "/assets/message-circle-BtNVp6mV.js", "/assets/wallet-CTacJNE2.js", "/assets/map-pin-cWhnqUvI.js", "/assets/zap-B6iCEtZX.js", "/assets/circle-check-BTrUH9HR.js", "/assets/trending-up-CzrWV6h3.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/firebase-D-u4jYmS.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/x-B12O-h1M.js", "/assets/TypingPlaceholder-EpQm3549.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.properties": { "id": "routes/_public.properties", "parentId": "routes/_public", "path": "properties", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": true, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.properties-DdBjI69y.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/SearchContext-5cPdWEvg.js", "/assets/firestore-DyrBlunv.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/PropertyCard-fzc28_En.js", "/assets/globalSearch-DZXaretC.js", "/assets/TypingPlaceholder-EpQm3549.js", "/assets/propertyTypes-CmUZhZ6T.js", "/assets/search-EmUbZtvp.js", "/assets/x-B12O-h1M.js", "/assets/menu-DSqbvbhH.js", "/assets/map-pin-cWhnqUvI.js", "/assets/firebase-D-u4jYmS.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/priceFormat-C4Lb50KE.js", "/assets/cloudinary-CcBsTNds.js", "/assets/propertySlug-C2WgoQDS.js", "/assets/dollar-sign-BMignk7S.js", "/assets/maximize-2-DWbUgoGy.js", "/assets/star-C-PjD0nI.js", "/assets/trending-up-CzrWV6h3.js", "/assets/clock-DokSqWsJ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.properties.$slug": { "id": "routes/_public.properties.$slug", "parentId": "routes/_public", "path": "properties/:slug", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": true, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.properties._slug-DDPdbHjt.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/firestore-DyrBlunv.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/circle-check-big-CJA9yl0I.js", "/assets/ProtectedImageContainer-DgAk9hVv.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/priceFormat-C4Lb50KE.js", "/assets/propertyTypes-CmUZhZ6T.js", "/assets/cloudinary-CcBsTNds.js", "/assets/propertySlug-C2WgoQDS.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/check-VY3LZgRv.js", "/assets/map-pin-cWhnqUvI.js", "/assets/maximize-2-DWbUgoGy.js", "/assets/circle-check-BTrUH9HR.js", "/assets/firebase-D-u4jYmS.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/x-B12O-h1M.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.p.$id": { "id": "routes/_public.p.$id", "parentId": "routes/_public", "path": "p/:id", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.p._id-CenO3WFv.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/firestore-DyrBlunv.js", "/assets/propertySlug-C2WgoQDS.js", "/assets/firebase-D-u4jYmS.js", "/assets/propertyTypes-CmUZhZ6T.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.share.$id": { "id": "routes/_public.share.$id", "parentId": "routes/_public", "path": "share/:id", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.share._id-CiF4zVjk.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/index.esm-DI3MsE5U.js", "/assets/firestore-DyrBlunv.js", "/assets/ProtectedImageContainer-DgAk9hVv.js", "/assets/propertySlug-C2WgoQDS.js", "/assets/priceFormat-C4Lb50KE.js", "/assets/chevron-left-DucnY3ij.js", "/assets/chevron-right-DWOb2Pwl.js", "/assets/check-VY3LZgRv.js", "/assets/map-pin-cWhnqUvI.js", "/assets/maximize-2-DWbUgoGy.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/firebase-D-u4jYmS.js", "/assets/propertyTypes-CmUZhZ6T.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.contact": { "id": "routes/_public.contact", "parentId": "routes/_public", "path": "contact", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.contact-CFooWepE.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/index.esm-DI3MsE5U.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/firestore-DyrBlunv.js", "/assets/map-pin-cWhnqUvI.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/mail-yPdx2_yr.js", "/assets/facebook-BqxOU9f4.js", "/assets/clock-DokSqWsJ.js", "/assets/circle-check-BTrUH9HR.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/firebase-D-u4jYmS.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/x-B12O-h1M.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.loan-services": { "id": "routes/_public.loan-services", "parentId": "routes/_public", "path": "loan-services", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.loan-services-BFbOoejd.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/index.esm-DI3MsE5U.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/firestore-DyrBlunv.js", "/assets/check-VY3LZgRv.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/credit-card-CMuJL3zm.js", "/assets/menu-DSqbvbhH.js", "/assets/file-text-iPtUH-CU.js", "/assets/circle-alert-CDlHlxzL.js", "/assets/user-BZzCH8eb.js", "/assets/phone-Dsq4NaC1.js", "/assets/message-circle-BtNVp6mV.js", "/assets/wallet-CTacJNE2.js", "/assets/dollar-sign-BMignk7S.js", "/assets/x-B12O-h1M.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/firebase-D-u4jYmS.js", "/assets/building-2-CaoYG_kn.js", "/assets/log-in-DMD7XHWA.js", "/assets/settings-But9B2Cw.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.post": { "id": "routes/_public.post", "parentId": "routes/_public", "path": "post", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.post-BBoFrkrT.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/LocationAutocomplete-BFeATXdb.js", "/assets/firestore-DyrBlunv.js", "/assets/imageCompressor-BmtVjxTv.js", "/assets/useSystemSettings-BejCRE5c.js", "/assets/firebase-D-u4jYmS.js", "/assets/check-VY3LZgRv.js", "/assets/lock-CEsp1MaT.js", "/assets/circle-alert-CDlHlxzL.js", "/assets/x-B12O-h1M.js", "/assets/upload-B78HIDyW.js", "/assets/chevron-left-DucnY3ij.js", "/assets/chevron-right-DWOb2Pwl.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/zap-B6iCEtZX.js", "/assets/shield-Vj2bTqIX.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/TypingPlaceholder-EpQm3549.js", "/assets/map-pin-cWhnqUvI.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.favorites": { "id": "routes/_public.favorites", "parentId": "routes/_public", "path": "favorites", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.favorites-BaNsc1Nr.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/PropertyCard-fzc28_En.js", "/assets/firestore-DyrBlunv.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/priceFormat-C4Lb50KE.js", "/assets/cloudinary-CcBsTNds.js", "/assets/propertyTypes-CmUZhZ6T.js", "/assets/propertySlug-C2WgoQDS.js", "/assets/firebase-D-u4jYmS.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/x-B12O-h1M.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.blogs": { "id": "routes/_public.blogs", "parentId": "routes/_public", "path": "blogs", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.blogs-pDlQ_UKc.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/firestore-DyrBlunv.js", "/assets/cloudinary-CcBsTNds.js", "/assets/index.esm-DI3MsE5U.js", "/assets/blogSlug-BH_7bUex.js", "/assets/play-Dywjmae0.js", "/assets/calendar-CfG14Lhu.js", "/assets/chevron-left-DucnY3ij.js", "/assets/chevron-right-DWOb2Pwl.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/firebase-D-u4jYmS.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/x-B12O-h1M.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.blogs.$slug": { "id": "routes/_public.blogs.$slug", "parentId": "routes/_public", "path": "blogs/:slug", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": true, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.blogs._slug-CGEV9oyq.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/firestore-DyrBlunv.js", "/assets/cloudinary-CcBsTNds.js", "/assets/blogSlug-BH_7bUex.js", "/assets/arrow-left-BYAMH0fW.js", "/assets/calendar-CfG14Lhu.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/firebase-D-u4jYmS.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/x-B12O-h1M.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.b.$id": { "id": "routes/_public.b.$id", "parentId": "routes/_public", "path": "b/:id", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.b._id-BCxTkORJ.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/firestore-DyrBlunv.js", "/assets/blogSlug-BH_7bUex.js", "/assets/firebase-D-u4jYmS.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.login": { "id": "routes/_public.login", "parentId": "routes/_public", "path": "login", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.login-IN_v5_B7.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/authErrorMessages-BkxHp9J7.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/log-in-DMD7XHWA.js", "/assets/firebase-D-u4jYmS.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/x-B12O-h1M.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.profile": { "id": "routes/_public.profile", "parentId": "routes/_public", "path": "profile", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.profile-7QVJq9aS.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/firebase-D-u4jYmS.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/user-BZzCH8eb.js", "/assets/settings-But9B2Cw.js", "/assets/x-B12O-h1M.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_public.profile-settings": { "id": "routes/_public.profile-settings", "parentId": "routes/_public", "path": "profile-settings", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_public.profile-settings-hhQL0yg0.js", "imports": ["/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/PublicAuthContext-DXdf6bl0.js", "/assets/firebase-D-u4jYmS.js", "/assets/imageCompressor-BmtVjxTv.js", "/assets/PageLayout-C8qE3dxG.js", "/assets/user-BZzCH8eb.js", "/assets/x-B12O-h1M.js", "/assets/image-plus-Kxjpu9kD.js", "/assets/phone-Dsq4NaC1.js", "/assets/message-circle-BtNVp6mV.js", "/assets/facebook-BqxOU9f4.js", "/assets/save-DkOUTi4d.js", "/assets/lock-CEsp1MaT.js", "/assets/preload-helper-CVfkMyKi.js", "/assets/createLucideIcon-B0_-mzvl.js", "/assets/menu-DSqbvbhH.js", "/assets/building-2-CaoYG_kn.js", "/assets/credit-card-CMuJL3zm.js", "/assets/log-in-DMD7XHWA.js", "/assets/settings-But9B2Cw.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.login": { "id": "routes/_admin.login", "parentId": "root", "path": "sps-internal-admin/login", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.login-Cr8Wv_ir.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/AdminAuthContext-DoNAx6_P.js", "/assets/firebase-D-u4jYmS.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin": { "id": "routes/_admin", "parentId": "root", "path": void 0, "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin-B_FpJevs.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js", "/assets/AdminAuthContext-DoNAx6_P.js", "/assets/firebase-D-u4jYmS.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.dashboard": { "id": "routes/_admin.dashboard", "parentId": "routes/_admin", "path": "sps-internal-admin", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.dashboard-CGQWx_6e.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.properties": { "id": "routes/_admin.properties", "parentId": "routes/_admin", "path": "sps-internal-admin/properties", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.properties-BRzxcmSP.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.properties.new": { "id": "routes/_admin.properties.new", "parentId": "routes/_admin", "path": "sps-internal-admin/properties/new", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.properties.new-CKW7Zrt6.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.properties.edit.$id": { "id": "routes/_admin.properties.edit.$id", "parentId": "routes/_admin", "path": "sps-internal-admin/properties/edit/:id", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.properties.edit._id-DpQqLMqY.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.hero-slides": { "id": "routes/_admin.hero-slides", "parentId": "routes/_admin", "path": "sps-internal-admin/hero-slides", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.hero-slides-kdN4-WdD.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.homepage-sections": { "id": "routes/_admin.homepage-sections", "parentId": "routes/_admin", "path": "sps-internal-admin/homepage-sections", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.homepage-sections-BTKr9YZM.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.popular-locations": { "id": "routes/_admin.popular-locations", "parentId": "routes/_admin", "path": "sps-internal-admin/popular-locations", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.popular-locations-DXzyLcVH.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.pending-properties": { "id": "routes/_admin.pending-properties", "parentId": "routes/_admin", "path": "sps-internal-admin/pending-properties", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.pending-properties-CGRnTPdD.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.users": { "id": "routes/_admin.users", "parentId": "routes/_admin", "path": "sps-internal-admin/users", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.users-CHOUk6Pi.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.settings": { "id": "routes/_admin.settings", "parentId": "routes/_admin", "path": "sps-internal-admin/settings", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.settings-DHbli2Xf.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.my-properties": { "id": "routes/_admin.my-properties", "parentId": "routes/_admin", "path": "sps-internal-admin/my-properties", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.my-properties-CzfdZb23.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.leads": { "id": "routes/_admin.leads", "parentId": "routes/_admin", "path": "sps-internal-admin/leads", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.leads-m3dZb0GX.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.loan-requests": { "id": "routes/_admin.loan-requests", "parentId": "routes/_admin", "path": "sps-internal-admin/loan-requests", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.loan-requests-CdkNnxkg.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.activities": { "id": "routes/_admin.activities", "parentId": "routes/_admin", "path": "sps-internal-admin/activities", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.activities-R7WMRiaa.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_admin.blogs": { "id": "routes/_admin.blogs", "parentId": "routes/_admin", "path": "sps-internal-admin/blogs", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_admin.blogs-BrjQ0Vpx.js", "imports": ["/assets/preload-helper-CVfkMyKi.js", "/assets/chunk-JZWAC4HX-B9fMojxo.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-3e2cc78b.js", "version": "3e2cc78b", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_passThroughRequests": false, "unstable_subResourceIntegrity": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/_public": {
    id: "routes/_public",
    parentId: "root",
    path: void 0,
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/_public.home": {
    id: "routes/_public.home",
    parentId: "routes/_public",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route2
  },
  "routes/_public.properties": {
    id: "routes/_public.properties",
    parentId: "routes/_public",
    path: "properties",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/_public.properties.$slug": {
    id: "routes/_public.properties.$slug",
    parentId: "routes/_public",
    path: "properties/:slug",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/_public.p.$id": {
    id: "routes/_public.p.$id",
    parentId: "routes/_public",
    path: "p/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/_public.share.$id": {
    id: "routes/_public.share.$id",
    parentId: "routes/_public",
    path: "share/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/_public.contact": {
    id: "routes/_public.contact",
    parentId: "routes/_public",
    path: "contact",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/_public.loan-services": {
    id: "routes/_public.loan-services",
    parentId: "routes/_public",
    path: "loan-services",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/_public.post": {
    id: "routes/_public.post",
    parentId: "routes/_public",
    path: "post",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/_public.favorites": {
    id: "routes/_public.favorites",
    parentId: "routes/_public",
    path: "favorites",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/_public.blogs": {
    id: "routes/_public.blogs",
    parentId: "routes/_public",
    path: "blogs",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/_public.blogs.$slug": {
    id: "routes/_public.blogs.$slug",
    parentId: "routes/_public",
    path: "blogs/:slug",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/_public.b.$id": {
    id: "routes/_public.b.$id",
    parentId: "routes/_public",
    path: "b/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/_public.login": {
    id: "routes/_public.login",
    parentId: "routes/_public",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/_public.profile": {
    id: "routes/_public.profile",
    parentId: "routes/_public",
    path: "profile",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/_public.profile-settings": {
    id: "routes/_public.profile-settings",
    parentId: "routes/_public",
    path: "profile-settings",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/_admin.login": {
    id: "routes/_admin.login",
    parentId: "root",
    path: "sps-internal-admin/login",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/_admin": {
    id: "routes/_admin",
    parentId: "root",
    path: void 0,
    index: void 0,
    caseSensitive: void 0,
    module: route18
  },
  "routes/_admin.dashboard": {
    id: "routes/_admin.dashboard",
    parentId: "routes/_admin",
    path: "sps-internal-admin",
    index: true,
    caseSensitive: void 0,
    module: route19
  },
  "routes/_admin.properties": {
    id: "routes/_admin.properties",
    parentId: "routes/_admin",
    path: "sps-internal-admin/properties",
    index: void 0,
    caseSensitive: void 0,
    module: route20
  },
  "routes/_admin.properties.new": {
    id: "routes/_admin.properties.new",
    parentId: "routes/_admin",
    path: "sps-internal-admin/properties/new",
    index: void 0,
    caseSensitive: void 0,
    module: route21
  },
  "routes/_admin.properties.edit.$id": {
    id: "routes/_admin.properties.edit.$id",
    parentId: "routes/_admin",
    path: "sps-internal-admin/properties/edit/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route22
  },
  "routes/_admin.hero-slides": {
    id: "routes/_admin.hero-slides",
    parentId: "routes/_admin",
    path: "sps-internal-admin/hero-slides",
    index: void 0,
    caseSensitive: void 0,
    module: route23
  },
  "routes/_admin.homepage-sections": {
    id: "routes/_admin.homepage-sections",
    parentId: "routes/_admin",
    path: "sps-internal-admin/homepage-sections",
    index: void 0,
    caseSensitive: void 0,
    module: route24
  },
  "routes/_admin.popular-locations": {
    id: "routes/_admin.popular-locations",
    parentId: "routes/_admin",
    path: "sps-internal-admin/popular-locations",
    index: void 0,
    caseSensitive: void 0,
    module: route25
  },
  "routes/_admin.pending-properties": {
    id: "routes/_admin.pending-properties",
    parentId: "routes/_admin",
    path: "sps-internal-admin/pending-properties",
    index: void 0,
    caseSensitive: void 0,
    module: route26
  },
  "routes/_admin.users": {
    id: "routes/_admin.users",
    parentId: "routes/_admin",
    path: "sps-internal-admin/users",
    index: void 0,
    caseSensitive: void 0,
    module: route27
  },
  "routes/_admin.settings": {
    id: "routes/_admin.settings",
    parentId: "routes/_admin",
    path: "sps-internal-admin/settings",
    index: void 0,
    caseSensitive: void 0,
    module: route28
  },
  "routes/_admin.my-properties": {
    id: "routes/_admin.my-properties",
    parentId: "routes/_admin",
    path: "sps-internal-admin/my-properties",
    index: void 0,
    caseSensitive: void 0,
    module: route29
  },
  "routes/_admin.leads": {
    id: "routes/_admin.leads",
    parentId: "routes/_admin",
    path: "sps-internal-admin/leads",
    index: void 0,
    caseSensitive: void 0,
    module: route30
  },
  "routes/_admin.loan-requests": {
    id: "routes/_admin.loan-requests",
    parentId: "routes/_admin",
    path: "sps-internal-admin/loan-requests",
    index: void 0,
    caseSensitive: void 0,
    module: route31
  },
  "routes/_admin.activities": {
    id: "routes/_admin.activities",
    parentId: "routes/_admin",
    path: "sps-internal-admin/activities",
    index: void 0,
    caseSensitive: void 0,
    module: route32
  },
  "routes/_admin.blogs": {
    id: "routes/_admin.blogs",
    parentId: "routes/_admin",
    path: "sps-internal-admin/blogs",
    index: void 0,
    caseSensitive: void 0,
    module: route33
  }
};
const allowedActionOrigins = false;
export {
  updateAppointmentStatus as $,
  createHeroSlide as A,
  deleteHeroSlideById as B,
  getHomepageSectionsSnapshot as C,
  batchUpdateHomepageSectionOrders as D,
  addTagToProperty as E,
  removeTagFromProperty as F,
  updateHomepageSectionById as G,
  createHomepageSection as H,
  deleteHomepageSectionById as I,
  filterPropertiesByCriteria as J,
  compressImage as K,
  LocationAutocomplete as L,
  getPopularLocationsSnapshot as M,
  batchUpdatePopularLocationOrders as N,
  uploadPopularLocationImage as O,
  PROPERTY_TYPES as P,
  updatePopularLocationById as Q,
  createPopularLocation as R,
  deletePopularLocationById as S,
  approvePendingProperty as T,
  rejectPendingProperty as U,
  app as V,
  createAuditLog as W,
  getSystemSettingsSnapshot as X,
  updateSystemSettings as Y,
  PropertyCard$1 as Z,
  getAppointmentsSnapshot as _,
  getCloudinaryThumbUrl as a,
  getLoanRequestsSnapshot as a0,
  updateLoanRequestStatus as a1,
  deleteLoanRequest as a2,
  getBlogsSnapshot as a3,
  uploadBlogImage as a4,
  updateBlogById as a5,
  createBlog as a6,
  deleteBlogById as a7,
  getHeroSlidesOnce as a8,
  getOptimizedImageUrl as a9,
  logo as aa,
  allowedActionOrigins as ab,
  serverManifest as ac,
  assetsBuildDirectory as ad,
  basename as ae,
  entry as af,
  future as ag,
  isSpaMode as ah,
  prerender as ai,
  publicPath as aj,
  routeDiscovery as ak,
  routes as al,
  ssr as am,
  getAuthErrorMessage as b,
  getPropertiesSnapshot as c,
  db as d,
  getLeadsSnapshot as e,
  formatPrice as f,
  getPropertyPath as g,
  getViewingRequestsSnapshot as h,
  isValidImageUrl as i,
  getActivitiesSnapshot as j,
  getPendingPropertiesSnapshot as k,
  getPropertyViewsSnapshot as l,
  getPropertyLabel as m,
  getPropertiesOnce as n,
  adminDb as o,
  getPropertyByIdOnce as p,
  compressImages as q,
  deletePropertyById as r,
  uploadPropertyImageWithProgress as s,
  updatePropertyById as t,
  useAdminAuth as u,
  createProperty as v,
  getHeroSlidesSnapshot as w,
  batchUpdateHeroSlideOrders as x,
  uploadHeroSlideImage as y,
  adminStorage as z
};
