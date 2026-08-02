import type { TransactionType } from '@/domain/types';
import { addCalendarDays, daysInCalendarMonth, formatLocalCalendarDate, parseLocalCalendarDate } from '@/domain/calendar-date';
import { parseRupiahAmount } from '@/domain/transaction-validation';

export interface ParsedVoiceTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
}

interface SourceSpan {
  start: number;
  end: number;
  text: string;
}

interface ParsedDateExpression {
  date: Date;
  span: SourceSpan | null;
}

interface AmountCandidate extends SourceSpan {
  amount: number;
  priority: number;
}

const SLANG_AMOUNTS: ReadonlyArray<[RegExp, number]> = [
  [/\bgoceng\b/i, 5_000],
  [/\bceban\b/i, 10_000],
  [/\bnoban\b/i, 20_000],
  [/\b(?:goban|gocap)\b/i, 50_000],
  [/\bgopek\b/i, 500],
  [/\bseceng\b/i, 1_000],
  [/\bcepek\b/i, 100],
  [/\bsejut\b/i, 1_000_000],
  [/\bjigo\b/i, 25_000],
];

const CATEGORY_RULES: ReadonlyArray<[string, RegExp]> = [
  ['Kesehatan', /\b(dokter|rumah sakit|obat|vitamin|kesehatan|medical|apotek|klinik|periksa|gigi|checkup|imunisasi|vaksin)\b/gi],
  ['Pendidikan', /\b(sekolah|kuliah|kursus|les|buku|pendidikan|training|seminar|webinar|workshop|spp|seragam|alat tulis)\b/gi],
  ['Rumah Tangga', /\b(sabun|sampo|tisu|tissue|deterjen|pembersih|rumah tangga|galon|gas|elpiji|baterai|lampu|perabot|renovasi|tukang)\b/gi],
  ['Komunikasi', /\b(pulsa|telepon|paket|kuota|data|sim card|kartu perdana)\b/gi],
  ['Tagihan', /\b(listrik|air|pdam|internet|wifi|token|pln|tagihan|bpjs|asuransi|cicilan|kredit|hutang|pinjaman|sewa|kos|kontrakan)\b/gi],
  ['Makanan & Minuman', /\b(makan|nasi|ayam|bebek|soto|bakso|mie|kopi|teh|jus|minuman|restoran|warung|cafe|geprek|padang|burger|pizza|snack|jajan|kue|roti|sarapan|lunch|dinner)\b/gi],
  ['Transportasi', /\b(bensin|ojek|grab|gojek|taxi|bus|kereta|krl|mrt|parkir|tol|motor|mobil|servis|bengkel|ban|oli|driver|uber|maxim|indrive|angkot)\b/gi],
  ['Hiburan', /\b(bioskop|game|streaming|netflix|spotify|youtube|hiburan|nonton|wisata|liburan|hotel|staycation|konser|tiket|musik|hobi)\b/gi],
  ['Belanja', /\b(belanja|shopping|mall|pasar|supermarket|indomaret|alfamart|toped|tokopedia|shopee|lazada|bukalapak|baju|celana|sepatu|tas|aksesoris|skincare|makeup)\b/gi],
];

const INCOME_CATEGORY_RULES: ReadonlyArray<[string, RegExp]> = [
  ['Gaji', /\b(gaji|salary|payday|bayaran|upah)\b/gi],
  ['Bonus', /\b(bonus|thr|hadiah|reward|insentif)\b/gi],
  ['Penjualan', /\b(jual|penjualan|sold|laku|dagang|toko)\b/gi],
  ['Investasi', /\b(investasi|saham|reksadana|crypto|dividen|profit|bunga|deposito)\b/gi],
  ['Freelance', /\b(freelance|proyek|project|side job|ceperan|nulis|desain|coding)\b/gi],
];

const DATE_PATTERNS: ReadonlyArray<{ pattern: RegExp; offsetDays: (match: RegExpExecArray) => number }> = [
  { pattern: /\bkemarin lusa\b/i, offsetDays: () => -2 },
  { pattern: /\bdua hari lalu\b/i, offsetDays: () => -2 },
  { pattern: /\b(\d+)\s*hari(?:\s+yang)?\s+lalu\b/i, offsetDays: (match) => -Number(match[1]) },
  { pattern: /\b(\d+)\s*hari\s*(?:lagi|ke\s*depan)\b/i, offsetDays: (match) => Number(match[1]) },
  { pattern: /\bminggu lalu\b/i, offsetDays: () => -7 },
  { pattern: /\bhari ini\b/i, offsetDays: () => 0 },
  { pattern: /\bkemarin\b/i, offsetDays: () => -1 },
  { pattern: /\bbesok\b/i, offsetDays: () => 1 },
  { pattern: /\blusa\b/i, offsetDays: () => 2 },
];

