export default function Overview() {
  const stats = [["Kecamatan", "—"], ["Fasilitator", "—"], ["Guru", "—"], ["Kursus", "13"]];
  return <>
    <section className="stats">{stats.map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <section className="panel"><h2>Ikhtisar SCSA LMS Monitoring</h2><p>Dashboard awal telah siap. Angka monitoring akan ditampilkan setelah tabel dan sumber data Supabase SCSA dihubungkan.</p></section>
    <section className="panel"><h2>Status implementasi</h2><p>Fondasi aplikasi, autentikasi administrator, navigasi, dan modul awal sudah tersedia. Integrasi data operasional dilanjutkan setelah skema database dikonfirmasi.</p></section>
  </>;
}
