/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  ClipboardPaste,
  ExternalLink,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useGeminiCredential, GeminiApiKeyEditorMode } from '../../context/GeminiCredentialContext';
import { isMalformedApiKey } from '../../services/geminiService';

export interface GeminiApiKeyEditorModalProps {
  isOpen: boolean;
  mode?: GeminiApiKeyEditorMode;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GeminiApiKeyEditorModal: React.FC<GeminiApiKeyEditorModalProps> = ({
  isOpen,
  mode = 'change_key',
  onClose,
  onSuccess,
}) => {
  const {
    apiKey,
    validateAndSaveKey,
    clearApiKey,
    abortActiveValidation,
    candidateError,
    candidateErrorState,
  } = useGeminiCredential();

  const [inputValue, setInputValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Reset local candidate input whenever the modal is opened
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setInputValue('');
      setShowPassword(false);
      setLocalError(null);
      setIsVerifying(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const handleCancel = () => {
    abortActiveValidation();
    onClose();
  };

  // Handle ESC to close / abort
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * Candidate input is strictly local to the editor.
   * Typing or pasting MUST NOT auto-save, close editor, validate, or submit form.
   */
  const handleInputChange = (val: string) => {
    setInputValue(val);
    setLocalError(null);
  };

  const handleClear = () => {
    setInputValue('');
    setLocalError(null);
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const trimmed = text.trim();
          setInputValue(trimmed);
          setLocalError(null);
        }
      }
    } catch {
      // Ignore clipboard read permission failures
    }
  };

  /**
   * PATCH 08B-1F-09: Local sanity check only at key entry.
   * Reject immediately if empty, whitespace-only, < 10 chars, prose, or control characters.
   * If valid-looking:
   * - atomically save to memory
   * - close editor immediately
   * - ZERO remote network requests
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const trimmed = inputValue.trim();

    if (!trimmed) {
      setLocalError('Vui lòng nhập Gemini API Key của bạn.');
      return;
    }

    // PATCH 08B-1F-10: Minimal local sanity check (no spaces, no control chars, length >= 10)
    if (isMalformedApiKey(trimmed)) {
      setLocalError('API Key không hợp lệ.');
      return;
    }

    setLocalError(null);
    setIsVerifying(true);
    isSubmittingRef.current = true;

    try {
      const success = await validateAndSaveKey(trimmed, mode);
      if (success) {
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      }
    } finally {
      setIsVerifying(false);
      isSubmittingRef.current = false;
    }
  };

  const handleRemoveKey = () => {
    clearApiKey();
    onClose();
  };

  // Determine error presentation
  const displayedErrorMessage =
    localError ||
    candidateError ||
    'API Key không hợp lệ.';

  const hasError = Boolean(localError) || Boolean(candidateError);

  const isWarningSeverity =
    candidateErrorState === 'rate_limited' ||
    candidateErrorState === 'service_error' ||
    candidateErrorState === 'timeout' ||
    candidateErrorState === 'network_error';

  const modalContent = (
    <div
      id="gemini-api-key-editor-modal"
      className="fixed inset-0 z-[250] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gemini-key-editor-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 id="gemini-key-editor-title" className="text-sm font-bold text-slate-800">
                {mode === 'initial_connect' ? 'Gemini API Key' : 'Đổi Gemini API Key'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === 'initial_connect'
                  ? 'Kết nối khóa API để quét thời khóa biểu từ ảnh'
                  : 'Cập nhật API Key mới cho phiên làm việc hiện tại'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-key-editor"
            onClick={handleCancel}
            aria-label="Đóng"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="editor-gemini-key-input"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                {mode === 'initial_connect' ? 'Gemini API Key:' : 'API Key mới:'}
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                ref={inputRef}
                id="editor-gemini-key-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                spellCheck="false"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Nhập hoặc dán Gemini API Key (AIzaSy...)"
                className="w-full pl-3.5 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
              />

              <div className="absolute right-2 flex items-center gap-1">
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Xóa nội dung"
                    aria-label="Xóa nội dung"
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {!inputValue && (
                  <button
                    type="button"
                    onClick={handlePaste}
                    title="Dán từ Clipboard"
                    aria-label="Dán từ Clipboard"
                    className="p-1 text-slate-400 hover:text-sky-600 rounded-md transition-colors cursor-pointer"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn API Key' : 'Hiện API Key'}
                  aria-label={showPassword ? 'Ẩn API Key' : 'Hiện API Key'}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-1 leading-normal flex items-start gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                API Key chỉ lưu trong bộ nhớ tạm (RAM) của phiên này, không lưu vào bộ nhớ trình duyệt hay cơ sở dữ liệu.
              </span>
            </p>
          </div>

          {/* Validation Error Banner directly below input */}
          {hasError && (
            <div
              id="gemini-editor-validation-error"
              role="alert"
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                isWarningSeverity
                  ? 'bg-amber-50 border border-amber-200 text-amber-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {isWarningSeverity ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{displayedErrorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {mode === 'change_key' && apiKey ? (
              <button
                id="btn-delete-gemini-key"
                type="button"
                onClick={handleRemoveKey}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Key</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                id="btn-cancel-change-key"
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                id="btn-confirm-change-key"
                type="submit"
                disabled={!inputValue.trim() || isVerifying}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-sm shadow-sky-200 inline-flex items-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <span>Xác nhận &amp; Kiểm tra</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
