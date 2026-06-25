import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

// Preloaded Mock Data sets for fallback mode
export let mockBranches = [
  { id: 'b1', name: 'Alpha Gym - Mohali', city: 'Mohali', members: 0, revenue: 0, attendance: 0, status: 'active', manager: 'Karan Verma', capacity: 500 },
];

export let mockMembers: any[] = [];
export let mockTrainers = [
  { id: 't1', name: 'Karan Verma', email: 'karan@alphagym.com', phone: '9988776655', specialization: 'Strength & Conditioning', experience: 6, rating: 4.9, branch: 'Mohali, Punjab', sessions: 12, salary: 45000, status: 'active', certifications: ['ACE', 'NASM', 'CPR'], photo: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?q=80&w=150', bio: 'Passionate about strength building and posture correction.', joiningDate: '2025-01-10', instagram: 'karan_conditioning', achievements: 'Gold medalist in Powerlifting 2024' },
  { id: 't2', name: 'Sneha Kapoor', email: 'sneha@alphagym.com', phone: '9988776656', specialization: 'Yoga & Flexibility', experience: 4, rating: 4.8, branch: 'Mohali, Punjab', sessions: 8, salary: 38000, status: 'active', certifications: ['RYT-200', 'ACE'], photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150', bio: 'Helping clients connect mind, body, and breath through Vinyasa flow.', joiningDate: '2025-03-15', instagram: 'sneha_yoga_flow', achievements: 'Trained over 500+ students in flex workshops' },
  { id: 't3', name: 'Dev Rana', email: 'dev@alphagym.com', phone: '9988776657', specialization: 'CrossFit & HIIT', experience: 8, rating: 4.7, branch: 'Mohali, Punjab', sessions: 15, salary: 52000, status: 'active', certifications: ['CrossFit L2', 'NASM', 'CPR'], photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150', bio: 'High-octane CrossFit coach specializing in functional output and speed work.', joiningDate: '2024-06-01', instagram: 'dev_rana_hiit', achievements: 'Represented state in CrossFit Open 2023' },
  { id: 't4', name: 'Riya Menon', email: 'riya@alphagym.com', phone: '9988776658', specialization: 'Weight Loss Specialist', experience: 5, rating: 4.6, branch: 'Mohali, Punjab', sessions: 18, salary: 41000, status: 'active', certifications: ['ACSM', 'Nutritionist'], photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150', bio: 'Combining tailored cardio programs with precise meal planning for fat loss.', joiningDate: '2025-02-12', instagram: 'riya_weightloss', achievements: 'Helped 150+ clients lose more than 15kg' },
  { id: 't5', name: 'Aakash Sharma', email: 'aakash@alphagym.com', phone: '9988776659', specialization: 'Bodybuilding', experience: 7, rating: 4.8, branch: 'Mohali, Punjab', sessions: 20, salary: 48000, status: 'active', certifications: ['IFBB', 'ACE', 'CPR'], photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150', bio: 'Hypertrophy coach focusing on mechanical tension and muscle symmetry.', joiningDate: '2024-11-20', instagram: 'aakash_bodybuilding', achievements: 'IFBB Pro card holder 2022' },
  { id: 't6', name: 'Rohit Sharma', email: 'rohit@alphagym.com', phone: '9988776650', specialization: 'Weight Loss Specialist', experience: 8, rating: 4.9, branch: 'Mohali, Punjab', sessions: 22, salary: 50000, status: 'active', certifications: ['ACE', 'CSCS', 'CPR'], photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150', bio: 'Certified weight loss coach with 8 years of experience. Expert in body composition changes.', joiningDate: '2024-05-10', instagram: 'rohit_sharma_coach', achievements: 'Best Weight Loss Coach award 2025' }
];

export let mockAttendance: any[] = [];
export let mockPayments: any[] = [];
export let mockWorkouts: any[] = [];
export let mockDietPlans: any[] = [];
export let mockCheatMealRequests: any[] = [];
export let mockDailyDietLogs: any[] = [];
export let mockProgressLogs: any[] = [];
export let mockChatMessages: any[] = [];
export let mockReferrals: any[] = [];

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

// Real Firebase Init
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let isFirebaseInitialized = false;

console.log('Firebase Init Debug: FIREBASE_SERVICE_ACCOUNT_KEY =', serviceAccountPath);
if (serviceAccountPath) {
  console.log('Firebase Init Debug: File exists =', fs.existsSync(serviceAccountPath));
}

if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    isFirebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK, falling back to mock database:', error);
  }
} else {
  console.log('No Firebase config file found. Using memory-backed Mock Database.');
}

const getFirestoreDb = () => {
  return isFirebaseInitialized ? admin.firestore() : null;
};

// Database helper functions (asynchronous to support Firestore)
export const db = {
  getMembers: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('members').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockMembers;
  },

  addMember: async (member: any): Promise<any> => {
    const firestore = getFirestoreDb();
    
    // Auto-generate sequential Member ID (AZ-2026-XXXX)
    const currentYear = new Date().getFullYear();
    const prefix = `AZ-${currentYear}-`;
    let nextNum = 1;
    
    if (firestore) {
      const snap = await firestore.collection('members').get();
      const azIds = snap.docs
        .map(d => d.data().memberId as string)
        .filter(id => id && id.startsWith(prefix));
      if (azIds.length > 0) {
        const nums = azIds.map(id => {
          const parts = id.split('-');
          return parseInt(parts[2], 10) || 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
    } else {
      const azIds = mockMembers
        .map(m => m.memberId as string)
        .filter(id => id && id.startsWith(prefix));
      if (azIds.length > 0) {
        const nums = azIds.map(id => {
          const parts = id.split('-');
          return parseInt(parts[2], 10) || 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
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
      return { id: docId, ...newMember };
    }

    const docId = member.uid || ('m' + (mockMembers.length + 1));
    const finalMember = { id: docId, ...newMember };
    mockMembers.push(finalMember);
    return finalMember;
  },

  updateMember: async (id: string, updates: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('members').doc(id).update(updates);
      const doc = await firestore.collection('members').doc(id).get();
      return { id: doc.id, ...doc.data() };
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
      return true;
    }

    mockMembers = mockMembers.filter(m => m.id !== id);
    return true;
  },

  getAttendance: async (): Promise<any[]> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await firestore.collection('attendance').orderBy('checkIn', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return mockAttendance;
  },

  addAttendance: async (log: any): Promise<any> => {
    const firestore = getFirestoreDb();
    if (firestore) {
      const docRef = await firestore.collection('attendance').add(log);
      return { id: docRef.id, ...log };
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
      await firestore.collection('attendance').doc(id).update({ checkOut: checkOutTime });
      const doc = await firestore.collection('attendance').doc(id).get();
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
        const snapshot = await firestore.collection('attendance')
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
              await firestore.collection('attendance').doc(doc.id).update({
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
