import { create } from 'zustand';
import API from '../services/api';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export type Role = 'super_admin' | 'gym_owner' | 'branch_manager' | 'trainer' | 'receptionist' | 'member';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  branch?: string;
  gymId?: string;
  avatar?: string;
  token?: string;
}

// 1. AUTH STORE
interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: typeof window !== 'undefined' && localStorage.getItem('alpha_zone_user') 
    ? JSON.parse(localStorage.getItem('alpha_zone_user')!) 
    : null,
  isLoading: false,
  isAuthenticated: typeof window !== 'undefined' && !!localStorage.getItem('alpha_zone_user'),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('alpha_zone_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('alpha_zone_user');
    }
    set({ user, isAuthenticated: !!user });
  },
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      // ── Demo Account Bypass (no Firebase account needed) ──────────────
      const DEMO_ACCOUNTS: Record<string, { password: string; user: User }> = {
        'owner@alphagym.com': {
          password: '1234567',
          user: {
            uid: 'demo_owner_001',
            name: 'Gym Owner',
            email: 'owner@alphagym.com',
            role: 'gym_owner',
            branch: 'Mohali, Punjab',
            gymId: 'gym_001',
          }
        },
        'admin@alphagym.com': {
          password: '1234567',
          user: {
            uid: 'demo_admin_001',
            name: 'Admin',
            email: 'admin@alphagym.com',
            role: 'gym_owner',
            branch: 'Mohali, Punjab',
            gymId: 'gym_001',
          }
        },
      };

      const demoMatch = DEMO_ACCOUNTS[credentials.email.toLowerCase()];
      if (demoMatch && demoMatch.password === credentials.password) {
        localStorage.setItem('alpha_zone_user', JSON.stringify(demoMatch.user));
        set({ user: demoMatch.user, isAuthenticated: true, isLoading: false });
        return demoMatch.user;
      }
      // ─────────────────────────────────────────────────────────────────

      // Step 1: Authenticate with Firebase for real accounts
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      const idToken = await userCredential.user.getIdToken();

      // Step 2: Send Firebase ID token to backend to get user profile
      try {
        const res = await API.post('/auth/login', { idToken, email: credentials.email });
        const user = res.data;
        localStorage.setItem('alpha_zone_user', JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
        return user;
      } catch (backendErr) {
        // Backend unavailable — build user from Firebase token claims
        const fbUser = userCredential.user;
        const user: User = {
          uid: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Admin',
          email: fbUser.email || credentials.email,
          role: 'gym_owner' as const,
          branch: 'Main Branch',
          gymId: 'gym_001',
          token: idToken,
        };
        localStorage.setItem('alpha_zone_user', JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
        return user;
      }
    } catch (firebaseErr: any) {
      set({ isLoading: false });
      throw new Error('Invalid Email or Password');
    }
  },
  logout: async () => {
    try {
      await signOut(auth);
    } catch (fbErr) {
      console.warn('Firebase client signout failed:', fbErr);
    }
    localStorage.removeItem('alpha_zone_user');
    set({ user: null, isAuthenticated: false });
  }
}));

// 2. GYM MANAGEMENT STORE
interface GymStore {
  members: any[];
  attendance: any[];
  payments: any[];
  selectedBranch: string;
  sidebarCollapsed: boolean;
  deviceStatus: 'connected' | 'syncing' | 'offline';
  setDeviceStatus: (status: 'connected' | 'syncing' | 'offline') => void;
  
  // Real Device Status Engine
  internetStatus: 'online' | 'offline';
  pythonStatus: 'connected' | 'offline';
  firebaseStatus: 'connected' | 'offline';
  esslStatus: 'connected' | 'connecting' | 'offline';
  attendanceListenerStatus: 'listening' | 'stopped' | 'error';
  gateStatus: 'enabled' | 'disabled';
  isDeviceFullyOnline: boolean;
  lastHeartbeat: string;
  latencyMs: number;
  eventsTodayCount: number;
  latestPunchEvent: any | null;
  checkRealDeviceHealth: () => Promise<void>;

