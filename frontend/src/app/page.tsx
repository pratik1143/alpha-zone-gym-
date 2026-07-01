'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Shield, Crown, UserCheck, 
  Eye, EyeOff, Zap, ArrowRight, Check, X, Trophy,
  Users, Flame, Target, Droplet, CheckCircle2,
  Home as HomeIcon, QrCode, BarChart2, Smartphone
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db as fDb } from '../lib/firebase';
import CinematicHero from '../components/CinematicHero';

const demoAccounts = [
  { role: 'gym_owner', label: 'Gym Owner / Admin', email: 'owner@alphagym.com', password: '1234567', desc: 'Full Gym Operations', icon: Crown }
];

const roleColors: Record<string, { border: string; text: string; iconBg: string; iconColor: string; glow: string }> = {
  super_admin: { border: 'border-violet-500/30', text: 'text-violet-600', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600', glow: 'shadow-md border-violet-500 bg-violet-50/10' },
  gym_owner: { border: 'border-amber-500/30', text: 'text-amber-600', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600', glow: 'shadow-md border-amber-500 bg-amber-50/10' },
  branch_manager: { border: 'border-blue-500/30', text: 'text-blue-600', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600', glow: 'shadow-md border-blue-500 bg-blue-50/10' },
  trainer: { border: 'border-emerald-500/30', text: 'text-emerald-600', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600', glow: 'shadow-md border-emerald-500 bg-emerald-50/10' },
  receptionist: { border: 'border-rose-500/30', text: 'text-rose-600', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-600', glow: 'shadow-md border-rose-500 bg-rose-50/10' }
};

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

interface RainbowButtonProps {
  text: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

const RainbowButton: React.FC<RainbowButtonProps> = ({ text, onClick, href, className = '' }) => {
  const content = (
    <span className="relative group inline-block overflow-hidden border border-black/25 px-8 py-3.5 bg-transparent text-black font-rowdies text-xs tracking-[0.2em] text-center cursor-pointer transition-colors duration-300 hover:text-black uppercase min-w-[170px] rounded-sm">
      <span className="relative z-10 font-bold">{text}</span>
      {/* Staggered rainbow slide overlays */}
      <span className="absolute top-0 left-0 w-0 h-[20%] bg-[#fbe044] transition-all duration-300 ease-out group-hover:w-full" />
      <span className="absolute top-[20%] left-0 w-0 h-[20%] bg-[#4495fb] transition-all duration-300 ease-out group-hover:w-full delay-[50ms]" />
      <span className="absolute top-[40%] left-0 w-0 h-[20%] bg-[#44fb57] transition-all duration-300 ease-out group-hover:w-full delay-[100ms]" />
      <span className="absolute top-[60%] left-0 w-0 h-[20%] bg-[#fb4495] transition-all duration-300 ease-out group-hover:w-full delay-[150ms]" />
      <span className="absolute top-[80%] left-0 w-0 h-[20%] bg-[#b044fb] transition-all duration-300 ease-out group-hover:w-full delay-[200ms]" />
    </span>
  );

  if (href) {
    return (
      <a href={href} className={`inline-block ${className}`}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={`inline-block border-none bg-transparent p-0 ${className}`}>
      {content}
    </button>
  );
};

export default function AlphaZoneLandingPage() {
  const { login, setUser, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState('');
  
  // Signup State
  const [signupPlan, setSignupPlan] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Mobile simulator state
  const [waterIntake, setWaterIntake] = useState(1.5);
  const [completedExs, setCompletedExs] = useState<Record<number, boolean>>({});
  const [simTab, setSimTab] = useState<'home' | 'workouts' | 'progress'>('home');

  useEffect(() => {
    setIsMounted(true);
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleRoleSelect = (acc: typeof demoAccounts[0]) => {
    // Only highlight the role card — do NOT auto-fill password
    setEmail(acc.email);
    setPassword('');
    setActiveRole(acc.role);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      // Only Firebase Auth — no mock fallback allowed
      const user = await login({ email, password });
      toast.success(`Welcome back, ${user.name || user.email}!`);
      router.push('/dashboard');
    } catch (error: any) {
      // Always show a clear invalid credentials message
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

  return (
    <div className="min-h-screen bg-[#fafafc] text-[#0f172a] flex flex-col font-poppins overflow-x-hidden selection:bg-[#d4ff00] selection:text-black">      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-45 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all text-slate-900 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-24 flex items-center justify-between">
          
          {/* Logo - Loaded from /gym_logo.png */}
          <a href="#" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
            <img src="/gym_logo.png" alt="Alpha Zone Logo" className="h-20 w-auto object-contain" />
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#" className="hover:text-black transition-colors">Home</a>
            <a href="#about" className="hover:text-black transition-colors">About</a>
            <a href="#programs" className="hover:text-black transition-colors">Programs</a>
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#app" className="hover:text-black transition-colors">App Sim</a>
            <a href="#download-app" className="hover:opacity-90 transition-all font-extrabold !text-black bg-[#d4ff00] px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-wider shadow-sm border border-[#d4ff00]/30 hover:bg-black hover:text-[#d4ff00]">Download APK</a>
            <a href="#signup" className="hover:text-black transition-colors">Sign Up</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowLoginModal(true)} 
              className="text-slate-600 hover:text-black font-bold text-sm tracking-wider uppercase transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Login
            </button>
            <a 
              href="#signup" 
              className="hidden sm:inline-block bg-[#d4ff00] text-black font-bold text-xs px-6 py-2.5 rounded-full hover:bg-black hover:text-[#d4ff00] hover:scale-105 transition-all cursor-pointer shadow-[0_0_15px_rgba(212,255,0,0.25)]"
            >
              SIGN UP
            </a>
          </div>
        </div>
      </header>

      {/* ─── Premium Cinematic Hero Section ─── */}
      <CinematicHero />

      {/* ─── About Section / Take A Step Toward Fitness ─── */}
      <section id="about" className="py-24 bg-white text-slate-900 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          
          {/* Image - Frame Entrance */}
          <motion.div 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex justify-center relative"
          >
            <div className="relative w-full max-w-[420px] rounded-3xl overflow-hidden border border-slate-100 shadow-xl bg-slate-50">
              <img 
                className="w-full h-auto object-contain hover:scale-105 transition-transform duration-700"
                src="https://assets.website-files.com/6214787aae0f89e8420f3841/62147f82e4fe2fc26b9812cb_Image%2013.png" 
                alt="Take a step" 
              />
            </div>
          </motion.div>

          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="flex flex-col items-start text-left space-y-6"
          >
            <h2 className="font-rowdies text-4xl md:text-5xl font-bold text-slate-900 uppercase leading-tight">
              Take A Step<br />Toward Fitness
            </h2>
            <div className="w-16 h-1 bg-[#d4ff00]" />
            <p className="text-slate-600 text-sm md:text-base leading-relaxed">
              Getting into shape doesn’t have to be intimidating. Start putting your best fitness foot forward with an online training program that makes you the all star. Get guided workouts for your level of fitness, that you can do anywhere, and at your own pace.
            </p>
            <RainbowButton text="JOIN NOW" href="#signup" className="pt-2" />
          </motion.div>

        </div>
      </section>
      {/* ─── Programs Section ─── */}
      <section id="programs" className="py-24 bg-slate-50 text-slate-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-12">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <h2 className="font-rowdies text-4xl md:text-5xl font-bold text-slate-900 uppercase">
              Programs for Every Goal
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-600 text-sm md:text-base leading-relaxed">
              Get a workout program that works for your body. Use one of our preset programs or customize your own set of workouts to get the results you want. We have exercises for every body type and every body goal.
            </p>
          </motion.div>

          {/* Grid of Programs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Muscle Gain', img: 'https://assets.website-files.com/6214787aae0f89e8420f3841/62147f82ed158809ac2663a4_Group%2042.png' },
              { title: 'Weight Loss', img: 'https://assets.website-files.com/6214787aae0f89e8420f3841/62147f82af41fb90c238dfd3_Group%2043.png' },
              { title: 'Strength Build', img: 'https://assets.website-files.com/6214787aae0f89e8420f3841/62147f82430894195e756a8e_Group%2044.png' },
              { title: 'Body Toning', img: 'https://assets.website-files.com/6214787aae0f89e8420f3841/62147f82fdb3518be588d4fa_Group%2045.png' }
            ].map((prog, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                whileHover={{ y: -8, borderColor: '#d4ff00', boxShadow: '0 15px 30px rgba(212,255,0,0.1)' }}
                className="bg-white border border-slate-100 rounded-2xl p-6 text-center space-y-4 transition-all duration-300 shadow-sm"
              >
                <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-2xl mx-auto flex items-center justify-center p-3">
                  <img src={prog.img} alt={prog.title} className="w-full h-full object-contain" />
                </div>
                <h3 className="font-rowdies font-bold text-lg text-slate-900 uppercase tracking-wide">
                  {prog.title}
                </h3>
              </motion.div>
            ))}
          </div>

          {/* Center Button */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="pt-4"
          >
            <RainbowButton text="MORE PROGRAMS" href="#signup" />
          </motion.div>

        </div>
      </section>

      {/* ─── Motivation Section / Break Out of Old Habits ─── */}
      <section className="py-24 bg-white text-slate-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-start text-left space-y-6 order-2 md:order-1"
          >
            <h2 className="font-rowdies text-4xl md:text-5xl font-bold text-slate-900 uppercase leading-tight">
              Break Out of<br />Old Habits
            </h2>
            <div className="w-16 h-1 bg-[#d4ff00]" />
            <p className="text-slate-600 text-sm md:text-base leading-relaxed">
              It’s never too late to start focusing on your health. It’s just a matter of getting started. With our no-obligation, contract-free memberships, it’s easy to get your healthy habits going without the pressure. Feel the best you ever have. It all starts here.
            </p>
            <RainbowButton text="JOIN NOW" href="#signup" className="pt-2" />
          </motion.div>

          {/* Image - Fixed Crop */}
          <motion.div 
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="flex justify-center relative order-1 md:order-2"
          >
            <div className="relative w-full max-w-[420px] rounded-3xl overflow-hidden border border-slate-100 shadow-xl bg-slate-50">
              <img 
                className="w-full h-auto object-contain hover:scale-105 transition-transform duration-700"
                src="https://assets.website-files.com/6214787aae0f89e8420f3841/62147f826237bf1df2431153_Image%2015.png" 
                alt="Break old habits" 
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-24 bg-slate-50 text-slate-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-16">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <h2 className="font-rowdies text-4xl md:text-5xl font-bold text-slate-900 uppercase">
              Core Membership Benefits
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-600 text-sm md:text-base leading-relaxed">
              Experience a premium workout culture built around flexibility, personalization, and 24/7 client portal accessibility.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Cancel Anytime', desc: 'No locked contracts. Upgrade, downgrade, or cancel your gym pass at any point with zero fees.', img: 'https://assets.website-files.com/6214787aae0f89e8420f3841/62147f6bd027c4e5b580ada3_Group%2046.svg' },
              { title: 'Customizable Programs', desc: 'Adjust workouts, sets, reps, and nutrition guides dynamically to hit your personal targets.', img: 'https://assets.website-files.com/6214787aae0f89e8420f3841/62147f6be5b62828f63018c2_Group%2047.svg' },
              { title: '24/7 Customer Support', desc: 'Direct chat lines to support agents and fitness coaches whenever you need assistance.', img: 'https://assets.website-files.com/6214787aae0f89e8420f3841/62147f6b31bc34d773241886_Group%2048.svg' },
              { title: 'Get On Any Device', desc: 'Access workouts, hydration rings, and check-in QR codes on phone, tablet, or desktop.', img: 'https://assets.website-files.com/6214787aae0f89e8420f3841/62147f6ba7395608254d708b_Group%2049.svg' }
            ].map((feat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="bg-white border border-slate-100 rounded-2xl p-6 text-left space-y-4 hover:border-[#d4ff00]/40 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center p-2 group-hover:bg-[#d4ff00]/20 transition-colors">
                  <img src={feat.img} alt={feat.title} className="w-full h-full object-contain" />
                </div>
                <h3 className="font-rowdies font-bold text-lg text-slate-900 uppercase">
                  {feat.title}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── Premium Mobile App Simulator Section ─── */}
      <section id="app" className="py-24 bg-white text-slate-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">ALPHA ZONE MEMBER APP</span>
            <h2 className="font-rowdies text-4xl md:text-5xl font-bold text-slate-900 uppercase leading-none">
              Your Gym In Your Pocket
            </h2>
            <div className="w-20 h-1 bg-[#d4ff00] mx-auto" />
            <p className="text-slate-600 text-sm">
              Interact with the live simulator below. Tap navigation tabs in the phone to preview dashboards.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
            
            {/* Left Features List */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="hidden lg:flex flex-col gap-8 text-right max-w-[240px]"
            >
              {[
                { title: 'Interactive Dashboard', desc: 'Live membership validation countdown, active streak, and coach tags.' },
                { title: 'Water Intake Ring', desc: 'Click the + icon in the Home view to log glasses of water in real-time.' },
                { title: 'Calorie Ring Tracker', desc: 'Animated ring displaying a visual breakdown of active calorie targets.' }
              ].map((f, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-sm font-bold text-slate-900 flex items-center justify-end gap-2">
                    {f.title}
                    <span className="w-2 h-2 rounded-full bg-[#d4ff00] border border-slate-100" />
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </motion.div>

            {/* Simulated Phone Device */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.15 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-[280px] h-[570px] rounded-[42px] border-[10px] border-slate-800 bg-slate-950 shadow-2xl relative overflow-hidden flex flex-col">
                {/* Speaker Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-b-xl z-30 flex items-center justify-center">
                  <div className="w-8 h-1 bg-white/20 rounded-full" />
                </div>

                {/* Live Screen Content */}
                <div className="flex-1 overflow-hidden bg-slate-950 flex flex-col pt-6 relative">
                  {isMounted ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {simTab === 'home' && (
                        <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-2 space-y-4">
                          {/* Member Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-[#d4ff00] text-black flex items-center justify-center font-rowdies text-[10px] font-bold">
                                AZ
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] font-bold text-white">Guest Member</div>
                                <div className="text-[7px] text-slate-400 font-black tracking-wider uppercase">GOLD ACCESS</div>
                              </div>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-white cursor-pointer hover:bg-slate-800">
                              <QrCode size={11} />
                            </div>
                          </div>

                          {/* Membership Progress */}
                          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-2.5 text-left shadow-sm">
                            <div className="flex justify-between items-center text-[8px] text-slate-400">
                              <span>Membership Validity</span>
                              <span className="font-bold text-black bg-[#d4ff00] px-1.5 py-0.5 rounded text-[7px]">97 Days Left</span>
                            </div>
                            <div className="h-1.5 bg-slate-850 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#d4ff00] to-teal-400 rounded-full" style={{ width: '74%' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                              <div className="flex items-center gap-1.5">
                                <Flame size={10} className="text-amber-500" />
                                <div>
                                  <div className="text-[9px] font-bold text-white">8 Days</div>
                                  <div className="text-[6px] text-slate-400 font-bold uppercase">Streak</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Target size={10} className="text-blue-500" />
                                <div>
                                  <div className="text-[9px] font-bold text-white">Assigned</div>
                                  <div className="text-[6px] text-slate-400 font-bold uppercase">Coach</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hydro & Calorie widgets */}
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Calorie Ring */}
                            <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 flex flex-col items-center text-center shadow-sm">
                              <div className="relative w-11 h-11 flex items-center justify-center">
                                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                                  <path className="text-slate-800" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path className="text-amber-500" strokeDasharray="68, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                                <span className="text-[8px] font-bold text-white">68%</span>
                              </div>
                              <div className="text-[8.5px] font-bold text-white mt-2">1,220 kcal</div>
                              <div className="text-[6px] text-slate-400">of 1,800</div>
                            </div>

                            {/* Water Intake */}
                            <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 flex flex-col items-center text-center relative shadow-sm">
                              <div className="relative w-11 h-11 flex items-center justify-center">
                                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                                  <path className="text-slate-800" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path className="text-blue-500" strokeDasharray={`${Math.round((waterIntake / 3.5) * 100)}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                                <Droplet size={10} className="text-blue-500" />
                              </div>
                              <div className="text-[8.5px] font-bold text-white mt-2">{waterIntake.toFixed(1)}L</div>
                              <div className="text-[6px] text-slate-400">of 3.5L</div>
                              
                              <button 
                                onClick={() => setWaterIntake(w => parseFloat(Math.min(3.5, w + 0.25).toFixed(2)))} 
                                className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform border-none"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Routine Banner */}
                          <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 text-left shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[7px] text-slate-300 font-bold uppercase tracking-wider">Today&apos;s Workout</span>
                              <Dumbbell size={9} className="text-white" />
                            </div>
                            <div className="text-[9px] font-bold text-white">Strength & Conditioning</div>
                            <div className="text-[7px] text-slate-400">Duration · 45 mins</div>
                          </div>
                        </div>
                      )}

                      {simTab === 'workouts' && (
                        <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-2 space-y-3 animate-fade-in">
                          <div className="text-left">
                            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">TODAY&apos;S ROUTINE</h3>
                            <p className="text-[6.5px] text-slate-400 mt-0.5">Click items to mark sets as completed</p>
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
                                    <div className={`text-[8.5px] font-bold truncate ${done ? 'text-slate-500 line-through' : 'text-white'}`}>{ex.name}</div>
                                    <div className="text-[6.5px] text-slate-400">{ex.muscle} · {ex.sets}</div>
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
                              <div className="text-[6.5px] text-slate-450">Keep going!</div>
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
                        <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-2 space-y-3 animate-fade-in">
                          <div className="text-left">
                            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">WEEKLY SUMMARY</h3>
                            <p className="text-[6.5px] text-slate-400 mt-0.5">Live analytics visualization</p>
                          </div>
                          <div className="p-3 bg-slate-900 border border-white/5 rounded-2xl text-left shadow-sm">
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
                                <div className="text-[5.5px] text-slate-400 mt-0.5">{s.l}</div>
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
                <div className="h-12 border-t border-white/5 bg-slate-900 flex items-center justify-around shrink-0 z-10">
                  <button 
                    onClick={() => setSimTab('home')} 
                    className={`flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-none p-0 transition-all ${simTab === 'home' ? 'text-white font-bold' : 'text-slate-500'}`}
                  >
                    <HomeIcon size={12} />
                    <span className="text-[5px] font-bold uppercase tracking-wider">Home</span>
                  </button>
                  <button 
                    onClick={() => setSimTab('workouts')} 
                    className={`flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-none p-0 transition-all ${simTab === 'workouts' ? 'text-white font-bold' : 'text-slate-500'}`}
                  >
                    <Dumbbell size={12} />
                    <span className="text-[5px] font-bold uppercase tracking-wider">Workouts</span>
                  </button>
                  <button 
                    onClick={() => setSimTab('progress')} 
                    className={`flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-none p-0 transition-all ${simTab === 'progress' ? 'text-white font-bold' : 'text-slate-500'}`}
                  >
                    <BarChart2 size={12} />
                    <span className="text-[5px] font-bold uppercase tracking-wider">Progress</span>
                  </button>
                  <button className="flex flex-col items-center gap-0.5 text-slate-500 bg-transparent border-none p-0">
                    <Trophy size={12} />
                    <span className="text-[5px] font-bold uppercase tracking-wider">Awards</span>
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 font-mono">↑ Switch tabs or tap hydration buttons to test</p>
            </motion.div>

            {/* Right Features List */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="hidden lg:flex flex-col gap-8 text-left max-w-[240px]"
            >
              {[
                { title: 'Interactive Workout Tasks', desc: 'Tap checkboxes inside Workouts tab to mark reps and update progress bars.' },
                { title: 'Weekly Progress Analytics', desc: 'Line charts mapping weekly progress metrics including durations & burn counts.' },
                { title: 'Award & QR Integrations', desc: 'Check awards tabs and check-in QR interfaces configured for turnstile APIs.' }
              ].map((f, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d4ff00] border border-white/10" />
                    {f.title}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ─── Signup Section ─── */}
      <section id="signup" className="py-24 border-t border-white/5 bg-black text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          
          {/* Image - Slide In */}
          <motion.div 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center relative"
          >
            <div className="relative w-full max-w-[440px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
              <img 
                className="w-full h-auto object-contain"
                src="https://assets.website-files.com/6214787aae0f89e8420f3841/62147f82c621803b42206469_Image%2016.png" 
                alt="Signup Motivation" 
              />
            </div>
          </motion.div>

          {/* Signup Form Container */}
          <motion.div 
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-slate-900/60 border border-white/10 p-8 rounded-3xl shadow-lg flex flex-col items-stretch text-left"
          >
            <h2 className="font-rowdies text-3xl font-bold text-white uppercase mb-2">
              Jumpstart Your Health
            </h2>
            <p className="text-slate-450 text-xs mb-6 font-poppins">
              Start your journey today with our membership options. Select your trial and customize.
            </p>

            <form onSubmit={handleSignupSubmit} className="space-y-4 font-poppins">
              {/* Option Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-sans">Select Option</label>
                <select 
                  value={signupPlan} 
                  onChange={e => setSignupPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4ff00] transition-colors"
                  required
                >
                  <option value="">Select Plan...</option>
                  <option value="monthly">Monthly Access - $45.95/mo</option>
                  <option value="quarterly">Quarterly Plan - $120.00</option>
                  <option value="annual">Annual VIP Pass - $399.00</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-sans">Email Address</label>
                <input 
                  type="email" 
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#d4ff00] transition-colors"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-sans">Choose a Username</label>
                <input 
                  type="text" 
                  value={signupUsername}
                  onChange={e => setSignupUsername(e.target.value)}
                  placeholder="Choose a Username"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#d4ff00] transition-colors"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-sans">Choose a Password</label>
                <input 
                  type="password" 
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  placeholder="Choose a Password"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#d4ff00] transition-colors"
                  required
                />
              </div>

              {/* Submit wrapper */}
              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-[#d4ff00] text-black font-rowdies font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest hover:bg-white hover:scale-[1.01] transition-all cursor-pointer border-none shadow-[0_0_15px_rgba(212,255,0,0.2)]"
                >
                  JOIN NOW
                </button>
              </div>

              {/* Toggle Login Link */}
              <div className="text-center text-xs text-slate-400 pt-2 font-poppins">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setShowLoginModal(true)} 
                  className="text-white hover:text-[#d4ff00] hover:underline font-bold bg-transparent border-none cursor-pointer p-0"
                >
                  Login
                </button>
              </div>

              {/* Form Legal */}
              <p className="text-[9px] text-slate-500 leading-relaxed pt-3 border-t border-white/5 font-poppins">
                Trial and monthly membership plans automatically renew monthly for $45.95 per month until{' '}
                <a href="#" className="text-slate-400 hover:text-white transition-colors">canceled</a>. Free cancellation anytime. By joining, you agree to the{' '}
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms & Conditions</a> and{' '}
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>.
              </p>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ─── Mobile App Download Banner ─── */}
      <section id="download-app" className="py-20 bg-[#d4ff00] text-black relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="bg-black text-white rounded-[32px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 shadow-2xl">
            
            {/* Left Content */}
            <div className="flex-1 text-left space-y-6">
              <span className="inline-flex items-center gap-2 bg-[#d4ff00]/10 text-[#d4ff00] text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest border border-[#d4ff00]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] animate-pulse" />
                Direct APK Installer (No Play Store Required)
              </span>
              <h2 className="font-rowdies text-3xl md:text-5xl font-bold uppercase tracking-tight leading-tight text-white">
                Alpha Zone <br className="hidden md:inline" /> Member Super App
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-lg">
                Gain direct access to workouts, daily diet plans, live attendance tracking, and real-time support from your coaches. Download the Android app installer directly on your mobile device.
              </p>
              
              {/* Instructions */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#d4ff00]">Installation Guide:</h4>
                <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 bg-black/20 p-4 rounded-xl border border-white/5 font-poppins">
                  <li>Click <span className="text-white font-semibold">Download Android App</span> on your mobile device.</li>
                  <li>Open the downloaded <code className="text-[#d4ff00] font-mono">AlphaZone.apk</code> file.</li>
                  <li>Enable <span className="text-white font-semibold">&ldquo;Install from Unknown Sources&rdquo;</span> if prompted by your browser or settings.</li>
                  <li>Tap <span className="text-white font-semibold">Install</span>, open the app, and login with your CRM account!</li>
                </ol>
              </div>
            </div>

            {/* Right Action & Phone Mockup Visual */}
            <div className="w-full md:w-auto flex flex-col items-center justify-center shrink-0 space-y-4">
              {/* Styled APK Icon / Button */}
              <div className="relative group p-1 bg-gradient-to-br from-[#d4ff00] to-teal-400 rounded-3xl transition-transform duration-300 hover:scale-105">
                <a 
                  href="/AlphaZone.apk" 
                  download="AlphaZone.apk"
                  className="flex flex-col items-center justify-center bg-slate-950 text-white px-8 py-10 rounded-[22px] min-w-[280px] text-center space-y-4 transition-colors"
                >
                  <div className="w-16 h-16 bg-[#d4ff00]/10 rounded-2xl flex items-center justify-center text-[#d4ff00] border border-[#d4ff00]/20">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <span className="block font-rowdies text-lg uppercase tracking-wider text-[#d4ff00]">Download Android App</span>
                    <span className="block text-[10px] text-slate-400 mt-1 font-mono">v1.0.0 (Direct APK) • 37.3 MB</span>
                  </div>
                </a>
              </div>
              
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
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
      <footer className="bg-slate-900 border-t border-slate-800 relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-16 text-slate-400">
          <div className="grid md:grid-cols-3 gap-8 items-start text-left">
            
            {/* Branding Column - Loaded from /gym_logo.png */}
            <div className="space-y-4">
              <a href="#" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
                <img src="/gym_logo.png" alt="Alpha Zone Logo" className="h-10 w-auto object-contain" />
              </a>
              <p className="text-xs text-slate-500 leading-relaxed font-poppins">
                Beyond Strength. Beyond Limits. Elevate operations and workouts using biometric turnstile triggers and artificial intelligence workout guides.
              </p>
            </div>

            {/* Contact Support Column */}
            <div className="space-y-3 font-poppins">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">For Support</h3>
              <div className="w-8 h-0.5 bg-[#d4ff00]" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Call Us: <span className="text-white font-semibold">800-000-0000</span><br />
                Email Us: <span className="text-white font-semibold">support@alphagymzone.com</span>
              </p>
            </div>

            {/* Address / Headquarters */}
            <div className="space-y-3 font-poppins">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Headquarters</h3>
              <div className="w-8 h-0.5 bg-[#d4ff00]" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Alpha Zone Gym HQ<br />
                100 Alpha Boulevard, Suite 500<br />
                Miami, FL 33101, United States
              </p>
            </div>

          </div>

          {/* Bottom Copyright bar */}
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-gray-500 font-poppins">
            <div>
              Copyright © 2026 Alpha Zone Gym. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <a href="/AlphaZone.apk" download="AlphaZone.apk" className="hover:opacity-90 text-black bg-[#d4ff00] px-3.5 py-1 rounded-full font-extrabold tracking-wide uppercase transition-all scale-105 shadow-[0_0_15px_rgba(212,255,0,0.15)]">Download App (APK)</a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">Support</a>
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
              animate={{ opacity: 0.5 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowLoginModal(false)} 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            />
            
            {/* Modal body container (Split Card) */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-[840px] bg-white text-slate-800 rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.4)] z-10 flex flex-col md:flex-row overflow-hidden font-poppins min-h-[520px]"
            >
              
              {/* Close Button (Absolute) */}
              <button 
                onClick={() => setShowLoginModal(false)} 
                className="absolute top-5 right-5 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-black transition-colors cursor-pointer border-none flex items-center justify-center"
              >
                <X size={16} />
              </button>

              {/* Left Side: 3D Illustration Panel (50% width) */}
              <div className="w-full md:w-1/2 p-5 bg-[#F4F6FB] flex items-center justify-center relative overflow-hidden">
                {/* Background decorative soft shapes */}
                <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative w-full h-full min-h-[250px] md:min-h-[460px] rounded-3xl overflow-hidden shadow-sm flex items-center justify-center">
                  <img 
                    src="/login_3d.png" 
                    alt="Alpha Gym 3D Render" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                  />
                  {/* Subtle glassmorphic overlay for branding */}
                  <div className="absolute bottom-5 left-5 right-5 bg-white/25 backdrop-blur-md border border-white/30 p-4 rounded-2xl text-left">
                    <span className="text-[10px] font-black tracking-widest text-[#d4ff00] uppercase block">BEYOND STRENGTH</span>
                    <h4 className="text-sm font-black text-white mt-0.5 leading-snug">ALPHA ZONE CRM OS</h4>
                    <p className="text-[9px] text-white/80 font-medium mt-1 leading-normal">Interactive client databases, real-time biometric turnstile monitoring, and automatic scheduling.</p>
                  </div>
                </div>
              </div>

              {/* Right Side: Clean Modern Form (50% width) */}
              <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between">
                
                {/* Header Branding */}
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2">
                    <img src="/gym_logo.png" alt="Alpha Zone Logo" className="h-10 w-auto object-contain" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 font-sans">Alpha OS</span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Welcome Back!</h2>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Enter Your Details Below</p>
                  </div>
                </div>

                {/* Quick Access Demo Profiles (Compact layout) */}
                <div className="space-y-2 my-5 text-left">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Quick Access Demo Profiles</span>
                  
                  {/* Grid selector for demo accounts */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-1.5">
                    {demoAccounts.map(acc => {
                      const isSelected = activeRole === acc.role;
                      return (
                        <button
                          key={acc.role}
                          type="button"
                          onClick={() => handleRoleSelect(acc)}
                          className={`px-3 py-2 rounded-xl text-left border cursor-pointer transition-all flex flex-col justify-center border-none ${
                            isSelected 
                              ? 'bg-slate-950 text-white shadow-sm ring-1 ring-slate-950 scale-[1.01]' 
                              : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`text-[9.5px] font-extrabold tracking-tight ${isSelected ? 'text-[#d4ff00]' : 'text-slate-800'}`}>
                            {acc.label.split(' / ')[0]}
                          </span>
                          <span className="text-[7.5px] text-slate-400 truncate block mt-0.5">{acc.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Credentials Form */}
                <form onSubmit={handleLogin} className="space-y-5 text-left font-poppins">
                  {/* Email Input */}
                  <div className="relative border-b border-slate-250 focus-within:border-slate-800 transition-colors py-1">
                    <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-wider font-sans">Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => { setEmail(e.target.value); setActiveRole(''); }} 
                      className="w-full bg-transparent outline-none border-none py-1.5 text-xs text-slate-800 placeholder-slate-350 focus:ring-0 font-medium" 
                      placeholder="hello.alex@gmail.com"
                      required 
                    />
                  </div>

                  {/* Password Input */}
                  <div className="relative border-b border-slate-250 focus-within:border-slate-800 transition-colors py-1">
                    <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-wider font-sans">Password</label>
                    <div className="flex items-center">
                      <input 
                        type={showPass ? 'text' : 'password'} 
                        value={password} 
                        onChange={e => { setPassword(e.target.value); setActiveRole(''); }} 
                        className="w-full bg-transparent outline-none border-none py-1.5 text-xs text-slate-800 placeholder-slate-350 focus:ring-0 font-medium" 
                        placeholder="••••••••••••"
                        required 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPass(!showPass)} 
                        className="pr-2 text-slate-400 hover:text-slate-900 bg-transparent border-none cursor-pointer"
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me / Forgot Row */}
                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer select-none font-bold">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-slate-950 focus:ring-slate-950 cursor-pointer"
                        defaultChecked
                      />
                      <span>Remember me</span>
                    </label>
                    <button 
                      type="button"
                      onClick={() => toast.success("Password recovery link sent to your registered email.")}
                      className="text-slate-500 hover:text-black font-bold bg-transparent border-none cursor-pointer p-0"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Login Button */}
                  <div className="pt-2">
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.01 }}
                      whileTap={{ scale: loading ? 1 : 0.99 }}
                      className="w-full bg-slate-950 hover:bg-black text-white py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer rounded-2xl border-none shadow-sm"
                    >
                      {loading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={12} className="fill-[#d4ff00] text-[#d4ff00]" />
                          <span>Log in</span>
                          <ArrowRight size={12} />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>

                {/* Bottom navigation links */}
                <div className="text-center text-[10px] text-slate-450 mt-5 pt-3 border-t border-slate-100 font-bold">
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    onClick={() => { setShowLoginModal(false); router.push('#signup'); }} 
                    className="text-slate-950 hover:text-[#d4ff00] hover:underline font-black bg-transparent border-none cursor-pointer p-0"
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
