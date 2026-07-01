import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

// Preloaded Mock Data sets for fallback mode
export let mockBranches = [
  { id: 'b1', name: 'Alpha Gym - Mohali', city: 'Mohali', members: 0, revenue: 0, attendance: 0, status: 'active', manager: 'Karan Verma', capacity: 500 },
];

export let mockMembers: any[] = [
  {
    id: 'm1',
    uid: 'm1',
    memberId: 'AZ-2026-0001',
    name: 'Sahil',
    phone: '9877466899',
    email: 'sahil@alphagym.com',
    gender: 'Male',
    age: 24,
    weight: 75,
    height: 180,
    bmi: 23.1,
    plan: 'Monthly Standard',
    branch: 'Mohali, Punjab',
    trainer: 'Karan Verma',
    status: 'active',
    joinDate: '2026-01-15',
    expiryDate: '2026-07-15',
    biometricId: '1',
    streak: 5,
    attendancePercent: 88,
    daysLeft: 45
  },
  {
    id: 'm2',
    uid: 'm2',
    memberId: 'AZ-2026-0002',
    name: 'Arjun Mehta',
    phone: '9877407660',
    email: 'arjun@alphagym.com',
    gender: 'Male',
    age: 28,
    weight: 82,
    height: 178,
    bmi: 25.9,
    plan: 'Quarterly Prime',
    branch: 'Mohali, Punjab',
    trainer: 'Dev Rana',
    status: 'active',
    joinDate: '2026-04-10',
    expiryDate: '2026-07-10',
    biometricId: '2',
    streak: 12,
    attendancePercent: 95,
    daysLeft: 10
  },
  {
    id: 'm3',
    uid: 'm3',
    memberId: 'AZ-2026-0003',
    name: 'Simran Kaur',
    phone: '7814854830',
    email: 'simran@alphagym.com',
    gender: 'Female',
    age: 26,
    weight: 60,
    height: 165,
    bmi: 22.0,
    plan: 'Monthly Standard',
    branch: 'Mohali, Punjab',
    trainer: 'Sneha Kapoor',
    status: 'active',
    joinDate: '2026-05-20',
    expiryDate: '2026-06-20',
    biometricId: '3',
    streak: 3,
    attendancePercent: 75,
    daysLeft: -10
  },
  {
    id: 'm4',
    uid: 'm4',
    memberId: 'AZ-2026-0004',
    name: 'Priya Sharma',
    phone: '6239139878',
    email: 'priya@alphagym.com',
    gender: 'Female',
    age: 23,
    weight: 54,
    height: 162,
    bmi: 20.6,
    plan: 'Annual Premium',
    branch: 'Mohali, Punjab',
    trainer: 'Riya Menon',
    status: 'expired',
    joinDate: '2025-06-01',
    expiryDate: '2026-06-01',
    biometricId: '',
    streak: 0,
    attendancePercent: 60,
    daysLeft: -29
  },
  {
    id: 'm5',
    uid: 'm5',
    memberId: 'AZ-2026-0005',
    name: 'Kabir Singh',
    phone: '9988776650',
    email: 'kabir@alphagym.com',
    gender: 'Male',
    age: 31,
    weight: 90,
    height: 185,
    bmi: 26.3,
    plan: 'Semi-Annual Pro',
    branch: 'Mohali, Punjab',
    trainer: 'Rohit Sharma',
    status: 'frozen',
    joinDate: '2025-12-01',
    expiryDate: '2026-09-01',
    biometricId: '4',
    streak: 0,
    attendancePercent: 90,
    daysLeft: 120
  }
];
export let mockTrainers = [
  { id: 't1', name: 'Karan Verma', email: 'karan@alphagym.com', phone: '9988776655', specialization: 'Strength & Conditioning', experience: 6, rating: 4.9, branch: 'Mohali, Punjab', sessions: 12, salary: 45000, status: 'active', certifications: ['ACE', 'NASM', 'CPR'], photo: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?q=80&w=150', bio: 'Passionate about strength building and posture correction.', joiningDate: '2025-01-10', instagram: 'karan_conditioning', achievements: 'Gold medalist in Powerlifting 2024' },
  { id: 't2', name: 'Sneha Kapoor', email: 'sneha@alphagym.com', phone: '9988776656', specialization: 'Yoga & Flexibility', experience: 4, rating: 4.8, branch: 'Mohali, Punjab', sessions: 8, salary: 38000, status: 'active', certifications: ['RYT-200', 'ACE'], photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150', bio: 'Helping clients connect mind, body, and breath through Vinyasa flow.', joiningDate: '2025-03-15', instagram: 'sneha_yoga_flow', achievements: 'Trained over 500+ students in flex workshops' },
  { id: 't3', name: 'Dev Rana', email: 'dev@alphagym.com', phone: '9988776657', specialization: 'CrossFit & HIIT', experience: 8, rating: 4.7, branch: 'Mohali, Punjab', sessions: 15, salary: 52000, status: 'active', certifications: ['CrossFit L2', 'NASM', 'CPR'], photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150', bio: 'High-octane CrossFit coach specializing in functional output and speed work.', joiningDate: '2024-06-01', instagram: 'dev_rana_hiit', achievements: 'Represented state in CrossFit Open 2023' },
  { id: 't4', name: 'Riya Menon', email: 'riya@alphagym.com', phone: '9988776658', specialization: 'Weight Loss Specialist', experience: 5, rating: 4.6, branch: 'Mohali, Punjab', sessions: 18, salary: 41000, status: 'active', certifications: ['ACSM', 'Nutritionist'], photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150', bio: 'Combining tailored cardio programs with precise meal planning for fat loss.', joiningDate: '2025-02-12', instagram: 'riya_weightloss', achievements: 'Helped 150+ clients lose more than 15kg' },
  { id: 't5', name: 'Aakash Sharma', email: 'aakash@alphagym.com', phone: '9988776659', specialization: 'Bodybuilding', experience: 7, rating: 4.8, branch: 'Mohali, Punjab', sessions: 20, salary: 48000, status: 'active', certifications: ['IFBB', 'ACE', 'CPR'], photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150', bio: 'Hypertrophy coach focusing on mechanical tension and muscle symmetry.', joiningDate: '2024-11-20', instagram: 'aakash_bodybuilding', achievements: 'IFBB Pro card holder 2022' },
  { id: 't6', name: 'Rohit Sharma', email: 'rohit@alphagym.com', phone: '9988776650', specialization: 'Weight Loss Specialist', experience: 8, rating: 4.9, branch: 'Mohali, Punjab', sessions: 22, salary: 50000, status: 'active', certifications: ['ACE', 'CSCS', 'CPR'], photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150', bio: 'Certified weight loss coach with 8 years of experience. Expert in body composition changes.', joiningDate: '2024-05-10', instagram: 'rohit_sharma_coach', achievements: 'Best Weight Loss Coach award 2025' }
];

export let mockAttendance: any[] = [
  { id: 'a1', memberId: 'm1', memberName: 'Sahil', checkIn: new Date(Date.now() - 30*60*1000).toISOString(), checkOut: null, deviceId: 'k90-main-gate', doorName: 'Main Entrance Gate', status: 'active', temp: '36.5', mask: 'yes' },
  { id: 'a2', memberId: 'm2', memberName: 'Arjun Mehta', checkIn: new Date(Date.now() - 2*60*60*1000).toISOString(), checkOut: new Date(Date.now() - 1*60*60*1000).toISOString(), deviceId: 'k90-main-gate', doorName: 'Main Entrance Gate', status: 'completed' },
];
export let mockPayments: any[] = [
  { id: 'p1', memberId: 'm1', memberName: 'Sahil', amount: 2500, plan: 'Monthly Standard', method: 'UPI', date: '2026-05-15', status: 'paid', invoice: 'INV-001', gst: 450 },
  { id: 'p2', memberId: 'm2', memberName: 'Arjun Mehta', amount: 6500, plan: 'Quarterly Prime', method: 'Card', date: '2026-04-10', status: 'paid', invoice: 'INV-002', gst: 1170 },
];
export let mockWorkouts: any[] = [];
export let mockDietPlans: any[] = [];
export let mockCheatMealRequests: any[] = [];
export let mockDailyDietLogs: any[] = [];
export let mockProgressLogs: any[] = [];
export let mockChatMessages: any[] = [];
export let mockReferrals: any[] = [];
export let mockMigrations: any[] = [];

export let mockPlans: any[] = [
  {
    id: 'p_mon',
    name: 'Monthly Standard',
    price: 2500,
    duration: '30 Days',
    durationDays: 30,
    features: ['Biometric Access Roster', 'Daily facility check-ins', 'Locker Room access'],
    badge: null,
    accent: '#3b82f6',
    accentBg: 'rgba(59,130,246,0.08)',
    border: '2px solid rgba(59,130,246,0.2)',
    icon: 'Shield'
  },
  {
    id: 'p_qrt',
    name: 'Quarterly Prime',
    price: 6500,
    duration: '90 Days',
    durationDays: 90,
    features: ['All Monthly benefits', '2 PT consultation sessions', 'Steam Bath Access'],
    badge: 'Popular',
    accent: '#8b5cf6',
    accentBg: 'rgba(139,92,246,0.08)',
    border: '2px solid rgba(139,92,246,0.2)',
    icon: 'Zap'
  },
  {
    id: 'p_semi',
    name: 'Semi-Annual Pro',
    price: 11500,
    duration: '180 Days',
    durationDays: 180,
    features: ['All Quarterly benefits', 'Diet & Nutrition builder', 'Body fat measurements'],
    badge: 'Best Value',
    accent: '#10b981',
    accentBg: 'rgba(16,185,129,0.08)',
    border: '2px solid rgba(16,185,129,0.2)',
    icon: 'Star'
  },
  {
    id: 'p_ann',
    name: 'Annual Premium',
    price: 18000,
    duration: '365 Days',
    durationDays: 365,
    features: ['All Semi-Annual benefits', 'Dedicated coach + personal locker', 'Guest passes (5/month)'],
    badge: '🏆 Elite',
    accent: '#f59e0b',
    accentBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef9ec 100%)',
    border: '2px solid rgba(245,158,11,0.35)',
    icon: 'Crown'
  }
];

export let mockDevices: any[] = [
  { id: 'dev1', deviceId: 'k90-main-gate', deviceName: 'Main Gate K90 Pro', deviceType: 'ESSL K90 Pro', ip: '192.168.1.100', port: 4370, branch: 'Alpha Zone Main Branch', enabled: true, lastSync: new Date().toISOString(), status: 'connected', connectionHealth: 100 },
  { id: 'dev2', deviceId: 'zk-cardio-gate', deviceName: 'Cardio Section ZK', deviceType: 'ZKTeco', ip: '192.168.1.101', port: 4370, branch: 'Alpha Zone Main Branch', enabled: true, lastSync: new Date().toISOString(), status: 'connected', connectionHealth: 95 },
  { id: 'dev3', deviceId: 'eb-vip-lounge', deviceName: 'VIP Lounge EasyBio', deviceType: 'EasyBio', ip: '192.168.1.102', port: 5000, branch: 'Alpha Zone Main Branch', enabled: false, lastSync: null, status: 'offline', connectionHealth: 0 }
];
export let mockDeviceLogs: any[] = [];
export let mockAccessLogs: any[] = [];
export let mockDoorStatus: any[] = [
  { id: 'dev_k90_main', doorId: 'dev_k90_main', doorName: 'Main Entrance Gate', status: 'locked', lastOpen: new Date().toISOString(), lastUser: 'Arjun Mehta', lastEvent: 'Access Granted' }
];

const MOCK_DB_FILE = path.join(__dirname, 'mockDb.json');

export const saveMockDb = () => {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify({
      mockMembers,
      mockAttendance,
      mockPayments,
      mockTrainers,
      mockBranches,
      mockWorkouts,
      mockDietPlans,
      mockCheatMealRequests,
      mockDailyDietLogs,
      mockProgressLogs,
      mockChatMessages,
      mockReferrals,
      mockMigrations,
      mockPlans,
      mockDevices,
      mockDeviceLogs,
      mockAccessLogs,
      mockDoorStatus
    }, null, 2));
  } catch (e) {
    console.error('Failed to write mock database:', e);
  }
};

export const loadMockDb = () => {
  try {
    if (fs.existsSync(MOCK_DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(MOCK_DB_FILE, 'utf8'));
      if (data.mockMembers) { mockMembers.length = 0; mockMembers.push(...data.mockMembers); }
      if (data.mockAttendance) { mockAttendance.length = 0; mockAttendance.push(...data.mockAttendance); }
      if (data.mockPayments) { mockPayments.length = 0; mockPayments.push(...data.mockPayments); }
      if (data.mockTrainers) { mockTrainers.length = 0; mockTrainers.push(...data.mockTrainers); }
      if (data.mockBranches) { mockBranches.length = 0; mockBranches.push(...data.mockBranches); }
      if (data.mockWorkouts) { mockWorkouts.length = 0; mockWorkouts.push(...data.mockWorkouts); }
      if (data.mockDietPlans) { mockDietPlans.length = 0; mockDietPlans.push(...data.mockDietPlans); }
      if (data.mockCheatMealRequests) { mockCheatMealRequests.length = 0; mockCheatMealRequests.push(...data.mockCheatMealRequests); }
      if (data.mockDailyDietLogs) { mockDailyDietLogs.length = 0; mockDailyDietLogs.push(...data.mockDailyDietLogs); }
      if (data.mockProgressLogs) { mockProgressLogs.length = 0; mockProgressLogs.push(...data.mockProgressLogs); }
      if (data.mockChatMessages) { mockChatMessages.length = 0; mockChatMessages.push(...data.mockChatMessages); }
      if (data.mockReferrals) { mockReferrals.length = 0; mockReferrals.push(...data.mockReferrals); }
      if (data.mockMigrations) { mockMigrations.length = 0; mockMigrations.push(...data.mockMigrations); }
      if (data.mockPlans) { mockPlans.length = 0; mockPlans.push(...data.mockPlans); }
      if (data.mockDevices) { mockDevices.length = 0; mockDevices.push(...data.mockDevices); }
      if (data.mockDeviceLogs) { mockDeviceLogs.length = 0; mockDeviceLogs.push(...data.mockDeviceLogs); }
      if (data.mockAccessLogs) { mockAccessLogs.length = 0; mockAccessLogs.push(...data.mockAccessLogs); }
      if (data.mockDoorStatus) { mockDoorStatus.length = 0; mockDoorStatus.push(...data.mockDoorStatus); }
      console.log(`[Offline Mock DB] Loaded ${mockMembers.length} members from mockDb.json`);
    } else {
      saveMockDb();
    }
  } catch (e) {
    console.error('Failed to load mock database:', e);
  }
};

loadMockDb();

// Real Firebase Init
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccountJsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let isFirebaseInitialized = false;

if (serviceAccountJsonRaw) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJsonRaw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    isFirebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully from JSON environment variable.');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin from JSON environment variable:', error);
  }
} else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    isFirebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully from file path.');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK from file path:', error);
  }
} else {
  console.log('No Firebase config file or JSON found. Using memory-backed Mock Database.');
}

