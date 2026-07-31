import React, { useMemo } from 'react';
import { DuoAvatarSvg, parseAvatarConfig, DuoAvatarConfig } from './DuoAvatarSvg';

interface AvatarRendererProps {
  avatar: string | undefined | null;
  size?: number;
  className?: string;
  showBackground?: boolean;
}

// In-memory cache map for parsed avatar configurations to make leaderboard rendering instantaneous
const avatarConfigCache = new Map<string, DuoAvatarConfig | null>();

export function getCachedAvatarConfig(avatarStr: string | undefined | null): DuoAvatarConfig | null {
  if (!avatarStr || typeof avatarStr !== 'string') return null;
  if (avatarConfigCache.has(avatarStr)) {
    return avatarConfigCache.get(avatarStr)!;
  }
  const parsed = parseAvatarConfig(avatarStr);
  // Cap cache size at 500 entries
  if (avatarConfigCache.size > 500) {
    const firstKey = avatarConfigCache.keys().next().value;
    if (firstKey) avatarConfigCache.delete(firstKey);
  }
  avatarConfigCache.set(avatarStr, parsed);
  return parsed;
}

export default function AvatarRenderer({
  avatar,
  size = 40,
  className = '',
  showBackground = true,
}: AvatarRendererProps) {
  const parsedConfig = useMemo(() => {
    return getCachedAvatarConfig(avatar);
  }, [avatar]);

  if (parsedConfig) {
    return (
      <DuoAvatarSvg
        config={parsedConfig}
        size={size}
        className={className}
        showBackground={showBackground}
      />
    );
  }

  // Fallback: render emoji or default icon
  const displayEmoji = (avatar && typeof avatar === 'string' && !avatar.startsWith('d:')) ? avatar : '🎓';

  return (
    <span
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ fontSize: `${Math.max(12, Math.round(size * 0.6))}px`, width: `${size}px`, height: `${size}px` }}
    >
      {displayEmoji}
    </span>
  );
}
