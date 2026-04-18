import React from 'react';
import { motion } from 'motion/react';
import { Shield, RefreshCcw, CreditCard, AlertTriangle, Info, Mail, Phone, MapPin } from 'lucide-react';

export function PolicyPages({ activePolicy }: { activePolicy: string }) {
  const policies = {
    return: {
      title: "Return Policy",
      icon: <RefreshCcw className="w-8 h-8 text-gold" />,
      content: (
        <div className="space-y-6 text-text-dim leading-relaxed">
          <p>At RamaTenali, we strive to ensure our translation services meet the highest standards. However, if you are not satisfied with your experience, our return policy is as follows:</p>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">1. Digital Services</h3>
            <p>As our primary offerings are digital translation and communication services, "returns" in the traditional sense do not apply. Instead, we offer service credits for any technical failures or significant inaccuracies.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">2. Subscription Cancellation</h3>
            <p>You may cancel your premium subscription at any time. Your access will remain active until the end of your current billing period.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">3. Hardware Returns</h3>
            <p>If we ever offer physical translation devices, they will be subject to a 30-day return window from the date of delivery, provided they are in original condition.</p>
          </section>
        </div>
      )
    },
    refund: {
      title: "Refund Policy",
      icon: <CreditCard className="w-8 h-8 text-gold" />,
      content: (
        <div className="space-y-6 text-text-dim leading-relaxed">
          <p>We want you to feel confident in your purchase. Our refund guidelines are designed to be fair and transparent.</p>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">1. Eligibility for Refunds</h3>
            <p>Refunds are considered on a case-by-case basis for premium subscriptions if requested within 48 hours of the initial transaction, provided the service has not been extensively used.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">2. Technical Issues</h3>
            <p>If a technical error on our part prevents you from using the service you paid for, a full or partial refund will be issued for the affected period.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">3. Processing Time</h3>
            <p>Approved refunds are processed within 5-10 business days and will be credited back to your original payment method.</p>
          </section>
        </div>
      )
    },
    privacy: {
      title: "Privacy Policy",
      icon: <Shield className="w-8 h-8 text-gold" />,
      content: (
        <div className="space-y-6 text-text-dim leading-relaxed">
          <p>Your privacy is our top priority. This policy outlines how we handle your data when you use RamaTenali.</p>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">1. Data Collection</h3>
            <p>We collect minimal data required to provide our services, including your name, email (stored securely), and the text/audio you submit for translation.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">2. Translation Technology</h3>
            <p>Translations are processed using advanced technology. We do not use your personal conversations to train public models without your explicit consent.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">3. Security</h3>
            <p>We use industry-standard encryption and secure Firebase infrastructure to protect your data from unauthorized access.</p>
          </section>
        </div>
      )
    },
    disclaimer: {
      title: "Disclaimer",
      icon: <AlertTriangle className="w-8 h-8 text-gold" />,
      content: (
        <div className="space-y-6 text-text-dim leading-relaxed">
          <p>Please read this disclaimer carefully before using our services.</p>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">1. Accuracy of Translations</h3>
            <p>While our technology is highly advanced, translations may not always be 100% accurate. RamaTenali is not responsible for any misunderstandings or losses resulting from translation errors.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">2. No Professional Advice</h3>
            <p>Our service should not be used for critical legal, medical, or financial translations where human professional expertise is required.</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-white font-bold text-lg">3. Service Availability</h3>
            <p>We aim for 99.9% uptime but do not guarantee uninterrupted service. We are not liable for any damages resulting from service downtime.</p>
          </section>
        </div>
      )
    },
    about: {
      title: "About & Contact",
      icon: <Info className="w-8 h-8 text-gold" />,
      content: (
        <div className="space-y-8 text-text-dim leading-relaxed">
          <section className="space-y-4">
            <h3 className="text-white font-bold text-xl font-serif">Our Mission</h3>
            <p>RamaTenali was founded with a simple goal: to break down language barriers across the globe using cutting-edge technology. We believe that communication is a fundamental human right, and technology should make it effortless.</p>
          </section>
          
          <section className="space-y-6">
            <h3 className="text-white font-bold text-xl font-serif">Contact Us</h3>
            <div className="grid gap-4">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gold uppercase tracking-wider">Email</p>
                  <p className="text-white font-medium">support@ramatenali.ai</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gold uppercase tracking-wider">Phone</p>
                  <p className="text-white font-medium">+1 (555) RAMA-10</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gold uppercase tracking-wider">Office</p>
                  <p className="text-white font-medium">123 Silicon Valley Way, CA 94025</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )
    }
  };

  const policy = policies[activePolicy as keyof typeof policies] || policies.about;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto space-y-8 pb-20"
    >
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-gold/10 flex items-center justify-center border border-gold/20 shadow-[0_0_30px_rgba(197,160,89,0.1)]">
          {policy.icon}
        </div>
        <div>
          <h2 className="text-4xl font-serif font-bold text-white">{policy.title}</h2>
          <p className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] mt-1">RamaTenali Legal & Info</p>
        </div>
      </div>

      <div className="bg-surface p-8 rounded-[40px] border border-white/5 shadow-2xl">
        {policy.content}
      </div>

      <div className="text-center pt-8">
        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Last Updated: April 12, 2026</p>
      </div>
    </motion.div>
  );
}
