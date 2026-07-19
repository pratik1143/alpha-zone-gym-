'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { motion } from 'framer-motion';
import { getGymImage } from '../../lib/gymImages';
import { 
  Check, ArrowRight, Crown, Star, Phone, MessageSquare, ChevronDown, 
  Sparkles, Smartphone, CheckCircle2, Dumbbell, ShieldCheck, Heart 
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1 } }),
};

const mainPlans = [
  {
    id: 'monthly',
    tenure: '1 MONTH',
    label: 'Monthly',
    badge: null,
    originalPrice: '₹3,500',
    price: '₹3,000',
    period: '/ month',
    tagline: 'Try the Zone. No long commitment.',
    features: [
      'Full gym access',
      'All cardio & weight equipment',
      'Locker room access',
      'Free fitness assessment',
      'Open 7 days a week'
    ],
    highlight: false,
    icon: Star
  },
  {
    id: 'quarterly',
    tenure: '3 MONTHS',
    label: 'Quarterly',
    badge: 'RECOMMENDED',
    originalPrice: '₹8,000',
    price: '₹6,000',
    period: '/ 3 months',
    tagline: 'Best value for real transformation.',
    features: [
      'Everything in Monthly',
      '2 personal training sessions',
      'Unlimited group classes',
      'Diet & nutrition consultation',
      'Body composition tracking'
    ],
    highlight: true,
    icon: Crown
  },
  {
    id: 'semi-annual',
    tenure: '6 MONTHS',
    label: 'Semi-Annual',
    badge: null,
    originalPrice: '₹12,000',
    price: '₹9,000',
    period: '/ 6 months',
    tagline: 'Serious training for serious results.',
    features: [
      'Everything in Quarterly',
      '4 personal training sessions',
      'Priority locker reservation',
      'Bi-monthly body assessments',
      'Diet & nutrition consultation'
    ],
    highlight: false,
    icon: Star
  },
  {
    id: 'annual',
    tenure: '12 MONTHS',
    label: 'Annual',
    badge: 'BEST VALUE',
    originalPrice: '₹18,000',
    price: '₹14,000',
    period: '/ year',
    tagline: 'Commit to a stronger, elite version of you.',
    features: [
      'Everything in Semi-Annual',
      '8 personal training sessions',
      'Priority class booking',
      '5 guest passes per year',
      'Monthly structural checkups'
    ],
    highlight: false,
    icon: Crown
  }
];

const addons = [
  { title: 'Personal Coaching Sessions', desc: 'Per 1-on-1 session with a certified expert coach.' },
  { title: 'Nutrition Programming', desc: 'Custom nutrition programme built for your goals.' },
  { title: 'Group Class Pass', desc: '10 group classes — HIIT, strength, mobility & more.' },
  { title: 'InBody Analysis Pack', desc: 'Detailed InBody analysis with expert consultation.' }
];

const commonQuestions = [
  { q: 'Are there any hidden sign-up fees?', a: 'No hidden joining fees. The price you see is the price you pay.' },
  { q: 'Can I temporarily freeze my membership?', a: 'Yes — Quarterly and Annual members can freeze up to 15 and 30 days respectively.' },
  { q: 'Can I try the gym floor before committing?', a: 'Absolutely. Book a free walk-in assessment and try the floor before you commit.' },
  { q: 'Are group classes included in the standard access?', a: 'Group classes are included. Dedicated 1-on-1 personal training is available on select plans and as an add-on.' },
  { q: 'Do you offer a satisfaction guarantee?', a: 'Full refund within 7 days of enrollment if you\'re not satisfied. No questions asked.' }
];

