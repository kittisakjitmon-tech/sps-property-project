const LONGDO_SCRIPT_ID = "longdo-map-sdk";
let longdoLoadingPromise = null;
function getApiKey() {
  return "e4aec2faf2c8e741e7fce2093b958abc";
}
function loadLongdoMap() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("window/document is not available (SSR)"));
  }
  if (window.longdo && window.longdo.Map) {
    return Promise.resolve(window.longdo);
  }
  if (longdoLoadingPromise) {
    return longdoLoadingPromise;
  }
  const apiKey = getApiKey();
  const existing = document.getElementById(LONGDO_SCRIPT_ID);
  if (existing) {
    if (window.longdo && window.longdo.Map) {
      return Promise.resolve(window.longdo);
    }
    longdoLoadingPromise = new Promise((resolve, reject) => {
      const check = () => {
        if (window.longdo && window.longdo.Map) {
          resolve(window.longdo);
          return;
        }
        requestAnimationFrame(check);
      };
      check();
      setTimeout(() => {
        if (!window.longdo?.Map) reject(new Error("Longdo Map script failed to load"));
      }, 15e3);
    });
    return longdoLoadingPromise;
  }
  longdoLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = LONGDO_SCRIPT_ID;
    script.src = `https://api.longdo.com/map/?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => {
      if (window.longdo && window.longdo.Map) {
        resolve(window.longdo);
      } else {
        longdoLoadingPromise = null;
        reject(new Error("Longdo Map API did not attach to window"));
      }
    };
    script.onerror = () => {
      longdoLoadingPromise = null;
      reject(new Error("Failed to load Longdo Map script"));
    };
    document.head.appendChild(script);
  });
  return longdoLoadingPromise;
}
export {
  loadLongdoMap as l
};
