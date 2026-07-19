'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { motion } from 'framer-motion';
import { getGymImage } from '../../lib/gymImages';
import { 
  Phone, Mail, MapPin, Send, CheckCircle, MessageSquare, 
  Smartphone, CheckCircle2, ChevronRight, Share2 
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1 } }),
};

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', goal: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  const heroImg = getGymImage('contact');
  const appImg = getGymImage('mobile_app');
  const mapImg = getGymImage('reception');

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
              GET IN TOUCH // TOUR THE FLOOR
            </motion.span>
            
            <motion.h1 initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Step Into<br />
              <span className="text-[#d4ff00]">The Zone.</span>
            </motion.h1>
            
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="text-slate-300 text-base md:text-xl leading-relaxed max-w-3xl mx-auto font-poppins font-light">
              Visit us, message the team or call now to book your free fitness assessment. Our coaches are ready to help you find the perfect programme.
            </motion.p>
          </div>
        </section>

        {/* Section 1: Contact Methods Grid */}
        <section className="py-24 bg-[#0a0a0c] border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-start">
            
            {/* Left Column: Cards & Socials (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Prefer to Talk Card */}
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl text-left space-y-6 card-neon-hover group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-950 border border-white/10 rounded-2xl flex items-center justify-center text-[#d4ff00] group-hover:bg-[#d4ff00] group-hover:text-black transition-all">
                    <Phone size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#d4ff00] uppercase tracking-widest">DIRECT LINE</span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">Prefer To Talk?</h3>
                  </div>
                </div>
                <p className="text-slate-400 font-poppins text-xs leading-relaxed">
                  Skip the form. Call or WhatsApp our team directly for instant answers.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <a href="tel:+919779333155" className="bg-[#d4ff00] text-black font-extrabold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl hover:bg-white transition-all shadow-[0_0_15px_rgba(212,255,0,0.2)] flex items-center gap-1.5">
                    Call Now
                  </a>
                  <a href="https://wa.me/919779333155" target="_blank" rel="noopener noreferrer" className="border border-white/10 hover:border-[#d4ff00] text-white hover:text-[#d4ff00] font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl transition-all bg-white/5 flex items-center gap-1.5">
                    WhatsApp Us
                  </a>
                </div>
              </motion.div>

              {/* Book Free Trial Card */}
              <motion.div custom={0.1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl text-left space-y-6 card-neon-hover group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-950 border border-white/10 rounded-2xl flex items-center justify-center text-[#d4ff00] group-hover:bg-[#d4ff00] group-hover:text-black transition-all">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#d4ff00] uppercase tracking-widest">EXPERIENCE ALPHA</span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">Book A Free Trial</h3>
                  </div>
                </div>
                <p className="text-slate-400 font-poppins text-xs leading-relaxed">
                  Walk in, tour the floor, meet the coaches. No pressure, no fees.
                </p>
                <div className="pt-2">
                  <a href="/packages" className="border border-white/10 hover:border-[#d4ff00] text-white hover:text-black hover:bg-[#d4ff00] font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl transition-all bg-white/5 inline-flex items-center gap-1">
                    View Packages <ChevronRight size={12} />
                  </a>
                </div>
              </motion.div>

              {/* Follow the Zone Card */}
              <motion.div custom={0.2} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl text-left space-y-6 card-neon-hover group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-950 border border-white/10 rounded-2xl flex items-center justify-center text-[#d4ff00] group-hover:bg-[#d4ff00] group-hover:text-black transition-all">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#d4ff00] uppercase tracking-widest">SOCIAL MEDIA</span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">Follow The Zone</h3>
                  </div>
                </div>
                <p className="text-slate-400 font-poppins text-xs leading-relaxed">
                  Daily training, transformations and behind-the-scenes on our socials.
                </p>
                <div className="flex gap-3 pt-2">
                  <a href="https://www.instagram.com/alphazonegym" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#d4ff00] hover:border-[#d4ff00]/40 transition-all">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                  <a href="https://www.youtube.com/@Alphazonegym" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-9 h-9 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#d4ff00] hover:border-[#d4ff00]/40 transition-all">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                </div>
              </motion.div>

            </div>

            {/* Right Column: Contact Form (5 cols on lg) */}
            <div className="lg:col-span-5">
              <motion.div custom={0.3} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 md:p-10 text-left"
              >
                {submitted ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                    <div className="w-20 h-20 bg-[#d4ff00]/10 border border-[#d4ff00]/30 rounded-full flex items-center justify-center text-[#d4ff00]">
                      <CheckCircle size={36} />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Message Sent!</h3>
                    <p className="text-slate-400 font-poppins max-w-xs text-xs leading-relaxed">Thank you for reaching out. Our team will contact you within 24 hours.</p>
                    <button onClick={() => { setSubmitted(false); setFormData({ name: '', phone: '', email: '', goal: '', message: '' }); }}
                      className="border border-white/10 hover:border-[#d4ff00] text-white hover:text-[#d4ff00] font-bold text-xs px-6 py-3 rounded-full transition-all cursor-pointer bg-transparent">
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-8">
                      <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">ENQUIRY FORM</span>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Send A Message</h2>
                      <div className="w-12 h-1 bg-[#d4ff00]" />
                      <p className="text-slate-500 text-xs font-poppins pt-1">Fill out the form — we&apos;ll get back within 24 hours.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 font-poppins">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Full Name *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Your name"
                          className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#d4ff00] transition-colors" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Phone *</label>
                          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Your phone number"
                            className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#d4ff00] transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Email Address</label>
                          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com"
                            className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#d4ff00] transition-colors" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Transformation Goal *</label>
                        <select name="goal" value={formData.goal} onChange={handleChange} required
                          className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white outline-none focus:border-[#d4ff00] transition-colors appearance-none">
                          <option value="">Select your goal...</option>
                          <option value="weight-loss">Weight Loss</option>
                          <option value="muscle-gain">Muscle Gain</option>
                          <option value="general-fitness">General Fitness</option>
                          <option value="personal-training">Personal Training</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Message</label>
                        <textarea name="message" value={formData.message} onChange={handleChange} rows={4} placeholder="Your message here..."
                          className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#d4ff00] transition-colors resize-none" />
                      </div>

                      <button type="submit" disabled={loading}
                        className="w-full bg-[#d4ff00] text-black font-extrabold text-xs py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-[0_0_15px_rgba(212,255,0,0.2)]">
                        {loading ? (
                          <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /><span>Sending...</span></>
                        ) : (
                          <><Send size={14} /><span>Send Message</span></>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </motion.div>
            </div>

          </div>
        </section>

        {/* Section 2: Come Train With Us (Google Maps) */}
        <section className="py-24 bg-[#08080a] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase">VISIT THE GYM</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Come Train With Us.</h2>
              <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Info Left (4 cols) */}
              <div className="lg:col-span-4 space-y-6 text-left">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-[#d4ff00] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Alpha Zone Gym Location</h4>
                      <p className="text-xs text-slate-400 font-poppins leading-relaxed mt-1">
                        2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Sahibzada Ajit Singh Nagar, Punjab 140308
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-start gap-3">
                    <Mail size={16} className="text-[#d4ff00] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Email Address</h4>
                      <p className="text-xs text-slate-400 font-poppins mt-1">alphazonegym@gmail.com</p>
                    </div>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-start gap-3">
                    <Phone size={16} className="text-[#d4ff00] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Working Hours</h4>
                      <p className="text-xs text-slate-400 font-poppins mt-1 leading-relaxed">
                        Mon – Sat: Morning &amp; Evening batches<br />
                        Sunday: Contact for timings
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <a href="https://maps.google.com/?q=2nd+Floor+MNB+Group+SCO+16-17+Landran+Road+Sohana+Punjab+140308" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-white/10 hover:border-[#d4ff00] text-white hover:text-black hover:bg-[#d4ff00] font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl transition-all">
                    Open in Google Maps
                  </a>
                </div>
              </div>

              {/* Map Frame Right (8 cols) */}
              <div className="lg:col-span-8">
                <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-[400px]">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3430.730386629088!2d76.68334467554907!3d30.697880974600127!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390fee8c3a24f3c3%3A0x5c7f1f15b5f3b8a0!2sSohana%2C%20Punjab!5e0!3m2!1sen!2sin!4v1715420000000!5m2!1sen!2sin"
                    width="100%" height="100%" style={{ border: 0 }} allowFullScreen={true} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Your Gym. In Your Pocket. */}
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
