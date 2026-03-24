/**
 * Public Layout Route — ครอบ Public pages ทั้งหมด
 * แทนที่ PublicRoutesWrapper ใน App.jsx เดิม
 * - ตรวจสอบ Maintenance Mode
 * - ให้ PublicAuthProvider ครอบ child routes
 */
import { Outlet } from "react-router";
import { PublicAuthProvider } from "../context/PublicAuthContext";
import { useSystemSettings } from "../hooks/useSystemSettings";
import MaintenancePage from "../components/MaintenancePage";

export default function PublicLayout() {
  const { settings, loading } = useSystemSettings();

  // Maintenance Mode เปิดอยู่ (และโหลด settings เสร็จแล้ว) → แสดงหน้าปิดปรับปรุง
  if (!loading && settings.maintenanceMode) {
    return <MaintenancePage siteName={settings.siteName} />;
  }

  return (
    <PublicAuthProvider>
      <Outlet />
    </PublicAuthProvider>
  );
}
