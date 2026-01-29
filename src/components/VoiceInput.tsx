import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Check, Edit2, Calendar as CalendarIcon, Wallet, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction } from '@/pages/Index';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface VoiceInputProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onAddTransaction, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const recognitionRef = useRef<any>(null);

  const categories = {
    expense: ['Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan', 'Kesehatan', 'Hiburan', 'Pendidikan', 'Rumah Tangga', 'Komunikasi', 'Lainnya'],
    income: ['Gaji', 'Bonus', 'Penjualan', 'Investasi', 'Freelance', 'Pemasukan Lain']
  };

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) Haptics.impact({ style });
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      const SpeechWeb = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechWeb) {
        recognitionRef.current = new SpeechWeb();
        recognitionRef.current.lang = 'id-ID';
        recognitionRef.current.onresult = (e: any) => {
          const text = e.results[0][0].transcript;
          setTranscript(text);
          processText(text);
        };
        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onerror = () => setIsListening(false);
      }
    }
  }, []);

  const startListening = async () => {
    setTranscript('');
    setParsedData(null);
    setError('');
    triggerHaptic(ImpactStyle.Medium);

    if (Capacitor.isNativePlatform()) {
      try {
        const { speechRecognition } = await SpeechRecognition.requestPermissions();
        if (speechRecognition === 'granted') {
          setIsListening(true);
          const { matches } = await SpeechRecognition.start({
            language: "id-ID",
            partialResults: false,
            popup: true,
          });
          if (matches?.length) {
            setTranscript(matches[0]);
            processText(matches[0]);
          }
          setIsListening(false);
        }
      } catch (e: any) {
        setError(e.message);
        setIsListening(false);
      }
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const processText = (text: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const result = parseLogic(text);
        setParsedData(result);
        triggerHaptic(ImpactStyle.Light);
      } catch (e) {
        setError('Gagal memahami input. Gunakan format: "Nasi goreng 15rb"');
      }
      setIsProcessing(false);
    }, 800);
  };

  const parseLogic = (text: string) => {
    const lower = text.toLowerCase();
    let type: 'income' | 'expense' = lower.match(/\b(gaji|bonus|untung|jual|terima|dapat|masuk|cuan)\b/) ? 'income' : 'expense';
    
    // Simple amount extraction
    let amount = 0;
    const ribuMatch = lower.match(/(\d+)\s*(ribu|rb|k)/);
    const jutaMatch = lower.match(/(\d+)\s*(juta|jt)/);
    const rawMatch = lower.match(/\b(\d{3,})\b/);

    if (ribuMatch) amount = parseInt(ribuMatch[1]) * 1000;
    else if (jutaMatch) amount = parseInt(jutaMatch[1]) * 1000000;
    else if (rawMatch) amount = parseInt(rawMatch[1]);

    // Slang goceng ceban etc
    const slangs: any = { goceng: 5000, ceban: 10000, goban: 50000, gocap: 50000, seceng: 1000 };
    for (let s in slangs) if (lower.includes(s)) amount = slangs[s];

    // Date
    let date = new Date();
    if (lower.includes('kemarin')) date.setDate(date.getDate() - 1);

    // Category
    let category = type === 'income' ? 'Pemasukan Lain' : 'Lainnya';
    if (lower.match(/(makan|minum|nasi|kopi|bakso)/)) category = 'Makanan & Minuman';
    if (lower.match(/(bensin|gojek|grab|parkir|bus)/)) category = 'Transportasi';
    if (lower.match(/(beli|belanja|pasar|mall)/)) category = 'Belanja';

    return { type, amount, category, description: text.split(/\d/)[0].trim() || 'Transaksi Suara', date };
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        className="w-full max-w-md bg-white dark:bg-[#12141C] rounded-[40px] overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold tracking-tight">Voice Command</h3>
            <button onClick={onClose} className="p-2 bg-muted rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-6 py-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isListening ? () => {} : startListening}
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${
                isListening 
                ? 'bg-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)] scale-110' 
                : 'bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.3)]'
              }`}
            >
              {isListening ? (
                <div className="flex gap-1 items-center">
                  {[1,2,3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: [15, 35, 15] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1.5 bg-white rounded-full"
                    />
                  ))}
                </div>
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </motion.button>
            <p className="text-sm font-medium text-muted-foreground">
              {isListening ? 'Mendengarkan...' : 'Ketuk untuk bicara'}
            </p>
          </div>

          <AnimatePresence>
            {transcript && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-muted/50 rounded-2xl italic text-center">
                "{transcript}"
              </motion.div>
            )}

            {isProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4">
                <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </motion.div>
            )}

            {parsedData && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-indigo-600/5 border border-indigo-600/10 rounded-3xl p-6 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Terdeteksi</p>
                    <p className="text-2xl font-black">Rp {parsedData.amount.toLocaleString('id-ID')}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${parsedData.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {parsedData.type}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(parsedData.date, 'dd MMM yyyy', { locale: id })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold justify-end">
                    <Wallet className="h-3.5 w-3.5" />
                    {parsedData.category}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => onAddTransaction({...parsedData, date: parsedData.date.toISOString()})}
                    className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 rounded-2xl gap-2"
                  >
                    <Check className="h-4 w-4" /> Simpan
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setParsedData(null)}
                    className="h-12 w-12 rounded-2xl p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VoiceInput;