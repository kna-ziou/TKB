/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  RotateCcw,
  RotateCw,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Sparkles,
  RotateCcw as RetryIcon,
} from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';
import { useGeminiCredential } from '../../context/GeminiCredentialContext';
import { formatFileSize } from '../../services/imageValidationService';
import { IMAGE_IMPORT_CONFIG } from '../../config/imageImportConfig';
import { ImageQualityTips } from './ImageQualityTips';
import { RecognitionProgress } from './RecognitionProgress';
import { RecognitionSummary } from './RecognitionSummary';

export const TimetableImagePreview: React.FC = () => {
  const {
    currentImage,
    workflowState,
    errorMessage,
    warningMessage,
    recognitionState,
    recognitionResult,
    recognitionError,
    isAnalyzing,
    rotateLeft,
    rotateRight,
    removeImage,
    processImageFile,
    startRecognition,
    retryRecognition,
  } = useAIImageImport();

  const {
    apiKey,
    credentialState,
    currentKeyFingerprint,
    validatedKeyFingerprint,
    isFingerprintMatch,
  } = useGeminiCredential();

  const replaceInputRef = useRef<HTMLInputElement>(null);

  if (!currentImage) return null;

  const isRotated90or270 =
    currentImage.rotation === 90 || currentImage.rotation === 270;
  const isValidating = workflowState === 'validating';
  const hasRecognitionError = Boolean(recognitionError && recognitionState !== 'idle');
  const isRecognitionSuccess = recognitionState === 'success' && Boolean(recognitionResult);

  const isKeyVerified =
    credentialState === 'verified' &&
    isFingerprintMatch &&
    currentKeyFingerprint !== null &&
    validatedKeyFingerprint !== null &&
    currentKeyFingerprint === validatedKeyFingerprint &&
    Boolean(apiKey && apiKey.trim().length >= 10);

  const canAnalyze = !isAnalyzing && !isValidating && isKeyVerified;

  const handleReplaceSelection = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processImageFile(files[0]);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const triggerReplaceInput = () => {
    if (!isValidating && !isAnalyzing && replaceInputRef.current) {
      replaceInputRef.current.click();
    }
  };

  return (
    <div id="image-preview-workflow" className="pt-2 border-t border-slate-100 space-y-4">
      {/* Hidden File Input for Image Replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        id="native-timetable-replace-input"
        accept={IMAGE_IMPORT_CONFIG.acceptAttribute}
        onChange={handleReplaceSelection}
        className="hidden"
        disabled={isValidating || isAnalyzing}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Ảnh thời khóa biểu
          </h4>
          <p className="text-sm font-semibold text-slate-800">
            Kiểm tra và căn chỉnh chiều ảnh trước khi nhận dạng
          </p>
        </div>

        {/* Status Badge */}
        {isRecognitionSuccess ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đã phân tích</span>
          </span>
        ) : isAnalyzing ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
            <span>Đang xử lý</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sẵn sàng</span>
          </span>
        )}
      </div>

      {/* Error alert if replacement image failed validation */}
      {errorMessage && (
        <div
          id="image-replace-error-alert"
          role="alert"
          aria-live="assertive"
          className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-150"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Không thể đổi ảnh: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Advisory Warning (e.g. resolution below 1280px) */}
      {warningMessage && !errorMessage && !isRecognitionSuccess && (
        <div
          id="image-advisory-warning-alert"
          role="status"
          className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-800 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Lưu ý chất lượng: </span>
            <span>{warningMessage}</span>
          </div>
        </div>
      )}

      {/* Preview Frame */}
      <div
        id="timetable-image-preview-container"
        className="relative w-full h-64 sm:h-72 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800 p-2 shadow-inner"
      >
        <img
          id="timetable-preview-img"
          src={currentImage.objectUrl}
          alt="Ảnh thời khóa biểu đã chọn"
          className="transition-transform duration-200 object-contain select-none shadow-md"
          style={{
            transform: `rotate(${currentImage.rotation}deg)`,
            maxHeight: isRotated90or270 ? 'min(65vw, 300px)' : '100%',
            maxWidth: isRotated90or270 ? 'min(45vh, 220px)' : '100%',
          }}
        />

        {/* Validating Replacement Overlay */}
        {isValidating && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white text-xs font-semibold z-10 animate-in fade-in duration-150">
            <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
            <span>Đang kiểm tra ảnh mới...</span>
          </div>
        )}
      </div>

      {/* Lightweight Metadata Strip */}
      <div
        id="timetable-image-metadata"
        className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-600"
      >
        <div className="flex items-center gap-2 min-w-0 max-w-[55%] sm:max-w-[65%]">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span
            className="font-semibold text-slate-800 truncate"
            title={currentImage.fileName}
          >
            {currentImage.fileName}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 shrink-0">
          <span>
            {currentImage.width} × {currentImage.height} px
          </span>
          <span>•</span>
          <span>{formatFileSize(currentImage.sizeBytes)}</span>
          {currentImage.rotation !== 0 && (
            <>
              <span>•</span>
              <span className="font-bold text-violet-600 bg-violet-100/70 px-1.5 py-0.5 rounded">
                {currentImage.rotation}°
              </span>
            </>
          )}
        </div>
      </div>

      {/* Image Manipulation Controls Toolbar */}
      <div
        id="timetable-image-controls"
        className="flex flex-wrap items-center justify-between gap-2 pt-1"
      >
        {/* Rotation Group */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-rotate-left"
            type="button"
            onClick={rotateLeft}
            disabled={isValidating || isAnalyzing}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            aria-label="Xoay trái 90 độ"
            title="Xoay trái 90° (sẽ đặt lại kết quả phân tích nếu có)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Xoay trái</span>
          </button>

          <button
            id="btn-rotate-right"
            type="button"
            onClick={rotateRight}
            disabled={isValidating || isAnalyzing}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            aria-label="Xoay phải 90 độ"
            title="Xoay phải 90° (sẽ đặt lại kết quả phân tích nếu có)"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Xoay phải</span>
          </button>
        </div>

        {/* Replace & Remove Group */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-replace-timetable-image"
            type="button"
            onClick={triggerReplaceInput}
            disabled={isValidating || isAnalyzing}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            title="Chọn ảnh khác để thay thế ảnh hiện tại"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Đổi ảnh</span>
          </button>

          <button
            id="btn-remove-timetable-image"
            type="button"
            onClick={removeImage}
            disabled={isValidating || isAnalyzing}
            className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            title="Xóa ảnh và quay lại bước tải ảnh"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Xóa ảnh</span>
          </button>
        </div>
      </div>

      {/* Recognition Progress State */}
      {isAnalyzing && <RecognitionProgress />}

      {/* Recognition Failure State */}
      {hasRecognitionError && !isAnalyzing && (
        <div
          id="recognition-error-alert"
          role="alert"
          className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-2.5 text-rose-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-rose-900">
                Không thể phân tích thời khóa biểu
              </p>
              <p className="font-normal text-rose-800 leading-relaxed">
                {recognitionError}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              id="btn-retry-recognition"
              type="button"
              onClick={retryRecognition}
              className="py-2 px-3.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Thử phân tích lại thời khóa biểu"
            >
              <RetryIcon className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
            <p className="text-[11px] text-slate-500">
              Kiểm tra chiều ảnh hoặc kết nối mạng trước khi thử lại.
            </p>
          </div>
        </div>
      )}

      {/* Recognition Success State */}
      {isRecognitionSuccess && <RecognitionSummary />}

      {/* Ready State - Primary Action [Phân tích thời khóa biểu] */}
      {!isAnalyzing && !isRecognitionSuccess && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>✓ Ảnh đã sẵn sàng để phân tích</span>
          </div>

          <div className="space-y-1.5">
            <button
              id="btn-analyze-timetable"
              type="button"
              onClick={startRecognition}
              disabled={!canAnalyze}
              className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white text-sm font-bold shadow-md shadow-violet-200 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.005] active:scale-[0.995]"
              title={
                !isKeyVerified
                  ? 'Vui lòng xác thực API Key trước khi phân tích'
                  : 'Gửi ảnh đến Gemini để nhận dạng thời khóa biểu'
              }
            >
              <Sparkles className="w-4 h-4 text-violet-200" />
              <span>Phân tích thời khóa biểu</span>
            </button>
            {!isKeyVerified ? (
              <p className="text-[11px] text-center text-amber-600 font-medium">
                Vui lòng xác thực Gemini API Key trước khi phân tích thời khóa biểu.
              </p>
            ) : (
              <p className="text-[11px] text-center text-slate-500 font-medium">
                Ảnh sẽ được chuẩn hóa đúng chiều nhìn và gửi đến Gemini để trích xuất cấu trúc thời khóa biểu.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quality Guidance (Collapsible) */}
      <ImageQualityTips defaultOpen={false} />
    </div>
  );
};
