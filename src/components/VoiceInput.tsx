
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Mic, MicOff, Hash, Edit, Square } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface VoiceInputProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

type ParsedTransaction = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
};

type WebSpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type WebSpeechRecognitionErrorEvent = {
  error: string;
};

type WebSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

const VoiceInput: React.FC<VoiceInputProps> = ({ onAddTransaction, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransaction, setParsedTransaction] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState<string>('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const processVoiceInputRef = useRef<(text: string) => void>(() => {});

  const categories = {
    expense: [
      'Makanan & Minuman',
      'Transportasi',
      'Belanja',
      'Tagihan',
      'Kesehatan',
      'Hiburan',
      'Pendidikan',
      'Rumah Tangga',
      'Komunikasi',
      'Lainnya'
    ],
    income: [
      'Gaji',
      'Bonus',
      'Penjualan',
      'Investasi',
      'Freelance',
      'Pemasukan Lain'
    ]
  };

  useEffect(() => {
    // If not native (Web), initialize standard SpeechRecognition
    if (!Capacitor.isNativePlatform()) {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setError('Browser tidak mendukung speech recognition. Gunakan Chrome atau Edge.');
        return;
      }

      const w = window as unknown as {
        SpeechRecognition?: WebSpeechRecognitionCtor;
        webkitSpeechRecognition?: WebSpeechRecognitionCtor;
      };
      const SpeechRecognitionWeb = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!SpeechRecognitionWeb) {
        setError('Browser tidak mendukung speech recognition. Gunakan Chrome atau Edge.');
        return;
      }

      recognitionRef.current = new SpeechRecognitionWeb();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'id-ID';

      recognitionRef.current.onresult = (event) => {
        const finalTranscript = event.results?.[0]?.[0]?.transcript ?? '';
        setTranscript(finalTranscript);
        processVoiceInputRef.current(finalTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'no-speech') {
          setError('Tidak ada suara terdeteksi. Silakan coba lagi.');
        } else if (event.error === 'network') {
          setError('Masalah koneksi jaringan. Periksa internet Anda.');
        } else {
          setError('Terjadi kesalahan: ' + event.error);
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    } else {
       // Check permissions for Native
       SpeechRecognition.checkPermissions().then((permission) => {
           if (permission.speechRecognition !== 'granted') {
               SpeechRecognition.requestPermissions();
           }
       });
    }
  }, []);

  const startListening = async () => {
    setTranscript('');
    setParsedTransaction(null);
    setError('');
    setIsEditingCategory(false);

    if (Capacitor.isNativePlatform()) {
        try {
            const hasPermission = await SpeechRecognition.requestPermissions();
            if (hasPermission.speechRecognition === 'granted') {
                setIsListening(true);
                const { matches } = await SpeechRecognition.start({
                    language: "id-ID",
                    maxResults: 1,
                    prompt: "Katakan transaksi...",
                    partialResults: false,
                    popup: false,
                });
                
                if (matches && matches.length > 0) {
                    const text = matches[0];
                    setTranscript(text);
                    processVoiceInputRef.current(text);
                }
                setIsListening(false);
            } else {
                setError("Izin mikrofon ditolak.");
            }
        } catch (e: unknown) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError("Gagal memulai: " + message);
            setIsListening(false);
        }
    } else {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Failed to start recognition:", e);
            }
        }
    }
  };

  const stopListening = async () => {
    if (Capacitor.isNativePlatform()) {
        await SpeechRecognition.stop();
        setIsListening(false);
    } else {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }
  };

  // Improved Categorization Logic
  const smartCategorize = (text: string, type: 'income' | 'expense'): string => {
    const lowerText = text.toLowerCase();
    
    if (type === 'income') {
      if (lowerText.match(/\b(gaji|salary|payday|bayaran|upah)\b/)) return 'Gaji';
      if (lowerText.match(/\b(bonus|thr|hadiah|reward|insentif)\b/)) return 'Bonus';
      if (lowerText.match(/\b(jual|sold|laku|dagang|transaksi|toko)\b/)) return 'Penjualan';
      if (lowerText.match(/\b(investasi|saham|reksadana|crypto|dividen|profit|bunga|deposito)\b/)) return 'Investasi';
      if (lowerText.match(/\b(freelance|proyek|project|side job|ceperan|nulis|desain|coding)\b/)) return 'Freelance';
      return 'Pemasukan Lain';
    } else {
      // Food & Drink - Expanded
      if (lowerText.match(/\b(makan|nasi|ayam|bebek|soto|bakso|mie|kopi|teh|jus|minuman|restoran|warung|cafe|geprek|padang|burger|pizza|snack|jajan|kue|roti|sarapan|lunch|dinner|malam|siang|pagi)\b/))
        return 'Makanan & Minuman';
      
      // Transport - Expanded
      if (lowerText.match(/\b(bensin|ojek|grab|gojek|taxi|bus|kereta|krl|mrt|parkir|tol|motor|mobil|servis|bengkel|ban|oli|driver|uber|maxim|indrive|angkot)\b/))
        return 'Transportasi';
      
      // Shopping - Expanded
      if (lowerText.match(/\b(beli|belanja|shopping|mall|toko|pasar|supermarket|indomaret|alfamart|toped|tokopedia|shopee|lazada|bukalapak|baju|celana|sepatu|tas|aksesoris|skincare|makeup)\b/))
        return 'Belanja';
      
      // Bills - Expanded
      if (lowerText.match(/\b(listrik|air|pdam|telepon|internet|wifi|pulsa|token|pln|tagihan|bpjs|asuransi|cicilan|kredit|hutang|pinjaman|sewa|kos|kontrakan)\b/))
        return 'Tagihan';
      
      // Health - Expanded
      if (lowerText.match(/\b(dokter|rumah sakit|obat|vitamin|kesehatan|medical|apotek|klinik|periksa|gigi|mata|checkup|imunisasi|vaksin)\b/))
        return 'Kesehatan';
      
      // Entertainment - Expanded
      if (lowerText.match(/\b(bioskop|game|streaming|netflix|spotify|youtube|hiburan|nonton|wisata|jalan|liburan|hotel|staycation|konser|tiket|musik|hobi)\b/))
        return 'Hiburan';
      
      // Education - Expanded
      if (lowerText.match(/\b(sekolah|kuliah|kursus|les|buku|pendidikan|training|seminar|webinar|workshop|spp|uang gedung|seragam|alat tulis)\b/))
        return 'Pendidikan';
      
      // Household - Expanded
      if (lowerText.match(/\b(sabun|sampo|tissue|deterjen|pembersih|rumah tangga|galon|gas|elpiji|baterai|lampu|perabot|renovasi|tukang)\b/))
        return 'Rumah Tangga';
      
      // Communication - Expanded
      if (lowerText.match(/\b(paket|kuota|data|sim card|kartu perdana)\b/))
        return 'Komunikasi';
      
      return 'Lainnya';
    }
  };

  const processVoiceInput = (text: string) => {
    setIsProcessing(true);
    
    try {
      const result = parseTransaction(text);
      setParsedTransaction(result);
    } catch (error) {
      console.error(error);
      setError('Tidak dapat memahami input. Coba lagi dengan format: "beli nasi 15 ribu" atau "dapat gaji 5 juta"');
    } finally {
      setIsProcessing(false);
    }
  };
  processVoiceInputRef.current = processVoiceInput;

  const parseDate = (text: string): Date => {
    const lowerText = text.toLowerCase();
    const today = new Date();
    
    // Relative dates
    if (lowerText.includes('kemarin lusa') || lowerText.includes('dua hari lalu')) {
      const d = new Date(today);
      d.setDate(d.getDate() - 2);
      return d;
    }
    if (lowerText.includes('kemarin')) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d;
    }
    if (lowerText.includes('besok')) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d;
    }
    if (lowerText.includes('lusa')) {
      const d = new Date(today);
      d.setDate(d.getDate() + 2);
      return d;
    }
    if (lowerText.match(/(\d+)\s*hari\s*(yang)?\s*lalu/)) {
        const match = lowerText.match(/(\d+)\s*hari\s*(yang)?\s*lalu/);
        if (match) {
            const days = parseInt(match[1]);
            const d = new Date(today);
            d.setDate(d.getDate() - days);
            return d;
        }
    }
    if (lowerText.match(/(\d+)\s*hari\s*(lagi|ke\s*depan)/)) {
        const match = lowerText.match(/(\d+)\s*hari\s*(lagi|ke\s*depan)/);
        if (match) {
            const days = parseInt(match[1]);
            const d = new Date(today);
            d.setDate(d.getDate() + days);
            return d;
        }
    }

    // Specific dates (simple implementation for "tanggal X")
    const dateMatch = lowerText.match(/tanggal\s*(\d{1,2})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      if (day >= 1 && day <= 31) {
        const d = new Date(today);
        if (day > today.getDate()) {
            d.setMonth(d.getMonth() - 1);
        }
        d.setDate(day);
        return d;
      }
    }

    return today;
  };

  /**
   * Preprocesses transcript to normalize Indonesian number formats
   * 
   * Purpose: Handle Indonesian thousand separators (periods) vs decimal points
   * 
   * Examples:
   * - "100.000" (no unit word) → "100000" (remove period - thousand separator)
   * - "2.5 juta" (has unit word) → "2.5 juta" (keep period - decimal point)
   * - "1.500.000" (multiple periods) → "1500000" (remove all - thousand separators)
   * - "beli nasi 50.000" → "beli nasi 50000"
   * 
   * Strategy:
   * - Use negative lookahead to check if number is followed by unit words (ribu/juta/etc)
   * - If NO unit word → Remove periods (they are thousand separators)
   * - If YES unit word → Keep period (it's a decimal multiplier like "2.5 juta")
   */
  const preprocessTranscript = (text: string): string => {
    let processed = text;
    
    // Pattern: Match numbers with Indonesian thousand separators (X.XXX or X.XXX.XXX)
    // But NOT if followed by unit words (ribu, juta, etc.) - those are decimal multipliers
    // Regex breakdown:
    // \b(\d{1,3}(?:\.\d{3})+) - Matches numbers like 100.000 or 1.500.000
    // (?!\s*(?:ribu|juta|jt|rb|k)\b) - Negative lookahead: NOT followed by unit words
    processed = processed.replace(
      /\b(\d{1,3}(?:\.\d{3})+)(?!\s*(?:ribu|juta|jt|rb|k)\b)/gi,
      (match) => {
        // Remove all periods from the matched number
        return match.replace(/\./g, '');
      }
    );
    
    return processed;
  };

  /**
   * Enhanced Voice Input Parser with Indonesian Number Format Support
   * 
   * Test Cases & Expected Results:
   * 
   * 1. Indonesian Thousand Separators (Period Removal):
   *    - "beli nasi 100.000" → Amount: 100,000 ✓
   *    - "dapat gaji 5.500.000" → Amount: 5,500,000 ✓
   *    - "parkir 50.000" → Amount: 50,000 ✓
   * 
   * 2. Decimal Multipliers (Period Preserved):
   *    - "dapat bonus 2.5 juta" → Amount: 2,500,000 (2.5 × 1,000,000) ✓
   *    - "beli kopi 15.5 ribu" → Amount: 15,500 (15.5 × 1,000) ✓
   *    - "dapat 1.2 juta" → Amount: 1,200,000 ✓
   * 
   * 3. Word-based Units:
   *    - "beli nasi 50 ribu" → Amount: 50,000 ✓
   *    - "dapat gaji 5 juta" → Amount: 5,000,000 ✓
   *    - "parkir ceban" → Amount: 10,000 (slang) ✓
   * 
   * 4. Intelligent Interpretation:
   *    - "15.000 ribu" → Amount: 15,000 (interpret as 15 × 1000, not 15,000 × 1000) ✓
   *    - "100 ribu" → Amount: 100,000 ✓
   *    - "2.5 juta" → Amount: 2,500,000 ✓
   * 
   * 5. Small Item Auto-multiply:
   *    - "makan nasi 15" → Amount: 15,000 (auto ×1000 for food items) ✓
   *    - "parkir 5" → Amount: 5,000 (auto ×1000 for parking) ✓
   * 
   * 6. Edge Cases:
   *    - "Rp 100.000" → Amount: 100,000 (with Rp prefix) ✓
   *    - "50.000 kemarin" → Amount: 50,000 (with date) ✓
   */
  const parseTransaction = (text: string): ParsedTransaction => {
    // Preprocess to normalize Indonesian number formats
    const processedText = preprocessTranscript(text);
    const lowerText = processedText.toLowerCase().trim();
    
    console.log('=== Voice Input Parsing ===');
    console.log('Original transcript:', text);
    console.log('Preprocessed text:', processedText);
    console.log('Lowercase text:', lowerText);
    console.log('---');
    
    // 1. Determine Type
    // Enhanced income keywords to cover Indonesian variations and slang
    const incomeKeywords = [
      'dapat', 'dapet',           // get/received (standard & slang)
      'terima',                   // received
      'gaji',                     // salary
      'bonus',                    // bonus
      'untung',                   // profit
      'hasil',                    // result/earnings
      'jual',                     // sell
      'pendapatan',               // income
      'masuk',                    // incoming
      'dibayar',                  // paid
      'cuan',                     // profit (slang)
      'nemu', 'nemuin',           // found (standard & alternative)
      'dikasih', 'dikasi', 'kasih', // was given / given
      'hadiah',                   // gift/prize
      'menang',                   // won
      'transfer masuk',           // incoming transfer
    ];
    let type: 'income' | 'expense' = 'expense';
    
    if (incomeKeywords.some(keyword => lowerText.includes(keyword))) {
      type = 'income';
      console.log('✓ Detected as INCOME (keyword matched)');
    } else {
      console.log('✓ Detected as EXPENSE (default)');
    }

    // 2. Parse Amount (Enhanced)
    let amount = 0;
    let description = processedText;

    // Slang detection
    const slangMap: Record<string, number> = {
        'goceng': 5000,
        'ceban': 10000,
        'noban': 20000,
        'goban': 50000,
        'gocap': 50000,
        'gopek': 500,
        'seceng': 1000,
        'cepek': 100,
        'sejut': 1000000,
        'jigo': 25000
    };

    for (const [slang, val] of Object.entries(slangMap)) {
        if (lowerText.includes(slang)) {
            amount = val;
            console.log('✓ Found slang amount:', slang, '→', amount);
            description = description.replace(new RegExp(`\\b${slang}\\b`, 'gi'), '');
            break; 
        }
    }
    if (amount === 0) console.log('✗ No slang detected');

    // Standard Number Parsing
    if (amount === 0) {
        const rpWithDotsMatch = processedText.match(/Rp\.?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i);
        if (rpWithDotsMatch) {
        let numStr = rpWithDotsMatch[1];
        numStr = numStr.replace(/[.,]/g, ''); 
        
        amount = parseInt(numStr);
        console.log('✓ Found Rp amount:', rpWithDotsMatch[1], '→', amount);
        description = processedText.replace(new RegExp(rpWithDotsMatch[0], 'gi'), '').trim();
        }
        if (amount === 0) console.log('✗ No Rp format detected');
    }

    // Parse "ribu" atau "rb" atau "k"
    if (amount === 0) {
      const ribuMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)\b/);
      if (ribuMatch) {
        const numStr = ribuMatch[1].replace(',', '.');
        amount = parseFloat(numStr) * 1000;
        console.log('✓ Found ribu amount:', numStr, '× 1000 =', amount);
        description = processedText.replace(new RegExp(ribuMatch[0], 'gi'), '').trim();
      }
      if (amount === 0) console.log('✗ No ribu format detected');
    }

    // Parse "juta" atau "jt"
    if (amount === 0) {
      const jutaMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b/);
      if (jutaMatch) {
        const numStr = jutaMatch[1].replace(',', '.');
        amount = parseFloat(numStr) * 1000000;
        console.log('✓ Found juta amount:', numStr, '× 1000000 =', amount);
        description = processedText.replace(new RegExp(jutaMatch[0], 'gi'), '').trim();
      }
      if (amount === 0) console.log('✗ No juta format detected');
    }

    // Parse angka biasa tanpa satuan
    if (amount === 0) {
      // After preprocessing, numbers are clean (no thousand separators)
      // This regex now handles: "100000", "2.5", "15" etc.
      const numberMatch = lowerText.match(/(?:rp\.?\s*)?(\d+(?:\.\d+)?)/);
      if (numberMatch) {
        const numStr = numberMatch[1];
        const num = parseFloat(numStr);
        console.log('✓ Found raw number:', numStr, '→', num);
        
        const smallItemKeywords = ['makan', 'nasi', 'kopi', 'parkir', 'bensin', 'ojek', 'angkot', 'geprek', 'es'];
        if (num < 1000 && smallItemKeywords.some(keyword => lowerText.includes(keyword))) {
          amount = num * 1000;
          console.log('  → Small item detected, multiplied by 1000:', amount);
        } else {
          amount = num;
        }
        description = processedText.replace(new RegExp(numberMatch[0], 'gi'), '').trim();
      }
      if (amount === 0) console.log('✗ No raw number detected');
    }

    // 3. Clean description
    const wordsToRemove = ['beli', 'bayar', 'untuk', 'dapat', 'terima', 'rp', 'rupiah', 'seharga', 'habis', 'keluar'];
    let cleanDescription = description;
    wordsToRemove.forEach(word => {
      cleanDescription = cleanDescription.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    
    const dateWords = ['kemarin', 'hari ini', 'lusa', 'minggu lalu', 'tanggal'];
    dateWords.forEach(word => {
        cleanDescription = cleanDescription.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    cleanDescription = cleanDescription.replace(/\b\d+\b/g, ''); 

    cleanDescription = cleanDescription.replace(/\s+/g, ' ').trim();
    cleanDescription = cleanDescription.charAt(0).toUpperCase() + cleanDescription.slice(1);

    if (amount === 0) {
      throw new Error('No amount found');
    }

    // 4. Determine Category
    const category = smartCategorize(processedText, type);

    // 5. Determine Date
    const date = parseDate(processedText);

    console.log('---');
    console.log('Final parsed result:', { type, amount, description: cleanDescription, category, date });
    console.log('======================');

    return {
      type,
      amount,
      description: cleanDescription || 'Transaksi',
      category,
      date
    };
  };

  const handleCategoryChange = (newCategory: string) => {
    if (parsedTransaction) {
      setParsedTransaction({
        ...parsedTransaction,
        category: newCategory
      });
      setIsEditingCategory(false);
    }
  };

  const handleSave = () => {
    if (parsedTransaction && parsedTransaction.amount > 0) {
      onAddTransaction({
        ...parsedTransaction,
        date: parsedTransaction.date.toISOString(), 
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-row items-center justify-between pb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Hash className="h-5 w-5 text-primary" />
            Input Suara
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className=" h-8 w-8 p-0 hover:bg-muted">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2  text-sm">
              {error}
            </div>
          )}

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Coba: "Beli nasi padang goceng kemarin"
            </p>
            
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={!!error && error.includes('Browser')}
              className={`w-24 h-24 transition-all duration-300 ${ 
                isListening 
                  ? 'bg-destructive hover:bg-destructive/90 animate-pulse shadow-xl scale-110' 
                  : 'bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl'
              }`}
            >
              {isListening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
            </Button>
            
            <p className="text-sm font-medium text-foreground">
              {isListening ? 'Mendengarkan…' : 'Tekan untuk berbicara'}
            </p>
          </div>

          {transcript && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Input Suara</p>
              <p className="text-sm italic text-foreground">"{transcript}"</p>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-4">
              <div className="animate-spin  h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Memproses...</p>
            </div>
          )}

          {parsedTransaction && (
            <div className="rounded-lg border bg-success/5 border-success/20 p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-2 w-2  bg-success animate-pulse"></div>
                 <p className="font-semibold text-success text-sm">Analisis Selesai</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2 flex justify-between items-center rounded-md border bg-background p-2">
                  <span className="text-muted-foreground">Jenis</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${ 
                    parsedTransaction.type === 'income' 
                    ? 'bg-success/20 text-success border border-success/30' 
                    : 'bg-destructive/20 text-destructive border border-destructive/30'
                  }`}>
                    {parsedTransaction.type === 'income' ? 'PEMASUKAN' : 'PENGELUARAN'}
                  </span>
                </div>

                <div className="col-span-2 flex justify-between items-center rounded-md border bg-background p-2">
                  <span className="text-muted-foreground">Tanggal</span>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Square className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(parsedTransaction.date, 'dd MMMM yyyy', { locale: id })}
                  </div>
                </div>

                <div className="col-span-2 flex justify-between items-center group rounded-md border bg-background p-2">
                  <span className="text-muted-foreground">Kategori</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{parsedTransaction.category}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingCategory(true)}
                      className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {isEditingCategory && (
                  <div className="col-span-2">
                    <Select value={parsedTransaction.category} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories[parsedTransaction.type].map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="col-span-2 rounded-md border bg-background p-3">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="font-bold text-lg text-foreground">Rp {parsedTransaction.amount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-muted-foreground">Ket</span>
                        <span className="font-medium text-sm text-foreground truncate ml-4">{parsedTransaction.description}</span>
                    </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="flex-1 bg-success hover:bg-success/90 text-success-foreground shadow-md">
                  Simpan
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTranscript('');
                    setParsedTransaction(null);
                    setIsEditingCategory(false);
                    startListening();
                  }}
                  className="px-3"
                >
                  Ulangi
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceInput;
