import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
} from "react-router";
import { SearchProvider } from "./context/SearchContext";
import "./index.css";

// Root Loader: ดึง environment variables ที่อนุญาตให้ client เห็น
export async function loader() {
  const getEnv = (key) => {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    try {
      return import.meta.env[key];
    } catch (e) {
      return undefined;
    }
  };

  return {
    ENV: {
      VITE_FIREBASE_API_KEY: getEnv('VITE_FIREBASE_API_KEY'),
      VITE_FIREBASE_AUTH_DOMAIN: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
      VITE_FIREBASE_PROJECT_ID: getEnv('VITE_FIREBASE_PROJECT_ID'),
      VITE_FIREBASE_STORAGE_BUCKET: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
      VITE_FIREBASE_MESSAGING_SENDER_ID: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      VITE_FIREBASE_APP_ID: getEnv('VITE_FIREBASE_APP_ID'),
      VITE_CLOUDINARY_CLOUD_NAME: getEnv('VITE_CLOUDINARY_CLOUD_NAME'),
      VITE_CLOUDINARY_UPLOAD_PRESET: getEnv('VITE_CLOUDINARY_UPLOAD_PRESET'),
    },
  };
}

// Root Layout — แทนที่ index.html + App.jsx wrapper
export function Layout({ children, loaderData }) {
  // ENV variables from loader (only available here if Layout is used by a route with a loader)
  // In React Router, root Layout gets root loader data
  const env = loaderData?.ENV || {};

  return (
    <html lang="th">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/x-icon" href="/icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Preconnect to LCP, font and image CDN origins */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        {/* Preload LCP image */}
        <link
          rel="preload"
          as="image"
          href="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=75&auto=format"
          fetchPriority="high"
        />
        {/* Font loaded via CSS in index.css for SSR compatibility */}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Default meta tags (ใช้เป็นค่า fallback ถ้า route ไม่มี meta export)
export function meta() {
  return [
    { title: "SPS Property Solution | บ้านคอนโดสวย อมตะซิตี้ ชลบุรี" },
    {
      name: "description",
      content:
        "SPS Property Solution บ้านคอนโดสวย อมตะซิตี้ ชลบุรี - ค้นหาบ้านและคอนโดที่ใช่สำหรับคุณในอมตะซิตี้ ชลบุรี",
    },
  ];
}

// Root component — เทียบเท่า App.jsx (Outlet renders child routes)
export default function Root() {
  const loaderData = useLoaderData() || {};
  const ENV = loaderData.ENV || {};

  return (
    <SearchProvider>
      <Outlet />
    </SearchProvider>
  );
}

// Error Boundary (แทน ErrorBoundary component เดิม)
export function ErrorBoundary({ error }) {
  let message = "เกิดข้อผิดพลาด";
  let details = "กรุณาลองใหม่อีกครั้ง";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "ไม่พบหน้าที่ต้องการ" : `Error ${error.status}`;
    details = error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{message}</h1>
        <p className="text-slate-500 mb-6">{details}</p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors"
        >
          กลับหน้าแรก
        </a>
      </div>
    </div>
  );
}
