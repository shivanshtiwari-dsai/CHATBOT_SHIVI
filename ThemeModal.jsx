import React, { useEffect } from 'react';

/**
 * ShiviAI Theme Selection Palette Modal
 * 
 * 5 Distinct Aesthetic Themes:
 * 1. Cyberpunk Neon (Default): Cyan (#06b6d4) & Neon Pink (#ec4899), Obsidian Dark (#0b0f19)
 * 2. Emerald Matrix: Emerald Green (#10b981) & Mint (#34d399), Deep Forest (#061412)
 * 3. Royal Violet: Electric Purple (#8b5cf6) & Violet (#c084fc), Midnight Plum (#0d0b18)
 * 4. Sunset Amber: Amber Gold (#f59e0b) & Orange (#f97316), Dark Espresso (#170d06)
 * 5. OLED Monochrome: Crisp Silver (#e2e8f0) & Slate (#64748b), Pure Pitch Black (#000000)
 */

export const THEME_PALETTES = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    icon: '🌌',
    description: 'High-contrast obsidian darkness with electric cyan and neon magenta accents.',
    primary: '#06b6d4',
    accent: '#ec4899',
    background: '#0b0f19',
    gradient: 'linear-gradient(135deg, #06b6d4, #ec4899)',
    borderGlow: 'rgba(6, 182, 212, 0.4)'
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    icon: '🌿',
    description: 'Deep cyber-botanical forest tones with soothing luminous emerald & mint accents.',
    primary: '#10b981',
    accent: '#34d399',
    background: '#061412',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    borderGlow: 'rgba(16, 185, 129, 0.4)'
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    icon: '🔮',
    description: 'Mystical midnight plum aura illuminated with electric cosmic violet and purple glows.',
    primary: '#8b5cf6',
    accent: '#c084fc',
    background: '#0d0b18',
    gradient: 'linear-gradient(135deg, #8b5cf6, #c084fc)',
    borderGlow: 'rgba(139, 92, 246, 0.4)'
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    icon: '🌇',
    description: 'Dark roasted espresso backdrops radiating warm golden hour amber and citrus fire.',
    primary: '#f59e0b',
    accent: '#f97316',
    background: '#170d06',
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    borderGlow: 'rgba(245, 158, 11, 0.4)'
  },
  {
    id: 'monochrome',
    name: 'OLED Monochrome',
    icon: '🌑',
    description: 'Zero light bleed with pure true black and crisp silver & slate accents.',
    primary: '#e2e8f0',
    accent: '#64748b',
    background: '#000000',
    gradient: 'linear-gradient(135deg, #e2e8f0, #64748b)',
    borderGlow: 'rgba(226, 232, 240, 0.35)'
  }
];

export default function ThemeModal({
  isOpen = false,
  onClose = () => { },
  activeTheme = 'cyberpunk',
  setActiveTheme = () => { }
}) {
  // Sync Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectTheme = (themeId) => {
    // 1. Update HTML/Body attributes for instant live switching
    document.documentElement.setAttribute('data-theme', themeId);
    document.body.setAttribute('data-theme', themeId);
    document.documentElement.classList.add('dark', 'theme-dark');
    document.documentElement.classList.remove('theme-light');

    // 2. Persist strictly in MongoDB via backend API (Zero client-side localStorage)
    fetch('/api/users/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themePreference: themeId })
    }).catch(() => {});

    // 3. Update React state
    if (typeof setActiveTheme === 'function') {
      setActiveTheme(themeId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all duration-300 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-[#111827]/90 text-slate-100 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <h3 id="theme-modal-title" className="text-xl font-bold text-white tracking-tight">
                Select UI Theme
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose an aesthetic visual palette for your ShiviAI workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close modal (Esc)"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme Cards Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {THEME_PALETTES.map((theme) => {
              const isSelected = activeTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectTheme(theme.id);
                    }
                  }}
                  className={`relative flex flex-col justify-between p-4 rounded-xl cursor-pointer border transition-all duration-200 select-none group outline-none
                    ${isSelected
                      ? 'bg-white/[0.08] border-cyan-400 shadow-lg'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-md'
                    }`}
                  style={{
                    borderColor: isSelected ? theme.primary : undefined,
                    boxShadow: isSelected ? `0 0 24px ${theme.borderGlow}` : undefined
                  }}
                >
                  {/* Card Title & Active Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" role="img" aria-label={theme.name}>
                          {theme.icon}
                        </span>
                        <h4 className="font-semibold text-sm text-white tracking-tight">
                          {theme.name}
                        </h4>
                      </div>

                      {isSelected && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-black shadow-sm"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {theme.description}
                    </p>
                  </div>

                  {/* Preview Palette Dots & Gradient */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/5"
                    style={{ backgroundColor: theme.background }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-white/10"
                        style={{ backgroundColor: theme.primary }}
                        title={`Primary: ${theme.primary}`}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-white/10"
                        style={{ backgroundColor: theme.accent }}
                        title={`Accent: ${theme.accent}`}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-white/20"
                        style={{ backgroundColor: theme.background }}
                        title={`Background: ${theme.background}`}
                      />
                    </div>

                    <div
                      className="w-12 h-2 rounded-full shadow-inner"
                      style={{ background: theme.gradient }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Themes update live across the entire interface and persist across sessions.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-200 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
