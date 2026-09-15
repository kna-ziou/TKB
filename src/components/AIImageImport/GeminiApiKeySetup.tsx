/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  WifiOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ClipboardPaste,
  X,
} from 'lucide-react';
import { useGeminiCredential } from '../../context/GeminiCredentialContext';

export const GeminiApiKeySetup: React.FC = () => {
  const {
    validateAndSaveKey,
    validationState,
    validationMessage,
  } = useGeminiCredential();

  const [inputValue, setInputValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const isValidating = validationState === 'validating';

  const handleInputChange = (val: string) => {
    setInputValue(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isValidating) return;
    await validateAndSaveKey(trimmed);
  };

  const handleClear = () => {
    setInputValue('');
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const trimmed = text.trim();
          setInputValue(trimmed);
        }
      }
    } catch {
      // Clipboard access might be denied in some iframe contexts
    }
  };

  return (
    <div id="gemini-api-key-setup" className="space-y-5">
      {/* Description header */}
      <div className="space-y-1.5">
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          Để sử dụng tính năng nhận dạng thời khóa biểu từ ảnh, hãy nhập Gemini API Key của bạn.
        </p>
        <p className="text-xs text-slate-500">
          API Key chỉ được sử dụng để kết nối Gemini trong phiên làm việc hiện tại.
        </p>
      </div>

      {/* API Key Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="gemini-api-key-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
            >
              API Key:
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
            >
              <span>Lấy API Key tại Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative flex items-center">
            <input
              id="gemini-api-key-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              spellCheck="false"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Nhập hoặc dán Gemini API Key (AIzaSy...)"
              disabled={isValidating}
              className="w-full pl-3.5 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all disabled:bg-slate-50 disabled:text-slate-500"
            />

            {/* In-field Action Buttons: Clear, Paste, Show/Hide */}
            <div className="absolute right-2 flex items-center gap-1">
              {inputValue && !isValidating && (
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

              {!inputValue && !isValidating && (
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
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Validation Status / Error Feedback */}
        {validationState === 'invalid' && (
          <div
            id="gemini-validation-error-invalid"
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              {validationMessage || 'API Key không hợp lệ.'}
            </span>
          </div>
        )}

        {validationState === 'permission_denied' && (
          <div
            id="gemini-validation-error-permission"
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              {validationMessage || 'Project chưa có quyền truy cập Gemini API.'}
            </span>
          </div>
        )}

        {validationState === 'model_unavailable' && (
          <div
            id="gemini-validation-error-model-unavailable"
            role="alert"
            className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              {validationMessage || 'Chưa truy cập được model Gemini được yêu cầu.'}
            </span>
          </div>
        )}

        {validationState === 'rate_limited' && (
          <div
            id="gemini-validation-error-rate-limit"
            role="alert"
            className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              {validationMessage || 'Gemini API hiện đã đạt giới hạn sử dụng của API Key này.'}
            </span>
          </div>
        )}

        {validationState === 'network_error' && (
          <div
            id="gemini-validation-error-network"
            role="alert"
            className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              {validationMessage || 'Không thể kết nối Gemini. Vui lòng kiểm tra kết nối mạng.'}
            </span>
          </div>
        )}

        {validationState === 'service_error' && (
          <div
            id="gemini-validation-error-service"
            role="alert"
            className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              {validationMessage || 'Lỗi dịch vụ Google Gemini tạm thời. Vui lòng thử lại sau.'}
            </span>
          </div>
        )}

        {/* Action Button: Check Connection */}
        <button
          id="btn-check-gemini-connection"
          type="submit"
          disabled={!inputValue.trim() || isValidating}
          className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-sm shadow-sky-200 cursor-pointer flex items-center justify-center gap-2"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Đang kiểm tra...</span>
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Kiểm tra kết nối</span>
            </>
          )}
        </button>
      </form>

      {/* Quota & Policy Notice */}
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 leading-relaxed">
        <p>
          <strong className="text-slate-700">Lưu ý:</strong> TKB Online không cung cấp Gemini API Key. Mỗi người dùng sử dụng API Key và hạn mức Gemini của chính mình.
        </p>
      </div>

      {/* Expandable Privacy & Security Notice */}
      <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
        <button
          type="button"
          id="btn-toggle-privacy-notice"
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
            id="gemini-privacy-details"
            className="p-3.5 pt-0 text-xs text-slate-600 space-y-2 border-t border-slate-100 bg-slate-50/50"
          >
            <ul className="space-y-1.5 list-disc list-inside">
              <li>API Key chỉ được giữ trong bộ nhớ của phiên hiện tại.</li>
              <li>Ảnh TKB đã chọn cũng chỉ được giữ tạm trong phiên hiện tại.</li>
              <li>Ở bước hiện tại, ảnh chưa được gửi tới Gemini.</li>
              <li>
                Khi người dùng chủ động bấm phân tích ở bước nhận dạng, ảnh sẽ được gửi tới Gemini API để xử lý.
              </li>
              <li>Reload hoặc đóng tab sẽ xóa API Key và ảnh tạm khỏi ứng dụng.</li>
              <li>
                Việc sử dụng Gemini API chịu hạn mức và quy định của project / API Key của người dùng.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
