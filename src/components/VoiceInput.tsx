
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Mic, MicOff, Brain, Edit, Calendar } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface VoiceInputProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onAddTransaction, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransaction, setParsedTransaction] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const recognitionRef = useRef<any>(null);

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

      const SpeechRecognitionWeb = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionWeb();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'id-ID';

      recognitionRef.current.onresult = (event: any) => {
        const finalTranscript = event.results[0][0].transcript;
        setTranscript(finalTranscript);
        processVoiceInput(finalTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
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
                    popup: true,
                });
                
                if (matches && matches.length > 0) {
                    const text = matches[0];
                    setTranscript(text);
                    processVoiceInput(text);
                }
                setIsListening(false);
            } else {
                setError("Izin mikrofon ditolak.");
            }
        } catch (e: any) {
            console.error(e);
            setError("Gagal memulai: " + e.message);
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

  const parseDate = (text: string): Date => {
    const lowerText = text.toLowerCase();
    const today = new Date();
    
    // Relative dates
    if (lowerText.includes('kemarin')) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d;
    }
    if (lowerText.includes('lusa')) { 
       // Let's assume user might interpret "kemarin lusa" as "day before yesterday"
       if (lowerText.includes('kemarin lusa') || lowerText.includes('dua hari lalu')) {
         const d = new Date(today);
         d.setDate(d.getDate() - 2);
         return d;
       }
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

  const parseTransaction = (text: string) => {
    const lowerText = text.toLowerCase().trim();
    console.log('Parsing text:', text);
    
    // 1. Determine Type
    const incomeKeywords = ['dapat', 'terima', 'gaji', 'bonus', 'untung', 'hasil', 'jual', 'pendapatan', 'masuk', 'dibayar', 'cuan'];
    let type: 'income' | 'expense' = 'expense';
    
    if (incomeKeywords.some(keyword => lowerText.includes(keyword))) {
      type = 'income';
    }

    // 2. Parse Amount (Enhanced)
    let amount = 0;
    let description = text;

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
            console.log('Found slang amount:', slang, '->', amount);
            description = description.replace(new RegExp(`\\b${slang}\\b`, 'gi'), '');
            break; 
        }
    }

    // Standard Number Parsing
    if (amount === 0) {
        const rpWithDotsMatch = text.match(/Rp\.?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i);
        if (rpWithDotsMatch) {
        let numStr = rpWithDotsMatch[1];
        numStr = numStr.replace(/[.,]/g, ''); 
        
        amount = parseInt(numStr);
        console.log('Found Rp amount:', rpWithDotsMatch[1], '->', amount);
        description = text.replace(new RegExp(rpWithDotsMatch[0], 'gi'), '').trim();
        }
    }

    // Parse "ribu" atau "rb" atau "k"
    if (amount === 0) {
      const ribuMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)\b/);
      if (ribuMatch) {
        const numStr = ribuMatch[1].replace(',', '.');
        amount = parseFloat(numStr) * 1000;
        console.log('Found ribu amount:', numStr, '->', amount);
        description = text.replace(new RegExp(ribuMatch[0], 'gi'), '').trim();
      }
    }

    // Parse "juta" atau "jt"
    if (amount === 0) {
      const jutaMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b/);
      if (jutaMatch) {
        const numStr = jutaMatch[1].replace(',', '.');
        amount = parseFloat(numStr) * 1000000;
        console.log('Found juta amount:', numStr, '->', amount);
        description = text.replace(new RegExp(jutaMatch[0], 'gi'), '').trim();
      }
    }

    // Parse angka biasa tanpa satuan
    if (amount === 0) {
      const numberMatch = lowerText.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)/);
      if (numberMatch) {
        const numStr = numberMatch[1].replace(',', '.');
        const num = parseFloat(numStr);
        console.log('Found raw number:', numStr, '->', num);
        
        const smallItemKeywords = ['makan', 'nasi', 'kopi', 'parkir', 'bensin', 'ojek', 'angkot', 'geprek', 'es'];
        if (num < 1000 && smallItemKeywords.some(keyword => lowerText.includes(keyword))) {
          amount = num * 1000;
          console.log('Small item detected, multiplied by 1000:', amount);
        } else {
          amount = num;
        }
        description = text.replace(new RegExp(numberMatch[0], 'gi'), '').trim();
      }
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
    const category = smartCategorize(text, type);

    // 5. Determine Date
    const date = parseDate(text);

    console.log('Final parsed result:', { type, amount, description: cleanDescription, category, date });

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-blue-600" />
            Smart Voice Input v2
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
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
              className={`w-24 h-24 rounded-full transition-all duration-300 ${ 
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-xl scale-110' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isListening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
            </Button>
            
            <p className="text-sm font-medium">
              {isListening ? '🎤 Mendengarkan...' : 'Tekan untuk berbicara'}
            </p>
          </div>

          {transcript && (
            <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Input Suara</p>
              <p className="text-sm italic">"{transcript}"</p>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Memproses dengan AI...</p>
            </div>
          )}

          {parsedTransaction && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 p-4 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                 <p className="font-semibold text-green-800 dark:text-green-200 text-sm">AI Analysis Complete</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2 flex justify-between items-center bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                  <span className="text-muted-foreground">Jenis</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${ 
                    parsedTransaction.type === 'income' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {parsedTransaction.type === 'income' ? 'PEMASUKAN' : 'PENGELUARAN'}
                  </span>
                </div>

                <div className="col-span-2 flex justify-between items-center bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                  <span className="text-muted-foreground">Tanggal</span>
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(parsedTransaction.date, 'dd MMMM yyyy', { locale: id })}
                  </div>
                </div>

                <div className="col-span-2 flex justify-between items-center group bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                  <span className="text-muted-foreground">Kategori</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600">{parsedTransaction.category}</span>
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
                      <SelectTrigger className="w-full bg-white dark:bg-gray-900">
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
                
                <div className="col-span-2 bg-white/80 dark:bg-black/40 p-3 rounded-lg border border-green-100 dark:border-green-900/50">
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
                <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceInput;
