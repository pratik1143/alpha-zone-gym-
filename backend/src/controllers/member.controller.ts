import { Request, Response } from 'express';
import { db, admin, isFirebaseInitialized } from '../firebase';

export const getMembers = async (req: Request, res: Response) => {
  try {
    const list = await db.getMembers();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createMember = async (req: Request, res: Response) => {
  try {
    const { 
      name, phone, email, plan, branch, trainer, gender, age, weight, height, bmi, 
      joinDate, expiryDate, bloodGroup, emergencyContact, maritalStatus, anniversaryDate, 
      birthdayDate, medicalConditions, fitnessGoal, occupation, address, password, avatarUrl,
      biometricId
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and Phone are required' });
    }

    let uid = 'm' + Date.now();
    const loginEmail = email || `${phone}@alphagym.com`;

    if (isFirebaseInitialized && admin) {
      const authAdmin = admin.auth();
      const firestoreAdmin = admin.firestore();
      
      let userRecord;
      try {
        userRecord = await authAdmin.getUserByEmail(loginEmail);
        uid = userRecord.uid;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          userRecord = await authAdmin.createUser({
            email: loginEmail,
            password: password || '1234567',
            displayName: name,
            emailVerified: true
          });
          uid = userRecord.uid;
        } else {
          throw err;
        }
      }

      // Ensure profile exists in users collection
      await firestoreAdmin.collection('users').doc(uid).set({
        uid,
        name,
        email: loginEmail,
        role: 'member',
        branch: branch || 'Mohali, Punjab',
        gymId: 'gym_001',
        createdAt: new Date().toISOString()
      }, { merge: true });
    }

    const member = await db.addMember({
      uid, // align document ID with Auth UID
      name, phone, email: loginEmail, plan: plan || 'Monthly',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || new Date().toISOString().split('T')[0],
      status: 'active', branch: branch || 'Mohali, Punjab', trainer: trainer || '',
      gender: gender || 'Male', age: Number(age) || 25,
      weight: Number(weight) || 70, height: Number(height) || 170,
      bmi: Number(bmi) || 24.2,
      bloodGroup: bloodGroup || 'O+',
      emergencyContact: emergencyContact || '',
      maritalStatus: maritalStatus || 'Single',
      anniversaryDate: anniversaryDate || '',
      birthdayDate: birthdayDate || '',
      medicalConditions: medicalConditions || '',
      fitnessGoal: fitnessGoal || 'General Fitness',
      occupation: occupation || '',
      address: address || '',
      avatarUrl: avatarUrl || '',
      biometricId: biometricId || ''
    });

    // Also auto-generate an invoice for new member
    const priceMap: Record<string, number> = {
      'Monthly': 2500, 'Quarterly': 6500, 'Semi-Annual': 11500, 'Annual Premium': 18000
    };
    const amt = priceMap[plan] || 2500;
    await db.addPayment({
      memberId: member.id, memberName: member.name,
      amount: amt, plan: plan || 'Monthly',
      method: 'UPI', status: 'paid'
    });

    console.log(`[Credentials Notification] Sent credentials to ${name} (${loginEmail}) via simulated SMS & WhatsApp. Password: ${password || '1234567'}`);

    res.status(201).json(member);
  } catch (error: any) {
    console.error('Failed to create member:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.updateMember(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch member details first to see if they have biometric data enrolled
    const members = await db.getMembers();
    const member = members.find(item => item.id === id);

    if (member && member.biometricId && isFirebaseInitialized && admin) {
      const firestore = admin.firestore();
      const docId = `del_${id}_${Date.now()}`;
      
      await firestore.collection('biometric_enrollment').doc(docId).set({
        docId,
        command: 'delete_biometric',
        status: 'pending',
        memberId: id,
        memberName: member.name || 'Member',
        biometricId: Number(member.biometricId),
        message: 'Deletion queued due to member removal...',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[Biometric Sync] Queued fingerprint deletion for member ${member.name} (biometric ID: ${member.biometricId})`);
    }

    await db.deleteMember(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


export const toggleFreezeMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const members = await db.getMembers();
    const m = members.find(item => item.id === id);
    if (!m) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const newStatus = m.status === 'frozen' ? 'active' : 'frozen';
    const updated = await db.updateMember(id, { status: newStatus });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const resetMemberPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    if (isFirebaseInitialized && admin) {
      await admin.auth().updateUser(id, { password });
      console.log(`[Credentials Notification] Reset password for member uid ${id} to ${password}`);
    } else {
      console.log(`[Mock Mode] Reset password for member ${id} to ${password}`);
    }

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error: any) {
    console.error('Failed to reset password:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendMemberCredentials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const list = await db.getMembers();
    const m = list.find(item => item.id === id);
    if (!m) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const email = m.email || `${m.phone}@alphagym.com`;
    console.log(`[Credentials Notification] Resent credentials to ${m.name} (${email}) via simulated Email, SMS & WhatsApp.`);

    res.json({ success: true, message: 'Credentials sent successfully' });
  } catch (error: any) {
    console.error('Failed to send credentials:', error);
    res.status(500).json({ error: error.message });
  }
};
