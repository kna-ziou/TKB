/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  HelpCircle,
  RotateCw,
} from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';

export const RecognitionSummary: React.FC = () => {
  const {
    recognitionResult,
    recognitionSummary,
    startRecognition,
    isAnalyzing,
    openReviewWorkspace,
    reviewDraft,
  } = useAIImageImport();

  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState<boolean>(false);

  if (!recognitionResult || !recognitionSummary) return null;

  const confidencePercent = Math.round(recognitionResult.overallConfidence * 100);
  const modelDisplayName =
    recognitionResult.recognitionMeta.model === 'gemini-3.8-flash'
      ? 'Gemini 3.8 Flash'
      : recognitionResult.recognitionMeta.model === 'gemini-2.5-flash'
      ? 'Gemini 2.5 Flash'
      : recognitionResult.recognitionMeta.model;

  const meta = recognitionResult.sourceSummary;
  const hasMetadata = Boolean(
    meta.title || meta.schoolName || meta.className || meta.studentName || meta.schoolYear
  );

  return (
    <div
      id="recognition-success-summary"
      className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-4 animate-in fade-in duration-200"
    >
      {/* Header Badge & Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-emerald-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">
              ✓ Đã nhận dạng thời khóa biểu
            </h4>
            <p className="text-xs text-emerald-700">
              Dữ liệu cấu trúc đã được trích xuất thành công và lưu tạm trong phiên làm việc.
            </p>
          </div>
        </div>

        {/* Model & Confidence Tags */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/90 text-slate-700 border border-emerald-200 shadow-2xs">
            {modelDisplayName}
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${
              confidencePercent >= 85
                ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                : confidencePercent >= 65
                ? 'bg-amber-100/80 text-amber-800 border-amber-300'
                : 'bg-rose-100/80 text-rose-800 border-rose-300'
            }`}
          >
            Độ tin cậy: {confidencePercent}%
          </span>
        </div>
      </div>

      {/* Structured Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white/90 border border-emerald-200/70 rounded-xl flex items-center gap-2.5 shadow-2xs">
          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-[11px] font-medium text-slate-500">Số ngày</p>
            <p className="text-sm font-bold text-slate-800">
              {recognitionSummary.totalDays} ngày
            </p>
          </div>
        </div>

        <div className="p-3 bg-white/90 border border-emerald-200/70 rounded-xl flex items-center gap-2.5 shadow-2xs">
          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-[11px] font-medium text-slate-500">Buổi học</p>
            <p className="text-sm font-bold text-slate-800">
              {recognitionSummary.totalSessions} buổi ({recognitionSummary.totalPeriods} tiết)
            </p>
          </div>
        </div>

        <div className="p-3 bg-white/90 border border-emerald-200/70 rounded-xl flex items-center gap-2.5 shadow-2xs">
          <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-[11px] font-medium text-slate-500">Ô có môn</p>
            <p className="text-sm font-bold text-slate-800">
              {recognitionSummary.recognizedCells} ô
            </p>
          </div>
        </div>

        <div className="p-3 bg-white/90 border border-emerald-200/70 rounded-xl flex items-center gap-2.5 shadow-2xs">
          <HelpCircle
            className={`w-4 h-4 shrink-0 ${
              recognitionSummary.needsReviewCells > 0
                ? 'text-amber-600'
                : 'text-slate-400'
            }`}
          />
          <div>
            <p className="text-[11px] font-medium text-slate-500">Cần kiểm tra</p>
            <p
              className={`text-sm font-bold ${
                recognitionSummary.needsReviewCells > 0
                  ? 'text-amber-800'
                  : 'text-slate-800'
              }`}
            >
              {recognitionSummary.needsReviewCells} ô
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Header / Metadata Info (if any found) */}
      {hasMetadata && (
        <div className="p-3 bg-white/80 border border-emerald-200/60 rounded-xl text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-700">Thông tin tiêu đề nhận dạng:</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
            {meta.title && (
              <span>
                <strong className="text-slate-500">Tiêu đề:</strong> {meta.title}
              </span>
            )}
            {meta.schoolName && (
              <span>
                <strong className="text-slate-500">Trường:</strong> {meta.schoolName}
              </span>
            )}
            {meta.className && (
              <span>
                <strong className="text-slate-500">Lớp:</strong> {meta.className}
              </span>
            )}
            {meta.studentName && (
              <span>
                <strong className="text-slate-500">Học sinh:</strong> {meta.studentName}
              </span>
            )}
            {meta.schoolYear && (
              <span>
                <strong className="text-slate-500">Năm học:</strong> {meta.schoolYear}
              </span>
            )}
          </div>
        </div>
      )}

      {/* AI Warnings List (if any) */}
      {recognitionResult.warnings.length > 0 && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Lưu ý chất lượng nhận dạng:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 pl-1">
            {recognitionResult.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Action & Re-analyze Controls */}
      <div className="space-y-2 pt-1">
        <button
          id="btn-review-recognition-results"
          type="button"
          onClick={openReviewWorkspace}
          className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold cursor-pointer select-none flex items-center justify-center gap-2 shadow-xs transition-colors"
          title="Xem và chỉnh sửa kết quả nhận dạng trước khi chuẩn bị nhập vào thời khóa biểu"
        >
          <Sparkles className="w-4 h-4" />
          <span>Xem & kiểm tra kết quả</span>
        </button>

        {/* Re-analyze Button */}
        <div className="flex justify-center pt-1">
          <button
            id="btn-reanalyze-timetable"
            type="button"
            onClick={() => {
              const hasEdits =
                reviewDraft &&
                (reviewDraft.reviewMeta.editedCellCount > 0 ||
                  reviewDraft.reviewMeta.editedMetadataCount > 0);
              if (hasEdits) {
                setShowReanalyzeConfirm(true);
              } else {
                startRecognition();
              }
            }}
            disabled={isAnalyzing}
            className="py-1.5 px-3 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            title="Gửi lại ảnh để nhận dạng lại"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Phân tích lại ảnh này</span>
          </button>
        </div>
      </div>

      {/* Re-analyze Confirmation Dialog (when review edits exist) */}
      {showReanalyzeConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reanalyze-confirm-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-amber-600">
              <RotateCw className="w-5 h-5 shrink-0" />
              <h3 id="reanalyze-confirm-title" className="text-sm font-bold text-slate-900">
                Phân tích lại ảnh?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Các chỉnh sửa bạn đã thực hiện trong bước kiểm tra sẽ bị xóa nếu
              tạo kết quả nhận dạng mới.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReanalyzeConfirm(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                id="btn-confirm-reanalyze"
                type="button"
                onClick={() => {
                  setShowReanalyzeConfirm(false);
                  startRecognition();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Phân tích lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
