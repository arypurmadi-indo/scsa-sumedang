"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Overview from "@/components/dashboard/Overview";
import CourseMonitoring from "@/components/dashboard/CourseMonitoring";
import DistrictMonitoring from "@/components/dashboard/DistrictMonitoring";
import FacilitatorMonitoring from "@/components/dashboard/FacilitatorMonitoring";
import TeacherMonitoring from "@/components/dashboard/TeacherMonitoring";
import ImportCenter from "@/components/dashboard/ImportCenter";
import Analytics from "@/components/dashboard/Analytics";
import Reports from "@/components/dashboard/Reports";
import Settings from "@/components/dashboard/Settings";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const [userEmail, setUserEmail] = useState("Administrator");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (!supabase) { if (alive) setChecking(false); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("profiles")
        .select("role,is_active").eq("id", data.user.id).single();
      if (!profile || profile.role !== "admin" || profile.is_active !== true) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }
      if (alive) {
        setUserEmail(data.user.email || "Administrator");
        setChecking(false);
      }
    }
    check();
    return () => { alive = false; };
  }, [router]);

  const titles: Record<string, string> = {
    overview: "Ringkasan Monitoring", courses: "Monitoring Kursus",
    districts: "Monitoring Kecamatan", facilitators: "Monitoring Fasilitator",
    teachers: "Monitoring Guru", import: "Pusat Import Data",
    analytics: "Analitik Pembelajaran", reports: "Laporan Monitoring", settings: "Pengaturan Sistem"
  };

  function content() {
    switch (active) {
      case "courses": return <CourseMonitoring />;
      case "districts": return <DistrictMonitoring />;
      case "facilitators": return <FacilitatorMonitoring />;
      case "teachers": return <TeacherMonitoring />;
      case "import": return <ImportCenter />;
      case "analytics": return <Analytics />;
      case "reports": return <Reports />;
      case "settings": return <Settings />;
      default: return <Overview />;
    }
  }

  if (checking) return <div className="login-wrap"><p>Memeriksa sesi administrator...</p></div>;
  if (!isSupabaseConfigured) return <div className="login-wrap"><div className="login-card"><h2>Konfigurasi Supabase belum tersedia</h2><p>Tambahkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY pada Build variables Cloudflare, lalu deploy ulang.</p></div></div>;

  return (
    <div className="app-shell">
      <Sidebar active={active} onSelect={setActive} />
      <div className="main">
        <Header />
        <main className="content">
          <div className="page-heading"><div><h1>{titles[active]}</h1><p>Selamat datang, {userEmail}. Berikut kondisi monitoring pembelajaran.</p></div></div>
          {content()}
        </main>
      </div>
    </div>
  );
}
