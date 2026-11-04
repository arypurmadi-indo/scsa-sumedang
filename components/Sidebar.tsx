"use client";

const items = [
  ["Ringkasan", "overview"],
  ["Monitoring Kursus", "courses"],
  ["Kecamatan", "districts"],
  ["Fasilitator", "facilitators"],
  ["Guru", "teachers"],
  ["Import Data CSV", "import"],
  ["Analitik", "analytics"],
  ["Laporan", "reports"],
  ["Pengaturan", "settings"]
];

export default function Sidebar({ active, onSelect }: { active: string; onSelect: (value: string) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">S</div>
        <div><strong>SCSA Monitoring</strong><small>KABUPATEN SUMEDANG</small></div>
      </div>
      <div className="nav-label">MENU UTAMA</div>
      {items.map(([label, key]) => (
        <button key={key} className={`nav-item ${active === key ? "active" : ""}`} onClick={() => onSelect(key)}>
          {label}
        </button>
      ))}
    </aside>
  );
}
