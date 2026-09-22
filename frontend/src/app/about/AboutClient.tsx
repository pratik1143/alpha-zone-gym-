'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageLayout from '../../components/PageLayout';
import { motion } from 'framer-motion';
import { getGymImage } from '../../lib/gymImages';
import { 
  Dumbbell, Target, Shield, Heart, Award, 
  ArrowRight, ShieldCheck, Zap, CheckCircle2, MapPin, Phone 
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1 } }),
};

const philosophyPillars = [
  { title: "Consistency", desc: "Showing up regularly creates lasting physical adaptations and mental resilience." },
  { title: "Proper Technique", desc: "Executing every movement with biomechanical efficiency to maximize gains and prevent injuries." },
  { title: "Structured Programming", desc: "Progressing through targeted training phases instead of doing random exercises." },
  { title: "Progressive Training", desc: "Systematically increasing load, volume, or intensity over time for continuous results." },
  { title: "Appropriate Equipment", desc: "Access to calibrated plates, resistance machines, and Olympic lifting platforms." },
  { title: "Coaching & Accountability", desc: "Direct guidance and support from experienced coaches who keep you focused on your goals." }
];

const fitnessGoals = [
  "Strength training",
  "Weight training",
  "Cardio",
  "CrossFit",
  "Functional training",
  "HIIT",
  "Personal training",
  "Group fitness"
];

const coaches = [
  { 
    name: "Arshpreet Singh", 
    role: "Coach", 
    desc: "Specializes in heavy strength training, powerlifting, progressive overload and barbell technique." 
  },
  { 
    name: "Lovely Chaudhary", 
    role: "Coach", 
    desc: "Expert in functional training, high-intensity conditioning, mobility and athletic performance." 
  },
  { 
    name: "Sourav Kumar", 
    role: "Coach", 
    desc: "Focuses on goal-based transformations, personalized programming and body composition tracking." 
  }
];

