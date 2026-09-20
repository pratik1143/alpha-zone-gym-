'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Phone, MapPin, Dumbbell, ShieldCheck, Flame, Users, Calendar, Award } from 'lucide-react';
import PageLayout from './PageLayout';

export interface ServiceLandingProps {
  h1: string;
  badge?: string;
  heroTagline: string;
  heroDescription: string;
  imageBg?: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  
  // Feature grid or sections
  sections: Array<{
    title: string;
    description?: string;
    items?: Array<{
      title: string;
      description: string;
      iconName?: string;
    }>;
  }>;

  // Key highlights / bullet points
  highlightsTitle?: string;
  highlights?: string[];

  // Optional custom content block
  additionalContent?: React.ReactNode;
}

export default function ServiceLandingTemplate({
  h1,
  badge = 'ALPHA ZONE GYM • SOHANA, MOHALI',
  heroTagline,
  heroDescription,
  imageBg = '/gym_images/Best Gym in Mohali.jpg',
  primaryCtaText = 'Join Alpha Zone',
  primaryCtaHref = '/contact',
  secondaryCtaText = 'Get Directions',
  secondaryCtaHref = 'https://maps.google.com/?q=Alpha+Zone+Gym+Sohana+Mohali',
  sections,
  highlightsTitle,
  highlights,
  additionalContent,
}: ServiceLandingProps) {
  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center pt-24 pb-16 px-6 overflow-hidden bg-[#08080a]">
        {/* Background Overlay & Gradient */}
        <div className="absolute inset-0 z-0">
          <img
            src={imageBg}
            alt={h1}
            className="w-full h-full object-cover opacity-20 filter brightness-75 scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/80 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,255,0,0.08),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d4ff00]/10 border border-[#d4ff00]/30 text-[#d4ff00] font-bold text-xs tracking-widest uppercase text-neon-glow"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            {badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight leading-none"
          >
            {h1}
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-3xl font-extrabold text-[#d4ff00] text-neon-glow tracking-tight"
          >
            {heroTagline}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-300 text-base md:text-lg max-w-3xl mx-auto font-poppins leading-relaxed"
          >
            {heroDescription}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              href={primaryCtaHref}
              className="w-full sm:w-auto bg-[#d4ff00] text-black font-extrabold text-sm px-8 py-4 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] hover:scale-105 flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              {primaryCtaText}
              <ArrowRight className="w-4 h-4" />
            </Link>
            {secondaryCtaHref.startsWith('http') ? (
              <a
                href={secondaryCtaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto border border-white/20 hover:border-[#d4ff00] text-white font-bold text-sm px-8 py-4 rounded-full transition-all hover:text-[#d4ff00] flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <MapPin className="w-4 h-4 text-[#d4ff00]" />
                {secondaryCtaText}
              </a>
            ) : (
              <Link
                href={secondaryCtaHref}
                className="w-full sm:w-auto border border-white/20 hover:border-[#d4ff00] text-white font-bold text-sm px-8 py-4 rounded-full transition-all hover:text-[#d4ff00] flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                {secondaryCtaText}
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Sections Grid */}
      <section className="py-16 md:py-24 px-6 bg-[#0a0a0c]">
        <div className="max-w-7xl mx-auto space-y-16">
          {highlights && highlights.length > 0 && (
            <div className="bg-[#0e0e12] border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4ff00]/5 rounded-full filter blur-3xl pointer-events-none" />
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                <Flame className="w-7 h-7 text-[#d4ff00]" />
                {highlightsTitle || 'Key Focus & Highlights'}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-[#121217] p-4 rounded-xl border border-white/5 hover:border-[#d4ff00]/30 transition-all">
                    <CheckCircle2 className="w-5 h-5 text-[#d4ff00] shrink-0 mt-0.5" />
                    <span className="text-slate-200 text-sm md:text-base font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-8">
              <div className="text-center max-w-3xl mx-auto space-y-3">
                <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">
                  {sec.title}
                </h3>
                {sec.description && (
                  <p className="text-slate-400 text-sm md:text-base">{sec.description}</p>
                )}
                <div className="w-16 h-[3px] bg-[#d4ff00] mx-auto rounded-full" />
              </div>

              {sec.items && sec.items.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sec.items.map((item, itemIdx) => (
                    <motion.div
                      key={itemIdx}
                      whileHover={{ y: -6 }}
                      className="bg-[#0e0e12] border border-white/10 rounded-2xl p-6 md:p-8 card-neon-hover flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-[#d4ff00]/10 border border-[#d4ff00]/20 flex items-center justify-center text-[#d4ff00]">
                          <Dumbbell className="w-6 h-6" />
                        </div>
                        <h4 className="text-xl font-bold text-white tracking-tight">{item.title}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {additionalContent}
        </div>
      </section>

      {/* Location Banner */}
      <section className="py-16 px-6 bg-gradient-to-b from-[#0a0a0c] to-[#08080a] border-t border-white/10">
        <div className="max-w-5xl mx-auto bg-[#0e0e12] border border-[#d4ff00]/20 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-[0_0_50px_rgba(212,255,0,0.05)]">
          <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">Visit Us Today</span>
          <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
            Located in Sohana, Mohali
          </h3>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto">
            Alpha Zone Gym is located at: <strong>2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Mohali, Punjab 140308</strong>.
            We serve members from Sohana, Sector 77, Airport Road, and surrounding areas of Mohali.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20inquire%20about%20your%20services."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#d4ff00] text-black font-extrabold text-xs px-8 py-4 rounded-full hover:bg-white transition-all shadow-[0_0_15px_rgba(212,255,0,0.25)] flex items-center gap-2 uppercase tracking-wider"
            >
              <Phone className="w-4 h-4" />
              Call +91 97793 33155
            </a>
            <a
              href="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20contact%20you."
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 hover:border-[#d4ff00] text-white font-bold text-xs px-8 py-4 rounded-full transition-all hover:text-[#d4ff00] uppercase tracking-wider"
            >
              Contact Alpha Zone
            </a>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
