import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { isFirebaseInitialized } from '../firebase';

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { idToken, email, password } = req.body;

    // Fallback mode if Firebase is not active
    if (!isFirebaseInitialized) {
      console.log('Firebase fallback login requested.');
      // Find role by email
      const roleMap: Record<string, string> = {
        'superadmin@alphagym.com': 'super_admin',
        'owner@alphagym.com': 'gym_owner',
        'manager@alphagym.com': 'branch_manager',
        'trainer@alphagym.com': 'trainer',
        'reception@alphagym.com': 'receptionist',
      };
      const nameMap: Record<string, string> = {
        'superadmin@alphagym.com': 'Super Admin',
        'owner@alphagym.com': 'Rajesh Malhotra',
        'manager@alphagym.com': 'Priya Patel',
        'trainer@alphagym.com': 'Karan Verma',
        'reception@alphagym.com': 'Ravi Kumar',
      };
      
      const role = roleMap[email] || 'member';
      const name = nameMap[email] || 'Member';
      
      return res.json({
        uid: 'mock_uid_123',
        name,
        email: email || 'user@example.com',
        role,
        branch: 'Mohali, Punjab',
        gymId: 'gym_001',
        token: 'mock_jwt_token_for_' + role
      });
    }

    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID Token is required' });
    }

    // Verify token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Retrieve user details from Firestore /users/{uid}
    const firestore = admin.firestore();
    const userDoc = await firestore.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      // Auto-provision profile doc if it was created directly in console
      const defaultUser = {
        uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        role: 'member', // Default role
        branch: 'Mohali, Punjab',
        gymId: 'gym_001',
        createdAt: new Date().toISOString()
      };
      await firestore.collection('users').doc(uid).set(defaultUser);
      return res.json({
        ...defaultUser,
        token: idToken
      });
    }

    const userData = userDoc.data();
    return res.json({
      uid,
      name: userData?.name || 'User',
      email: userData?.email || decodedToken.email || '',
      role: userData?.role || 'member',
      branch: userData?.branch || 'Mohali, Punjab',
      gymId: userData?.gymId || 'gym_001',
      token: idToken
    });

  } catch (error: any) {
    console.error('Firebase Auth verification error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
};
