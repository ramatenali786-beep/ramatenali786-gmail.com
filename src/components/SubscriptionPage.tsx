import React, { useState } from 'react';
import { 
  Check, 
  Video, 
  Phone, 
  MessageSquare, 
  BookOpen, 
  Sparkles, 
  Globe, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: { icon: any; text: string }[];
  accentColor: string;
  isPopular?: boolean;
  onSubscribe: (plan: string, billing: 'monthly' | 'yearly') => void;
}

const PriceCard = ({ 
  title, 
  description, 
  monthlyPrice, 
  yearlyPrice, 
  features, 
  accentColor, 
  isPopular,
  onSubscribe 
}: PriceCardProps) => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const price = billing === 'monthly' ? monthlyPrice : yearlyPrice;
  const period = billing === 'monthly' ? '/mo' : '/yr';

  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className={cn(
        "relative p-8 rounded-[2.5rem] bg-surface border border-white/5 flex flex-col h-full shadow-2xl transition-all group",
        isPopular && "border-gold/30 ring-1 ring-gold/20"
      )}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-bg-deep px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(197,160,89,0.5)]">
          Most Popular
        </div>
      )}

      <div className="mb-8 space-y-4">
        <div className={cn("w-14 h-14 rounded-3xl flex items-center justify-center border", `border-${accentColor}/20 bg-${accentColor}/10`)}>
           {title.includes('Communication') ? <Zap className={cn("w-7 h-7", `text-${accentColor}`)} /> : <BookOpen className={cn("w-7 h-7", `text-${accentColor}`)} />}
        </div>
        <div>
          <h3 className="text-2xl font-serif font-bold text-white">{title}</h3>
          <p className="text-sm text-text-dim mt-1">{description}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-serif font-bold text-white">${price}</span>
          <span className="text-text-dim font-medium uppercase text-[10px] tracking-widest">{period}</span>
        </div>
        
        {/* Billing Toggle inside card if multiple options */}
        <div className="flex bg-bg-deep/50 p-1 rounded-xl mt-4 border border-white/5">
          <button 
            onClick={() => setBilling('monthly')}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              billing === 'monthly' ? "bg-white/10 text-white" : "text-text-dim hover:text-white"
            )}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling('yearly')}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              billing === 'yearly' ? "bg-white/10 text-white" : "text-text-dim hover:text-white"
            )}
          >
            Yearly
          </button>
        </div>
        {billing === 'yearly' && (
          <p className="text-[10px] font-bold text-gold mt-2 uppercase tracking-widest text-center">
            Save {Math.round((1 - (yearlyPrice / (monthlyPrice * 12))) * 100)}% annually
          </p>
        )}
      </div>

      <div className="space-y-4 flex-1 mb-8">
        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Everything Included</p>
        <div className="space-y-3">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <feature.icon className="w-3.5 h-3.5 text-gold" />
              </div>
              <span className="text-sm text-white/80">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      <Button 
        onClick={() => onSubscribe(title, billing)}
        className={cn(
          "w-full h-14 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 group/btn",
          isPopular ? "bg-gold text-bg-deep shadow-lg shadow-gold/20" : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
        )}
      >
        Choose Plan
        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
      </Button>
    </motion.div>
  );
};

export function SubscriptionPage({ onSubscribe }: { onSubscribe: (plan: string, billing: 'monthly' | 'yearly') => void }) {
  return (
    <div className="space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 rounded-full border border-gold/20 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em]">Elevate Your Experience</span>
        </div>
        <h2 className="text-5xl font-serif font-bold tracking-tight">Simple, Transparent <br/> <span className="text-gold">Pricing</span></h2>
        <p className="text-text-dim text-lg">Choose the perfect bundle to bridge your world and master new languages with advanced precision.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4">
        <PriceCard 
          title="Communication Bundle"
          description="Bridge the gap with real-time audio and video translation."
          monthlyPrice={10}
          yearlyPrice={100}
          accentColor="gold"
          isPopular={true}
          features={[
            { icon: Video, text: "Unlimited Video Calling" },
            { icon: Phone, text: "Crystal Clear Voice Calls" },
            { icon: MessageSquare, text: "Global Multi-user Chat" },
            { icon: Sparkles, text: "Real-time Subtitles" },
            { icon: ShieldCheck, text: "Secure End-to-end Encryption" }
          ]}
          onSubscribe={onSubscribe}
        />

        <PriceCard 
          title="Language Learning"
          description="Master any language with interactive exercises."
          monthlyPrice={5}
          yearlyPrice={60}
          accentColor="gold"
          features={[
            { icon: Target, text: "Advanced Word of the Day" },
            { icon: BookOpen, text: "Full Learning Hub Access" },
            { icon: Zap, text: "Progress Insights" },
            { icon: Globe, text: "Unlimited Document Translation" },
            { icon: CreditCard, text: "Custom Learning Path" }
          ]}
          onSubscribe={onSubscribe}
        />
      </div>

      <div className="bg-surface p-10 rounded-[3rem] border border-white/5 max-w-4xl mx-auto text-center space-y-8 relative overflow-hidden mb-32">
        <div className="absolute top-0 right-0 p-10 opacity-5">
           <Globe className="w-48 h-48 text-gold" />
        </div>
        <div className="max-w-xl mx-auto space-y-6">
          <h3 className="text-2xl font-serif font-bold">Secure Global Payments</h3>
          <p className="text-sm text-text-dim italic">
            "GlobalLingo changed how I travel. Seeing subtitles in my native tongue during a video call felt like magic."
          </p>
          <div className="flex items-center justify-center gap-8 pt-4">
             <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                   <ShieldCheck className="w-6 h-6 text-gold" />
                </div>
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">SSL Secured</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                   <CreditCard className="w-6 h-6 text-gold" />
                </div>
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Easy Checkout</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
