import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Plus, Check, AlertCircle, X, LayoutList, GripVertical, Search } from "lucide-react";
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DndContext, closestCenter } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, SortableContext, rectSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { C as getHomepageSectionsSnapshot, c as getPropertiesSnapshot, o as adminDb, D as batchUpdateHomepageSectionOrders, E as addTagToProperty, F as removeTagFromProperty, G as updateHomepageSectionById, H as createHomepageSection, I as deleteHomepageSectionById, J as filterPropertiesByCriteria } from "./server-build-C8MEOO73.js";
import "react-dom/server";
import "react-router";
import "isbot";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
const CATEGORIES = [
  { value: "บ้านเดี่ยว", label: "บ้านเดี่ยว" },
  { value: "คอนโดมิเนียม", label: "คอนโดมิเนียม" },
  { value: "ทาวน์โฮม", label: "ทาวน์โฮม" },
  { value: "วิลล่า", label: "วิลล่า" },
  { value: "บ้านเช่า", label: "บ้านเช่า" }
];
function SortableSectionCard({ section, index, onEdit, onDelete, onToggle, isDeleting }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: setNodeRef,
      style,
      className: `group relative border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all ${isDragging ? "border-blue-500 shadow-lg scale-105 z-50" : "border-slate-200 hover:border-blue-300"} ${!section.isActive ? "opacity-60" : ""}`,
      children: [
        /* @__PURE__ */ jsx("div", { ...attributes, ...listeners, className: "absolute top-3 left-3 z-20 p-2 bg-white/90 rounded-lg cursor-grab active:cursor-grabbing shadow", children: /* @__PURE__ */ jsx(GripVertical, { className: "h-5 w-5 text-slate-600" }) }),
        /* @__PURE__ */ jsxs("div", { className: "absolute top-3 right-3 z-20 px-3 py-1 bg-blue-900 text-white text-sm font-bold rounded-lg", children: [
          "#",
          index + 1
        ] }),
        /* @__PURE__ */ jsx("div", { className: "absolute top-3 left-16 z-20", children: /* @__PURE__ */ jsx("span", { className: `px-2 py-1 text-xs font-semibold rounded-lg ${section.isActive ? "bg-green-500 text-white" : "bg-slate-400 text-white"}`, children: section.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน" }) }),
        /* @__PURE__ */ jsxs("div", { className: "p-6 pt-14", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-blue-900 mb-1", children: section.title || "-" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-3 line-clamp-1", children: section.subtitle || "-" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mb-4", children: [
            "ประเภท: ",
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: section.type === "manual" ? "เลือกเอง" : "ดึงอัตโนมัติ" }),
            section.type === "manual" && section.propertyIds?.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
              " • ",
              section.propertyIds.length,
              " ทรัพย์"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => onToggle(section.id, !section.isActive),
                className: `px-3 py-1.5 text-sm font-medium rounded-lg transition ${section.isActive ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-green-100 text-green-800 hover:bg-green-200"}`,
                children: section.isActive ? "ปิด" : "เปิด"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => onEdit(section),
                className: "px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 text-blue-900 hover:bg-blue-200 transition",
                children: "แก้ไข"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => onDelete(section.id),
                disabled: isDeleting === section.id,
                className: "px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition disabled:opacity-50",
                children: "ลบ"
              }
            )
          ] })
        ] })
      ]
    }
  );
}
function PropertySelector({ properties, selectedIds, onChange }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) => (p.title || "").toLowerCase().includes(q) || (p.locationDisplay || "").toLowerCase().includes(q) || (p.location?.district || "").toLowerCase().includes(q) || (p.location?.province || "").toLowerCase().includes(q)
    );
  }, [properties, search]);
  const toggle = (id) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id];
    onChange(next);
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "ค้นหาชื่อบ้าน / ทำเล...",
          className: "w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "max-h-64 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2", children: filtered.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 py-4 text-center", children: "ไม่พบทรัพย์" }) : filtered.map((p) => {
      const checked = selectedIds.includes(p.id);
      const priceText = p.isRental ? `${(p.price / 1e3).toFixed(0)}K บาท/เดือน` : `${(p.price / 1e6)?.toFixed(1) ?? "-"} ล้าน`;
      return /* @__PURE__ */ jsxs(
        "label",
        {
          className: `flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 ${checked ? "bg-blue-50" : ""}`,
          children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked,
                onChange: () => toggle(p.id),
                className: "rounded border-slate-300 text-blue-900 focus:ring-blue-900"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "flex-1 text-sm text-slate-800 truncate", children: p.title || "-" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500 shrink-0", children: priceText })
          ]
        },
        p.id
      );
    }) }),
    /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500", children: [
      "เลือกแล้ว ",
      selectedIds.length,
      " รายการ"
    ] })
  ] });
}
function QueryFilterForm({ criteria, onChange, properties }) {
  const count = useMemo(() => filterPropertiesByCriteria(properties, criteria).length, [properties, criteria]);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ราคาสูงสุด (บาท)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            min: "0",
            value: criteria.maxPrice ?? "",
            onChange: (e) => onChange({ ...criteria, maxPrice: e.target.value ? Number(e.target.value) : null }),
            placeholder: "เช่น 2000000",
            className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ราคาต่ำสุด (บาท)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            min: "0",
            value: criteria.minPrice ?? "",
            onChange: (e) => onChange({ ...criteria, minPrice: e.target.value ? Number(e.target.value) : null }),
            placeholder: "เช่น 500000",
            className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ทำเล (จังหวัด/อำเภอ)" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: criteria.location ?? "",
          onChange: (e) => onChange({ ...criteria, location: e.target.value || null }),
          placeholder: "เช่น อมตะ ชลบุรี",
          className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ประเภททรัพย์" }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: criteria.type ?? "",
          onChange: (e) => onChange({ ...criteria, type: e.target.value || null }),
          className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20",
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "ทั้งหมด" }),
            CATEGORIES.map((c) => /* @__PURE__ */ jsx("option", { value: c.value, children: c.label }, c.value))
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3", children: /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-yellow-900", children: [
      "จำนวนทรัพย์ที่จะแสดง: ",
      /* @__PURE__ */ jsx("span", { className: "text-yellow-700", children: count }),
      " รายการ"
    ] }) })
  ] });
}
function HomepageSectionsAdmin() {
  const [sections, setSections] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    targetTag: "",
    titleColor: "text-blue-900",
    isHighlighted: false,
    isBlinking: false,
    type: "manual",
    propertyIds: [],
    criteria: {}
  });
  useEffect(() => {
    const unsubS = getHomepageSectionsSnapshot(setSections, adminDb);
    const unsubP = getPropertiesSnapshot(setProperties, adminDb);
    setLoading(false);
    return () => {
      unsubS();
      unsubP();
    };
  }, []);
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 3e3);
      return () => clearTimeout(t);
    }
  }, [successMessage]);
  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 5e3);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = async (event) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const newList = arrayMove(sections, oldIdx, newIdx);
    setSections(newList);
    try {
      const updates = newList.map((s, i) => ({ id: s.id, order: i }));
      await batchUpdateHomepageSectionOrders(updates, adminDb);
      setSuccessMessage("สลับลำดับสำเร็จ");
    } catch (e) {
      setErrorMessage("เกิดข้อผิดพลาด: " + e.message);
    }
  };
  const resetForm = () => {
    setForm({
      title: "",
      subtitle: "",
      targetTag: "",
      titleColor: "text-blue-900",
      isHighlighted: false,
      isBlinking: false,
      type: "manual",
      propertyIds: [],
      criteria: {}
    });
    setEditingSection(null);
    setShowForm(false);
  };
  const handleEdit = (section) => {
    setEditingSection(section);
    setForm({
      title: section.title || "",
      subtitle: section.subtitle || "",
      targetTag: section.targetTag || "",
      titleColor: section.titleColor || "text-blue-900",
      isHighlighted: section.isHighlighted || false,
      isBlinking: section.isBlinking || false,
      type: section.type || "manual",
      propertyIds: section.propertyIds || [],
      criteria: section.criteria || {}
    });
    setShowForm(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!form.title.trim()) {
      setErrorMessage("กรุณาระบุชื่อหัวข้อ");
      return;
    }
    if (form.type === "manual" && (!form.propertyIds || form.propertyIds.length === 0)) {
      setErrorMessage("กรุณาเลือกทรัพย์อย่างน้อย 1 รายการ");
      return;
    }
    const targetTag = (form.targetTag || form.title || "").trim();
    const sectionTitle = form.title.trim();
    const payload = {
      title: sectionTitle,
      subtitle: form.subtitle.trim(),
      targetTag: targetTag || null,
      titleColor: form.titleColor || "text-blue-900",
      isHighlighted: form.isHighlighted || false,
      isBlinking: form.isBlinking || false,
      type: form.type,
      propertyIds: form.type === "manual" ? form.propertyIds : [],
      criteria: form.type === "query" ? form.criteria : {}
    };
    try {
      if (editingSection) {
        if (form.type === "manual" && sectionTitle) {
          const oldIds = editingSection.propertyIds || [];
          const newIds = form.propertyIds || [];
          const addedIds = newIds.filter((id) => !oldIds.includes(id));
          const removedIds = oldIds.filter((id) => !newIds.includes(id));
          const tagErrors = [];
          for (const id of addedIds) {
            try {
              await addTagToProperty(id, sectionTitle, adminDb);
            } catch (err) {
              console.error("addTagToProperty failed:", id, err);
              tagErrors.push(`เพิ่ม tag ให้ ${id}: ${err?.message || err}`);
            }
          }
          const oldTitle = (editingSection.title || "").trim();
          for (const id of removedIds) {
            try {
              await removeTagFromProperty(id, oldTitle);
            } catch (err) {
              console.error("removeTagFromProperty failed:", id, err);
              tagErrors.push(`ลบ tag จาก ${id}: ${err?.message || err}`);
            }
          }
          if (oldTitle && oldTitle !== sectionTitle && newIds.length > 0) {
            for (const id of newIds) {
              try {
                await removeTagFromProperty(id, oldTitle);
                await addTagToProperty(id, sectionTitle, adminDb);
              } catch (err) {
                console.error("updateTag failed:", id, err);
                tagErrors.push(`อัปเดต tag ให้ ${id}: ${err?.message || err}`);
              }
            }
          }
          if (tagErrors.length > 0) {
            setErrorMessage("Sync tag ไม่สมบูรณ์: " + tagErrors.join("; "));
          }
        }
        await updateHomepageSectionById(editingSection.id, {
          ...payload,
          isActive: editingSection.isActive ?? true
        }, adminDb);
        setSuccessMessage("อัปเดตหัวข้อสำเร็จ");
      } else {
        if (form.type === "manual" && sectionTitle) {
          const newIds = form.propertyIds || [];
          const tagErrors = [];
          for (const id of newIds) {
            try {
              await addTagToProperty(id, sectionTitle, adminDb);
            } catch (err) {
              console.error("addTagToProperty failed:", id, err);
              tagErrors.push(`เพิ่ม tag ให้ ${id}: ${err?.message || err}`);
            }
          }
          if (tagErrors.length > 0) {
            setErrorMessage("Sync tag ไม่สมบูรณ์: " + tagErrors.join("; "));
          }
        }
        const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order ?? 0)) + 1 : 0;
        await createHomepageSection({ ...payload, order: maxOrder, isActive: true }, adminDb);
        setSuccessMessage("เพิ่มหัวข้อสำเร็จ");
      }
      resetForm();
    } catch (err) {
      setErrorMessage("เกิดข้อผิดพลาด: " + err.message);
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("ต้องการลบหัวข้อนี้หรือไม่?")) return;
    setDeletingId(id);
    setErrorMessage(null);
    try {
      const section = sections.find((s) => s.id === id);
      if (section && section.type === "manual" && section.title) {
        const sectionTitle = (section.title || "").trim();
        const propertyIds = section.propertyIds || [];
        const tagErrors = [];
        for (const propertyId of propertyIds) {
          try {
            await removeTagFromProperty(propertyId, sectionTitle, adminDb);
          } catch (err) {
            console.error("removeTagFromProperty failed:", propertyId, err);
            tagErrors.push(`ลบ tag จาก ${propertyId}: ${err?.message || err}`);
          }
        }
        if (tagErrors.length > 0) {
          setErrorMessage("ลบหัวข้อแล้ว แต่ sync tag ไม่สมบูรณ์: " + tagErrors.join("; "));
        }
      }
      await deleteHomepageSectionById(id, adminDb);
      setSuccessMessage("ลบหัวข้อสำเร็จ");
    } catch (e) {
      setErrorMessage("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };
  const handleToggle = async (id, isActive) => {
    try {
      await updateHomepageSectionById(id, { isActive }, adminDb);
      setSuccessMessage(isActive ? "เปิดใช้งานสำเร็จ" : "ปิดใช้งานสำเร็จ");
    } catch (e) {
      setErrorMessage("เกิดข้อผิดพลาด: " + e.message);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-blue-900 mb-2", children: "จัดการหัวข้อหน้าแรก" }),
        /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "จัดลำดับและจัดการ Section แสดงสินค้าในหน้าแรก (เช่น ทรัพย์เด่น)" })
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
          className: "flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition disabled:opacity-50",
          children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" }),
            "เพิ่มหัวข้อ"
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
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setErrorMessage(null), className: "p-1 hover:bg-red-100 rounded", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4 text-red-600" }) })
    ] }),
    loading ? /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลด…" }) : /* @__PURE__ */ jsx(DndContext, { sensors, collisionDetection: closestCenter, onDragStart: () => setIsDragging(true), onDragEnd: handleDragEnd, children: /* @__PURE__ */ jsx(SortableContext, { items: sections.map((s) => s.id), strategy: rectSortingStrategy, children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: sections.map((section, idx) => /* @__PURE__ */ jsx(
      SortableSectionCard,
      {
        section,
        index: idx,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onToggle: handleToggle,
        isDeleting: deletingId
      },
      section.id
    )) }) }) }),
    sections.length === 0 && !loading && /* @__PURE__ */ jsxs("div", { className: "text-center py-12 bg-white rounded-xl border border-slate-200", children: [
      /* @__PURE__ */ jsx(LayoutList, { className: "h-16 w-16 mx-auto mb-4 text-slate-400" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-2", children: "ยังไม่มีหัวข้อ" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 mb-4", children: 'กด "เพิ่มหัวข้อ" เพื่อสร้าง Section แรก' }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => setShowForm(true),
          className: "px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition",
          children: "เพิ่มหัวข้อ"
        }
      )
    ] }),
    showForm && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto", children: /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto", children: /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-blue-900 mb-4", children: editingSection ? "แก้ไขหัวข้อ" : "เพิ่มหัวข้อใหม่" }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "ชื่อหัวข้อ *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: form.title,
              onChange: (e) => setForm((f) => ({ ...f, title: e.target.value })),
              placeholder: "เช่น ผ่อนตรงเจ้าของ ไม่เช็คเครดิตบูโร",
              className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              required: true
            }
          ),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
            /* @__PURE__ */ jsx("strong", { children: "หมายเหตุ:" }),
            " ชื่อหัวข้อนี้จะถูกใช้เป็น ",
            /* @__PURE__ */ jsx("strong", { children: "Tag" }),
            " อัตโนมัติสำหรับทรัพย์ที่เลือกในหัวข้อนี้"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "คำโปรย" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: form.subtitle,
              onChange: (e) => setForm((f) => ({ ...f, subtitle: e.target.value })),
              placeholder: "คำอธิบายสั้นๆ",
              className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Tag สำหรับ Filter (ปุ่มดูทั้งหมด) - ไม่บังคับ" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: form.targetTag,
              onChange: (e) => setForm((f) => ({ ...f, targetTag: e.target.value })),
              placeholder: "ถ้าไม่กรอกจะใช้ชื่อหัวข้อแทน",
              className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: 'Tag สำหรับปุ่ม "ดูทั้งหมด" (ถ้าไม่กรอกจะใช้ชื่อหัวข้อแทน)' })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-slate-200 pt-4", children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-3", children: "ปรับแต่งสไตล์ชื่อหัวข้อ" }),
          /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-slate-600 mb-2", children: "สีของชื่อหัวข้อ" }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: [
              { label: "น้ำเงิน (มาตรฐาน)", value: "text-blue-900", bg: "bg-blue-900" },
              { label: "แดง (Hot Deal)", value: "text-red-600", bg: "bg-red-600" },
              { label: "ทอง (Premium)", value: "text-yellow-600", bg: "bg-yellow-600" },
              { label: "เขียว (New)", value: "text-emerald-600", bg: "bg-emerald-600" },
              { label: "ม่วง (Special)", value: "text-purple-600", bg: "bg-purple-600" },
              { label: "ส้ม (Featured)", value: "text-orange-600", bg: "bg-orange-600" }
            ].map((opt) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setForm((f) => ({ ...f, titleColor: opt.value })),
                className: `relative w-10 h-10 rounded-full border-2 transition-all ${opt.bg} ${form.titleColor === opt.value ? "border-slate-900 scale-110 shadow-lg ring-2 ring-slate-300" : "border-transparent hover:scale-105 hover:shadow-md"}`,
                title: opt.label,
                children: form.titleColor === opt.value && /* @__PURE__ */ jsx(Check, { className: "absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" })
              },
              opt.value
            )) }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-2", children: "เลือกสีที่ต้องการสำหรับชื่อหัวข้อ" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: form.isHighlighted,
                onChange: (e) => setForm((f) => ({ ...f, isHighlighted: e.target.checked })),
                className: "w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-700", children: "ทำให้หัวข้อเด่นเป็นพิเศษ" })
          ] }) }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: "เมื่อเปิดใช้งาน จะแสดงเอฟเฟกต์พิเศษ เช่น Gradient หรือเส้นใต้หนาๆ" }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center gap-3 mt-3", children: /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: form.isBlinking,
                onChange: (e) => setForm((f) => ({ ...f, isBlinking: e.target.checked })),
                className: "w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-700", children: "ทำให้หัวข้อกระพริบ (Pulse)" })
          ] }) }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: "เมื่อเปิดใช้งาน ชื่อหัวข้อจะกระพริบอย่างนุ่มนวลเพื่อดึงดูดความสนใจ" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ประเภทการดึงข้อมูล" }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-4", children: [
            /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "radio",
                  name: "type",
                  value: "manual",
                  checked: form.type === "manual",
                  onChange: () => setForm((f) => ({ ...f, type: "manual", criteria: {} })),
                  className: "text-blue-900"
                }
              ),
              /* @__PURE__ */ jsx("span", { children: "เลือกเอง" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "radio",
                  name: "type",
                  value: "query",
                  checked: form.type === "query",
                  onChange: () => setForm((f) => ({ ...f, type: "query", propertyIds: [] })),
                  className: "text-blue-900"
                }
              ),
              /* @__PURE__ */ jsx("span", { children: "ดึงอัตโนมัติ" })
            ] })
          ] })
        ] }),
        form.type === "manual" && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "เลือกทรัพย์ *" }),
          /* @__PURE__ */ jsx(
            PropertySelector,
            {
              properties,
              selectedIds: form.propertyIds,
              onChange: (ids) => setForm((f) => ({ ...f, propertyIds: ids }))
            }
          ),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-2", children: [
            /* @__PURE__ */ jsx("strong", { children: "💡 สิ่งที่จะเกิดขึ้นเมื่อบันทึก:" }),
            /* @__PURE__ */ jsx("br", {}),
            "• ทรัพย์ที่ถูกเลือก → จะเพิ่ม ",
            /* @__PURE__ */ jsx("strong", { children: "ชื่อหัวข้อ" }),
            " เข้าไปใน customTags อัตโนมัติ",
            /* @__PURE__ */ jsx("br", {}),
            "• ทรัพย์ที่ถูกติ๊กออก → จะลบ ",
            /* @__PURE__ */ jsx("strong", { children: "ชื่อหัวข้อ" }),
            " ออกจาก customTags อัตโนมัติ",
            /* @__PURE__ */ jsx("br", {}),
            "• เมื่อลบหัวข้อ → จะลบ ",
            /* @__PURE__ */ jsx("strong", { children: "ชื่อหัวข้อ" }),
            " ออกจาก customTags ของทรัพย์ทั้งหมดในหัวข้อนี้"
          ] })
        ] }),
        form.type === "query" && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "เงื่อนไขการดึงข้อมูล" }),
          /* @__PURE__ */ jsx(
            QueryFilterForm,
            {
              criteria: form.criteria,
              onChange: (c) => setForm((f) => ({ ...f, criteria: c })),
              properties
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-3 pt-4", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: resetForm,
              className: "flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium",
              children: "ยกเลิก"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              className: "flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-medium",
              children: editingSection ? "บันทึก" : "เพิ่ม"
            }
          )
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  HomepageSectionsAdmin as default
};
