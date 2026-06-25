import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { isFirebaseInitialized } from '../firebase';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: string;
    name: string;
    branch?: string;
    gymId?: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // If Firebase is not initialized, bypass verification (fallback mode)
  if (!isFirebaseInitialized) {
    req.user = {
      uid: 'mock_uid_123',
      email: 'owner@alphagym.com',
      role: 'gym_owner',
      name: 'Rajesh Malhotra',
      branch: 'Mohali, Punjab',
      gymId: 'gym_001'
    };
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: No Authentication Token provided.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Retrieve user profile from Firestore
    const firestore = admin.firestore();
    const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      const defaultUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Gym Member',
        role: 'member', // Default role
        branch: 'Mohali, Punjab',
        gymId: 'gym_001',
        createdAt: new Date().toISOString()
      };
      await firestore.collection('users').doc(decodedToken.uid).set(defaultUser);
      req.user = defaultUser;
    } else {
      req.user = { uid: decodedToken.uid, ...userDoc.data() } as any;
    }

    next();
  } catch (error: any) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Access Denied: Invalid Authentication Token.' });
  }
};
