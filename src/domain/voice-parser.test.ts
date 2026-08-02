import { describe, expect, it } from 'vitest';
import {
  categorizeVoiceTransaction,
  detectVoiceTransactionType,
  parseVoiceTransaction,
} from '@/domain/voice-parser';

const NOW = new Date(2026, 2, 15, 10, 30, 0);

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('Indonesian voice transaction parser', () => {
  it.each([
    ['Rp 100.000 beli baju', 100_000],
    ['Rp 1.500.000 beli baju', 1_500_000],
    ['Rp 50000 beli baju', 50_000],
    ['beli baju 100.000', 100_000],
    ['dapat bonus 2.5 juta', 2_500_000],
    ['dapat bonus 2,5 juta', 2_500_000],
    ['beli kopi 15,5 ribu', 15_500],
    ['Rp 5 juta dari penjualan', 5_000_000],
    ['parkir ceban', 10_000],
  ])('parses %s as Rp %d', (input, amount) => {
    expect(parseVoiceTransaction(input, NOW).amount).toBe(amount);
  });

  it('excludes recognized date numbers and explicit quantities from amount candidates', () => {
    expect(parseVoiceTransaction('tanggal 5 beli baju 100000', NOW).amount).toBe(100_000);
    expect(parseVoiceTransaction('2 hari lalu beli baju 50000', NOW).amount).toBe(50_000);
    expect(parseVoiceTransaction('beli 2 buah buku harga 50000', NOW).amount).toBe(50_000);
  });

  it('rejects invalid, ambiguous, non-finite, zero, negative, and fractional Rupiah', () => {
    expect(() => parseVoiceTransaction('beli baju tanggal 5', NOW)).toThrow('Jumlah');
    expect(() => parseVoiceTransaction('beli baju 10000 dan sepatu 20000', NOW)).toThrow('lebih dari satu jumlah');
    expect(() => parseVoiceTransaction('beli baju 0', NOW)).toThrow('Jumlah');
    expect(() => parseVoiceTransaction('beli baju -100', NOW)).toThrow();
    expect(() => parseVoiceTransaction('beli baju 1.5', NOW)).toThrow();
    expect(() => parseVoiceTransaction(`beli baju ${'9'.repeat(40)}`, NOW)).toThrow();
  });

  it.each([
    ['beli nasi 50000 hari ini', '2026-03-15'],
    ['beli nasi 50000 kemarin', '2026-03-14'],
    ['beli nasi 50000 dua hari lalu', '2026-03-13'],
    ['beli nasi 50000 2 hari lalu', '2026-03-13'],
    ['beli nasi 50000 minggu lalu', '2026-03-08'],
    ['beli nasi 50000 besok', '2026-03-16'],
    ['beli nasi 50000 lusa', '2026-03-17'],
    ['tanggal 5 beli baju 50000', '2026-03-05'],
  ])('parses date expression in %s', (input, expected) => {
    expect(localDay(parseVoiceTransaction(input, NOW).date)).toBe(expected);
  });

  it('uses the previous month for a future day number and rejects impossible selected months', () => {
    expect(localDay(parseVoiceTransaction('tanggal 20 beli baju 50000', NOW).date)).toBe('2026-02-20');
    expect(() => parseVoiceTransaction('tanggal 31 beli baju 50000', NOW)).toThrow('tidak valid');
    expect(localDay(parseVoiceTransaction('tanggal 29 beli baju 50000', new Date(2024, 2, 15, 10)).date)).toBe('2024-02-29');
    expect(() => parseVoiceTransaction('tanggal 29 beli baju 50000', new Date(2025, 2, 15, 10))).toThrow('tidak valid');
  });

  it('rejects multiple separate date expressions', () => {
    expect(() => parseVoiceTransaction('kemarin atau tanggal 5 beli baju 50000', NOW)).toThrow('lebih dari satu tanggal');
  });

  it.each([
    ['terima kasih beli kopi 20 ribu', 'expense'],
    ['kasih ibu 100 ribu', 'expense'],
    ['masuk tol 20 ribu', 'expense'],
    ['bayar gaji pegawai 5 juta', 'expense'],
    ['terima gaji 5 juta', 'income'],
    ['transfer masuk 2 juta', 'income'],
    ['transfer ke ibu 100 ribu', 'expense'],
    ['dapat tagihan 200 ribu', 'expense'],
    ['jual motor 10 juta', 'income'],
  ])('detects type for %s', (input, expected) => {
    expect(detectVoiceTransactionType(input)).toBe(expected);
  });

  it.each([
    ['beli obat 20 ribu', 'Kesehatan'],
    ['beli buku 50 ribu', 'Pendidikan'],
    ['beli sabun 20 ribu', 'Rumah Tangga'],
    ['beli pulsa 20 ribu', 'Komunikasi'],
    ['bayar listrik malam ini 200 ribu', 'Tagihan'],
    ['makan malam 20 ribu', 'Makanan & Minuman'],
  ])('uses specific category evidence for %s', (input, expected) => {
    expect(categorizeVoiceTransaction(input, 'expense')).toBe(expected);
  });

  it('removes amount and recognized date expression from the description', () => {
    expect(parseVoiceTransaction('dua hari lalu beli buku 50 ribu', NOW).description).toBe('Buku');
  });
});
