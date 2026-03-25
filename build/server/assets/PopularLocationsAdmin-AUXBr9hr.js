import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { AlertCircle, X, Image as Image$1, Upload, Plus, Check, MapPin, GripVertical, Trash2 } from "lucide-react";
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DndContext, closestCenter } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, SortableContext, rectSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { thaiLocations } from "./thaiLocations-BeSGz9qC.js";
import { M as compressImage, N as getPopularLocationsSnapshot, O as batchUpdatePopularLocationOrders, Q as uploadPopularLocationImage, A as adminStorage, R as updatePopularLocationById, p as adminDb, S as createPopularLocation, T as deletePopularLocationById } from "./server-build-D_48fWql.js";
import "node:stream";
import "@react-router/node";
import "react-router";
import "isbot";
import "react-dom/server";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function buildAddressDatabase() {
  const db = {};
  thaiLocations.forEach((loc) => {
    const { province, district, subDistrict } = loc;
    if (!db[province]) {
      db[province] = {};
    }
    if (!db[province][district]) {
      db[province][district] = /* @__PURE__ */ new Set();
    }
    db[province][district].add(subDistrict);
  });
  const provinces = Object.keys(db).map((provinceName) => {
    const districts = Object.keys(db[provinceName]).map((districtName) => {
      const subdistricts = Array.from(db[provinceName][districtName]).sort();
      return {
        name: districtName,
        subdistricts
      };
    });
    return {
      name: provinceName,
      districts: districts.sort((a, b) => a.name.localeCompare(b.name, "th"))
    };
  });
  return provinces.sort((a, b) => a.name.localeCompare(b.name, "th"));
}
const thailandAddresses = buildAddressDatabase();
function getProvinces() {
  return thailandAddresses.map((p) => p.name);
}
function getDistricts(province) {
  if (!province) return [];
  const provinceData = thailandAddresses.find((p) => p.name === province);
  if (!provinceData) return [];
  return provinceData.districts.map((d) => d.name);
}
function getSubdistricts(province, district) {
  if (!province || !district) return [];
  const provinceData = thailandAddresses.find((p) => p.name === province);
  if (!provinceData) return [];
  const districtData = provinceData.districts.find((d) => d.name === district);
  if (!districtData) return [];
  return districtData.subdistricts;
}
function CascadingLocationSelect({
  value = { province: "", district: "", subDistrict: "" },
  onChange,
  className = ""
}) {
  const [province, setProvince] = useState(value.province || "");
  const [district, setDistrict] = useState(value.district || "");
  const [subDistrict, setSubDistrict] = useState(value.subDistrict || "");
  const provinces = getProvinces();
  const districts = getDistricts(province);
  const subdistricts = getSubdistricts(province, district);
  useEffect(() => {
    if (province !== value.province) {
      setDistrict("");
      setSubDistrict("");
    }
    if (district !== value.district) {
      setSubDistrict("");
    }
  }, [province, district, value.province, value.district]);
  useEffect(() => {
    setProvince(value.province || "");
    setDistrict(value.district || "");
    setSubDistrict(value.subDistrict || "");
  }, [value]);
  const handleProvinceChange = (e) => {
    const newProvince = e.target.value;
    setProvince(newProvince);
    setDistrict("");
    setSubDistrict("");
    onChange?.({ province: newProvince, district: "", subDistrict: "" });
  };
  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setDistrict(newDistrict);
    setSubDistrict("");
    onChange?.({ province, district: newDistrict, subDistrict: "" });
  };
  const handleSubDistrictChange = (e) => {
    const newSubDistrict = e.target.value;
    setSubDistrict(newSubDistrict);
    onChange?.({ province, district, subDistrict: newSubDistrict });
  };
  return /* @__PURE__ */ jsxs("div", { className: `grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: [
        "จังหวัด ",
        /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
      ] }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: province,
          onChange: handleProvinceChange,
          className: "w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900",
          required: true,
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "-- เลือกจังหวัด --" }),
            provinces.map((p) => /* @__PURE__ */ jsx("option", { value: p, children: p }, p))
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: [
        "อำเภอ/เขต ",
        /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
      ] }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: district,
          onChange: handleDistrictChange,
          disabled: !province,
          className: "w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:bg-slate-100 disabled:cursor-not-allowed",
          required: true,
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "-- เลือกอำเภอ/เขต --" }),
            districts.map((d) => /* @__PURE__ */ jsx("option", { value: d, children: d }, d))
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ตำบล/แขวง" }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: subDistrict,
          onChange: handleSubDistrictChange,
          disabled: !district,
          className: "w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:bg-slate-100 disabled:cursor-not-allowed",
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "-- เลือกตำบล/แขวง --" }),
            subdistricts.map((s) => /* @__PURE__ */ jsx("option", { value: s, children: s }, s))
          ]
        }
      )
    ] })
  ] });
}
function ImageUploader16x9({
  value = null,
  onChange,
  maxSizeMB = 2,
  className = "",
  disabled = false
}) {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const handleFileSelect = async (file) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกรูปภาพเท่านั้น (JPG, PNG, etc.)");
      return;
    }
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`ขนาดไฟล์เกิน ${maxSizeMB}MB (ปัจจุบัน: ${fileSizeMB.toFixed(2)}MB)`);
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.9,
        maxSizeMB
      });
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const targetRatio = 16 / 9;
          const currentRatio = img.width / img.height;
          let cropWidth = img.width;
          let cropHeight = img.height;
          let cropX = 0;
          let cropY = 0;
          if (currentRatio > targetRatio) {
            cropWidth = img.height * targetRatio;
            cropX = (img.width - cropWidth) / 2;
          } else {
            cropHeight = img.width / targetRatio;
            cropY = (img.height - cropHeight) / 2;
          }
          const canvas = document.createElement("canvas");
          canvas.width = 1920;
          canvas.height = 1080;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            1920,
            1080
          );
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                setError("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ");
                setUploading(false);
                return;
              }
              const croppedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now()
              });
              const previewUrl = URL.createObjectURL(blob);
              setPreview(previewUrl);
              onChange?.(croppedFile);
              setUploading(false);
            },
            "image/jpeg",
            0.9
          );
        };
        img.onerror = () => {
          setError("ไม่สามารถโหลดรูปภาพได้");
          setUploading(false);
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        setError("เกิดข้อผิดพลาดในการอ่านไฟล์");
        setUploading(false);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error("Error processing image:", err);
      setError("เกิดข้อผิดพลาด: " + err.message);
      setUploading(false);
    }
  };
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };
  const handleRemove = () => {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setError(null);
    onChange?.(null);
  };
  return /* @__PURE__ */ jsxs("div", { className, children: [
    error && /* @__PURE__ */ jsxs("div", { className: "mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2", children: [
      /* @__PURE__ */ jsx(AlertCircle, { className: "h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-red-800 flex-1", children: error }),
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
    preview ? /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative aspect-video rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100", children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            src: preview,
            alt: "Preview",
            className: "w-full h-full object-cover"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: handleRemove,
            disabled: disabled || uploading,
            className: "absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed",
            title: "ลบรูปภาพ",
            children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5 text-slate-600" })
          }
        ),
        uploading && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-black/50 flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-white text-sm font-medium flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
          "กำลังประมวลผล…"
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs text-slate-500 text-center", children: "สัดส่วนภาพ: 16:9 (อัปโหลดอัตโนมัติ)" })
    ] }) : /* @__PURE__ */ jsx("div", { className: "border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx(Image$1, { className: "h-12 w-12 mx-auto text-slate-400 mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-700 mb-1", children: "อัปโหลดรูปภาพ (สัดส่วน 16:9)" }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mb-4", children: [
        "รองรับ JPG, PNG ขนาดไม่เกิน ",
        maxSizeMB,
        "MB"
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", children: [
        /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
        "เลือกรูปภาพ",
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            accept: "image/*",
            onChange: handleFileInputChange,
            className: "hidden",
            disabled: disabled || uploading
          }
        )
      ] }),
      uploading && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center justify-center gap-2 text-sm text-slate-600", children: [
        /* @__PURE__ */ jsx("span", { className: "inline-block w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" }),
        "กำลังประมวลผล…"
      ] })
    ] }) })
  ] });
}
function SortableLocationCard({ location, index, onEdit, onDelete, onToggleStatus, isDeleting }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: location.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: setNodeRef,
      style,
      className: `group relative border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all ${isDragging ? "border-blue-500 shadow-lg scale-105 z-50" : location.isActive ? "border-slate-200 hover:border-blue-300" : "border-slate-200 opacity-60"}`,
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            ...attributes,
            ...listeners,
            className: "absolute top-2 left-2 z-20 p-2 bg-white rounded-lg cursor-grab active:cursor-grabbing shadow-md hover:bg-slate-50 transition",
            title: "ลากเพื่อสลับลำดับ",
            children: /* @__PURE__ */ jsx(GripVertical, { className: "h-5 w-5 text-slate-600" })
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "absolute top-2 right-2 z-20 px-3 py-1 bg-blue-900 text-white text-sm font-bold rounded-lg shadow-md", children: [
          "#",
          index + 1
        ] }),
        /* @__PURE__ */ jsx("div", { className: "absolute top-2 left-12 z-20", children: /* @__PURE__ */ jsx(
          "span",
          {
            className: `px-2 py-1 text-xs font-semibold rounded-lg shadow-md ${location.isActive ? "bg-green-500 text-white" : "bg-slate-400 text-white"}`,
            children: location.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "aspect-video relative bg-slate-100", children: [
          location.imageUrl ? /* @__PURE__ */ jsx(
            "img",
            {
              src: location.imageUrl,
              alt: location.displayName || location.province,
              className: "w-full h-full object-cover",
              loading: "lazy"
            }
          ) : /* @__PURE__ */ jsx("div", { className: "w-full h-full flex items-center justify-center bg-slate-200", children: /* @__PURE__ */ jsx(MapPin, { className: "h-12 w-12 text-slate-400" }) }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 bg-slate-50 border-t border-slate-200", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-blue-900 mb-1 line-clamp-1", children: location.displayName || `${location.district || location.province}` }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-600 mb-3", children: [
            location.province,
            location.district && ` > ${location.district}`,
            location.subDistrict && ` > ${location.subDistrict}`
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => onToggleStatus(location.id, !location.isActive),
                  className: `px-3 py-1.5 text-xs font-medium rounded-lg transition ${location.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`,
                  title: location.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน",
                  children: location.isActive ? "เปิด" : "ปิด"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => onEdit(location),
                  className: "px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition",
                  title: "แก้ไข",
                  children: "แก้ไข"
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => onDelete(location.id, location.imageUrl),
                disabled: isDeleting,
                className: "p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed",
                title: "ลบทำเล",
                children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
              }
            )
          ] })
        ] })
      ]
    }
  );
}
function PopularLocationsAdmin() {
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [form, setForm] = useState({
    displayName: "",
    province: "",
    district: "",
    subDistrict: "",
    imageFile: null,
    isActive: true
  });
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  useEffect(() => {
    const unsub = getPopularLocationsSnapshot((newLocations) => {
      setLocations(newLocations);
    }, adminDb);
    return () => unsub();
  }, []);
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3e3);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5e3);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);
  const handleDragStart = () => {
    setIsDragging(true);
  };
  const handleDragEnd = async (event) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = locations.findIndex((loc) => loc.id === active.id);
    const newIndex = locations.findIndex((loc) => loc.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newLocations = arrayMove(locations, oldIndex, newIndex);
    setLocations(newLocations);
    try {
      const updates = newLocations.map((loc, index) => ({
        id: loc.id,
        order: index
      }));
      await batchUpdatePopularLocationOrders(updates);
      setSuccessMessage("สลับลำดับทำเลสำเร็จ");
    } catch (error) {
      console.error("Error updating order:", error);
      setLocations(locations);
      setErrorMessage("เกิดข้อผิดพลาดในการอัปเดตลำดับ: " + error.message);
    }
  };
  const resetForm = () => {
    setForm({
      displayName: "",
      province: "",
      district: "",
      subDistrict: "",
      imageFile: null,
      isActive: true
    });
    setEditingLocation(null);
    setShowForm(false);
  };
  const handleEdit = (location) => {
    setEditingLocation(location);
    setForm({
      displayName: location.displayName || "",
      province: location.province || "",
      district: location.district || "",
      subDistrict: location.subDistrict || "",
      imageFile: null,
      isActive: location.isActive ?? true
    });
    setShowForm(true);
  };
  const handleLocationChange = (location) => {
    setForm((prev) => ({
      ...prev,
      province: location.province || "",
      district: location.district || "",
      subDistrict: location.subDistrict || ""
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!form.province || !form.district) {
      setErrorMessage("กรุณาเลือกจังหวัดและอำเภอ/เขต");
      return;
    }
    if (!form.imageFile && !editingLocation?.imageUrl) {
      setErrorMessage("กรุณาอัปโหลดรูปภาพ");
      return;
    }
    setUploading(true);
    try {
      let imageUrl = editingLocation?.imageUrl;
      if (form.imageFile) {
        imageUrl = await uploadPopularLocationImage(form.imageFile, adminStorage);
      }
      const locationData = {
        displayName: form.displayName.trim() || null,
        province: form.province,
        district: form.district,
        subDistrict: form.subDistrict || null,
        imageUrl,
        isActive: form.isActive
      };
      if (editingLocation) {
        await updatePopularLocationById(editingLocation.id, locationData, adminDb);
        setSuccessMessage("อัปเดตทำเลสำเร็จ");
      } else {
        await createPopularLocation(locationData, adminDb);
        setSuccessMessage("เพิ่มทำเลสำเร็จ");
      }
      resetForm();
    } catch (error) {
      console.error("Error saving location:", error);
      setErrorMessage("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setUploading(false);
    }
  };
  const handleDelete = async (id, imageUrl) => {
    if (!window.confirm("ต้องการลบทำเลนี้หรือไม่?")) return;
    setDeletingId(id);
    setErrorMessage(null);
    try {
      await deletePopularLocationById(id, imageUrl, adminDb, adminStorage);
      setSuccessMessage("ลบทำเลสำเร็จ");
    } catch (error) {
      console.error("Error deleting:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการลบ: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };
  const handleToggleStatus = async (id, newStatus) => {
    try {
      await updatePopularLocationById(id, { isActive: newStatus }, adminDb);
      setSuccessMessage(newStatus ? "เปิดใช้งานทำเลสำเร็จ" : "ปิดใช้งานทำเลสำเร็จ");
    } catch (error) {
      console.error("Error toggling status:", error);
      setErrorMessage("เกิดข้อผิดพลาด: " + error.message);
    }
  };
  const activeLocations = locations.filter((loc) => loc.isActive);
  locations.filter((loc) => !loc.isActive);
  return /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-blue-900 mb-2", children: "จัดการทำเลยอดฮิต" }),
        /* @__PURE__ */ jsxs("p", { className: "text-slate-600", children: [
          "จัดการทำเลที่แสดงในหน้าแรก (เปิดใช้งาน: ",
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-blue-900", children: activeLocations.length }),
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => {
            resetForm();
            setShowForm(true);
          },
          disabled: showForm,
          className: "flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed",
          children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" }),
            "เพิ่มทำเล"
          ]
        }
      )
    ] }),
    successMessage && /* @__PURE__ */ jsxs("div", { className: "mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(Check, { className: "h-5 w-5 text-green-600 flex-shrink-0" }),
      /* @__PURE__ */ jsx("p", { className: "text-green-800 font-medium", children: successMessage })
    ] }),
    errorMessage && /* @__PURE__ */ jsxs("div", { className: "mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3", children: [
      /* @__PURE__ */ jsx(AlertCircle, { className: "h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsx("p", { className: "text-red-800 flex-1", children: errorMessage }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => setErrorMessage(null),
          className: "p-1 hover:bg-red-100 rounded transition",
          children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4 text-red-600" })
        }
      )
    ] }),
    showForm && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-blue-900", children: editingLocation ? "แก้ไขทำเล" : "เพิ่มทำเลใหม่" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: resetForm,
            className: "p-2 hover:bg-slate-100 rounded-lg transition",
            children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5 text-slate-600" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ชื่อเรียกทำเล (ไม่บังคับ)" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: form.displayName,
              onChange: (e) => setForm((prev) => ({ ...prev, displayName: e.target.value })),
              placeholder: "เช่น อมตะซิตี้ ชลบุรี, พัทยา, สยาม",
              className: "w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-500", children: "หากไม่ระบุ จะใช้ชื่ออำเภอ/เขตแทน" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: [
            "เลือกทำเล ",
            /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
          ] }),
          /* @__PURE__ */ jsx(
            CascadingLocationSelect,
            {
              value: {
                province: form.province,
                district: form.district,
                subDistrict: form.subDistrict
              },
              onChange: handleLocationChange
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: [
            "รูปภาพ (สัดส่วน 16:9) ",
            /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
          ] }),
          editingLocation?.imageUrl && !form.imageFile && /* @__PURE__ */ jsxs("div", { className: "mb-3", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-600 mb-2", children: "รูปภาพปัจจุบัน:" }),
            /* @__PURE__ */ jsx("div", { className: "relative aspect-video rounded-lg overflow-hidden border-2 border-slate-200 max-w-md", children: /* @__PURE__ */ jsx(
              "img",
              {
                src: editingLocation.imageUrl,
                alt: "Current",
                className: "w-full h-full object-cover"
              }
            ) })
          ] }),
          /* @__PURE__ */ jsx(
            ImageUploader16x9,
            {
              value: editingLocation?.imageUrl,
              onChange: (file) => setForm((prev) => ({ ...prev, imageFile: file })),
              disabled: uploading
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: form.isActive,
              onChange: (e) => setForm((prev) => ({ ...prev, isActive: e.target.checked })),
              className: "w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-700", children: "เปิดใช้งานทันที" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-3 pt-4 border-t border-slate-200", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: resetForm,
              disabled: uploading,
              className: "px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium disabled:opacity-50",
              children: "ยกเลิก"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: uploading,
              className: "px-6 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2",
              children: uploading ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("span", { className: "inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                "กำลังบันทึก…"
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Check, { className: "h-5 w-5" }),
                editingLocation ? "อัปเดต" : "บันทึก"
              ] })
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold text-blue-900 mb-4", children: "ทำเลทั้งหมด" }),
      locations.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-16 text-slate-500", children: [
        /* @__PURE__ */ jsx(MapPin, { className: "h-16 w-16 mx-auto mb-4 opacity-50" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-medium mb-2", children: "ยังไม่มีทำเล" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm", children: "เพิ่มทำเลแรกของคุณได้เลย" })
      ] }) : /* @__PURE__ */ jsx(
        DndContext,
        {
          sensors,
          collisionDetection: closestCenter,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
          children: /* @__PURE__ */ jsx(SortableContext, { items: locations.map((l) => l.id), strategy: rectSortingStrategy, children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: locations.map((location, index) => /* @__PURE__ */ jsx(
            SortableLocationCard,
            {
              location,
              index,
              onEdit: handleEdit,
              onDelete: handleDelete,
              onToggleStatus: handleToggleStatus,
              isDeleting: deletingId === location.id
            },
            location.id
          )) }) })
        }
      )
    ] }),
    locations.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg", children: /* @__PURE__ */ jsxs("p", { className: "text-sm text-blue-800", children: [
      /* @__PURE__ */ jsx("strong", { children: "💡 คำแนะนำ:" }),
      " ลากไอคอน ",
      /* @__PURE__ */ jsx(GripVertical, { className: "inline h-4 w-4" }),
      " เพื่อสลับลำดับทำเล ทำเลที่เปิดใช้งานจะแสดงในหน้าแรกเรียงตามลำดับ"
    ] }) })
  ] });
}
export {
  PopularLocationsAdmin as default
};
