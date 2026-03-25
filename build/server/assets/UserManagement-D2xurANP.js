import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from "react";
import { W as app, d as db, u as useAdminAuth, p as adminDb, X as createAuditLog } from "./server-build-D_48fWql.js";
import { collection, onSnapshot, getFirestore, setDoc, doc, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, deleteUser as deleteUser$1 } from "firebase/auth";
import { X, UserPlus, Mail, Lock, AlertCircle, Shield, Check, UserCheck, User, Ban, Search, Filter, CheckCircle, Trash2, Users } from "lucide-react";
import "node:stream";
import "@react-router/node";
import "react-router";
import "isbot";
import "react-dom/server";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function usersDb(override) {
  return override || db;
}
const USERS = "users";
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function getUsersSnapshot(callback, firestore) {
  const firestoreDb = usersDb(firestore);
  const q = collection(firestoreDb, USERS);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    callback(list);
  });
}
async function createUserWithPassword({
  email,
  password,
  role = "member",
  status = "active"
}) {
  const normalized = normalizeEmail(email);
  const pass = String(password || "");
  if (!normalized) throw new Error("กรุณากรอกอีเมล");
  if (pass.length < 6) throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
  const config = app.options;
  const tempAppName = `member-create-${Date.now()}`;
  const tempApp = initializeApp(config, tempAppName);
  const tempAuth = getAuth(tempApp);
  const tempDb = getFirestore(tempApp);
  let createdUid = null;
  try {
    const cred = await createUserWithEmailAndPassword(tempAuth, normalized, pass);
    createdUid = cred.user.uid;
    const emailUsername = normalized.split("@")[0] || normalized.replace(/[^a-zA-Z0-9]/g, "");
    await setDoc(doc(tempDb, USERS, createdUid), {
      email: normalized,
      role,
      status,
      username: emailUsername,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await signOut(tempAuth);
    await deleteApp(tempApp);
    return createdUid;
  } catch (error) {
    if (createdUid && tempAuth.currentUser) {
      try {
        await deleteUser$1(tempAuth.currentUser);
      } catch (_) {
      }
    }
    try {
      await signOut(tempAuth);
    } catch (_) {
    }
    try {
      await deleteApp(tempApp);
    } catch (_) {
    }
    throw error;
  }
}
async function updateUserRole(userId, role, firestore) {
  const firestoreDb = usersDb(firestore);
  await updateDoc(doc(firestoreDb, USERS, userId), {
    role,
    updatedAt: serverTimestamp()
  });
}
async function deleteUser(userId, firestore) {
  const firestoreDb = usersDb(firestore);
  await deleteDoc(doc(firestoreDb, USERS, userId));
}
async function suspendUser(userId, firestore) {
  const firestoreDb = usersDb(firestore);
  await updateDoc(doc(firestoreDb, USERS, userId), {
    status: "suspended",
    updatedAt: serverTimestamp()
  });
}
async function unsuspendUser(userId, firestore) {
  const firestoreDb = usersDb(firestore);
  await updateDoc(doc(firestoreDb, USERS, userId), {
    status: "active",
    updatedAt: serverTimestamp()
  });
}
const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "สมาชิก" },
  { value: "agent", label: "Agent" }
];
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}
function AddMemberModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!isOpen) return null;
  const reset = () => {
    setEmail("");
    setPassword("");
    setRole("member");
    setSaving(false);
    setError("");
  };
  const handleClose = () => {
    reset();
    onClose?.();
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      setError("กรุณากรอกอีเมล");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (!password || password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createUserWithPassword({
        email: normalizedEmail,
        password,
        role,
        status: "active"
      });
      onSuccess?.(`เพิ่มสมาชิก ${normalizedEmail} สำเร็จ`);
      handleClose();
    } catch (err) {
      setError(err?.message || "ไม่สามารถเพิ่มสมาชิกได้");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: handleClose,
        className: "absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition",
        "aria-label": "ปิด",
        children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" })
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "p-6 sm:p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(UserPlus, { className: "h-6 w-6 text-blue-900" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-blue-900", children: "เพิ่มสมาชิกใหม่" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500", children: "สถานะเริ่มต้น: ใช้งานปกติ" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1.5", children: "อีเมล" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Mail, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "email",
                value: email,
                onChange: (e) => setEmail(e.target.value),
                placeholder: "example@sps.com",
                className: `w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${error ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-blue-100"}`
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1.5", children: "สิทธิ์การใช้งาน" }),
          /* @__PURE__ */ jsx(
            "select",
            {
              value: role,
              onChange: (e) => setRole(e.target.value),
              className: "w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100",
              children: ROLE_OPTIONS.map((option) => /* @__PURE__ */ jsx("option", { value: option.value, children: option.label }, option.value))
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1.5", children: "รหัสผ่านเริ่มต้น" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "password",
                value: password,
                onChange: (e) => setPassword(e.target.value),
                placeholder: "อย่างน้อย 6 ตัวอักษร",
                className: `w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${error ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-blue-100"}`
              }
            )
          ] })
        ] }),
        error && /* @__PURE__ */ jsx("p", { className: "text-sm text-red-600", children: error }),
        /* @__PURE__ */ jsxs("div", { className: "pt-2 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleClose,
              className: "flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-medium",
              children: "ยกเลิก"
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "submit",
              disabled: saving,
              className: "flex-1 px-4 py-3 rounded-xl bg-blue-900 text-white hover:bg-blue-800 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2",
              children: [
                saving && /* @__PURE__ */ jsx("span", { className: "inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                saving ? "กำลังเพิ่มสมาชิก…" : "เพิ่มสมาชิก"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] }) });
}
const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  member: "สมาชิก",
  agent: "Agent"
};
const ROLE_COLORS = {
  super_admin: "bg-purple-100 text-purple-900 border-purple-300",
  admin: "bg-blue-100 text-blue-900 border-blue-300",
  member: "bg-slate-100 text-slate-900 border-slate-300",
  agent: "bg-emerald-100 text-emerald-900 border-emerald-300"
};
const STATUS_COLORS = {
  active: "bg-green-100 text-green-900 border-green-300",
  suspended: "bg-red-100 text-red-900 border-red-300"
};
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "ยืนยัน", confirmColor = "bg-blue-900" }) {
  if (!isOpen) return null;
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl shadow-lg max-w-md w-full", children: /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
      /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(AlertCircle, { className: "h-6 w-6 text-yellow-900" }) }),
      /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-blue-900", children: title })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-slate-700 mb-6", children: message }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium",
          children: "ยกเลิก"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: onConfirm,
          className: `flex-1 px-4 py-2 ${confirmColor} text-white rounded-lg hover:opacity-90 transition font-medium`,
          children: confirmText
        }
      )
    ] })
  ] }) }) });
}
function UserManagement() {
  const { user, userRole, isSuperAdmin } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [changingRole, setChangingRole] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    // 'delete', 'suspend', 'unsuspend', 'role', 'initial_setup'
    userId: null,
    userEmail: null,
    newRole: null,
    oldRole: null
  });
  const hasSuperAdmin = useMemo(() => {
    return users.some((u) => u.role === "super_admin");
  }, [users]);
  const canAccess = isSuperAdmin() || !hasSuperAdmin;
  useEffect(() => {
    if (!user) return;
    const unsub = getUsersSnapshot((userList) => {
      setUsers(userList);
      setLoading(false);
    }, adminDb);
    return () => unsub();
  }, [user]);
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
  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) => u.email?.toLowerCase().includes(query) || u.name?.toLowerCase().includes(query)
      );
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    if (statusFilter !== "all") {
      if (statusFilter === "suspended") {
        filtered = filtered.filter((u) => u.status === "suspended");
      } else {
        filtered = filtered.filter((u) => !u.status || u.status === "active");
      }
    }
    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter]);
  const logAuditAction = async (action, targetUserId, targetUserName, details) => {
    try {
      if (hasSuperAdmin) {
        await createAuditLog({
          adminId: user?.uid || "",
          adminName: user?.email || "Unknown",
          targetUserId,
          targetUserName,
          action,
          details
        }, adminDb);
      }
    } catch (error) {
      console.error("Error creating audit log:", error);
    }
  };
  const handleRoleChangeClick = (userId, userEmail, oldRole, newRole) => {
    setConfirmModal({
      isOpen: true,
      type: "role",
      userId,
      userEmail,
      oldRole,
      newRole
    });
  };
  const handleRoleChangeConfirm = async () => {
    const { userId, userEmail, oldRole, newRole } = confirmModal;
    if (!userId || !newRole) return;
    setChangingRole(userId);
    setErrorMessage(null);
    setConfirmModal({ isOpen: false, type: null, userId: null, userEmail: null, newRole: null, oldRole: null });
    try {
      await updateUserRole(userId, newRole, adminDb);
      await logAuditAction(
        "CHANGE_ROLE",
        userId,
        userEmail,
        `Changed from ${ROLE_LABELS[oldRole] || oldRole} to ${ROLE_LABELS[newRole]}`
      );
      setSuccessMessage(`เปลี่ยนระดับสิทธิ์เป็น "${ROLE_LABELS[newRole]}" สำเร็จ`);
      if (confirmModal.type === "initial_setup") {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("Error updating role:", error);
      setErrorMessage("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setChangingRole(null);
    }
  };
  const handleInitialSetup = () => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      type: "initial_setup",
      userId: user.uid,
      userEmail: user.email,
      oldRole: userRole || "member",
      newRole: "super_admin"
    });
  };
  const handleDeleteClick = (userId, userEmail) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      userId,
      userEmail
    });
  };
  const handleDeleteConfirm = async () => {
    const { userId, userEmail } = confirmModal;
    if (!userId) return;
    setDeletingId(userId);
    setErrorMessage(null);
    setConfirmModal({ isOpen: false, type: null, userId: null, userEmail: null });
    try {
      await deleteUser(userId, adminDb);
      await logAuditAction("DELETE_USER", userId, userEmail, `Deleted user: ${userEmail}`);
      setSuccessMessage("ลบผู้ใช้สำเร็จ");
    } catch (error) {
      console.error("Error deleting user:", error);
      setErrorMessage("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };
  const handleSuspendClick = (userId, userEmail, isSuspended) => {
    setConfirmModal({
      isOpen: true,
      type: isSuspended ? "unsuspend" : "suspend",
      userId,
      userEmail
    });
  };
  const handleSuspendConfirm = async () => {
    const { userId, userEmail, type } = confirmModal;
    if (!userId) return;
    setSuspendingId(userId);
    setErrorMessage(null);
    setConfirmModal({ isOpen: false, type: null, userId: null, userEmail: null });
    try {
      if (type === "suspend") {
        await suspendUser(userId, adminDb);
        await logAuditAction("SUSPEND_USER", userId, userEmail, "User account suspended");
        setSuccessMessage("ระงับการใช้งานสำเร็จ");
      } else {
        await unsuspendUser(userId, adminDb);
        await logAuditAction("UNSUSPEND_USER", userId, userEmail, "User account unsuspended");
        setSuccessMessage("ยกเลิกการระงับการใช้งานสำเร็จ");
      }
    } catch (error) {
      console.error("Error suspending/unsuspending user:", error);
      setErrorMessage("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSuspendingId(null);
    }
  };
  const getConfirmModalProps = () => {
    const { type, userEmail, newRole, oldRole } = confirmModal;
    switch (type) {
      case "delete":
        return {
          title: "ยืนยันการลบผู้ใช้",
          message: `ต้องการลบผู้ใช้ "${userEmail}" หรือไม่?

การกระทำนี้ไม่สามารถยกเลิกได้`,
          confirmText: "ลบ",
          confirmColor: "bg-red-600",
          onConfirm: handleDeleteConfirm
        };
      case "suspend":
        return {
          title: "ยืนยันการระงับการใช้งาน",
          message: `ต้องการระงับการใช้งานของ "${userEmail}" หรือไม่?

ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้`,
          confirmText: "ระงับ",
          confirmColor: "bg-red-600",
          onConfirm: handleSuspendConfirm
        };
      case "unsuspend":
        return {
          title: "ยืนยันการยกเลิกการระงับ",
          message: `ต้องการยกเลิกการระงับการใช้งานของ "${userEmail}" หรือไม่?`,
          confirmText: "ยกเลิกการระงับ",
          confirmColor: "bg-green-600",
          onConfirm: handleSuspendConfirm
        };
      case "role":
        return {
          title: "ยืนยันการเปลี่ยนระดับสิทธิ์",
          message: `ต้องการเปลี่ยนระดับสิทธิ์ของ "${userEmail}" จาก "${ROLE_LABELS[oldRole] || oldRole}" เป็น "${ROLE_LABELS[newRole]}" หรือไม่?`,
          confirmText: "ยืนยัน",
          confirmColor: "bg-blue-900",
          onConfirm: handleRoleChangeConfirm
        };
      case "initial_setup":
        return {
          title: "ตั้งค่า Super Admin แรก",
          message: `คุณกำลังจะตั้งค่าตัวเองเป็น Super Admin คนแรกของระบบ

อีเมล: ${userEmail}

หลังจากนี้คุณจะสามารถจัดการสมาชิกทั้งหมดได้`,
          confirmText: "ตั้งค่าเป็น Super Admin",
          confirmColor: "bg-purple-600",
          onConfirm: handleRoleChangeConfirm
        };
      default:
        return {
          title: "",
          message: "",
          confirmText: "ยืนยัน",
          confirmColor: "bg-blue-900",
          onConfirm: () => {
          }
        };
    }
  };
  if (!canAccess) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 text-center", children: [
      /* @__PURE__ */ jsx(AlertCircle, { className: "h-12 w-12 text-red-600 mx-auto mb-4" }),
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-red-900 mb-2", children: "ไม่มีสิทธิ์เข้าถึง" }),
      /* @__PURE__ */ jsx("p", { className: "text-red-700", children: "เฉพาะ Super Admin เท่านั้นที่สามารถเข้าถึงหน้านี้ได้" })
    ] }) });
  }
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-6xl mx-auto", children: /* @__PURE__ */ jsx("p", { className: "text-slate-600", children: "กำลังโหลดข้อมูล…" }) });
  }
  const superAdmins = users.filter((u) => u.role === "super_admin");
  const admins = users.filter((u) => u.role === "admin");
  const members = users.filter((u) => u.role === "member");
  const suspended = users.filter((u) => u.status === "suspended");
  return /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Shield, { className: "h-7 w-7 text-blue-900" }),
          /* @__PURE__ */ jsx("h1", { className: "text-2xl sm:text-3xl font-bold text-blue-900", children: "จัดการสมาชิก" })
        ] }),
        hasSuperAdmin && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setIsAddMemberOpen(true),
            className: "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 text-white hover:bg-blue-800 transition font-semibold shadow-sm",
            children: "+ เพิ่มสมาชิก"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-slate-600", children: [
        "จัดการระดับสิทธิ์และสมาชิกทั้งหมด (",
        users.length,
        " คน)"
      ] })
    ] }),
    !hasSuperAdmin && user && /* @__PURE__ */ jsx("div", { className: "mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsx(Shield, { className: "h-6 w-6 text-purple-900" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-purple-900 mb-2", children: "ตั้งค่า Super Admin แรก" }),
        /* @__PURE__ */ jsx("p", { className: "text-slate-700 mb-4", children: "ระบบยังไม่มี Super Admin กรุณาตั้งค่าตัวเองเป็น Super Admin เพื่อเริ่มใช้งานระบบจัดการสมาชิก" }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: handleInitialSetup,
            disabled: changingRole === user.uid,
            className: "px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsx(Shield, { className: "h-5 w-5" }),
              changingRole === user.uid ? "กำลังตั้งค่า…" : "ตั้งค่าเป็น Super Admin"
            ]
          }
        )
      ] })
    ] }) }),
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
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 p-4 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(Shield, { className: "h-6 w-6 text-purple-900" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600", children: "Super Admin" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-purple-900", children: superAdmins.length })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 p-4 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(UserCheck, { className: "h-6 w-6 text-blue-900" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600", children: "Admin" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-blue-900", children: admins.length })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 p-4 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(User, { className: "h-6 w-6 text-slate-900" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600", children: "สมาชิก" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-slate-900", children: members.length })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 p-4 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(User, { className: "h-6 w-6 text-emerald-900" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600", children: "Agent" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-emerald-900", children: users.filter((u) => u.role === "agent").length })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 p-4 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center", children: /* @__PURE__ */ jsx(Ban, { className: "h-6 w-6 text-red-900" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600", children: "ระงับการใช้งาน" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-red-900", children: suspended.length })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: "ค้นหาด้วยอีเมลหรือชื่อ...",
            className: "w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx(Filter, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: roleFilter,
            onChange: (e) => setRoleFilter(e.target.value),
            className: "w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 appearance-none bg-white",
            children: [
              /* @__PURE__ */ jsx("option", { value: "all", children: "ทุกระดับสิทธิ์" }),
              /* @__PURE__ */ jsx("option", { value: "super_admin", children: "Super Admin" }),
              /* @__PURE__ */ jsx("option", { value: "admin", children: "Admin" }),
              /* @__PURE__ */ jsx("option", { value: "member", children: "สมาชิก" }),
              /* @__PURE__ */ jsx("option", { value: "agent", children: "Agent" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx(Filter, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: statusFilter,
            onChange: (e) => setStatusFilter(e.target.value),
            className: "w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 appearance-none bg-white",
            children: [
              /* @__PURE__ */ jsx("option", { value: "all", children: "ทุกสถานะ" }),
              /* @__PURE__ */ jsx("option", { value: "active", children: "ใช้งานปกติ" }),
              /* @__PURE__ */ jsx("option", { value: "suspended", children: "ระงับการใช้งาน" })
            ]
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md", children: [
      /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
        /* @__PURE__ */ jsx("thead", { className: "bg-blue-900 text-white", children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { className: "px-6 py-4 text-left text-xs font-semibold uppercase", children: "อีเมล" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-4 text-left text-xs font-semibold uppercase", children: "ระดับสิทธิ์" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-4 text-left text-xs font-semibold uppercase", children: "สถานะ" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-4 text-left text-xs font-semibold uppercase", children: "สร้างเมื่อ" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-4 text-right text-xs font-semibold uppercase", children: "การจัดการ" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100", children: filteredUsers.map((u) => {
          const isSuspended = u.status === "suspended";
          const currentRole = u.role || "member";
          return /* @__PURE__ */ jsxs(
            "tr",
            {
              className: `hover:bg-slate-50 transition ${isSuspended ? "bg-red-50/30" : ""}`,
              children: [
                /* @__PURE__ */ jsxs("td", { className: "px-6 py-4", children: [
                  /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-900", children: u.email || "-" }),
                  u.name && /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500", children: u.name })
                ] }),
                /* @__PURE__ */ jsxs("td", { className: "px-6 py-4", children: [
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: currentRole,
                      onChange: (e) => handleRoleChangeClick(u.id, u.email, currentRole, e.target.value),
                      disabled: changingRole === u.id || isSuspended || !hasSuperAdmin && u.id !== user?.uid,
                      className: `px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition ${ROLE_COLORS[currentRole]} disabled:opacity-50 disabled:cursor-not-allowed`,
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "member", children: "สมาชิก" }),
                        /* @__PURE__ */ jsx("option", { value: "admin", children: "Admin" }),
                        /* @__PURE__ */ jsx("option", { value: "super_admin", children: "Super Admin" }),
                        /* @__PURE__ */ jsx("option", { value: "agent", children: "Agent" })
                      ]
                    }
                  ),
                  changingRole === u.id && /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-slate-500", children: "กำลังอัปเดต…" }),
                  !hasSuperAdmin && u.id !== user?.uid && /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-yellow-600", children: "รอตั้งค่า Super Admin ก่อน" })
                ] }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: `inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border-2 ${isSuspended ? STATUS_COLORS.suspended : STATUS_COLORS.active}`,
                    children: isSuspended ? /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsx(Ban, { className: "h-3 w-3" }),
                      "ระงับการใช้งาน"
                    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsx(CheckCircle, { className: "h-3 w-3" }),
                      "ใช้งานปกติ"
                    ] })
                  }
                ) }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-sm text-slate-600", children: u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                }) : "-" }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-2", children: [
                  hasSuperAdmin && /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleSuspendClick(u.id, u.email, isSuspended),
                        disabled: suspendingId === u.id,
                        className: `p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${isSuspended ? "text-green-600 hover:bg-green-50" : "text-orange-600 hover:bg-orange-50"}`,
                        title: isSuspended ? "ยกเลิกการระงับ" : "ระงับการใช้งาน",
                        children: isSuspended ? /* @__PURE__ */ jsx(CheckCircle, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Ban, { className: "h-4 w-4" })
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleDeleteClick(u.id, u.email),
                        disabled: deletingId === u.id,
                        className: "p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed",
                        title: "ลบผู้ใช้",
                        children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
                      }
                    )
                  ] }),
                  !hasSuperAdmin && /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400", children: "รอตั้งค่า Super Admin ก่อน" })
                ] }) })
              ]
            },
            u.id
          );
        }) })
      ] }) }),
      filteredUsers.length === 0 && /* @__PURE__ */ jsxs("div", { className: "text-center py-12 text-slate-500", children: [
        /* @__PURE__ */ jsx(Users, { className: "h-16 w-16 mx-auto mb-4 opacity-50" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-medium mb-2", children: searchQuery || roleFilter !== "all" || statusFilter !== "all" ? "ไม่พบผลลัพธ์ที่ตรงกับเงื่อนไข" : "ยังไม่มีสมาชิก" }),
        (searchQuery || roleFilter !== "all" || statusFilter !== "all") && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              setSearchQuery("");
              setRoleFilter("all");
              setStatusFilter("all");
            },
            className: "text-blue-900 hover:underline text-sm",
            children: "ล้างตัวกรอง"
          }
        )
      ] })
    ] }),
    filteredUsers.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-4 text-sm text-slate-600 text-center", children: [
      "แสดงผล ",
      filteredUsers.length,
      " จาก ",
      users.length,
      " รายการ"
    ] }),
    /* @__PURE__ */ jsx(
      ConfirmModal,
      {
        isOpen: confirmModal.isOpen,
        onClose: () => setConfirmModal({ isOpen: false, type: null, userId: null, userEmail: null, newRole: null, oldRole: null }),
        ...getConfirmModalProps()
      }
    ),
    /* @__PURE__ */ jsx(
      AddMemberModal,
      {
        isOpen: isAddMemberOpen,
        onClose: () => setIsAddMemberOpen(false),
        onSuccess: (message) => {
          setSuccessMessage(message);
          setIsAddMemberOpen(false);
        }
      }
    )
  ] });
}
export {
  UserManagement as default
};
