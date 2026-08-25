export interface FollowUpTypeStyle {
  key: 'enquiry' | 'renewal' | 'expired' | 'balance' | 'general';
  label: string;
  bgClass: string;
  borderClass: string;
  leftBorderClass: string;
  badgeClass: string;
  dotClass: string;
  avatarBg: string;
  iconColor: string;
  badgeText: string;
}

export function getFollowUpTypeStyle(task: any): FollowUpTypeStyle {
  const rawType = String(task?.type || '').trim().toLowerCase();
  const rawTitle = String(task?.title || '').trim().toLowerCase();
  const rawReason = String(task?.reason || task?.description || '').trim().toLowerCase();

  // 1. ENQUIRY → BLUE (#2563EB)
  if (
    rawType.includes('enquiry') ||
    rawTitle.includes('enquiry') ||
    rawReason.includes('enquiry')
  ) {
    return {
      key: 'enquiry',
      label: 'ENQUIRY',
      bgClass: 'bg-[#EFF6FF] hover:bg-[#EBF3FF]',
      borderClass: 'border-[#BFDBFE]',
      leftBorderClass: 'border-l-4 border-l-[#2563EB]',
      badgeClass: 'bg-[#2563EB] text-white shadow-2xs font-extrabold',
      dotClass: 'bg-[#2563EB]',
      avatarBg: 'bg-blue-100 text-[#2563EB] border border-blue-200',
      iconColor: 'text-[#2563EB]',
      badgeText: 'ENQUIRY',
    };
  }

  // 2. EXPIRED → RED (#DC2626)
  if (
    rawType.includes('expired') ||
    rawTitle.includes('expired') ||
    rawReason.includes('expired')
  ) {
    return {
      key: 'expired',
      label: 'EXPIRED',
      bgClass: 'bg-[#FEF2F2] hover:bg-[#FDE8E8]',
      borderClass: 'border-[#FECACA]',
      leftBorderClass: 'border-l-4 border-l-[#DC2626]',
      badgeClass: 'bg-[#DC2626] text-white shadow-2xs font-extrabold',
      dotClass: 'bg-[#DC2626]',
      avatarBg: 'bg-rose-100 text-[#DC2626] border border-rose-200',
      iconColor: 'text-[#DC2626]',
      badgeText: 'EXPIRED',
    };
  }

  // 3. BALANCE / PAYMENT DUE → YELLOW / AMBER (#D97706)
  if (
    rawType.includes('balance') ||
    rawType.includes('payment') ||
    rawType.includes('pending') ||
    rawTitle.includes('balance') ||
    rawReason.includes('balance') ||
    rawReason.includes('pending')
  ) {
    return {
      key: 'balance',
      label: String(task?.type || '').toUpperCase() === 'PENDING BALANCE' ? 'BALANCE' : (String(task?.type || '').toUpperCase() || 'BALANCE'),
      bgClass: 'bg-[#FFFBEB] hover:bg-[#FEF3C7]',
      borderClass: 'border-[#FDE68A]',
      leftBorderClass: 'border-l-4 border-l-[#D97706]',
      badgeClass: 'bg-[#D97706] text-white shadow-2xs font-extrabold',
      dotClass: 'bg-[#D97706]',
      avatarBg: 'bg-amber-100 text-[#D97706] border border-amber-200',
      iconColor: 'text-[#D97706]',
      badgeText: 'BALANCE',
    };
  }

  // 4. GYM MEMBERSHIP RENEWAL → GREEN (#16A34A)
  if (
    rawType.includes('renewal') ||
    rawType.includes('membership') ||
    rawType.includes('pt') ||
    rawTitle.includes('renewal') ||
    rawReason.includes('renewal')
  ) {
    return {
      key: 'renewal',
      label: String(task?.type || 'GYM MEMBERSHIP RENEWAL').toUpperCase(),
      bgClass: 'bg-[#F0FDF4] hover:bg-[#DCFCE7]',
      borderClass: 'border-[#BBF7D0]',
      leftBorderClass: 'border-l-4 border-l-[#16A34A]',
      badgeClass: 'bg-[#16A34A] text-white shadow-2xs font-extrabold',
      dotClass: 'bg-[#16A34A]',
      avatarBg: 'bg-emerald-100 text-[#16A34A] border border-emerald-200',
      iconColor: 'text-[#16A34A]',
      badgeText: String(task?.type || 'GYM MEMBERSHIP RENEWAL').toUpperCase(),
    };
  }

  // 5. Default General
  return {
    key: 'general',
    label: String(task?.type || 'GENERAL').toUpperCase(),
    bgClass: 'bg-white hover:bg-slate-50',
    borderClass: 'border-slate-200',
    leftBorderClass: 'border-l-4 border-l-slate-400',
    badgeClass: 'bg-slate-700 text-white font-bold',
    dotClass: 'bg-slate-500',
    avatarBg: 'bg-slate-100 text-slate-700 border border-slate-200',
    iconColor: 'text-slate-600',
    badgeText: String(task?.type || 'GENERAL').toUpperCase(),
  };
}
