"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase belum dikonfigurasi. Periksa Environment Variables Cloudflare.");
      return;
    }
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setMessage(error?.message || "Login gagal.");
      setLoading(false);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role,is_active").eq("id", data.user.id).single();

    if (profileError || !profile || profile.role !== "admin" || profile.is_active !== true) {
      await supabase.auth.signOut();
      setMessage("Akun ini belum memiliki akses Administrator SCSA.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">S</div>
        <p className="eyebrow">KABUPATEN SUMEDANG</p>
        <h1>SCSA LMS Monitoring</h1>
        <p className="muted">Masuk ke pusat monitoring pembelajaran.</p>
        <label htmlFor="email">Email administrator</label>
        <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@contoh.id" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password akun Supabase" />
        {message && <div className="notice error">{message}</div>}
        <button className="primary full" disabled={loading}>{loading ? "Memeriksa..." : "Masuk"}</button>
        {!isSupabaseConfigured && <div className="notice">Konfigurasi Supabase belum tersedia.</div>}
        <p className="tiny muted">Akses hanya untuk akun dengan role admin.</p>
      </form>
    </main>
  );
}
