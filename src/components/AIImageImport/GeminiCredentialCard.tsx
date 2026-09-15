/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useContext } from 'react';
import { useGeminiCredential } from '../../context/GeminiCredentialContext';
import { AIImageImportContext } from '../../context/AIImageImportContext';

export interface GeminiCredentialCardProps {
  onOpenChangeKey?: () => void;
  disabled?: boolean;
}

/**
 * Canonical Gemini Credential Status Card.
 * Rendered in the main "Quét TKB từ ảnh" modal.
 * Connection badge strictly reflects canonical isConnected state:
 * isConnected = validationState === 'valid'
 *            && validatedKeyFingerprint !== null
 *            && validatedKeyFingerprint === fingerprint(currentApiKey)
 */
export const GeminiCredentialCard: React.FC<GeminiCredentialCardProps> = ({
  onOpenChangeKey,
  disabled = false,
}) => {
  const {
    maskedKey,
    validationState,
    validationMessage,
    isFingerprintMatch,
    isConnected,
    remoteConfirmedForCurrentKey,
    credentialState,
    clearApiKey,
  } = useGeminiCredential();

  const aiImportContext = useContext(AIImageImportContext);
  const isAnalyzing = aiImportContext?.isAnalyzing ?? false;

  const isAuthError = credentialState === 'auth_error' || validationState === 'auth_error';
  const isVerified = credentialState === 'verified';
  const isReadyUnverified = credentialState === 'ready_unverified';

  const cardBorderClass = isVerified
    ? 'bg-emerald-50/70 border-emerald-200/90'
    : isReadyUnverified
      ? 'bg-sky-50/60 border-sky-200/80'
      : isAuthError
        ? 'bg-rose-50/70 border-rose-200/90'
        : 'bg-slate-50/80 border-slate-200/90';

  const iconContainerClass = isVerified
    ? 'bg-emerald-100 text-emerald-700'
    : isReadyUnverified
      ? 'bg-sky-100 text-sky-700'
      : isAuthError
        ? 'bg-rose-100 text-rose-700'
        : 'bg-slate-200 text-slate-700';

  const renderIcon = () => {
    if (isVerified) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    }
    if (isReadyUnverified) {
      return <KeyRound className="w-5 h-5 text-sky-600" />;
    }
    if (isAuthError) {
      return <AlertCircle className="w-5 h-5 text-rose-600" />;
    }
    return <KeyRound className="w-5 h-5 text-slate-500" />;
  };

  const renderBadge = () => {
    if (isVerified) {
      return (
        <span
          id="badge-gemini-verified"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full"
        >
          ✓ Đã xác thực
        </span>
      );
    }

    if (isReadyUnverified) {
      return (
        <span
          id="badge-gemini-candidate-ready"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-100/90 px-2 py-0.5 rounded-full"
        >
          API Key đã nhập
        </span>
      );
    }

    if (isAuthError) {
      return (
        <span
          id="badge-gemini-invalid"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full"
        >
          <AlertCircle className="w-3 h-3" />
          API Key không hợp lệ
        </span>
      );
    }

    return (
      <span
        id="badge-gemini-idle"
        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full"
      >
        Chưa nhập API Key
      </span>
    );
  };

  const handleAction = () => {
    if (onOpenChangeKey) {
      onOpenChangeKey();
    } else {
      clearApiKey();
    }
  };

  return (
    <div
      id="gemini-credential-card"
      className={`p-4 border rounded-2xl space-y-2.5 transition-colors ${cardBorderClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconContainerClass}`}>
            {renderIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Gemini API</span>
              {renderBadge()}
            </div>
            <div className="text-xs font-mono font-bold text-slate-700 tracking-wider mt-0.5">
              {maskedKey || 'Chưa thiết lập'}
            </div>
          </div>
        </div>

        <button
          id="btn-change-gemini-key"
          type="button"
          onClick={handleAction}
          disabled={disabled || isAnalyzing}
          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-300 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Đổi API Key
        </button>
      </div>

      {/* Helper text when candidate key is ready in memory */}
      {isReadyUnverified && (
        <div className="pt-0.5 text-xs text-slate-500 font-medium leading-relaxed">
          Sẽ được xác thực khi phân tích ảnh.
        </div>
      )}

      {/* Error feedback message on authentication / authorization failure */}
      {isAuthError && (
        <div className="pt-0.5 text-xs text-rose-700 font-medium leading-relaxed">
          {validationMessage || 'API Key không hợp lệ hoặc không có quyền truy cập.'}
        </div>
      )}

      {/* Section 7: Temporary Visual DEV Diagnostic */}
      {process.env.NODE_ENV !== 'production' && (
        <div
          id="dev-credential-diagnostic"
          className="pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1"
        >
          <span>credential:</span>
          <span>{`state=${validationState}`}</span>
          <span>{`match=${String(isFingerprintMatch)}`}</span>
          <span>{`connected=${String(isConnected)}`}</span>
        </div>
      )}
    </div>
  );
};
