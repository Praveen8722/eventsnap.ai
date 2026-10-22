type Cell = string | number | boolean | null | undefined;

const escape = (value: Cell) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  let text = value ?? '';
  // Keep spreadsheet apps from running text as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Builds a CSV file from `rows` (shown columns only) and downloads it in the browser. */
export function downloadCsv<T>(filename: string, columns: { header: string; value: (row: T) => Cell }[], rows: T[]) {
  const lines = [columns.map(column => escape(column.header)).join(',')];
  for (const row of rows) lines.push(columns.map(column => escape(column.value(row))).join(','));
  // A byte-order mark so Excel reads the ₹ sign and other non-ASCII text correctly.
  const BOM = String.fromCharCode(0xfeff);
  const blob = new Blob([`${BOM}${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