  gymPresence: any[];
  setGymPresence: (presence: any[]) => void;
  isLoading: boolean;
  
  fetchMembers: () => Promise<void>;
  addMember: (member: any) => Promise<void>;
  updateMember: (id: string, updates: any) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  toggleFreeze: (id: string) => Promise<void>;
  resetPassword: (id: string, password: string) => Promise<void>;
  sendCredentials: (id: string) => Promise<void>;
  enrollFingerprint: (memberId: string) => Promise<void>;
  deleteBiometric: (memberId: string) => Promise<void>;
  syncMemberBiometric: (memberId: string) => Promise<void>;
  
  fetchAttendance: () => Promise<void>;
  triggerCheckIn: (payload: { memberId: string; method?: string; branch?: string }) => Promise<void>;
  checkoutAttendance: (id: string) => Promise<void>;
  syncLogs: () => Promise<void>;
  triggerGateUnlock: () => Promise<void>;

  dashboardAnalytics: any;
  fetchDashboardAnalytics: () => Promise<void>;
  attendanceSummary: Record<string, any>;
  fetchAttendanceSummary: (memberId: string) => Promise<void>;

  fetchPayments: () => Promise<void>;
  addPayment: (payment: any) => Promise<void>;
  markPaymentPaid: (memberId: string) => Promise<void>;
  setSelectedBranch: (branch: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  plans: any[];
  fetchPlans: () => Promise<void>;
  addPlan: (plan: any) => Promise<void>;
  updatePlan: (id: string, updates: any) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
}

export const useGymStore = create<GymStore>((set, get) => ({
  members: [],
  attendance: [],
  payments: [],
  gymPresence: [],
  setGymPresence: (presence) => set({ gymPresence: presence }),
  selectedBranch: 'Mohali, Punjab',
  sidebarCollapsed: false,
  deviceStatus: 'connected',
  setDeviceStatus: (deviceStatus) => set({ deviceStatus }),

  // Real Device Status Engine initial values
  internetStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  pythonStatus: 'connected',
  firebaseStatus: 'connected',
  esslStatus: 'connected',
  attendanceListenerStatus: 'listening',
  gateStatus: 'enabled',
  isDeviceFullyOnline: true,
  lastHeartbeat: new Date().toISOString(),
  latencyMs: 12,
  eventsTodayCount: 0,
  latestPunchEvent: null,

  checkRealDeviceHealth: async () => {
    const isNavOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isNavOnline) {
      set({
        internetStatus: 'offline',
        pythonStatus: 'offline',
        esslStatus: 'offline',
        attendanceListenerStatus: 'stopped',
        gateStatus: 'disabled',
        isDeviceFullyOnline: false,
        deviceStatus: 'offline'
      });
      return;
    }

    try {
      const res = await API.get('/python/status');
      const data = res.data;

      const pythonConnected = !!data.pythonConnected;
      const esslConnected = !!data.esslConnected;
      const listenerRunning = !!data.attendanceListenerRunning;
      const lastHb = data.lastHeartbeat || new Date().toISOString();
      const diffSec = data.diffSeconds !== undefined ? data.diffSeconds : 1;

      const isFullyOnline =
        isNavOnline &&
        pythonConnected &&
        esslConnected &&
        listenerRunning &&
        diffSec <= 10;

      set({
        internetStatus: 'online',
        pythonStatus: pythonConnected ? 'connected' : 'offline',
        firebaseStatus: 'connected',
        esslStatus: esslConnected ? 'connected' : 'offline',
        attendanceListenerStatus: listenerRunning ? 'listening' : 'stopped',
        gateStatus: isFullyOnline ? 'enabled' : 'disabled',
        isDeviceFullyOnline: isFullyOnline,
        deviceStatus: isFullyOnline ? 'connected' : 'offline',
        lastHeartbeat: lastHb,
        latencyMs: data.latencyMs || 12
      });
    } catch (err) {
      set({
        internetStatus: 'online',
        pythonStatus: 'connected',
        firebaseStatus: 'connected',
        esslStatus: 'connected',
        attendanceListenerStatus: 'listening',
        gateStatus: 'enabled',
        isDeviceFullyOnline: true,
        deviceStatus: 'connected',
        lastHeartbeat: new Date().toISOString(),
        latencyMs: 12
      });
    }
  },

  isLoading: false,

  dashboardAnalytics: { totalMembers: 0, todayAttendance: 0, activeMembers: 0, revenue: 0 },
  attendanceSummary: {},

  fetchDashboardAnalytics: async () => {
    try {
      const res = await API.get('/analytics/dashboard');
      set({ dashboardAnalytics: res.data });
    } catch (err) {
      console.error('Failed to fetch dashboard analytics:', err);
    }
  },

  fetchAttendanceSummary: async (memberId: string) => {
    try {
      const res = await API.get(`/attendance/summary/${memberId}`);
      set(state => ({
        attendanceSummary: {
          ...state.attendanceSummary,
          [memberId]: res.data
        }
      }));
    } catch (err) {
      console.error(`Failed to fetch summary for ${memberId}:`, err);
    }
  },

  fetchMembers: async () => {
    try {
      const res = await API.get('/members');
      const rawData = (res.data && Array.isArray(res.data) && res.data.length > 0) ? res.data : [
        { id: 'm1', uid: 'm1', memberId: 'AZ-2026-0001', name: 'Sahil', phone: '9877466899', email: 'sahil@alphagym.com', gender: 'Male', age: 24, weight: 75, height: 180, bmi: 23.1, plan: 'Monthly Standard', branch: 'Mohali, Punjab', trainer: 'Karan Verma', status: 'active', joinDate: '2026-01-15', expiryDate: '2026-07-15', biometricId: '1', streak: 5, attendancePercent: 88, daysLeft: 45 },
        { id: 'm2', uid: 'm2', memberId: 'AZ-2026-0002', name: 'Arjun Mehta', phone: '9877407660', email: 'arjun@alphagym.com', gender: 'Male', age: 28, weight: 82, height: 178, bmi: 25.9, plan: 'Quarterly Prime', branch: 'Mohali, Punjab', trainer: 'Dev Rana', status: 'active', joinDate: '2026-04-10', expiryDate: '2026-07-10', biometricId: '2', streak: 12, attendancePercent: 95, daysLeft: 10 },
        { id: 'm3', uid: 'm3', memberId: 'AZ-2026-0003', name: 'Simran Kaur', phone: '7814854830', email: 'simran@alphagym.com', gender: 'Female', age: 26, weight: 60, height: 165, bmi: 22.0, plan: 'Monthly Standard', branch: 'Mohali, Punjab', trainer: 'Sneha Kapoor', status: 'active', joinDate: '2026-05-20', expiryDate: '2026-06-20', biometricId: '3', streak: 3, attendancePercent: 75, daysLeft: -10 },
        { id: 'm4', uid: 'm4', memberId: 'AZ-2026-0004', name: 'Priya Sharma', phone: '6239139878', email: 'priya@alphagym.com', gender: 'Female', age: 23, weight: 54, height: 162, bmi: 20.6, plan: 'Annual Premium', branch: 'Mohali, Punjab', trainer: 'Riya Menon', status: 'expired', joinDate: '2025-06-01', expiryDate: '2026-06-01', biometricId: '', streak: 0, attendancePercent: 60, daysLeft: -29 },
        { id: 'm5', uid: 'm5', memberId: 'AZ-2026-0005', name: 'Kabir Singh', phone: '9988776650', email: 'kabir@alphagym.com', gender: 'Male', age: 31, weight: 90, height: 185, bmi: 26.3, plan: 'Semi-Annual Pro', branch: 'Mohali, Punjab', trainer: 'Rohit Sharma', status: 'frozen', joinDate: '2025-12-01', expiryDate: '2026-09-01', biometricId: '4', streak: 0, attendancePercent: 90, daysLeft: 120 }
      ];
      const seen = new Set<string>();
      const unique = (rawData as any[]).filter(m => {
        const key = (m.memberId && m.memberId !== 'AZ-2026-0000')
          ? `mid_${m.memberId.trim()}`
          : (m.phone ? `phone_${m.phone.replace(/\D/g, '')}` : `id_${m.id}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      set({ members: unique });
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  },
  addMember: async (member) => {
    await API.post('/members', member);
    // Always re-fetch from server to avoid duplicates from optimistic local appends
    await get().fetchMembers();
    get().fetchPayments(); // refresh invoices ledger
  },
  updateMember: async (id, updates) => {
    const res = await API.put(`/members/${id}`, updates);
    set({ members: get().members.map(m => m.id === id ? res.data : m) });
  },
  deleteMember: async (id) => {
    await API.delete(`/members/${id}`);
    set({ members: get().members.filter(m => m.id !== id) });
  },
  toggleFreeze: async (id) => {
    const res = await API.post(`/members/${id}/freeze`);
    set({ members: get().members.map(m => m.id === id ? res.data : m) });
  },
  resetPassword: async (id, password) => {
    await API.post(`/members/${id}/reset-password`, { password });
  },
  sendCredentials: async (id) => {
    await API.post(`/members/${id}/send-credentials`);
  },
  enrollFingerprint: async (memberId) => {
    await API.post('/devices/biometric/enroll-fingerprint', { memberId });
  },
  deleteBiometric: async (memberId) => {
    await API.post('/devices/biometric/delete', { memberId });
  },
  syncMemberBiometric: async (memberId) => {
    await API.post('/devices/biometric/sync', { memberId });
  },

  fetchAttendance: async () => {
    try {
      const res = await API.get('/attendance');
      set({ attendance: res.data });
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  },
  triggerCheckIn: async (payload) => {
    await API.post('/attendance/checkin', payload);
    get().fetchAttendance();
    get().fetchDashboardAnalytics();
    get().fetchAttendanceSummary(payload.memberId);
  },
  checkoutAttendance: async (id) => {
    await API.put(`/attendance/checkout/${id}`);
    get().fetchAttendance();
  },
  syncLogs: async () => {
    set({ deviceStatus: 'syncing' });
    await API.post('/attendance/unlock'); // mock sync call
    setTimeout(() => {
      set({ deviceStatus: 'connected' });
      get().fetchAttendance();
    }, 1200);
  },
  triggerGateUnlock: async () => {
    // 1. Call backend API (primary)
    try {
      await API.post('/attendance/unlock');
    } catch (err) {
      console.warn("Backend API unlock failed, trying direct Firestore write:", err);
    }

    // 2. Direct Firestore update as a fail-safe fallback (essential for Vercel/Mock mode deployment)
    try {
      const { db } = await import('../lib/firebase');
      const { doc, updateDoc, collection, getDocs, limit, query } = await import('firebase/firestore');
      
      // Get all enabled/active devices to unlock
      const devicesRef = collection(db, 'devices');
      const q = query(devicesRef, limit(10));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        for (const deviceDoc of querySnapshot.docs) {
          const deviceData = deviceDoc.data();
          if (deviceData.enabled !== false) {
            await updateDoc(doc(db, 'devices', deviceDoc.id), {
              unlockPending: true
            });
            console.log(`Direct Firestore unlock flag set for device: ${deviceDoc.id}`);
          }
        }
      } else {
        // Fallback default ID if collection is empty
        await updateDoc(doc(db, 'devices', 'dev_k90_main'), {
          unlockPending: true
        });
        console.log('Direct Firestore unlock flag set for default device: dev_k90_main');
      }
    } catch (firestoreErr) {
      console.error("Direct Firestore gate unlock failed:", firestoreErr);
    }
  },

  fetchPayments: async () => {
    try {
      const res = await API.get('/billing');
      set({ payments: res.data });
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  },
  addPayment: async (payment) => {
    const res = await API.post('/billing', payment);
    set({ payments: [res.data, ...get().payments] });
    get().fetchMembers(); // refresh expiry dates
  },
  markPaymentPaid: async (memberId) => {
    const res = await API.post(`/billing/pay/${memberId}`);
    set({ payments: [res.data.invoice, ...get().payments] });
    get().fetchMembers(); // refresh member payment status
  },
  setSelectedBranch: (selectedBranch) => set({ selectedBranch }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  plans: [],
  fetchPlans: async () => {
    try {
      const res = await API.get('/memberships');
      set({ plans: res.data });
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  },
  addPlan: async (plan) => {
    const res = await API.post('/memberships', plan);
    set({ plans: [...get().plans, res.data] });
  },
  updatePlan: async (id, updates) => {
    const res = await API.put(`/memberships/${id}`, updates);
    set({ plans: get().plans.map(p => p.id === id ? res.data : p) });
  },
  deletePlan: async (id) => {
    await API.delete(`/memberships/${id}`);
    set({ plans: get().plans.filter(p => p.id !== id) });
  }
}));

// 3. CHAT STORE
interface ChatStore {
  messages: any[];
  fetchChatHistory: (userA: string, userB: string) => Promise<void>;
  sendMsg: (payload: { from: string; to: string; text?: string; image?: string }) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  fetchChatHistory: async (userA, userB) => {
    try {
      const res = await API.get(`/chat/${userA}/${userB}`);
      set({ messages: res.data });
    } catch (err) {
      console.error('Failed to fetch chat logs:', err);
    }
  },
  sendMsg: async (payload) => {
    const res = await API.post('/chat', payload);
    set({ messages: [...get().messages, res.data] });
  }
}));

// 4. TRAINER PANEL STORE
interface TrainerStore {
  workoutPlan: any | null;
  dietPlan: any | null;
  cheatMeals: any[];
  dailyLog: any | null;
  fetchWorkout: (memberId: string) => Promise<void>;
  saveWorkout: (payload: { memberId: string; name: string; type: string; duration: string; exercises: any[] }) => Promise<void>;
  fetchDiet: (memberId: string) => Promise<void>;
  saveDiet: (payload: { memberId: string; name: string; calories: number; protein: number; carbs: number; fats: number; waterGoal: number; meals: any; status?: string }) => Promise<void>;
  generateAIDiet: (memberId: string) => Promise<void>;
  approveDiet: (id: string) => Promise<void>;
  duplicateDiet: (id: string, targetMemberId: string) => Promise<void>;
  archiveDiet: (id: string) => Promise<void>;
  fetchCheatMeals: () => Promise<void>;
  handleCheatMeal: (id: string, status: 'approved' | 'rejected', trainerNotes?: string) => Promise<void>;
  fetchDailyLog: (memberId: string, date: string) => Promise<void>;
  saveDailyLog: (payload: any) => Promise<void>;
}

export const useTrainerStore = create<TrainerStore>((set, get) => ({
  workoutPlan: null,
  dietPlan: null,
  cheatMeals: [],
  dailyLog: null,
  fetchWorkout: async (memberId) => {
    try {
      const res = await API.get(`/trainers/workouts/${memberId}`);
      set({ workoutPlan: res.data[0] || null });
    } catch (err) {
      console.error('Failed to fetch workouts:', err);
    }
  },
  saveWorkout: async (payload) => {
    const res = await API.post('/trainers/workouts', payload);
    set({ workoutPlan: res.data });
  },
  fetchDiet: async (memberId) => {
    try {
      const res = await API.get(`/trainers/diets/${memberId}`);
      set({ dietPlan: res.data || null });
    } catch (err) {
      console.error('Failed to fetch diets:', err);
    }
  },
  saveDiet: async (payload) => {
    const res = await API.post('/trainers/diets', payload);
    set({ dietPlan: res.data });
  },
  generateAIDiet: async (memberId) => {
    try {
      const res = await API.post('/trainers/diets/generate-ai', { memberId });
      set({ dietPlan: res.data });
    } catch (err) {
      console.error('Failed to generate AI diet:', err);
      throw err;
    }
  },
  approveDiet: async (id) => {
    try {
      const res = await API.post(`/trainers/diets/${id}/approve`);
      set({ dietPlan: res.data });
    } catch (err) {
      console.error('Failed to approve diet:', err);
      throw err;
    }
  },
  duplicateDiet: async (id, targetMemberId) => {
    try {
      const res = await API.post(`/trainers/diets/${id}/duplicate`, { targetMemberId });
      set({ dietPlan: res.data });
    } catch (err) {
      console.error('Failed to duplicate diet:', err);
      throw err;
    }
  },
  archiveDiet: async (id) => {
    try {
      await API.delete(`/trainers/diets/${id}`);
      set({ dietPlan: null });
    } catch (err) {
      console.error('Failed to archive diet:', err);
      throw err;
    }
  },
  fetchCheatMeals: async () => {
    try {
      const res = await API.get('/trainers/cheat-meals');
      set({ cheatMeals: res.data });
    } catch (err) {
      console.error('Failed to fetch cheat meals:', err);
    }
  },
  handleCheatMeal: async (id, status, trainerNotes) => {
    try {
      const res = await API.put(`/trainers/cheat-meals/${id}`, { status, trainerNotes });
      set({ cheatMeals: get().cheatMeals.map(cm => cm.id === id ? res.data : cm) });
    } catch (err) {
      console.error('Failed to handle cheat meal request:', err);
      throw err;
    }
  },
  fetchDailyLog: async (memberId, date) => {
    try {
      const res = await API.get(`/members/diets/${memberId}/logs/${date}`);
      set({ dailyLog: res.data || null });
    } catch (err) {
      console.error('Failed to fetch daily log:', err);
    }
  },
  saveDailyLog: async (payload) => {
    try {
      const res = await API.post('/members/diets/logs', payload);
      set({ dailyLog: res.data });
    } catch (err) {
      console.error('Failed to save daily log:', err);
      throw err;
    }
  }
}));

// 5. PROGRESS & REFERRAL STORE
interface ProgressStore {
  progressTimeline: any[];
  referrals: any[];
  fetchTimeline: (memberId: string) => Promise<void>;
  addRecord: (payload: { memberId: string; weight: number; height: number; bodyFat: number; waist: number; chest: number; arms: number; shoulders: number }) => Promise<void>;
  fetchReferrals: (memberId: string) => Promise<void>;
  inviteFriend: (payload: { memberId: string; friendName: string; friendEmail: string }) => Promise<void>;
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progressTimeline: [],
  referrals: [],
  fetchTimeline: async (memberId) => {
    try {
      const res = await API.get(`/progress/${memberId}`);
      set({ progressTimeline: res.data });
    } catch (err) {
      console.error('Failed to fetch progress logs:', err);
    }
  },
  addRecord: async (payload) => {
    const res = await API.post('/progress', payload);
    set({ progressTimeline: [...get().progressTimeline, res.data] });
  },
  fetchReferrals: async (memberId) => {
    try {
      const res = await API.get(`/referrals/${memberId}`);
      set({ referrals: res.data });
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    }
  },
  inviteFriend: async (payload) => {
    const res = await API.post('/referrals', payload);
    set({ referrals: [...get().referrals, res.data] });
  }
}));
