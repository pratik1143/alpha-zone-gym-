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

const DEMO_FALLBACK_USER = {
  uid: 'demo_owner_001',
  email: 'owner@alphagym.com',
  role: 'gym_owner',
  name: 'Gym Owner',
  branch: 'Mohali, Punjab',
  gymId: 'gym_001'
};

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // If Firebase is not initialized, bypass verification (fallback mode)
  if (!isFirebaseInitialized) {
    req.user = DEMO_FALLBACK_USER;
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // No token → treat as demo/local gym owner (allows dashboard to work without Firebase login)
  if (!token) {
    req.user = DEMO_FALLBACK_USER;
    return next();
  }

  // Check if it's a demo token (not a real Firebase JWT)
  if (token.startsWith('demo_')) {
    req.user = DEMO_FALLBACK_USER;
    return next();
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
        role: 'member',
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
    // Invalid token — fall back to demo user instead of rejecting
    console.warn('[Auth] Token invalid, falling back to demo user:', error.message);
    req.user = DEMO_FALLBACK_USER;
    return next();
  }
};
