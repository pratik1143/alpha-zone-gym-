import { Request, Response } from 'express';
import { admin, isFirebaseInitialized } from '../firebase';

const defaultEmployeesList = [
  {
    name: 'Sourav Arora',
    phone: '7973649709',
    email: '',
    role: 'Trainer',
    branch: 'Alpha zone gym',
    emergencyContact: '',
    address: '',
    biometricId: 10021,
    todayStatus: 'Absent',
    currentStatus: 'Outside',
    lastPunch: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Deepak',
    phone: '8196852386',
    email: '',
    role: 'Trainer',
    branch: 'Alpha zone gym',
    emergencyContact: '',
    address: '',
    biometricId: 10012,
    todayStatus: 'Absent',
    currentStatus: 'Outside',
    lastPunch: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Kuldeep',
    phone: '8629841471',
    email: 'kuldeep86298@gmail.com',
    role: 'Trainer',
    branch: 'Alpha zone gym',
    emergencyContact: '',
    address: '',
    biometricId: 10009,
    todayStatus: 'Absent',
    currentStatus: 'Outside',
    lastPunch: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Arshdeep Singh',
    phone: '9915866576',
    email: '',
    role: 'Trainer',
    branch: 'Alpha zone gym',
    emergencyContact: '',
    address: '',
    biometricId: 10008,
    todayStatus: 'Absent',
    currentStatus: 'Outside',
    lastPunch: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Achhar Pal',
    phone: '9592691190',
    email: '',
    role: 'Trainer',
    branch: 'Alpha zone gym',
    emergencyContact: '',
    address: 'kaimbwala chd',
    biometricId: 10005,
    todayStatus: 'Absent',
    currentStatus: 'Outside',
    lastPunch: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Abc',
    phone: '7884977777',
    email: '',
    role: 'Trainer',
    branch: 'Alpha zone gym',
    emergencyContact: '',
    address: '',
    biometricId: 10003,
    todayStatus: 'Absent',
    currentStatus: 'Outside',
    lastPunch: null,
    createdAt: new Date().toISOString()
  }
];

export const getEmployees = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase is not initialized' });
    }
    const firestore = admin.firestore();
    const snap = await firestore.collection('employees').get();
    if (snap.empty) {
      console.log('[Auto-Seed] Firestore employees empty. Seeding default employees...');
      const batch = firestore.batch();
      const seeded: any[] = [];
      for (const emp of defaultEmployeesList) {
        const docRef = firestore.collection('employees').doc();
        batch.set(docRef, emp);
        seeded.push({ id: docRef.id, ...emp });
      }
      await batch.commit().catch(e => console.error('[Auto-Seed] Failed to seed employees:', e));
      return res.json(seeded);
    }
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase is not initialized' });
    }
    const firestore = admin.firestore();
    const employeeData = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Auto generate biometricId if not provided or set to 'auto'
    if (!employeeData.biometricId || employeeData.biometricId === 'auto') {
      const snap = await firestore.collection('employees').get();
      let maxId = 500; // Employees start from 500 to keep separate from members
      snap.forEach(doc => {
        const bid = Number(doc.data().biometricId);
        if (!isNaN(bid) && bid > maxId) {
          maxId = bid;
        }
      });
      employeeData.biometricId = maxId + 1;
    } else {
      employeeData.biometricId = Number(employeeData.biometricId);
    }

    const ref = await firestore.collection('employees').add(employeeData);
    res.status(201).json({ id: ref.id, ...employeeData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase is not initialized' });
    }
    const { id } = req.params;
    const firestore = admin.firestore();
    
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    if (updates.biometricId) {
      updates.biometricId = Number(updates.biometricId);
    }

    await firestore.collection('employees').doc(id).update(updates);
    const updatedDoc = await firestore.collection('employees').doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase is not initialized' });
    }
    const { id } = req.params;
    const firestore = admin.firestore();
    await firestore.collection('employees').doc(id).delete();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeAttendance = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase is not initialized' });
    }
    const firestore = admin.firestore();
    const snap = await firestore.collection('employeeAttendance').orderBy('timestamp', 'desc').get();
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
