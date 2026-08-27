'use client';

import React, { useState, useEffect } from 'react';

interface MemberAvatarProps {
  /** Actual photo URL from member profile (photo / avatarUrl / avatar field) */
  photoUrl?: string | null;
  /** Member gender: 'Male' | 'Female' | 'Other' | 'Not specified' or empty */
  gender?: string | null;
  /** Alt text (member name) */
  name?: string;
  /** Diameter in px — default 48 */
  size?: number;
  /** Extra CSS class */
  className?: string;
}

/**
 * Returns the appropriate fallback avatar asset path based on gender.
 */
function getFallbackAvatar(gender?: string | null): string {
  const g = (gender || '').toLowerCase().trim();
  if (g === 'male' || g === 'm') return '/avatar-male.jpg';
  if (g === 'female' || g === 'f') return '/avatar-female.jpg';
  return '/avatar-neutral.jpg';
}

/**
 * MemberAvatar — shows real profile photo with gender-based fallback.
 *
 * Priority:
 *  1. photoUrl (real profile photo) — shown if valid / loads successfully
 *  2. Gender fallback (male / female / neutral illustration)
 *
 * Features:
 *  - Circular, object-fit cover, no stretching
 *  - Handles broken / invalid URLs automatically (onerror → fallback)
 *  - Fallback itself also has a secondary onError chain to neutral
 *  - Clean border matching Alpha Zone blue/green theme
 */
export default function MemberAvatar({
  photoUrl,
  gender,
  name = 'Member',
  size = 48,
  className = '',
}: MemberAvatarProps) {
  const fallback = getFallbackAvatar(gender);
  const [src, setSrc] = useState<string>(
    photoUrl && photoUrl.trim() !== '' ? photoUrl : fallback
  );
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const newFallback = getFallbackAvatar(gender);
    const newSrc = photoUrl && photoUrl.trim() !== '' ? photoUrl : newFallback;
    setSrc(newSrc);
    setHasFailed(false);
  }, [photoUrl, gender]);

  const handleError = () => {
    if (!hasFailed) {
      // First failure: try gender fallback
      setHasFailed(true);
      setSrc(fallback);
    } else {
      // Second failure (fallback itself broken): use neutral
      setSrc('/avatar-neutral.jpg');
    }
  };

  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200/80 bg-slate-100 ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      title={name}
    >
      <img
        src={src}
        alt={name}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        loading="lazy"
      />
    </div>
  );
}
