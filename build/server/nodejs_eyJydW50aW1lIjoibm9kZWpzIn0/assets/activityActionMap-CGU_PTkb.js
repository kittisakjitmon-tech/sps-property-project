const getUsernameFromEmail = (email) => {
  if (!email || typeof email !== "string") return "unknown";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
};
const formatRoleDisplay = (role) => {
  if (!role) return "User";
  const map = {
    super_admin: "Super Admin",
    admin: "Admin",
    editor: "Editor",
    member: "Member"
  };
  return map[role] || role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};
const getActivityBadgeClass = (category) => {
  switch (category) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "operation":
      return "bg-blue-100 text-blue-800";
    case "system":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};
const ACTION_DISPLAY = {
  CREATE_PROPERTY: "เพิ่มบ้านใหม่",
  UPDATE_PROPERTY: "อัปเดตข้อมูล",
  UPDATE_PRICE: "แก้ไขราคา",
  DELETE_PROPERTY: "ลบประกาศ",
  UPDATE_STATUS: "อัปเดตสถานะ",
  ADD_IMAGES: "เพิ่มรูปภาพ",
  LOGIN: "เข้าสู่ระบบ",
  UPDATE_ROLE: "อัปเดตสิทธิ์",
  CHANGE_PASSWORD: "เปลี่ยนรหัสผ่าน"
};
const ACTION_CATEGORY = {
  CREATE_PROPERTY: "operation",
  UPDATE_PROPERTY: "operation",
  UPDATE_PRICE: "critical",
  DELETE_PROPERTY: "critical",
  UPDATE_STATUS: "operation",
  ADD_IMAGES: "operation",
  LOGIN: "system",
  UPDATE_ROLE: "system",
  CHANGE_PASSWORD: "system"
};
function getActionDisplay(action) {
  return ACTION_DISPLAY[action] || action;
}
function getActionCategory(action) {
  return ACTION_CATEGORY[action] || "system";
}
export {
  getActionDisplay as a,
  getUsernameFromEmail as b,
  getActivityBadgeClass as c,
  formatRoleDisplay as f,
  getActionCategory as g
};
