"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    if (!response.ok) {
      setError("登录失败，请检查账号或密码。");
      return;
    }

    router.push("/admin/orders");
  }

  return (
    <main className="shop-page narrow">
      <form className="checkout-form" action={submit}>
        <p className="eyebrow">Hermes Admin</p>
        <h1>后台登录</h1>
        <label>
          Email
          <input name="email" type="email" defaultValue="admin@beautyboat.local" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="checkout-button" type="submit">登录</button>
      </form>
    </main>
  );
}
