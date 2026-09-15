import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { PASTEL_PALETTE } from '../../data/subjectColors';
import { findSwatchByHex } from '../../utils/colorUtils';

interface SubjectColorPickerProps {
  currentColor: string;
  defaultColor?: string;
  onColorChange: (color: string) => void;
  onResetDefault?: () => void;
  idPrefix?: string;
}

export const SubjectColorPicker: React.FC<SubjectColorPickerProps> = ({
  currentColor,
  defaultColor,
  onColorChange,
  onResetDefault,
  idPrefix = 'color-picker',
}) => {
  const currentSwatch = findSwatchByHex(currentColor);
  const isDefault = defaultColor ? currentColor.toLowerCase() === defaultColor.toLowerCase() : false;

  return (
    <div id={`${idPrefix}-container`} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">
          Bảng màu pastel (20 màu)
        </label>
        {defaultColor && onResetDefault && !isDefault && (
          <button
            id={`${idPrefix}-btn-reset-default`}
            type="button"
            onClick={onResetDefault}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Khôi phục mặc định</span>
          </button>
        )}
      </div>

      {/* 20 Swatch Grid (5 cols x 4 rows) */}
      <div
        id={`${idPrefix}-grid`}
        className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
      >
        {PASTEL_PALETTE.map((swatch) => {
          const isSelected = currentColor.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <button
              key={swatch.id}
              id={`${idPrefix}-swatch-${swatch.id}`}
              type="button"
              onClick={() => onColorChange(swatch.hex)}
              aria-label={`Chọn màu ${swatch.name}`}
              title={`${swatch.name} (${swatch.hex})`}
              className={`relative w-8 h-8 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105 ${
                isSelected
                  ? 'ring-2 ring-sky-500 ring-offset-2 scale-105 z-10 shadow-xs'
                  : 'hover:opacity-90'
              }`}
              style={{
                backgroundColor: swatch.hex,
                border: `1.5px solid ${swatch.borderHex}`,
              }}
            >
              {isSelected && (
                <Check className="w-4 h-4 text-slate-800 stroke-[2.5]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Current Color Indicator */}
      <div
        id={`${idPrefix}-preview`}
        className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Màu đang chọn:</span>
          <div
            className="w-5 h-5 rounded-md border shadow-2xs"
            style={{
              backgroundColor: currentColor,
              borderColor: currentSwatch?.borderHex || '#cbd5e1',
            }}
          />
          <span className="font-semibold text-slate-800">
            {currentSwatch?.name || 'Màu tùy chọn'}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {currentColor.toUpperCase()}
          </span>
        </div>

        {isDefault && (
          <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
            Mặc định
          </span>
        )}
      </div>
    </div>
  );
};
