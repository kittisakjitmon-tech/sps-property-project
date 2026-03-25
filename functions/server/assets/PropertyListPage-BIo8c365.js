import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { u as useAdminAuth, c as getPropertiesSnapshot, m as getPropertyLabel, f as formatPrice } from "./server-build-C8MEOO73.js";
import { Plus, Search, Trash2, FileText, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import "react-dom/server";
import "isbot";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function getStatusBadges(property) {
  const badges = [];
  const listingType = property.listingType || (property.isRental ? "rent" : "sale");
  if (listingType === "sale") {
    const propertyCondition = property.propertyCondition || property.propertySubStatus;
    if (propertyCondition === "มือ 1") {
      badges.push({ label: "มือ 1", color: "bg-blue-100 text-blue-800" });
    } else if (propertyCondition === "มือ 2") {
      badges.push({ label: "มือ 2", color: "bg-blue-100 text-blue-800" });
    }
    const availability = property.availability || property.status;
    if (availability === "available" || availability === "ว่าง") {
      badges.push({ label: "ว่าง", color: "bg-green-100 text-green-800" });
    } else if (availability === "sold" || availability === "ขายแล้ว") {
      badges.push({ label: "ขายแล้ว", color: "bg-red-100 text-red-800" });
    } else if (availability === "reserved" || availability === "ติดจอง") {
      badges.push({ label: "ติดจอง", color: "bg-orange-100 text-orange-800" });
    } else if (availability === "pending" || availability === "รออนุมัติ") {
      badges.push({ label: "รออนุมัติ", color: "bg-yellow-100 text-yellow-800" });
    } else if (availability) {
      badges.push({ label: String(availability), color: "bg-slate-100 text-slate-700" });
    }
  } else if (listingType === "rent") {
    const subListingType = property.subListingType;
    if (subListingType === "rent_only") {
      badges.push({ label: "เช่า", color: "bg-purple-100 text-purple-800" });
    } else if (subListingType === "installment_only") {
      badges.push({ label: "ผ่อนตรง", color: "bg-purple-100 text-purple-800" });
    } else if (property.directInstallment) {
      badges.push({ label: "ผ่อนตรง", color: "bg-purple-100 text-purple-800" });
    } else {
      badges.push({ label: "เช่า", color: "bg-purple-100 text-purple-800" });
    }
    const availability = property.availability;
    if (availability === "available" || availability === "ว่าง") {
      badges.push({ label: "ว่าง", color: "bg-green-100 text-green-800" });
    } else if (availability === "reserved" || availability === "ติดจอง") {
      badges.push({ label: "ติดจอง", color: "bg-red-100 text-red-800" });
    } else if (availability === "unavailable" || availability === "ไม่ว่าง") {
      badges.push({ label: "ไม่ว่าง", color: "bg-red-100 text-red-800" });
    } else if (availability) {
      badges.push({ label: String(availability), color: "bg-slate-100 text-slate-700" });
    }
  } else {
    const status = property.status;
    if (status === "available") {
      badges.push({ label: "ว่าง", color: "bg-green-100 text-green-800" });
    } else if (status === "reserved") {
      badges.push({ label: "ติดจอง", color: "bg-orange-100 text-orange-800" });
    } else if (status === "sold") {
      badges.push({ label: "ขายแล้ว", color: "bg-red-100 text-red-800" });
    } else if (status === "pending") {
      badges.push({ label: "รออนุมัติ", color: "bg-yellow-100 text-yellow-800" });
    } else if (status) {
      badges.push({ label: String(status), color: "bg-slate-100 text-slate-700" });
    }
  }
  if (badges.length === 0) {
    badges.push({ label: "-", color: "bg-slate-100 text-slate-700" });
  }
  return badges;
}
function PropertyListPage() {
  const authContext = useAdminAuth();
  const user = authContext?.user || null;
  const isAdmin = authContext?.isAdmin || (() => false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    // ประเภททรัพย์ (เช่น บ้านเดี่ยว, คอนโด)
    listingType: "",
    // ประเภทการดีล (sale, rent)
    propertyCondition: "",
    // สภาพบ้าน (มือ 1, มือ 2) - สำหรับ sale
    subListingType: "",
    // รูปแบบ (rent_only, installment_only) - สำหรับ rent
    availability: "",
    // สถานะ (available, sold, reserved)
    project: "",
    // โครงการ
    // Backward compatibility fields
    assetType: "",
    // ประเภทสินทรัพย์ (มือ 1, มือ 2) - สำหรับข้อมูลเก่า
    status: "",
    // สถานะ (ว่าง, ติดจอง, ขายแล้ว, รออนุมัติ) - สำหรับข้อมูลเก่า
    category: ""
    // หมวดหมู่ (ซื้อ, เช่า) - สำหรับข้อมูลเก่า
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  useEffect(() => {
    let isMounted = true;
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      let adminCheck = false;
      try {
        adminCheck = isAdmin && typeof isAdmin === "function" ? isAdmin() : false;
      } catch (error) {
        console.error("PropertyListPage: isAdmin check error in useEffect:", error);
        adminCheck = false;
      }
      if (!adminCheck) {
        setLoading(false);
        return;
      }
      const unsub = getPropertiesSnapshot((allProperties) => {
        if (!isMounted) return;
        try {
          if (Array.isArray(allProperties)) {
            setProperties(allProperties);
          } else {
            setProperties([]);
          }
        } catch (error) {
          console.error("PropertyListPage: Error setting properties:", error);
          setProperties([]);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      });
      return () => {
        isMounted = false;
        try {
          if (unsub && typeof unsub === "function") {
            unsub();
          }
        } catch (error) {
          console.error("PropertyListPage: Error unsubscribing:", error);
        }
      };
    } catch (error) {
      console.error("PropertyListPage: Error loading properties:", error);
      if (isMounted) {
        setProperties([]);
        setLoading(false);
      }
    }
  }, [user, isAdmin]);
  const filteredProperties = useMemo(() => {
    try {
      if (!Array.isArray(properties)) {
        return [];
      }
      let filtered = [...properties];
      if (searchTerm && typeof searchTerm === "string" && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        filtered = filtered.filter((p) => {
          try {
            if (!p || typeof p !== "object") return false;
            const titleMatch = p.title?.toLowerCase().includes(searchLower) || false;
            const idMatch = (p.displayId || p.propertyId || "").toLowerCase().includes(searchLower) || false;
            const typeLabelMatch = getPropertyLabel(p.type).toLowerCase().includes(searchLower) || false;
            return titleMatch || idMatch || typeLabelMatch;
          } catch {
            return false;
          }
        });
      }
      if (filters?.type) {
        filtered = filtered.filter((p) => {
          try {
            return p?.type === filters.type;
          } catch {
            return false;
          }
        });
      }
      if (filters?.listingType) {
        filtered = filtered.filter((p) => {
          try {
            const pListingType = p?.listingType || (p?.isRental ? "rent" : "sale");
            return pListingType === filters.listingType;
          } catch {
            return false;
          }
        });
      }
      if (filters?.propertyCondition && filters.listingType === "sale") {
        filtered = filtered.filter((p) => {
          try {
            const pCondition = p?.propertyCondition || p?.propertySubStatus;
            return pCondition === filters.propertyCondition;
          } catch {
            return false;
          }
        });
      }
      if (filters?.subListingType && filters.listingType === "rent") {
        filtered = filtered.filter((p) => {
          try {
            if (p?.subListingType) {
              return p.subListingType === filters.subListingType;
            } else if (filters.subListingType === "installment_only") {
              return p?.directInstallment === true;
            } else if (filters.subListingType === "rent_only") {
              return !p?.directInstallment || p.directInstallment === false;
            }
            return false;
          } catch {
            return false;
          }
        });
      }
      if (filters?.availability) {
        filtered = filtered.filter((p) => {
          try {
            const pAvailability = p?.availability || p?.status;
            return pAvailability === filters.availability;
          } catch {
            return false;
          }
        });
      }
      if (filters?.project) {
        filtered = filtered.filter((p) => {
          try {
            const pProject = p?.project && typeof p.project === "string" ? p.project.trim() : "";
            return pProject === filters.project;
          } catch {
            return false;
          }
        });
      }
      if (filters?.assetType && !filters.propertyCondition) {
        filtered = filtered.filter((p) => {
          try {
            const pCondition = p?.propertyCondition || p?.propertySubStatus;
            return pCondition === filters.assetType;
          } catch {
            return false;
          }
        });
      }
      if (filters?.status && !filters.availability) {
        filtered = filtered.filter((p) => {
          try {
            const pStatus = p?.availability || p?.status;
            if (filters.status === "available-rental") {
              return p?.isRental && pStatus === "available";
            } else if (filters.status === "unavailable-rental") {
              return p?.isRental && (pStatus === "unavailable" || pStatus === "reserved");
            } else {
              return !p?.isRental && pStatus === filters.status;
            }
          } catch {
            return false;
          }
        });
      }
      if (filters?.category && !filters.listingType) {
        if (filters.category === "buy") {
          filtered = filtered.filter((p) => {
            try {
              return !p?.isRental;
            } catch {
              return false;
            }
          });
        } else if (filters.category === "rent") {
          filtered = filtered.filter((p) => {
            try {
              return p?.isRental;
            } catch {
              return false;
            }
          });
        }
      }
      return Array.isArray(filtered) ? filtered : [];
    } catch (error) {
      console.error("PropertyListPage: Filtering error:", error);
      return [];
    }
  }, [properties, searchTerm, filters]);
  useEffect(() => {
    try {
      setCurrentPage(1);
    } catch (error) {
      console.error("PropertyListPage: Error resetting page:", error);
    }
  }, [searchTerm, filters]);
  const filteredLength = Array.isArray(filteredProperties) ? filteredProperties.length : 0;
  const totalPages = Math.max(1, Math.ceil(filteredLength / itemsPerPage));
  const paginatedProperties = useMemo(() => {
    try {
      if (!Array.isArray(filteredProperties)) {
        return [];
      }
      const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
      const endIndex = Math.min(startIndex + itemsPerPage, filteredProperties.length);
      return filteredProperties.slice(startIndex, endIndex);
    } catch (error) {
      console.error("PropertyListPage: Pagination error:", error);
      return [];
    }
  }, [filteredProperties, currentPage, itemsPerPage]);
  const available = useMemo(() => {
    try {
      return Array.isArray(filteredProperties) ? filteredProperties.filter((p) => p?.status === "available") : [];
    } catch {
      return [];
    }
  }, [filteredProperties]);
  const pending = useMemo(() => {
    try {
      return Array.isArray(filteredProperties) ? filteredProperties.filter((p) => p?.status === "pending") : [];
    } catch {
      return [];
    }
  }, [filteredProperties]);
  const sold = useMemo(() => {
    try {
      return Array.isArray(filteredProperties) ? filteredProperties.filter((p) => p?.status === "sold") : [];
    } catch {
      return [];
    }
  }, [filteredProperties]);
  const reserved = useMemo(() => {
    try {
      return Array.isArray(filteredProperties) ? filteredProperties.filter((p) => p?.status === "reserved") : [];
    } catch {
      return [];
    }
  }, [filteredProperties]);
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilters({
      type: "",
      listingType: "",
      propertyCondition: "",
      subListingType: "",
      availability: "",
      project: "",
      assetType: "",
      status: "",
      category: ""
    });
    setCurrentPage(1);
  };
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const uniqueTypes = useMemo(() => {
    try {
      const safeProps = Array.isArray(properties) ? properties : [];
      if (safeProps.length === 0) return [];
      const types = new Set(safeProps.map((p) => p?.type).filter(Boolean));
      return Array.from(types).sort();
    } catch (error) {
      console.error("PropertyListPage: uniqueTypes error:", error);
      return [];
    }
  }, [properties]);
  const uniqueProjects = useMemo(() => {
    try {
      const safeProps = Array.isArray(properties) ? properties : [];
      if (safeProps.length === 0) return [];
      const projects = safeProps.map((p) => p?.project).filter((p) => p && typeof p === "string" && p.trim()).map((p) => p.trim());
      return [...new Set(projects)].sort((a, b) => a.localeCompare(b, "th"));
    } catch (error) {
      console.error("PropertyListPage: uniqueProjects error:", error);
      return [];
    }
  }, [properties]);
  const safeProperties = Array.isArray(properties) ? properties : [];
  let hasAdminAccess = false;
  try {
    hasAdminAccess = isAdmin && typeof isAdmin === "function" ? isAdmin() : false;
  } catch (error) {
    console.error("PropertyListPage: isAdmin check error:", error);
    hasAdminAccess = false;
  }
  if (!hasAdminAccess) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto p-6", children: /* @__PURE__ */ jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-red-700", children: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้านี้ได้" }) }) });
  }
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-6xl mx-auto", children: /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลดข้อมูล…" }) });
  }
  try {
    return /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto p-4 sm:p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl sm:text-3xl font-bold text-blue-900 mb-1 truncate", children: "จัดการทรัพย์" }),
          /* @__PURE__ */ jsxs("p", { className: "text-slate-600 text-sm", children: [
            "รายการประกาศทั้งหมด (",
            safeProperties.length,
            " รายการ)"
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          Link,
          {
            to: "/sps-internal-admin/properties/new",
            className: "flex items-center gap-2 px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition shrink-0",
            children: [
              /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" }),
              "เพิ่มประกาศใหม่"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-1", children: "ว่าง" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-green-600", children: available.length })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-1", children: "ติดจอง" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-yellow-600", children: reserved.length })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-1", children: "ขายแล้ว" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-blue-600", children: sold.length })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 mb-1", children: "รออนุมัติ" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-orange-600", children: pending.length })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-6 mb-6", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: searchTerm,
              onChange: handleSearchChange,
              placeholder: "ค้นหาด้วยชื่อโครงการ หรือ รหัสทรัพย์ (เช่น SPS-TW-90)...",
              className: "w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ประเภททรัพย์" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: filters.type,
                onChange: (e) => handleFilterChange("type", e.target.value),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "ทั้งหมด" }),
                  uniqueTypes.map((type) => /* @__PURE__ */ jsx("option", { value: type, children: getPropertyLabel(type) }, type))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "ประเภทการดีล" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: filters.listingType,
                onChange: (e) => {
                  const newListingType = e.target.value;
                  handleFilterChange("listingType", newListingType);
                  if (newListingType !== "sale") {
                    handleFilterChange("propertyCondition", "");
                  }
                  if (newListingType !== "rent") {
                    handleFilterChange("subListingType", "");
                  }
                },
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "ทั้งหมด" }),
                  /* @__PURE__ */ jsx("option", { value: "sale", children: "ซื้อ" }),
                  /* @__PURE__ */ jsx("option", { value: "rent", children: "เช่า/ผ่อนตรง" })
                ]
              }
            )
          ] }),
          filters.listingType === "sale" ? /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "สภาพ" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: filters.propertyCondition,
                onChange: (e) => handleFilterChange("propertyCondition", e.target.value),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "ทั้งหมด" }),
                  /* @__PURE__ */ jsx("option", { value: "มือ 1", children: "มือ 1" }),
                  /* @__PURE__ */ jsx("option", { value: "มือ 2", children: "มือ 2" })
                ]
              }
            )
          ] }) : filters.listingType === "rent" ? /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "รูปแบบ" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: filters.subListingType,
                onChange: (e) => handleFilterChange("subListingType", e.target.value),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "ทั้งหมด" }),
                  /* @__PURE__ */ jsx("option", { value: "rent_only", children: "เช่าเท่านั้น" }),
                  /* @__PURE__ */ jsx("option", { value: "installment_only", children: "ผ่อนตรง" })
                ]
              }
            )
          ] }) : /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "สภาพ/รูปแบบ" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                disabled: true,
                className: "w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed",
                children: /* @__PURE__ */ jsx("option", { value: "", children: "เลือกประเภทการดีลก่อน" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "สถานะ" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: filters.availability,
                onChange: (e) => handleFilterChange("availability", e.target.value),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "ทั้งหมด" }),
                  /* @__PURE__ */ jsx("option", { value: "available", children: "ว่าง" }),
                  /* @__PURE__ */ jsx("option", { value: "sold", children: "ขายแล้ว" }),
                  /* @__PURE__ */ jsx("option", { value: "reserved", children: "ติดจอง" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "โครงการ" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: filters.project,
                onChange: (e) => handleFilterChange("project", e.target.value),
                className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "ทั้งหมด" }),
                  uniqueProjects.map((project) => /* @__PURE__ */ jsx("option", { value: project, children: project }, project))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleResetFilters,
              className: "w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition border border-slate-300 flex items-center justify-center gap-2",
              children: [
                /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }),
                "Reset Filters"
              ]
            }
          ) })
        ] }),
        (searchTerm || filters.type || filters.listingType || filters.propertyCondition || filters.subListingType || filters.availability || filters.project) && /* @__PURE__ */ jsx("div", { className: "mt-4 pt-4 border-t border-slate-200", children: /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mb-2", children: [
          "Active Filters: ",
          [
            searchTerm && `ค้นหา: "${searchTerm}"`,
            filters.type && `ประเภท: ${getPropertyLabel(filters.type)}`,
            filters.listingType && `ดีล: ${filters.listingType === "sale" ? "ซื้อ" : "เช่า/ผ่อนตรง"}`,
            filters.propertyCondition && `สภาพ: ${filters.propertyCondition}`,
            filters.subListingType && `รูปแบบ: ${filters.subListingType === "rent_only" ? "เช่าเท่านั้น" : "ผ่อนตรง"}`,
            filters.availability && `สถานะ: ${filters.availability === "available" ? "ว่าง" : filters.availability === "sold" ? "ขายแล้ว" : "ติดจอง"}`,
            filters.project && `โครงการ: ${filters.project}`
          ].filter(Boolean).join(" • ")
        ] }) })
      ] }),
      safeProperties.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-12 text-center", children: [
        /* @__PURE__ */ jsx(FileText, { className: "h-16 w-16 mx-auto mb-4 text-slate-400" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-medium text-slate-700 mb-2", children: "ยังไม่มีประกาศ" }),
        /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-6", children: "เริ่มต้นด้วยการเพิ่มประกาศแรก" }),
        /* @__PURE__ */ jsxs(
          Link,
          {
            to: "/sps-internal-admin/properties/new",
            className: "inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition",
            children: [
              /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" }),
              "เพิ่มประกาศใหม่"
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden mb-4", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50/80 text-left text-xs font-medium text-slate-600 uppercase tracking-wider", children: [
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 whitespace-nowrap", children: "ID" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3", children: "ชื่อประกาศ" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 whitespace-nowrap", children: "ประเภท" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 whitespace-nowrap", children: "โครงการ" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 whitespace-nowrap", children: "สถานะ" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 whitespace-nowrap text-right", children: "ราคา" }),
            /* @__PURE__ */ jsx("th", { className: "px-6 py-3 whitespace-nowrap text-center", children: "แก้ไข" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: paginatedProperties.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsxs("td", { colSpan: 7, className: "px-6 py-12 text-center text-slate-500", children: [
            /* @__PURE__ */ jsx(FileText, { className: "h-12 w-12 mx-auto mb-3 text-slate-400" }),
            /* @__PURE__ */ jsx("p", { className: "text-lg font-medium", children: "ไม่พบข้อมูลที่ค้นหา" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm mt-1", children: "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" })
          ] }) }) : paginatedProperties.map((property, index) => {
            if (!property || !property.id) {
              return null;
            }
            try {
              const badges = getStatusBadges(property);
              const loc = property.location || {};
              return /* @__PURE__ */ jsxs("tr", { className: "border-t border-slate-100 hover:bg-slate-50/50 transition-colors", children: [
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 font-mono text-sm font-medium text-slate-800 whitespace-nowrap", children: property.displayId || property.propertyId || "-" }),
                /* @__PURE__ */ jsxs("td", { className: "px-6 py-4", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-800 line-clamp-2", children: property.title }),
                  /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-0.5", children: [
                    loc.district,
                    ", ",
                    loc.province
                  ] })
                ] }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-slate-600 text-sm whitespace-nowrap", children: getPropertyLabel(property.type) }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-slate-600 text-sm", children: property.project ? /* @__PURE__ */ jsx("span", { className: "inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200", children: property.project }) : /* @__PURE__ */ jsx("span", { className: "text-slate-400 text-xs", children: "-" }) }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "flex gap-2 flex-wrap", children: badges.map((badge, index2) => /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: `inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${badge.color}`,
                    children: badge.label
                  },
                  index2
                )) }) }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-right text-slate-700 text-sm whitespace-nowrap", children: formatPrice(property.price, property.isRental, true) }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxs(
                  Link,
                  {
                    to: `/sps-internal-admin/properties/edit/${property.id}`,
                    className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-900 font-medium hover:bg-blue-100 transition",
                    "aria-label": `แก้ไข ${property.title}`,
                    children: [
                      /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4" }),
                      "แก้ไข"
                    ]
                  }
                ) })
              ] }, property.id);
            } catch (error) {
              console.error("PropertyListPage: Error rendering property row:", error, property);
              return null;
            }
          }).filter(Boolean) })
        ] }) }) }),
        filteredProperties.length > 0 && /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-sm text-slate-600", children: [
            "แสดง",
            " ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-800", children: filteredProperties.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1 }),
            " - ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-800", children: Math.min(currentPage * itemsPerPage, filteredProperties.length) }),
            " จากทั้งหมด ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-800", children: filteredProperties.length.toLocaleString("th-TH") }),
            " ",
            "รายการ"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => handlePageChange(currentPage - 1),
                disabled: currentPage === 1,
                className: `flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === 1 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`,
                children: [
                  /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
                  "ก่อนหน้า"
                ]
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1", children: Array.from({ length: totalPages }, (_, i) => i + 1).filter((page) => {
              return page === 1 || page === totalPages || page >= currentPage - 1 && page <= currentPage + 1;
            }).map((page, index, array) => {
              const prevPage = array[index - 1];
              const showEllipsis = prevPage && page - prevPage > 1;
              return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                showEllipsis && /* @__PURE__ */ jsx("span", { className: "px-2 text-slate-400", children: "..." }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => handlePageChange(page),
                    className: `px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === page ? "bg-blue-900 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`,
                    children: page
                  }
                )
              ] }, page);
            }) }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => handlePageChange(currentPage + 1),
                disabled: currentPage === totalPages,
                className: `flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === totalPages ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`,
                children: [
                  "ถัดไป",
                  /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" })
                ]
              }
            )
          ] })
        ] })
      ] })
    ] });
  } catch (error) {
    console.error("PropertyListPage: Render error:", error);
    return /* @__PURE__ */ jsx("div", { className: "max-w-6xl mx-auto p-6", children: /* @__PURE__ */ jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-red-800 mb-2", children: "เกิดข้อผิดพลาด" }),
      /* @__PURE__ */ jsx("p", { className: "text-red-700", children: error?.message || "Unknown error" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => window.location.reload(),
          className: "mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700",
          children: "รีเฟรชหน้า"
        }
      )
    ] }) });
  }
}
export {
  PropertyListPage as default
};
