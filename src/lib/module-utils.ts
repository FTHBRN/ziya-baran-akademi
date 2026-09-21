export type ModuleTheme = 'amber' | 'rose' | 'emerald' | 'sky' | 'purple';

export interface ModuleMetadata {
  description: string;
  badge: string;
  icon: string;
  theme: ModuleTheme;
  tagline?: string;
}

export const MODULE_THEMES: Record<
  ModuleTheme,
  {
    name: string;
    cardBg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    buttonBg: string;
    textColor: string;
    descColor: string;
    accentColor: string;
    circleColor: string;
    subIllustration: string;
    defaultIcon: string;
  }
> = {
  amber: {
    name: 'Şeftali / Amber',
    cardBg: 'bg-gradient-to-br from-[#FFF5EC] via-[#FFF8F2] to-[#FFE9D5]/60',
    border: 'border-[#FDD8B5]/80 hover:border-[#FBA868]',
    badgeBg: 'bg-[#FF9838]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#FF7A00] hover:bg-[#E66E00] text-white shadow-sm shadow-[#FF7A00]/20',
    textColor: 'text-slate-900',
    descColor: 'text-slate-600',
    accentColor: 'text-[#FF7A00]',
    circleColor: 'bg-[#FFE6D0]',
    subIllustration: 'This is my story...',
    defaultIcon: '📖',
  },
  rose: {
    name: 'Gül Pembesi / Mercan',
    cardBg: 'bg-gradient-to-br from-[#FFF0F2] via-[#FFF6F7] to-[#FFE2E6]/60',
    border: 'border-[#FDC5CE]/80 hover:border-[#FA8D9D]',
    badgeBg: 'bg-[#FF5A73]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#4382FF] hover:bg-[#2B6EEA] text-white shadow-sm shadow-[#4382FF]/20',
    textColor: 'text-slate-900',
    descColor: 'text-slate-600',
    accentColor: 'text-[#FF4260]',
    circleColor: 'bg-[#FFE1E6]',
    subIllustration: 'Good Stories Bright Minds',
    defaultIcon: '📕',
  },
  emerald: {
    name: 'Nane Yeşili / Mint',
    cardBg: 'bg-gradient-to-br from-[#EFFFF8] via-[#F4FFFA] to-[#DCFCEE]/60',
    border: 'border-[#A3EED0]/80 hover:border-[#52DBA5]',
    badgeBg: 'bg-[#21C588]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#18A972] hover:bg-[#128E5F] text-white shadow-sm shadow-[#18A972]/20',
    textColor: 'text-slate-900',
    descColor: 'text-slate-600',
    accentColor: 'text-[#18A972]',
    circleColor: 'bg-[#CEF8E5]',
    subIllustration: 'Adventure • Friends • New Worlds',
    defaultIcon: '📚',
  },
  sky: {
    name: 'Gökyüzü Mavisi / Sıcak Sarı',
    cardBg: 'bg-gradient-to-br from-[#F4FAFF] via-[#F8FBFF] to-[#E5F3FF]/70',
    border: 'border-[#BBE0FF]/80 hover:border-[#74BAFF]',
    badgeBg: 'bg-[#2995FF]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#EFA107] hover:bg-[#D48F06] text-white shadow-sm shadow-[#EFA107]/20',
    textColor: 'text-slate-900',
    descColor: 'text-slate-600',
    accentColor: 'text-[#2995FF]',
    circleColor: 'bg-[#D6ECFF]',
    subIllustration: 'Hello • Learn • Dream • Grow',
    defaultIcon: '🍎',
  },
  purple: {
    name: 'Lavanta Moru',
    cardBg: 'bg-gradient-to-br from-[#F8F4FF] via-[#FCFAFF] to-[#EDE3FF]/60',
    border: 'border-[#D9C4FF]/80 hover:border-[#B189FF]',
    badgeBg: 'bg-[#8957FF]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#7D4BF6] hover:bg-[#6836DF] text-white shadow-sm shadow-[#7D4BF6]/20',
    textColor: 'text-slate-900',
    descColor: 'text-slate-600',
    accentColor: 'text-[#8957FF]',
    circleColor: 'bg-[#E7DAFF]',
    subIllustration: 'Practice Makes Progress',
    defaultIcon: '🐶',
  },
};

const THEME_CYCLE: ModuleTheme[] = ['amber', 'rose', 'emerald', 'sky', 'purple'];

/**
 * Decodes module metadata from the raw description string stored in Supabase classes table.
 * Fully backwards-compatible with legacy plain text descriptions.
 */
export function decodeModuleMetadata(
  rawDescription: string | null | undefined,
  indexFallback = 0,
  nameFallback = ''
): ModuleMetadata {
  const fallbackTheme = THEME_CYCLE[indexFallback % THEME_CYCLE.length];

  if (!rawDescription) {
    return {
      description: 'İngilizce öğrenme yolculuğunda yeni bir adım.',
      badge: 'Modül',
      icon: MODULE_THEMES[fallbackTheme].defaultIcon,
      theme: fallbackTheme,
      tagline: MODULE_THEMES[fallbackTheme].subIllustration,
    };
  }

  // Check if encoded as JSON
  const trimmed = rawDescription.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const theme: ModuleTheme = THEME_CYCLE.includes(parsed.theme) ? parsed.theme : fallbackTheme;
      return {
        description: parsed.description || parsed.desc || '',
        badge: parsed.badge || 'Modül',
        icon: parsed.icon || MODULE_THEMES[theme].defaultIcon,
        theme,
        tagline: parsed.tagline || MODULE_THEMES[theme].subIllustration,
      };
    } catch {
      // JSON parse failed, fall through to plain string
    }
  }

  // Plain text description fallback
  return {
    description: trimmed,
    badge: nameFallback.toLowerCase().includes('hikaye') || nameFallback.toLowerCase().includes('story')
      ? 'Story'
      : nameFallback.toLowerCase().includes('kelime') || nameFallback.toLowerCase().includes('vocab')
      ? 'Vocabulary'
      : nameFallback.toLowerCase().includes('gram')
      ? 'Grammar'
      : 'Modül',
    icon: MODULE_THEMES[fallbackTheme].defaultIcon,
    theme: fallbackTheme,
    tagline: MODULE_THEMES[fallbackTheme].subIllustration,
  };
}

/**
 * Encodes metadata into a structured JSON string to store in classes.description.
 */
export function encodeModuleMetadata(meta: Partial<ModuleMetadata>): string {
  return JSON.stringify({
    description: (meta.description || '').trim(),
    badge: (meta.badge || 'Modül').trim(),
    icon: (meta.icon || '📖').trim(),
    theme: meta.theme || 'amber',
    tagline: (meta.tagline || '').trim(),
  });
}