export const getFirestoreDb = () => {
  return isFirebaseInitialized ? admin.firestore() : null;
};

let membersCache: any[] | null = null;

// Database helper functions (asynchronous to support Firestore)
export const db = {
  saveMockDb: () => {
    saveMockDb();
  },
  invalidateMembersCache: () => {
    membersCache = null;
  },

  getMembers: async (): Promise<any[]> => {
    if (membersCache) {
      return membersCache;
    }
    const firestore = getFirestoreDb();
    if (firestore) {
      try {
        // Fetch both collections in parallel for maximum speed
        const [membersSnap, usersSnap] = await Promise.all([
          firestore.collection('members').get(),
          firestore.collection('users').where('role', '==', 'member').get()
        ]);

        const membersList = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const memberUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        const existingUids = new Set(membersList.map(m => m.id));
        const newMembersToCreate: any[] = [];

        for (const u of memberUsers) {
          if (!existingUids.has(u.id)) {
            // Provision a default member profile matching this User Auth record
            const currentYear = new Date().getFullYear();
            const prefix = `AZ-${currentYear}-`;
            
            const count = membersList.length + newMembersToCreate.length + 1;
            const memberId = `${prefix}${String(count).padStart(4, '0')}`;

            const defaultMember = {
              memberId,
              uid: u.id,
              name: u.name || 'Gym Member',
              phone: (u as any).phone || '9876543210',
              email: (u as any).email || '',
              plan: 'Monthly',
              joinDate: (u as any).createdAt ? (u as any).createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
              expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'active',
              branch: (u as any).branch || 'Mohali, Punjab',
              trainer: '',
              gender: 'Male',
              age: 25,
              weight: 70,
              height: 170,
              bmi: 24.2,
              bloodGroup: 'O+',
              emergencyContact: '',
              maritalStatus: 'Single',
              anniversaryDate: '',
              birthdayDate: '',
              medicalConditions: '',
              fitnessGoal: 'General Fitness',
              occupation: '',
              address: '',
              avatarUrl: (u as any).avatar || '',
              biometricId: '',
              daysLeft: 30,
              attendanceCount: 0,
              attendanceStreak: 0,
              streak: 1,
              password: '1234567',
              fingerprintStatus: 'none',
              biometricEnrolled: false
            };
            
            newMembersToCreate.push({ id: u.id, data: defaultMember });
            membersList.push({ id: u.id, ...defaultMember });
          }
        }

        // Commit missing profiles in background so we don't add latency to the API request
        if (newMembersToCreate.length > 0) {
          const batch = firestore.batch();
          newMembersToCreate.forEach(m => {
            const docRef = firestore.collection('members').doc(m.id);
            batch.set(docRef, m.data);
          });
          batch.commit()
            .then(() => console.log(`[Self-Healing] Successfully auto-provisioned ${newMembersToCreate.length} missing member profiles.`))
            .catch(err => console.error('[Self-Healing] Failed to commit auto-provisioned members batch:', err));
        }

        membersCache = membersList;
        return membersCache;
      } catch (error) {
        console.error('Error fetching/healing members:', error);
        // fallback to whatever is loaded in cache or empty
        return membersCache || [];
      }
    }
    return mockMembers;
  },

  addMember: async (member: any): Promise<any> => {
    const firestore = getFirestoreDb();
    
    // Auto-generate sequential Member ID (AZ-2026-XXXX)
    const currentYear = new Date().getFullYear();
    const prefix = `AZ-${currentYear}-`;
    let nextNum = 1;
    
    // Since we want accurate IDs, query Firestore or mockMembers
    const azIds: string[] = [];
    if (firestore) {
      const snap = await firestore.collection('members').get();
      snap.docs.forEach(d => {
        const id = d.data().memberId;
        if (id && id.startsWith(prefix)) azIds.push(id);
      });
    } else {
      mockMembers.forEach(m => {
        const id = m.memberId;
        if (id && id.startsWith(prefix)) azIds.push(id);
      });
    }

    if (azIds.length > 0) {
      const nums = azIds.map(id => {
        const parts = id.split('-');
        return parseInt(parts[2], 10) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    
    const memberId = `${prefix}${String(nextNum).padStart(4, '0')}`;

    const newMember = {
      ...member,
      memberId,
      daysLeft: Number(member.daysLeft) || 30,
      attendanceCount: Number(member.attendanceCount) || 0,
      avatar: member.avatar || '',
      streak: Number(member.streak) || 1,
      goalWeight: member.weight ? member.weight - 5 : 70,
      attendancePercent: Number(member.attendancePercent) || 100,
      referralCode: member.name.substring(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900)
    };

    if (firestore) {
      const docId = member.uid || firestore.collection('members').doc().id;
      await firestore.collection('members').doc(docId).set(newMember);
      const added = { id: docId, ...newMember };
      if (membersCache) {
        membersCache.push(added);
      } else {
        membersCache = null; // force fetch next time
      }
      return added;
    }

    const docId = member.uid || ('m' + (mockMembers.length + 1));
    const finalMember = { id: docId, ...newMember };
    mockMembers.push(finalMember);
    return finalMember;
  },

  updateMember: async (id: string, updates: any): Promise<any> => {
    const firestore = getFirestoreDb();
    
    // Automatically recalculate expiryDate if plan is updated
    if (updates.plan && !updates.expiryDate) {
      let days = 30; // default 1 MONTH
      const p = updates.plan.toUpperCase();
      if (p.includes('SEMI-ANNUAL') || p.includes('SEMI ANNUAL') || p.includes('6 MONTH')) {
        days = 180;
      } else if (p.includes('ANNUAL') || p.includes('YEAR')) {
        days = 365;
      } else if (p.includes('3 MONTH') || p.includes('2+1') || p.includes('QUARTERLY')) {
        days = 90;
      }
      
      updates.expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    if (firestore) {
      await firestore.collection('members').doc(id).update(updates);
      const doc = await firestore.collection('members').doc(id).get();
      const updated = { id: doc.id, ...doc.data() };
      if (membersCache) {
        membersCache = membersCache.map(m => m.id === id ? updated : m);
      }
      return updated;
    }

    const idx = mockMembers.findIndex(m => m.id === id);
    if (idx !== -1) {
      mockMembers[idx] = { ...mockMembers[idx], ...updates };
      return mockMembers[idx];
    }
    return null;
  },

  deleteMember: async (id: string): Promise<boolean> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('members').doc(id).delete();
      if (membersCache) {
        membersCache = membersCache.filter(m => m.id !== id);
      }
      return true;
    }

    mockMembers = mockMembers.filter(m => m.id !== id);
    return true;
  },

  getAttendance: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      // Use attendance_logs and limit to 150 to avoid massive reads
      const snapshot = await firestore.collection('attendance_logs').orderBy('checkIn', 'desc').limit(150).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockAttendance;
  },

  getAttendanceSummary: async (memberId: string): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const doc = await firestore.collection('attendance_summary').doc(memberId).get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
      return null;
    }
    return null;
  },

  getDashboardAnalytics: async (): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const doc = await firestore.collection('analytics').doc('dashboard').get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
      return { totalMembers: 0, todayAttendance: 0, activeMembers: 0, revenue: 0 };
    }
    return { totalMembers: 0, todayAttendance: 0, activeMembers: 0, revenue: 0 };
  },

  addAttendance: async (log: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const presenceRef = firestore.collection('gym_presence').doc(log.memberId);
      const presenceDoc = await presenceRef.get();
      
      let isDuplicate = false;
      if (presenceDoc.exists) {
        const pData = presenceDoc.data();
        if (pData?.inside === true) {
           isDuplicate = true;
           // ONLY update lastPunch
           await presenceRef.update({
             lastPunch: log.checkIn || new Date().toISOString()
           });
        }
      }

      if (isDuplicate) {
         // Log the duplicate attempt so the frontend popup can notify the user
         const docRef = await firestore.collection('attendance_logs').add({
           ...log,
           status: 'duplicate',
           createdAt: new Date().toISOString()
         });

         await firestore.collection('punch_history').add({
           memberId: log.memberId,
           memberName: log.memberName || 'Unknown',
           deviceId: log.deviceId || 'unknown',
           branchId: log.branch || 'unknown',
           punchTime: log.checkIn || new Date().toISOString(),
           punchType: log.method || 'biometric',
           isDuplicatePunch: true,
           isInside: true,
           sessionId: presenceDoc.id
         });

         const analyticsRef = firestore.collection('analytics').doc('dashboard');
         await analyticsRef.set({
           todayTotalPunches: admin.firestore.FieldValue.increment(1),
           duplicatePunchesToday: admin.firestore.FieldValue.increment(1)
         }, { merge: true });

         return { id: docRef.id, status: 'duplicate', ...log };
      }

      // Not a duplicate: Add to presence
      const checkInTime = log.checkIn || new Date().toISOString();
      const expectedExit = new Date(new Date(checkInTime).getTime() + 60 * 60 * 1000).toISOString();
      await presenceRef.set({
        memberId: log.memberId,
        memberName: log.memberName || 'Unknown',
        inside: true,
        entryTime: checkInTime,
        expectedExit: expectedExit,
        lastPunch: checkInTime,
        branch: log.branch || 'Mohali, Punjab',
        trainer: log.trainer || null
      });

      // 1. Save temporary log in attendance_logs
      // Adding status: 'granted' to trigger frontend UI popups
      const docRef = await firestore.collection('attendance_logs').add({
        ...log,
        status: log.status || 'granted',
        createdAt: new Date().toISOString()
      });

      // Log to punch_history
      await firestore.collection('punch_history').add({
        memberId: log.memberId,
        memberName: log.memberName || 'Unknown',
        deviceId: log.deviceId || 'unknown',
        branchId: log.branch || 'unknown',
        punchTime: checkInTime,
        punchType: log.method || 'biometric',
        isDuplicatePunch: false,
        isInside: true,
        sessionId: presenceRef.id
      });
      
      // 2. Update attendance_summary
      const summaryRef = firestore.collection('attendance_summary').doc(log.memberId);
      const summaryDoc = await summaryRef.get();
      if (summaryDoc.exists) {
        await summaryRef.update({
          totalAttendance: admin.firestore.FieldValue.increment(1),
          monthlyAttendance: admin.firestore.FieldValue.increment(1),
          weeklyAttendance: admin.firestore.FieldValue.increment(1),
          todayAttendance: 'Present',
          lastAttendance: checkInTime.split('T')[0],
          lastPunchTime: checkInTime
        });
      } else {
        await summaryRef.set({
          totalAttendance: 1,
          monthlyAttendance: 1,
          weeklyAttendance: 1,
          todayAttendance: 'Present',
          attendanceStreak: 1,
          lastAttendance: checkInTime.split('T')[0],
          lastPunchTime: checkInTime
        });
      }

      // 3. Update dashboard analytics
      const analyticsRef = firestore.collection('analytics').doc('dashboard');
      await analyticsRef.set({
        todayAttendance: admin.firestore.FieldValue.increment(1),
        todayTotalPunches: admin.firestore.FieldValue.increment(1),
        todayUniqueMembers: admin.firestore.FieldValue.increment(1)
      }, { merge: true });

      // 4. Update member attendanceCount
      const memberRef = firestore.collection('members').doc(log.memberId);
      await memberRef.update({
        attendanceCount: admin.firestore.FieldValue.increment(1)
      }).catch(e => console.error('Failed to update member attendance count', e));

      return { id: docRef.id, ...log, status: 'granted' };
    }

    const newLog = {
      ...log,
      id: 'a' + (mockAttendance.length + 1)
    };
    mockAttendance.unshift(newLog);
    return newLog;
  },

  checkoutAttendance: async (id: string): Promise<any> => {
    const checkOutTime = new Date().toISOString();
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('attendance_logs').doc(id).update({ checkOut: checkOutTime });
      const doc = await firestore.collection('attendance_logs').doc(id).get();
      return { id: doc.id, ...doc.data() };
    }

    const log = mockAttendance.find(a => a.id === id);
    if (log) {
      log.checkOut = checkOutTime;
      return log;
    }
    return null;
  },

  autoCheckoutExpired: async (): Promise<void> => {
    const firestore = getFirestoreDb();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (firestore) {
      try {
        const snapshot = await firestore.collection('attendance_logs')
          .where('checkOut', '==', null)
          .get();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (data.checkIn) {
            let checkInDate: Date;
            if (typeof data.checkIn === 'string') {
              checkInDate = new Date(data.checkIn);
            } else if (data.checkIn && typeof data.checkIn.toDate === 'function') {
              checkInDate = data.checkIn.toDate();
            } else if (data.checkIn && data.checkIn.seconds !== undefined) {
              checkInDate = new Date(data.checkIn.seconds * 1000);
            } else {
              checkInDate = new Date(data.checkIn);
            }

            // Fallback for invalid checkIn dates (e.g. malformed or [object Object] strings)
            if (isNaN(checkInDate.getTime())) {
              if (data.createdAt) {
                checkInDate = new Date(data.createdAt);
              } else {
                checkInDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // assume 2 hours ago
              }
            }

            if (!isNaN(checkInDate.getTime()) && checkInDate < oneHourAgo) {
              const checkOutTime = new Date(checkInDate.getTime() + 60 * 60 * 1000).toISOString();
              await firestore.collection('attendance_logs').doc(doc.id).update({
                checkOut: checkOutTime,
                autoCheckedOut: true
              });
              console.log(`[Auto-Checkout] Member ${data.memberName || 'Unknown'} (ID: ${data.memberId || 'N/A'}) checked out automatically.`);
            }
          }
        }
      } catch (err) {
        console.error('[Auto-Checkout] Firestore auto-checkout query failed:', err);
      }
    } else {
      const now = Date.now();
      mockAttendance.forEach(a => {
        if (a.checkIn && !a.checkOut) {
          const checkInTime = new Date(a.checkIn).getTime();
          if (!isNaN(checkInTime) && (now - checkInTime) > 60 * 60 * 1000) {
            a.checkOut = new Date(checkInTime + 60 * 60 * 1000).toISOString();
            a.autoCheckedOut = true;
            console.log(`[Auto-Checkout Mock] Member ${a.memberName || 'Unknown'} checked out automatically.`);
          }
        }
      });
    }
  },

  getPayments: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('payments').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockPayments;
  },

  addPayment: async (payment: any): Promise<any> => {
    const newPayment = {
      ...payment,
      invoice: 'INV-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString().split('T')[0],
      gst: Math.floor(payment.amount * 0.18)
    };

    const firestore = getFirestoreDb();
    if (firestore) {
      const docRef = await firestore.collection('payments').add(newPayment);
      return { id: docRef.id, ...newPayment };
    }

    newPayment.id = 'p' + (mockPayments.length + 1);
    newPayment.invoice = 'INV-00' + (mockPayments.length + 1);
    mockPayments.unshift(newPayment);
    return newPayment;
  },

  getWorkoutsByMember: async (memberId: string): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('workouts').where('memberId', '==', memberId).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockWorkouts.filter(w => w.memberId === memberId);
  },

  saveWorkout: async (workout: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('workouts').where('memberId', '==', workout.memberId).get();
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await firestore.collection('workouts').doc(docId).update(workout);
        return { id: docId, ...workout };
      } else {
        const docRef = await firestore.collection('workouts').add(workout);
        return { id: docRef.id, ...workout };
      }
    }

    const idx = mockWorkouts.findIndex(w => w.memberId === workout.memberId);
    if (idx !== -1) {
      mockWorkouts[idx] = { ...mockWorkouts[idx], ...workout };
      return mockWorkouts[idx];
    } else {
      const newW = { ...workout, id: 'w_' + Date.now() };
      mockWorkouts.push(newW);
      return newW;
    }
  },

  getDietByMember: async (memberId: string): Promise<any | null> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('diets').where('memberId', '==', memberId).get();
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return mockDietPlans.find(d => d.memberId === memberId) || null;
  },

  saveDiet: async (diet: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('diets').where('memberId', '==', diet.memberId).get();
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await firestore.collection('diets').doc(docId).update(diet);
        return { id: docId, ...diet };
      } else {
        const docRef = await firestore.collection('diets').add(diet);
        return { id: docRef.id, ...diet };
      }
    }

    const idx = mockDietPlans.findIndex(d => d.memberId === diet.memberId);
    if (idx !== -1) {
      mockDietPlans[idx] = { ...mockDietPlans[idx], ...diet };
      return mockDietPlans[idx];
    } else {
      const newD = { ...diet, id: 'd_' + Date.now() };
      mockDietPlans.push(newD);
      return newD;
    }
  },

  approveDiet: async (id: string): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('diets').doc(id).update({ status: 'approved' });
      const doc = await firestore.collection('diets').doc(id).get();
      return { id: doc.id, ...doc.data() };
    }
    const idx = mockDietPlans.findIndex(d => d.id === id);
    if (idx !== -1) {
      mockDietPlans[idx].status = 'approved';
      return mockDietPlans[idx];
    }
    return null;
  },

  deleteDiet: async (id: string): Promise<boolean> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('diets').doc(id).delete();
      return true;
    }
    const idx = mockDietPlans.findIndex(d => d.id === id);
    if (idx !== -1) {
      mockDietPlans.splice(idx, 1);
      return true;
    }
    return false;
  },

  getCheatMealRequests: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('cheatMealRequests').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockCheatMealRequests;
  },

  addCheatMealRequest: async (request: any): Promise<any> => {
    const firestore = getFirestoreDb();
    const newReq = {
      ...request,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    if (firestore) {
      const docRef = await firestore.collection('cheatMealRequests').add(newReq);
      return { id: docRef.id, ...newReq };
    }
    const id = 'cm_' + Date.now();
    const finalReq = { id, ...newReq };
    mockCheatMealRequests.unshift(finalReq);
    return finalReq;
  },

  updateCheatMealRequest: async (id: string, updates: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('cheatMealRequests').doc(id).update(updates);
      const doc = await firestore.collection('cheatMealRequests').doc(id).get();
      return { id: doc.id, ...doc.data() };
    }
    const idx = mockCheatMealRequests.findIndex(r => r.id === id);
    if (idx !== -1) {
      mockCheatMealRequests[idx] = { ...mockCheatMealRequests[idx], ...updates };
      return mockCheatMealRequests[idx];
    }
    return null;
  },

  getDailyDietLog: async (memberId: string, date: string): Promise<any | null> => {
    const firestore = getFirestoreDb();
    const docId = `${memberId}_${date}`;
    if (firestore) {
      const doc = await firestore.collection('dailyDietLogs').doc(docId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    }
    return mockDailyDietLogs.find(l => l.memberId === memberId && l.date === date) || null;
  },

  saveDailyDietLog: async (log: any): Promise<any> => {
    const firestore = getFirestoreDb();
    const docId = `${log.memberId}_${log.date}`;
    if (firestore) {
      await firestore.collection('dailyDietLogs').doc(docId).set(log, { merge: true });
      const doc = await firestore.collection('dailyDietLogs').doc(docId).get();
      return { id: doc.id, ...doc.data() };
    }
    const idx = mockDailyDietLogs.findIndex(l => l.memberId === log.memberId && l.date === log.date);
    if (idx !== -1) {
      mockDailyDietLogs[idx] = { ...mockDailyDietLogs[idx], ...log };
      return mockDailyDietLogs[idx];
    } else {
      const newLog = { id: docId, ...log };
      mockDailyDietLogs.push(newLog);
      return newLog;
    }
  },

  getProgressLogsByMember: async (memberId: string): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('progressLogs').where('memberId', '==', memberId).get();
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      return logs.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      });
    }
    return mockProgressLogs.filter(p => p.memberId === memberId);
  },

  addProgressLog: async (log: any): Promise<any> => {
    const newLog = {
      ...log,
      date: new Date().toISOString().split('T')[0]
    };

    const firestore = getFirestoreDb();
    if (firestore) {
      const docRef = await firestore.collection('progressLogs').add(newLog);
      // Also update member current weight and BMI in member store
      await firestore.collection('members').doc(log.memberId).update({
        weight: log.weight,
        bmi: log.bmi
      });
      return { id: docRef.id, ...newLog };
    }

    newLog.id = 'pr_' + Date.now();
    mockProgressLogs.push(newLog);
    
    // update mock member
    const idx = mockMembers.findIndex(m => m.id === log.memberId);
    if (idx !== -1) {
      mockMembers[idx].weight = log.weight;
      mockMembers[idx].bmi = log.bmi;
    }

    return newLog;
  },

  getChats: async (userA: string, userB: string): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('chatMessages').orderBy('timestamp', 'asc').limit(200).get();
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return all.filter((c: any) => 
        (c.from === userA && c.to === userB) || (c.from === userB && c.to === userA)
      );
    }
    return mockChatMessages.filter(
      c => (c.from === userA && c.to === userB) || (c.from === userB && c.to === userA)
    );
  },

  addChatMessage: async (msg: any): Promise<any> => {
    const newMsg = {
      ...msg,
      timestamp: new Date().toISOString()
    };

    const firestore = getFirestoreDb();
    if (firestore) {
      const docRef = await firestore.collection('chatMessages').add(newMsg);
      return { id: docRef.id, ...newMsg };
    }

    newMsg.id = 'c_' + Date.now();
    mockChatMessages.push(newMsg);
    return newMsg;
  },

  getReferrals: async (memberId: string): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('referrals').where('memberId', '==', memberId).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockReferrals.filter(r => r.memberId === memberId);
  },

  addReferral: async (ref: any): Promise<any> => {
    const newRef = {
      ...ref,
      date: new Date().toISOString().split('T')[0],
      status: 'invited',
      reward: 'Pending signup'
    };

    const firestore = getFirestoreDb();
    if (firestore) {
      const docRef = await firestore.collection('referrals').add(newRef);
      return { id: docRef.id, ...newRef };
    }

    newRef.id = 'ref_' + Date.now();
    mockReferrals.push(newRef);
    return newRef;
  },

  getDevices: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('devices').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockDevices;
  },

  addDevice: async (device: any): Promise<any> => {
    const firestore = getFirestoreDb();
    const newDevice = {
      ...device,
      enabled: device.enabled !== undefined ? device.enabled : true,
      lastSync: device.lastSync || null,
      status: device.status || 'offline',
      connectionHealth: device.connectionHealth !== undefined ? device.connectionHealth : 100
    };
    if (firestore) {
      const docRef = await firestore.collection('devices').add(newDevice);
      return { id: docRef.id, ...newDevice };
    }
    const id = 'dev_' + Date.now();
    const finalDevice = { id, ...newDevice };
    mockDevices.push(finalDevice);
    return finalDevice;
  },

  updateDevice: async (id: string, updates: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('devices').doc(id).update(updates);
      const doc = await firestore.collection('devices').doc(id).get();
      return { id: doc.id, ...doc.data() };
    }
    const idx = mockDevices.findIndex(d => d.id === id);
    if (idx !== -1) {
      mockDevices[idx] = { ...mockDevices[idx], ...updates };
      return mockDevices[idx];
    }
    return null;
  },

  deleteDevice: async (id: string): Promise<boolean> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('devices').doc(id).delete();
      return true;
    }
    mockDevices = mockDevices.filter(d => d.id !== id);
    return true;
  },

  addDeviceLog: async (log: any): Promise<any> => {
    const firestore = getFirestoreDb();
    const newLog = {
      ...log,
      timestamp: new Date().toISOString()
    };
    if (firestore) {
      const docRef = await firestore.collection('deviceLogs').add(newLog);
      return { id: docRef.id, ...newLog };
    }
    newLog.id = 'log_' + Date.now();
    mockDeviceLogs.unshift(newLog);
    return newLog;
  },

  getDeviceLogs: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('deviceLogs').orderBy('timestamp', 'desc').limit(50).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockDeviceLogs;
  },

  getAccessLogs: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('accessLogs').orderBy('timestamp', 'desc').limit(50).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockAccessLogs;
  },

  getDoorStatus: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('doorStatus').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockDoorStatus;
  },

  getTrainers: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('trainers').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockTrainers;
  },

  addTrainer: async (trainer: any): Promise<any> => {
    const firestore = getFirestoreDb();
    const newTrainer = {
      ...trainer,
      rating: Number(trainer.rating) || 4.8,
      members: Number(trainer.members) || 0,
      sessions: Number(trainer.sessions) || 0,
      experience: Number(trainer.experience) || 1,
      salary: Number(trainer.salary) || 30000,
      status: trainer.status || 'active',
      certifications: Array.isArray(trainer.certifications) ? trainer.certifications : 
                      typeof trainer.certifications === 'string' ? trainer.certifications.split(',').map((c: string) => c.trim()) : []
    };
    if (firestore) {
      const docRef = await firestore.collection('trainers').add(newTrainer);
      return { id: docRef.id, ...newTrainer };
    }
    const id = 't' + (mockTrainers.length + 1);
    const finalTrainer = { id, ...newTrainer };
    mockTrainers.push(finalTrainer);
    return finalTrainer;
  },

  updateTrainer: async (id: string, updates: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (updates.certifications && typeof updates.certifications === 'string') {
      updates.certifications = updates.certifications.split(',').map((c: string) => c.trim());
    }
    if (firestore) {
      await firestore.collection('trainers').doc(id).update(updates);
      const doc = await firestore.collection('trainers').doc(id).get();
      return { id: doc.id, ...doc.data() };
    }
    const idx = mockTrainers.findIndex(t => t.id === id);
    if (idx !== -1) {
      mockTrainers[idx] = { ...mockTrainers[idx], ...updates };
      return mockTrainers[idx];
    }
    return null;
  },

  deleteTrainer: async (id: string): Promise<boolean> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('trainers').doc(id).delete();
      return true;
    }
    const idx = mockTrainers.findIndex(t => t.id === id);
    if (idx !== -1) {
      mockTrainers.splice(idx, 1);
      return true;
    }
    return false;
  },

  getSmtpConfig: async (): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const doc = await firestore.collection('system_config').doc('smtp').get();
      if (doc.exists) return doc.data();
    }
    const configPath = './smtp_config.json';
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (e) {}
    }
    return {
      host: 'smtp.gmail.com',
      port: '587',
      secure: false,
      user: '',
      pass: '',
      fromName: 'Alpha Zone Gym',
      fromEmail: 'noreply@alphagym.com',
      triggers: {
        welcome: true,
        expiry7: true,
        expiry3: true,
        payment: true,
        expired: false
      }
    };
  },

  saveSmtpConfig: async (config: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('system_config').doc('smtp').set(config, { merge: true });
    }
    const configPath = './smtp_config.json';
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {}
    return config;
  },

  getPlans: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('plans').get();
      if (snapshot.empty) {
        // Seed default plans
        for (const plan of mockPlans) {
          await firestore.collection('plans').doc(plan.id).set(plan);
        }
        return mockPlans;
      }
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockPlans;
  },

  addPlan: async (plan: any): Promise<any> => {
    const newPlan = {
      ...plan,
      id: plan.id || 'p_' + Date.now()
    };
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('plans').doc(newPlan.id).set(newPlan);
      return newPlan;
    }
    mockPlans.push(newPlan);
    return newPlan;
  },

  updatePlan: async (id: string, updates: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('plans').doc(id).update(updates);
      const doc = await firestore.collection('plans').doc(id).get();
      return { id: doc.id, ...doc.data() };
    }
    const idx = mockPlans.findIndex(p => p.id === id);
    if (idx !== -1) {
      mockPlans[idx] = { ...mockPlans[idx], ...updates };
      return mockPlans[idx];
    }
    return null;
  },

  deletePlan: async (id: string): Promise<boolean> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('plans').doc(id).delete();
      return true;
    }
    const idx = mockPlans.findIndex(p => p.id === id);
    if (idx !== -1) {
      mockPlans.splice(idx, 1);
      return true;
    }
    return false;
  },

  getMigrations: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snap = await firestore.collection('migrations').orderBy('timestamp', 'desc').get();
      return snap.docs.map(doc => doc.data());
    }
    return mockMigrations;
  },

  addMigration: async (migration: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('migrations').doc(migration.sessionId).set(migration);
      return migration;
    }
    mockMigrations.push(migration);
    return migration;
  },

  rollbackMockMigration: async (uids: string[], sessionId: string): Promise<void> => {
    // Remove from mockMembers
    mockMembers = mockMembers.filter(m => !uids.includes(m.id || m.uid));
    
    // Remove from mockPayments
    mockPayments = mockPayments.filter(p => !uids.includes(p.memberId));
    
    // Remove from mockAttendance
    mockAttendance = mockAttendance.filter(a => !uids.includes(a.memberId));

    const mig = mockMigrations.find(m => m.sessionId === sessionId);
    if (mig) {
      mig.status = 'rolled_back';
      mig.rolledBackAt = new Date().toISOString();
    }
  },

  purgeMocks: async (): Promise<any> => {
    mockMembers = [];
    mockAttendance = [];
    mockPayments = [];
    mockWorkouts = [];
    mockDietPlans = [];
    mockCheatMealRequests = [];
    mockDailyDietLogs = [];
    mockProgressLogs = [];
    mockChatMessages = [];
    mockReferrals = [];
    mockMigrations = [];
    membersCache = null;
    return {
      members: 0,
      attendance: 0,
      payments: 0,
      workouts: 0,
      diets: 0,
      cheatMeals: 0,
      logs: 0,
      referrals: 0,
      migrations: 0
    };
  }
};

