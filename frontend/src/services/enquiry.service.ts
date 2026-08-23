import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import API from '@/services/api';

export interface EnquiryItem {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  gender?: string;
  address?: string;
  nextFollowUp?: string;
  followUpTime?: string;
  trialDate?: string;
  status: 'Pending' | 'Contacted' | 'Trial Scheduled' | 'Converted' | 'Lost';
  assignedTo?: string;
  priority: 'Hot' | 'Warm' | 'Cold';
  source?: string;
  interestedPlan?: string;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export const enquiryService = {
  // Real-time listener with deduplication and API fallback
  subscribe: (onData: (items: EnquiryItem[]) => void, onError?: (err: Error) => void) => {
    let firestoreLoaded = false;

    // Initial fetch via API fallback
    API.get('/enquiries')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0 && !firestoreLoaded) {
          const list = res.data.map(d => ({
            ...d,
            status: d.status || 'Pending',
            priority: d.priority || 'Warm',
            name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Enquiry Lead'
          }));
          onData(list);
        }
      })
      .catch(() => {});

    const q = query(collection(db, 'enquiries'));
    return onSnapshot(
      q,
      (snapshot) => {
        firestoreLoaded = true;
        const itemMap = new Map<string, EnquiryItem>();

        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const item: EnquiryItem = {
            id: docSnap.id,
            name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Enquiry Lead',
            firstName: d.firstName || '',
            lastName: d.lastName || '',
            phone: d.phone || d.contact || '',
            altPhone: d.altPhone || d.altContact || '',
            email: d.email || '',
            gender: d.gender || 'Male',
            address: d.address || '',
            nextFollowUp: d.nextFollowUp || d.followupDate || '',
            followUpTime: d.followUpTime || d.followupTime || '11:00',
            trialDate: d.trialDate || '',
            status: d.status || 'Pending',
            assignedTo: d.assignedTo || d.attendedBy || 'Reception Desk',
            priority: d.priority || 'Warm',
            source: d.source || 'Walk-in',
            interestedPlan: d.interestedPlan || d.inquiryFor || 'Monthly Access',
            remarks: d.remarks || '',
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || d.createdAt || new Date().toISOString()
          };

          itemMap.set(docSnap.id, item);
        });

        const rawList = Array.from(itemMap.values());

        // Signature deduplication for historical duplicate records
        const uniqueList: EnquiryItem[] = [];
        const seenMap = new Map<string, EnquiryItem>();

        for (const item of rawList) {
          const sig = `${(item.phone || '').trim()}_${(item.name || '').toLowerCase().trim()}_${item.interestedPlan}_${item.nextFollowUp}`;
          const existing = seenMap.get(sig);

          if (existing) {
            // Keep the earlier document and suppress duplicate snapshot item
            const timeA = new Date(item.createdAt || 0).getTime();
            const timeB = new Date(existing.createdAt || 0).getTime();
            if (Math.abs(timeA - timeB) < 180_000 || !item.createdAt || !existing.createdAt) {
              // Delete actual duplicate document from Firestore if it has a different ID
              if (item.id !== existing.id) {
                deleteDoc(doc(db, 'enquiries', item.id)).catch(() => {});
              }
              continue;
            }
          }

          seenMap.set(sig, item);
          uniqueList.push(item);
        }

        uniqueList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(uniqueList);
      },
      (err) => {
        console.warn('[enquiryService] Snapshot warning:', err.message);
        if (onError) onError(err);
      }
    );
  },

  // Create Enquiry and Sync Follow-Up Task
  create: async (data: Partial<EnquiryItem>): Promise<EnquiryItem> => {
    const createdId = data.id || `enq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'New Lead';

    const payload: EnquiryItem = {
      id: createdId,
      name: fullName,
      firstName: data.firstName || fullName.split(' ')[0] || '',
      lastName: data.lastName || fullName.split(' ').slice(1).join(' ') || '',
      phone: data.phone || '',
      altPhone: data.altPhone || '',
      email: data.email || '',
      gender: data.gender || 'Male',
      address: data.address || '',
      nextFollowUp: data.nextFollowUp || '',
      followUpTime: data.followUpTime || '11:00',
      trialDate: data.trialDate || '',
      status: data.status || 'Pending',
      assignedTo: data.assignedTo || 'Reception Desk',
      priority: data.priority || 'Warm',
      source: data.source || 'Walk-in',
      interestedPlan: data.interestedPlan || 'Monthly Access',
      remarks: data.remarks || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Write to Firestore 'enquiries' collection using explicit doc ID
    try {
      await setDoc(doc(db, 'enquiries', createdId), payload);
    } catch (err) {
      console.warn('[enquiryService] Firestore setDoc warning:', err);
    }

    // 2. Call Express backend endpoint
    try {
      await API.post('/enquiries', payload);
    } catch (_) {}

    // 3. AUTOMATIC FOLLOW-UP SYNC if nextFollowUp date is provided
    if (payload.nextFollowUp && payload.nextFollowUp.trim() !== '') {
      await enquiryService.syncFollowUp(payload);
    }

    return payload;
  },

  // Update Enquiry and Sync/Update Associated Follow-Up
  update: async (id: string, updates: Partial<EnquiryItem>): Promise<void> => {
    const updatedAt = new Date().toISOString();
    const payload = { ...updates, updatedAt };

    try {
      await setDoc(doc(db, 'enquiries', id), payload, { merge: true });
    } catch (err) {
      console.warn('[enquiryService] Firestore update warning:', err);
    }

    try {
      await API.put(`/enquiries/${id}`, payload);
    } catch (_) {}

    // Follow-up sync check if nextFollowUp was updated
    if (updates.nextFollowUp !== undefined || updates.followUpTime !== undefined || updates.remarks !== undefined || updates.assignedTo !== undefined || updates.name !== undefined) {
      // Fetch current full enquiry state to perform sync
      try {
        const fullEnquiry: EnquiryItem = {
          id,
          name: updates.name || '',
          phone: updates.phone || '',
          nextFollowUp: updates.nextFollowUp || '',
          followUpTime: updates.followUpTime || '11:00',
          assignedTo: updates.assignedTo || 'Reception Desk',
          priority: updates.priority || 'Warm',
          remarks: updates.remarks || '',
          createdAt: new Date().toISOString(),
          status: updates.status || 'Pending'
        };
        await enquiryService.syncFollowUp(fullEnquiry);
      } catch (_) {}
    }
  },

  // Sync Enquiry Follow-up Task to 'followups' Collection
  syncFollowUp: async (enquiry: EnquiryItem): Promise<void> => {
    const followUpId = `fol_enq_${enquiry.id}`;

    if (!enquiry.nextFollowUp || enquiry.nextFollowUp.trim() === '') {
      // If follow-up date removed, delete pending follow-up task
      try {
        await deleteDoc(doc(db, 'followups', followUpId));
      } catch (_) {}
      return;
    }

    const scheduledDate = enquiry.nextFollowUp;
    const scheduledTime = enquiry.followUpTime || '11:00';
    const scheduledTimestamp = new Date(`${scheduledDate}T${scheduledTime}`).getTime() || Date.now();

    const priorityMap: Record<string, 'Low' | 'Medium' | 'High'> = {
      'Hot': 'High',
      'Warm': 'Medium',
      'Cold': 'Low'
    };

    const followUpPayload = {
      id: followUpId,
      sourceType: 'enquiry',
      sourceId: enquiry.id,
      entityType: 'enquiry',
      entityId: enquiry.id,
      enquiryId: enquiry.id,
      memberId: null,
      memberName: enquiry.name || 'Enquiry Lead',
      phone: enquiry.phone || '',
      title: `Follow-up: ${enquiry.name || 'Enquiry Lead'}`,
      description: enquiry.remarks ? `Enquiry remarks: ${enquiry.remarks}` : `Lead follow-up for ${enquiry.name || 'Client'} (${enquiry.interestedPlan || 'Gym Access'})`,
      notes: enquiry.remarks ? `Enquiry remarks: ${enquiry.remarks}` : `Lead follow-up for ${enquiry.name || 'Client'} (${enquiry.interestedPlan || 'Gym Access'})`,
      scheduledDate,
      dueDate: scheduledDate,
      scheduledTime,
      scheduledTimestamp,
      status: 'Pending',
      priority: priorityMap[enquiry.priority || 'Warm'] || 'Medium',
      assignedTo: enquiry.assignedTo || 'Reception Desk',
      type: 'Enquiry',
      source: 'enquiry',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'followups', followUpId), followUpPayload, { merge: true });
    } catch (err) {
      console.warn('[enquiryService] Follow-up sync setDoc error:', err);
    }

    try {
      await API.post('/followups', followUpPayload);
    } catch (_) {}
  },

  // Delete Enquiry & Associated Pending Follow-Up
  delete: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'enquiries', id));
    } catch (_) {}

    try {
      await API.delete(`/enquiries/${id}`);
    } catch (_) {}

    // Delete associated follow-up
    try {
      await deleteDoc(doc(db, 'followups', `fol_enq_${id}`));
    } catch (_) {}
  }
};
