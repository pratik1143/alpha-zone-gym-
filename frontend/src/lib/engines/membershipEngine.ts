// No top-level firebase import here — avoids circular dependency with utils.ts
// Firebase is used only inside selfHealMemberData() via lazy import

export const membershipEngine = {
  calculateDaysLeft: (expiryDate: string | null | undefined): number => {
    if (!expiryDate || expiryDate === 'N/A' || expiryDate === '—') return 999;
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return 999;

    const today = new Date();
    
    const eDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    const tDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = eDay.getTime() - tDay.getTime();
    
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  calculateDaysUntilStart: (startDate: string | null | undefined): number => {
    if (!startDate || startDate === 'N/A' || startDate === '—') return 0;
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return 0;

    const today = new Date();
    const sDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const tDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = sDay.getTime() - tDay.getTime();
    
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  calculateMembershipStatus: (daysLeftOrExpiry: number | string | null | undefined, startDateOrManual?: string | null, manualStatus?: string): string => {
    const statusVal = (typeof startDateOrManual === 'string' && ['Blocked', 'Frozen', 'active', 'expired', 'frozen', 'blocked', 'upcoming'].includes(startDateOrManual))
      ? startDateOrManual 
      : manualStatus;

    if (statusVal === 'Blocked' || statusVal === 'blocked') return 'Blocked';
    if (statusVal === 'Frozen' || statusVal === 'frozen') return 'Frozen';

    const todayStr = new Date().toISOString().split('T')[0];
    let startStr = '';

    if (typeof startDateOrManual === 'string' && startDateOrManual.match(/^\d{4}-\d{2}-\d{2}/)) {
      startStr = startDateOrManual.split('T')[0];
    }

    if (startStr && startStr > todayStr) {
      return 'Upcoming';
    }

    let daysLeft = 0;
    if (typeof daysLeftOrExpiry === 'number') {
      daysLeft = daysLeftOrExpiry;
    } else {
      daysLeft = membershipEngine.calculateDaysLeft(daysLeftOrExpiry);
    }

    if (daysLeft <= 0) return 'Expired';
    if (daysLeft <= 15) return 'Expiring Soon';
    return 'Active';
  },

  calculateAccessStatus: (startDateStr?: string | null, expiryDateStr?: string | null, manualStatus?: string): { granted: boolean; status: string; reason: string; daysUntilStart: number } => {
    if (manualStatus === 'Blocked' || manualStatus === 'blocked') {
      return { granted: false, status: 'Blocked', reason: 'Member account is blocked', daysUntilStart: 0 };
    }
    if (manualStatus === 'Frozen' || manualStatus === 'frozen') {
      return { granted: false, status: 'Frozen', reason: 'Membership is currently frozen', daysUntilStart: 0 };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const startStr = startDateStr ? startDateStr.split('T')[0] : todayStr;
    const expiryStr = expiryDateStr ? expiryDateStr.split('T')[0] : '';

    if (startStr > todayStr) {
      const daysUntilStart = membershipEngine.calculateDaysUntilStart(startStr);
      return { 
        granted: false, 
        status: 'Upcoming', 
        reason: `Membership starts on ${startStr} (Starts in ${daysUntilStart} ${daysUntilStart === 1 ? 'day' : 'days'})`,
        daysUntilStart
      };
    }

    if (expiryStr && expiryStr < todayStr) {
      return { granted: false, status: 'Expired', reason: 'Membership has expired', daysUntilStart: 0 };
    }

    return { granted: true, status: 'Active', reason: 'Access Granted', daysUntilStart: 0 };
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

  calculatePlanExpiryDate: (planOrObject: any, startDateVal?: any, plansList: any[] = []): string => {
    let validStart: Date;
    if (!startDateVal) {
      validStart = new Date();
    } else if (typeof startDateVal === 'string') {
      validStart = new Date(startDateVal);
    } else if (typeof startDateVal === 'object' && typeof startDateVal.seconds === 'number') {
      validStart = new Date(startDateVal.seconds * 1000);
    } else if (startDateVal instanceof Date) {
      validStart = startDateVal;
    } else {
      validStart = new Date(startDateVal);
    }
    if (isNaN(validStart.getTime())) validStart = new Date();
    
    let planName = typeof planOrObject === 'string' ? planOrObject : (planOrObject?.name || planOrObject?.plan || '');
    let durationDays: number | null = null;

    // Stage 1: Check direct plan object properties
    if (typeof planOrObject === 'object' && planOrObject !== null) {
      if (typeof planOrObject.durationDays === 'number' && planOrObject.durationDays > 0) {
        durationDays = planOrObject.durationDays;
      } else if (planOrObject.duration) {
        const dMatch = String(planOrObject.duration).match(/(\d+)\s*(?:day|days|d)\b/i);
        if (dMatch) durationDays = parseInt(dMatch[1], 10);
      }
    }

    const p = String(planName || '').trim().toLowerCase();

    // Stage 2: Direct string regex parsing (e.g. "10 days", "2 months", "1 year", "quarterly", "semi", "annual")
    if (durationDays === null && p) {
      const dayMatch = p.match(/(\d+)\s*(?:day|days|d)\b/i);
      const monthMatch = p.match(/(\d+)\s*(?:month|months|m)\b/i);
      const yearMatch = p.match(/(\d+)\s*(?:year|years|y)\b/i);

      if (dayMatch) {
        durationDays = parseInt(dayMatch[1], 10);
      } else if (monthMatch) {
        durationDays = parseInt(monthMatch[1], 10) * 30;
      } else if (yearMatch) {
        durationDays = parseInt(yearMatch[1], 10) * 365;
      } else if (p.includes('quarterly')) {
        durationDays = 90;
      } else if (p.includes('semi') || p.includes('half year')) {
        durationDays = 180;
      } else if (p.includes('annual') || p.includes('yearly')) {
        durationDays = 365;
      } else if (p.includes('lifetime')) {
        durationDays = 3650;
      }
    }

    // Stage 3: Exact lookup in plansList if provided
    if (durationDays === null && plansList && plansList.length > 0) {
      const matched = plansList.find((item: any) => {
        const name = String(item.name || '').trim().toLowerCase();
        const id = String(item.id || '').trim().toLowerCase();
        return name === p || id === p;
      });
      if (matched) {
        if (typeof matched.durationDays === 'number' && matched.durationDays > 0) {
          durationDays = matched.durationDays;
        } else if (matched.duration) {
          const dMatch = String(matched.duration).match(/(\d+)\s*(?:day|days|d)\b/i);
          if (dMatch) durationDays = parseInt(dMatch[1], 10);
        }
      }
    }

    // Fallback if unresolved
    if (durationDays === null || isNaN(durationDays) || durationDays <= 0) {
      durationDays = 30;
    }

    const expiryDate = new Date(validStart.getTime() + durationDays * 24 * 60 * 60 * 1000);
    return expiryDate.toISOString().split('T')[0];
  },

  selfHealMemberData: async (member: any) => {
    if (!member || !member.id) return member;
    
    let needsUpdate = false;
    const updates: any = {};

    // Check if expiryDate is missing or same as joinDate for a plan that has non-zero duration
    if (member.plan && (!member.expiryDate || member.expiryDate === member.joinDate)) {
      const join = member.joinDate || member.createdAt || new Date().toISOString().split('T')[0];
      const correctExpiry = membershipEngine.calculatePlanExpiryDate(member.plan, join);
      if (correctExpiry !== member.expiryDate) {
        updates.expiryDate = correctExpiry;
        needsUpdate = true;
      }
    }

    const effectiveExpiry = updates.expiryDate || member.expiryDate;
    const computedDaysLeft = membershipEngine.calculateDaysLeft(effectiveExpiry);
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
        console.log(`[Self-Heal] Repaired membership data for ${member.id}`, updates);
        return { ...member, ...updates };
      } catch(e: any) {
        if (e?.code !== 'permission-denied' && !e?.message?.includes('permissions')) {
          console.warn('[Self-Heal] Firestore update notice:', e?.message || e);
        }
        return { ...member, ...updates };
      }
    }
    
    return member;
  }
};
