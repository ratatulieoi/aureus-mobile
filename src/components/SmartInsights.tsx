import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Quote } from 'lucide-react';
import { Transaction } from '@/pages/Index';

interface SmartInsightsProps {
  transactions: Transaction[];
}

const MONEY_QUOTES = [
  "Uang gak bisa beli kebahagiaan? berarti uangnya kurang banyak.",
  "follow github gw plis.",
  "Price is what you pay, value is what you get.",
  "Aturan No.1: Jangan pernah rugi. Aturan No.2: Kalau rugi, bilang aja 'uang belajar'.",
  "Being rich is having money; being wealthy is having time.",
  "I NEED A HUG-e amount of money.",
  "Bukan seberapa banyak duit yang lo hasilin, tapi seberapa lama lo bisa tahan pas liat diskon 80%.",
  "The only ex i miss is ex-tra money.",
  "so my future depends on.... me?.",
  "The Quickest way to Double your Money is to fold it over and put it back in your pocket!”.",
  "If you can count your money, work harder!.",
  "Cara terbaik untuk tidak mikirin duit adalah punya banyak duit. Atau amnesia. Pilih mana?",
  "Money isn't the most important thing in life, but it's reasonably close to oxygen.",
  "No plan is plan to stay broke.",
  "People come and go. mostly go if you dont have money.",
  "Tenang, masih bisa ngutang~",
  "Setiap transaksi adalah bukti bahwa saya kurang berpikir.",
  "Yaudah iya.",
  "ALL IN SMEMESTA!",
  "Ada yg baca ini ga sih?.",
  "Maka, sesungguhnya beserta kesulitan ada kemudahan. Sesungguhnya beserta kesulitan ada kemudahan.",
  "In the world you can be anything, be kind."
];

const SmartInsights: React.FC<SmartInsightsProps> = () => {
  const [quote, setQuote] = useState("");
  const [quoteHistory, setQuoteHistory] = useState<string[]>([]);

  useEffect(() => {
    // Get quote history from localStorage
    const savedHistory = localStorage.getItem('quoteHistory');
    const history: string[] = savedHistory ? JSON.parse(savedHistory) : [];
    
    // Filter out quotes that appeared in last 5
    const availableQuotes = MONEY_QUOTES.filter(q => !history.includes(q));
    
    // If all quotes have been shown, reset history
    const quotesToUse = availableQuotes.length > 0 ? availableQuotes : MONEY_QUOTES;
    
    // Pick a random quote
    const randomQuote = quotesToUse[Math.floor(Math.random() * quotesToUse.length)];
    setQuote(randomQuote);
    
    // Update history (keep last 5)
    const newHistory = [randomQuote, ...history].slice(0, 8);
    setQuoteHistory(newHistory);
    localStorage.setItem('quoteHistory', JSON.stringify(newHistory));
  }, []);

  return (
    <Card className="border-2 border-primary/20 shadow-[4px_4px_0px_0px_rgba(var(--primary),0.2)] hover:shadow-[6px_6px_0px_0px_rgba(var(--primary),0.4)] transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-display">
          <Quote className="h-5 w-5 text-primary rotate-180" />
          Kata Bijak (Mungkin)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative p-6 bg-primary/5 rounded-lg border border-dashed border-primary/30">
          <Quote className="absolute top-2 left-2 h-8 w-8 text-primary/10 -scale-x-100" />
          <p className="text-lg font-medium text-center italic text-foreground/80 font-serif leading-relaxed">
            "{quote}"
          </p>
          <Quote className="absolute bottom-2 right-2 h-8 w-8 text-primary/10" />
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartInsights;