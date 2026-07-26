'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { getInitials, getRandomColor } from '@/lib/utils';

export interface MemberAvatarProps {
  member?: any;
  src?: string;
  name?: string;
  className?: string;
  size?: number;
  showFallbackBadge?: boolean;
}

/**
 * Priority order for image rendering:
 * 1. profilePhotoUrl
 * 2. firebasePhotoUrl
 * 3. legacyPhotoUrl (or originalPhotoUrl)
 * 4. avatar (if not dicebear SVG)
 * 5. Initials badge / clean SVG fallback (on load error or missing image)
 */
export function getMemberPhotoUrl(member: any): string | null {
  if (!member) return null;

  const profile = member.profilePhotoUrl;
  if (profile && typeof profile === 'string' && profile.trim() !== '' && !profile.includes('dicebear.com')) {
    return profile;
  }

  const firebase = member.firebasePhotoUrl;
  if (firebase && typeof firebase === 'string' && firebase.trim() !== '' && !firebase.includes('dicebear.com')) {
    return firebase;
  }

  const legacy = member.legacyPhotoUrl || member.originalPhotoUrl || member.photoUrl;
  if (legacy && typeof legacy === 'string' && legacy.trim() !== '' && !legacy.includes('dicebear.com')) {
    return legacy;
  }

  const avatar = member.avatar || member.avatarUrl;
  if (avatar && typeof avatar === 'string' && avatar.trim() !== '' && !avatar.includes('dicebear.com')) {
    return avatar;
  }

  return null;
}

export default function MemberAvatar({
  member,
  src,
  name,
  className = 'w-10 h-10 rounded-full object-cover',
  size = 40,
  showFallbackBadge = true,
}: MemberAvatarProps) {
  const resolvedName = name || member?.name || 'Member';
  const initialPhotoUrl = src || getMemberPhotoUrl(member);

  const [currentSrc, setCurrentSrc] = useState<string | null>(initialPhotoUrl);
  const [hasError, setHasError] = useState<boolean>(!initialPhotoUrl);

  useEffect(() => {
    const newSrc = src || getMemberPhotoUrl(member);
    setCurrentSrc(newSrc);
    setHasError(!newSrc);
  }, [member, src]);

  const handleError = () => {
    setHasError(true);
  };

  if (!hasError && currentSrc) {
    return (
      <img
        src={currentSrc}
        alt={resolvedName}
        className={className}
        onError={handleError}
        loading="lazy"
      />
    );
  }

  // Fallback: Custom styled initials avatar box
  const initials = getInitials(resolvedName);
  const color = getRandomColor(resolvedName);

  return (
    <div
      className={`flex items-center justify-center font-bold text-white shadow-xs rounded-full shrink-0 select-none ${className}`}
      style={{
        backgroundColor: color,
        fontSize: size ? Math.max(10, Math.floor(size * 0.4)) : undefined,
      }}
      title={resolvedName}
    >
      {initials || <User size={Math.floor(size * 0.5)} />}
    </div>
  );
}
