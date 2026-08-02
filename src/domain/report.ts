import type { Transaction } from '@/domain/types';

export interface ReportSummary {
  period: string;
  income: number;
  expense: number;
  net: number;
  transactions: readonly Transaction[];
}

export function buildReportTableRows(transactions: readonly Transaction[]): string[][] {
  return transactions.map((transaction) => [
    new Date(transaction.date).toLocaleDateString('id-ID'),
    transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    `Rp ${transaction.amount.toLocaleString('id-ID')}`,
    transaction.category,
    transaction.description,
  ]);
}

function appendTextElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  parent: Node,
  tag: K,
  text: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

/** Builds report content exclusively through DOM text nodes. */
export function buildPrintReportDocument(document: Document, report: ReportSummary): void {
  document.title = `Laporan Bulanan ${report.period}`;
  const style = document.createElement('style');
  style.textContent = [
    'body { font-family: Arial, sans-serif; margin: 20px; }',
    '.header { text-align: center; margin-bottom: 30px; }',
    '.summary { margin-bottom: 30px; }',
    '.summary-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }',
    '.income { background-color: #d4edda; }',
    '.expense { background-color: #f8d7da; }',
    '.balance { background-color: #d1ecf1; }',
    'table { width: 100%; border-collapse: collapse; margin-top: 20px; }',
    'th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }',
    'th { background-color: #f2f2f2; }',
  ].join('\n');
  document.head.appendChild(style);

  const header = document.createElement('div');
  header.className = 'header';
  appendTextElement(document, header, 'h1', 'Laporan Bulanan');
  appendTextElement(document, header, 'h2', report.period);
  document.body.appendChild(header);

  const summary = document.createElement('div');
  summary.className = 'summary';
  appendTextElement(document, summary, 'h3', 'Ringkasan');
  appendTextElement(document, summary, 'div', `Pemasukan: Rp ${report.income.toLocaleString('id-ID')}`, 'summary-item income');
  appendTextElement(document, summary, 'div', `Pengeluaran: Rp ${report.expense.toLocaleString('id-ID')}`, 'summary-item expense');
  appendTextElement(document, summary, 'div', `Saldo: ${report.net < 0 ? '-' : ''}Rp ${Math.abs(report.net).toLocaleString('id-ID')}`, 'summary-item balance');
  document.body.appendChild(summary);

  appendTextElement(document, document.body, 'h3', `Detail Transaksi (${report.transactions.length} transaksi)`);
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headingRow = document.createElement('tr');
  for (const heading of ['Tanggal', 'Jenis', 'Jumlah', 'Kategori', 'Keterangan']) {
    appendTextElement(document, headingRow, 'th', heading);
  }
  thead.appendChild(headingRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const fields of buildReportTableRows(report.transactions)) {
    const row = document.createElement('tr');
    // Untrusted stored fields are assigned through textContent in
    // appendTextElement; they are never parsed as markup.
    for (const field of fields) appendTextElement(document, row, 'td', field);
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  document.body.appendChild(table);
}
