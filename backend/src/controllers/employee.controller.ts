import { Request, Response } from 'express';
import { admin, isFirebaseInitialized } from '../firebase';

const defaultEmployeesList = [
  {
    name: 'Ramesh Kumar',
    phone: '9876543210',
    email: 'ramesh@alphagym.com',
    role: 'Manager',
    branch: 'Mohali, Punjab',
    emergencyContact: '9876543211',
    address: 'Phase 3B2, Mohali',
    biometricId: 501,
    todayStatus: 'Present',
    currentStatus: 'Inside',
    lastPunch: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    name: 'Karan Verma',
    phone: '9988776655',
    email: 'karan@alphagym.com',
    role: 'Trainer',
    branch: 'Mohali, Punjab',
    emergencyContact: '9988776600',
    address: 'Sector 70, Mohali',
    biometricId: 502,
    todayStatus: 'Present',
    currentStatus: 'Inside',
    lastPunch: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    name: 'Sneha Kapoor',
    phone: '9988776656',
    email: 'sneha@alphagym.com',
    role: 'Trainer',
    branch: 'Mohali, Punjab',
    emergencyContact: '9988776601',
    address: 'Sector 68, Mohali',
    biometricId: 503,
    todayStatus: 'Absent',
    currentStatus: 'Outside',
    lastPunch: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Priya Singh',
    phone: '9877407661',
    email: 'priya.reception@alphagym.com',
    role: 'Reception',
    branch: 'Mohali, Punjab',
    emergencyContact: '9877407600',
    address: 'Sector 71, Mohali',
    biometricId: 504,
    todayStatus: 'Present',
    currentStatus: 'Inside',
    lastPunch: new Date().toISOString(),
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
