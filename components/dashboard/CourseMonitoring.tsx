const courses = Array.from({ length: 13 }, (_, i) => ({ code: `CRS${String(i + 1).padStart(2, "0")}`, name: `Kursus ${i + 1}` }));
export default function CourseMonitoring() {
  return <section className="panel"><h2>Daftar 13 Kursus</h2><div className="table-wrap"><table><thead><tr><th>Kode</th><th>Nama Kursus</th><th>Status Data</th></tr></thead><tbody>{courses.map(c => <tr key={c.code}><td>{c.code}</td><td>{c.name}</td><td>Menunggu integrasi data</td></tr>)}</tbody></table></div></section>;
}
