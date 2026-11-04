"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  async function logout() {
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <div><strong>Sistem Monitoring LMS</strong><br /><span>Panel Administrator</span></div>
      <button className="secondary" onClick={logout}>Keluar</button>
    </header>
  );
}
