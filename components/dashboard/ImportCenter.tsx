"use client";

import { useState } from "react";
import Papa from "papaparse";

type Row = Record<string, unknown>;

export default function ImportCenter() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setError("");
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => setRows(result.data.slice(0, 10)),
      error: err => setError(err.message)
    });
  }

  return <section className="panel">
    <h2>Import dan Pratinjau CSV</h2>
    <div className="upload-box">
      <strong>Pilih file CSV untuk diperiksa</strong>
      <p>Modul ini menampilkan pratinjau lokal. Penyimpanan ke tabel staging Supabase akan diaktifkan setelah format 13 CSV dikonfirmasi.</p>
      <input type="file" accept=".csv,text/csv" onChange={e => handleFile(e.target.files?.[0])} />
    </div>
    {error && <div className="notice error">{error}</div>}
    {fileName && <p>File: <strong>{fileName}</strong> — menampilkan maksimal 10 baris pertama.</p>}
    {rows.length > 0 && <div className="table-wrap"><table><thead><tr>{Object.keys(rows[0]).map(k => <th key={k}>{k}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v ?? "")}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}
