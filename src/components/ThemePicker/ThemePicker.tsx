import React from 'react';
import { Check, Palette } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { THEME_LIST } from '../../data/themes';
import { ThemeId } from '../../types/theme';

export const ThemePicker: React.FC = () => {
  const { state, setTheme } = useTimetable();
  const currentThemeId = state.themeId || 'professional';

  return (
    <section id="setup-section-theme" className="space-y-2.5 pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-sky-600" />
          <span>Phong cách</span>
        </h3>
        <span className="text-[11px] font-semibold text-sky-600 capitalize bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
          {THEME_LIST.find((t) => t.id === currentThemeId)?.name || 'Professional'}
        </span>
      </div>

      {/* Theme Cards Grid (2-column compact layout) */}
      <div
        role="radiogroup"
        aria-label="Chọn phong cách thời khóa biểu"
        className="grid grid-cols-2 gap-2"
      >
        {THEME_LIST.map((theme) => {
          const isActive = theme.id === currentThemeId;
          const { tokens } = theme;

          return (
            <button
              key={`theme-${theme.id}`}
              id={`btn-theme-${theme.id}`}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(theme.id)}
              className={`relative p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1.5 group ${
                isActive
                  ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              {/* Active Indicator Badge */}
              {isActive && (
                <div
                  id={`badge-active-${theme.id}`}
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              {/* CSS Mini Mockup Thumbnail */}
              <div
                className={`w-full h-11 rounded-lg border overflow-hidden p-1 flex flex-col gap-0.5 ${
                  theme.id === 'space'
                    ? 'bg-slate-900 border-indigo-500/40'
                    : theme.id === 'simple'
                    ? 'bg-zinc-100 border-zinc-300'
                    : theme.id === 'fun'
                    ? 'bg-amber-50 border-amber-200'
                    : theme.id === 'kawaii'
                    ? 'bg-pink-50 border-pink-200'
                    : theme.id === 'dino'
                    ? 'bg-stone-100 border-emerald-300'
                    : theme.id === 'robot'
                    ? 'bg-slate-200 border-cyan-400'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* Header bar */}
                <div
                  className={`h-2.5 rounded-xs w-full flex items-center px-1 ${
                    theme.id === 'space'
                      ? 'bg-indigo-950 border-b border-indigo-500/30'
                      : theme.id === 'simple'
                      ? 'bg-zinc-200'
                      : theme.id === 'fun'
                      ? 'bg-amber-200'
                      : theme.id === 'kawaii'
                      ? 'bg-pink-200'
                      : theme.id === 'dino'
                      ? 'bg-emerald-200'
                      : theme.id === 'robot'
                      ? 'bg-cyan-950'
                      : 'bg-sky-100'
                  }`}
                >
                  <div className="w-6 h-1 rounded-xs bg-current opacity-40" />
                </div>

                {/* 2 mini columns with colored mock cells */}
                <div className="flex-1 grid grid-cols-2 gap-1 pt-0.5">
                  <div
                    className="rounded-xs"
                    style={{ backgroundColor: theme.subjectPalette[0] || '#e2e8f0' }}
                  />
                  <div
                    className="rounded-xs"
                    style={{ backgroundColor: theme.subjectPalette[1] || '#cbd5e1' }}
                  />
                </div>
              </div>

              {/* Name & Short Description */}
              <div className="min-w-0 pr-3">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {theme.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate leading-tight">
                  {theme.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
