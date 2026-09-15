/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Check } from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';
import { ReviewMetadata as ReviewMetadataType } from '../../types/timetableReview';

export const ReviewMetadata: React.FC = () => {
  const { reviewDraft, updateMetadataField } = useAIImageImport();
  const [isOpen, setIsOpen] = useState<boolean>(true);

  if (!reviewDraft) return null;

  const { metadata, editedMetadataFields } = reviewDraft;

  const handleFieldChange = (
    field: keyof ReviewMetadataType,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateMetadataField(field, e.target.value);
  };

  const fields: Array<{
    key: keyof ReviewMetadataType;
    label: string;
    placeholder: string;
  }> = [
    { key: 'title', label: 'Tiêu đề', placeholder: 'VD: THỜI KHÓA BIỂU' },
    { key: 'schoolName', label: 'Trường', placeholder: 'VD: THCS Bình Thọ' },
    { key: 'className', label: 'Lớp', placeholder: 'VD: 10A1' },
    { key: 'studentName', label: 'Học sinh', placeholder: 'VD: Nguyễn Văn A' },
    { key: 'schoolYear', label: 'Năm học', placeholder: 'VD: 2024 - 2025' },
  ];

  return (
    <div
      id="review-metadata-section"
      className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs w-full max-w-full min-w-0"
    >
      {/* Accordion Header */}
      <button
        type="button"
        id="btn-toggle-review-metadata"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 sm:px-4 py-3 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex items-center justify-between text-left cursor-pointer gap-2 min-w-0"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4 h-4 text-violet-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
            Thông tin tiêu đề & trường lớp
          </span>
          {reviewDraft.reviewMeta.editedMetadataCount > 0 && (
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100/90 px-2 py-0.5 rounded-full border border-sky-200 shrink-0">
              Đã sửa {reviewDraft.reviewMeta.editedMetadataCount} mục
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {/* Editable Fields Grid */}
      {isOpen && (
        <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full min-w-0">
          {fields.map(({ key, label, placeholder }) => {
            const isEdited = editedMetadataFields[key];
            const val = metadata[key] ?? '';

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`review-meta-${key}`}
                    className="text-[11px] font-bold text-slate-700"
                  >
                    {label}:
                  </label>
                  {isEdited && (
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" />
                      Đã sửa
                    </span>
                  )}
                </div>

                <input
                  id={`review-meta-${key}`}
                  type="text"
                  maxLength={200}
                  value={val}
                  onChange={(e) => handleFieldChange(key, e)}
                  placeholder={placeholder}
                  className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
