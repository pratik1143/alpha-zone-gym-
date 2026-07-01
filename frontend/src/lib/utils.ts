export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const formatTime = (timeString: string): string => {
  if (!timeString) return '—';
  const d = new Date(timeString);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const daysUntilExpiry = (expiryDateString: string): number => {
  if (!expiryDateString) return 0;
  const expiry = new Date(expiryDateString);
  const today = new Date();
  const expiryMidnight = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffTime = expiryMidnight.getTime() - todayMidnight.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const formatDaysLeft = (expiryDateString: string): string => {
  if (!expiryDateString) return 'No Expiry';
  const days = daysUntilExpiry(expiryDateString);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `${days} Days`;
  
  const absDays = Math.abs(days);
  if (absDays === 1) return 'Expired Yesterday';
  if (absDays < 30) return `Expired ${absDays} Days Ago`;
  
  const months = Math.round(absDays / 30);
  if (months === 1) return 'Expired 1 Month Ago';
  return `Expired ${months} Months Ago`;
};

export const getInitials = (name: string): string => {
  if (!name) return 'AZ';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

export const getRandomColor = (name: string): string => {
  const colors = [
    '#00E5FF', // Cyan
    '#7C3AED', // Purple
    '#22C55E', // Green
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#3B82F6', // Blue
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

export const calculateRealAttendance = (joinDateString: string, attendanceCount: number): number => {
  if (!attendanceCount || attendanceCount <= 0) return 0;
  if (!joinDateString) return 0;
  
  const joinDate = new Date(joinDateString);
  const today = new Date();
  
  // Cap at 0 if join date is in the future
  if (joinDate > today) return 0;

  const diffTime = today.getTime() - joinDate.getTime();
  const elapsedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  // Calculate percentage (can't be over 100%)
  const percentage = Math.round((attendanceCount / elapsedDays) * 100);
  return Math.min(100, percentage);
};
