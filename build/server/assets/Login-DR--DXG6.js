import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useId } from "react";
import { useNavigate, useLocation } from "react-router";
import { u as useAdminAuth, c as getAuthErrorMessage } from "./server-build-D_48fWql.js";
import { LogIn } from "lucide-react";
import "node:stream";
import "@react-router/node";
import "isbot";
import "react-dom/server";
import "firebase/auth";
import "firebase/firestore";
import "firebase/app";
import "firebase/storage";
import "react-helmet-async";
import "firebase/functions";
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/sps-internal-admin";
  const idEmail = useId();
  const idPassword = useId();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-slate-50 flex items-center justify-center px-4", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-slate-200", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-blue-900 mb-2", children: "เข้าสู่ระบบแอดมิน" }),
    /* @__PURE__ */ jsx("p", { className: "text-slate-600 mb-6", children: "SPS Property Solution" }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      error && /* @__PURE__ */ jsx("div", { className: "p-3 rounded-lg bg-red-50 text-red-700 text-sm", children: error }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: idEmail, className: "block text-sm font-medium text-slate-700 mb-1", children: "อีเมล" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: idEmail,
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true,
            className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900",
            placeholder: "admin@example.com"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: idPassword, className: "block text-sm font-medium text-slate-700 mb-1", children: "รหัสผ่าน" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: idPassword,
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            required: true,
            className: "w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "submit",
          disabled: submitting,
          className: "w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 transition disabled:opacity-50",
          children: [
            /* @__PURE__ */ jsx(LogIn, { className: "h-5 w-5" }),
            submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"
          ]
        }
      )
    ] })
  ] }) });
}
export {
  Login as default
};
