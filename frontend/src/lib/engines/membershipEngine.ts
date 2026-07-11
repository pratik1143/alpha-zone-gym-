// No top-level firebase import here — avoids circular dependency with utils.ts
// Firebase is used only inside selfHealMemberData() via lazy import

export const membershipEngine = {
  calculateDaysLeft: (expiryDate: string | null | undefined): number => {
    if (!expiryDate) return 0;
    const expiry = new Date(expiryDate);
    const today = new Date();
    
    const eDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    const tDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = eDay.getTime() - tDay.getTime();
    
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  calculateMembershipStatus: (daysLeft: number, manualStatus?: string): string => {
    if (manualStatus === 'Blocked') return 'Blocked';
    if (manualStatus === 'Frozen') return 'Frozen';
    
    if (daysLeft < 0) return 'Expired';
    if (daysLeft <= 15) return 'Expiring Soon';
    return 'Active';
  },

  calculateRenewalRisk: (daysLeft: number): 'Critical' | 'High' | 'Medium' | 'Low' => {
    if (daysLeft <= 3) return 'Critical';
    if (daysLeft <= 7) return 'High';
    if (daysLeft <= 15) return 'Medium';
    return 'Low';
  },

  calculateHealthScore: (daysLeft: number, attendancePercentage: number): number => {
    let score = 0;
    if (daysLeft < 0) score += 35;
    else if (daysLeft <= 7) score += 40;
    else if (daysLeft <= 15) score += 25;
    else if (daysLeft <= 30) score += 15;
    
    if (attendancePercentage < 20) score += 40;
    else if (attendancePercentage < 40) score += 25;
    else if (attendancePercentage < 60) score += 10;
    
    return Math.min(100, score);
  },

  selfHealMemberData: async (member: any) => {
    if (!member || !member.id) return member;
    
    let needsUpdate = false;
    const updates: any = {};

    const computedDaysLeft = membershipEngine.calculateDaysLeft(member.expiryDate);
    const computedStatus = membershipEngine.calculateMembershipStatus(computedDaysLeft, member.status);

    if (!member.ai || member.ai.daysLeft !== computedDaysLeft) {
      if (!updates.ai) updates.ai = { ...(member.ai || {}) };
      updates.ai.daysLeft = computedDaysLeft;
      needsUpdate = true;
    }

    if (member.status !== computedStatus && member.status !== 'Blocked' && member.status !== 'Frozen') {
      updates.status = computedStatus;
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        // Dynamic imports to avoid circular dependency with utils.ts
        const { db } = await import('@/lib/firebase');
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'members', member.id), updates);
        console.log(`[Self-Heal] Repaired membership data for ${member.id}`);
        return { ...member, ...updates };
      } catch(e) {
        console.error('[Self-Heal] Failed', e);
      }
    }
    
    return member;
  }
};
