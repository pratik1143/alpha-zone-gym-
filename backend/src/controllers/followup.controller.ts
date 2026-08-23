import { Request, Response } from 'express';
import { getFirestoreDb } from '../firebase';

export const getFollowups = async (req: Request, res: Response) => {
  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snap = await firestore.collection('followups').orderBy('scheduledTimestamp', 'asc').get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(list);
    }
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching followups:', error);
    return res.json([]);
  }
};

export const createFollowup = async (req: Request, res: Response) => {
  try {
    const firestore = getFirestoreDb();
    const data = req.body;

    const scheduledDate = data.scheduledDate || data.dueDate || new Date().toISOString().split('T')[0];
    const scheduledTime = data.scheduledTime || '10:00';
    const scheduledTimestamp = data.scheduledTimestamp || new Date(`${scheduledDate}T${scheduledTime}`).getTime() || Date.now();

    const payload = {
      memberId: data.memberId || null,
      enquiryId: data.enquiryId || null,
      employeeId: data.employeeId || null,
      memberName: data.memberName || data.name || '',
      memberPhone: data.memberPhone || data.phone || '',
      name: data.name || data.memberName || '',
      phone: data.phone || data.memberPhone || '',
      title: data.title || data.notes || 'Follow-up Task',
      description: data.description || data.notes || '',
      type: data.type || 'Renewal Reminder',
      priority: data.priority || 'Medium',
      assignedTo: data.assignedTo || 'Gym Owner',
      scheduledDate,
      scheduledTime,
      scheduledTimestamp,
      status: data.status || 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let createdId = data.id || `fol_${Date.now()}`;

    if (firestore) {
      if (data.id) {
        await firestore.collection('followups').doc(data.id).set(payload, { merge: true });
        createdId = data.id;
      } else {
        const docRef = await firestore.collection('followups').add(payload);
        createdId = docRef.id;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Follow-up created successfully',
      followup: { id: createdId, ...payload }
    });
  } catch (error: any) {
    console.error('Error creating followup:', error);
    return res.status(500).json({ error: error.message || 'Failed to create follow-up' });
  }
};

export const updateFollowup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const firestore = getFirestoreDb();

    if (firestore) {
      await firestore.collection('followups').doc(id).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }

    return res.json({ success: true, message: 'Follow-up updated successfully' });
  } catch (error: any) {
    console.error('Error updating followup:', error);
    return res.status(500).json({ error: error.message || 'Failed to update follow-up' });
  }
};

export const deleteFollowup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const firestore = getFirestoreDb();

    if (firestore) {
      await firestore.collection('followups').doc(id).delete();
    }

    return res.json({ success: true, message: 'Follow-up deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting followup:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete follow-up' });
  }
};