export default function PlansPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const heroImg = getGymImage('plans');
  const detailsImg = getGymImage('reception');
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
              MEMBERSHIP TIERS // PASSES
            </motion.span>
            
            <motion.h1 initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Choose Your<br />
              <span className="text-[#d4ff00]">Commitment.</span>
            </motion.h1>
            
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="text-slate-300 text-base md:text-xl leading-relaxed max-w-3xl mx-auto font-poppins font-light font-poppins">
              Flexible memberships built around how often you want to win. Every plan unlocks world-class equipment, expert coaches and the culture that makes Alpha Zone different.
            </motion.p>
          </div>
        </section>

        {/* Section 1: Plans Grid */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
              {mainPlans.map((plan, i) => (
                <motion.div key={plan.id} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className={`relative flex flex-col justify-between rounded-3xl p-7 ${
                    plan.highlight 
                      ? 'bg-slate-950 border-2 border-[#d4ff00] shadow-[0_0_40px_rgba(212,255,0,0.15)] z-10' 
                      : 'bg-slate-900/40 border border-white/5 card-neon-hover'
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md ${
                      plan.highlight ? 'bg-[#d4ff00] text-black' : 'bg-slate-700 text-[#d4ff00] border border-[#d4ff00]/30'
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <span className="text-[10px] font-black text-[#d4ff00] tracking-widest uppercase">{plan.tenure}</span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mt-3 mb-3 ${
                        plan.highlight ? 'bg-[#d4ff00] text-black' : 'bg-slate-950 border border-white/10 text-[#d4ff00]'
                      }`}>
                        <plan.icon size={18} />
                      </div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                        {plan.label} {plan.highlight && <span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] animate-ping shrink-0" />}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 font-poppins">{plan.tagline}</p>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-slate-500 text-sm font-semibold line-through">{plan.originalPrice}</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{plan.price}</span>
                        <span className="text-slate-400 text-xs font-poppins">{plan.period}</span>
                      </div>
                    </div>

                    <div className="h-px bg-white/10" />

                    <ul className="space-y-2.5">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2.5 text-xs text-slate-300">
                          <Check className="text-[#d4ff00] shrink-0" size={12} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-7 pt-4">
                    <a href={`https://wa.me/919779333155?text=Hi! I am interested in the ${plan.label} membership plan at Alpha Zone Gym.`} target="_blank" rel="noopener noreferrer"
                      className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-center transition-all block ${
                        plan.highlight 
                          ? 'bg-[#d4ff00] text-black hover:bg-white shadow-[0_0_15px_rgba(212,255,0,0.25)]' 
                          : 'border border-white/10 hover:border-[#d4ff00] text-white hover:text-black hover:bg-[#d4ff00]'
                      }`}
                    >
                      Get Started
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center pt-4 text-xs text-slate-500 font-poppins">
              All prices inclusive of taxes • Cancel anytime • Free walk-in trial available
            </div>
          </div>
        </section>

        {/* Section 2: Add-Ons & Extras. */}
        <section className="py-24 bg-[#08080a] border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">UPGRADES</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Add-Ons &amp; Extras.</h2>
              <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
              <p className="text-slate-400 text-sm font-poppins max-w-xl mx-auto">
                Stack coaching, nutrition and recovery services on top of any membership.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {addons.map((addon, i) => (
                <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl text-left space-y-3 card-neon-hover group"
                >
                  <h3 className="text-base font-black text-white uppercase tracking-wide group-hover:text-[#d4ff00] transition-colors">{addon.title}</h3>
                  <p className="text-slate-405 text-xs leading-relaxed font-poppins">{addon.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Common Questions. (FAQ) */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5">
          <div className="max-w-3xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-4">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">HELP HUB</span>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Common Questions.</h2>
              <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            </div>
            <div className="space-y-3">
              {commonQuestions.map((faq, i) => (
                <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} 
                  className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden"
                >
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer bg-transparent border-none">
                    <span className="font-bold text-white text-sm">{faq.q}</span>
                    <ChevronDown size={16} className={`text-[#d4ff00] shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed font-poppins border-t border-white/5 pt-4">{faq.a}</div>}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Ready To Train Like An Alpha? */}
        <section className="py-24 bg-[#08080a] border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0">
            <Image src={ctaImg.src} alt={ctaImg.alt} fill className="object-cover opacity-10" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#08080a] via-[#08080a]/80 to-[#08080a]" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">CHALLENGE YOURSELF</span>
            <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter">
              Ready To Train<br />
              <span className="text-[#d4ff00]">Like An Alpha?</span>
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-450 max-w-xl mx-auto font-poppins text-sm md:text-base leading-relaxed">
              Book your free walk-in assessment. Meet the coaches, tour the floor and pick the plan that fits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <a href="/contact" className="bg-[#d4ff00] text-black font-extrabold text-sm px-10 py-4 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(212,255,0,0.35)] hover:scale-105">
                Book Free Trial
              </a>
              <a href="tel:+919779333155" className="border border-white/15 hover:border-[#d4ff00] text-white font-bold text-sm px-10 py-4 rounded-full transition-all hover:text-[#d4ff00] bg-white/5 flex items-center gap-2 justify-center">
                <Phone size={14} /> Call Now
              </a>
            </div>
          </div>
        </section>

        {/* Section 5: Your Gym. In Your Pocket. */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Mockup */}
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
              <p className="text-slate-450 font-poppins text-sm md:text-base leading-relaxed">
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
