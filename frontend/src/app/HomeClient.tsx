'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Shield, Crown, UserCheck, 
  Eye, EyeOff, Zap, ArrowRight, Check, X, Trophy,
  Users, Flame, Target, Droplet, CheckCircle2,
  Home as HomeIcon, QrCode, BarChart2,
  Clock, Calendar, Award, Phone, Mail, MessageSquare,
  Menu, ChevronLeft, ChevronRight, Play, ExternalLink,
  Heart
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db as fDb } from '../lib/firebase';
import CinematicHero from '../components/CinematicHero';
import { getGymImage, getGymImages } from '../lib/gymImages';


const mobileProgressData = [
  { day: 'M', value: 45 },
  { day: 'T', value: 52 },
  { day: 'W', value: 49 },
  { day: 'Th', value: 65 },
  { day: 'F', value: 58 },
  { day: 'Sa', value: 75 }
];

const exerciseList = [
  { id: 0, name: 'Bench Press', sets: '4×10', muscle: 'Chest' },
  { id: 1, name: 'Pull-Ups', sets: '3×8', muscle: 'Back' },
  { id: 2, name: 'Squats', sets: '4×12', muscle: 'Legs' },
  { id: 3, name: 'Shoulder Press', sets: '3×10', muscle: 'Shoulders' },
];

const galleryImages = [
  { url: '/gym_images/Strength Training Gym in Mohali.jpg', caption: 'Premium Imported Strength Racks' },
  { url: '/gym_images/Best Gym in Mohali.jpg', caption: 'Elite Olympic Lifting Area' },
  { url: '/gym_images/Best Gym nearby.jpg', caption: 'Custom Barbell & Dumbbell Racks' },
  { url: '/gym_images/Weight Loss Gym Mohali.jpg', caption: 'HIIT & Battle Ropes Circuit' },
  { url: '/gym_images/gym near airport.jpg', caption: 'Sleek Cardio Rowers & Treadmills' },
  { url: '/gym_images/Best Gym Near Landran Road.jpeg', caption: 'Personal Training Consultation Desk' }
];

