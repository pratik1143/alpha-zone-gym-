'use client';
import React from 'react';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { motion } from 'framer-motion';
import { getGymImage } from '../../lib/gymImages';
import { 
  Dumbbell, Target, Heart, Flame, Zap, Shield, Smartphone, 
  ArrowRight, CheckCircle2, Award, Activity, Search, ShieldCheck 
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08 } }),
};

const disciplines = [
  { 
    title: 'Strength Training', 
    desc: 'Free weights, power racks, plate-loaded machines and everything you need to build serious strength.',
    icon: Dumbbell,
    imgCat: 'strength' as const,
    imgIdx: 0
  },
  { 
    title: 'Cardio & Conditioning', 
    desc: 'Premium treadmills, rowers, bikes and ski ergs for endurance, fat loss and heart health.',
    icon: Activity,
    imgCat: 'cardio' as const,
    imgIdx: 0
  },
  { 
    title: 'Personal Training', 
    desc: '1-on-1 coaching built around your body, goals and schedule — with accountability built in.',
    icon: Target,
    imgCat: 'trainers' as const,
    imgIdx: 0
  },
  { 
    title: 'CrossFit & Functional', 
    desc: 'High-intensity functional training in a dedicated box — barbells, ropes, boxes and grit.',
    icon: Flame,
    imgCat: 'functional' as const,
    imgIdx: 0
  },
  { 
    title: 'Group Classes', 
    desc: 'HIIT, strength, mobility and athletic conditioning classes led by expert coaches.',
    icon: Award,
    imgCat: 'gallery' as const,
    imgIdx: 0
  },
  { 
    title: 'Sports Performance', 
    desc: 'Speed, agility, power and mobility programmes for competitive athletes.',
    icon: Zap,
    imgCat: 'hero' as const,
    imgIdx: 1
  },
  { 
    title: 'Nutrition Coaching', 
    desc: 'Personalised nutrition plans and ongoing check-ins to fuel training and recovery.',
    icon: Heart,
    imgCat: 'reception' as const,
    imgIdx: 1
  },
  { 
    title: 'Injury Rehabilitation', 
    desc: 'Physio-led recovery and prehab protocols to keep you training strong and pain-free.',
    icon: Shield,
    imgCat: 'about' as const,
    imgIdx: 1
  },
  { 
    title: 'Body Transformation', 
    desc: '12-week transformation programmes that combine training, nutrition and tracking for real results.',
    icon: ShieldCheck,
    imgCat: 'cta' as const,
    imgIdx: 0
  }
];

const journeySteps = [
  { step: '01', title: 'Assessment', desc: 'Book a free fitness assessment to understand your goals, baseline and movement.' },
  { step: '02', title: 'Programme', desc: 'We design a personalised plan that matches your goals, schedule and experience.' },
  { step: '03', title: 'Train', desc: 'Show up and train under expert coaches in a facility built for performance.' },
  { step: '04', title: 'Optimise', desc: 'Track progress, adjust training and keep breaking through with regular check-ins.' }
];

const amenities = [
  { title: 'Open 7 Days', desc: 'Early morning to late evening sessions.', icon: Award },
  { title: 'Premium Equipment', desc: 'Imported strength and cardio machines.', icon: Dumbbell },
  { title: 'Locker Rooms', desc: 'Clean, secure lockers with showers.', icon: ShieldCheck },
  { title: 'Recovery Zone', desc: 'Foam rollers, stretching and recovery tools.', icon: Activity }
];

