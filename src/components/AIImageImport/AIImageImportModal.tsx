/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  ScanLine,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useGeminiCredential } from '../../context/GeminiCredentialContext';
import { useAIImageImport } from '../../context/AIImageImportContext';
import { GeminiCredentialCard } from './GeminiCredentialCard';
import { GeminiApiKeyEditorModal } from './GeminiApiKeyEditorModal';
import { ImageUploadZone } from './ImageUploadZone';
import { TimetableImagePreview } from './TimetableImagePreview';
import { RecognitionReview } from './RecognitionReview';
import { ApplyPreview } from './ApplyPreview';

export const AIImageImportModal: React.FC = () => {
  const {
    isImportModalOpen,
    closeImportModal,
    credentialState,
    isKeyEditorOpen,
    keyEditorMode,
    openKeyEditor,
    closeKeyEditor,
  } = useGeminiCredential();

  const {
    currentImage,
    isAnalyzing,
    hasAttemptedAnalysis,
    activeView,
  } = useAIImageImport();

  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Capture triggering active element when modal opens, and restore focus on close
  useEffect(() => {
    if (isImportModalOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      // Prevent background document/page scrolling & calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        // Restore focus to the trigger button ("Quét TKB từ ảnh")
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isImportModalOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isImportModalOpen) return;

      // Guard 1: Do not handle if already prevented or stopped by a child dialog
      if (e.defaultPrevented) return;

      // Guard 2: Do not close parent modal if a nested dialog (such as ReviewCellEditor or GeminiApiKeyEditorModal) is active
      const hasNestedDialog = document.querySelector(
        '#review-cell-editor-modal, #gemini-api-key-editor-modal, [data-nested-dialog="true"]'
      );
      if (hasNestedDialog) return;

      e.preventDefault();
      e.stopPropagation();
      closeImportModal();
    };

    if (isImportModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isImportModalOpen, closeImportModal]);

  if (!isImportModalOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isAnalyzing) {
      closeImportModal();
    }
  };

  const modalContent = (
    <div
      id="ai-image-import-backdrop"
      onClick={handleBackdropClick}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs no-print overflow-hidden overflow-x-hidden w-full max-w-full min-w-0 h-[100dvh] max-h-[100dvh] animate-in fade-in duration-150"
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-image-import-title"
        id="ai-image-import-modal"
        className={`bg-white rounded-2xl shadow-2xl ${
          activeView === 'review' || activeView === 'apply_preview' ? 'max-w-6xl' : 'max-w-lg'
        } w-full max-w-full min-w-0 p-3.5 sm:p-6 border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden transition-all max-h-[calc(100vh-1rem)] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] h-auto`}
        style={{
          maxHeight: 'calc(100dvh - 1rem)',
          height: 'auto',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 shrink-0 w-full max-w-full min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0 shadow-2xs">
              <ScanLine className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="ai-image-import-title"
                  className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                >
                  Quét TKB từ ảnh
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200/80 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {activeView === 'apply_preview'
                  ? 'Xem trước & áp dụng vào thời khóa biểu'
                  : activeView === 'review'
                  ? 'Kiểm tra & chỉnh sửa dữ liệu nhận dạng'
                  : 'Nhận dạng và trích xuất thời khóa biểu tự động'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-ai-import-modal"
            onClick={closeImportModal}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl transition-colors cursor-pointer hover:bg-slate-100 shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body — Sole Vertical Scroll Container */}
        <div
          id="ai-image-import-modal-body"
          className={`overflow-y-auto overflow-x-hidden ${
            activeView === 'review' || activeView === 'apply_preview' ? 'pt-0 pb-4' : 'py-4'
          } flex-1 min-h-0 pr-0.5 space-y-5 w-full max-w-full min-w-0 overscroll-y-contain`}
          style={{
            minHeight: 0,
            flex: '1 1 auto',
          }}
        >
          {activeView === 'apply_preview' ? (
            <ApplyPreview />
          ) : activeView === 'review' ? (
            <RecognitionReview />
          ) : (
            /* Credential Workflow State */
            <div id="gemini-connected-state" className="space-y-6">
              {/* Canonical Gemini Credential Card */}
              <GeminiCredentialCard
                onOpenChangeKey={() => {
                  setIsEditingKey(true);
                  openKeyEditor('change_key');
                }}
              />

              {/* Step 2: Active Timetable Image Workflow */}
              {currentImage ? (
                <TimetableImagePreview />
              ) : (
                <ImageUploadZone />
              )}

              {/* Expandable Privacy & Security Notice */}
              <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  id="btn-toggle-privacy-notice-connected"
                  onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                  className="w-full p-3 text-left flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  aria-expanded={isPrivacyOpen}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Quyền riêng tư & API</span>
                  </span>
                  {isPrivacyOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isPrivacyOpen && (
                  <div
                    id="gemini-privacy-details-connected"
                    className="p-3.5 pt-0 text-xs text-slate-600 space-y-2 border-t border-slate-100 bg-slate-50/50"
                  >
                    <ul className="space-y-1.5 list-disc list-inside">
                      <li>API Key chỉ được giữ trong bộ nhớ RAM của phiên hiện tại.</li>
                      <li>Ảnh TKB đã chọn chỉ được giữ tạm thời trong phiên làm việc.</li>
                      {hasAttemptedAnalysis ? (
                        <li>
                          Ảnh đã được chuẩn hóa theo góc nhìn hiện tại và gửi trực tiếp đến Google Gemini API bằng API Key của bạn để trích xuất dữ liệu.
                        </li>
                      ) : (
                        <li>
                          Trước khi bạn bấm &quot;Phân tích thời khóa biểu&quot;, ảnh hoàn toàn chưa được gửi tới Gemini.
                        </li>
                      )}
                      <li>
                        Cả ảnh và kết quả nhận dạng đều không được lưu vào bộ nhớ trình duyệt (localStorage) hay cơ sở dữ liệu.
                      </li>
                      <li>Reload hoặc đóng tab sẽ xóa sạch API Key, ảnh tạm và kết quả nhận dạng khỏi ứng dụng.</li>
                      <li>
                        Việc sử dụng Gemini API tuân thủ hạn mức và chính sách bảo mật từ Google theo API Key của bạn.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GEMINI API KEY EDITOR MODAL:
          Handles:
          - initial_connect (when key is missing)
          - change_key (when user clicks "Đổi API Key")
          - auth_error recovery (when auto-opened after 401/403)
      */}
      <GeminiApiKeyEditorModal
        isOpen={credentialState === 'missing' || isEditingKey || isKeyEditorOpen}
        mode={credentialState === 'missing' ? 'initial_connect' : (isKeyEditorOpen ? keyEditorMode : 'change_key')}
        onClose={() => {
          if (credentialState === 'missing') {
            // When key is missing and user cancels, close the entire import modal
            closeImportModal();
          } else {
            setIsEditingKey(false);
            closeKeyEditor();
          }
        }}
        onSuccess={() => {
          // On key submission success, only close the editor so the import modal remains open
          setIsEditingKey(false);
          closeKeyEditor();
        }}
      />
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