export default function AboutPage() {
  const heroImg = getGymImage('hero');
  const storyImg = getGymImage('about');
  const standardImg = getGymImage('strength');

  return (
    <PageLayout>
      <div className="bg-[#08080a] text-white">

        {/* Hero Section */}
        <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Image src={heroImg.src} alt={heroImg.alt} fill className="object-cover opacity-15" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#08080a]/90 via-[#08080a]/60 to-[#08080a]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[800px] h-[800px] bg-[#d4ff00]/5 rounded-full blur-3xl animate-pulse" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-left space-y-6" style={{ textAlign: "left" }}>
            <motion.span
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block text-xs font-black text-[#d4ff00] tracking-widest uppercase border border-[#d4ff00]/30 px-5 py-2 rounded-full bg-[#d4ff00]/5"
            >
              ALPHA ZONE GYM • SOHANA, MOHALI
            </motion.span>
            
            <motion.h1
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl md:text-7xl font-black uppercase tracking-tight leading-none"
              style={{ textAlign: "left", letterSpacing: "-1px" }}
            >
              About Alpha Zone <br />
              <span style={{ color: "var(--az-lime, #d4ff00)" }}>Gym</span>
            </motion.h1>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-xl md:text-3xl font-extrabold text-[#d4ff00] text-neon-glow uppercase tracking-tight"
              style={{ textAlign: "left" }}
            >
              More Than a Gym. A Performance Lab.
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl font-poppins space-y-3"
              style={{ textAlign: "left", margin: 0 }}
            >
              <p>
                Alpha Zone Gym is a fitness and performance facility located on Landran Road in Sohana, Mohali.
              </p>
              <p>
                Our goal is simple: create a training environment where people can build strength, improve fitness and stay consistent.
              </p>
              <p className="text-slate-400 text-sm">
                Whether you are stepping into a gym for the first time or have been training for years, Alpha Zone offers different training options to match different fitness goals.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-start items-center pt-4"
              style={{ justifyContent: "flex-start", display: "flex" }}
            >
              <Link
                href="/contact-us"
                className="bg-[#d4ff00] text-black font-extrabold text-xs tracking-wider uppercase px-10 py-4 rounded-full hover:bg-white transition-all shadow-[0_0_25px_rgba(212,255,0,0.3)] hover:scale-105"
              >
                Visit Alpha Zone Gym
              </Link>
              <Link
                href="/gym-membership-mohali"
                className="border border-white/20 hover:border-[#d4ff00] text-white font-bold text-xs tracking-wider uppercase px-10 py-4 rounded-full transition-all hover:text-[#d4ff00] bg-white/5"
              >
                Explore Membership Plans
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Section 1: Our Training Philosophy */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">CORE VALUES</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Our Training Philosophy</h2>
              <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
              <p className="text-slate-300 font-poppins text-base md:text-lg leading-relaxed pt-2">
                We believe effective training requires more than simply spending time in a gym.
              </p>
              <p className="text-slate-400 font-poppins text-sm leading-relaxed">
                That's why Alpha Zone combines professional equipment with structured programming and coaching support.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {philosophyPillars.map((item, i) => (
                <motion.div key={i} custom={i * 0.08} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl text-left space-y-3 card-neon-hover"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#d4ff00]/10 border border-[#d4ff00]/25 flex items-center justify-center text-[#d4ff00] font-black">
                    <CheckCircle2 size={18} />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{item.title}</h3>
                  <p className="text-slate-400 font-poppins text-xs leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: Built for Different Fitness Goals */}
        <section className="py-24 bg-[#08080a] border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-8 text-left">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">VERSATILE OPTIONS</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight">
                Built for Different<br />
                <span className="text-[#d4ff00]">Fitness Goals.</span>
              </h2>
              <div className="w-16 h-1 bg-[#d4ff00]" />
              <p className="text-slate-300 font-poppins text-sm md:text-base leading-relaxed">
                Our gym supports different types of training, giving you the versatility to choose the workout style that aligns with your lifestyle and physical ambitions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {fitnessGoals.map((goal, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-[#0e1315] p-3.5 rounded-xl border border-white/5">
                    <div className="w-2 h-2 rounded-full bg-[#d4ff00]" />
                    <span className="text-slate-200 text-xs font-bold uppercase tracking-wider">{goal}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link href="/gym-services" className="inline-flex items-center gap-2 bg-[#d4ff00] text-black font-extrabold text-xs px-8 py-3.5 rounded-full uppercase tracking-wider hover:bg-white transition-all shadow-md">
                  Explore Services <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>

            {/* Right Image Frame */}
            <motion.div custom={0.25} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative justify-self-center lg:justify-self-end w-full max-w-[500px]">
              <div className="relative rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-slate-900 h-[480px]">
                <Image src={storyImg.src} alt={storyImg.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              </div>
              <div className="absolute -inset-2 border-2 border-dashed border-[#d4ff00]/20 rounded-[36px] -z-10 pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* Section 3: Meet Our Coaches */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">OUR COACHES</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Meet Our Coaches</h2>
              <div className="w-16 h-1 bg-[#d4ff00] mx-auto rounded-full" />
              <p className="text-slate-300 text-sm md:text-base font-poppins pt-2">
                Our coaching team helps members improve their training technique, understand their workouts and work towards their individual fitness goals.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {coaches.map((coach, idx) => (
                <div key={idx} className="bg-[#121217] border border-white/10 rounded-2xl p-8 card-neon-hover text-left space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#d4ff00]/10 border border-[#d4ff00]/30 flex items-center justify-center text-[#d4ff00] font-black text-xl">
                    {coach.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{coach.name}</h3>
                    <span className="text-xs font-bold text-[#d4ff00] uppercase tracking-wider">{coach.role}</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed font-poppins">{coach.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Our Location */}
        <section className="py-20 bg-[#08080a] border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">WHERE TO FIND US</span>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Our Location</h2>
            <div className="w-16 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-300 font-poppins text-base md:text-lg">
              You can find Alpha Zone Gym at <strong className="text-white">MNB Group, Landran Road, Sohana, Mohali</strong>.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/contact-us" className="bg-[#d4ff00] text-black font-extrabold text-xs px-10 py-4 rounded-full uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)]">
                Visit Alpha Zone Gym
              </Link>
              <a href="https://maps.app.goo.gl/pX8VZNoXNu4YAeBW6" target="_blank" rel="noopener noreferrer" className="border border-white/20 hover:border-[#d4ff00] text-white font-bold text-xs px-8 py-4 rounded-full transition-all hover:text-[#d4ff00] flex items-center gap-2 uppercase tracking-wider">
                <MapPin size={14} className="text-[#d4ff00]" /> Get Directions
              </a>
            </div>
          </div>
        </section>

      </div>
    </PageLayout>
  );
}
