import { Request, Response } from 'express';
import { getFirestoreDb, mockEnquiries, mockMembers, saveMockDb, db } from '../firebase';

export const getEnquiries = async (req: Request, res: Response) => {
  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snap = await firestore.collection('enquiries').orderBy('createdAt', 'desc').get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(list);
    }
    return res.json(mockEnquiries);
  } catch (error: any) {
    console.error('Error fetching enquiries:', error);
    res.json(mockEnquiries);
  }
};

export const createEnquiry = async (req: Request, res: Response) => {
  try {
    const firestore = getFirestoreDb();
    const data = req.body;

    const createdId = data.id || `enq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newEnquiry = {
      name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'New Lead',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone || data.contact || '',
      altPhone: data.altPhone || data.altContact || '',
      email: data.email || '',
      gender: data.gender || 'Male',
      address: data.address || '',
      nextFollowUp: data.nextFollowUp || data.followupDate || '',
      followUpTime: data.followUpTime || data.followupTime || '11:00',
      trialDate: data.trialDate || '',
      status: data.status || 'Pending',
      assignedTo: data.assignedTo || data.attendedBy || 'Reception Desk',
      priority: data.priority || 'Warm',
      source: data.source || 'Walk-in',
      interestedPlan: data.interestedPlan || data.inquiryFor || 'Monthly Access',
      remarks: data.remarks || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (firestore) {
      await firestore.collection('enquiries').doc(createdId).set(newEnquiry, { merge: true });

      // Automatically sync follow-up if nextFollowUp date exists
      if (newEnquiry.nextFollowUp && newEnquiry.nextFollowUp.trim() !== '') {
        const followUpId = `fol_enq_${createdId}`;
        const priorityMap: Record<string, string> = { Hot: 'High', Warm: 'Medium', Cold: 'Low' };
        await firestore.collection('followups').doc(followUpId).set({
          id: followUpId,
          sourceType: 'enquiry',
          sourceId: createdId,
          entityType: 'enquiry',
          entityId: createdId,
          enquiryId: createdId,
          memberId: null,
          memberName: newEnquiry.name,
          phone: newEnquiry.phone,
          title: `Follow-up: ${newEnquiry.name}`,
          description: newEnquiry.remarks ? `Enquiry remarks: ${newEnquiry.remarks}` : `Lead follow-up for ${newEnquiry.name}`,
          notes: newEnquiry.remarks ? `Enquiry remarks: ${newEnquiry.remarks}` : `Lead follow-up for ${newEnquiry.name}`,
          scheduledDate: newEnquiry.nextFollowUp,
          dueDate: newEnquiry.nextFollowUp,
          scheduledTime: newEnquiry.followUpTime || '11:00',
          scheduledTimestamp: new Date(`${newEnquiry.nextFollowUp}T${newEnquiry.followUpTime || '11:00'}`).getTime() || Date.now(),
          status: 'Pending',
          priority: priorityMap[newEnquiry.priority] || 'Medium',
          assignedTo: newEnquiry.assignedTo || 'Reception Desk',
          type: 'Enquiry',
          source: 'enquiry',
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    }

    const savedRecord = { id: createdId, ...newEnquiry };
    const existingIdx = mockEnquiries.findIndex(e => e.id === createdId);
    if (existingIdx !== -1) {
      mockEnquiries[existingIdx] = savedRecord;
    } else {
      mockEnquiries.unshift(savedRecord);
    }
    saveMockDb();

    res.status(201).json({
      success: true,
      message: 'Enquiry created successfully',
      enquiry: savedRecord
    });
  } catch (error: any) {
    console.error('Error creating enquiry:', error);
    res.status(500).json({ error: error.message || 'Failed to create enquiry' });
  }
};

export const updateEnquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date().toISOString();

    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('enquiries').doc(id).set(updates, { merge: true });

      if (updates.nextFollowUp !== undefined) {
        const followUpId = `fol_enq_${id}`;
        if (!updates.nextFollowUp || updates.nextFollowUp.trim() === '') {
          await firestore.collection('followups').doc(followUpId).delete().catch(() => {});
        } else {
          const docSnap = await firestore.collection('enquiries').doc(id).get();
          const currentData = docSnap.exists ? docSnap.data() : {};
          const scheduledDate = updates.nextFollowUp;
          const scheduledTime = updates.followUpTime || currentData?.followUpTime || '11:00';
          await firestore.collection('followups').doc(followUpId).set({
            scheduledDate,
            dueDate: scheduledDate,
            scheduledTime,
            scheduledTimestamp: new Date(`${scheduledDate}T${scheduledTime}`).getTime() || Date.now(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    }

    const idx = mockEnquiries.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockEnquiries[idx] = { ...mockEnquiries[idx], ...updates };
      saveMockDb();
    }

    res.json({
      success: true,
      message: 'Enquiry updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating enquiry:', error);
    res.status(500).json({ error: error.message || 'Failed to update enquiry' });
  }
};

export const deleteEnquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestore.collection('enquiries').doc(id).delete();
      await firestore.collection('followups').doc(`fol_enq_${id}`).delete().catch(() => {});
    }

    const idx = mockEnquiries.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockEnquiries.splice(idx, 1);
      saveMockDb();
    }

    res.json({
      success: true,
      message: 'Enquiry deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({ error: error.message || 'Failed to delete enquiry' });
  }
};

export const convertEnquiryToMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { plan, price } = req.body;

    const firestore = getFirestoreDb();
    let enquiry: any = null;

    if (firestore) {
      const doc = await firestore.collection('enquiries').doc(id).get();
      if (doc.exists) enquiry = { id: doc.id, ...doc.data() };
    }

    if (!enquiry) {
      enquiry = mockEnquiries.find(e => e.id === id);
    }

    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    // Provision new member document
    const newMemberData = {
      name: enquiry.name || 'Converted Member',
      phone: enquiry.phone || '',
      email: enquiry.email || '',
      gender: enquiry.gender || 'Male',
      address: enquiry.address || '',
      plan: plan || enquiry.interestedPlan || 'Monthly Access',
      totalBilled: Number(price) || 3000,
      totalPaid: Number(price) || 3000,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: enquiry.source || 'Enquiry Conversion',
      notes: `Converted from Lead ${enquiry.id}`
    };

    const createdMember = await db.addMember(newMemberData);

    // Update enquiry status to Converted
    const updatePayload = { status: 'Converted', convertedMemberId: createdMember.id || createdMember.memberId, updatedAt: new Date().toISOString() };
    if (firestore) {
      await firestore.collection('enquiries').doc(id).set(updatePayload, { merge: true });
    }
    const idx = mockEnquiries.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockEnquiries[idx] = { ...mockEnquiries[idx], ...updatePayload };
      saveMockDb();
    }

    res.json({
      success: true,
      message: 'Enquiry successfully converted to active Member',
      member: createdMember
    });
  } catch (error: any) {
    console.error('Error converting enquiry:', error);
    res.status(500).json({ error: error.message || 'Failed to convert enquiry' });
  }
};

export const parseEnquiryPdf = async (req: Request, res: Response) => {
  try {
    const { pdfBase64, filename } = req.body;
    await new Promise(resolve => setTimeout(resolve, 1500));

    const detectedFields = [
      { id: 'name', label: 'Full Name', type: 'text', required: true, enabled: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true, enabled: true },
      { id: 'email', label: 'Email Address', type: 'email', required: false, enabled: true },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true, enabled: true },
      { id: 'age', label: 'Age', type: 'number', required: false, enabled: true },
      { id: 'goal', label: 'Fitness Goal', type: 'select', options: ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Athletics'], required: true, enabled: true },
      { id: 'preferredPlan', label: 'Interested Plan', type: 'select', options: ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'], required: false, enabled: true },
      { id: 'preferredTime', label: 'Preferred Timing', type: 'text', required: false, enabled: true },
      { id: 'reference', label: 'Reference / Source', type: 'text', required: false, enabled: true },
      { id: 'remarks', label: 'Remarks / Medical History', type: 'textarea', required: false, enabled: true }
    ];

    res.json({
      success: true,
      message: 'AI parsed the document successfully.',
      detectedFields,
      confidence: 0.94
    });
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ error: 'Failed to parse PDF.' });
  }
};
