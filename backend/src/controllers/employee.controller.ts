import { Request, Response } from 'express';
import { admin, isFirebaseInitialized } from '../firebase';

export const getEmployees = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseInitialized || !admin) {
      return res.status(500).json({ error: 'Firebase is not initialized' });
    }
    const firestore = admin.firestore();
    const snap = await firestore.collection('employees').get();
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