function spansOverlap(left: SourceSpan, right: SourceSpan): boolean {
  return left.start < right.end && right.start < left.end;
}

function matchSpan(match: RegExpExecArray): SourceSpan {
  return { start: match.index, end: match.index + match[0].length, text: match[0] };
}

function localDateWithSameClock(calendarDate: string, now: Date): Date {
  const date = parseLocalCalendarDate(calendarDate);
  if (!date) throw new Error('Tanggal suara tidak valid');
  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return date;
}

/**
 * Exactly zero or one date expression is accepted. `tanggal N` means the most
 * recent occurrence: this month when N is not in the future, otherwise the
 * previous month. If that selected month does not contain N, parsing fails
 * rather than allowing JavaScript overflow or guessing another month.
 */
export function parseVoiceDateExpression(text: string, now: Date = new Date()): ParsedDateExpression {
  const matches: Array<{ span: SourceSpan; date: Date }> = [];
  const today = formatLocalCalendarDate(now);

  for (const rule of DATE_PATTERNS) {
    const match = rule.pattern.exec(text);
    if (!match) continue;
    const offset = rule.offsetDays(match);
    if (!Number.isSafeInteger(offset) || Math.abs(offset) > 3_650) {
      throw new Error('Rentang tanggal suara terlalu besar');
    }
    const calendarDate = addCalendarDays(today, offset);
    if (!calendarDate) throw new Error('Tanggal suara tidak valid');
    matches.push({ span: matchSpan(match), date: localDateWithSameClock(calendarDate, now) });
  }

  const specificPattern = /\btanggal\s+(\d{1,2})\b/i;
  const specificMatch = specificPattern.exec(text);
  if (specificMatch) {
    const day = Number(specificMatch[1]);
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (day > now.getDate()) {
      month -= 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }
    if (day < 1 || day > daysInCalendarMonth(year, month)) {
      throw new Error(`Tanggal ${day} tidak valid untuk bulan yang dipilih`);
    }
    const calendarDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    matches.push({ span: matchSpan(specificMatch), date: localDateWithSameClock(calendarDate, now) });
  }

  // Longer phrases contain shorter ones (e.g. kemarin lusa); collapse overlap,
  // but reject genuinely separate date instructions as ambiguous.
  matches.sort((a, b) => b.span.text.length - a.span.text.length);
  const distinct = matches.filter((candidate, index, all) =>
    !all.slice(0, index).some((accepted) => spansOverlap(candidate.span, accepted.span)),
  );
  if (distinct.length > 1) throw new Error('Terdapat lebih dari satu tanggal yang berbeda');
  return distinct[0] ?? { date: new Date(now), span: null };
}

export function parseVoiceDate(text: string, now: Date = new Date()): Date {
  return parseVoiceDateExpression(text, now).date;
}

export function preprocessVoiceTranscript(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function parseGroupedOrPlainNumber(token: string): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  if (/^\d{1,3}(?:\.\d{3})+$/.test(token)) return Number(token.replace(/\./g, ''));
  if (/^\d{1,3}(?:,\d{3})+$/.test(token)) return Number(token.replace(/,/g, ''));
  return null;
}

function collectMatches(text: string, pattern: RegExp, build: (match: RegExpExecArray) => number | null, priority: number): AmountCandidate[] {
  const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  const candidates: AmountCandidate[] = [];
  for (const match of text.matchAll(regex)) {
    const amount = build(match as RegExpExecArray);
    if (amount !== null && match.index !== undefined) {
      candidates.push({ ...matchSpan(match as RegExpExecArray), amount, priority });
    }
  }
  return candidates;
}

