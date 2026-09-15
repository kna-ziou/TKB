/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings2,
  ShieldCheck,
  Zap,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Sliders,
  Check,
} from 'lucide-react';
import {
  ApplyCellStrategy,
  ApplyOptions,
  TimetableApplyPlan,
} from '../../types/timetableApply';
import { useAIImageImport } from '../../context/AIImageImportContext';

interface ApplyOptionsPanelProps {
  plan: TimetableApplyPlan | null;
}

export const ApplyOptionsPanel: React.FC<ApplyOptionsPanelProps> = ({ plan }) => {
  const { applyOptions, updateApplyOptions } = useAIImageImport();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!applyOptions || !plan) return null;

  const handleStrategyChange = (strategy: ApplyCellStrategy) => {
    updateApplyOptions({ cellStrategy: strategy });
  };

  const handleToggleDestructive = () => {
    updateApplyOptions({ allowDestructiveClear: !applyOptions.allowDestructiveClear });
  };

  const handleToggleMeta = (field: keyof ApplyOptions['metadata']) => {
    updateApplyOptions({
      metadata: {
        ...applyOptions.metadata,
        [field]: !applyOptions.metadata[field],
      },
    });
  };

  const handleToggleStructure = (field: keyof ApplyOptions['structure']) => {
    updateApplyOptions({
      structure: {
        ...applyOptions.structure,
        [field]: !applyOptions.structure[field],
      },
    });
  };

  const metaFieldsConfig: {
    key: keyof ApplyOptions['metadata'];
    label: string;
    id: string;
  }[] = [
    { key: 'title', label: 'Tiêu đề', id: 'chk-meta-title' },
    { key: 'schoolName', label: 'Trường học', id: 'chk-meta-school' },
    { key: 'className', label: 'Lớp học', id: 'chk-meta-class' },
    { key: 'schoolYear', label: 'Năm học', id: 'chk-meta-year' },
    { key: 'studentName', label: 'Học sinh', id: 'chk-meta-student' },
  ];

  const daysChange = plan.structureChanges.find((s) => s.type === 'days');
  const morningChange = plan.structureChanges.find((s) => s.type === 'morningPeriods');
  const afternoonChange = plan.structureChanges.find((s) => s.type === 'afternoonPeriods');

  return (
    <div
      id="apply-options-panel"
      className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4 text-xs w-full max-w-full min-w-0"
    >
      {/* Header & Toggle Details */}
      <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 className="w-4 h-4 text-violet-600 shrink-0" />
          <h4 className="font-bold text-slate-800 text-sm truncate">
            Tùy chọn chiến lược & Phạm vi áp dụng
          </h4>
        </div>

        <button
          type="button"
          id="btn-toggle-options-expand"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-200/70 transition-colors flex items-center gap-1 font-semibold cursor-pointer shrink-0"
        >
          <span>{isExpanded ? 'Thu gọn tùy chọn' : 'Tùy chỉnh chi tiết'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Primary Cell Merge Strategy (Always Visible Cards) */}
      <div className="space-y-2 w-full max-w-full min-w-0">
        <label className="font-bold text-slate-700 block">
          Chiến lược gộp ô môn học:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-full min-w-0">
          {/* Option 1: fill_empty_only */}
          <button
            type="button"
            id="opt-strategy-fill-empty"
            onClick={() => handleStrategyChange('fill_empty_only')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative min-w-0 ${
              applyOptions.cellStrategy === 'fill_empty_only'
                ? 'bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-500 text-emerald-950 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Chỉ điền ô trống</span>
              </div>
              {applyOptions.cellStrategy === 'fill_empty_only' && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              <strong>Khuyên dùng:</strong> Giữ nguyên 100% các ô đã có môn. Chỉ điền vào các ô đang trống.
            </p>
          </button>

          {/* Option 2: prefer_image */}
          <button
            type="button"
            id="opt-strategy-prefer-image"
            onClick={() => handleStrategyChange('prefer_image')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative min-w-0 ${
              applyOptions.cellStrategy === 'prefer_image'
                ? 'bg-blue-50/90 border-blue-500 ring-1 ring-blue-500 text-blue-950 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Ưu tiên dữ liệu ảnh</span>
              </div>
              {applyOptions.cellStrategy === 'prefer_image' && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Ghi đè ô hiện tại nếu ảnh nhận dạng có môn. Ô hiện tại được giữ nếu ảnh để trống.
            </p>
          </button>

          {/* Option 3: replace_all */}
          <button
            type="button"
            id="opt-strategy-replace-all"
            onClick={() => handleStrategyChange('replace_all')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative min-w-0 ${
              applyOptions.cellStrategy === 'replace_all'
                ? 'bg-violet-50/90 border-violet-500 ring-1 ring-violet-500 text-violet-950 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <RefreshCw className="w-4 h-4 text-violet-600 shrink-0" />
                <span>Thay thế toàn bộ</span>
              </div>
              {applyOptions.cellStrategy === 'replace_all' && (
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Đồng bộ hoàn toàn theo ảnh nhận dạng trong phạm vi thời khóa biểu.
            </p>
          </button>
        </div>
      </div>

      {/* Destructive Clear Toggle */}
      <div
        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 w-full max-w-full min-w-0 ${
          applyOptions.allowDestructiveClear
            ? 'bg-amber-50/90 border-amber-300 text-amber-900'
            : 'bg-white border-slate-200/90 text-slate-700'
        }`}
      >
        <div className="space-y-0.5 min-w-0 flex-1 break-words">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            {applyOptions.allowDestructiveClear && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <span>Cho phép xóa ô hiện có khi ảnh là ô trống</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {applyOptions.allowDestructiveClear
              ? 'CẢNH BÁO: Các ô hiện có nội dung sẽ bị xóa nếu ảnh nhận dạng không có môn.'
              : 'Mặc định: Các ô hiện có môn học sẽ không bao giờ bị xóa nếu ảnh nhận dạng là ô trống.'}
          </p>
        </div>

        <button
          type="button"
          id="toggle-destructive-clear"
          role="switch"
          aria-checked={applyOptions.allowDestructiveClear}
          onClick={handleToggleDestructive}
          className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
            applyOptions.allowDestructiveClear ? 'bg-amber-600' : 'bg-slate-300'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              applyOptions.allowDestructiveClear ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Expandable Details: Metadata and Structure */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-200/80 space-y-4 animate-in fade-in duration-150 w-full max-w-full min-w-0">
          {/* Metadata options: Explicit 3-value comparison preview */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs w-full max-w-full min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs min-w-0">
                <FileText className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span className="truncate">Cập nhật thông tin chung</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium shrink-0">
                {plan.summary.metadataChanged > 0
                  ? `${plan.summary.metadataChanged} mục sẽ thay đổi`
                  : 'Giữ nguyên thông tin hiện tại'}
              </span>
            </div>

            {/* Desktop View: Compact comparison table (>= md) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/90 w-full max-w-full min-w-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] text-slate-600 font-semibold">
                    <th className="py-2.5 px-3 w-28">Trường</th>
                    <th className="py-2.5 px-3">Hiện tại</th>
                    <th className="py-2.5 px-3">Ảnh nhận dạng</th>
                    <th className="py-2.5 px-3">Kết quả sau áp dụng</th>
                    <th className="py-2.5 px-3 text-center w-24">Áp dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                  {metaFieldsConfig.map((field) => {
                    const metaChange = plan.metadataChanges.find((m) => m.field === field.key);
                    const currentVal = metaChange?.currentValue ?? '';
                    const aiVal = metaChange?.aiValue ?? null;
                    const hasAiValue = Boolean(aiVal && aiVal.trim() !== '');
                    const isChecked = Boolean(applyOptions.metadata[field.key]);
                    const isEquivalent = Boolean(
                      hasAiValue &&
                      currentVal.trim().toLowerCase() === (aiVal || '').trim().toLowerCase()
                    );

                    // Final resulting value based on checkbox & AI presence
                    const resultVal = isChecked && hasAiValue ? (aiVal || '') : currentVal;
                    const isModified = isChecked && hasAiValue && !isEquivalent;

                    // Text labels per specification: Thay đổi, Không đổi, Giữ nguyên
                    let statusLabel: string;
                    let statusBadgeClass: string;

                    if (!hasAiValue) {
                      statusLabel = 'Giữ nguyên';
                      statusBadgeClass = 'bg-slate-100 text-slate-500 border border-slate-200/60 font-medium';
                    } else if (isEquivalent) {
                      statusLabel = 'Không đổi';
                      statusBadgeClass = 'bg-slate-100 text-slate-600 border border-slate-200/60 font-medium';
                    } else if (isChecked) {
                      statusLabel = 'Thay đổi';
                      statusBadgeClass = 'bg-violet-100 text-violet-800 border border-violet-200 font-bold';
                    } else {
                      statusLabel = 'Giữ nguyên';
                      statusBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-200/80 font-medium';
                    }

                    return (
                      <tr
                        key={`desktop-meta-${field.key}`}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Field Label */}
                        <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                          {field.label}
                        </td>

                        {/* Current Value */}
                        <td className="py-2.5 px-3 text-slate-600 max-w-[170px]">
                          {currentVal ? (
                            <span className="truncate block" title={currentVal}>
                              {currentVal}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-normal">
                              (Trống)
                            </span>
                          )}
                        </td>

                        {/* AI Recognized Value */}
                        <td className="py-2.5 px-3 max-w-[190px]">
                          {hasAiValue ? (
                            <span
                              className="font-medium text-slate-800 truncate block"
                              title={aiVal || ''}
                            >
                              {aiVal}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Không có dữ liệu từ ảnh
                            </span>
                          )}
                        </td>

                        {/* Resulting Value & Status */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`truncate max-w-[170px] ${
                                isModified ? 'font-bold text-violet-900' : 'font-medium text-slate-700'
                              }`}
                              title={resultVal}
                            >
                              {resultVal ? resultVal : <span className="text-slate-400 italic font-normal">(Trống)</span>}
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${statusBadgeClass}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        </td>

                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <label
                            className={`inline-flex items-center justify-center p-1 rounded-md ${
                              !hasAiValue
                                ? 'cursor-not-allowed opacity-40'
                                : 'cursor-pointer hover:bg-slate-100'
                            }`}
                            title={
                              !hasAiValue
                                ? 'Không có dữ liệu từ ảnh'
                                : isChecked
                                ? 'Bỏ chọn để giữ nguyên dữ liệu hiện tại'
                                : 'Chọn để áp dụng dữ liệu từ ảnh'
                            }
                          >
                            <input
                              type="checkbox"
                              id={field.id}
                              checked={hasAiValue && isChecked}
                              disabled={!hasAiValue}
                              onChange={() => handleToggleMeta(field.key)}
                              className="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500 disabled:cursor-not-allowed cursor-pointer"
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Stacked metadata cards (< md, e.g. 390px, no overflow) */}
            <div className="block md:hidden space-y-2 w-full max-w-full min-w-0">
              {metaFieldsConfig.map((field) => {
                const metaChange = plan.metadataChanges.find((m) => m.field === field.key);
                const currentVal = metaChange?.currentValue ?? '';
                const aiVal = metaChange?.aiValue ?? null;
                const hasAiValue = Boolean(aiVal && aiVal.trim() !== '');
                const isChecked = Boolean(applyOptions.metadata[field.key]);
                const isEquivalent = Boolean(
                  hasAiValue &&
                  currentVal.trim().toLowerCase() === (aiVal || '').trim().toLowerCase()
                );

                const resultVal = isChecked && hasAiValue ? (aiVal || '') : currentVal;
                const isModified = isChecked && hasAiValue && !isEquivalent;

                let statusLabel: string;
                let statusBadgeClass: string;

                if (!hasAiValue) {
                  statusLabel = 'Giữ nguyên';
                  statusBadgeClass = 'bg-slate-100 text-slate-500 border border-slate-200/60 font-medium';
                } else if (isEquivalent) {
                  statusLabel = 'Không đổi';
                  statusBadgeClass = 'bg-slate-100 text-slate-600 border border-slate-200/60 font-medium';
                } else if (isChecked) {
                  statusLabel = 'Thay đổi';
                  statusBadgeClass = 'bg-violet-100 text-violet-800 border border-violet-200 font-bold';
                } else {
                  statusLabel = 'Giữ nguyên';
                  statusBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-200/80 font-medium';
                }

                return (
                  <div
                    key={`mobile-meta-${field.key}`}
                    className={`p-3 rounded-xl border transition-colors w-full max-w-full min-w-0 ${
                      isModified
                        ? 'bg-violet-50/40 border-violet-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-800 text-xs shrink-0">{field.label}</span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] shrink-0 ${statusBadgeClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <label
                        className={`flex items-center gap-1 text-xs font-semibold select-none shrink-0 ${
                          !hasAiValue
                            ? 'opacity-40 cursor-not-allowed text-slate-400'
                            : 'cursor-pointer text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`${field.id}-mobile`}
                          checked={hasAiValue && isChecked}
                          disabled={!hasAiValue}
                          onChange={() => handleToggleMeta(field.key)}
                          className="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500 disabled:cursor-not-allowed cursor-pointer"
                        />
                        <span className="text-[11px]">Áp dụng</span>
                      </label>
                    </div>

                    <div className="pt-2 space-y-1 text-xs min-w-0">
                      <div className="flex items-baseline justify-between gap-2 min-w-0">
                        <span className="text-[11px] text-slate-500 font-medium shrink-0">
                          Hiện tại:
                        </span>
                        <span className="text-slate-700 text-right truncate min-w-0 flex-1">
                          {currentVal ? currentVal : <span className="text-slate-400 italic">(Trống)</span>}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 min-w-0">
                        <span className="text-[11px] text-slate-500 font-medium shrink-0">
                          Ảnh nhận dạng:
                        </span>
                        <span className="text-slate-800 font-medium text-right truncate min-w-0 flex-1">
                          {hasAiValue ? (
                            aiVal
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Không có dữ liệu từ ảnh
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-100 min-w-0">
                        <span className="text-[11px] text-slate-500 font-bold shrink-0">
                          Kết quả:
                        </span>
                        <span
                          className={`font-bold text-right truncate min-w-0 flex-1 ${
                            isModified ? 'text-violet-700' : 'text-slate-800'
                          }`}
                        >
                          {resultVal ? resultVal : <span className="text-slate-400 italic font-normal">(Trống)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Structure options */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs w-full max-w-full min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs min-w-0">
                <Sliders className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Đồng bộ cấu trúc lưới</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium shrink-0">
                {plan.summary.structureChanged > 0
                  ? `${plan.summary.structureChanged} thay đổi cấu trúc`
                  : 'Cấu trúc không đổi'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-full min-w-0">
              <label className="flex items-start justify-between gap-2 p-2.5 bg-slate-50/70 hover:bg-slate-50 rounded-lg border border-slate-200/60 cursor-pointer min-w-0">
                <div className="space-y-0.5 min-w-0 flex-1 break-words">
                  <span className="text-slate-800 font-medium block">
                    Đồng bộ số ngày học
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {daysChange ? `${daysChange.currentDescription} → ${daysChange.proposedDescription}` : 'Cấu trúc ngày'}
                  </span>
                </div>
                <input
                  id="chk-struct-days"
                  type="checkbox"
                  checked={applyOptions.structure.adjustDays}
                  onChange={() => handleToggleStructure('adjustDays')}
                  className="mt-1 rounded text-violet-600 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-start justify-between gap-2 p-2.5 bg-slate-50/70 hover:bg-slate-50 rounded-lg border border-slate-200/60 cursor-pointer min-w-0">
                <div className="space-y-0.5 min-w-0 flex-1 break-words">
                  <span className="text-slate-800 font-medium block">
                    Đồng bộ số tiết sáng / chiều
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Sáng: {morningChange ? `${morningChange.currentDescription} → ${morningChange.proposedDescription}` : ''}
                    {afternoonChange ? ` | Chiều: ${afternoonChange.currentDescription} → ${afternoonChange.proposedDescription}` : ''}
                  </span>
                </div>
                <input
                  id="chk-struct-periods"
                  type="checkbox"
                  checked={applyOptions.structure.adjustPeriods}
                  onChange={() => handleToggleStructure('adjustPeriods')}
                  className="mt-1 rounded text-violet-600 cursor-pointer shrink-0"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