export default function AlphaZoneLandingPage() {
  const { login, setUser, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState('');
  
  // Signup Form States
  const [signupPlan, setSignupPlan] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Mobile simulator states
  const [waterIntake, setWaterIntake] = useState(1.5);
  const [completedExs, setCompletedExs] = useState<Record<number, boolean>>({});
  const [simTab, setSimTab] = useState<'home' | 'workouts' | 'progress'>('home');

  // Lightbox Modal state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Testimonials state
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const testimonials = [
    { name: "Karan V.", role: "Powerlifter", review: "The strength equipment at Alpha Zone is incredible. Rogue bars, calibrated plates, and coaches who know how to program for performance. Transformed my squat from 140kg to 210kg in 10 months.", rating: 5 },
    { name: "Sneha R.", role: "Athletic Conditioning", review: "Reception staff are super friendly, and the AI mobile app simulator is amazing for tracking workouts and hydration streak inside. Everything feels clean, premium, and extremely motivating.", rating: 5 },
    { name: "Vikram K.", role: "CrossFit enthusiast", review: "Best gym environment in Sohana! The weekly CrossFit and group conditioning classes push you beyond limits. Plus, no locked contracts makes it completely pressure-free.", rating: 5 }
  ];

  useEffect(() => {
    setIsMounted(true);
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const user = await login({ email, password });
      toast.success(`Welcome back, ${user.name || user.email}!`);
      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Invalid Email or Password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      const uid = userCredential.user.uid;
      
      // Save profile to Firestore users collection
      await setDoc(doc(fDb, 'users', uid), {
        uid,
        name: signupUsername,
        email: signupEmail,
        role: 'gym_owner', // default to owner to allow dashboard access
        branch: 'Mohali, Punjab',
        gymId: 'gym_001',
        signupPlan,
        createdAt: new Date().toISOString()
      });

      toast.success('Account created successfully on Firebase!');
      setEmail(signupEmail);
      setPassword(signupPassword);
      setShowLoginModal(true);
      toast.success('Please sign in with your new credentials');
    } catch (error: any) {
      console.error('Firebase signup error:', error);
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const selectPricingPlan = (plan: string) => {
    setSignupPlan(plan);
    const signupSection = document.getElementById('signup');
    if (signupSection) {
      signupSection.scrollIntoView({ behavior: 'smooth' });
    }
    toast.success(`Selected ${plan.toUpperCase()} Plan! Please complete signup below.`);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const prevLightbox = () => {
    setLightboxIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const nextLightbox = () => {
    setLightboxIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-white flex flex-col font-poppins overflow-x-hidden selection:bg-[#d4ff00] selection:text-black">
      
      {/* Self-contained CSS Marquee & Custom Styles */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .text-neon-glow {
          text-shadow: 0 0 12px rgba(212,255,0,0.3);
        }
        .card-neon-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-neon-hover:hover {
          border-color: rgba(212, 255, 0, 0.4);
          box-shadow: 0 0 25px rgba(212, 255, 0, 0.15);
          transform: translateY(-4px);
        }
      `}</style>

      {/* Sticky Header Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#08080a]/80 backdrop-blur-md border-b border-white/10 transition-all text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
            <img src="/gymlogo.png" alt="Alpha Zone Logo" className="h-16 w-auto object-contain" />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-400">
            <a href="/" className="hover:text-[#d4ff00] hover:text-neon-glow transition-colors">Home</a>
            <a href="/about" className="hover:text-[#d4ff00] hover:text-neon-glow transition-colors">About</a>
            <a href="/services" className="hover:text-[#d4ff00] hover:text-neon-glow transition-colors">Services</a>
            <a href="/packages" className="hover:text-[#d4ff00] hover:text-neon-glow transition-colors">Packages</a>
            <a href="/app" className="hover:text-[#d4ff00] hover:text-neon-glow transition-colors">App</a>
            <a href="/contact" className="hover:text-[#d4ff00] hover:text-neon-glow transition-colors">Contact</a>
          </nav>

          {/* Action buttons */}
          <div className="hidden sm:flex items-center gap-4">
            <button 
              onClick={() => { setEmail(''); setPassword(''); setShowLoginModal(true); }} 
              className="text-slate-350 hover:text-[#d4ff00] font-bold text-xs tracking-wider uppercase transition-all bg-transparent border-none py-2 px-4 cursor-pointer"
            >
              Client Login
            </button>
            <a 
              href="#signup" 
              className="bg-[#d4ff00] text-black font-extrabold text-xs px-6 py-3 rounded-full hover:bg-white transition-all cursor-pointer shadow-[0_0_15px_rgba(212,255,0,0.25)] hover:scale-105"
            >
              JOIN NOW
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-white hover:text-[#d4ff00] transition-colors p-2 bg-transparent border-none cursor-pointer"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#0c0c0e] border-t border-white/10 px-6 py-6 space-y-4 flex flex-col"
            >
              <a href="/" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#d4ff00] font-bold text-sm tracking-wide uppercase">Home</a>
              <a href="/about" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#d4ff00] font-bold text-sm tracking-wide uppercase">About</a>
              <a href="/services" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#d4ff00] font-bold text-sm tracking-wide uppercase">Services</a>
              <a href="/packages" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#d4ff00] font-bold text-sm tracking-wide uppercase">Packages</a>
              <a href="/app" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#d4ff00] font-bold text-sm tracking-wide uppercase">App</a>
              <a href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#d4ff00] font-bold text-sm tracking-wide uppercase">Contact</a>
              <div className="pt-4 border-t border-white/5 flex gap-4">
                <button onClick={() => { setEmail(''); setPassword(''); setMobileMenuOpen(false); setShowLoginModal(true); }} className="w-1/2 bg-slate-900 text-white font-bold py-3 rounded-full text-xs uppercase text-center cursor-pointer border-none">Login</button>
                <a href="/contact" onClick={() => setMobileMenuOpen(false)} className="w-1/2 bg-[#d4ff00] text-black font-extrabold py-3 rounded-full text-xs uppercase text-center shadow-[0_0_15px_rgba(212,255,0,0.1)]">Join Now</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── Premium Cinematic Hero Section ─── */}
      <CinematicHero />

      {/* ─── Specialty Infinite Ticker Banner ─── */}
      <div className="relative w-full overflow-hidden bg-[#d4ff00] text-black py-4 select-none border-y border-[#d4ff00]/10 shadow-[0_0_30px_rgba(212,255,0,0.15)] z-20">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-sm font-black uppercase tracking-[0.2em] mx-6">STRENGTH ★ CROSSFIT ★ MOBILITY ★ ATHLETIC CONDITIONING ★ CARDIO ★ PERSONAL TRAINING ★ NUTRITION PROGRAMMING ★ MUSCLE BUILD ★</span>
          <span className="text-sm font-black uppercase tracking-[0.2em] mx-6">STRENGTH ★ CROSSFIT ★ MOBILITY ★ ATHLETIC CONDITIONING ★ CARDIO ★ PERSONAL TRAINING ★ NUTRITION PROGRAMMING ★ MUSCLE BUILD ★</span>
        </div>
      </div>

      {/* ─── Metrics Stats Section ─── */}
      <section className="py-12 bg-[#08080a] relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { val: "10K+", title: "Members Trained", desc: "Forging absolute results", icon: Users, color: "text-[#d4ff00]" },
              { val: "25+", title: "Expert Coaches", desc: "Certified elite trainers", icon: Trophy, color: "text-[#d4ff00]" },
              { val: "50+", title: "Weekly Classes", desc: "From HIIT to Strength Build", icon: Clock, color: "text-[#d4ff00]" },
              { val: "12yr", title: "Of Excellence", desc: "Building physical limits", icon: Award, color: "text-[#d4ff00]" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-white/5 backdrop-blur-md p-6 rounded-2xl text-center space-y-2 card-neon-hover">
                <div className="w-10 h-10 bg-slate-800/80 rounded-xl mx-auto flex items-center justify-center border border-white/10">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl md:text-3xl font-black text-white tracking-tight">{stat.val}</div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{stat.title}</div>
                <div className="text-[9px] text-slate-500 font-medium">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About Section / Performance Lab ─── */}
      <section id="about" className="py-24 bg-[#0a0a0c] text-white relative overflow-hidden z-20 border-t border-white/5">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-[#d4ff00]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Heavy Styling Image Frame */}
          <motion.div 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative group justify-self-center md:justify-self-start"
          >
            <div className="relative w-full max-w-[460px] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              <img 
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                src="/gym_images/Best Gym nearby.jpg" 
                alt="Gym Interior Performance Lab" 
              />
              {/* Corner Float Badge */}
              <div className="absolute bottom-6 left-6 z-25 bg-[#d4ff00] text-black font-extrabold text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg border border-[#d4ff00]/20 flex items-center gap-1.5">
                <Crown size={12} />
                12+ Years Building Champions
              </div>
            </div>
            {/* Outline Glow Decorator */}
            <div className="absolute -inset-1 border-2 border-dashed border-[#d4ff00]/30 rounded-[34px] -z-10 group-hover:border-[#d4ff00]/60 transition-all pointer-events-none" />
          </motion.div>

          {/* Right Side: Copywriting Checklist */}
          <motion.div 
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="flex flex-col items-start text-left space-y-6"
          >
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">ABOUT ALPHA ZONE</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase leading-tight">
              MORE THAN A GYM.<br />A PERFORMANCE LAB.
            </h2>
            <div className="w-16 h-1 bg-[#d4ff00]" />
            <p className="text-slate-400 text-sm md:text-base leading-relaxed font-poppins">
              Alpha Zone is designed for those who refuse the status quo. We provide an uncompromising training culture, featuring fully imported state-of-the-art weights, elite customized bio-mechanical programming, and biometrically secured facilities. Start building your strongest self.
            </p>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 w-full font-poppins">
              {[
                "Premium imported equipment",
                "Certified expert coaches",
                "Personalised programming",
                "Open 7 days a week"
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 text-xs md:text-sm font-semibold text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-[#d4ff00]/15 flex items-center justify-center border border-[#d4ff00]/40 shrink-0 text-[#d4ff00]">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex gap-4">
              <a href="#signup" className="bg-[#d4ff00] text-black font-extrabold text-xs tracking-wider px-8 py-3.5 rounded-full hover:bg-white transition-all shadow-[0_0_15px_rgba(212,255,0,0.2)]">START TRAINING →</a>
              <a href="#gallery" className="border border-white/10 hover:border-[#d4ff00] text-white font-bold text-xs tracking-wider px-8 py-3.5 rounded-full transition-all">TAKE THE TOUR</a>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ─── Why Choose Us Section ─── */}
      <section className="py-24 bg-[#08080a] relative z-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">WHY CHOOSE US</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
              BUILT FOR THOSE WHO SHOW UP.
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-400 text-sm md:text-base font-poppins leading-relaxed">
              We provide the tools, coaching, and environment you need to build consistency, strength, and confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-poppins">
            {[
              { title: "Elite Equipment", desc: "Train with the best. Fully imported professional strength and cardio machinery optimized for safety and mechanical efficiency.", icon: Dumbbell },
              { title: "Expert Coaches", desc: "Get trained by the best. Certified specialist coaches who structure programming, track progress, and drive consistency.", icon: UserCheck },
              { title: "Smart Programming", desc: "No random workouts. Custom periodized plans personalized to your goals, history, and physical profile.", icon: Target },
              { title: "Proven Results", desc: "Thousands of members transformed. Read real progress metrics powered by our internal dashboard algorithms.", icon: Flame },
              { title: "Safe & Hygienic", desc: "Spotless facilities. Hand sanitizing stations, daily heavy cleaning, and air filtration for optimal training comfort.", icon: Shield },
              { title: "Open 7 Days", desc: "Early mornings to late nights. Flexible timing that fits into your active lifestyle without any friction.", icon: Calendar }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl text-left space-y-4 card-neon-hover">
                <div className="w-12 h-12 bg-[#d4ff00]/10 border border-[#d4ff00]/30 rounded-xl flex items-center justify-center text-[#d4ff00]">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide">{item.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── Services Section ─── */}
      <section id="services" className="py-24 bg-[#0a0a0c] text-white relative z-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">OUR SERVICES</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
              TRAIN EVERY WAY THAT MATTERS.
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-400 text-sm md:text-base font-poppins leading-relaxed">
              Unlock your peak potential with diverse premium training categories programmed for functional performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-poppins">
            {[
              { num: "01", title: "Weight Training", desc: "Barbells, dumbbells, power cages, and specialized pin machines for muscle isolation and hypertrophic development.", icon: Dumbbell },
              { num: "02", title: "Cardio Zone", desc: "Top-tier rowers, assault bikes, curved motorless treadmills, and stairmasters optimized for metabolic conditioning.", icon: Heart },
              { num: "03", title: "Personal Training", desc: "One-on-one customized training blocks, biometric goal charting, structural correction, and direct coaching access.", icon: UserCheck },
              { num: "04", title: "CrossFit", desc: "High-intensity functional conditioning including Olympic lifts, plyometrics, gymnastic rings, and engine builders.", icon: Flame },
              { num: "05", title: "Functional Training", desc: "Kettlebell flows, medicine ball slams, core stabilization, and real-world athletic movement optimization.", icon: Trophy },
              { num: "06", title: "Group Classes", desc: "Energetic community sessions from HIIT classes and strength challenges to focus, form, and yoga modules.", icon: Users }
            ].map((srv, idx) => (
              <div key={idx} className="relative bg-slate-900/60 border border-white/5 p-8 rounded-2xl text-left card-neon-hover group overflow-hidden">
                {/* Floating Glow number in background */}
                <div className="absolute top-4 right-6 text-5xl font-black text-slate-800/40 select-none group-hover:text-[#d4ff00]/10 transition-colors">{srv.num}</div>
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-slate-800/90 rounded-xl flex items-center justify-center text-[#d4ff00] border border-white/10">
                    <srv.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide">{srv.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{srv.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Cardio icon managed via Lucide Heart */}

      {/* ─── Membership Pricing Plans ─── */}
      <section id="plans" className="py-24 bg-[#08080a] relative z-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">MEMBERSHIP PLANS</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
              CHOOSE YOUR COMMITMENT.
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-400 text-sm md:text-base font-poppins leading-relaxed">
              Flexible options tailored to your schedule. Choose a contract-free plan and unlock premium access.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch font-poppins max-w-6xl mx-auto">
            
            {/* 1 Month Plan */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-7 flex flex-col justify-between text-left card-neon-hover relative">
              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-black text-[#d4ff00] tracking-widest uppercase">1 MONTH</span>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide mt-1">Monthly Access</h3>
                  <p className="text-slate-400 text-xs mt-1">Perfect for trial and short-term routines</p>
                </div>
                
                <div className="space-y-0.5">
                  <div className="text-slate-500 text-sm font-semibold line-through">₹3,500</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">₹3,000</span>
                    <span className="text-slate-400 text-xs">/ month</span>
                  </div>
                </div>

                <div className="h-[1px] bg-white/10" />

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Full gym access</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>All cardio & weight equipment</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Locker room access</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Free fitness assessment</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Open 7 days a week</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => selectPricingPlan('monthly')}
                className="w-full mt-7 border border-white/10 hover:border-[#d4ff00] text-white hover:text-black hover:bg-[#d4ff00] font-bold py-3 rounded-xl text-xs uppercase text-center transition-all cursor-pointer bg-transparent"
              >
                SELECT
              </button>
            </div>

            {/* 3 Months Plan (Highlighted) */}
            <div className="bg-slate-950 border-[2px] border-[#d4ff00] rounded-3xl p-7 flex flex-col justify-between text-left relative shadow-[0_0_35px_rgba(212,255,0,0.18)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#d4ff00] text-black font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md z-10">
                MOST POPULAR
              </div>
              
              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-black text-[#d4ff00] tracking-widest uppercase">3 MONTHS</span>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide mt-1 flex items-center gap-2">
                    Quarterly Pass
                    <span className="w-2 h-2 rounded-full bg-[#d4ff00] animate-ping shrink-0" />
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Best value for real transformation</p>
                </div>
                
                <div className="space-y-0.5">
                  <div className="text-slate-500 text-sm font-semibold line-through">₹8,000</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">₹6,000</span>
                    <span className="text-slate-400 text-xs">/ 3 months</span>
                  </div>
                </div>

                <div className="h-[1px] bg-white/10" />

                <ul className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Everything in Monthly</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span className="font-bold text-white">2 personal training sessions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Unlimited group classes</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Diet & nutrition consultation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Body composition tracking</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => selectPricingPlan('quarterly')}
                className="w-full mt-7 bg-[#d4ff00] text-black font-black py-3 rounded-xl text-xs uppercase text-center transition-all cursor-pointer border-none shadow-[0_0_15px_rgba(212,255,0,0.3)] hover:bg-white hover:scale-[1.01]"
              >
                SELECT
              </button>
            </div>

            {/* 6 Months Plan */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-7 flex flex-col justify-between text-left card-neon-hover relative">
              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-black text-[#d4ff00] tracking-widest uppercase">6 MONTHS</span>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide mt-1">Semi-Annual Elite</h3>
                  <p className="text-slate-400 text-xs mt-1">Serious training for serious results</p>
                </div>
                
                <div className="space-y-0.5">
                  <div className="text-slate-500 text-sm font-semibold line-through">₹12,000</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">₹9,000</span>
                    <span className="text-slate-400 text-xs">/ 6 months</span>
                  </div>
                </div>

                <div className="h-[1px] bg-white/10" />

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Everything in Quarterly</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span className="font-bold text-white">4 personal training sessions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Priority locker reservation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Bi-monthly body assessments</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Diet & nutrition consultation</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => selectPricingPlan('semi-annual')}
                className="w-full mt-7 border border-white/10 hover:border-[#d4ff00] text-white hover:text-black hover:bg-[#d4ff00] font-bold py-3 rounded-xl text-xs uppercase text-center transition-all cursor-pointer bg-transparent"
              >
                SELECT
              </button>
            </div>

            {/* 12 Months VIP Plan */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-7 flex flex-col justify-between text-left card-neon-hover relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-700 text-[#d4ff00] font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md z-10 border border-[#d4ff00]/30">
                BEST VALUE
              </div>
              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-black text-[#d4ff00] tracking-widest uppercase">12 MONTHS</span>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide mt-1">Annual VIP Pass</h3>
                  <p className="text-slate-400 text-xs mt-1">For athletes committed to transformation</p>
                </div>
                
                <div className="space-y-0.5">
                  <div className="text-slate-500 text-sm font-semibold line-through">₹18,000</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">₹14,000</span>
                    <span className="text-slate-400 text-xs">/ year</span>
                  </div>
                </div>

                <div className="h-[1px] bg-white/10" />

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Everything in Semi-Annual</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span className="font-bold text-white">8 personal training sessions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Priority class booking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>5 guest passes per year</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={13} className="text-[#d4ff00] shrink-0" />
                    <span>Monthly structural checkups</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => selectPricingPlan('annual')}
                className="w-full mt-7 border border-white/10 hover:border-[#d4ff00] text-white hover:text-black hover:bg-[#d4ff00] font-bold py-3 rounded-xl text-xs uppercase text-center transition-all cursor-pointer bg-transparent"
              >
                SELECT
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Meet the Coaches Section ─── */}
      <section id="trainers" className="py-24 bg-[#0a0a0c] text-white relative z-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">MEET THE COACHES</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
              TRAINED BY THE BEST.
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-400 text-sm md:text-base font-poppins leading-relaxed">
              Our expert coaches are certified performance specialists committed to guiding your lifting form, metrics, and nutrition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-poppins max-w-5xl mx-auto">
            {[
              { 
                name: "Arshpreet Singh", 
                role: "COACH", 
                desc: "Experienced strength & conditioning specialist focused on powerlifting, heavy compound lifts, and personalized strength programming.",
                cert: "CERTIFIED COACH",
                img: "/arshpreet.png"
              },
              { 
                name: "Lovely Chaudhary", 
                role: "COACH", 
                desc: "Dedicated transformation & functional fitness coach. Specializes in body weight management, functional mobility, and athletic growth.",
                cert: "CERTIFIED COACH",
                img: "/lovely.png"
              },
              { 
                name: "Sourav Kumar", 
                role: "COACH", 
                desc: "High-performance conditioning coach with expertise in athletic training, metabolic endurance routines, and high-intensity workouts.",
                cert: "CERTIFIED COACH",
                img: "/saurav.png"
              }
            ].map((coach, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 text-center space-y-4 card-neon-hover flex flex-col items-center justify-between">
                <div className="space-y-4 w-full">
                  {/* Circular Portrait Image */}
                  <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#d4ff00] transition-colors mx-auto bg-slate-800">
                    <img src={coach.img} alt={coach.name} className="w-full h-full object-cover object-top" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-white">{coach.name}</h3>
                    <div className="text-[10px] font-black text-[#d4ff00] tracking-widest uppercase mt-0.5">{coach.role}</div>
                  </div>

                  <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">{coach.desc}</p>
                </div>

                <div className="w-full pt-4 border-t border-white/5 mt-4 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">{coach.cert}</span>
                  <div className="flex gap-2">
                    <button onClick={() => toast.success(`Contacting ${coach.name.split(" ")[0]}...`)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-[#d4ff00] hover:text-black text-slate-400 transition-colors border-none cursor-pointer">
                      <MessageSquare size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── Gallery Section with Full Lightbox Modal ─── */}
      <section id="gallery" className="py-24 bg-[#08080a] relative z-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">GALLERY</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
              INSIDE THE ZONE.
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-400 text-sm md:text-base font-poppins leading-relaxed">
              Take a virtual walkthrough of our state-of-the-art strength zones, functional setups, and cardio suites.
            </p>
          </div>

          {/* Interactive Masonry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-poppins max-w-6xl mx-auto">
            {galleryImages.map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => openLightbox(idx)}
                className="relative group rounded-3xl overflow-hidden border border-white/5 cursor-pointer shadow-md bg-slate-900 h-64"
              >
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-end p-6 text-left" />
                <img 
                  src={img.url} 
                  alt={img.caption} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                
                {/* Floating zoom indicator */}
                <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={10} className="text-white fill-white ml-0.5" />
                </div>
                
                {/* Description details */}
                <div className="absolute bottom-6 left-6 right-6 z-20 text-left opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-[9px] font-black text-[#d4ff00] uppercase tracking-widest">Alpha Zone Spaces</span>
                  <h4 className="text-sm font-bold text-white mt-1 leading-snug">{img.caption}</h4>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Gallery Lightbox Modal */}
        <AnimatePresence>
          {lightboxOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 0.9 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setLightboxOpen(false)}
                className="fixed inset-0 bg-black" 
              />
              
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative max-w-4xl w-full z-10 flex flex-col items-center gap-4"
              >
                {/* Image Display */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/15 bg-black">
                  <img 
                    src={galleryImages[lightboxIndex].url} 
                    alt={galleryImages[lightboxIndex].caption} 
                    className="w-full h-full object-contain" 
                  />
                  
                  {/* Previous Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black border border-white/10 text-white hover:text-[#d4ff00] transition-colors cursor-pointer border-none flex items-center justify-center"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Next Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black border border-white/10 text-white hover:text-[#d4ff00] transition-colors cursor-pointer border-none flex items-center justify-center"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Caption Description */}
                <div className="text-center font-poppins space-y-1">
                  <h4 className="text-white text-base font-bold">{galleryImages[lightboxIndex].caption}</h4>
                  <p className="text-slate-400 text-xs">Image {lightboxIndex + 1} of {galleryImages.length}</p>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setLightboxOpen(false)}
                  className="absolute top-[-3rem] right-0 p-2 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer text-sm font-bold uppercase tracking-widest flex items-center gap-1"
                >
                  <X size={16} /> Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* ─── Testimonials Section ─── */}
      <section className="py-24 bg-[#0a0a0c] relative z-20 border-t border-white/5 font-poppins">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
          
          <div className="space-y-4">
            <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">TESTIMONIALS</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
              RESULTS SPEAK LOUDEST.
            </h2>
            <div className="w-16 h-1 bg-[#d4ff00] mx-auto" />
          </div>

          {/* Review Card */}
          <div className="relative bg-slate-900/40 border border-white/5 rounded-3xl p-8 md:p-12 shadow-md min-h-[220px] flex flex-col justify-between">
            <div className="absolute top-4 left-6 text-7xl font-black text-slate-800/20 select-none">&ldquo;</div>
            
            <p className="text-slate-200 text-sm md:text-base leading-relaxed italic z-10 relative">
              {testimonials[currentTestimonial].review}
            </p>

            <div className="pt-6 border-t border-white/5 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-left">
                <div className="text-xs font-bold text-white uppercase tracking-wider">{testimonials[currentTestimonial].name}</div>
                <div className="text-[10px] text-[#d4ff00] font-bold mt-0.5">{testimonials[currentTestimonial].role}</div>
              </div>
              
              {/* Star rating rendering */}
              <div className="flex gap-1">
                {Array.from({ length: testimonials[currentTestimonial].rating }).map((_, i) => (
                  <span key={i} className="text-[#d4ff00] text-sm">★</span>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => setCurrentTestimonial(prev => (prev === 0 ? testimonials.length - 1 : prev - 1))}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-none cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-500">{currentTestimonial + 1} / {testimonials.length}</span>
            <button 
              onClick={() => setCurrentTestimonial(prev => (prev === testimonials.length - 1 ? 0 : prev + 1))}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-none cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

        </div>
      </section>

      {/* ─── Premium Mobile App Simulator Section ─── */}
      <section id="app" className="py-24 bg-[#08080a] text-white overflow-hidden relative z-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-black text-slate-500 tracking-widest uppercase">ALPHA ZONE MEMBER APP</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase leading-none tracking-tighter">
              Your Gym In Your Pocket
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-400 text-sm font-poppins">
              Interact with the live simulator below. Tap tabs in the phone mock to test work logs.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 font-poppins">
            
            {/* Left Features List */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="hidden lg:flex flex-col gap-8 text-right max-w-[280px]"
            >
              {[
                { title: 'Interactive Dashboard', desc: 'Live gold membership countdown, active streak tracking, and biometrically assigned coach widgets.' },
                { title: 'Water Intake Ring', desc: 'Tap the + icon in the mock home tab to log glasses of water in real-time.' },
                { title: 'Calorie Ring Tracker', desc: 'Custom progress rings mapping active calorie targets.' }
              ].map((f, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-sm font-bold text-white flex items-center justify-end gap-2">
                    {f.title}
                    <span className="w-2 h-2 rounded-full bg-[#d4ff00]" />
                  </div>
                  <div className="text-xs text-slate-450 leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </motion.div>

            {/* Simulated Phone Device */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.15 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-[300px] h-[610px] rounded-[48px] border-[12px] border-slate-800 bg-[#060608] shadow-2xl relative overflow-hidden flex flex-col">
                {/* Speaker Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-30 flex items-center justify-center">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                {/* Live Screen Content */}
                <div className="flex-1 overflow-hidden bg-[#060608] flex flex-col pt-7 relative">
                  {isMounted ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {simTab === 'home' && (
                        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-4">
                          {/* Member Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-[#d4ff00] text-black flex items-center justify-center font-black text-[10px]">
                                AZ
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] font-bold text-white leading-none">Guest Member</div>
                                <div className="text-[7px] text-[#d4ff00] font-black tracking-wider uppercase mt-1">GOLD ACCESS</div>
                              </div>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-white cursor-pointer hover:bg-slate-800">
                              <QrCode size={12} />
                            </div>
                          </div>

                          {/* Membership Progress */}
                          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2.5 text-left shadow-sm">
                            <div className="flex justify-between items-center text-[8px] text-slate-400">
                              <span>Membership Validity</span>
                              <span className="font-bold text-black bg-[#d4ff00] px-1.5 py-0.5 rounded-[5px] text-[7px]">97 Days Left</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#d4ff00] to-teal-400 rounded-full" style={{ width: '74%' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                              <div className="flex items-center gap-1.5">
                                <Flame size={10} className="text-amber-500" />
                                <div>
                                  <div className="text-[9px] font-bold text-white">8 Days</div>
                                  <div className="text-[6px] text-slate-450 font-bold uppercase">Streak</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Target size={10} className="text-blue-500" />
                                <div>
                                  <div className="text-[9px] font-bold text-white">Rohan S.</div>
                                  <div className="text-[6px] text-slate-450 font-bold uppercase">Assigned Coach</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hydro & Calorie widgets */}
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Calorie Ring */}
                            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 flex flex-col items-center text-center shadow-sm">
                              <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                                  <path className="text-slate-800" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path className="text-amber-500" strokeDasharray="68, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                                <span className="text-[8px] font-bold text-white">68%</span>
                              </div>
                              <div className="text-[9px] font-bold text-white mt-2">1,220 kcal</div>
                              <div className="text-[6px] text-slate-500">of 1,800</div>
                            </div>

                            {/* Water Intake */}
                            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 flex flex-col items-center text-center relative shadow-sm">
                              <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                                  <path className="text-slate-800" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path className="text-blue-500" strokeDasharray={`${Math.round((waterIntake / 3.5) * 100)}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                                <Droplet size={11} className="text-blue-500" />
                              </div>
                              <div className="text-[9px] font-bold text-white mt-2">{waterIntake.toFixed(2)}L</div>
                              <div className="text-[6px] text-slate-500 font-medium">of 3.5L</div>
                              
                              <button 
                                onClick={() => setWaterIntake(w => parseFloat(Math.min(3.5, w + 0.25).toFixed(2)))} 
                                className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform border-none"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Routine Banner */}
                          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 text-left shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[7px] text-slate-350 font-bold uppercase tracking-wider">Today&apos;s Workout</span>
                              <Dumbbell size={10} className="text-white" />
                            </div>
                            <div className="text-[9px] font-bold text-white">Strength & Conditioning</div>
                            <div className="text-[7px] text-slate-500">Duration · 45 mins</div>
                          </div>
                        </div>
                      )}

                      {simTab === 'workouts' && (
                        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3 animate-fade-in">
                          <div className="text-left">
                            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">TODAY&apos;S ROUTINE</h3>
                            <p className="text-[6.5px] text-slate-400 mt-0.5">Tap checkmarks to record sets</p>
                          </div>

                          <div className="space-y-1.5">
                            {exerciseList.map((ex) => {
                              const done = !!completedExs[ex.id];
                              return (
                                <button 
                                  key={ex.id} 
                                  onClick={() => setCompletedExs(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))} 
                                  className={`w-full p-2.5 rounded-xl border flex items-center gap-2 text-left cursor-pointer transition-all ${done ? 'bg-emerald-950/30 border-emerald-800' : 'bg-slate-900 border-white/5'}`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${done ? 'bg-[#d4ff00] border-[#d4ff00]' : 'border-slate-700'}`}>
                                    {done && <Check size={8} className="text-black" strokeWidth={3} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-[8.5px] font-bold truncate ${done ? 'text-slate-550 line-through' : 'text-white'}`}>{ex.name}</div>
                                    <div className="text-[6.5px] text-slate-450">{ex.muscle} · {ex.sets}</div>
                                  </div>
                                  {done && <CheckCircle2 size={10} className="text-[#d4ff00] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Tracker Progress bar */}
                          <div className="p-2.5 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="text-left">
                              <div className="text-[8px] font-bold text-white">{Object.values(completedExs).filter(Boolean).length}/{exerciseList.length} Done</div>
                              <div className="text-[6.5px] text-slate-500 font-bold">Keep burning!</div>
                            </div>
                            <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#d4ff00] rounded-full transition-all duration-500" 
                                style={{ width: `${(Object.values(completedExs).filter(Boolean).length / exerciseList.length) * 100}%` }} 
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {simTab === 'progress' && (
                        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3 animate-fade-in">
                          <div className="text-left">
                            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">WEEKLY SUMMARY</h3>
                            <p className="text-[6.5px] text-slate-400 mt-0.5">Live analytics visualization</p>
                          </div>
                          <div className="p-3 bg-slate-900/80 border border-white/5 rounded-2xl text-left shadow-sm">
                            <div className="text-[16px] font-bold text-white leading-none">75%</div>
                            <div className="text-[6.5px] text-[#d4ff00] uppercase font-bold tracking-wider mt-0.5">Weekly Target Reached</div>
                            <div className="h-16 w-full mt-2">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={mobileProgressData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                                  <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#94A3B8', fontSize: 5 }} axisLine={false} tickLine={false} />
                                  <YAxis stroke="transparent" tick={{ fill: '#94A3B8', fontSize: 5 }} axisLine={false} tickLine={false} />
                                  <Line type="monotone" dataKey="value" stroke="#d4ff00" strokeWidth={1.5} dot={{ r: 1.2, fill: '#d4ff00' }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            {[{ v: '12', l: 'Workouts' }, { v: '3,450', l: 'Calories' }, { v: '8h 20m', l: 'Duration' }].map((s, i) => (
                              <div key={i} className="p-2 bg-slate-900 border border-white/5 rounded-xl shadow-sm">
                                <div className="text-[9px] font-bold text-white">{s.v}</div>
                                <div className="text-[5.5px] text-slate-500 mt-0.5">{s.l}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Tabbar Navigation */}
                <div className="h-14 border-t border-white/5 bg-slate-900 flex items-center justify-around shrink-0 z-10">
                  <button 
                    onClick={() => setSimTab('home')} 
                    className={`flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-none p-0 transition-all ${simTab === 'home' ? 'text-white font-bold' : 'text-slate-500'}`}
                  >
                    <HomeIcon size={13} />
                    <span className="text-[5px] font-bold uppercase tracking-wider">Home</span>
                  </button>
                  <button 
                    onClick={() => setSimTab('workouts')} 
                    className={`flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-none p-0 transition-all ${simTab === 'workouts' ? 'text-white font-bold' : 'text-slate-500'}`}
                  >
                    <Dumbbell size={13} />
                    <span className="text-[5px] font-bold uppercase tracking-wider">Workouts</span>
                  </button>
                  <button 
                    onClick={() => setSimTab('progress')} 
                    className={`flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-none p-0 transition-all ${simTab === 'progress' ? 'text-white font-bold' : 'text-slate-500'}`}
                  >
                    <BarChart2 size={13} />
                    <span className="text-[5px] font-bold uppercase tracking-wider">Progress</span>
                  </button>
                  <button className="flex flex-col items-center gap-0.5 text-slate-500 bg-transparent border-none p-0">
                    <Trophy size={13} />
                    <span className="text-[5px] font-bold uppercase tracking-wider">Awards</span>
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 font-mono">↑ Switch tabs or tap + hydration to test</p>
            </motion.div>

            {/* Right Features List */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="hidden lg:flex flex-col gap-8 text-left max-w-[280px]"
            >
              {[
                { title: 'Interactive Workout Tasks', desc: 'Tap checkboxes inside Workouts tab to mark routines completed and update progress bars.' },
                { title: 'Weekly Progress Analytics', desc: 'Recharts line charts plotting active progress metrics dynamically.' },
                { title: 'Gamified QR Check-in', desc: 'Sleek biometric triggers mapped to scanner check-ins for gold members.' }
              ].map((f, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d4ff00]" />
                    {f.title}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ─── Contact & Map Section ─── */}
      <section id="contact" className="py-24 bg-[#0a0a0c] text-white relative z-20 border-t border-white/5 font-poppins">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-stretch">
          
          {/* Left: Contact Card */}
          <motion.div 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-slate-900/50 border border-white/5 p-8 rounded-3xl flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div>
                <span className="text-xs font-black text-[#d4ff00] tracking-widest uppercase text-neon-glow">CONTACT DETAILS</span>
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mt-2">RECEPTION DESK</h3>
                <div className="w-12 h-[2px] bg-[#d4ff00] mt-3" />
              </div>

              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                Have questions about our memberships, facilities, or corporate discount packages? Contact our reception desk directly below.
              </p>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-[#d4ff00] border border-white/10 shrink-0">
                    <HomeIcon size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-white">Alpha Zone Gym Location</div>
                    <div className="text-slate-450 mt-0.5">2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Mohali, Punjab 140308</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-[#d4ff00] border border-white/10 shrink-0">
                    <Clock size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-white">Opening Hours</div>
                    <div className="text-slate-450 mt-0.5">Monday – Saturday: 05:00 AM – 10:00 PM <br />Sunday: Contact for timings</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-[#d4ff00] border border-white/10 shrink-0">
                    <Phone size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-white">Direct Phone</div>
                    <div className="text-slate-450 mt-0.5">+91 97793 33155</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-[#d4ff00] border border-white/10 shrink-0">
                    <Mail size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-white">Direct Email</div>
                    <div className="text-slate-450 mt-0.5">alphazonegym@gmail.com</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instant Actions (Tel Dial / WhatsApp Prefilled Message) */}
            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/5 mt-8">
              <a 
                href="tel:+919779333155" 
                className="bg-[#d4ff00] text-black font-extrabold text-xs py-3.5 rounded-xl uppercase tracking-widest text-center shadow-[0_0_10px_rgba(212,255,0,0.1)] hover:bg-white transition-all"
              >
                CALL DESK
              </a>
              <a 
                href="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%20Reception%2C%20I%20want%20to%20inquire%20about%20your%20membership%20plans%2520and%2520avail%2520a%2520free%2520gym%2520trial." 
                target="_blank" 
                rel="noopener noreferrer" 
                className="border border-white/10 hover:border-[#d4ff00] text-white hover:text-black hover:bg-[#d4ff00] font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest text-center transition-all flex items-center justify-center gap-1.5"
              >
                WHATSAPP
                <ExternalLink size={11} />
              </a>
            </div>
          </motion.div>

          {/* Right: Iframe Google Maps */}
          <motion.div 
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900 h-[380px] md:h-auto min-h-[300px]"
          >
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3430.730386629088!2d76.68334467554907!3d30.697880974600127!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390fee8c3a24f3c3%3A0x5c7f1f15b5f3b8a0!2sSohana%2C%20Punjab!5e0!3m2!1sen!2sin!4v1715420000000!5m2!1sen!2sin" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true}
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>

        </div>
      </section>

      {/* ─── Signup Section ─── */}
      <section id="signup" className="py-24 border-t border-white/5 bg-black text-white relative overflow-hidden z-20 font-poppins">
        {/* Background decorative spot glows */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#d4ff00]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          
          {/* Image */}
          <motion.div 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center relative"
          >
            <div className="relative w-full max-w-[440px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
              <img 
                className="w-full h-auto object-cover"
                src="/gym_images/Best Gym near me.jpg" 
                alt="Signup Motivation Gym Workout" 
              />
            </div>
            {/* Outline Glow Decorator */}
            <div className="absolute -inset-2 border border-dashed border-[#d4ff00]/20 rounded-[36px] -z-10 pointer-events-none" />
          </motion.div>

          {/* Signup Form Container */}
          <motion.div 
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="bg-slate-900/60 border border-white/10 p-8 rounded-3xl shadow-lg flex flex-col items-stretch text-left"
          >
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase mb-1">
              Jumpstart Your Health
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Create your account on Firebase CRM and activate your gym member profile today.
            </p>

            <form onSubmit={handleSignupSubmit} className="space-y-4 font-poppins">
              {/* Option Selection */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5 tracking-wider">Select Membership Plan</label>
                <select 
                  value={signupPlan} 
                  onChange={e => setSignupPlan(e.target.value)}
                  className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white outline-none focus:border-[#d4ff00] transition-colors"
                  required
                >
                  <option value="">Select Plan...</option>
                  <option value="monthly">1 Month (Monthly) - ₹ 3,000</option>
                  <option value="quarterly">3 Months (Quarterly) - ₹ 6,000</option>
                  <option value="semi-annual">6 Months (Semi-Annual) - ₹ 9,000</option>
                  <option value="annual">12 Months (Annual VIP) - ₹ 14,000</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5 tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#d4ff00] transition-colors"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5 tracking-wider">Choose a Username</label>
                <input 
                  type="text" 
                  value={signupUsername}
                  onChange={e => setSignupUsername(e.target.value)}
                  placeholder="Choose username"
                  className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#d4ff00] transition-colors"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5 tracking-wider">Choose a Password</label>
                <input 
                  type="password" 
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  placeholder="Choose password (min. 6 chars)"
                  className="w-full bg-[#060608] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#d4ff00] transition-colors"
                  required
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-[#d4ff00] text-black font-extrabold text-xs py-3.5 rounded-xl uppercase tracking-widest hover:bg-white hover:scale-[1.01] transition-all cursor-pointer border-none shadow-[0_0_15px_rgba(212,255,0,0.2)]"
                >
                  JOIN NOW
                </button>
              </div>

              {/* Toggle Login Link */}
              <div className="text-center text-xs text-slate-400 pt-2">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setShowLoginModal(true)} 
                  className="text-white hover:text-[#d4ff00] hover:underline font-bold bg-transparent border-none cursor-pointer p-0"
                >
                  Login
                </button>
              </div>

              {/* Legal info */}
              <p className="text-[9px] text-slate-500 leading-relaxed pt-3 border-t border-white/5">
                Trial and monthly membership plans automatically renew monthly until canceled. By joining, you agree to the Terms & Conditions and Privacy Policy.
              </p>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ─── Mobile App Download Banner ─── */}
      <section id="download-app" className="py-20 bg-[#d4ff00] text-black relative z-20 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="bg-[#0c0c0e] text-white rounded-[32px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 shadow-2xl">
            
            {/* Left Content */}
            <div className="flex-1 text-left space-y-6">
              <span className="inline-flex items-center gap-2 bg-[#d4ff00]/10 text-[#d4ff00] text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest border border-[#d4ff00]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] animate-pulse" />
                Direct APK Installer (No Play Store Required)
              </span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight text-white">
                Alpha Zone <br className="hidden md:inline" /> Member Super App
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-lg font-poppins">
                Gain direct access to workouts, daily diet plans, live attendance tracking, and real-time support from your coaches. Download the Android app installer directly on your mobile device.
              </p>
              
              {/* Instructions */}
              <div className="space-y-3 pt-2 font-poppins">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#d4ff00]">Installation Guide:</h4>
                <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 bg-black/20 p-4 rounded-xl border border-white/5">
                  <li>Click <span className="text-white font-semibold">Download Android App</span> on your mobile device.</li>
                  <li>Open the downloaded <code className="text-[#d4ff00] font-mono">AlphaZone.apk</code> file.</li>
                  <li>Enable <span className="text-white font-semibold">&ldquo;Install from Unknown Sources&rdquo;</span> if prompted.</li>
                  <li>Tap <span className="text-white font-semibold">Install</span>, open the app, and login with your CRM account!</li>
                </ol>
              </div>
            </div>

            {/* Right Action & APK Visual */}
            <div className="w-full md:w-auto flex flex-col items-center justify-center shrink-0 space-y-4">
              <div className="relative group p-1 bg-gradient-to-br from-[#d4ff00] to-teal-400 rounded-3xl transition-transform duration-300 hover:scale-105">
                <a 
                  href="/AlphaZone.apk" 
                  download="AlphaZone.apk"
                  className="flex flex-col items-center justify-center bg-[#0c0c0e] text-white px-8 py-10 rounded-[22px] min-w-[280px] text-center space-y-4 transition-colors"
                >
                  <div className="w-16 h-16 bg-[#d4ff00]/10 rounded-2xl flex items-center justify-center text-[#d4ff00] border border-[#d4ff00]/20">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <span className="block font-black text-lg uppercase tracking-wider text-[#d4ff00]">Download Android App</span>
                    <span className="block text-[10px] text-slate-500 mt-1 font-mono">v1.0.0 (Direct APK) • 37.3 MB</span>
                  </div>
                </a>
              </div>
              
              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verified Safe • Direct Installation
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Footer Section ─── */}
      <footer className="bg-[#0a0a0c] border-t border-white/10 relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-16 text-slate-400 font-poppins">
          <div className="grid md:grid-cols-4 gap-8 items-start text-left">
            
            {/* Branding Column */}
            <div className="space-y-4">
              <a href="#" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
                <img src="/gymlogo.png" alt="Alpha Zone Logo" className="h-12 w-auto object-contain" />
              </a>
              <p className="text-xs text-slate-500 leading-relaxed">
                Beyond Strength. Beyond Limits. Elevate operations and fitness tracking using biometric turnstiles, real-time client databases, and interactive progress tools.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Quick Navigation</h3>
              <div className="w-8 h-[2px] bg-[#d4ff00]" />
              <div className="flex flex-col gap-2 text-xs text-slate-500">
                <a href="#" className="hover:text-white transition-colors">Home</a>
                <a href="#about" className="hover:text-white transition-colors">About Us</a>
                <a href="#services" className="hover:text-white transition-colors">Gym Services</a>
                <a href="#plans" className="hover:text-white transition-colors">Membership Plans</a>
              </div>
            </div>

            {/* Contact Support Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">For Support</h3>
              <div className="w-8 h-[2px] bg-[#d4ff00]" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Phone: <span className="text-white font-semibold">+91 97793 33155</span><br />
                Support Email: <span className="text-white font-semibold">alphazonegym@gmail.com</span><br />
                Hours: <span className="text-white font-semibold">05:00 AM – 10:00 PM</span>
              </p>
            </div>

            {/* Headquarters / Locations */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Branch Location</h3>
              <div className="w-8 h-[2px] bg-[#d4ff00]" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Alpha Zone Gym Mohali<br />
                SCO 16-17, Landran Rd, Sohana<br />
                SAS Nagar, Punjab 140308, India
              </p>
            </div>

          </div>

          {/* Bottom Copyright bar */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-600">
            <div>
              Copyright © 2026 Alpha Zone Gym. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <a href="/AlphaZone.apk" download="AlphaZone.apk" className="hover:opacity-90 text-black bg-[#d4ff00] px-3.5 py-1 rounded-full font-extrabold tracking-wide uppercase transition-all scale-105 shadow-[0_0_15px_rgba(212,255,0,0.15)]">Download APK App</a>
              <span>|</span>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── CRM Quick Login Modal ─── */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Modal overlay backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.7 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowLoginModal(false)} 
              className="fixed inset-0 bg-black/85 backdrop-blur-md" 
            />
            
            {/* Modal body container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative w-full max-w-[860px] bg-[#09090b] text-white rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.8)] border border-white/10 z-10 flex flex-col md:flex-row overflow-hidden font-poppins min-h-[540px]"
            >
              
              {/* Close Button */}
              <button 
                onClick={() => setShowLoginModal(false)} 
                className="absolute top-5 right-5 z-30 p-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10 flex items-center justify-center shadow-lg"
              >
                <X size={16} />
              </button>

              {/* Left Side: Premium Image Panel */}
              <div className="w-full md:w-1/2 p-5 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-[#d4ff00]/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-[#d4ff00]/5 rounded-full blur-2xl pointer-events-none" />

                <div className="relative w-full h-full min-h-[240px] md:min-h-[480px] rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center group">
                  {/* Background Image with Zoom */}
                  <img 
                    src="/gym_images/Strength Training Gym in Mohali.jpg" 
                    alt="Trainer lifting weights in premium gym" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  {/* Gradient & Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/80 z-10 pointer-events-none" />
                  
                  {/* Glowing Neon Ring in background */}
                  <div className="absolute w-[280px] h-[280px] rounded-full border border-[#d4ff00]/25 blur-sm z-0 pointer-events-none animate-pulse" />

                  {/* Header HUD overlay */}
                  <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start text-left pointer-events-none font-mono">
                    <div>
                      <div className="text-[9px] font-black text-[#d4ff00] uppercase tracking-[0.25em]">OPERATIONS HUB</div>
                      <div className="text-white text-xs font-bold mt-0.5">SYS.LOC_01 // ACTIVE</div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[#d4ff00] animate-pulse" />
                  </div>

                  {/* Content details overlay */}
                  <div className="absolute bottom-5 left-5 right-5 bg-black/75 backdrop-blur-xl border border-white/10 p-5 rounded-2xl text-left z-20 transition-all duration-300 group-hover:border-[#d4ff00]/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <span className="text-[10px] font-black tracking-widest text-[#d4ff00] uppercase block">BEYOND STRENGTH</span>
                    <h4 className="text-sm font-black text-white mt-1 leading-snug tracking-wide uppercase">ALPHA ZONE CRM OS</h4>
                    <p className="text-[9.5px] text-slate-400 font-medium mt-2 leading-normal">Interactive client databases, real-time biometric turnstile monitoring, and automatic scheduling.</p>
                  </div>
                </div>
              </div>

              {/* Right Side: Clean Form */}
              <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between text-left">
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <img src="/gymlogo.png" alt="Alpha Zone Logo" className="h-10 w-auto object-contain" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-sans">Alpha OS</span>
                  </div>

                  <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight leading-none">Welcome Back</h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">Enter your admin credentials below</p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} autoComplete="off" className="space-y-5 text-left font-poppins">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest font-sans">Email Address</label>
                    <input 
                      type="email" 
                      name="az_admin_usr"
                      autoComplete="off"
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="w-full bg-[#060608] border border-white/10 focus:border-[#d4ff00] rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none transition-all focus:shadow-[0_0_15px_rgba(212,255,0,0.1)]" 
                      placeholder="Enter admin email address"
                      required 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest font-sans">Password</label>
                    <div className="relative flex items-center">
                      <input 
                        type={showPass ? 'text' : 'password'} 
                        name="az_admin_pwd"
                        autoComplete="new-password"
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-[#060608] border border-white/10 focus:border-[#d4ff00] rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none transition-all focus:shadow-[0_0_15px_rgba(212,255,0,0.1)] pr-10" 
                        placeholder="Enter password"
                        required 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPass(!showPass)} 
                        className="absolute right-3 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer flex items-center justify-center p-1"
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.01 }}
                      whileTap={{ scale: loading ? 1 : 0.99 }}
                      className="w-full bg-[#d4ff00] text-black py-3.5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer rounded-2xl border-none shadow-sm hover:bg-white transition-colors"
                    >
                      {loading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={12} className="fill-black text-black" />
                          <span>Log in</span>
                          <ArrowRight size={12} />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>

                <div className="text-center text-[10px] text-slate-500 mt-6 pt-4 border-t border-white/5 font-bold">
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    onClick={() => { setShowLoginModal(false); router.push('#signup'); }} 
                    className="text-white hover:text-[#d4ff00] hover:underline font-black bg-transparent border-none cursor-pointer p-0"
                  >
                    Sign Up
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