function parseAmount(text: string, excludedSpan: SourceSpan | null): AmountCandidate {
  const candidates: AmountCandidate[] = [];
  // Signs and explicit item counts are not transaction amounts.
  const signedNumberSpans = collectMatches(text, /[+-]\d+(?:(?:\.|,)\d+)*/g, () => 1, 99);
  const quantitySpans = collectMatches(
    text,
    /\b\d+\s*(?:buah|porsi|botol|gelas|buku|tiket|item|pcs?|lembar|kilogram|kg)\b/gi,
    () => 1,
    99,
  );

  for (const [pattern, amount] of SLANG_AMOUNTS) {
    candidates.push(...collectMatches(text, pattern, () => amount, 4));
  }

  candidates.push(...collectMatches(
    text,
    /\b(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(ribu|rb|k|juta|jt)\b/gi,
    (match) => {
      const multiplier = /^(?:juta|jt)$/i.test(match[2]) ? 1_000_000 : 1_000;
      const decimal = Number(match[1].replace(',', '.'));
      const amount = decimal * multiplier;
      return Number.isInteger(amount) ? amount : null;
    },
    3,
  ));

  candidates.push(...collectMatches(
    text,
    /\brp\.?\s*(\d+(?:(?:\.|,)\d+)*)\b/gi,
    (match) => parseGroupedOrPlainNumber(match[1]),
    2,
  ));

  candidates.push(...collectMatches(
    text,
    /\b\d+(?:(?:\.|,)\d+)*\b/g,
    (match) => parseGroupedOrPlainNumber(match[0]),
    1,
  ));

  const eligible = candidates.filter((candidate) =>
    (!excludedSpan || !spansOverlap(candidate, excludedSpan)) &&
    !signedNumberSpans.some((signed) => spansOverlap(candidate, signed)) &&
    !quantitySpans.some((quantity) => spansOverlap(candidate, quantity)) &&
    parseRupiahAmount(candidate.amount) !== null,
  );
  if (eligible.length === 0) throw new Error('Jumlah transaksi tidak ditemukan atau tidak valid');

  const highestPriority = Math.max(...eligible.map(({ priority }) => priority));
  const strongest = eligible.filter(({ priority }) => priority === highestPriority);
  // Unit/Rp candidates can overlap their underlying bare number; retain the
  // complete expression. Separate equally strong expressions are ambiguous.
  strongest.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const distinct = strongest.filter((candidate, index, all) =>
    !all.slice(0, index).some((accepted) => spansOverlap(candidate, accepted)),
  );
  if (distinct.length !== 1) throw new Error('Terdapat lebih dari satu jumlah transaksi');

  const candidate = distinct[0];
  if (candidate.priority === 1 && candidate.amount < 1_000 && /\b(makan|nasi|kopi|parkir|bensin|ojek|angkot|geprek|es)\b/i.test(text)) {
    candidate.amount *= 1_000;
  }
  if (parseRupiahAmount(candidate.amount) === null) throw new Error('Jumlah transaksi tidak valid');
  return candidate;
}

function countRuleMatches(text: string, pattern: RegExp): number {
  return Array.from(text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))).length;
}

export function detectVoiceTransactionType(text: string): TransactionType {
  const expenseEvidence = [
    /\b(beli|belanja|bayar|membayar|keluar|habis)\b/i,
    /\b(transfer|kirim)\s+ke\b/i,
    /\bkasih\s+(?:ibu|bapak|ayah|adik|kakak|teman|orang)\b/i,
    /\b(tagihan|cicilan|hutang|sewa)\b/i,
  ].some((pattern) => pattern.test(text));
  const incomeEvidence = [
    /\b(?:terima|menerima|dapat|dapet|dibayar)\s+(?!kasih\b)(?:uang\s+)?(?:gaji|bonus|upah|bayaran|transfer|hadiah|pendapatan|\w+\s+dari\b)/i,
    /\b(?:uang|transfer)\s+masuk\b/i,
    /\b(?:jual|penjualan|pendapatan|cuan|dividen|profit)\b/i,
  ].some((pattern) => pattern.test(text));

  // Explicit outgoing actions and liabilities win conflicts (e.g. "bayar gaji
  // pegawai" and "dapat tagihan"). Otherwise require bounded income evidence.
  return expenseEvidence ? 'expense' : incomeEvidence ? 'income' : 'expense';
}

export function categorizeVoiceTransaction(text: string, type: TransactionType): string {
  const rules = type === 'income' ? INCOME_CATEGORY_RULES : CATEGORY_RULES;
  let bestCategory: string | null = null;
  let bestScore = 0;
  for (const [category, pattern] of rules) {
    const score = countRuleMatches(text, pattern);
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }
  return bestCategory ?? (type === 'income' ? 'Pemasukan Lain' : 'Lainnya');
}

function removeSpans(text: string, spans: SourceSpan[]): string {
  const characters = Array.from(text);
  for (const span of spans) {
    for (let index = span.start; index < span.end; index += 1) characters[index] = ' ';
  }
  return characters.join('');
}

export function parseVoiceTransaction(text: string, now: Date = new Date()): ParsedVoiceTransaction {
  if (Number.isNaN(now.getTime())) throw new Error('Waktu acuan tidak valid');
  const processedText = preprocessVoiceTranscript(text);
  if (!processedText) throw new Error('Input suara kosong');

  const parsedDate = parseVoiceDateExpression(processedText, now);
  const parsedAmount = parseAmount(processedText, parsedDate.span);
  const type = detectVoiceTransactionType(processedText);

  let description = removeSpans(processedText, [parsedAmount, ...(parsedDate.span ? [parsedDate.span] : [])]);
  description = description
    .replace(/\b(beli|bayar|untuk|dapat|dapet|terima|menerima|rp|rupiah|seharga|habis|keluar)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  description = description ? description.charAt(0).toUpperCase() + description.slice(1) : 'Transaksi suara';

  return {
    type,
    amount: parsedAmount.amount,
    description,
    category: categorizeVoiceTransaction(processedText, type),
    date: parsedDate.date,
  };
}
