import type { Config } from "@react-router/dev/config";

export default {
  // ปิด SSR ชั่วคราว - ใช้ SPA mode แทน
  ssr: false,
  // โฟลเดอร์หลักของ app
  appDirectory: "app",
} satisfies Config;
