"use client";

import { useLanguagePreference } from "@/lib/language";
import { useState } from "react";

export function AdminLogoutButton() {
  const { language } = useLanguagePreference();
  const [loading, setLoading] = useState(false);
  const copy = language === "zh"
    ? { idle: "登出", loading: "正在登出..." }
    : { idle: "Logout", loading: "Logging out..." };

  async function logout() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/admin/login";
  }

  return (
    <button className="cart-link admin-logout-button" type="button" onClick={logout} disabled={loading}>
      {loading ? copy.loading : copy.idle}
    </button>
  );
}
