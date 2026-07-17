'use client';
import React from 'react';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { motion } from 'framer-motion';
import { getGymImage } from '../../lib/gymImages';
import { Award, ShieldCheck, Star, Sparkles, MessageSquare, Phone } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1 } }),
};

const trainers = [
  {
    name: 'Gurpreet Singh',
    role: 'Head Coach & Strength Specialist',
    specialties: ['Powerlifting', 'Olympic Weightlifting', 'Injury Rehab'],
    certs: ['IPF Level 2 Certified Strength Coach', 'Kinesiology Diploma'],
    bio: 'Over 10 years of experience coaching competitive powerlifters and athletes. Specializes in building raw strength and mastering barbell movements.',
    imgIdx: 0,
    rating: '5.0'
  },
  {
    name: 'Amit Sharma',
    role: 'CrossFit & Functional Expert',
    specialties: ['High-Intensity Conditioning', 'CrossFit Box Programming', 'Agility'],
    certs: ['CrossFit Level 2 Trainer', 'Certified Kettlebell Instructor'],
    bio: 'Dedicated to helping you move better, faster, and longer. Focuses on functional movements, metabolic conditioning, and athletic development.',
    imgIdx: 1,
    rating: '4.9'
  },
  {
    name: 'Neha Sen',
    role: 'Weight Loss & Female Fitness Coach',
    specialties: ['Body Transformation', 'Nutritional Coaching', 'HIIT'],
    certs: ['ACE Certified Personal Trainer', 'ISSN Nutrition Specialist'],
    bio: 'Helped over 300+ clients achieve sustainable weight loss and body transformation. Believes in science-backed training combined with realistic diet plans.',
    imgIdx: 2,
    rating: '5.0'
  },
  {
    name: 'Vikram Jeet',
    role: 'Bodybuilding & Hypertrophy Coach',
    specialties: ['Muscle Hypertrophy', 'Supplementation', 'Contest Prep'],
    certs: ['Gold Medalist Bodybuilder', 'IFBB Pro Certified Trainer'],
    bio: 'A competitive bodybuilder with deep expertise in muscle growth principles, progressive overload, and physique sculpting.',
    imgIdx: 3,
    rating: '4.9'
  }
];

export default function TeamClient() {
  const heroImg = getGymImage('trainers');
  const ctaImg = getGymImage('cta');

  return (
    <PageLayout>
      <div className="bg-[#08080a] text-white">

        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Image src={heroImg.src} alt={heroImg.alt} fill className="object-cover opacity-15" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#08080a]/90 via-[#08080a]/60 to-[#08080a]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[800px] h-[800px] bg-[#d4ff00]/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8">
            <motion.span initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-block text-xs font-black text-[#d4ff00] tracking-widest uppercase border border-[#d4ff00]/30 px-5 py-2.5 rounded-full bg-[#d4ff00]/5">
              ELITE TRAINERS // RESULTS DRIVEN
            </motion.span>
            
            <motion.h1 initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Certified Fitness<br />
              <span className="text-[#d4ff00]">Trainers in Mohali.</span>
            </motion.h1>
            
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="text-slate-300 text-base md:text-xl leading-relaxed max-w-3xl mx-auto font-poppins font-light font-poppins">
              Meet the experienced fitness trainers at Alpha Zone Gym. Get expert guidance for weight loss, muscle building, strength training, and overall fitness.
            </motion.p>
          </div>
        </section>

        {/* Trainers Grid Section */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">THE COACHING STAFF</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Meet Our Experts</h2>
              <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
              {trainers.map((trainer, i) => {
                const img = getGymImage('trainers', i);
                return (
                  <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden grid sm:grid-cols-12 card-neon-hover group text-left"
                  >
                    {/* Trainer Image (5 cols on sm) */}
                    <div className="sm:col-span-5 relative h-72 sm:h-auto min-h-[250px]">
                      <Image src={img.src} alt={trainer.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100" sizes="(max-width: 768px) 100vw, 25vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent sm:hidden" />
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg flex items-center gap-1">
                        <Star size={12} className="text-[#d4ff00] fill-[#d4ff00]" />
                        <span className="text-[10px] font-black text-white">{trainer.rating}</span>
                      </div>
                    </div>

                    {/* Trainer Bio (7 cols on sm) */}
                    <div className="sm:col-span-7 p-8 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight">{trainer.name}</h3>
                          <p className="text-[10px] font-bold text-[#d4ff00] uppercase tracking-wider mt-0.5">{trainer.role}</p>
                        </div>

                        <p className="text-slate-400 font-poppins text-xs leading-relaxed">
                          {trainer.bio}
                        </p>

                        <div className="space-y-2">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Specialties</div>
                          <div className="flex flex-wrap gap-1.5">
                            {trainer.specialties.map((spec, idx) => (
                              <span key={idx} className="bg-slate-950 border border-white/5 text-[9px] font-semibold text-slate-300 px-2.5 py-1 rounded-full font-poppins">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Certifications</div>
                          <div className="space-y-1">
                            {trainer.certs.map((cert, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-355 font-poppins">
                                <ShieldCheck size={11} className="text-[#d4ff00] shrink-0" />
                                <span>{cert}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <a href={`https://wa.me/919779333155?text=Hi! I am interested in personal training sessions with ${trainer.name}.`} target="_blank" rel="noopener noreferrer"
                          className="bg-[#d4ff00]/10 border border-[#d4ff00]/30 hover:bg-[#d4ff00] text-[#d4ff00] hover:text-black font-extrabold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5"
                        >
                          <MessageSquare size={12} /> Book PT Session
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Trainer Consultation */}
        <section className="py-24 bg-[#08080a] border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0">
            <Image src={ctaImg.src} alt={ctaImg.alt} fill className="object-cover opacity-10" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#08080a] via-[#08080a]/80 to-[#08080a]" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">TRAIN SMART</span>
            <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter">
              Get A Custom<br />
              <span className="text-[#d4ff00]">Workout Plan.</span>
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-450 max-w-xl mx-auto font-poppins text-sm md:text-base leading-relaxed">
              Book a session with one of our certified trainers and build a customized workout and nutrition plan built exactly for your schedule and genetics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <a href="/contact" className="bg-[#d4ff00] text-black font-extrabold text-sm px-10 py-4 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(212,255,0,0.35)] hover:scale-105">
                Book Trainer Trial
              </a>
              <a href="tel:+919779333155" className="border border-white/15 hover:border-[#d4ff00] text-white font-bold text-sm px-10 py-4 rounded-full transition-all hover:text-[#d4ff00] bg-white/5 flex items-center gap-2 justify-center">
                <Phone size={14} /> Call Our Team
              </a>
            </div>
          </div>
        </section>

      </div>
    </PageLayout>
  );
}
