import { getFirestoreDb } from '../firebase';

export const MAX_DEVICE_BIOMETRIC_ID = 65535;

export function isValidDeviceBiometricId(value: unknown): boolean {
  const raw = String(value ?? '').trim();
  if (!/^\d{1,5}$/.test(raw)) return false;
  const numeric = Number(raw);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= MAX_DEVICE_BIOMETRIC_ID;
}

/** Reserve only IDs that the EasyBio device can actually accept. */
export async function getNextAvailableBiometricId(): Promise<number> {
  const firestore = getFirestoreDb();
  if (!firestore) throw new Error('CRM/Firebase is unavailable; a safe biometric ID cannot be allocated.');

  const [members, employees, deviceUsers, legacyDeviceUsers] = await Promise.all([
    firestore.collection('members').get(),
    firestore.collection('employees').get(),
    firestore.collection('deviceUsers').get(),
    firestore.collection('device_users').get()
  ]);
  const used = new Set<number>();
  const addIfValid = (value: unknown) => {
    if (isValidDeviceBiometricId(value)) used.add(Number(value));
  };

  for (const snapshot of [members, employees]) {
    for (const doc of snapshot.docs) {
      const record = doc.data();
      addIfValid(record.biometricId);
      addIfValid(record.deviceUserId);
    }
  }
  for (const snapshot of [deviceUsers, legacyDeviceUsers]) {
    for (const doc of snapshot.docs) {
      const record = doc.data();
      addIfValid(record.userId);
      addIfValid(record.user_id);
      if (!record.userId && !record.user_id) addIfValid(doc.id);
    }
  }

  const highestUsed = used.size ? Math.max(...used) : 0;
  if (highestUsed < MAX_DEVICE_BIOMETRIC_ID) return highestUsed + 1;
  for (let candidate = 1; candidate <= MAX_DEVICE_BIOMETRIC_ID; candidate++) {
    if (!used.has(candidate)) return candidate;
  }
  throw new Error('All EasyBio biometric IDs (1–65535) are already assigned.');
}