// Seed/provision default demo accounts on backend boot
export const provisionAdminAccounts = async () => {
  if (!isFirebaseInitialized) return;
  const auth = admin.auth();
  const firestore = admin.firestore();

  const demoAccounts = [
    { role: 'gym_owner', label: 'Gym Owner', email: 'owner@alphagym.com', password: '1234567', name: 'Alpha Gym Owner' },
    { role: 'super_admin', label: 'Super Admin', email: 'superadmin@alphagym.com', password: 'admin123', name: 'Super Admin' },
    { role: 'branch_manager', label: 'Manager', email: 'manager@alphagym.com', password: 'manager123', name: 'Priya Patel' },
    { role: 'trainer', label: 'Trainer', email: 'trainer@alphagym.com', password: 'trainer123', name: 'Karan Verma' },
    { role: 'receptionist', label: 'Receptionist', email: 'reception@alphagym.com', password: 'recep123', name: 'Ravi Kumar' },
  ];

  console.log('Provisioning Firebase Auth and Firestore users...');

  for (const acc of demoAccounts) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(acc.email);
        console.log(`User already exists in Auth: ${acc.email} (${userRecord.uid})`);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: acc.email,
            password: acc.password,
            displayName: acc.name,
            emailVerified: true
          });
          console.log(`Successfully created Auth user: ${acc.email}`);
        } else {
          throw err;
        }
      }

      // Ensure profile exists in Firestore /users collection
      const userRef = firestore.collection('users').doc(userRecord.uid);
      const doc = await userRef.get();
      if (!doc.exists) {
        await userRef.set({
          uid: userRecord.uid,
          name: acc.name,
          email: acc.email,
          role: acc.role,
          branch: 'Mohali, Punjab',
          gymId: 'gym_001',
          createdAt: new Date().toISOString()
        });
        console.log(`Successfully created Firestore profile for: ${acc.email}`);
      } else {
        // update role if necessary
        await userRef.update({ role: acc.role });
      }
    } catch (error) {
      console.error(`Error provisioning user ${acc.email}:`, error);
    }
  }
};

export { admin, isFirebaseInitialized };