export default function ServicesPage() {
  const heroImg = getGymImage('services');
  const detailsImg = getGymImage('equipment');
  const appImg = getGymImage('mobile_app');
  const ctaImg = getGymImage('cta');

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
            <div className="w-[800px] h-[800px] bg-[#d4ff00]/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8">
            <motion.span initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-block text-xs font-black text-[#d4ff00] tracking-widest uppercase border border-[#d4ff00]/30 px-5 py-2.5 rounded-full bg-[#d4ff00]/5">
              TRAINING SERVICES // CORE DISCIPLINES
            </motion.span>
            
            <motion.h1 initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Train Every Discipline.<br />
              <span className="text-[#d4ff00]">Under One Roof.</span>
            </motion.h1>
            
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="text-slate-300 text-base md:text-xl leading-relaxed max-w-3xl mx-auto font-poppins font-light">
              From strength and conditioning to CrossFit, personal training and recovery — every service at Alpha Zone is designed to deliver measurable results.
            </motion.p>
          </div>
        </section>

        {/* Section 1: Complete Training Ecosystem */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">DISCIPLINE MENU</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">A Complete Training Ecosystem</h2>
              <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {disciplines.map((item, i) => {
                const img = getGymImage(item.imgCat, item.imgIdx);
                return (
                  <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    className="relative bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden group card-neon-hover text-left flex flex-col justify-between"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image src={img.src} alt={img.alt} fill className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-75" sizes="(max-width: 768px) 100vw, 33vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    </div>
                    <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-950 border border-white/10 rounded-xl flex items-center justify-center text-[#d4ff00] group-hover:bg-[#d4ff00] group-hover:text-black transition-all">
                            <item.icon size={18} />
                          </div>
                          <h3 className="text-base font-bold text-white uppercase tracking-wide">{item.title}</h3>
                        </div>
                        <p className="text-slate-450 text-xs leading-relaxed font-poppins">{item.desc}</p>
                      </div>
                      <div className="pt-4 flex items-center gap-1.5 text-[10px] font-black uppercase text-[#d4ff00] opacity-0 group-hover:opacity-100 transition-opacity">
                        Learn More <ArrowRight size={10} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 2: Your Journey. Simplified. */}
        <section className="py-24 bg-[#08080a] border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">THE ROADMAP</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Your Journey. Simplified.</h2>
              <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {journeySteps.map((item, i) => (
                <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl text-left space-y-4 relative group card-neon-hover"
                >
                  <div className="text-5xl font-black text-slate-800/20 group-hover:text-[#d4ff00]/10 transition-colors font-mono">{item.step}</div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{item.title}</h3>
                  <p className="text-slate-400 font-poppins text-xs leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Science-Backed. Coach-Led. */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-8 text-left">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">METHODOLOGY</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight">
                Science-Backed.<br />
                <span className="text-[#d4ff00]">Coach-Led.</span>
              </h2>
              <div className="w-16 h-1 bg-[#d4ff00]" />
              <p className="text-slate-300 font-poppins text-sm md:text-base leading-relaxed">
                Every programme at Alpha Zone is built on proven training principles — progressive overload, individualised coaching, and consistent feedback loops. You don't just train harder. You train smarter.
              </p>

              <div className="space-y-4 font-poppins text-xs font-semibold">
                {[
                  'Periodised programming for steady progress',
                  'Certified coaches with real athletic experience',
                  'Regular body composition and performance tracking',
                  'Nutrition and recovery support built into every plan'
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-200">
                    <CheckCircle2 size={16} className="text-[#d4ff00] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Image Frame */}
            <motion.div custom={0.2} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative justify-self-center lg:justify-self-end w-full max-w-[500px]">
              <div className="relative rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-slate-900 h-[480px]">
                <Image src={detailsImg.src} alt={detailsImg.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              </div>
              <div className="absolute -inset-2 border border-dashed border-[#d4ff00]/25 rounded-[34px] -z-10 pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* Section 4: Everything You Need. */}
        <section className="py-24 bg-[#08080a] border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">FACILITIES</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Everything You Need.</h2>
              <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {amenities.map((item, i) => (
                <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl text-left space-y-4 group card-neon-hover"
                >
                  <div className="w-12 h-12 bg-slate-950 border border-white/10 rounded-2xl flex items-center justify-center text-[#d4ff00] group-hover:bg-[#d4ff00] group-hover:text-black transition-all">
                    <item.icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide">{item.title}</h3>
                  <p className="text-slate-450 text-xs leading-relaxed font-poppins">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Find Your Perfect Service. (CTA) */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0">
            <Image src={ctaImg.src} alt={ctaImg.alt} fill className="object-cover opacity-10" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/80 to-[#0a0a0c]" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">GET STARTED</span>
            <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter">
              Find Your Perfect<br />
              <span className="text-[#d4ff00]">Programme.</span>
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-450 max-w-xl mx-auto font-poppins text-sm md:text-base leading-relaxed">
              Book your free assessment and let our coaches match you with the right programme.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <a href="/packages" className="bg-[#d4ff00] text-black font-extrabold text-sm px-10 py-4 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(212,255,0,0.35)] hover:scale-105">
                View Packages →
              </a>
              <a href="/contact" className="border border-white/15 hover:border-[#d4ff00] text-white font-bold text-sm px-10 py-4 rounded-full transition-all hover:text-[#d4ff00] bg-white/5">
                Contact Us
              </a>
            </div>
          </div>
        </section>

        {/* Section 6: Your Gym. In Your Pocket. */}
        <section className="py-24 bg-[#08080a] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Image Mockup */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-[#d4ff00]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="w-[300px] h-[610px] bg-[#0c0c0e] rounded-[48px] border-[10px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-30 flex items-center justify-center">
                    <div className="w-8 h-1 bg-white/20 rounded-full" />
                  </div>
                  <div className="h-8 shrink-0" />
                  <div className="flex-1 bg-[#060608] overflow-hidden flex flex-col px-4 pt-4 pb-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 bg-[#d4ff00] rounded-lg flex items-center justify-center text-black font-black text-[9px]">AZ</div>
                        <div className="text-left">
                          <div className="text-[8px] font-bold text-white">Alpha Zone</div>
                          <div className="text-[5px] text-[#d4ff00] font-black uppercase tracking-wider">MEMBER APP</div>
                        </div>
                      </div>
                      <div className="w-6 h-6 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center text-white text-[8px] font-bold">QR</div>
                    </div>
                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3 text-left">
                      <div className="text-[6px] font-bold text-[#d4ff00] uppercase tracking-wider">Gold Membership</div>
                      <div className="text-[9px] font-bold text-white mt-0.5">Active Member Profile</div>
                      <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-[#d4ff00] rounded-full w-[74%]" /></div>
                      <div className="flex justify-between mt-1 text-[5px] text-slate-505"><span>97 days left</span><span className="text-[#d4ff00] font-bold">74% SPEED</span></div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      {['Workout Tracking', 'Class Alerts', 'QR Check-in', 'Trainer Chat'].map((feat, i) => (
                        <div key={i} className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5 flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#d4ff00]/10 flex items-center justify-center text-[#d4ff00] shrink-0">
                            <CheckCircle2 size={8} />
                          </div>
                          <span className="text-[8px] font-bold text-slate-350">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-10 bg-slate-900 border-t border-white/5 flex items-center justify-around px-2 shrink-0">
                    {['Home', 'Workouts', 'Logs', 'Support'].map((nav, i) => (
                      <div key={i} className={`flex flex-col items-center gap-0.5 ${i === 0 ? 'text-[#d4ff00]' : 'text-slate-600'}`}>
                        <div className="w-3.5 h-3.5 rounded-full bg-current/10" />
                        <span className="text-[5px] font-bold uppercase">{nav}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Content */}
            <motion.div custom={0.25} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-8 text-left">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">MOBILE INTERACTION</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight">
                Your Gym.<br />
                <span className="text-[#d4ff00]">In Your Pocket.</span>
              </h2>
              <div className="w-16 h-1 bg-[#d4ff00]" />
              <p className="text-slate-400 font-poppins text-sm md:text-base leading-relaxed">
                Track workouts, book classes, message your trainer and manage your membership — all from the Alpha Zone Gym app. Available on iOS and Android.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-poppins text-xs font-semibold">
                {['Workout Tracking', 'Class Alerts', 'QR Check-in', 'Trainer Chat'].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-200">
                    <CheckCircle2 size={16} className="text-[#d4ff00] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="/app" className="bg-[#d4ff00] text-black font-extrabold text-xs tracking-wider uppercase px-8 py-3.5 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(212,255,0,0.2)] flex items-center justify-center gap-2">
                  <Smartphone size={14} /> Learn More
                </a>
                <div className="flex gap-2.5">
                  <a href="/app" className="border border-white/10 hover:border-white text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-full transition-all bg-white/5 flex items-center gap-1.5">
                    App Store
                  </a>
                  <a href="/app" className="border border-white/10 hover:border-[#d4ff00] text-white hover:text-[#d4ff00] font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-full transition-all bg-white/5 flex items-center gap-1.5">
                    Google Play
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
    </PageLayout>
  );
}
