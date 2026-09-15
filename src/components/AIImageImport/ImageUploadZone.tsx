/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Camera,
  AlertCircle,
  Loader2,
  FileImage,
} from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';
import { IMAGE_IMPORT_CONFIG } from '../../config/imageImportConfig';
import { ImageQualityTips } from './ImageQualityTips';

export const ImageUploadZone: React.FC = () => {
  const {
    workflowState,
    errorMessage,
    processImageFile,
  } = useAIImageImport();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isValidating = workflowState === 'validating';

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processImageFile(files[0]);
    }
    // Reset input value so re-selecting the same file triggers change event
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isValidating) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isValidating) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processImageFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    if (!isValidating && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const triggerCameraInput = () => {
    if (!isValidating && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerFileInput();
    }
  };

  return (
    <div id="image-upload-workflow" className="pt-2 border-t border-slate-100 space-y-4">
      {/* Section Header */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Bước tiếp theo
        </h4>
        <p className="text-sm font-semibold text-slate-800">
          Tải ảnh thời khóa biểu để Gemini nhận dạng.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Hỗ trợ ảnh chụp thời khóa biểu bảng đen, bản in giấy hoặc file ảnh thời khóa biểu trường học.
        </p>
      </div>

      {/* Hidden Native File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        id="native-timetable-file-input"
        accept={IMAGE_IMPORT_CONFIG.acceptAttribute}
        onChange={handleFileSelection}
        className="hidden"
        disabled={isValidating}
        aria-hidden="true"
      />
      <input
        ref={cameraInputRef}
        type="file"
        id="native-timetable-camera-input"
        accept={IMAGE_IMPORT_CONFIG.acceptAttribute}
        capture="environment"
        onChange={handleFileSelection}
        className="hidden"
        disabled={isValidating}
        aria-hidden="true"
      />

      {/* Error Message Box (if any) */}
      {errorMessage && (
        <div
          id="image-upload-error-alert"
          role="alert"
          aria-live="assertive"
          className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-150"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="font-medium leading-relaxed">
            {errorMessage}
          </div>
        </div>
      )}

      {/* Drop / Upload Zone */}
      <div
        id="timetable-drop-zone"
        role="button"
        tabIndex={0}
        aria-label="Khu vực tải ảnh thời khóa biểu. Bấm hoặc kéo thả ảnh vào đây"
        onClick={triggerFileInput}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-6 sm:p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
          isDragOver
            ? 'border-violet-500 bg-violet-50/80 shadow-md scale-[1.01]'
            : errorMessage
            ? 'border-rose-300 bg-rose-50/30 hover:bg-rose-50/60'
            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 hover:border-slate-300'
        } ${isValidating ? 'pointer-events-none opacity-80' : ''}`}
      >
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xs transition-colors ${
            isDragOver
              ? 'bg-violet-600 text-white'
              : 'bg-violet-100 text-violet-600'
          }`}
        >
          {isValidating ? (
            <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
          ) : isDragOver ? (
            <FileImage className="w-7 h-7 animate-bounce" />
          ) : (
            <UploadCloud className="w-7 h-7" />
          )}
        </div>

        <div className="space-y-1 max-w-sm">
          <p className="text-sm font-semibold text-slate-800">
            {isValidating
              ? 'Đang kiểm tra ảnh...'
              : isDragOver
              ? 'Thả ảnh vào đây'
              : 'Kéo & thả ảnh vào đây hoặc bấm để chọn'}
          </p>
          <p className="text-xs text-slate-500">
            Hỗ trợ JPG, PNG, WEBP (tối đa {IMAGE_IMPORT_CONFIG.maxSizeMB} MB)
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center gap-2.5 pt-2 flex-wrap justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            id="btn-upload-timetable-image"
            type="button"
            onClick={triggerFileInput}
            disabled={isValidating}
            className="py-2.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Tải ảnh TKB</span>
          </button>

          <button
            id="btn-capture-timetable-camera"
            type="button"
            onClick={triggerCameraInput}
            disabled={isValidating}
            className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-2xs hover:shadow cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50"
            title="Mở máy ảnh chụp trực tiếp (trên thiết bị di động)"
          >
            <Camera className="w-4 h-4 text-slate-600" />
            <span>Chụp ảnh</span>
          </button>
        </div>
      </div>

      {/* Quality Guidance */}
      <ImageQualityTips />
    </div>
  );
};
