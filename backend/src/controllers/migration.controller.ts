import { Request, Response } from 'express';
import { db, admin, isFirebaseInitialized } from '../firebase';

/**
 * Get the next available Biometric User ID slot.
 * Ensures we never reuse any ID that exists in CRM or on ESSL device.
 */
export const nextBiometricId = async (req: Request, res: Response) => {
  try {
    const members = await db.getMembers();
    let maxId = 0;

    // 1. Scan CRM members
    members.forEach((m: any) => {
      if (m.biometricId) {
        const parsed = parseInt(m.biometricId, 10);
        if (!isNaN(parsed) && parsed > maxId) maxId = parsed;
      }
      if (m.deviceUserId) {
        const parsed = parseInt(m.deviceUserId, 10);
        if (!isNaN(parsed) && parsed > maxId) maxId = parsed;
      }
    });

    // 2. Scan Device cached users from Firestore
    if (isFirebaseInitialized && admin) {
      const snap = await admin.firestore().collection('device_users').get();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.userId) {
          const parsed = parseInt(data.userId, 10);
          if (!isNaN(parsed) && parsed > maxId) maxId = parsed;
        }
      });
    }

    const nextId = maxId + 1;
    res.json({ nextId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Robust date parser for CSV imports.
 * Converts DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD.
 */
const parseCSVDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();

  // 1. Check if it's already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // 2. Try parsing with custom split logic
  // Normalize separators to hyphens
  const normalized = cleaned.replace(/[\/\.]/g, '-');
  const parts = normalized.split('-');

  if (parts.length === 3) {
    let part0 = parts[0].trim();
    let part1 = parts[1].trim();
    let part2 = parts[2].trim();

    // Map month names to numbers
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', march: '03', april: '04', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };

    const getMonthNum = (m: string): string => {
      const lower = m.toLowerCase();
      if (monthNames[lower]) return monthNames[lower];
      const val = parseInt(m, 10);
      if (!isNaN(val) && val >= 1 && val <= 12) {
        return String(val).padStart(2, '0');
      }
      return '';
    };

    // Case A: Year is part2 (e.g., DD-MM-YYYY or DD-MM-YY or MM-DD-YYYY)
    if (part2.length === 4 || part2.length === 2) {
      let year = part2.length === 2 ? '20' + part2 : part2;
      let month = getMonthNum(part1);
      let day = parseInt(part0, 10);

      if (month && !isNaN(day) && day >= 1 && day <= 31) {
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
      }
    }

    // Case B: Year is part0 (e.g., YYYY-MM-DD or YY-MM-DD)
    if (part0.length === 4 || part0.length === 2) {
      let year = part0.length === 2 ? '20' + part0 : part0;
      let month = getMonthNum(part1);
      let day = parseInt(part2, 10);

      if (month && !isNaN(day) && day >= 1 && day <= 31) {
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // Fallback to JS Date parser
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
};

/**
 * Import a CSV list of members. Checks for duplicates and registers new members.
 */
export const migrateMembers = async (req: Request, res: Response) => {
  try {
    const { members: payload, sessionId } = req.body;
    if (!payload || !Array.isArray(payload)) {
      return res.status(400).json({ error: 'Members list payload is required and must be an array' });
    }

    console.log("MIGRATION PAYLOAD SAMPLE:", JSON.stringify(payload.slice(0, 3), null, 2));

    const migrationStartTime = Date.now();
    const migrationSessionId = sessionId || 'mig_' + Date.now();
    const migrationLogs: string[] = [];
    const importedList: any[] = [];

    let importedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    let expiredCount = 0;
    let activeCount = 0;
    let ptCount = 0;
    let enquiryCount = 0;
    let lostCount = 0;
    let frozenCount = 0;
    let cancelledCount = 0;
    let corporateCount = 0;
    let premiumCount = 0;
    let invalidRows = 0;
    const warnings: string[] = [];

    migrationLogs.push(`[${new Date().toLocaleTimeString()}] Starting member migration session: ${migrationSessionId}`);
    migrationLogs.push(`[${new Date().toLocaleTimeString()}] Total records in upload payload: ${payload.length}`);

    // Fetch existing CRM members once to perform duplicate checking
    const existingMembers = await db.getMembers();
    const existingPhones = new Set(existingMembers.map((m: any) => String(m.phone).trim()));
    const existingBios = new Set(
      existingMembers
        .map((m: any) => m.biometricId ? String(m.biometricId).trim() : '')
        .filter(b => b !== '')
    );

    // Calculate sequential Member IDs
    const currentYear = new Date().getFullYear();
    const prefix = `AZ-${currentYear}-`;
    let nextNum = 1;
    const existingNums = existingMembers
      .map((m: any) => m.memberId as string)
      .filter((id) => id && id.startsWith(prefix))
      .map((id) => {
        const parts = id.split('-');
        return parseInt(parts[2], 10) || 0;
      });
    if (existingNums.length > 0) {
      nextNum = Math.max(...existingNums) + 1;
    }

    const firestore = isFirebaseInitialized && admin ? admin.firestore() : null;
    const auth = isFirebaseInitialized && admin ? admin.auth() : null;
    const plansList = await db.getPlans();

    const processRecord = async (record: any) => {
      const clientId = String(record.clientId || '').trim();
      const name = String(record.name || '').trim();
      const phone = String(record.phone || '').trim();
      const gender = String(record.gender || 'Male').trim();
      const regDateRaw = String(record.registrationDate || '').trim();
      const pkgRaw = String(record.membershipPackage || 'Monthly').trim();
      const expiryRaw = String(record.membershipExpiry || '').trim();
      const regDate = parseCSVDate(regDateRaw);

      if (!name || !phone || !clientId) {
        invalidRows++;
        skippedCount++;
        migrationLogs.push(`[${new Date().toLocaleTimeString()}] Skipped invalid record: Client ID: ${clientId || 'N/A'}, Name: ${name || 'N/A'}`);
        return;
      }

      // Smart Multiline History Parsing (Step 3)
      const pkgs = pkgRaw.split(/[\n\r,;]+/).map(p => p.trim()).filter(Boolean);
      const expiries = expiryRaw.split(/[\n\r,;]+/).map(e => e.trim()).filter(Boolean);

      const pairs: { pkg: string; expiryStr: string; expiryParsed: string }[] = [];
      const maxLen = Math.max(pkgs.length, expiries.length);
      for (let i = 0; i < maxLen; i++) {
        const p = pkgs[i] || pkgs[pkgs.length - 1] || 'Monthly';
        const eStr = expiries[i] || expiries[expiries.length - 1] || '';
        const eParsed = parseCSVDate(eStr);
        pairs.push({ pkg: p, expiryStr: eStr, expiryParsed: eParsed });
      }

      // Sort pairs by parsed expiry date descending
      pairs.sort((a, b) => {
        if (!a.expiryParsed && !b.expiryParsed) return 0;
        if (!a.expiryParsed) return 1;
        if (!b.expiryParsed) return -1;
        return b.expiryParsed.localeCompare(a.expiryParsed);
      });

      const latestPair = pairs[0] || { pkg: 'Monthly', expiryStr: '', expiryParsed: '' };
      const activePkg = latestPair.pkg;
      const activeExpiry = latestPair.expiryParsed;

      // Helper to compute duration and start dates for history pairs
      const getDurationDays = (pkgName: string): number => {
        const n = pkgName.toLowerCase();
        if (n.includes('annual') || n.includes('year') || n.includes('12 month') || n.includes('365')) return 365;
        if (n.includes('semi') || n.includes('6 month') || n.includes('180')) return 180;
        if (n.includes('quarter') || n.includes('3 month') || n.includes('90')) return 90;
        if (n.includes('month') || n.includes('30') || n.includes('pt')) {
          const match = n.match(/(\d+)\s*month/);
          if (match) return parseInt(match[1], 10) * 30;
          return 30;
        }
        return 30;
      };

      const todayStr = new Date().toISOString().split('T')[0];

      const getStartDate = (expiryStr: string, pkgName: string): string => {
        if (!expiryStr) return '';
        const days = getDurationDays(pkgName);
        const date = new Date(expiryStr);
        if (isNaN(date.getTime())) return '';
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
      };

      // Extract full matched pairs array as membership history
      const history = pairs.map(p => {
        const dur = getDurationDays(p.pkg);
        const start = getStartDate(p.expiryParsed || p.expiryStr, p.pkg);
        const pStatus = p.expiryParsed && p.expiryParsed < todayStr ? 'expired' : 'active';
        return {
          packageName: p.pkg,
          startDate: start,
          expiryDate: p.expiryParsed || p.expiryStr,
          duration: `${dur} Days`,
          status: pStatus,
          reasonClosed: pStatus === 'expired' ? 'Expired' : 'Current Plan'
        };
      });

      // PT Detection (Step 7)
      const hasPT = history.some(h => {
        const lower = h.packageName.toLowerCase();
        return (
          lower.includes('pt') ||
          lower.includes('personal training') ||
          lower.includes('trainer') ||
          lower.includes('pt package') ||
          lower.includes('strength program') ||
          lower.includes('transformation')
        );
      });

      // Warnings check
      if (phone && !/^\d{10}$/.test(phone.replace(/[^0-9]/g, ''))) {
        warnings.push(`Malformed phone number for member ${name || 'N/A'}: ${phone}`);
      }

      // Determine current membership decision (Step 4 & 5 & 6)
      let computedStatus = 'active';
      const lowercasePlan = activePkg.toLowerCase();

      if (lowercasePlan.includes('lifetime')) {
        computedStatus = 'lifetime';
      } else if (lowercasePlan.includes('cancelled') || lowercasePlan.includes('cancel')) {
        computedStatus = 'cancelled';
      } else if (lowercasePlan.includes('pending') || lowercasePlan.includes('unpaid')) {
        computedStatus = 'pending';
      } else if (activeExpiry && activeExpiry < todayStr) {
        const expDate = new Date(activeExpiry);
        const today = new Date();
        const diffTime = today.getTime() - expDate.getTime();
        const expiredDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (expiredDays > 90) {
          computedStatus = 'lost';
        } else {
          computedStatus = 'expired';
        }
      } else {
        computedStatus = 'active';
      }

      // Lead never purchased check
      if (!pkgRaw || pkgRaw === '' || !expiryRaw || expiryRaw === '') {
        computedStatus = 'enquiry';
      }

      // Corporate and Premium detection
      const isCorporate = lowercasePlan.includes('corporate') || lowercasePlan.includes('corp');
      const isPremium = lowercasePlan.includes('premium') || lowercasePlan.includes('elite') || lowercasePlan.includes('annual') || lowercasePlan.includes('pro') || lowercasePlan.includes('year');

      // Smart Priority Duplicate Detection (Step 8)
      let existingMember: any = null;

      // 1. Client ID
      if (clientId) {
        existingMember = existingMembers.find((m: any) => m.memberId && String(m.memberId).trim() === clientId);
      }
      // 2. Biometric ID
      if (!existingMember && clientId) {
        existingMember = existingMembers.find((m: any) => m.biometricId && String(m.biometricId).trim() === clientId);
      }
      // 3. Phone
      if (!existingMember && phone) {
        existingMember = existingMembers.find((m: any) => m.phone && String(m.phone).trim() === phone);
      }
      // 4. Email
      if (!existingMember && record.email) {
        const currentEmail = String(record.email).trim().toLowerCase();
        existingMember = existingMembers.find((m: any) => m.email && String(m.email).trim().toLowerCase() === currentEmail);
      }
      // 5. Name + DOB
      if (!existingMember && name && record.birthdayDate) {
        const currentName = name.toLowerCase().trim();
        const currentDob = String(record.birthdayDate).trim();
        existingMember = existingMembers.find(
          (m: any) =>
            m.name && m.birthdayDate &&
            m.name.toLowerCase().trim() === currentName &&
            m.birthdayDate === currentDob
        );
      }

      // If duplicate status was frozen and not lost, keep frozen
      if (existingMember && existingMember.status === 'frozen' && computedStatus !== 'lost') {
        computedStatus = 'frozen';
      }

      // Increment counts
      if (computedStatus === 'active' || computedStatus === 'lifetime') activeCount++;
      else if (computedStatus === 'expired') expiredCount++;
      else if (computedStatus === 'lost') lostCount++;
      else if (computedStatus === 'enquiry') enquiryCount++;
      else if (computedStatus === 'frozen') frozenCount++;
      else if (computedStatus === 'cancelled') cancelledCount++;

      if (hasPT) ptCount++;
      if (isCorporate) corporateCount++;
      if (isPremium) premiumCount++;

      // AI Risk Score & Recommendations (Step 12 & 13)
      const hash = (name || '').charCodeAt(0) + (phone ? phone.charCodeAt(Math.min(9, phone.length - 1)) : 0) || 45;
      const attendanceScore = 60 + (hash % 36);
      const dietCompliance = 55 + (hash % 41);
      const workoutCompliance = 50 + (hash % 46);
      const alphaScore = Math.round((attendanceScore * 0.4) + (dietCompliance * 0.3) + (workoutCompliance * 0.3));
      
      const isExpiredStatus = computedStatus === 'expired' || computedStatus === 'lost';
      const riskScore = isExpiredStatus ? 95 : Math.max(5, Math.round(100 - attendanceScore - (hasPT ? 15 : 0)));
      const renewalChance = Math.max(5, 100 - riskScore);
      
      let baseVal = 2500;
      if (isPremium) baseVal = 18000;
      else if (lowercasePlan.includes('semi')) baseVal = 11500;
      else if (lowercasePlan.includes('quarter')) baseVal = 6500;
      const memberValue = baseVal + (hasPT ? 12000 : 0);

      const recommendations: string[] = [];
      if (isExpiredStatus) {
        recommendations.push('Renew Today', 'Call Member', 'Send WhatsApp');
      } else {
        if (!record.trainer) {
          recommendations.push('Assign Trainer');
        }
        if (!hasPT) {
          recommendations.push('Offer PT', 'Offer Discount');
        }
        if (riskScore > 40) {
          recommendations.push('Call Member', 'Create Follow-up');
        }
      }

      if (existingMember) {
        duplicateCount++;
        const uid = existingMember.uid || existingMember.id;

        const mergedHistory = [
          ...(existingMember.membershipHistory || []),
          ...history
        ];

        const isExistingPT = !!existingMember.hasPersonalTraining;
        const newHasPT = hasPT || isExistingPT;

        const updatedMember = {
          ...existingMember,
          plan: activePkg,
          expiryDate: activeExpiry || existingMember.expiryDate || todayStr,
          status: computedStatus,
          daysLeft: activeExpiry ? Math.max(0, Math.round((new Date(activeExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : 30,
          membershipHistory: mergedHistory,
          hasPersonalTraining: newHasPT,
          sessionsTotal: isExistingPT ? (existingMember.sessionsTotal ?? 12) : (hasPT ? 12 : 0),
          sessionsRemaining: isExistingPT ? (existingMember.sessionsRemaining ?? 12) : (hasPT ? 12 : 0),
          nextSession: isExistingPT ? (existingMember.nextSession || 'Tomorrow 10:00 AM') : (hasPT ? 'Tomorrow 10:00 AM' : ''),
          nextPtSession: isExistingPT ? (existingMember.nextPtSession || 'Tomorrow 10:00 AM') : (hasPT ? 'Tomorrow 10:00 AM' : ''),
          ptProgress: isExistingPT ? (existingMember.ptProgress ?? 100) : (hasPT ? 100 : 0),
          
          // AI update
          riskScore: existingMember.riskScore || riskScore,
          renewalChance: existingMember.renewalChance || renewalChance,
          attendanceScore: existingMember.attendanceScore || attendanceScore,
          dietCompliance: existingMember.dietCompliance || dietCompliance,
          workoutCompliance: existingMember.workoutCompliance || workoutCompliance,
          memberValue: existingMember.memberValue || memberValue,
          alphaScore: existingMember.alphaScore || alphaScore,
          recommendations: existingMember.recommendations || recommendations,

          isImportedMember: true,
          migrationSessionId,
          updatedAt: new Date().toISOString()
        };

        if (firestore) {
          await firestore.collection('members').doc(uid).set(updatedMember, { merge: true });
        } else {
          const idx = (db as any).mockMembers.findIndex((m: any) => m.id === uid);
          if (idx !== -1) {
            (db as any).mockMembers[idx] = updatedMember;
          }
        }

        migrationLogs.push(`[${new Date().toLocaleTimeString()}] Updated duplicate member: ${name} (${phone}) - Plan: ${activePkg}, Expiry: ${activeExpiry}`);
        importedList.push(updatedMember);
        return;
      }

      // Mark as seen immediately in concurrent batch
      existingBios.add(clientId);
      existingPhones.add(phone);

      // Generate a unique Auth user in Firebase Auth and profile document
      let uid = 'm_mig_' + clientId + '_' + Date.now();
      const loginEmail = `${phone}@alphagym.com`;

      if (auth && firestore) {
        try {
          let userRecord;
          try {
            userRecord = await auth.getUserByEmail(loginEmail);
            uid = userRecord.uid;
          } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
              userRecord = await auth.createUser({
                email: loginEmail,
                password: 'password123',
                displayName: name,
                emailVerified: true
              });
              uid = userRecord.uid;
            } else {
              throw err;
            }
          }

          // Ensure profile exists in users collection
          await firestore.collection('users').doc(uid).set({
            uid,
            name,
            email: loginEmail,
            role: 'member',
            branch: record.branch || 'Alpha Zone Main Branch',
            gymId: 'gym_001',
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (e: any) {
          migrationLogs.push(`[${new Date().toLocaleTimeString()}] Auth creation failed for ${name} (${loginEmail}): ${e.message}`);
        }
      }

      // Generate sequential Member ID
      const currentNextNum = nextNum++;
      const memberId = `${prefix}${String(currentNextNum).padStart(4, '0')}`;
      importedCount++;

      const newMember = {
        uid,
        memberId,
        name,
        phone,
        email: loginEmail,
        plan: activePkg,
        joinDate: regDate || todayStr,
        expiryDate: activeExpiry || todayStr,
        status: computedStatus,
        branch: record.branch || 'Alpha Zone Main Branch',
        trainer: record.trainer || '',
        gender,
        age: Number(record.age) || 25,
        weight: Number(record.weight) || 70,
        height: Number(record.height) || 172,
        bmi: Number(record.bmi) || 23.6,
        bloodGroup: record.bloodGroup || 'O+',
        emergencyContact: record.emergencyContact || '',
        maritalStatus: record.maritalStatus || 'Single',
        fitnessGoal: record.fitnessGoal || 'General Fitness',
        address: record.address || 'Phase 7, Mohali, Punjab',
        birthdayDate: record.birthdayDate || '',
        biometricId: clientId,
        deviceUserId: clientId,
        biometricStatus: 'Linked',
        daysLeft: activeExpiry ? Math.max(0, Math.round((new Date(activeExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : 30,
        membershipHistory: history,
        hasPersonalTraining: hasPT,
        sessionsTotal: hasPT ? 12 : 0,
        sessionsRemaining: hasPT ? 12 : 0,
        ptProgress: hasPT ? 100 : 0,
        nextSession: hasPT ? 'Tomorrow 10:00 AM' : '',
        nextPtSession: hasPT ? 'Tomorrow 10:00 AM' : '',
        attendanceCount: 0,
        streak: 1,
        goalWeight: 65,
        attendancePercent: 100,
        avatar: record.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name.replace(' ', '')}`,
        referralCode: name.substring(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900),
        
        // App fields (Step 14)
        qrCodeValue: `qr_${uid}`,
        walletBalance: 100,
        tempPassword: 'password123',
        notificationToken: `tok_${Math.random().toString(36).substring(2, 11)}`,

        // AI Scores (Step 12 & 13)
        riskScore,
        renewalChance,
        attendanceScore,
        dietCompliance,
        workoutCompliance,
        memberValue,
        alphaScore,
        recommendations,

        migrationSessionId,
        isImportedMember: true,
        createdAt: new Date().toISOString()
      };

      if (firestore) {
        await firestore.collection('members').doc(uid).set(newMember);
      } else {
        (db as any).mockMembers = (db as any).mockMembers || [];
        (db as any).mockMembers.push({ id: uid, ...newMember });
      }

      // Record payments / invoice for imported members
      const matchedPlan = plansList.find(p => {
        const dbName = String(p.name || '').toLowerCase();
        const dbId = String(p.id || '').toLowerCase();
        const reqName = String(activePkg || '').toLowerCase();
        return (
          dbName === reqName ||
          dbId === reqName ||
          dbName.includes(reqName) ||
          reqName.includes(dbName)
        );
      });
      const amt = matchedPlan ? matchedPlan.price : 2500;
      await db.addPayment({
        memberId: uid,
        memberName: name,
        amount: amt,
        plan: activePkg,
        method: 'UPI',
        status: 'paid'
      });

      migrationLogs.push(`[${new Date().toLocaleTimeString()}] Imported new member: ${name} (${phone}) - Plan: ${activePkg}, Expiry: ${activeExpiry}`);
      importedList.push(newMember);
    };

    // Process all records in concurrent batches of 15 to prevent timeouts
    const batchSize = 15;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      await Promise.all(batch.map(record => processRecord(record)));
    }

    migrationLogs.push(`[${new Date().toLocaleTimeString()}] Migration batch completed. Imported: ${importedCount}, Updated duplicates: ${duplicateCount}, Skipped: ${skippedCount}`);

    // Create session status record in migrations collection
    const stats = {
      sessionId: migrationSessionId,
      timestamp: new Date().toISOString(),
      status: 'completed',
      logs: migrationLogs,
      importedUids: importedList.map(m => m.uid),

      // Smart CSV Import Summary stats
      totalRows: payload.length,
      importedMembers: importedCount,
      skippedMembers: skippedCount,
      duplicateMembers: duplicateCount,
      expiredMembers: expiredCount,
      activeMembers: activeCount,
      ptMembers: ptCount,
      enquiryMembers: enquiryCount,
      invalidRows: invalidRows,
      warnings: warnings
    };

    await (db as any).addMigration(stats);

    (db as any).invalidateMembersCache();

    if (!isFirebaseInitialized) {
      (db as any).saveMockDb();
    }

    res.json({
      success: true,
      sessionId: migrationSessionId,
      totalRows: payload.length,
      importedCount,
      skippedCount,
      duplicateCount,
      expiredCount,
      activeCount,
      ptCount,
      enquiryCount,
      invalidRows,
      warnings,
      stats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Revert a migration session. Deletes members, payments, and imported attendance logs.
 */
export const rollbackMigration = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required for rollback' });
    }

    if (!isFirebaseInitialized || !admin) {
      const migrations = await (db as any).getMigrations();
      const mig = migrations.find((m: any) => m.sessionId === sessionId);
      if (!mig) {
        return res.status(404).json({ error: 'Migration session not found' });
      }
      if (mig.status === 'rolled_back') {
        return res.status(400).json({ error: 'This migration session has already been rolled back' });
      }
      const importedUids = mig.importedUids || [];
      await (db as any).rollbackMockMigration(importedUids, sessionId);
      (db as any).invalidateMembersCache();
      return res.json({ success: true, message: `Rollback completed. Deleted ${importedUids.length} mock members.` });
    }

    const firestore = admin.firestore();
    const auth = admin.auth();

    const migRef = firestore.collection('migrations').doc(sessionId);
    const migSnap = await migRef.get();
    if (!migSnap.exists) {
      return res.status(404).json({ error: 'Migration session not found' });
    }

    const migData = migSnap.data();
    if (migData?.status === 'rolled_back') {
      return res.status(400).json({ error: 'This migration session has already been rolled back' });
    }

    const importedUids: string[] = migData?.importedUids || [];

    // Delete members, users, and Auth credentials
    for (const uid of importedUids) {
      try {
        await firestore.collection('members').doc(uid).delete();
      } catch (err) {}
      try {
        await firestore.collection('users').doc(uid).delete();
      } catch (err) {}
      try {
        await auth.deleteUser(uid);
      } catch (err) {}
    }

    // Delete payments matching these members
    const paySnap = await firestore.collection('payments').get();
    for (const doc of paySnap.docs) {
      const p = doc.data();
      if (importedUids.includes(p.memberId)) {
        await firestore.collection('payments').doc(doc.id).delete();
      }
    }

    // Delete attendance check-in records imported for this session
    const attSnap = await firestore.collection('attendance').get();
    for (const doc of attSnap.docs) {
      const a = doc.data();
      if (importedUids.includes(a.memberId)) {
        await firestore.collection('attendance').doc(doc.id).delete();
      }
    }

    // Mark migration session as rolled_back
    await migRef.update({
      status: 'rolled_back',
      rolledBackAt: new Date().toISOString()
    });

    (db as any).invalidateMembersCache();

    res.json({ success: true, message: `Rollback completed. Deleted ${importedUids.length} members.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Manually link a CRM member to a Device User ID slot.
 */
export const mapBiometricUser = async (req: Request, res: Response) => {
  try {
    const { memberId, deviceUserId } = req.body;
    if (!memberId || !deviceUserId) {
      return res.status(400).json({ error: 'memberId and deviceUserId are required' });
    }

    const members = await db.getMembers();
    const member = members.find(m => m.id === memberId || m.uid === memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Read cached device users list to resolve fingerprint status details
    let fingerprintsCount = 0;
    let deviceName = 'ESSL K90 Pro';
    if (isFirebaseInitialized && admin) {
      const doc = await admin.firestore().collection('device_users').doc(String(deviceUserId)).get();
      if (doc.exists) {
        const data = doc.data();
        fingerprintsCount = data?.fingerprintCount || 0;
        deviceName = data?.deviceName || deviceName;
      }
    }

    const updates = {
      deviceUserId: String(deviceUserId),
      biometricEnrolled: fingerprintsCount > 0,
      fingerprintCount: fingerprintsCount,
      deviceName,
      biometricStatus: 'Linked',
      lastBiometricSync: new Date().toISOString()
    };

    await db.updateMember(member.id, updates);

    // Save a backup doc in biometric_profiles collection
    if (isFirebaseInitialized && admin) {
      await admin.firestore().collection('biometric_profiles').doc(member.id).set({
        memberId: member.id,
        memberName: member.name,
        biometricId: member.biometricId || String(deviceUserId),
        deviceUserId: String(deviceUserId),
        fingerprintCount: fingerprintsCount,
        fingerprintStatus: fingerprintsCount > 0 ? 'enrolled' : 'not_enrolled',
        deviceName,
        lastSync: new Date().toISOString()
      }, { merge: true });
    }

    res.json({ success: true, message: `Successfully mapped member ${member.name} to device ID slot ${deviceUserId}.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Fetch all users read from ESSL device.
 */
export const getDeviceUsers = async (req: Request, res: Response) => {
  try {
    if (isFirebaseInitialized && admin) {
      const snap = await admin.firestore().collection('device_users').get();
      if (snap.empty) {
        const defaultDeviceUsers = [
          { userId: '334', name: 'Parasdeep Singh', privilege: 0, fingerprintCount: 1, card: '', status: 'active' },
          { userId: '333', name: 'Md Naushad Altmas', privilege: 0, fingerprintCount: 2, card: '', status: 'active' },
          { userId: '332', name: 'MD. Altmash Khushtar', privilege: 0, fingerprintCount: 1, card: '', status: 'active' },
          { userId: '331', name: 'Kavita', privilege: 0, fingerprintCount: 1, card: '', status: 'active' },
          { userId: '330', name: 'Rohan Gupta', privilege: 0, fingerprintCount: 1, card: '', status: 'active' },
          { userId: '329', name: 'Sonia Sharma', privilege: 0, fingerprintCount: 2, card: '', status: 'active' }
        ];
        for (const user of defaultDeviceUsers) {
          await admin.firestore().collection('device_users').doc(user.userId).set(user);
        }
        return res.json(defaultDeviceUsers);
      }
      const list = snap.docs.map(doc => doc.data());
      res.json(list);
    } else {
      // Mock placeholder list
      res.json([
        { userId: '334', name: 'Parasdeep Singh', privilege: 0, fingerprintCount: 1, card: '', status: 'active' },
        { userId: '333', name: 'Md Naushad Altmas', privilege: 0, fingerprintCount: 2, card: '', status: 'active' },
        { userId: '332', name: 'MD. Altmash Khushtar', privilege: 0, fingerprintCount: 1, card: '', status: 'active' },
        { userId: '331', name: 'Kavita', privilege: 0, fingerprintCount: 1, card: '', status: 'active' }
      ]);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Fetch migration session logs.
 */
export const getMigrations = async (req: Request, res: Response) => {
  try {
    const list = await (db as any).getMigrations();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Seed ZK device users cache automatically.
 */
export const seedDeviceUsers = async (req: Request, res: Response) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ error: 'Invalid payload: users array is required' });
    }

    if (isFirebaseInitialized && admin) {
      const db = admin.firestore();
      const batchSize = 400;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = db.batch();
        const chunk = users.slice(i, i + batchSize);
        for (const u of chunk) {
          if (!u.userId) continue;
          const ref = db.collection('device_users').doc(String(u.userId));
          batch.set(ref, {
            userId: String(u.userId),
            name: String(u.name || `Member ${u.userId}`),
            privilege: 0,
            fingerprintCount: 1,
            card: '',
            status: 'active',
            lastSync: new Date().toISOString()
          }, { merge: true });
        }
        await batch.commit();
      }
    }
    res.json({ success: true, message: `Successfully seeded ${users.length} user slots in device cache.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Purge all CRM data (members, member user accounts, migrations, payments, attendance logs, and auth users).
 * Protects system administrator/staff accounts.
 */
export const purgeCRMData = async (req: any, res: any) => {
  try {
    if (!isFirebaseInitialized || !admin) {
      const stats = await (db as any).purgeMocks();
      return res.json({ success: true, message: 'CRM Mock Data purged successfully', stats });
    }

    const firestoreDb = admin.firestore();
    const auth = admin.auth();

    const collectionsToClean = [
      'members',
      'biometric_profiles',
      'dailyDietLogs',
      'diets',
      'referrals',
      'followups',
      'notifications',
      'accessLogs',
      'deviceLogs',
      'sync_logs',
      'payments',
      'attendance',
      'workouts',
      'cheatMealRequests',
      'deviceUsers',
      'device_users'
    ];

    const stats: Record<string, number> = {};

    // 1. Delete transactional / member data collections
    for (const collName of collectionsToClean) {
      const snap = await firestoreDb.collection(collName).get();
      if (!snap.empty) {
        stats[collName] = snap.size;
        const deletePromises = snap.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
      } else {
        stats[collName] = 0;
      }
    }

    // 2. Delete member users from users collection (keeping admin/owner/manager/trainer/receptionist)
    const usersSnap = await firestoreDb.collection('users').get();
    let deletedUserProfiles = 0;
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const isStaff = ['gym_owner', 'super_admin', 'branch_manager', 'trainer', 'receptionist'].includes(data.role || '');
      const isStaffEmail = data.email && ['owner@alphagym.com', 'superadmin@alphagym.com', 'manager@alphagym.com', 'trainer@alphagym.com', 'reception@alphagym.com'].includes(data.email);

      if (!isStaff && !isStaffEmail) {
        await doc.ref.delete();
        deletedUserProfiles++;
      }
    }
    stats['user_profiles'] = deletedUserProfiles;

    // 3. Delete migration sessions
    const migrationsSnap = await firestoreDb.collection('migrations').get();
    stats['migrations'] = migrationsSnap.size;
    const migrationDeletePromises = migrationsSnap.docs.map(doc => doc.ref.delete());
    await Promise.all(migrationDeletePromises);

    // 4. Delete Firebase Auth users with email ending with '@alphagym.com' (excluding staff emails)
    let nextPageToken: string | undefined = undefined;
    let authDeletedCount = 0;
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      const usersToDelete = listUsersResult.users.filter(user => {
        const email = user.email || '';
        const isStaffEmail = ['owner@alphagym.com', 'superadmin@alphagym.com', 'manager@alphagym.com', 'trainer@alphagym.com', 'reception@alphagym.com'].includes(email);
        const endsWithAlphaGym = email.endsWith('@alphagym.com');
        const startsWithMig = user.uid.startsWith('m_mig_');
        return (endsWithAlphaGym || startsWithMig) && !isStaffEmail;
      });
      
      if (usersToDelete.length > 0) {
        const uids = usersToDelete.map(u => u.uid);
        const deleteResult = await auth.deleteUsers(uids);
        authDeletedCount += deleteResult.successCount;
      }
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    stats['auth_users'] = authDeletedCount;

    // Invalidate Cache
    const dbIndex = require('../firebase');
    if (dbIndex && dbIndex.db && dbIndex.db.invalidateMembersCache) {
      dbIndex.db.invalidateMembersCache();
    }

    res.json({ success: true, message: 'CRM purged successfully', stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
