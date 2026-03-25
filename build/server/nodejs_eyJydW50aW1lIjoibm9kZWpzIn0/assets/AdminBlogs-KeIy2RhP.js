import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Plus, Eye, EyeOff, Star, StarOff, Edit2, Trash2, X, ImagePlus } from "lucide-react";
import { a3 as getBlogsSnapshot, K as compressImage, a4 as uploadBlogImage, z as adminStorage, a5 as updateBlogById, o as adminDb, a6 as createBlog, a7 as deleteBlogById } from "./server-build-DQWFMthd.js";
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
const MAX_FEATURED_BLOGS = 4;
function AdminBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    youtubeUrl: "",
    images: [],
    published: false,
    isFeatured: false
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  useEffect(() => {
    const unsubscribe = getBlogsSnapshot((blogsList) => {
      setBlogs(blogsList);
      setLoading(false);
    }, adminDb);
    return () => unsubscribe();
  }, []);
  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      youtubeUrl: "",
      images: [],
      published: false,
      isFeatured: false
    });
    setEditingBlog(null);
    setShowForm(false);
  };
  const handleEdit = (blog) => {
    setEditingBlog(blog);
    setForm({
      title: blog.title || "",
      content: blog.content || "",
      youtubeUrl: blog.youtubeUrl || "",
      images: blog.images || [],
      published: blog.published ?? false,
      isFeatured: blog.isFeatured ?? false
    });
    setShowForm(true);
  };
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const compressedFiles = await Promise.all(
        Array.from(files).map((file) => compressImage(file, { maxWidth: 1920, maxHeight: 1920 }))
      );
      const uploadPromises = compressedFiles.map((file) => uploadBlogImage(file, void 0, adminStorage));
      const urls = await Promise.all(uploadPromises);
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));
      setSuccessMessage(`อัปโหลดรูปภาพสำเร็จ ${urls.length} รูป`);
      setTimeout(() => setSuccessMessage(null), 3e3);
    } catch (error) {
      console.error("Error uploading images:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
      setTimeout(() => setErrorMessage(null), 5e3);
    } finally {
      setUploadingImages(false);
    }
  };
  const handleRemoveImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!form.title.trim()) {
      setErrorMessage("กรุณากรอกหัวข้อบทความ");
      return;
    }
    const featuredCountExcludingCurrent = blogs.filter(
      (blog) => blog.isFeatured && blog.id !== editingBlog?.id
    ).length;
    if (form.isFeatured && featuredCountExcludingCurrent >= MAX_FEATURED_BLOGS) {
      setErrorMessage(`สามารถตั้งค่า Featured ได้สูงสุด ${MAX_FEATURED_BLOGS} บทความ`);
      setTimeout(() => setErrorMessage(null), 5e3);
      return;
    }
    try {
      if (editingBlog) {
        await updateBlogById(editingBlog.id, {
          title: form.title.trim(),
          content: form.content.trim(),
          youtubeUrl: form.youtubeUrl.trim(),
          images: form.images,
          published: form.published,
          isFeatured: form.isFeatured
        }, adminDb);
        setSuccessMessage("อัปเดตบทความสำเร็จ");
        setTimeout(() => setSuccessMessage(null), 3e3);
      } else {
        await createBlog({
          title: form.title.trim(),
          content: form.content.trim(),
          youtubeUrl: form.youtubeUrl.trim(),
          images: form.images,
          published: form.published,
          isFeatured: form.isFeatured
        }, adminDb);
        setSuccessMessage("สร้างบทความสำเร็จ");
        setTimeout(() => setSuccessMessage(null), 3e3);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving blog:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการบันทึก");
      setTimeout(() => setErrorMessage(null), 5e3);
    }
  };
  const handleTogglePublished = async (blogId, currentStatus) => {
    try {
      await updateBlogById(blogId, { published: !currentStatus }, adminDb);
      setSuccessMessage(`${!currentStatus ? "เผยแพร่" : "ยกเลิกการเผยแพร่"} บทความสำเร็จ`);
      setTimeout(() => setSuccessMessage(null), 3e3);
    } catch (error) {
      console.error("Error toggling published:", error);
      setErrorMessage("เกิดข้อผิดพลาด");
      setTimeout(() => setErrorMessage(null), 5e3);
    }
  };
  const handleToggleFeatured = async (blogId, currentStatus) => {
    try {
      if (!currentStatus) {
        const featuredCount = blogs.filter((b) => b.isFeatured && b.id !== blogId).length;
        if (featuredCount >= MAX_FEATURED_BLOGS) {
          setErrorMessage(`สามารถตั้งค่า Featured ได้สูงสุด ${MAX_FEATURED_BLOGS} บทความ`);
          setTimeout(() => setErrorMessage(null), 5e3);
          return;
        }
      }
      await updateBlogById(blogId, { isFeatured: !currentStatus }, adminDb);
      setSuccessMessage(`${!currentStatus ? "ตั้งเป็น" : "ยกเลิก"} Featured สำเร็จ`);
      setTimeout(() => setSuccessMessage(null), 3e3);
    } catch (error) {
      console.error("Error toggling featured:", error);
      setErrorMessage("เกิดข้อผิดพลาด");
      setTimeout(() => setErrorMessage(null), 5e3);
    }
  };
  const handleDelete = async (blogId) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบทความนี้?")) return;
    try {
      await deleteBlogById(blogId, adminDb);
      setSuccessMessage("ลบบทความสำเร็จ");
      setTimeout(() => setSuccessMessage(null), 3e3);
    } catch (error) {
      console.error("Error deleting blog:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการลบ");
      setTimeout(() => setErrorMessage(null), 5e3);
    }
  };
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "p-6", children: /* @__PURE__ */ jsxs("div", { className: "animate-pulse space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 bg-slate-200 rounded w-1/4" }),
      /* @__PURE__ */ jsx("div", { className: "h-64 bg-slate-200 rounded" })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-6", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-slate-900", children: "จัดการบทความ" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-600 mt-1", children: "เพิ่ม แก้ไข และจัดการบทความของคุณ" })
    ] }) }),
    successMessage && /* @__PURE__ */ jsx("div", { className: "mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800", children: successMessage }),
    errorMessage && /* @__PURE__ */ jsx("div", { className: "mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800", children: errorMessage }),
    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-end mb-6", children: /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => setShowForm(true),
        className: "flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition",
        children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" }),
          "เพิ่มบทความใหม่"
        ]
      }
    ) }),
    /* @__PURE__ */ jsx("div", { className: "bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 border-b border-slate-200", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider", children: "หัวข้อ" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider", children: "วันที่สร้าง" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider", children: "สถานะ" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider", children: "Featured" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider", children: "จัดการ" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "bg-white divide-y divide-slate-200", children: blogs.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: "5", className: "px-6 py-12 text-center text-slate-500", children: "ยังไม่มีบทความ" }) }) : blogs.map((blog) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50", children: [
        /* @__PURE__ */ jsxs("td", { className: "px-6 py-4", children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: blog.title || "-" }),
          /* @__PURE__ */ jsxs("div", { className: "text-sm text-slate-500 mt-1 line-clamp-1", children: [
            blog.content?.substring(0, 100),
            "..."
          ] })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-sm text-slate-600", children: formatDate(blog.createdAt) }),
        /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => handleTogglePublished(blog.id, blog.published),
            className: `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition ${blog.published ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
            children: [
              blog.published ? /* @__PURE__ */ jsx(Eye, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(EyeOff, { className: "h-3 w-3" }),
              blog.published ? "เผยแพร่" : "ไม่เผยแพร่"
            ]
          }
        ) }),
        /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => handleToggleFeatured(blog.id, blog.isFeatured),
            className: `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition ${blog.isFeatured ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
            children: [
              blog.isFeatured ? /* @__PURE__ */ jsx(Star, { className: "h-3 w-3 fill-current" }) : /* @__PURE__ */ jsx(StarOff, { className: "h-3 w-3" }),
              blog.isFeatured ? "Featured" : "ไม่ Featured"
            ]
          }
        ) }),
        /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => handleEdit(blog),
              className: "p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition",
              title: "แก้ไข",
              children: /* @__PURE__ */ jsx(Edit2, { className: "h-4 w-4" })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => handleDelete(blog.id),
              className: "p-2 text-red-600 hover:bg-red-50 rounded-lg transition",
              title: "ลบ",
              children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
            }
          )
        ] }) })
      ] }, blog.id)) })
    ] }) }) }),
    showForm && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-slate-900", children: editingBlog ? "แก้ไขบทความ" : "เพิ่มบทความใหม่" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: resetForm,
            className: "p-2 hover:bg-slate-100 rounded-lg transition",
            children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "หัวข้อบทความ *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: form.title,
              onChange: (e) => setForm({ ...form, title: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "เนื้อหาบทความ" }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              value: form.content,
              onChange: (e) => setForm({ ...form, content: e.target.value }),
              rows: 10,
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "เขียนเนื้อหาบทความที่นี่..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ลิงก์วิดีโอ YouTube (ไม่บังคับ)" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "url",
              value: form.youtubeUrl,
              onChange: (e) => setForm({ ...form, youtubeUrl: e.target.value }),
              className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20",
              placeholder: "https://www.youtube.com/watch?v=..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "รูปภาพ" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("label", { className: "flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 transition", children: [
              /* @__PURE__ */ jsx(ImagePlus, { className: "h-5 w-5 text-slate-600" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm text-slate-600", children: uploadingImages ? "กำลังอัปโหลด…" : "คลิกเพื่ออัปโหลดรูปภาพ" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "file",
                  multiple: true,
                  accept: "image/*",
                  onChange: (e) => handleImageUpload(e.target.files),
                  disabled: uploadingImages,
                  className: "hidden"
                }
              )
            ] }) }),
            form.images.length > 0 && /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: form.images.map((url, index) => /* @__PURE__ */ jsxs("div", { className: "relative group", children: [
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: url,
                  alt: `Preview ${index + 1}`,
                  className: "w-full h-32 object-cover rounded-lg"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handleRemoveImage(index),
                  className: "absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition",
                  children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
                }
              )
            ] }, index)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-6", children: [
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: form.published,
                onChange: (e) => setForm({ ...form, published: e.target.checked }),
                className: "w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-700", children: "เผยแพร่" })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: form.isFeatured,
                onChange: (e) => setForm({ ...form, isFeatured: e.target.checked }),
                className: "w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-700", children: "แสดงหน้าแรก (Featured)" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-3 pt-4 border-t border-slate-200", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: resetForm,
              className: "px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition",
              children: "ยกเลิก"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              className: "px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition",
              children: editingBlog ? "บันทึกการแก้ไข" : "สร้างบทความ"
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
export {
  AdminBlogs as default
};
