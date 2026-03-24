import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { StrictMode } from "react";

// ─── Auto-reload on stale chunk after new deployment ─────────────────────────
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const reloaded = sessionStorage.getItem("chunk-reload");
  if (!reloaded) {
    sessionStorage.setItem("chunk-reload", "1");
    window.location.reload();
  } else {
    sessionStorage.removeItem("chunk-reload");
  }
});

hydrateRoot(
  document,
  <StrictMode>
    <HydratedRouter />
  </StrictMode>
);
