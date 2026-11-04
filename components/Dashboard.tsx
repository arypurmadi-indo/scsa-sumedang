"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Profile = { id: string; full_name: string; role: string; is_active: boolean };
type Course = { id: string; course_code: string; course_name: string };
type FilePreview = { file: File; courseCode: string; rows: Record<string,string>[]; headers: string[]; error?: string };

const demoCourses = Array.from({length:13},(_,i)=>({code:`CRS${String(i+1).padStart(2,"0")}`,name:`Kursus ${String(i+1).padStart(2,"0")}`,progress:0,students:0}));
const menu = ["Dashboard Overview","Monitoring Kecamatan","Monitoring Fasilitator","Monitoring Guru","Monitoring 13 Kursus","Activity Completion","CSV Import Center","Analytics","Reports","System Settings"];

export default function Dashboard() {
  const router = useRouter();
  const [user,setUser] = useState<Profile|null>(null);
  const [authenticated,setAuthenticated] = useState(false);
  const [active,setActive] = useState("Dashboard Overview");
  const [courses,setCourses] = useState<Course[]>([]);
  const [counts,setCounts] = useState({teachers:0,districts:0,facilitators:0,activities:0});
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");
  const [files,setFiles] = useState<FilePreview[]>([]);
  const [importing,setImporting] = useState(false);
  const [batchMessage,setBatchMessage] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/login"); return; }
      const { data: profile, error } = await supabase.from("profiles")
        .select("id,full_name,role,is_active").eq("id",auth.user.id).single();
      if (!alive) return;
      if (error || !profile || profile.role !== "admin" || !profile.is_active) {
        await supabase.auth.signOut(); router.replace("/login"); return;
      }
      setUser(profile); setAuthenticated(true);
      const [p,d,c,a] = await Promise.all([
        supabase.from("profiles").select("id", {count:"exact",head:true}).eq("role","teacher").eq("is_active",true),
        supabase.from("districts").select("id", {count:"exact",head:true}),
        supabase.from("profiles").select("id", {count:"exact",head:true}).eq("role","facilitator").eq("is_active",true),
        supabase.from("activities").select("id", {count:"exact",head:true})
      ]);
      const courseResult = await supabase.from("courses").select("id,course_code,course_name").eq("is_active",true).order("course_code");
      if (!alive) return;
      setCounts({teachers:p.count||0,districts:d.count||0,facilitators:c.count||0,activities:a.count||0});
      setCourses(courseResult.data||[]);
      if (p.error || d.error || c.error || a.error || courseResult.error) setMessage("Sebagian data belum dapat dibaca. Periksa tabel dan kebijakan RLS Supabase.");
      setLoading(false);
    }
    load();
    return ()=>{alive=false;};
  },[router]);

  const courseList = courses.length ? courses.map(c=>({code:c.course_code,name:c.course_name,progress:0,students:0})) : demoCourses;
  const isDemo = !isSupabaseConfigured || !authenticated;

  async function signOut() { if (supabase) await supabase.auth.signOut(); router.push("/login"); }

  function parseFiles(list: FileList|null) {
    if (!list) return;
    const selected = Array.from(list);
    if (selected.length !== 13) { setBatchMessage(`Pilih tepat 13 file CSV. Saat ini dipilih ${selected.length} file.`); return; }
    Promise.all(selected.map(file=>new Promise<FilePreview>(resolve=>{
      Papa.parse<Record<string,string>>(file,{header:true,skipEmptyLines:true,complete:(result)=>{
        const name=file.name.toLowerCase();
        const match=name.match(/^(?:kursus|course|crs)[ _-]?0?(1[0-3]|[1-9])(?:\\D|$)/i);
        const code=match?`CRS${String(Number(match[1])).padStart(2,"0")}`:"";
        const headers=result.meta.fields||[];
        resolve({file,courseCode:code,rows:result.data,headers,error:result.errors.length?result.errors[0].message:undefined});
      },error:err=>resolve({file,courseCode:"",rows:[],headers:[],error:err.message})});
    }))).then(parsed=>{
      const codes=parsed.map(x=>x.courseCode);
      const unique=new Set(codes);
      const valid=parsed.every(x=>x.rows.length>0 && x.headers.length>1 && x.courseCode) && unique.size===13;
      setFiles(parsed);
      setBatchMessage(valid?"13 file terbaca. Periksa nama kursus dan kolom sebelum menyimpan ke staging.":"Ada file kosong, nama file tidak sesuai, atau kode kursus tidak unik. Gunakan nama kursus_01.csv sampai kursus_13.csv.");
    });
  }

  async function saveStaging() {
    if (!supabase || files.length!==13) return;
    setImporting(true); setBatchMessage("");
    const {data:auth}=await supabase.auth.getUser();
    if (!auth.user) { setBatchMessage("Sesi login berakhir. Silakan login kembali."); setImporting(false); return; }
    const {data:batch,error:batchError}=await supabase.from("import_batches").insert({
      batch_name:`Batch SCSA ${new Date().toLocaleString("id-ID")}`,
      status:"uploaded",total_files:files.length,valid_files:files.length,
      total_rows:files.reduce((n,f)=>n+f.rows.length,0),imported_by:auth.user.id
    }).select("id").single();
    if (batchError || !batch) { setBatchMessage(`Gagal membuat batch: ${batchError?.message}`); setImporting(false); return; }
    for (const item of files) {
      const course=courses.find(c=>c.course_code===item.courseCode);
      const {data:fileRow,error:fileError}=await supabase.from("import_files").insert({
        batch_id:batch.id,course_id:course?.id||null,file_name:item.file.name,
        file_size:item.file.size,total_rows:item.rows.length,total_activities:Math.max(0,item.headers.length-1),
        valid_rows:item.rows.length,error_rows:0,status:"staged"
      }).select("id").single();
      if (fileError || !fileRow) { setBatchMessage(`Gagal menyimpan ${item.file.name}: ${fileError?.message}`); setImporting(false); return; }
      const rows=item.rows.map((raw,index)=>({
        import_file_id:fileRow.id,row_number:index+2,
        username:raw.username||raw.Username||raw.email||raw.Email||null,
        raw_data:raw,validation_status:"pending"
      }));
      for (let i=0;i<rows.length;i+=400) {
        const {error}=await supabase.from("import_staging_rows").insert(rows.slice(i,i+400));
        if (error) { setBatchMessage(`Gagal menyimpan baris ${i+1} pada ${item.file.name}: ${error.message}`); setImporting(false); return; }
      }
    }
    setBatchMessage("Berhasil menyimpan 13 file ke staging. Data belum mengubah progres dashboard; tahap pemetaan dan validasi perlu dilakukan sebelum publikasi.");
    setImporting(false); setFiles([]);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo"><div className="logo-icon">S</div><div><b>SCSA LMS</b><small>MONITORING & CONTROL</small></div></div>
      <div className="district"><span>⌖</span><div><b>Kabupaten Sumedang</b><small>Learning Management System</small></div></div>
      <p className="nav-label">WORKSPACE</p>
      {menu.slice(0,6).map((m,i)=><button key={m} className={`nav-item ${active===m?"selected":""}`} onClick={()=>setActive(m)}><span>{["▦","⌖","♙","♧","▤","☑"][i]}</span>{m}{m==="Monitoring 13 Kursus"&&<em>13</em>}</button>)}
      <p className="nav-label">DATA & PELAPORAN</p>
      {menu.slice(6,9).map((m,i)=><button key={m} className={`nav-item ${active===m?"selected":""}`} onClick={()=>setActive(m)}><span>{["⇧","▥","▤"][i]}</span>{m}</button>)}
      <p className="nav-label">PREFERENSI</p>
      <button className={`nav-item ${active==="System Settings"?"selected":""}`} onClick={()=>setActive("System Settings")}><span>⚙</span>System Settings</button>
      <div className="side-bottom"><span className="avatar">AD</span><div><b>{user?.full_name||"Administrator"}</b><small>{authenticated?"Administrator":"Preview mode"}</small></div><button onClick={signOut} title="Keluar">↪</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="muted">Workspace</span><span>›</span><b>{active}</b></div><div className="top-actions"><span className={`pill ${authenticated?"green":"yellow"}`}>{authenticated?"Terhubung":"Preview / belum login"}</span><button className="ghost" onClick={signOut}>Keluar</button></div></header>
      <section className="content">
        <div className="page-heading"><div><p className="eyebrow">SCSA LMS · KABUPATEN SUMEDANG</p><h1>{active}</h1><p className="muted">Pusat monitoring dan pengendalian pembelajaran guru.</p></div></div>
        {message&&<div className="notice">{message}</div>}
        {isDemo&&<div className="notice warning">Mode preview. Hubungkan environment variables Supabase dan login administrator untuk membaca data operasional.</div>}
        {active==="CSV Import Center" ? <section className="panel">
          <h2>Impor 13 file CSV Moodle</h2><p className="muted">Format A: satu baris per guru, aktivitas pembelajaran sebagai kolom. Nama file: kursus_01.csv sampai kursus_13.csv.</p>
          <label className="upload"><span>＋</span><b>Pilih 13 file CSV</b><small>File akan diparsing dan disimpan ke tabel staging setelah dikonfirmasi.</small><input type="file" accept=".csv,text/csv" multiple onChange={e=>parseFiles(e.target.files)}/></label>
          {files.length>0&&<><div className="table-wrap"><table><thead><tr><th>File</th><th>Kode kursus</th><th>Jumlah guru/baris</th><th>Jumlah kolom</th><th>Status</th></tr></thead><tbody>{files.map(f=><tr key={f.file.name}><td>{f.file.name}</td><td>{f.courseCode||"Tidak terdeteksi"}</td><td>{f.rows.length}</td><td>{f.headers.length}</td><td>{f.error||"Terbaca"}</td></tr>)}</tbody></table></div><button className="primary" disabled={importing||files.length!==13||!authenticated} onClick={saveStaging}>{importing?"Menyimpan...":"Simpan 13 file ke staging"}</button></>}
          {batchMessage&&<div className="notice">{batchMessage}</div>}
          <div className="notice warning">Catatan: proses ini hanya menyimpan data mentah ke staging. Belum memublikasikan atau mengubah progres guru sebelum format kolom dan pemetaan aktivitas diverifikasi.</div>
        </section> : active==="Dashboard Overview" ? <>
          <div className="hero"><div><p className="eyebrow">PUSAT MONITORING PEMBELAJARAN</p><h2>Bersama, wujudkan guru yang terus bertumbuh.</h2><p>Pantau progres, dukung fasilitator, dan pastikan setiap langkah pembelajaran membawa perubahan.</p></div><div className="hero-art">▣</div></div>
          <div className="section-title"><h2>Ringkasan pembelajaran</h2><span className="pill">{isDemo?"Data belum terhubung":"Data Supabase"}</span></div>
          <div className="stats">
            <Stat title="Total Guru" value={counts.teachers} icon="♙"/><Stat title="Kecamatan" value={counts.districts} icon="⌖"/><Stat title="Fasilitator" value={counts.facilitators} icon="♧"/><Stat title="Total Kursus" value={courses.length||13} icon="▤"/><Stat title="Aktivitas" value={counts.activities} icon="☑"/>
          </div>
          <section className="panel"><div className="panel-head"><h2>Monitoring 13 Kursus</h2><span className="muted">Progres akan muncul setelah data tervalidasi dan dipublikasikan</span></div><div className="course-grid">{courseList.map(c=><div className="course" key={c.code}><b>{c.name}</b><small>{c.code}</small><div className="bar"><i style={{width:`${c.progress}%`}}/></div><span className="muted">{c.progress}% · {c.students} guru</span></div>)}</div></section>
        </> : <section className="panel"><h2>{active}</h2><p className="muted">Modul ini sudah disiapkan pada navigasi. Data operasional akan ditampilkan setelah master data dan proses impor CSV selesai dikonfigurasi.</p><div className="notice">Modul berikutnya akan diaktifkan secara bertahap menggunakan tabel Supabase yang tersedia.</div></section>}
        <footer>© {new Date().getFullYear()} SCSA LMS Monitoring · Kabupaten Sumedang</footer>
      </section>
    </main>
  </div>;
}

function Stat({title,value,icon}:{title:string,value:number,icon:string}) {
  return <div className="stat"><span>{icon}</span><small>{title}</small><strong>{value.toLocaleString("id-ID")}</strong></div>;
}
