'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Dumbbell, Award, User, Flame, Target, Droplet, QrCode, 
  RefreshCw, Send, CheckCircle2, AlertTriangle, Smartphone, ShieldAlert, 
  Key, LogOut, Search, Plus, Calendar, Activity, ChevronRight, UserPlus,
  Clock, Check, Sparkles, Pizza, Trash, MessageSquare, ShoppingBag, Apple,
  UserCheck, Phone, Mail, Gift, Share2
} from 'lucide-react';
import { useAuthStore, useGymStore, useTrainerStore, useProgressStore } from '@/store';
import { getInitials, formatDate, daysUntilExpiry } from '@/lib/utils';
import toast from 'react-hot-toast';
import { db, isFirebaseReady } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, collection, query, orderBy, limit, addDoc, where, getDocs } from 'firebase/firestore';
import API from '@/services/api';

export default function MemberAppPage() {
  const { user } = useAuthStore();
  const { 
    members, fetchMembers, addMember, updateMember, resetPassword, triggerCheckIn 
  } = useGymStore();
  const { 
    workoutPlan, dietPlan, fetchWorkout, fetchDiet,
    dailyLog, fetchDailyLog, saveDailyLog,
    cheatMeals, fetchCheatMeals, handleCheatMeal
  } = useTrainerStore();
  const { progressTimeline, fetchTimeline, addRecord } = useProgressStore();

  const [activeTab, setActiveTab] = useState<'home' | 'fitness' | 'attendance' | 'refer' | 'rewards' | 'profile'>('home');
  const [fitnessSubTab, setFitnessSubTab] = useState<'workouts' | 'diet' | 'coach'>('workouts');
  const [appReferrals, setAppReferrals] = useState<any[]>([]);
  const [appRewards, setAppRewards] = useState<any[]>([]);
  const [friendNameInput, setFriendNameInput] = useState('Karan Roy');
  const [friendPhoneInput, setFriendPhoneInput] = useState('9812345678');
  const [activeRefId, setActiveRefId] = useState<string | null>(null);
  const [completedExs, setCompletedExs] = useState<Record<string, boolean>>({});

  const [trainers, setTrainers] = useState<any[]>([]);
  const [appChatMessages, setAppChatMessages] = useState<any[]>([]);
  const [appChatInput, setAppChatInput] = useState('');

  // Dynamic user selection states
  const [selectedMemberId, setSelectedMemberId] = useState<string>('m1');
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Daily Date Selector
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);

  // AI notifications trigger state
  const [activeNotification, setActiveNotification] = useState<{ title: string; text: string; icon: string } | null>(null);

  // Cheat meal submission state
  const [cheatMealName, setCheatMealName] = useState('');
  const [cheatMealReason, setCheatMealReason] = useState('Birthday');
  const [requestingCheat, setRequestingCheat] = useState(false);

  // Grocery item checklists local state
  const [checkedGroceries, setCheckedGroceries] = useState<Record<string, boolean>>({});

  // Coach Q&A chatbot state
  const [coachMessages, setCoachMessages] = useState<any[]>([
    { sender: 'coach', text: 'Hey there! I am your AI Nutrition Coach. Ask me anything about food replacements, macros, or recovery meals!' }
  ]);
  const [coachInput, setCoachInput] = useState('');

  // Form states for creating new Firebase Auth ID / Password
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('1234567');
  const [createPlan, setCreatePlan] = useState('Monthly');
  const [createGender, setCreateGender] = useState('Male');
  const [isCreating, setIsCreating] = useState(false);
  const [createReferralCode, setCreateReferralCode] = useState('');

  // Maintenance configuration states
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('We are performing a scheduled update. We will be back online shortly.');
  const [estimatedEnd, setEstimatedEnd] = useState('2 hours');
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const [sliderPos, setSliderPos] = useState(50);
  const [selectedTimelineDay, setSelectedTimelineDay] = useState<1 | 30 | 60 | 90 | 180>(90);

  // Find simulated member object
  const currentMember = members.find(m => m.id === selectedMemberId) || members[0] || {
    id: 'm1',
    memberId: 'AZ-2026-0001',
    name: 'Arjun Mehta',
    plan: 'Gold Membership',
    expiryDate: new Date(Date.now() + 97 * 24 * 60 * 60 * 1000).toISOString(),
    streak: 8,
    fitnessScore: 82,
    rewardPoints: 1200,
    trainer: 'Karan Verma',
    status: 'active',
    phone: '9876543210',
    email: 'arjun@alphagym.com'
  };

  const matchingTrainer = trainers.find((t: any) => t.name === currentMember.trainer) || trainers.find((t: any) => t.name.toLowerCase().includes('rohit')) || trainers[0] || {
    id: 't6',
    name: currentMember.trainer || 'Rohit Sharma',
    specialization: 'Weight Loss Specialist',
    experience: 8,
    rating: 4.9,
    certifications: ['ACE', 'CSCS', 'CPR'],
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150',
    bio: 'Certified weight loss coach with 8 years of experience. Expert in body composition changes.',
    achievements: 'Best Weight Loss Coach award 2025',
    phone: '9988776650',
    email: 'rohit@alphagym.com',
    instagram: 'rohit_sharma_coach'
  };

  // Subscribe to maintenance status in Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'maintenance'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsMaintenance(!!data.isUnderMaintenance);
        setMaintenanceMsg(data.message || '');
        setEstimatedEnd(data.estimatedEnd || '');
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to referrals and rewards
  useEffect(() => {
    if (isFirebaseReady && db) {
      const qRef = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'));
      const unsubRef = onSnapshot(qRef, (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAppReferrals(list);
      });

      const qRew = query(collection(db, 'referral_rewards'), orderBy('issuedAt', 'desc'));
      const unsubRew = onSnapshot(qRew, (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAppRewards(list);
      });

      return () => {
        unsubRef();
        unsubRew();
      };
    }
  }, []);

  // Listen for push notifications
  useEffect(() => {
    if (!isFirebaseReady || !db || !currentMember?.id) return;
    const q = query(
      collection(db, 'member_notifications'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.memberId === currentMember.id) {
            const diffSeconds = (Date.now() - new Date(data.timestamp).getTime()) / 1000;
            if (diffSeconds < 10) {
              triggerNotification(data.title, data.text, data.icon || '🔔');
            }
          }
        }
      });
    });
    return () => unsub();
  }, [currentMember?.id]);

  const handleSaveMaintenance = async (mode: boolean, msg: string, time: string) => {
    setSavingMaintenance(true);
    try {
      await setDoc(doc(db, 'system', 'maintenance'), {
        isUnderMaintenance: mode,
        message: msg,
        estimatedEnd: time,
        lastUpdated: new Date().toISOString(),
        updatedBy: user?.name || 'Owner'
      });
      toast.success(mode ? 'App Maintenance mode is now ACTIVE!' : 'App Maintenance mode has been disabled!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update maintenance settings');
    } finally {
      setSavingMaintenance(false);
    }
  };

  // Real-time Chat listener
  useEffect(() => {
    if (!isFirebaseReady || !db || !currentMember?.id || !matchingTrainer?.id) return;
    
    const q = query(collection(db, 'chatMessages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = all.filter((c: any) => 
        (c.from === currentMember.id && c.to === matchingTrainer.id) || 
        (c.from === matchingTrainer.id && c.to === currentMember.id)
      );
      setAppChatMessages(filtered);
    });
    return () => unsubscribe();
  }, [currentMember?.id, matchingTrainer?.id]);

  useEffect(() => {
    fetchMembers();
    API.get('/trainers')
      .then(res => setTrainers(res.data))
      .catch(err => console.error('Failed to load trainers in member app:', err));
  }, [fetchMembers]);

  // Set default selected member on first load once members fetch
  useEffect(() => {
    if (members.length > 0 && selectedMemberId === 'm1' && !members.some(m => m.id === 'm1')) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  // Fetch sub-data when selected member changes
  useEffect(() => {
    if (currentMember && currentMember.id) {
      fetchWorkout(currentMember.id);
      fetchDiet(currentMember.id);
      fetchTimeline(currentMember.id);
      fetchDailyLog(currentMember.id, currentDate);
      fetchCheatMeals();
    }
  }, [selectedMemberId, currentMember?.id, currentDate, fetchWorkout, fetchDiet, fetchTimeline, fetchDailyLog, fetchCheatMeals]);

  const handleSimulateInvite = async () => {
    if (!isFirebaseReady || !db || !currentMember) return;
    if (friendPhoneInput === currentMember.phone || friendNameInput.toLowerCase() === currentMember.name.toLowerCase()) {
      toast.error('Anti-Fraud System: Self-referrals are blocked.');
      return;
    }
    const isDupPhone = appReferrals.some(r => r.friendPhone === friendPhoneInput && r.referrerId === currentMember.id);
    if (isDupPhone) {
      toast.error('Anti-Fraud System: Referral with this mobile number already exists.');
      return;
    }
    try {
      const devHash = 'device-' + window.navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      const refDoc = await addDoc(collection(db, 'referrals'), {
        referrerId: currentMember.id,
        referrerName: currentMember.name,
        referrerPhone: currentMember.phone || '9988776655',
        referrerDeviceHash: devHash,
        friendName: friendNameInput,
        friendPhone: friendPhoneInput,
        friendDeviceHash: devHash,
        referralCode: `${currentMember.name.toUpperCase()}2026`,
        status: 'Pending',
        currentStep: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setActiveRefId(refDoc.id);
      toast.success('Simulation: Invite Sent!');
    } catch (err) {
      toast.error('Simulation failed');
    }
  };

  const handleSimulateInstall = async () => {
    if (!isFirebaseReady || !db || !activeRefId) {
      toast.error('Start by simulating an invite first.');
      return;
    }
    try {
      await setDoc(doc(db, 'referrals', activeRefId), {
        status: 'Installed App',
        currentStep: 1,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Simulation: App Installed!');
    } catch (err) {
      toast.error('Simulation failed');
    }
  };

  const handleSimulateRegister = async () => {
    if (!isFirebaseReady || !db || !activeRefId) {
      toast.error('Start by simulating an invite first.');
      return;
    }
    try {
      await setDoc(doc(db, 'referrals', activeRefId), {
        status: 'Registered',
        currentStep: 3,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Simulation: Account Registered & Code Entered!');
    } catch (err) {
      toast.error('Simulation failed');
    }
  };

  const handleSimulatePurchase = async () => {
    if (!isFirebaseReady || !db || !activeRefId) {
      toast.error('Start by simulating an invite first.');
      return;
    }
    try {
      await setDoc(doc(db, 'referrals', activeRefId), {
        status: 'Membership Purchased',
        currentStep: 4,
        joinPlan: 'Gold Membership',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Simulation: Membership Purchased! Awaiting owner approval.');
    } catch (err) {
      toast.error('Simulation failed');
    }
  };

  // Real WhatsApp share — premium formatted message
  const handleWhatsAppShare = (friendPhone?: string) => {
    const code = currentMember.name.toUpperCase() + '2026';
    const memberName = currentMember.name.split(' ')[0]; // First name only
    const inviteLink = `${window.location.origin}/invite/${code}`;

    const message = [
      `🏆 *ALPHA ZONE GYM — EXCLUSIVE INVITE* 🏆`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `💪 *${memberName} ne tumhe personally invite kiya hai!*`,
      ``,
      `Yaar, main Alpha Zone Gym join kar chuka hoon aur yeh experience ekdum next level hai! Tu bhi aa ja — ek baar try kar, phir chhodega nahi 🔥`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Tujhe milega:*`,
      `🤖 AI-Powered Workout Plans`,
      `🥗 Personal Diet Tracker`,
      `🏅 Alpha Score™ Leaderboard`,
      `👆 Biometric Fingerprint Entry`,
      `💬 Direct Trainer Chat`,
      `🎁 Referral Rewards System`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🎟️ *MERA PERSONAL INVITE CODE:*`,
      ``,
      `     ⭐ *${code}* ⭐`,
      ``,
      `👇 *Register karo aur code apply karo:*`,
      `${inviteLink}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📍 Alpha Zone Gym, Mohali, Punjab`,
      `📞 Helpline: +91-98765-43210`,
      `⏰ Open 5AM – 11PM Daily`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `_Yeh code sirf tere liye hai. Pehle aao pehle paao! 😎_`,
    ].join('\n');

    const encoded = encodeURIComponent(message);
    const phone = friendPhone ? friendPhone.replace(/\D/g, '') : '';
    const waUrl = phone
      ? `https://wa.me/91${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
    toast.success('WhatsApp open ho raha hai... 🚀');
  };

  const handleSMSShare = () => {
    const code = currentMember.name.toUpperCase() + '2026';
    const inviteLink = `${window.location.origin}/invite/${code}`;
    const message = `Alpha Zone Gym - Exclusive Invite!\n\nMera code use karo: ${code}\nRegister: ${inviteLink}\n\nAI workouts, diet tracker, biometric entry - sab kuch ek jagah! 💪`;
    window.open(`sms:?body=${encodeURIComponent(message)}`, '_self');
  };

  // Real-time risk detection and notification trigger for member app simulation
  useEffect(() => {
    if (!currentMember?.id) return;

    // Avoid triggering notifications again for the same member in the same session
    const notificationKey = `member_risk_notified_${currentMember.id}`;
    if (sessionStorage.getItem(notificationKey)) return;

    const daysLeft = daysUntilExpiry(currentMember.expiryDate);
    const count = currentMember.attendanceCount || 0;
    const streak = currentMember.streak || 0;

    let score = 20; // Base risk score
    if (daysLeft < 0) score += 35;
    else if (daysLeft <= 7) score += 40;
    else if (daysLeft <= 15) score += 20;

    if (count <= 2) score += 35;
    else if (count <= 5) score += 15;

    if (streak === 0) score += 15;

    const finalScore = Math.max(5, Math.min(95, score));

    if (finalScore >= 61) {
      sessionStorage.setItem(notificationKey, 'true');
      setTimeout(() => {
        triggerNotification(
          'We miss you! 🥺',
          `You have not visited the gym for 7 days. Book your next workout today.`,
          '🔥'
        );
      }, 1500);
    }
  }, [selectedMemberId, currentMember?.id]);

  // Handle member registration synced to Firebase Auth
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createPhone) {
      toast.error('Name and Phone are required fields');
      return;
    }
    setIsCreating(true);

    const daysMap: Record<string, number> = {
      'Monthly': 30, 'Quarterly': 90, 'Semi-Annual': 180, 'Annual Premium': 365
    };
    const expiry = new Date(Date.now() + (daysMap[createPlan] || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      await addMember({
        name: createName,
        phone: createPhone,
        email: createEmail || `${createPhone}@alphagym.com`,
        password: createPassword,
        plan: createPlan,
        gender: createGender,
        joinDate: new Date().toISOString().split('T')[0],
        expiryDate: expiry,
        branch: 'Mohali, Punjab',
        status: 'active'
      });

      // Fetch the newly created member from store
      await fetchMembers();
      const freshMembers = useGymStore.getState().members;
      const newMember = freshMembers.find((m: any) => m.phone === createPhone);

      // Link referral code if provided
      if (createReferralCode && db && isFirebaseReady && newMember) {
        const refQuery = query(collection(db, 'referrals'), where('friendPhone', '==', createPhone));
        const refSnap = await getDocs(refQuery);
        
        if (!refSnap.empty) {
          const refDoc = refSnap.docs[0];
          await setDoc(doc(db, 'referrals', refDoc.id), {
            friendId: newMember.id,
            status: 'Membership Purchased',
            currentStep: 4,
            joinPlan: createPlan,
            referralCode: createReferralCode,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          const referrerMember = freshMembers.find((m: any) => m.name.toUpperCase() + '2026' === createReferralCode.toUpperCase() || (m.memberId && m.memberId.toUpperCase() === createReferralCode.toUpperCase()));
          await addDoc(collection(db, 'referrals'), {
            referrerId: referrerMember ? referrerMember.id : 'm1',
            referrerName: referrerMember ? referrerMember.name : 'Pratik',
            referrerPhone: referrerMember ? referrerMember.phone || '' : '',
            friendId: newMember.id,
            friendName: createName,
            friendPhone: createPhone,
            referralCode: createReferralCode,
            status: 'Membership Purchased',
            currentStep: 4,
            joinPlan: createPlan,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      toast.success('Member credentials created & referral linked successfully!');
      setCreateName('');
      setCreatePhone('');
      setCreateEmail('');
      setCreateReferralCode('');
      setCreatePassword('1234567');
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register credentials');
    } finally {
      setIsCreating(false);
    }
  };

  const handleQRCheckIn = async () => {
    try {
      await triggerCheckIn({
        memberId: currentMember.id,
        method: 'qr'
      });
      toast.success(`Biometric Check-In Successful for ${currentMember.name}!`);
    } catch (err) {
      toast.error('Check-in simulation failed');
    }
  };

  const handleToggleMeal = async (mealKey: string, completed: boolean) => {
    if (!currentMember?.id || !dietPlan) return;
    const mealsCompleted = dailyLog?.mealsCompleted || {};
    const mealNotes = dailyLog?.mealNotes || {};
    const mealPhotos = dailyLog?.mealPhotos || {};
    const waterConsumed = dailyLog?.waterConsumed || 0;

    const nextMeals = { ...mealsCompleted, [mealKey]: completed };
    const totalMeals = Array.isArray(dietPlan.meals) ? dietPlan.meals.length : 4;
    const nextCompletedCount = Object.values(nextMeals).filter(Boolean).length;
    const waterGoalMl = (dietPlan.waterGoal || 3) * 1000;
    
    const nextCompletionScore = totalMeals > 0 ? Math.round((nextCompletedCount / totalMeals) * 60) : 0;
    const nextWaterScore = waterGoalMl > 0 ? Math.round(Math.min(40, (waterConsumed / waterGoalMl) * 40)) : 0;
    const nextDietScore = nextCompletionScore + nextWaterScore;
    const compliance = totalMeals > 0 ? Math.round((nextCompletedCount / totalMeals) * 100) : 0;

    try {
      await saveDailyLog({
        memberId: currentMember.id,
        date: currentDate,
        mealsCompleted: nextMeals,
        mealNotes,
        mealPhotos,
        waterConsumed,
        compliancePercent: compliance,
        dietScore: nextDietScore
      });
      toast.success(completed ? 'Meal marked as completed! 🥗' : 'Meal marked as incomplete.');
    } catch (err) {
      toast.error('Failed to update meal log');
    }
  };

  const handleSaveMealNotes = async (mealKey: string, notes: string) => {
    if (!currentMember?.id || !dietPlan) return;
    const mealsCompleted = dailyLog?.mealsCompleted || {};
    const mealNotes = dailyLog?.mealNotes || {};
    const mealPhotos = dailyLog?.mealPhotos || {};
    const waterConsumed = dailyLog?.waterConsumed || 0;

    const nextNotes = { ...mealNotes, [mealKey]: notes };
    const totalMeals = Array.isArray(dietPlan.meals) ? dietPlan.meals.length : 4;
    const completedCount = Object.values(mealsCompleted).filter(Boolean).length;
    const waterGoalMl = (dietPlan.waterGoal || 3) * 1000;

    const compScore = totalMeals > 0 ? Math.round((completedCount / totalMeals) * 60) : 0;
    const waterScore = waterGoalMl > 0 ? Math.round(Math.min(40, (waterConsumed / waterGoalMl) * 40)) : 0;
    const nextDietScore = compScore + waterScore;
    const compliance = totalMeals > 0 ? Math.round((completedCount / totalMeals) * 100) : 0;

    try {
      await saveDailyLog({
        memberId: currentMember.id,
        date: currentDate,
        mealsCompleted,
        mealNotes: nextNotes,
        mealPhotos,
        waterConsumed,
        compliancePercent: compliance,
        dietScore: nextDietScore
      });
      toast.success('Meal note saved!');
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  const handleSimulatePhotoUpload = async (mealKey: string) => {
    if (!currentMember?.id || !dietPlan) return;
    const mealsCompleted = dailyLog?.mealsCompleted || {};
    const mealNotes = dailyLog?.mealNotes || {};
    const mealPhotos = dailyLog?.mealPhotos || {};
    const waterConsumed = dailyLog?.waterConsumed || 0;

    // Use a pre-seeded mockup image from public or dynamic placeholder
    const nextPhotos = { ...mealPhotos, [mealKey]: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120' };
    const totalMeals = Array.isArray(dietPlan.meals) ? dietPlan.meals.length : 4;
    const completedCount = Object.values(mealsCompleted).filter(Boolean).length;
    const waterGoalMl = (dietPlan.waterGoal || 3) * 1000;

    const compScore = totalMeals > 0 ? Math.round((completedCount / totalMeals) * 60) : 0;
    const waterScore = waterGoalMl > 0 ? Math.round(Math.min(40, (waterConsumed / waterGoalMl) * 40)) : 0;
    const nextDietScore = compScore + waterScore;
    const compliance = totalMeals > 0 ? Math.round((completedCount / totalMeals) * 100) : 0;

    try {
      await saveDailyLog({
        memberId: currentMember.id,
        date: currentDate,
        mealsCompleted,
        mealNotes,
        mealPhotos: nextPhotos,
        waterConsumed,
        compliancePercent: compliance,
        dietScore: nextDietScore
      });
      toast.success('Meal photo uploaded successfully! 📸');
    } catch (err) {
      toast.error('Failed to upload photo');
    }
  };

  const handleLogWaterAmount = async (amount: number) => {
    if (!currentMember?.id || !dietPlan) return;
    const mealsCompleted = dailyLog?.mealsCompleted || {};
    const mealNotes = dailyLog?.mealNotes || {};
    const mealPhotos = dailyLog?.mealPhotos || {};
    const waterConsumed = dailyLog?.waterConsumed || 0;

    const nextWater = waterConsumed + amount;
    const totalMeals = Array.isArray(dietPlan.meals) ? dietPlan.meals.length : 4;
    const completedCount = Object.values(mealsCompleted).filter(Boolean).length;
    const waterGoalMl = (dietPlan.waterGoal || 3) * 1000;

    const compScore = totalMeals > 0 ? Math.round((completedCount / totalMeals) * 60) : 0;
    const waterScore = waterGoalMl > 0 ? Math.round(Math.min(40, (nextWater / waterGoalMl) * 40)) : 0;
    const nextDietScore = compScore + waterScore;
    const compliance = totalMeals > 0 ? Math.round((completedCount / totalMeals) * 100) : 0;

    try {
      await saveDailyLog({
        memberId: currentMember.id,
        date: currentDate,
        mealsCompleted,
        mealNotes,
        mealPhotos,
        waterConsumed: nextWater,
        compliancePercent: compliance,
        dietScore: nextDietScore
      });
      toast.success(`Logged +${amount}ml water! 💧`);
    } catch (err) {
      toast.error('Failed to log water');
    }
  };

  const triggerNotification = (title: string, text: string, icon: string) => {
    setActiveNotification({ title, text, icon });
    setTimeout(() => {
      setActiveNotification(null);
    }, 4500);
  };

  const handleRequestCheatMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember?.id || !cheatMealName) return;
    setRequestingCheat(true);
    try {
      await API.post('/trainers/cheat-meals', {
        memberId: currentMember.id,
        memberName: currentMember.name,
        mealName: cheatMealName,
        reason: cheatMealReason
      });
      toast.success('Cheat meal request submitted for coach review! 🍕');
      setCheatMealName('');
      fetchCheatMeals();
    } catch (err) {
      toast.error('Failed to request cheat meal');
    } finally {
      setRequestingCheat(false);
    }
  };

  const askCoach = (question: string) => {
    if (!question.trim()) return;
    const userMsg = { sender: 'member', text: question };
    setCoachMessages(prev => [...prev, userMsg]);
    setCoachInput('');

    let reply = "I'm analyzing your request. Try asking about paneer replacements, bananas, high protein foods, healthy snacks, or post-workout meals!";
    const q = question.toLowerCase();
    if (q.includes('paneer')) {
      reply = "Replace 100g Paneer with 100g Firm Tofu (2.5g carbs, 8g fat, 17g protein), 150g Low Fat Greek Yogurt (fewer calories, more protein), or 120g of Tempeh.";
    } else if (q.includes('banana')) {
      reply = "Yes! Bananas are excellent fast-acting carbs to fuel your workout (30-45m before) or restore glycogen post-workout. Watch portions (1 medium banana is ~105 kcal, 27g carbs).";
    } else if (q.includes('protein') || q.includes('high protein')) {
      reply = "Top high protein foods: Chicken breast (31g/100g), Salmon (20g/100g), Egg whites (6g/egg), Tofu (15g/100g), Soya chunks (52g/100g), and Whey isolate.";
    } else if (q.includes('snack') || q.includes('healthy snack')) {
      reply = "Great healthy snacks: Roasted chickpeas (handful), Greek yogurt with chia seeds, apple slices with 1 tbsp peanut butter, or cucumber sticks with hummus.";
    } else if (q.includes('workout') || q.includes('post workout') || q.includes('after workout')) {
      reply = "Within 45 mins post-workout, consume a fast-digesting protein shake (1 scoop whey) combined with simple carbs (like a banana or 2 rice cakes) for recovery.";
    }

    setTimeout(() => {
      setCoachMessages(prev => [...prev, { sender: 'coach', text: reply }]);
    }, 700);
  };

  // Gamification Badges List
  const badgesList = [
    { name: 'First Visit', desc: 'Checked in for the first time', active: true, color: 'text-[#D4FF00]' },
    { name: '7 Day Streak', desc: 'Consistent for 7 days', active: true, color: 'text-orange-500' },
    { name: 'Muscle Builder', desc: 'Logged muscle parameters', active: true, color: 'text-emerald-500' },
    { name: 'Weight Loss Hero', desc: 'Dropped 3kg weight', active: false, color: 'text-slate-500' }
  ];

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    m.memberId?.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 py-6 min-h-screen max-w-6xl mx-auto px-4 w-full">
      {/* Page Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/40 pb-6">
        <div>
          <h1 className="text-xl font-black text-brand-text-primary tracking-wider uppercase font-display">Member App Portal</h1>
          <p className="text-xs text-brand-text-secondary mt-1">Configure client app access settings and simulate live client experience</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full">
        {/* Left Column: Admin Control Panel */}
        <div className="w-full lg:w-[380px] space-y-6">
          
          {/* Create Credentials Card */}
          <div className="p-6 rounded-[28px] bg-brand-bg-card border border-brand-border shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border/40">
              <UserPlus className="text-blue-500" size={18} />
              <h2 className="text-xs font-black text-brand-text-primary uppercase tracking-wider font-display">Create Member Credentials</h2>
            </div>
            
            <form onSubmit={handleCreateMember} className="space-y-3">
              <div>
                <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={createPhone}
                    onChange={e => setCreatePhone(e.target.value)}
                    className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Password</label>
                  <input
                    type="text"
                    value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="rahul@alphagym.com"
                  value={createEmail}
                  onChange={e => setCreateEmail(e.target.value)}
                  className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Gender</label>
                  <select
                    value={createGender}
                    onChange={e => setCreateGender(e.target.value)}
                    className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Plan Duration</label>
                  <select
                    value={createPlan}
                    onChange={e => setCreatePlan(e.target.value)}
                    className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                  >
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Semi-Annual</option>
                    <option>Annual Premium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Referral Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PRATIK2026"
                  value={createReferralCode}
                  onChange={e => setCreateReferralCode(e.target.value)}
                  className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isCreating ? 'Creating Auth User...' : 'Register Firebase Account'}
              </button>
            </form>
          </div>

          {/* Quick Swapper Card */}
          <div className="p-6 rounded-[28px] bg-brand-bg-card border border-brand-border shadow-md space-y-4">
            <div>
              <h2 className="text-xs font-black text-brand-text-primary uppercase tracking-wider font-display">Select Simulated Member</h2>
              <p className="text-[10px] text-brand-text-secondary mt-0.5">Switch simulated client state instantly</p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-brand-text-muted" size={14} />
              <input
                type="text"
                placeholder="Search member..."
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
                className="w-full text-xs bg-brand-bg-card/50 border border-brand-border rounded-xl pl-9 pr-4 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
              />
            </div>

            <div className="max-h-[160px] overflow-y-auto divide-y divide-brand-border/20 pr-1">
              {filteredMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`w-full py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors ${
                    selectedMemberId === m.id ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'text-brand-text-primary'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div>{m.name}</div>
                    <div className="text-[9px] text-brand-text-muted font-mono">{m.memberId || m.id}</div>
                  </div>
                  <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                    {m.plan?.split(' ')[0]}
                  </span>
                </button>
              ))}
              {filteredMembers.length === 0 && (
                <div className="text-center py-4 text-xs text-brand-text-muted italic">No members found</div>
              )}
            </div>
          </div>

          {/* App Maintenance Settings */}
          <div className="p-6 rounded-[28px] bg-brand-bg-card border border-brand-border shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-brand-border/40">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-blue-500" />
                <h2 className="text-xs font-black text-brand-text-primary uppercase tracking-wider font-display">Maintenance Mode</h2>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider font-mono ${
                isMaintenance 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500' 
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
              }`}>
                {isMaintenance ? 'ON' : 'OFF'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-bg-card border border-brand-border">
              <div>
                <h4 className="text-[10px] font-bold text-brand-text-primary uppercase">Block Access</h4>
                <p className="text-[8px] text-brand-text-muted">Redirect app users to maintenance page</p>
              </div>
              <button
                onClick={() => handleSaveMaintenance(!isMaintenance, maintenanceMsg, estimatedEnd)}
                disabled={savingMaintenance}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 relative cursor-pointer flex items-center ${
                  isMaintenance ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-white transition-all duration-300 ${
                  isMaintenance ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Message</label>
                <textarea
                  value={maintenanceMsg}
                  onChange={(e) => setMaintenanceMsg(e.target.value)}
                  rows={2}
                  className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary placeholder-brand-text-muted focus:outline-none focus:border-brand-cyan resize-none"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1">Estimated End Time</label>
                <input
                  type="text"
                  value={estimatedEnd}
                  onChange={(e) => setEstimatedEnd(e.target.value)}
                  className="w-full text-xs bg-brand-bg-card border border-brand-border rounded-xl px-3 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                />
              </div>
            </div>
            
            <button
              onClick={() => handleSaveMaintenance(isMaintenance, maintenanceMsg, estimatedEnd)}
              disabled={savingMaintenance}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Send size={12} />
              <span>Publish Maintenance Status</span>
            </button>
          </div>

          {/* Smart Notifications Simulator Desk */}
          <div className="p-6 rounded-[28px] bg-brand-bg-card border border-brand-border shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-brand-border/40">
              <Smartphone size={18} className="text-brand-purple" />
              <h2 className="text-xs font-black text-brand-text-primary uppercase tracking-wider font-display">Notification Center</h2>
            </div>
            <p className="text-[10px] text-brand-text-secondary leading-normal text-left">
              Simulate push notifications instantly sent to the member's mobile app screen.
            </p>
            <div className="space-y-2 text-left">
              <button
                onClick={() => triggerNotification('🥣 Breakfast Time', 'Your breakfast is ready. Tap to view.', '🥣')}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-brand-border/60 text-slate-700 text-[10px] font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                🥣 Breakfast Reminder
              </button>
              <button
                onClick={() => triggerNotification('💧 Water Reminder', "You are behind today's water target. Drink 500ml now.", '💧')}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-brand-border/60 text-slate-700 text-[10px] font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                💧 Water Goal Alert
              </button>
              <button
                onClick={() => triggerNotification('🍗 Protein Reminder', "Today's protein target is not completed.", '🍗')}
                className="w-full py-2 bg-[#d4ff00]/10 hover:bg-[#d4ff00]/20 border border-[#d4ff00]/30 text-slate-800 text-[10px] font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                🍗 Protein Alert
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: High-Fidelity Phone Simulator */}
        <div className="flex-1 flex flex-col items-center">
          <div className="max-w-md w-full bg-brand-bg-card border border-brand-border p-3 rounded-2xl text-center space-y-1 mb-4">
            <h4 className="font-bold text-[10px] text-blue-600 uppercase tracking-wider font-display">Client App Simulator</h4>
            <p className="text-[9px] text-brand-text-secondary">Simulates the Flutter client iOS/Android experience in real-time. Use the left panel or click Member ID inside Me tab to switch users.</p>
          </div>

          {/* Smartphone Container with Notch */}
          <div className="phone-frame animate-slide-up flex flex-col justify-between" style={{ backgroundColor: '#0A0A0F', borderColor: '#1E1E2E' }}>
            <div className="phone-notch" style={{ backgroundColor: '#1E1E2E' }} />

            {/* Smart Notification Alert overlay inside phone */}
            <AnimatePresence>
              {activeNotification && (
                <motion.div
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 15, opacity: 1 }}
                  exit={{ y: -60, opacity: 0 }}
                  onClick={() => {
                    setActiveTab('fitness');
                    setFitnessSubTab('diet');
                    setActiveNotification(null);
                  }}
                  className="absolute top-10 left-4 right-4 z-50 p-3 bg-slate-900/90 border border-white/10 rounded-2xl shadow-xl flex items-start gap-2.5 backdrop-blur-md text-left cursor-pointer hover:border-[#d4ff00]/40 transition-colors"
                >
                  <div className="text-base shrink-0">{activeNotification.icon}</div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h5 className="text-[10px] font-black text-white uppercase tracking-wider">{activeNotification.title}</h5>
                    <p className="text-[9px] text-slate-300 leading-normal">{activeNotification.text}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Viewport */}
            <div className="flex-1 overflow-y-auto px-5 pt-8 pb-5 space-y-5 text-white scrollbar-thin">
              {isMaintenance ? (
                /* Maintenance screen inside phone */
                <div className="flex flex-col items-center justify-center text-center space-y-5 py-12 min-h-[400px]">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
                    <AlertTriangle size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-widest font-display text-white">System Maintenance</h3>
                    <p className="text-[10px] text-slate-400 px-4 leading-relaxed font-sans">{maintenanceMsg}</p>
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-white/5 rounded-2xl w-full max-w-[240px] mx-auto">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Estimated Back Online</span>
                    <span className="text-xs font-black text-amber-400 font-mono mt-0.5 block">{estimatedEnd}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* TAB 1: HOME */}
                  {activeTab === 'home' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      {/* Top profile header */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#D4FF00] flex items-center justify-center font-black text-xs text-black">
                            {getInitials(currentMember.name)}
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block font-medium">Good Morning ☀️</span>
                            <h3 className="text-xs font-black text-white font-display">Hey, {currentMember.name?.split(' ')[0]} 👋</h3>
                          </div>
                        </div>
                        <button
                          onClick={handleQRCheckIn}
                          className="p-2.5 rounded-xl bg-[#D4FF00]/10 border border-[#D4FF00]/25 text-[#D4FF00] cursor-pointer hover:bg-[#D4FF00]/20 transition-all"
                        >
                          <QrCode size={14} />
                        </button>
                      </div>

                      {/* Membership status card */}
                      <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span className="font-bold tracking-wider uppercase text-[9px] text-[#D4FF00]">{currentMember.plan || 'Gold Membership'}</span>
                          <span className="font-bold font-mono">
                            {daysUntilExpiry(currentMember.expiryDate) > 0 
                              ? `${daysUntilExpiry(currentMember.expiryDate)} Days Left` 
                              : 'Expired'}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#D4FF00] to-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(5, Math.min(100, (daysUntilExpiry(currentMember.expiryDate) / 120) * 100))}%` }} 
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                          <span>Expires: {formatDate(currentMember.expiryDate)}</span>
                          <span>ID: {currentMember.memberId || 'AZ-2026-0001'}</span>
                        </div>
                      </div>

                      {/* Stats Mini Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-2xl bg-[#1E1E2E] border border-white/5 flex flex-col items-center text-center">
                          <Flame className="text-amber-500 mb-1" size={16} />
                          <span className="text-xs font-black text-white">{currentMember.streak || 0}</span>
                          <span className="text-[8px] text-slate-500 uppercase font-semibold">Streak</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#1E1E2E] border border-white/5 flex flex-col items-center text-center">
                          <Activity className="text-emerald-500 mb-1" size={16} />
                          <span className="text-xs font-black text-white">{currentMember.fitnessScore || 75}</span>
                          <span className="text-[8px] text-slate-500 uppercase font-semibold">Score</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#1E1E2E] border border-white/5 flex flex-col items-center text-center">
                          <Award className="text-[#D4FF00] mb-1" size={16} />
                          <span className="text-xs font-black text-white">{currentMember.rewardPoints || 350}</span>
                          <span className="text-[8px] text-slate-500 uppercase font-semibold">Points</span>
                        </div>
                      </div>

                      {/* Water Tracker */}
                      <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                            <Droplet size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Hydration Tracker</span>
                            <span className="text-xs font-extrabold text-white">
                              {Math.round((dailyLog?.waterConsumed || 0) / 250)} / {Math.round(((dietPlan?.waterGoal || 3) * 1000) / 250)} Glasses
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleLogWaterAmount(250)}
                          className="w-8 h-8 rounded-xl bg-[#D4FF00] text-black font-black text-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
                        >
                          +
                        </button>
                      </div>

                      {/* Live Gym Crowd */}
                      <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                          <span>Live Gym Crowd Level</span>
                          <span className="text-[#D4FF00]">Moderate (48%)</span>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#D4FF00] rounded-full" style={{ width: '48%' }} />
                        </div>
                      </div>

                      {/* Today's Workout preview card */}
                      <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider">Active Workout Routine</span>
                          <span className="text-[9px] text-slate-500 font-mono">Assigned coach: {currentMember.trainer || 'Karan Verma'}</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">{workoutPlan?.name || 'Strength & Hypertrophy'}</h4>
                          <p className="text-[9px] text-slate-400 mt-0.5">{workoutPlan?.type || 'Push Day'} Plan · 4 Exercises</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('fitness')}
                          className="w-full py-2 rounded-xl bg-[#D4FF00] text-black text-[10px] font-black uppercase tracking-wider text-center cursor-pointer hover:brightness-105"
                        >
                          View Workout Program
                        </button>
                      </div>

                      {/* Trainer message card */}
                      <div className="p-4 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex gap-3.5 items-start">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                          <Send size={14} />
                        </div>
                        <div>
                          <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">{currentMember.trainer || 'Karan Verma'} (Coach)</h5>
                          <p className="text-[9px] text-slate-400 leading-relaxed mt-0.5">"Great work this week! Focus on quality contractions and hit your water targets! 💪"</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: FITNESS WORKOUT, DIET CENTER, AI COACH */}
                  {activeTab === 'fitness' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      
                      {/* Segmented Subtabs Control */}
                      <div className="flex bg-[#12121A] border border-white/5 rounded-xl p-1">
                        {[
                          { id: 'workouts', label: 'Workouts' },
                          { id: 'diet', label: 'Diet Center' },
                          { id: 'coach', label: 'AI Coach' }
                        ].map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setFitnessSubTab(sub.id as any)}
                            className={`flex-grow py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none outline-none ${
                              fitnessSubTab === sub.id 
                                ? 'bg-[#D4FF00] text-black shadow-md shadow-[#D4FF00]/10' 
                                : 'text-slate-400 hover:text-white bg-transparent'
                            }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>

                      {/* SUBTAB 1: WORKOUTS */}
                      {fitnessSubTab === 'workouts' && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="border-b border-white/5 pb-2">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider font-display pt-2">Assigned Workouts</h3>
                            <p className="text-[9px] text-slate-400 mt-0.5">{workoutPlan?.name || 'Strength Training Program'}</p>
                          </div>

                          <div className="space-y-2">
                            {workoutPlan?.exercises ? (
                              workoutPlan.exercises.map((ex: any, idx: number) => {
                                const isCompleted = !!completedExs[idx];
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => setCompletedExs({ ...completedExs, [idx]: !isCompleted })}
                                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                      isCompleted 
                                        ? 'bg-emerald-500/5 border-emerald-500/30 text-slate-400' 
                                        : 'bg-[#12121A] border-white/5 text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                        isCompleted 
                                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                                          : 'border-white/20 text-transparent'
                                      }`}>
                                        ✓
                                      </div>
                                      <div>
                                        <div className={`text-xs font-bold ${isCompleted ? 'line-through text-slate-500' : ''}`}>{ex.name}</div>
                                        <div className="text-[9px] text-slate-400 mt-0.5">{ex.sets} sets · {ex.reps} reps · {ex.weight || 'Bodyweight'}</div>
                                      </div>
                                    </div>
                                    <span className="text-[9px] text-slate-500">Rest: {ex.rest || '60s'}</span>
                                  </div>
                                );
                              })
                            ) : (
                              ['Squats', 'Bench Press', 'Barbell Rows', 'Military Press'].map((exName, idx) => {
                                const isCompleted = !!completedExs[idx];
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => setCompletedExs({ ...completedExs, [idx]: !isCompleted })}
                                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                      isCompleted 
                                        ? 'bg-emerald-500/5 border-emerald-500/30 text-slate-400' 
                                        : 'bg-[#12121A] border-white/5 text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                        isCompleted 
                                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                                          : 'border-white/20'
                                      }`}>
                                        ✓
                                      </div>
                                      <div>
                                        <div className={`text-xs font-bold ${isCompleted ? 'line-through text-slate-500' : ''}`}>{exName}</div>
                                        <div className="text-[9px] text-slate-400 mt-0.5">4 sets · 10-12 reps</div>
                                      </div>
                                    </div>
                                    <span className="text-[9px] text-slate-500">Rest: 60s</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUBTAB 2: DIET CENTER */}
                      {fitnessSubTab === 'diet' && (
                        <div className="space-y-4 animate-fade-in">
                          
                          {/* Checked Diet Plan approval state */}
                          {dietPlan && dietPlan.status === 'approved' ? (
                            <>
                              {/* DIET SCORE & PROGRESS RINGS */}
                              {(() => {
                                const mealsCompleted = dailyLog?.mealsCompleted || {};
                                const waterConsumed = dailyLog?.waterConsumed || 0;
                                const totalMeals = Array.isArray(dietPlan.meals) ? dietPlan.meals.length : 4;
                                const completedCount = Object.values(mealsCompleted).filter(Boolean).length;
                                const waterGoalMl = (dietPlan.waterGoal || 3) * 1000;
                                
                                const compScore = totalMeals > 0 ? Math.round((completedCount / totalMeals) * 60) : 0;
                                const waterScore = waterGoalMl > 0 ? Math.round(Math.min(40, (waterConsumed / waterGoalMl) * 40)) : 0;
                                const dietScore = compScore + waterScore;

                                const renderRing = (value: number, color: string, size: number = 44) => {
                                  const strokeWidth = 4;
                                  const radius = (size - strokeWidth) / 2;
                                  const circumference = radius * 2 * Math.PI;
                                  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
                                  return (
                                    <svg width={size} height={size} className="rotate-[-90deg] flex-shrink-0">
                                      <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
                                      <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-500" />
                                    </svg>
                                  );
                                };

                                return (
                                  <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 grid grid-cols-12 gap-3 items-center">
                                    <div className="col-span-4 flex flex-col items-center border-r border-white/5 pr-2">
                                      <div className="relative flex items-center justify-center">
                                        {renderRing(dietScore, '#D4FF00', 52)}
                                        <span className="absolute text-xs font-black text-white font-mono">{dietScore}</span>
                                      </div>
                                      <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 block">Diet Score</span>
                                    </div>
                                    <div className="col-span-8 grid grid-cols-2 gap-2 text-left pl-1">
                                      <div>
                                        <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Calories Target</span>
                                        <span className="text-xs font-extrabold text-white font-mono">{dietPlan.calories} <span className="text-[8px] text-slate-400 font-normal">kcal</span></span>
                                      </div>
                                      <div>
                                        <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Protein Split</span>
                                        <span className="text-xs font-extrabold text-brand-purple font-mono">{dietPlan.protein}g</span>
                                      </div>
                                      <div>
                                        <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Carbs split</span>
                                        <span className="text-xs font-extrabold text-white font-mono">{dietPlan.carbs}g</span>
                                      </div>
                                      <div>
                                        <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Fats split</span>
                                        <span className="text-xs font-extrabold text-slate-400 font-mono">{dietPlan.fats}g</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* TIMELINE MEALS CHECKLIST */}
                              <div className="space-y-3">
                                <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider block font-display">Timeline Diet Plan</span>
                                
                                <div className="space-y-3">
                                  {Array.isArray(dietPlan.meals) ? (
                                    dietPlan.meals.map((meal: any, idx: number) => {
                                      const mealsCompleted = dailyLog?.mealsCompleted || {};
                                      const mealNotes = dailyLog?.mealNotes || {};
                                      const mealPhotos = dailyLog?.mealPhotos || {};
                                      const isCompleted = !!mealsCompleted[meal.name];
                                      
                                      return (
                                        <div 
                                          key={idx}
                                          className={`p-4 rounded-3xl border text-left space-y-3.5 transition-all ${
                                            isCompleted 
                                              ? 'bg-emerald-950/10 border-emerald-500/30' 
                                              : 'bg-[#12121A] border-white/5'
                                          }`}
                                        >
                                          {/* Time and Title Header */}
                                          <div className="flex justify-between items-start gap-2">
                                            <div>
                                              <div className="flex items-center gap-1.5 text-[8.5px] font-bold font-mono text-slate-400">
                                                <Clock size={11} className="text-brand-cyan" />
                                                {meal.time}
                                              </div>
                                              <h4 className="text-xs font-extrabold text-white mt-0.5">{meal.name}</h4>
                                            </div>
                                            
                                            {/* Completed Action button */}
                                            <button
                                              onClick={() => handleToggleMeal(meal.name, !isCompleted)}
                                              className={`px-3 py-1 rounded-xl text-[9px] font-bold uppercase transition-all cursor-pointer border-none outline-none ${
                                                isCompleted 
                                                  ? 'bg-emerald-600 text-white' 
                                                  : 'bg-[#1E1E2E] text-slate-400 hover:text-white hover:bg-slate-800'
                                              }`}
                                            >
                                              {isCompleted ? '✓ Completed' : 'Mark Done'}
                                            </button>
                                          </div>

                                          {/* Food Items & Macros details */}
                                          <div className="space-y-2">
                                            <p className="text-[10px] text-slate-300 leading-relaxed font-sans">{meal.foods}</p>
                                            
                                            <div className="flex flex-wrap justify-between items-center gap-2 border-t border-white/5 pt-2 text-[8.5px] font-mono text-slate-500">
                                              <span>🔥 {meal.calories} kcal</span>
                                              <span>·</span>
                                              <span>🥩 P: {meal.protein}g</span>
                                              <span>·</span>
                                              <span>🍞 C: {meal.carbs}g</span>
                                              <span>·</span>
                                              <span>🥑 F: {meal.fats}g</span>
                                            </div>
                                          </div>

                                          {/* Interactive Notes & Simulated Camera Photo Upload */}
                                          <div className="grid grid-cols-2 gap-2 pt-1">
                                            {mealPhotos[meal.name] ? (
                                              <div className="h-10 rounded-lg overflow-hidden border border-white/10 relative">
                                                <img src={mealPhotos[meal.name]} alt="meal upload" className="w-full h-full object-cover" />
                                                <button
                                                  onClick={() => handleSimulatePhotoUpload(meal.name)}
                                                  className="absolute inset-0 bg-black/60 flex items-center justify-center text-[7.5px] font-bold text-white uppercase opacity-0 hover:opacity-100 transition-opacity border-none cursor-pointer"
                                                >
                                                  Retake 📸
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() => handleSimulatePhotoUpload(meal.name)}
                                                className="h-10 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center gap-1.5 text-[8.5px] font-bold text-slate-400 hover:text-white uppercase transition-all bg-transparent cursor-pointer"
                                              >
                                                <span>📸 Snap Photo</span>
                                              </button>
                                            )}

                                            <input
                                              type="text"
                                              placeholder="Meal notes (e.g. half plate)"
                                              defaultValue={mealNotes[meal.name] || ''}
                                              onBlur={e => handleSaveMealNotes(meal.name, e.target.value)}
                                              className="h-10 text-[9px] bg-slate-900 border border-white/5 focus:border-[#D4FF00]/50 rounded-xl px-2.5 text-white placeholder-slate-600 focus:outline-none"
                                            />
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-center py-6 text-xs text-slate-500 italic">No meals scheduled</div>
                                  )}
                                </div>
                              </div>

                              {/* HYDRATION WATER TRACKER */}
                              <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3.5 text-left">
                                <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider block font-display">Water Hydration Tracker</span>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                                      <Droplet size={18} className="fill-current" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 block font-semibold">Consumed Today</span>
                                      <span className="text-xs font-black text-white font-mono">
                                        {dailyLog?.waterConsumed || 0} / {(dietPlan.waterGoal || 3) * 1000} ml
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleLogWaterAmount(250)}
                                      className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold text-[9px] uppercase cursor-pointer transition-all border-none outline-none"
                                    >
                                      + 250ml
                                    </button>
                                    <button
                                      onClick={() => handleLogWaterAmount(500)}
                                      className="px-2.5 py-1.5 rounded-lg bg-[#D4FF00] text-black font-black text-[9px] uppercase cursor-pointer hover:brightness-110 transition-all border-none outline-none"
                                    >
                                      + 500ml
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* GROCERY CHECKLIST DRAWER */}
                              {dietPlan.weeklyGroceryList && dietPlan.weeklyGroceryList.length > 0 && (
                                <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3 text-left">
                                  <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider block font-display flex items-center gap-1.5">
                                    <ShoppingBag size={12} />
                                    Weekly Grocery Checklist
                                  </span>
                                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                    {dietPlan.weeklyGroceryList.map((item: any, idx: number) => {
                                      const isChecked = !!checkedGroceries[item.name];
                                      return (
                                        <div 
                                          key={idx}
                                          onClick={() => setCheckedGroceries({ ...checkedGroceries, [item.name]: !isChecked })}
                                          className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                            isChecked 
                                              ? 'bg-slate-900 border-white/5 text-slate-500 line-through' 
                                              : 'bg-slate-950 border-white/5 text-white'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 text-[10px]">
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] ${
                                              isChecked ? 'bg-[#D4FF00] border-[#D4FF00] text-black font-bold' : 'border-white/20'
                                            }`}>
                                              {isChecked && '✓'}
                                            </div>
                                            <span className="font-semibold">{item.name}</span>
                                          </div>
                                          <span className="text-[8.5px] font-mono font-bold text-[#D4FF00] bg-[#D4FF00]/10 px-1.5 py-0.5 rounded-full">{item.quantity}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* CHEAT MEAL SYSTEM */}
                              <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3.5 text-left">
                                <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider block font-display flex items-center gap-1.5">
                                  <Pizza size={12} />
                                  Cheat Meal Request
                                </span>

                                <form onSubmit={handleRequestCheatMeal} className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      placeholder="Cheat Meal Name (e.g. Burger)"
                                      value={cheatMealName}
                                      onChange={e => setCheatMealName(e.target.value)}
                                      className="text-[9px] bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-white outline-none focus:border-brand-purple"
                                      required
                                    />
                                    <select
                                      value={cheatMealReason}
                                      onChange={e => setCheatMealReason(e.target.value)}
                                      className="text-[9px] bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-slate-400 outline-none cursor-pointer"
                                    >
                                      <option>Birthday</option>
                                      <option>Wedding</option>
                                      <option>Festival</option>
                                      <option>Vacation</option>
                                    </select>
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={requestingCheat}
                                    className="w-full py-1.5 bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-[8.5px] uppercase tracking-wider rounded-lg transition-all border-none outline-none cursor-pointer"
                                  >
                                    {requestingCheat ? 'Submitting...' : 'Submit Request to Coach'}
                                  </button>
                                </form>

                                {/* Cheat Requests Status log */}
                                {(() => {
                                  const memberRequests = cheatMeals.filter(cm => cm.memberId === currentMember.id);
                                  if (memberRequests.length === 0) return null;
                                  return (
                                    <div className="pt-2.5 border-t border-white/5 space-y-2">
                                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Recent Cheat Requests</span>
                                      <div className="space-y-1.5">
                                        {memberRequests.map(cm => (
                                          <div key={cm.id} className="p-2 rounded-xl bg-slate-950 text-[9px] space-y-0.5 border border-white/5">
                                            <div className="flex justify-between items-center">
                                              <span className="font-extrabold text-white">{cm.mealName}</span>
                                              <span className={`px-1.5 py-0.2 rounded-full text-[7.5px] font-bold uppercase ${
                                                cm.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                cm.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400'
                                              }`}>
                                                {cm.status}
                                              </span>
                                            </div>
                                            <p className="text-[8px] text-slate-500">Reason: {cm.reason} · Requested: {new Date(cm.createdAt).toLocaleDateString()}</p>
                                            {cm.trainerNotes && (
                                              <p className="text-[8px] text-[#D4FF00] bg-[#D4FF00]/5 p-1 rounded mt-1 font-sans">
                                                Coach note: "{cm.trainerNotes}"
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </>
                          ) : (
                            <div className="p-8 text-center space-y-3.5 border border-dashed border-white/10 rounded-3xl">
                              <Apple size={30} className="mx-auto text-slate-600 animate-pulse stroke-1" />
                              <div className="space-y-1">
                                <h4 className="text-[11px] font-bold text-white">Diet Plan Pending Review</h4>
                                <p className="text-[9px] text-slate-500 leading-relaxed px-2">
                                  Your coach is finalizing your macro splits and timeline meal list. It will sync automatically as soon as it is approved.
                                </p>
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* SUBTAB 3: AI COACH CHAT */}
                      {fitnessSubTab === 'coach' && (
                        <div className="space-y-4 animate-fade-in flex flex-col h-[400px]">
                          <div className="border-b border-white/5 pb-2">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider font-display pt-2">AI Nutrition Coach</h3>
                            <p className="text-[8.5px] text-slate-400 mt-0.5">Ask questions about diet replacements and high protein options</p>
                          </div>

                          {/* Message bubbles Timeline */}
                          <div className="flex-grow overflow-y-auto space-y-2.5 p-2 bg-[#12121A] border border-white/5 rounded-2xl pr-1 text-[9.5px]">
                            {coachMessages.map((msg, index) => {
                              const isCoach = msg.sender === 'coach';
                              return (
                                <div key={index} className={`flex ${isCoach ? 'justify-start' : 'justify-end'}`}>
                                  <div className={`p-2.5 max-w-[85%] rounded-2xl leading-relaxed ${
                                    isCoach 
                                      ? 'bg-slate-900 border border-white/5 text-slate-200 rounded-tl-none' 
                                      : 'bg-[#D4FF00] text-black font-semibold rounded-tr-none'
                                  }`}>
                                    {msg.text}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Pre-selected coaching prompts */}
                          <div className="flex flex-wrap gap-1">
                            {[
                              'Can I replace paneer?',
                              'Can I eat banana?',
                              'Suggest healthy snack',
                              'What to eat post workout?'
                            ].map((prompt, idx) => (
                              <button
                                key={idx}
                                onClick={() => askCoach(prompt)}
                                className="px-2 py-1 rounded-lg bg-[#1E1E2E] border border-white/5 hover:border-white/20 text-slate-400 hover:text-white text-[8px] font-bold uppercase transition-all cursor-pointer outline-none"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>

                          {/* Chat input box */}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Ask coach (e.g. high protein items)..."
                              value={coachInput}
                              onChange={e => setCoachInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && askCoach(coachInput)}
                              className="w-full text-[10px] bg-slate-900 border border-white/5 focus:border-[#D4FF00]/50 rounded-xl px-3 py-2 text-white outline-none"
                            />
                            <button
                              onClick={() => askCoach(coachInput)}
                              className="px-3.5 bg-[#D4FF00] text-black font-black rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all border-none outline-none"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* TAB 3: QR ACCESS CHECK-IN */}
                  {activeTab === 'attendance' && (
                    <div className="space-y-5 animate-fade-in text-center flex flex-col items-center">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider font-display pt-2">Biometric Scan Access</h3>
                      <p className="text-[10px] text-slate-400 max-w-[260px] leading-relaxed">Present this secure dynamic QR code at the gym biometric scanner to unlock the turnstile gate entry.</p>

                      {/* Styled QR container */}
                      <div className="p-5 rounded-3xl bg-white border-4 border-[#D4FF00] shadow-[0_0_30px_rgba(212,255,0,0.15)] my-2">
                        <QrCode size={150} className="text-slate-900" />
                      </div>

                      <button
                        onClick={handleQRCheckIn}
                        className="w-full max-w-[240px] py-2.5 rounded-xl bg-[#D4FF00] text-black text-xs font-black uppercase tracking-wider transition-all hover:scale-105"
                      >
                        Simulate Scan (Check-In)
                      </button>

                      {/* Checkin weekly timeline */}
                      <div className="w-full text-left pt-5 border-t border-white/5">
                        <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider block mb-3 font-display">Check-In Activity</span>
                        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px]">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                            const isPresent = idx % 2 === 0;
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="text-slate-500 font-bold">{day}</div>
                                <div className={`w-6 h-6 rounded-lg mx-auto flex items-center justify-center font-bold text-[9px] ${
                                  isPresent 
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                                }`}>
                                  {isPresent ? '✓' : '✗'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: ALPHA SCORE & TRANSFORMATION TIMELINE */}
                  {activeTab === 'rewards' && (() => {
                    const attendanceScore = Math.min(100, Math.round((currentMember.streak || 8) * 8 + 36));
                    const dietScore = dailyLog?.dietScore || 81;
                    const workoutScore = currentMember.streak > 5 ? 89 : 76;
                    const consistencyScore = Math.min(100, Math.round((currentMember.streak || 8) * 6 + 50));
                    const alphaScoreVal = Math.round((attendanceScore + dietScore + workoutScore + consistencyScore) / 4);

                    let alphaLevel = 'Beginner';
                    let levelColor = 'text-slate-400';
                    let levelBg = 'bg-slate-400/10 border-slate-400/20';
                    if (alphaScoreVal > 80) {
                      alphaLevel = 'Alpha Elite';
                      levelColor = 'text-[#D4FF00]';
                      levelBg = 'bg-[#D4FF00]/10 border-[#D4FF00]/20';
                    } else if (alphaScoreVal > 60) {
                      alphaLevel = 'Advanced';
                      levelColor = 'text-orange-500';
                      levelBg = 'bg-orange-500/10 border-orange-500/20';
                    } else if (alphaScoreVal > 30) {
                      alphaLevel = 'Improving';
                      levelColor = 'text-blue-400';
                      levelBg = 'bg-blue-400/10 border-blue-400/20';
                    }

                    const timelineData = {
                      1: { weight: '84.5 kg', bmi: '27.6', fat: '24.5%', chest: '42.0"', waist: '36.0"', biceps: '13.5"' },
                      30: { weight: '80.3 kg', bmi: '26.2', fat: '21.8%', chest: '42.2"', waist: '34.2"', biceps: '13.8"' },
                      60: { weight: '77.1 kg', bmi: '25.2', fat: '19.4%', chest: '42.5"', waist: '32.8"', biceps: '14.1"' },
                      90: { weight: '74.8 kg', bmi: '24.4', fat: '17.2%', chest: '43.0"', waist: '31.5"', biceps: '14.5"' },
                      180: { weight: '73.2 kg', bmi: '23.9', fat: '15.1%', chest: '43.5"', waist: '30.8"', biceps: '14.9"' }
                    };
                    const activeTimeline = timelineData[selectedTimelineDay] || timelineData[90];

                    return (
                      <div className="space-y-4 animate-fade-in text-left">
                        {/* Title Bar */}
                        <div className="border-b border-white/5 pb-2">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider font-display pt-2">Alpha Score™ & Timeline</h3>
                          <p className="text-[9px] text-slate-400 mt-0.5">Real-time fitness score and transformation analytics</p>
                        </div>

                        {/* Alpha Score Ring Card */}
                        <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Alpha Score™</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${levelBg} ${levelColor}`}>
                              {alphaLevel}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                              {/* Radial progress ring */}
                              <svg width="80" height="80" className="rotate-[-90deg]">
                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="#D4FF00" strokeWidth="6" strokeDasharray={226.2} strokeDashoffset={226.2 - (alphaScoreVal / 100) * 226.2} strokeLinecap="round" className="transition-all duration-1000" />
                              </svg>
                              <span className="absolute text-lg font-black text-white font-mono">{alphaScoreVal}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 flex-grow">
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Attendance</span>
                                <span className="text-xs font-black text-white font-mono">{attendanceScore}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Diet Score</span>
                                <span className="text-xs font-black text-white font-mono">{dietScore}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Workout Program</span>
                                <span className="text-xs font-black text-white font-mono">{workoutScore}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Consistency</span>
                                <span className="text-xs font-black text-white font-mono">{consistencyScore}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* AI insights */}
                        <div className="p-3 bg-[#D4FF00]/5 border border-[#D4FF00]/25 rounded-2xl space-y-1.5">
                          <span className="text-[8px] font-black text-[#D4FF00] uppercase tracking-widest block">AI Progress Insights</span>
                          <p className="text-[9px] text-slate-350 leading-relaxed font-sans">
                            "You lost <span className="text-white font-bold">4.2 kg</span> in 30 days. Attendance increased by <span className="text-white font-bold">32%</span>. Your Alpha Score™ improved from <span className="text-[#D4FF00] font-black">58 to {alphaScoreVal}</span> (Elite performer status)."
                          </p>
                        </div>

                        {/* Transformation Timeline parameters */}
                        <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3">
                          <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider block font-display">Transformation Stats</span>
                          
                          {/* Selector */}
                          <div className="grid grid-cols-5 bg-slate-900 border border-white/5 rounded-xl p-0.5 text-center text-[9px] font-bold">
                            {([1, 30, 60, 90, 180] as const).map(day => (
                              <button
                                key={day}
                                onClick={() => setSelectedTimelineDay(day)}
                                className={`py-1 rounded-lg transition-all cursor-pointer border-none outline-none ${
                                  selectedTimelineDay === day 
                                    ? 'bg-[#D4FF00] text-black font-black' 
                                    : 'text-slate-400 hover:text-white bg-transparent'
                                }`}
                              >
                                D{day}
                              </button>
                            ))}
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 text-left font-mono">
                            <div className="bg-slate-950 p-2 border border-white/5 rounded-xl">
                              <span className="text-[7.5px] font-bold text-slate-500 block">Weight</span>
                              <span className="text-[11px] font-extrabold text-white">{activeTimeline.weight}</span>
                            </div>
                            <div className="bg-slate-950 p-2 border border-white/5 rounded-xl">
                              <span className="text-[7.5px] font-bold text-slate-500 block">BMI</span>
                              <span className="text-[11px] font-extrabold text-white">{activeTimeline.bmi}</span>
                            </div>
                            <div className="bg-slate-950 p-2 border border-white/5 rounded-xl">
                              <span className="text-[7.5px] font-bold text-slate-500 block">Body Fat</span>
                              <span className="text-[11px] font-extrabold text-[#D4FF00]">{activeTimeline.fat}</span>
                            </div>
                            <div className="bg-slate-950 p-2 border border-white/5 rounded-xl">
                              <span className="text-[7.5px] font-bold text-slate-500 block">Chest</span>
                              <span className="text-[11px] font-extrabold text-white">{activeTimeline.chest}</span>
                            </div>
                            <div className="bg-slate-950 p-2 border border-white/5 rounded-xl">
                              <span className="text-[7.5px] font-bold text-slate-500 block">Waist</span>
                              <span className="text-[11px] font-extrabold text-white">{activeTimeline.waist}</span>
                            </div>
                            <div className="bg-slate-950 p-2 border border-white/5 rounded-xl">
                              <span className="text-[7.5px] font-bold text-slate-500 block">Biceps</span>
                              <span className="text-[11px] font-extrabold text-white">{activeTimeline.biceps}</span>
                            </div>
                          </div>
                        </div>

                        {/* BEFORE/AFTER SLIDER VIEW */}
                        <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3">
                          <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider block font-display">Before / After Comparison</span>
                          
                          {/* Custom visual reveal slider */}
                          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 relative select-none">
                            {/* Background: Day 90 (After) */}
                            <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=340" className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="After" />
                            
                            {/* Foreground clipped: Day 1 (Before) */}
                            <div className="absolute top-0 left-0 h-full overflow-hidden z-10 border-r border-[#D4FF00]" style={{ width: `${sliderPos}%` }}>
                              <img src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=340" className="absolute top-0 left-0 h-full object-cover pointer-events-none" style={{ width: '340px', maxWidth: 'none' }} alt="Before" />
                            </div>

                            {/* Slider bar overlay indicator line */}
                            <div className="absolute top-0 bottom-0 z-20 pointer-events-none w-0.5 bg-[#D4FF00]" style={{ left: `${sliderPos}%` }}>
                              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black border border-[#D4FF00] flex items-center justify-center text-[7px] text-[#D4FF00] font-black shadow-md uppercase">↔</div>
                            </div>

                            {/* Transparent Drag Range Input Overlay */}
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={sliderPos} 
                              onChange={e => setSliderPos(Number(e.target.value))} 
                              className="absolute inset-0 opacity-0 cursor-ew-resize z-30 w-full h-full" 
                            />
                          </div>

                          <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 font-mono tracking-wider px-1">
                            <span>Day 1 (Before)</span>
                            <span>Day 90 (After)</span>
                          </div>
                        </div>

                        {/* Unlocked Achievements */}
                        <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3">
                          <span className="text-[9px] font-bold text-white uppercase tracking-wider block font-display">Unlocked Achievements</span>
                          <div className="grid grid-cols-2 gap-2">
                            {badgesList.map((badge, idx) => (
                              <div 
                                key={idx} 
                                className={`p-2.5 rounded-2xl border bg-[#1E1E2E] flex items-center gap-2 ${
                                  badge.active ? 'border-white/5' : 'border-white/5 opacity-30'
                                }`}
                              >
                                <div className={`text-sm ${badge.color}`}>🏆</div>
                                <div className="min-w-0">
                                  <div className="text-[8.5px] font-bold text-white truncate">{badge.name}</div>
                                  <div className="text-[7.5px] text-slate-500 truncate">{badge.desc}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Referral campaign card */}
                        <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider">Referral Program</span>
                            <span className="text-[9px] text-[#D4FF00] font-bold">Earn Rewards!</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-relaxed">Invite your friends to join Alpha Zone and claim free memberships, t-shirts, or shakes.</p>
                          <button
                            onClick={() => setActiveTab('refer')}
                            className="w-full py-2 bg-[#D4FF00] text-black text-[10px] font-black uppercase rounded-xl cursor-pointer text-center border-none"
                          >
                            Open Refer & Earn Portal
                          </button>
                        </div>

                      </div>
                    );
                  })()}

                  {/* TAB 4.5: REFER & EARN PORTAL */}
                  {activeTab === 'refer' && (() => {
                    const memberReferrals = appReferrals.filter(r => r.referrerId === currentMember.id);
                    const totalRefsCount = memberReferrals.length;
                    const successfulRefs = memberReferrals.filter(r => r.status === 'Reward Credited');
                    const successfulRefsCount = successfulRefs.length;
                    const pendingRefsCount = totalRefsCount - successfulRefsCount;
                    const successPercent = Math.min(100, (successfulRefsCount / 5) * 100);

                    // Active journey reference details
                    const activeJourneyRef = appReferrals.find(r => r.id === activeRefId) || memberReferrals[0];

                    const getAmbassadorTier = (succCount: number) => {
                      if (succCount >= 10) return { label: 'Alpha Influencer', color: 'text-red-400 border-red-500/20 bg-red-500/10' };
                      if (succCount >= 5) return { label: 'Platinum Ambassador', color: 'text-purple-400 border-purple-500/20 bg-purple-500/10' };
                      if (succCount >= 3) return { label: 'Gold Ambassador', color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' };
                      if (succCount >= 1) return { label: 'Silver Ambassador', color: 'text-slate-300 border-white/10 bg-white/5' };
                      return { label: 'Bronze Ambassador', color: 'text-amber-700 border-amber-800/20 bg-amber-800/10' };
                    };
                    const tier = getAmbassadorTier(successfulRefsCount);

                    return (
                      <div className="space-y-4 animate-fade-in text-left">
                        {/* Title Bar */}
                        <div className="border-b border-white/5 pb-2">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider font-display pt-2">Refer & Earn Portal</h3>
                          <p className="text-[9px] text-slate-400 mt-0.5">Invite friends to join and claim exclusive fitness gear</p>
                        </div>

                        {/* Gamified Progress Ring Card */}
                        <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3.5 flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Ambassador Progress</span>
                            <h4 className="text-xs font-black text-white">{successfulRefsCount} / 5 Successful Invites</h4>
                            <span className={`text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${tier.color} inline-block mt-0.5 mb-1`}>
                              {tier.label}
                            </span>
                            <p className="text-[8.5px] text-[#D4FF00] font-bold font-mono">Next Milestone: Free 1-Month Extension</p>
                          </div>

                          <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
                            <svg width="64" height="64" className="rotate-[-90deg]">
                              <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                              <circle cx="32" cy="32" r="28" fill="transparent" stroke="#D4FF00" strokeWidth="4" strokeDasharray={175.9} strokeDashoffset={175.9 - (successPercent / 100) * 175.9} strokeLinecap="round" className="transition-all duration-1000" />
                            </svg>
                            <span className="absolute text-xs font-black text-white font-mono">{successfulRefsCount}</span>
                          </div>
                        </div>

                        {/* Referral Dashboard Grid */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-2xl bg-[#12121A] border border-white/5 text-center">
                            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Total Refs</span>
                            <span className="text-xs font-black text-white font-mono">{totalRefsCount}</span>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-[#12121A] border border-white/5 text-center">
                            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Successful</span>
                            <span className="text-xs font-black text-emerald-400 font-mono">{successfulRefsCount}</span>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-[#12121A] border border-white/5 text-center">
                            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Pending</span>
                            <span className="text-xs font-black text-amber-500 font-mono">{pendingRefsCount}</span>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-[#12121A] border border-white/5 text-center">
                            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Reward Pts</span>
                            <span className="text-xs font-black text-[#D4FF00] font-mono">{currentMember.rewardPoints || 0}</span>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-[#12121A] border border-white/5 text-center">
                            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Available Rew</span>
                            <span className="text-xs font-black text-blue-400 font-mono">{appRewards.filter(r => r.referrerId === currentMember.id).length}</span>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-[#12121A] border border-white/5 text-center">
                            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Earnings</span>
                            <span className="text-xs font-black text-rose-500 font-mono">₹{(successfulRefsCount * 1500).toLocaleString()}</span>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-[#12121A] border border-white/5 text-center col-span-3">
                            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Leaderboard Rank</span>
                            <span className="text-xs font-black text-[#D4FF00] font-mono">Rank #{successfulRefsCount >= 7 ? 1 : successfulRefsCount >= 5 ? 3 : successfulRefsCount >= 3 ? 8 : successfulRefsCount >= 1 ? 15 : 42} (All Time)</span>
                          </div>
                        </div>

                        {/* Unique Referral Code */}
                        <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Your Unique Invite Code</span>
                          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-2xl border border-white/5">
                            <div>
                              <span className="text-xs font-black text-[#D4FF00] font-mono tracking-widest">{currentMember.name.toUpperCase() + '2026'}</span>
                              <div className="text-[7px] text-slate-600 mt-0.5 font-mono truncate">{typeof window !== 'undefined' ? window.location.origin : 'https://alphagym.app'}/invite/{currentMember.name.toUpperCase() + '2026'}</div>
                            </div>
                            <button
                              onClick={() => {
                                const inviteUrl = `${window.location.origin}/invite/${currentMember.name.toUpperCase() + '2026'}`;
                                navigator.clipboard.writeText(inviteUrl);
                                toast.success('Invite link copied to clipboard!');
                              }}
                              className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white font-bold text-[8.5px] rounded-lg cursor-pointer border-none flex-shrink-0"
                            >
                              Copy
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                              onClick={() => handleWhatsAppShare()}
                              className="flex items-center justify-center gap-1 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-bold text-[8px] rounded-xl cursor-pointer border-none transition-all"
                              style={{ border: '1px solid rgba(37,211,102,0.25)' }}
                            >
                              <Share2 size={9} /> WhatsApp Share
                            </button>
                            <button
                              onClick={handleSMSShare}
                              className="flex items-center justify-center gap-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-bold text-[8px] rounded-xl cursor-pointer transition-all"
                              style={{ border: '1px solid rgba(59,130,246,0.2)' }}
                            >
                              <Phone size={9} /> SMS Invite
                            </button>
                          </div>
                        </div>

                        {/* Realtime journey timeline */}
                        {activeJourneyRef && (
                          <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3 text-left">
                            <span className="text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider block font-display">Active Referral Tracker</span>
                            <div className="text-[10px] font-black text-white">{activeJourneyRef.friendName} ({activeJourneyRef.friendPhone})</div>
                            
                            {/* Step Timeline */}
                            <div className="relative pl-4 border-l border-white/5 space-y-3 text-[9px] mt-2">
                              {[
                                { step: 0, label: 'Invite Sent', desc: 'Simulated sharing completed' },
                                { step: 1, label: 'App Installed', desc: 'Friend downloaded mobile client' },
                                { step: 3, label: 'Account Created', desc: 'Code applied during registration' },
                                { step: 4, label: 'Membership Purchased', desc: 'Paid conversion registered' },
                                { step: 6, label: 'Reward Credited', desc: 'Ambassador points issued' }
                              ].map((s, idx) => {
                                const isDone = activeJourneyRef.currentStep >= s.step || activeJourneyRef.status === 'Reward Credited';
                                return (
                                  <div key={idx} className="relative">
                                    {/* Indicator Dot */}
                                    <div className={`absolute -left-5 top-1 w-2 h-2 rounded-full border ${
                                      isDone ? 'bg-[#D4FF00] border-[#D4FF00]' : 'bg-slate-900 border-white/10'
                                    }`} />
                                    <div className="leading-tight">
                                      <div className={`font-bold ${isDone ? 'text-white' : 'text-slate-500'}`}>{s.label}</div>
                                      <div className="text-[8px] text-slate-500">{s.desc}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Share Invite — Direct WhatsApp */}
                        <div className="p-4 rounded-3xl border border-white/5 space-y-3 text-left" style={{ background: 'rgba(37,211,102,0.05)', borderColor: 'rgba(37,211,102,0.15)' }}>
                          <div className="flex items-center gap-2">
                            <Share2 size={12} color="#25D366" />
                            <span className="text-[9px] font-black uppercase tracking-widest font-mono" style={{ color: '#25D366' }}>
                              Share Invite
                            </span>
                          </div>
                          <p className="text-[8px] text-slate-500 leading-normal">
                            Ek click mein apna invite code WhatsApp pe bhej do. Friend link pe click kare, register kare — reward tumhare account mein credit ho jaayega!
                          </p>

                          {/* Big WhatsApp Button */}
                          <button
                            onClick={() => handleWhatsAppShare()}
                            className="w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
                            style={{ background: '#25D366', color: '#000', boxShadow: '0 0 24px rgba(37,211,102,0.35)' }}
                          >
                            <Share2 size={14} />
                            WhatsApp pe Invite Bhejo
                          </button>

                          {/* Invite link preview */}
                          <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <span className="text-[7.5px] text-slate-600 font-mono truncate flex-1">
                              {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{currentMember.name.toUpperCase() + '2026'}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/invite/${currentMember.name.toUpperCase() + '2026'}`);
                                toast.success('Link copied!');
                              }}
                              className="text-[7.5px] font-bold px-2 py-0.5 rounded-lg border-none cursor-pointer flex-shrink-0"
                              style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
                            >
                              Copy
                            </button>
                          </div>
                        </div>

                        {/* Reward Wallet */}
                        <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-3">
                          <span className="text-[9px] font-bold text-white uppercase tracking-wider block font-display">Referral Reward Wallet</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-950 p-2.5 rounded-2xl border border-white/5">
                              <span className="text-[7.5px] text-slate-500 uppercase block font-bold">Reward Points</span>
                              <span className="text-sm font-black text-[#D4FF00] font-mono">{currentMember.rewardPoints || 0} pts</span>
                            </div>
                            <div className="bg-slate-950 p-2.5 rounded-2xl border border-[#D4FF00]/10">
                              <span className="text-[7.5px] text-slate-500 uppercase block font-bold">Coupons Earned</span>
                              <span className="text-sm font-black text-white font-mono">{appRewards.filter(r => r.referrerId === currentMember.id).length} Claims</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })()}

                  {/* TAB 5: PROFILE & ME */}
                  {activeTab === 'profile' && (
                    <div className="space-y-5 animate-fade-in text-left">
                      {/* Avatar and Name */}
                      <div className="text-center pt-2 space-y-1.5">
                        <div className="w-14 h-14 rounded-2xl bg-[#D4FF00] text-black flex items-center justify-center font-black text-base mx-auto shadow-md">
                          {getInitials(currentMember.name)}
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-white">{currentMember.name}</h3>
                          <button
                            onClick={() => setShowUserListModal(true)}
                            className="text-[9px] text-[#D4FF00] font-bold font-mono border border-[#D4FF00]/20 bg-[#D4FF00]/5 px-2.5 py-0.5 rounded-full hover:bg-[#D4FF00]/20 transition-all cursor-pointer mt-1"
                          >
                            Member ID: {currentMember.memberId || currentMember.id} ▾
                          </button>
                        </div>
                      </div>

                      {/* Roster detail lists */}
                      <div className="p-4 rounded-3xl bg-[#12121A] border border-white/5 space-y-2 text-[10px]">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-500 font-semibold">Active Plan</span>
                          <span className="text-[#D4FF00] font-bold">{currentMember.plan || 'Monthly Membership'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-500 font-semibold">Assigned Trainer</span>
                          <span className="text-white font-medium">{currentMember.trainer || 'None Assigned'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-500 font-semibold">Registered Phone</span>
                          <span className="text-white font-mono">{currentMember.phone || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-semibold">Email Address</span>
                          <span className="text-white truncate max-w-[150px]">{currentMember.email || '—'}</span>
                        </div>
                      </div>

                      {/* Password Reset simulated button */}
                      <button
                        onClick={() => {
                          const pass = prompt(`Reset password for ${currentMember.name}:`, '1234567');
                          if (pass && pass.trim().length >= 6) {
                            resetPassword(currentMember.id, pass.trim())
                              .then(() => toast.success('Password updated in Firebase Auth successfully!'))
                              .catch(() => toast.error('Failed to update password'));
                          } else if (pass) {
                            toast.error('Password must be at least 6 characters');
                          }
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Key size={12} className="text-[#D4FF00]" />
                        <span>Reset Auth Password</span>
                      </button>

                      {/* Log out simulated action */}
                      <button
                        onClick={() => {
                          toast.success('Sign out simulated successfully!');
                          setSelectedMemberId(members[0]?.id || 'm1');
                          setActiveTab('home');
                        }}
                        className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogOut size={12} />
                        <span>Sign Out of App</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Nav Bar */}
            {!isMaintenance && (
              <div className="h-16 border-t border-white/5 bg-[#12121A] flex items-center justify-around z-30">
                {[
                  { id: 'home', icon: Home, label: 'Home' },
                  { id: 'fitness', icon: Dumbbell, label: 'Fitness' },
                  { id: 'attendance', icon: QrCode, label: 'Check-In', isCenter: true },
                  { id: 'refer', icon: Gift, label: 'Refer & Earn' },
                  { id: 'rewards', icon: Award, label: 'Alpha Score' },
                  { id: 'profile', icon: User, label: 'Me' }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  if (tab.isCenter) {
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab('attendance')}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/30' 
                            : 'bg-[#1E1E2E] text-white/50 hover:text-white/85'
                        }`}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  }
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className="flex flex-col items-center justify-center p-2 text-center group cursor-pointer relative"
                    >
                      <Icon size={16} className={`transition-all duration-200 ${
                        isSelected ? 'text-[#D4FF00] scale-110' : 'text-white/35 group-hover:text-white/60'
                      }`} />
                      <span className={`text-[8px] mt-0.5 font-bold transition-all ${
                        isSelected ? 'text-[#D4FF00]' : 'text-white/35'
                      }`}>
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Roster Switcher Overlay Modal (Inside phone simulation pop-up) */}
      <AnimatePresence>
        {showUserListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-3xl bg-brand-bg-card border border-brand-border shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-brand-border">
                <h3 className="text-xs font-black text-brand-text-primary uppercase tracking-wider font-display">Select Gym Member</h3>
                <button 
                  onClick={() => setShowUserListModal(false)}
                  className="text-brand-text-muted hover:text-brand-text-primary text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-[10px] text-brand-text-secondary leading-relaxed">
                Click any registered member below to switch the simulated client app interface to their account:
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-brand-text-muted" size={12} />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  className="w-full text-[11px] bg-brand-bg-card border border-brand-border rounded-xl pl-9 pr-4 py-2 text-brand-text-primary focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="max-h-[220px] overflow-y-auto divide-y divide-brand-border/20 pr-1">
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMemberId(m.id);
                      setShowUserListModal(false);
                      toast.success(`Simulation profile switched to ${m.name}`);
                    }}
                    className={`w-full py-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors ${
                      selectedMemberId === m.id ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'text-brand-text-primary'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{m.name}</div>
                      <div className="text-[9px] text-brand-text-muted font-mono">{m.memberId || m.id}</div>
                    </div>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                      {m.plan?.split(' ')[0]}
                    </span>
                  </button>
                ))}
                {filteredMembers.length === 0 && (
                  <div className="text-center py-6 text-xs text-brand-text-muted italic">No members found</div>
                )}
              </div>

              <button
                onClick={() => setShowUserListModal(false)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider text-center transition-colors cursor-pointer"
              >
                Close List
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
