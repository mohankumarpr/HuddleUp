export function downloadTextFile(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Excel/Sheets-safe: wraps every field in quotes and doubles any embedded quotes.
export function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function toCsv(headers, rows) {
  return [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n") + "\n";
}
