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
  const expiry = new Date(expiryDateString);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
