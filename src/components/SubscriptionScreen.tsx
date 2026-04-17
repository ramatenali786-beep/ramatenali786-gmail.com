import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Zap, 
  Globe, 
  Video, 
  Phone, 
  BookOpen, 
  Sparkles, 
  Star,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Crown
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SubscriptionScreenProps {
  isOpen?: boolean;
  onClose?: () => void;
  onPurchase: (plan: string, tier: 'monthly' | 'yearly') => void;
  isPage?: boolean;
}

export function SubscriptionScreen({ isOpen, onClose, onPurchase, isPage = false }: SubscriptionScreenProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'comm',
      name: 'Global Comm',
      tagline: 'Connect without borders',
      icon: <Video className="w-8 h-8 text-gold" />,
      monthlyPrice: 10,
      yearlyPrice: 100,
      features: [
        'Unlimited Video Calling',
        'Unlimited Voice Calling',
        'Unlimited Real-time Chat',
        'Real-time Neural Subtitles',
        'Exclusive Neural Voice Cloning',
        'Priority Connection Speeds',
        'No Connection Limits'
      ],
      color: 'bg-gold/10',
      borderColor: 'border-gold/30',
      accentColor: 'text-gold',
      buttonClass: 'bg-gold hover:bg-gold/90 text-bg-deep'
    },
    {
      id: 'learning',
      name: 'Lingo Mastery',
      tagline: 'Unlock your potential',
      icon: <BookOpen className="w-8 h-8 text-blue-400" />,
      monthlyPrice: 5,
      yearlyPrice: 60,
      features: [
        'Advanced Vocabulary Exercises',
        'Cultural Insight Reports',
        'Unlimited Pronunciation Practice',
        'Tailored Feedback Analytics',
        'Offline Learning Access',
        'Certification Track'
      ],
      color: 'bg-blue-400/10',
      borderColor: 'border-blue-400/30',
      accentColor: 'text-blue-400',
      buttonClass: 'bg-blue-400 hover:bg-blue-500 text-white'
    }
  ];

  if (!isPage && !isOpen) return null;

  const content = (
    <div className={cn(
      "relative w-full bg-surface overflow-y-auto no-scrollbar",
      isPage ? "min-h-screen pb-40" : "max-w-5xl border border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] max-h-[90vh]"
    )}>
      {/* Header */}
      <div className={cn(
        "sticky top-0 z-20 bg-surface/80 backdrop-blur-md p-6 md:p-10 flex items-center justify-between",
        isPage && "pt-12"
      )}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Elevate Your Experience</h2>
          </div>
          <p className="text-text-dim">Choose the plan that fits your global journey.</p>
        </div>
        {!isPage && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </Button>
        )}
      </div>

      <div className="p-6 md:p-10 space-y-10">
        {/* Billing Toggle */}
        <div className="flex justify-center">
          <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 inline-flex items-center gap-1 group">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all",
                billingCycle === 'monthly' ? "bg-white text-bg-deep shadow-lg" : "text-text-dim hover:text-white"
              )}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all relative",
                billingCycle === 'yearly' ? "bg-white text-bg-deep shadow-lg" : "text-text-dim hover:text-white"
              )}
            >
              Yearly
              {billingCycle === 'monthly' && (
                <span className="absolute -top-4 -right-4 px-2 py-1 bg-gold text-bg-deep text-[8px] font-black rounded-lg animate-bounce">
                  SAVE 20%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <motion.div 
              key={plan.id}
              whileHover={{ y: -5 }}
              className={cn(
                "relative p-8 rounded-[2.5rem] border transition-all flex flex-col",
                plan.borderColor,
                plan.color
              )}
            >
              <div className="absolute -top-4 -left-4 w-16 h-16 rounded-2xl bg-surface border border-white/10 flex items-center justify-center shadow-xl">
                {plan.icon}
              </div>

              <div className="mt-8 space-y-6 flex-grow">
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-text-dim">{plan.tagline}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-text-dim font-bold uppercase tracking-widest text-xs">
                    / {billingCycle === 'monthly' ? 'Month' : 'Year'}
                  </span>
                </div>

                <div className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-white/5")}>
                        <Check className={cn("w-3 h-3", plan.accentColor)} />
                      </div>
                      <span className="text-sm text-white/80">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => onPurchase(plan.id, billingCycle)}
                className={cn(
                  "mt-10 h-14 rounded-2xl font-bold text-lg uppercase tracking-widest transition-all",
                  plan.buttonClass
                )}
              >
                Select Plan
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="pt-10 border-t border-white/5 flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gold" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Cancel Anytime</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="w-5 h-5 text-gold" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Global Access</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPage) return content;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-10 overflow-hidden">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-bg-deep/90 backdrop-blur-2xl"
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative w-full max-w-5xl"
        >
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
